import { api, BASE_URL, USE_MOCKS } from './api.js';
import { LS_DEVOIRS, loadJSON, saveJSON } from './storage.js';
import { CLASSES_PROF, DEVOIRS_PROF, ID_ELEVE_MOCK, suiviVide } from '@/mocks/devoirs.js';

// Devoirs : côté professeur (/prof/devoirs, /prof/classes, /prof/devoirs/{id}/eleves/{eleveId})
// et côté élève (/eleve/devoirs, /eleve/devoirs/{id}, /eleve/devoirs/{id}/rendu).
// Téléchargements : /devoirs/fichiers/{id}/telecharger et /devoirs/rendus/{id}/telecharger.

// ── Règles du back, reprises ici pour valider avant l'envoi ─────────────────
export const TYPES_DEVOIR = [
  { valeur: 'travail_a_faire', libelle: 'Travail à faire' },
  { valeur: 'controle',        libelle: 'Contrôle' },
  { valeur: 'projet',          libelle: 'Projet' },
  { valeur: 'lecture',         libelle: 'Lecture' },
];
export const STATUTS_DEVOIR = [
  { valeur: '',        libelle: 'Tous' },
  { valeur: 'a_faire', libelle: 'À faire' },
  { valeur: 'fait',    libelle: 'Fait' },
  { valeur: 'rendu',   libelle: 'Rendu' },
  { valeur: 'corrige', libelle: 'Corrigé' },
];
export const TITRE_MAX = 200;         // champsDevoir : texte($data, 'titre', 200, true)
export const DESCRIPTION_MAX = 10000; // champsDevoir : texte($data, 'description', 10000)
export const COMMENTAIRE_MAX = 5000;  // POST /eleve/devoirs/{id}/rendu
export const APPRECIATION_MAX = 4000; // PATCH /prof/devoirs/{id}/eleves/{eleveId}
export const NOTE_MAX = 999.99;       // numeric(5,2) en base

// Fichiers (backend/routes/helpers.php) : 10 Mo maximum et ces extensions seulement
export const TAILLE_MAX_FICHIER = 10 * 1024 * 1024;
export const EXTENSIONS_FICHIER = [
  'pdf', 'txt', 'csv', 'zip',
  'doc', 'docx', 'odt', 'xls', 'xlsx', 'ods', 'ppt', 'pptx', 'odp',
  'jpg', 'jpeg', 'png', 'gif', 'webp',
];

// Fichiers déposés pendant la session en mode mocks (permet de les retélécharger localement)
const fichiersMockMemoire = new Map();

export function getFichierDevoirDownloadUrl(id) {
  return `${BASE_URL}/devoirs/fichiers/${encodeURIComponent(id)}/telecharger`;
}

export function getRenduDownloadUrl(id) {
  return `${BASE_URL}/devoirs/rendus/${encodeURIComponent(id)}/telecharger`;
}

export function aFichierMock(id) {
  return fichiersMockMemoire.has(id);
}

export function telechargerFichierMock(id, nomFallback) {
  const file = fichiersMockMemoire.get(id);
  if (!file) return;
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name || nomFallback || 'fichier';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

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

// Ordre prof : échéance la plus lointaine d'abord, sans échéance à la fin
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

// Ordre élève : échéance la plus proche d'abord, sans échéance à la fin (comme GET /eleve/devoirs)
function trierDevoirsEleve(devoirs) {
  const temps = valeur => lireDate(valeur)?.getTime() ?? null;
  return [...devoirs].sort((a, b) => {
    const ta = temps(a.a_rendre_le);
    const tb = temps(b.a_rendre_le);
    if (ta !== tb) {
      if (ta === null) return 1;
      if (tb === null) return -1;
      return ta - tb;
    }
    return (temps(b.donne_le) ?? 0) - (temps(a.donne_le) ?? 0);
  });
}

function comptesSuivi(devoir) {
  if (!Array.isArray(devoir.suivi)) {
    return {
      eleves: Number(devoir.eleves ?? 0),
      faits:  Number(devoir.faits ?? 0),
      rendus: Number(devoir.rendus ?? 0),
    };
  }
  return {
    eleves: devoir.suivi.length,
    faits:  devoir.suivi.filter(s => ['fait', 'rendu', 'corrige'].includes(s.statut)).length,
    rendus: devoir.suivi.filter(s => ['rendu', 'corrige'].includes(s.statut)).length,
  };
}

function resumeDevoirProf(devoir) {
  const { suivi: _suivi, ...reste } = devoir;
  return { ...reste, ...comptesSuivi(devoir) };
}

function lireDevoirsMock() {
  return loadJSON(LS_DEVOIRS, DEVOIRS_PROF).map(d => ({
    ...d,
    fichiers: Array.isArray(d.fichiers) ? d.fichiers : [],
    suivi: Array.isArray(d.suivi) ? d.suivi : suiviVide(d.classe_id),
  }));
}

// ── Professeur : lecture, suivi, création, correction ───────────────────────
export async function getDevoirsProf() {
  if (!USE_MOCKS) return (await api.get('/prof/devoirs')).devoirs;
  return trierDevoirs(lireDevoirsMock().map(resumeDevoirProf));
}

export async function getClassesMatieresProf() {
  if (!USE_MOCKS) return (await api.get('/prof/classes')).classes;
  return structuredClone(CLASSES_PROF);
}

export async function getSuiviDevoir(devoirId) {
  if (!USE_MOCKS) return api.get(`/prof/devoirs/${devoirId}/suivi`);

  const devoir = lireDevoirsMock().find(d => d.id === devoirId);
  if (!devoir) throw new Error('Devoir introuvable');
  return {
    devoir: resumeDevoirProf(devoir),
    eleves: structuredClone(devoir.suivi),
  };
}

export async function corrigerDevoirEleve(devoirId, eleveId, { note, appreciation }) {
  const payload = {};
  if (note !== undefined) {
    payload.note = note === '' || note === null ? null : Number(note);
  }
  if (appreciation !== undefined) {
    const texte = appreciation === null ? '' : String(appreciation).trim();
    payload.appreciation = texte === '' ? null : texte;
  }

  if (!USE_MOCKS) {
    const res = await api.patch(`/prof/devoirs/${devoirId}/eleves/${eleveId}`, payload);
    return res.devoir_eleve;
  }

  const liste = lireDevoirsMock();
  const devoir = liste.find(d => d.id === devoirId);
  const ligne = devoir?.suivi.find(s => s.eleve_id === eleveId);
  if (!ligne) throw new Error('Devoir ou élève introuvable');

  if (!('note' in payload) && !('appreciation' in payload)) {
    throw new Error('Renseigne une note et/ou une appréciation');
  }
  const noteFinale = 'note' in payload ? payload.note : ligne.note;
  const appreciationFinale = 'appreciation' in payload ? payload.appreciation : ligne.appreciation;
  if (noteFinale !== null && (Number.isNaN(noteFinale) || noteFinale < 0 || noteFinale > NOTE_MAX)) {
    throw new Error('La note doit être comprise entre 0 et 999,99');
  }
  if (noteFinale === null && appreciationFinale === null) {
    throw new Error('Une note ou une appréciation doit rester renseignée');
  }

  ligne.note = noteFinale === null ? null : Math.round(noteFinale * 100) / 100;
  ligne.appreciation = appreciationFinale;
  ligne.statut = 'corrige';
  ligne.corrige_at = new Date().toISOString();

  saveJSON(LS_DEVOIRS, liste);
  return {
    devoir_id: devoirId,
    eleve_id: eleveId,
    statut: ligne.statut,
    note: ligne.note,
    appreciation: ligne.appreciation,
    corrige_at: ligne.corrige_at,
  };
}

export async function creerDevoir(champs, fichiers = []) {
  if (!USE_MOCKS) return creerDevoirApi(champs, fichiers);
  return creerDevoirMock(champs, fichiers);
}

async function creerDevoirApi(champs, fichiers) {
  const { devoir } = await api.post('/prof/devoirs', corpsDevoir(champs));

  const joints = [...(devoir.fichiers ?? [])];
  const echecs = [];
  for (const fichier of fichiers) {
    const formulaire = new FormData();
    formulaire.append('fichier', fichier);
    try {
      const res = await api.upload(`/prof/devoirs/${devoir.id}/fichiers`, formulaire);
      joints.push(res.fichier ?? { nom: fichier.name, taille_o: fichier.size });
    } catch (err) {
      echecs.push({ nom: fichier.name, message: err.message });
    }
  }
  return { devoir: { ...devoir, fichiers: joints }, echecs };
}

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
  const joints = fichiers.map(f => {
    const id = nouvelId();
    fichiersMockMemoire.set(id, f);
    return { id, nom: f.name, taille_o: f.size };
  });

  const devoirComplet = {
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
    fichiers: joints,
    suivi: suiviVide(classe.id),
  };

  saveJSON(LS_DEVOIRS, [devoirComplet, ...lireDevoirsMock()]);
  return { devoir: resumeDevoirProf(devoirComplet), echecs: [] };
}

// ── Élève : consultation, marquer fait, rendre en ligne ─────────────────────
export async function getDevoirsEleve(statut = '') {
  if (!USE_MOCKS) {
    const query = statut ? `?statut=${encodeURIComponent(statut)}` : '';
    return (await api.get(`/eleve/devoirs${query}`)).devoirs;
  }

  const liste = lireDevoirsMock()
    .map(d => {
      const suivi = d.suivi.find(s => s.eleve_id === ID_ELEVE_MOCK);
      if (!suivi) return null;
      return {
        id: d.id,
        type: d.type,
        titre: d.titre,
        description: d.description,
        donne_le: d.donne_le,
        a_rendre_le: d.a_rendre_le,
        rendu_en_ligne: d.rendu_en_ligne,
        matiere_id: d.matiere_id,
        matiere: d.matiere,
        prof_nom: 'Leroy',
        prof_prenom: 'Paul',
        statut: suivi.statut,
        fait_at: suivi.fait_at,
        rendu_at: suivi.rendu_at,
        commentaire_eleve: suivi.commentaire_eleve,
        note: suivi.note,
        appreciation: suivi.appreciation,
        corrige_at: suivi.corrige_at,
        fichiers: d.fichiers,
        fichiers_rendus: suivi.fichiers ?? [],
      };
    })
    .filter(d => d !== null && (!statut || d.statut === statut));

  return trierDevoirsEleve(liste);
}

export async function marquerDevoirFait(devoirId, fait) {
  if (!USE_MOCKS) {
    return (await api.patch(`/eleve/devoirs/${devoirId}`, { fait: Boolean(fait) })).devoir;
  }

  const liste = lireDevoirsMock();
  const devoir = liste.find(d => d.id === devoirId);
  const ligne = devoir?.suivi.find(s => s.eleve_id === ID_ELEVE_MOCK);
  if (!ligne) throw new Error('Devoir introuvable');
  if (['rendu', 'corrige'].includes(ligne.statut)) {
    throw new Error('Ce devoir a déjà été rendu');
  }

  ligne.statut = fait ? 'fait' : 'a_faire';
  ligne.fait_at = fait ? new Date().toISOString() : null;
  saveJSON(LS_DEVOIRS, liste);

  return { devoir_id: devoirId, statut: ligne.statut, fait_at: ligne.fait_at };
}

export async function rendreDevoir(devoirId, fichiers = [], commentaire = '') {
  if (!fichiers.length) {
    throw new Error('Sélectionnez au moins un fichier à rendre.');
  }
  const texteCommentaire = String(commentaire ?? '').trim();

  if (!USE_MOCKS) {
    const deposes = [];
    const echecs = [];
    let dernier = null;

    for (const fichier of fichiers) {
      const formulaire = new FormData();
      formulaire.append('fichier', fichier);
      if (texteCommentaire) formulaire.append('commentaire', texteCommentaire);
      try {
        const res = await api.upload(`/eleve/devoirs/${devoirId}/rendu`, formulaire);
        dernier = res.rendu;
        if (res.rendu?.fichier) deposes.push(res.rendu.fichier);
      } catch (err) {
        echecs.push({ nom: fichier.name, message: err.message });
      }
    }

    if (deposes.length === 0) {
      throw new Error(echecs[0]?.message || "Impossible d'envoyer le rendu.");
    }
    return { ...dernier, fichiers: deposes, echecs };
  }

  const liste = lireDevoirsMock();
  const devoir = liste.find(d => d.id === devoirId);
  const ligne = devoir?.suivi.find(s => s.eleve_id === ID_ELEVE_MOCK);
  if (!devoir || !ligne) throw new Error('Devoir introuvable');
  if (!devoir.rendu_en_ligne) throw new Error('Ce devoir ne se rend pas en ligne');
  if (ligne.statut === 'corrige') throw new Error('Ce devoir est déjà corrigé');

  const maintenant = new Date().toISOString();
  const nouveaux = fichiers.map(f => {
    const id = nouvelId();
    fichiersMockMemoire.set(id, f);
    return { id, nom: f.name, depose_at: maintenant };
  });

  ligne.statut = 'rendu';
  ligne.rendu_at = maintenant;
  if (texteCommentaire) ligne.commentaire_eleve = texteCommentaire;
  ligne.fichiers = [...(ligne.fichiers ?? []), ...nouveaux];
  saveJSON(LS_DEVOIRS, liste);

  return {
    statut: ligne.statut,
    rendu_at: ligne.rendu_at,
    commentaire_eleve: ligne.commentaire_eleve,
    fichiers: nouveaux,
    echecs: [],
  };
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
