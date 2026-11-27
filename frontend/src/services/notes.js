import { api, USE_MOCKS } from './api.js';
import { getClassesMatieresProf } from './devoirs.js';
import { LS_NOTES_PROF, loadJSON, saveJSON } from './storage.js';
import { NOTES } from '@/mocks/eleve.js';
import { CLASSES_PROF } from '@/mocks/devoirs.js';
import { ELEVES_PAR_CLASSE, NOTES_PROF } from '@/mocks/notesProf.js';

// Notes : vue de l'élève (la sienne) et gestion par le professeur (évaluations et saisie des notes).

const nombre = valeur => {
  if (valeur == null || valeur === '') return null;
  const n = Number(valeur);
  return Number.isFinite(n) ? n : null;
};

// ═══════════════════════════════════════════════════════════════════════════
// ÉLÈVE : GET /eleve/notes et GET /eleve/moyennes
// ═══════════════════════════════════════════════════════════════════════════
//
// GET /eleve/notes (backend/routes/eleve.php) renvoie { notes: [...] }, un objet et non une liste :
// chaque note est une ligne { evaluation_id, titre, date_eval, coefficient, bareme, periode,
// matiere_id, matiere, prof_nom, prof_prenom, valeur, absent, commentaire } où `valeur`, `coefficient`
// et `bareme` sont des décimaux en texte (« 11.90 ») et `valeur` peut être null.
// GET /eleve/moyennes (backend/routes/eleve_bonus.php) renvoie les coefficients des matières.
//
// On les convertit ici dans le format de la page, identique à celui des mocks :
//   { id, note, matiere, prof, date }                       (toujours)
//   { titre, appreciation, absent, sur20, coef, coefMatiere } (en plus, quand l'API les donne)
//   - note  : texte affiché (« 11,9/20 », « Absent », « – » tant que la note n'est pas saisie)
//   - sur20 : note ramenée sur 20 selon le barème, null si absent ou pas encore notée
//   - coef  : coefficient de l'évaluation ; coefMatiere : coefficient de la matière dans la classe

// 11.9 → « 11,9 », 16 → « 16 » (au plus deux décimales, sans zéros inutiles)
export const formatNombre = n => n.toLocaleString('fr-FR', { maximumFractionDigits: 2 });

// « 2026-11-24 » → « 24/11/2026 » (par découpage du texte, pour éviter tout décalage de fuseau horaire)
export const formatDate = date => {
  const jour = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(date ?? ''));
  return jour ? `${jour[3]}/${jour[2]}/${jour[1]}` : '';
};

function convertirNote(ligne, coefMatieres) {
  const valeur = nombre(ligne.valeur);
  const bareme = nombre(ligne.bareme) > 0 ? nombre(ligne.bareme) : 20;
  const absent = ligne.absent === true;
  const sur20 = absent || valeur == null ? null : (valeur / bareme) * 20;

  let note = '–';
  if (absent) note = 'Absent';
  else if (valeur != null) note = `${formatNombre(valeur)}/${formatNombre(bareme)}`;

  return {
    id: ligne.evaluation_id,
    note,
    sur20,
    absent,
    matiere: ligne.matiere ?? '',
    titre: ligne.titre || null,
    prof: [ligne.prof_prenom, ligne.prof_nom].filter(Boolean).join(' '),
    date: formatDate(ligne.date_eval),
    appreciation: ligne.commentaire || null,
    coef: nombre(ligne.coefficient) ?? 1,
    coefMatiere: coefMatieres.get(ligne.matiere_id) ?? 1,
  };
}

// Toujours un tableau (vide s'il n'y a aucune note)
export async function getNotes() {
  if (USE_MOCKS) return NOTES;

  const [donnees, moyennes] = await Promise.all([
    api.get('/eleve/notes'),
    // Les coefficients des matières ne servent qu'à pondérer la moyenne : sans eux, coefficient 1
    api.get('/eleve/moyennes').catch(() => null),
  ]);

  const coefMatieres = new Map();
  for (const m of moyennes?.moyennes ?? []) {
    const coef = nombre(m.coefficient);
    if (coef != null) coefMatieres.set(m.matiere_id, coef);
  }

  const lignes = Array.isArray(donnees?.notes) ? donnees.notes : [];
  return lignes.map(ligne => convertirNote(ligne, coefMatieres));
}

// ═══════════════════════════════════════════════════════════════════════════
// PROFESSEUR : /prof/classes, /prof/evaluations et /prof/evaluations/{id}/notes
// (backend/routes/prof.php ; un prof ne voit que ses propres évaluations)
// ═══════════════════════════════════════════════════════════════════════════

export const TITRE_EVALUATION_MAX = 200;   // champsEvaluation : texte($data, 'titre', 200, true)
export const PERIODE_MAX = 30;             // texte($data, 'periode', 30)
export const COMMENTAIRE_NOTE_MAX = 2000;  // texte($note, 'commentaire', 2000)

// Une évaluation : { id, classe_id, classe, matiere_id, matiere, titre, date_eval, coefficient, bareme,
// periode, notes (nombre de notes saisies), moyenne (moyenne des notes saisies, sur le barème, ou null) }.
// Le back renvoie les décimaux en texte (« 20.00 ») : on les convertit en nombres.
const convertirEvaluation = e => ({
  id: e.id,
  classe_id: e.classe_id,
  classe: e.classe,
  matiere_id: e.matiere_id,
  matiere: e.matiere,
  titre: e.titre,
  date_eval: e.date_eval,
  coefficient: nombre(e.coefficient) ?? 1,
  bareme: nombre(e.bareme) ?? 20,
  periode: e.periode ?? '',
  notes: Number(e.notes) || 0,
  moyenne: nombre(e.moyenne),
});

// Une ligne de la grille de saisie : un élève de la classe, avec sa note s'il en a une
const convertirNoteEleve = n => ({
  eleve_id: n.eleve_id,
  nom: n.nom,
  prenom: n.prenom,
  valeur: nombre(n.valeur),
  absent: n.absent === true,
  commentaire: n.commentaire ?? '',
});

// Classes du prof avec ses matières, pour les menus : [{ id, nom, matieres: [{ id, nom, coefficient }] }]
export const getClassesProf = getClassesMatieresProf;

// Évaluations du prof, les plus récentes d'abord
export async function getEvaluations() {
  if (!USE_MOCKS) return (await api.get('/prof/evaluations')).evaluations.map(convertirEvaluation);
  const donnees = lireMock();
  return donnees.evaluations.map(e => evaluationMock(e, donnees))
    .sort((a, b) => b.date_eval.localeCompare(a.date_eval) || a.titre.localeCompare(b.titre));
}

// champs : { classe_id, matiere_id, titre, date_eval (AAAA-MM-JJ), coefficient?, bareme?, periode? }
// Lève une Error dont le message (en français) vient du back et peut s'afficher tel quel.
export async function creerEvaluation(champs) {
  if (!USE_MOCKS) {
    const corps = { ...corpsEvaluation(champs), classe_id: champs.classe_id, matiere_id: champs.matiere_id };
    return convertirEvaluation((await api.post('/prof/evaluations', corps)).evaluation);
  }

  const verifies = verifierChampsMock(champs);
  const classe = CLASSES_PROF.find(c => c.id === Number(champs.classe_id));
  const matiere = classe?.matieres.find(m => m.id === Number(champs.matiere_id));
  if (!matiere) throw new Error("Classe ou matière invalide : vous n'enseignez pas cette matière dans cette classe");

  const donnees = lireMock();
  const evaluation = {
    id: nouvelId(),
    classe_id: classe.id, classe: classe.nom,
    matiere_id: matiere.id, matiere: matiere.nom,
    devoir_id: null,
    ...verifies,
  };
  donnees.evaluations.push(evaluation);
  donnees.notes[evaluation.id] = [];
  saveJSON(LS_NOTES_PROF, donnees);
  return evaluationMock(evaluation, donnees);
}

// champs : { titre, date_eval, coefficient?, bareme?, periode? } (la classe et la matière ne se modifient pas)
export async function modifierEvaluation(id, champs) {
  if (!USE_MOCKS) {
    return convertirEvaluation((await api.put(`/prof/evaluations/${id}`, corpsEvaluation(champs))).evaluation);
  }

  const donnees = lireMock();
  const evaluation = trouverEvaluationMock(donnees, id);
  const verifies = verifierChampsMock(champs);
  const max = Math.max(-Infinity, ...(donnees.notes[id] ?? []).map(n => n.valeur ?? -Infinity));
  if (max > verifies.bareme) throw new Error(`Le barème est inférieur à une note déjà saisie (${max})`);

  Object.assign(evaluation, verifies);
  saveJSON(LS_NOTES_PROF, donnees);
  return evaluationMock(evaluation, donnees);
}

// Les notes de l'évaluation sont supprimées avec elle
export async function supprimerEvaluation(id) {
  if (!USE_MOCKS) {
    await api.delete(`/prof/evaluations/${id}`);
    return;
  }
  const donnees = lireMock();
  trouverEvaluationMock(donnees, id);
  donnees.evaluations = donnees.evaluations.filter(e => e.id !== id);
  delete donnees.notes[id];
  saveJSON(LS_NOTES_PROF, donnees);
}

// Notes de toute la classe : { evaluation, notes: [{ eleve_id, nom, prenom, valeur, absent, commentaire }] }
// (une ligne par élève, même ceux qui n'ont pas encore de note : valeur null)
export async function getNotesEvaluation(id) {
  if (!USE_MOCKS) return resultatNotes(await api.get(`/prof/evaluations/${id}/notes`));
  const donnees = lireMock();
  trouverEvaluationMock(donnees, id);
  return resultatNotesMock(donnees, id);
}

// Saisie de la classe en une fois. notes : [{ eleve_id, valeur (nombre ou null), absent, commentaire }].
// Une ligne sans valeur, ni absence, ni commentaire efface la note. Renvoie la même chose que getNotesEvaluation.
// Lève une Error dont le message (en français) vient du back si une note est refusée.
export async function enregistrerNotes(id, notes) {
  const lignes = notes.map(n => ({
    eleve_id: n.eleve_id,
    valeur: n.absent ? null : n.valeur,
    absent: Boolean(n.absent),
    commentaire: n.commentaire?.trim() || null,
  }));
  if (!USE_MOCKS) return resultatNotes(await api.put(`/prof/evaluations/${id}/notes`, { notes: lignes }));

  const donnees = lireMock();
  const evaluation = trouverEvaluationMock(donnees, id);
  const eleves = ELEVES_PAR_CLASSE[evaluation.classe_id] ?? [];
  const saisies = new Map((donnees.notes[id] ?? []).map(n => [n.eleve_id, n]));

  // Tout valider avant d'écrire, comme le back
  for (const ligne of lignes) {
    if (!eleves.some(e => e.id === ligne.eleve_id)) {
      throw new Error(`L'élève ${ligne.eleve_id} n'est pas dans la classe de cette évaluation`);
    }
    if (ligne.valeur !== null && (!Number.isFinite(ligne.valeur) || ligne.valeur < 0 || ligne.valeur > evaluation.bareme)) {
      throw new Error(`Une note doit être entre 0 et ${evaluation.bareme}`);
    }
    if (ligne.commentaire && ligne.commentaire.length > COMMENTAIRE_NOTE_MAX) {
      throw new Error(`Le champ « commentaire » dépasse ${COMMENTAIRE_NOTE_MAX} caractères`);
    }
  }
  for (const ligne of lignes) {
    if (ligne.valeur === null && !ligne.absent && ligne.commentaire === null) saisies.delete(ligne.eleve_id);
    else saisies.set(ligne.eleve_id, { ...ligne });
  }
  donnees.notes[id] = [...saisies.values()];
  saveJSON(LS_NOTES_PROF, donnees);
  return resultatNotesMock(donnees, id);
}

// ── Détails communs ─────────────────────────────────────────────────────────

// Corps de POST / PUT /prof/evaluations : seulement les champs que le back lit ; période vide non envoyée
function corpsEvaluation(champs) {
  const corps = {
    titre: champs.titre,
    date_eval: champs.date_eval,
    coefficient: champs.coefficient,
    bareme: champs.bareme,
  };
  if (champs.periode) corps.periode = champs.periode;
  return corps;
}

const resultatNotes = data => ({
  evaluation: convertirEvaluation(data.evaluation),
  notes: data.notes.map(convertirNoteEleve),
});

// ── Mode mocks : évaluations et notes gardées dans le localStorage ──────────
// Mêmes contrôles et mêmes messages d'erreur que le back, pour tester la page sans lui.
const lireMock = () => loadJSON(LS_NOTES_PROF, NOTES_PROF);
const nouvelId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

function trouverEvaluationMock(donnees, id) {
  const evaluation = donnees.evaluations.find(e => e.id === id);
  if (!evaluation) throw new Error('Évaluation introuvable');
  return evaluation;
}

// L'évaluation avec le nombre de notes saisies et leur moyenne, comme GET /prof/evaluations
function evaluationMock(evaluation, donnees) {
  const valeurs = (donnees.notes[evaluation.id] ?? []).map(n => n.valeur).filter(v => v !== null);
  const moyenne = valeurs.length ? Math.round((valeurs.reduce((s, v) => s + v, 0) / valeurs.length) * 100) / 100 : null;
  return convertirEvaluation({ ...evaluation, notes: valeurs.length, moyenne });
}

function resultatNotesMock(donnees, id) {
  const evaluation = trouverEvaluationMock(donnees, id);
  const saisies = new Map((donnees.notes[id] ?? []).map(n => [n.eleve_id, n]));
  return {
    evaluation: evaluationMock(evaluation, donnees),
    notes: (ELEVES_PAR_CLASSE[evaluation.classe_id] ?? []).map(eleve => convertirNoteEleve({
      eleve_id: eleve.id, nom: eleve.nom, prenom: eleve.prenom, ...saisies.get(eleve.id),
    })),
  };
}

// Valide les champs d'une évaluation comme champsEvaluation (prof.php) et renvoie ceux à enregistrer
function verifierChampsMock(champs) {
  const titre = String(champs.titre ?? '').trim();
  if (!titre) throw new Error('Le champ « titre » est requis');
  if (titre.length > TITRE_EVALUATION_MAX) throw new Error(`Le champ « titre » dépasse ${TITRE_EVALUATION_MAX} caractères`);
  const date = String(champs.date_eval ?? '');
  if (!date) throw new Error('Le champ « date_eval » est requis');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(date).getTime())) {
    throw new Error('Le champ « date_eval » doit être une date AAAA-MM-JJ');
  }
  const coefficient = nombre(champs.coefficient) ?? 1;
  const bareme = nombre(champs.bareme) ?? 20;
  if (coefficient <= 0 || coefficient >= 100) throw new Error('Le coefficient doit être entre 0 et 100');
  if (bareme <= 0 || bareme >= 1000) throw new Error('Le barème doit être entre 0 et 1000');
  const periode = String(champs.periode ?? '').trim();
  if (periode.length > PERIODE_MAX) throw new Error(`Le champ « periode » dépasse ${PERIODE_MAX} caractères`);
  return { titre, date_eval: date, coefficient, bareme, periode: periode || null };
}
