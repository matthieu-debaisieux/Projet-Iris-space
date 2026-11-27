import { api, USE_MOCKS } from './api.js';
import { LS_DEVOIRS, loadJSON, saveJSON } from './storage.js';
import { CLASSES_PROF, DEVOIRS_PROF } from '@/mocks/devoirs.js';

// Devoirs : côté professeur (routes /prof/devoirs et /prof/classes du back, backend/routes/prof.php).
// La page élève (liste, « fait », rendu en ligne) viendra dans ce même fichier.

// ── Règles du back, reprises ici pour valider avant l'envoi ─────────────────
// Types de devoir : TYPES_DEVOIR de prof.php (le libellé est celui affiché).
export const TYPES_DEVOIR = [
  { valeur: 'travail_a_faire', libelle: 'Travail à faire' },
  { valeur: 'controle',        libelle: 'Contrôle' },
  { valeur: 'projet',          libelle: 'Projet' },
  { valeur: 'lecture',         libelle: 'Lecture' },
];
export const TITRE_MAX = 200;         // champsDevoir : texte($data, 'titre', 200, true)
export const DESCRIPTION_MAX = 10000; // champsDevoir : texte($data, 'description', 10000)
// Fichiers (backend/routes/helpers.php) : 10 Mo maximum et ces extensions seulement
export const TAILLE_MAX_FICHIER = 10 * 1024 * 1024;
export const EXTENSIONS_FICHIER = [
  'pdf', 'txt', 'csv', 'zip',
  'doc', 'docx', 'odt', 'xls', 'xlsx', 'ods', 'ppt', 'pptx', 'odp',
  'jpg', 'jpeg', 'png', 'gif', 'webp',
];

// ── Dates ───────────────────────────────────────────────────────────────────
// Le back renvoie `a_rendre_le` sous la forme « 2026-10-30 18:00:00+01 » et `donne_le` sous la
// forme « 2026-10-30 ». Tous les navigateurs ne lisent pas la première telle quelle (il leur faut
// un « T » et un décalage « +01:00 ») : on la met en forme avant de créer la Date.
// Renvoie null si la valeur est absente ou illisible.
export function lireDate(valeur) {
  if (!valeur) return null;
  const texte = String(valeur);
  const jour = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texte);
  if (jour) return new Date(Number(jour[1]), Number(jour[2]) - 1, Number(jour[3])); // minuit local
  const date = new Date(texte.replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00'));
  return Number.isNaN(date.getTime()) ? null : date;
}

// Même ordre que le back : échéance la plus lointaine d'abord, sans échéance à la fin
export function trierDevoirs(devoirs) {
  const temps = valeur => lireDate(valeur)?.getTime() ?? null;
  return [...devoirs].sort((a, b) => {
    const ta = temps(a.a_rendre_le);
    const tb = temps(b.a_rendre_le);
    if (ta !== tb) {
      if (ta === null) return 1;
      if (tb === null) return -1;
      return tb - ta;
    }
    return (temps(b.donne_le) ?? 0) - (temps(a.donne_le) ?? 0);
  });
}

// ── Lecture ─────────────────────────────────────────────────────────────────
// Devoirs créés par le prof connecté : [{ id, classe_id, classe, matiere_id, matiere, type, titre,
// donne_le, a_rendre_le, rendu_en_ligne, eleves, faits, rendus }] (GET /prof/devoirs)
// + `description` et `fichiers: [{ id, nom, taille_o }]` quand le back les renvoie.
export async function getDevoirsProf() {
  if (!USE_MOCKS) return (await api.get('/prof/devoirs')).devoirs;
  return trierDevoirs(loadJSON(LS_DEVOIRS, DEVOIRS_PROF));
}

// Classes du prof avec ses matières, pour remplir les menus du formulaire :
// [{ id, nom, matieres: [{ id, nom, coefficient }] }] (GET /prof/classes)
export async function getClassesMatieresProf() {
  if (!USE_MOCKS) return (await api.get('/prof/classes')).classes;
  return structuredClone(CLASSES_PROF);
}

// ── Création ────────────────────────────────────────────────────────────────
// `champs` : les noms du back (champsDevoir et POST /prof/devoirs)
//   { classe_id, matiere_id, type, titre, description?, a_rendre_le?, rendu_en_ligne? }
//   a_rendre_le : « AAAA-MM-JJTHH:MM » (heure de Paris si aucun fuseau n'est donné)
// `fichiers` : liste de File (pièces jointes facultatives)
//
// Renvoie { devoir, echecs } : le devoir créé (avec `fichiers`) et la liste des pièces jointes qui
// n'ont pas pu être envoyées [{ nom, message }]. Un échec de pièce jointe ne fait pas échouer la
// création : le devoir existe déjà, il ne faut surtout pas laisser le prof le recréer en double.
// Lève une Error dont le message vient du back ({ error }) si le devoir lui-même est refusé.
export async function creerDevoir(champs, fichiers = []) {
  if (!USE_MOCKS) return creerDevoirApi(champs, fichiers);
  return creerDevoirMock(champs, fichiers);
}

async function creerDevoirApi(champs, fichiers) {
  const { devoir } = await api.post('/prof/devoirs', corpsDevoir(champs));

  // Pièces jointes : un envoi par fichier (champ « fichier », comme les autres routes de dépôt).
  // La route POST /prof/devoirs/{id}/fichiers arrive avec la tâche DEV-05 (table devoir_fichier) ;
  // tant qu'elle n'existe pas, le back répond 404 et les fichiers sont signalés en échec.
  const joints = [];
  const echecs = [];
  for (const fichier of fichiers) {
    const formulaire = new FormData();
    formulaire.append('fichier', fichier);
    try {
      await api.upload(`/prof/devoirs/${devoir.id}/fichiers`, formulaire);
      joints.push({ nom: fichier.name, taille_o: fichier.size });
    } catch (err) {
      echecs.push({ nom: fichier.name, message: err.message });
    }
  }
  return { devoir: { ...devoir, fichiers: joints }, echecs };
}

// Ne garde que les champs que le back lit ; un champ facultatif vide n'est pas envoyé
function corpsDevoir(champs) {
  const corps = {
    classe_id: champs.classe_id,
    matiere_id: champs.matiere_id,
    type: champs.type,
    titre: champs.titre,
    rendu_en_ligne: Boolean(champs.rendu_en_ligne),
  };
  if (champs.description) corps.description = champs.description;
  if (champs.a_rendre_le) corps.a_rendre_le = champs.a_rendre_le;
  return corps;
}

// ── Mode mocks : les devoirs sont gardés dans le localStorage ───────────────
// Mêmes contrôles et mêmes messages d'erreur que le back, pour tester la page sans lui.
// Les fichiers ne sont pas conservés : seuls leur nom et leur taille le sont.
function creerDevoirMock(champs, fichiers) {
  const classe = CLASSES_PROF.find(c => c.id === Number(champs.classe_id));
  const matiere = classe?.matieres.find(m => m.id === Number(champs.matiere_id));
  const titre = String(champs.titre ?? '').trim();
  const description = String(champs.description ?? '').trim();
  const type = champs.type || 'travail_a_faire';

  if (!champs.classe_id) throw new Error('Le champ « classe_id » est requis');
  if (!champs.matiere_id) throw new Error('Le champ « matiere_id » est requis');
  if (!titre) throw new Error('Le champ « titre » est requis');
  if (titre.length > TITRE_MAX) throw new Error(`Le champ « titre » dépasse ${TITRE_MAX} caractères`);
  if (description.length > DESCRIPTION_MAX) throw new Error(`Le champ « description » dépasse ${DESCRIPTION_MAX} caractères`);
  if (!TYPES_DEVOIR.some(t => t.valeur === type)) {
    throw new Error(`Le champ « type » doit valoir : ${TYPES_DEVOIR.map(t => t.valeur).join(', ')}`);
  }
  if (champs.a_rendre_le && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(champs.a_rendre_le)) {
    throw new Error('Le champ « a_rendre_le » doit être une date et heure ISO (AAAA-MM-JJTHH:MM)');
  }
  if (!matiere) {
    throw new Error("Classe ou matière invalide : vous n'enseignez pas cette matière dans cette classe");
  }

  const maintenant = new Date();
  const devoir = {
    id: nouvelId(),
    classe_id: classe.id, classe: classe.nom,
    matiere_id: matiere.id, matiere: matiere.nom,
    cours_id: null,
    type,
    titre,
    description: description || null,
    donne_le: jourLocal(maintenant),
    a_rendre_le: champs.a_rendre_le ? versFormatBack(champs.a_rendre_le) : null,
    rendu_en_ligne: Boolean(champs.rendu_en_ligne),
    created_at: maintenant.toISOString(),
    updated_at: maintenant.toISOString(),
    eleves: 24, faits: 0, rendus: 0,
    fichiers: fichiers.map(f => ({ id: nouvelId(), nom: f.name, taille_o: f.size })),
  };

  saveJSON(LS_DEVOIRS, [devoir, ...loadJSON(LS_DEVOIRS, DEVOIRS_PROF)]);
  return { devoir, echecs: [] };
}

const nouvelId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const deuxChiffres = n => String(n).padStart(2, '0');
const jourLocal = date => `${date.getFullYear()}-${deuxChiffres(date.getMonth() + 1)}-${deuxChiffres(date.getDate())}`;

// « 2026-12-04T18:00 » → « 2026-12-04 18:00:00+01 » (la forme renvoyée par le back)
function versFormatBack(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const minutes = -date.getTimezoneOffset();
  const signe = minutes < 0 ? '-' : '+';
  const heures = deuxChiffres(Math.floor(Math.abs(minutes) / 60));
  const reste = Math.abs(minutes) % 60;
  const decalage = `${signe}${heures}${reste ? `:${deuxChiffres(reste)}` : ''}`;
  return `${jourLocal(date)} ${deuxChiffres(date.getHours())}:${deuxChiffres(date.getMinutes())}:00${decalage}`;
}
