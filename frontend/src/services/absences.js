import { api, BASE_URL, USE_MOCKS } from './api.js';
import { LS_ABSENCES, LS_UTILISATEURS, loadJSON, saveJSON } from './storage.js';
import { ABSENCES } from '@/mocks/absences.js';
import { UTILISATEURS_MOCK } from '@/mocks/utilisateurs.js';

export const STATUT_ABSENCE_LABEL = {
  en_attente:   'En attente',
  justifie:     'Justifié',
  non_justifie: 'Non justifié',
};

const aujourdhuiIso = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// 'AAAA-MM-JJ' → 'JJ/MM/AAAA' (lu dans le texte, sans passer par Date : pas de décalage de fuseau)
const dateFr = iso => (iso ? iso.split('-').reverse().join('/') : '—');

// Nombre d'heures du back ('4.00') → '4 h', '1,5 h'
const heures = n => `${Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} h`;

// Heure de Paris du back ('2026-10-21 09:30:00+02') → '09h30' ou '09:30'
const heureCours = horodatage => horodatage.replace(/^\d{4}-\d{2}-\d{2}[T ](\d{2}):(\d{2}).*$/, '$1h$2');
const heureDeuxPoints = horodatage => horodatage.replace(/^\d{4}-\d{2}-\d{2}[T ](\d{2}):(\d{2}).*$/, '$1:$2');

function formaterDureeAdmin(a) {
  const retard = a.type === 'retard';
  if (retard && a.minutes_retard != null) return `${a.minutes_retard} min`;
  if (a.cours_debut && a.cours_fin) return `${heureCours(a.cours_debut)} – ${heureCours(a.cours_fin)}`;
  if (!retard && a.duree_heures != null) return heures(a.duree_heures);
  return '—';
}

export function versAbsenceAdmin(a) {
  const retard = a.type === 'retard';
  const heureDebut = a.cours_debut ? heureDeuxPoints(a.cours_debut) : null;
  const heureFin = a.cours_fin ? heureDeuxPoints(a.cours_fin) : null;
  const statut = a.statut ?? (a.justifie ? 'justifie' : (a.justificatif_envoye ? 'en_attente' : 'non_justifie'));

  return {
    id: a.id,
    eleve_id: a.eleve_id,
    eleve: [a.prenom, a.nom].filter(Boolean).join(' ') || a.eleve || 'Élève',
    nom: a.nom ?? '',
    prenom: a.prenom ?? '',
    classe_id: a.classe_id ?? null,
    classe: a.classe ?? '—',
    date_absence: a.date_absence,
    date: dateFr(a.date_absence),
    type: retard ? 'retard' : 'absence',
    typeLabel: retard ? 'Retard' : 'Absence',
    cours_id: a.cours_id ?? null,
    cours_debut: a.cours_debut ?? null,
    cours_fin: a.cours_fin ?? null,
    heureDebut,
    heureFin,
    duree_heures: a.duree_heures != null ? Number(a.duree_heures) : null,
    minutes_retard: a.minutes_retard != null ? Number(a.minutes_retard) : null,
    duree: formaterDureeAdmin(a),
    matiere: a.matiere ?? null,
    libelle: a.libelle ?? null,
    justifie: Boolean(a.justifie),
    statut,
    motif: a.motif ?? '',
    justificatif_envoye: Boolean(a.justificatif_envoye),
    tel: a.telephone ?? null,
    email: a.email ?? null,
    saisi_par: a.saisi_par ?? null,
    created_at: a.created_at ?? null,
  };
}

function versAbsenceMock(m) {
  const dateAbs = m.date_absence ?? aujourdhuiIso();
  const retard = m.type === 'retard' || m.type === 'Retard';
  const heureDebut = m.heureDebut ?? null;
  const heureFin = m.heureFin ?? null;
  const duree = m.duree
    ?? (retard && m.minutes_retard ? `${m.minutes_retard} min`
      : (heureDebut && heureFin ? `${heureDebut} – ${heureFin}`
        : (m.duree_heures != null ? heures(m.duree_heures) : '—')));

  const statut = m.statut ?? (m.justifie ? 'justifie' : (m.justificatif_envoye ? 'en_attente' : 'non_justifie'));
  return {
    id: m.id,
    eleve_id: m.eleve_id ?? null,
    eleve: m.eleve ?? 'Élève',
    nom: m.nom ?? '',
    prenom: m.prenom ?? '',
    classe_id: m.classe_id ?? null,
    classe: m.classe ?? '—',
    date_absence: dateAbs,
    date: dateFr(dateAbs),
    type: retard ? 'retard' : 'absence',
    typeLabel: retard ? 'Retard' : 'Absence',
    cours_id: m.cours_id ?? null,
    cours_debut: null,
    cours_fin: null,
    heureDebut,
    heureFin,
    duree_heures: m.duree_heures != null ? Number(m.duree_heures) : null,
    minutes_retard: m.minutes_retard != null ? Number(m.minutes_retard) : null,
    duree,
    matiere: m.matiere ?? null,
    libelle: m.libelle ?? null,
    justifie: statut === 'justifie',
    statut,
    motif: m.motif ?? m.notes ?? '',
    justificatif_envoye: Boolean(m.justificatif_envoye) || statut === 'en_attente',
    tel: m.tel ?? m.telephone ?? null,
    email: m.email ?? null,
    saisi_par: m.saisi_par ?? null,
    created_at: m.created_at ?? null,
  };
}

function calculerResume(absences) {
  const resume = { absences: 0, retards: 0, justifiees: 0, en_attente: 0, non_justifiees: 0 };
  for (const a of absences) {
    resume[a.type === 'retard' ? 'retards' : 'absences']++;
    if (a.statut === 'justifie') resume.justifiees++;
    else if (a.statut === 'en_attente') resume.en_attente++;
    else resume.non_justifiees++;
  }
  return resume;
}

// ── Administration ──────────────────────────────────────────────────────────

// Absences du jour de tout l'établissement (bloc « Absences aujourd'hui » du tableau de bord admin).
export async function getAbsencesDuJour() {
  if (!USE_MOCKS) {
    const data = await api.get('/admin/absences');
    return (data?.absences ?? []).map(versAbsenceAdmin);
  }
  const aujourd = aujourdhuiIso();
  return loadJSON(LS_ABSENCES, ABSENCES)
    .map(versAbsenceMock)
    .filter(a => a.date_absence === aujourd);
}

// Liste des absences côté administration, filtrable par date (AAAA-MM-JJ) et/ou statut.
export async function getAbsencesAdmin({ date, statut } = {}) {
  if (!USE_MOCKS) {
    const params = new URLSearchParams();
    if (date) params.set('date', date);
    if (statut && statut !== 'tous') params.set('statut', statut);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const data = await api.get(`/admin/absences${qs}`);
    const absences = (data?.absences ?? []).map(versAbsenceAdmin);
    return {
      date: data?.date ?? null,
      statut: data?.statut ?? null,
      resume: data?.resume ?? calculerResume(absences),
      absences,
    };
  }

  const toutes = loadJSON(LS_ABSENCES, ABSENCES).map(versAbsenceMock);
  const cibleDate = !date && (!statut || statut === 'tous') ? aujourdhuiIso() : (date || null);
  const cibleStatut = statut && statut !== 'tous' ? statut : null;
  const filtrees = toutes.filter(a =>
    (!cibleDate || a.date_absence === cibleDate)
    && (!cibleStatut || a.statut === cibleStatut),
  );
  return {
    date: cibleDate,
    statut: cibleStatut,
    resume: calculerResume(filtrees),
    absences: filtrees,
  };
}

// Cours d'un élève à une date donnée (menu « Cours » du formulaire de saisie).
export async function getCoursElevePourAbsence(eleveId, date) {
  if (!eleveId || USE_MOCKS) return [];
  const params = new URLSearchParams({ eleve_id: eleveId });
  if (date) params.set('date', date);
  const data = await api.get(`/admin/absences/cours?${params.toString()}`);
  return data?.cours ?? [];
}

// Saisir une absence ou un retard côté administration.
export async function createAbsenceAdmin(payload) {
  if (!USE_MOCKS) {
    const data = await api.post('/admin/absences', payload);
    return versAbsenceAdmin(data.absence);
  }

  const utilisateurs = loadJSON(LS_UTILISATEURS, UTILISATEURS_MOCK, { seed: false });
  const eleve = utilisateurs.find(u => u.id === payload.eleve_id);
  const nomEleve = eleve ? `${eleve.prenom} ${eleve.nom}`.trim() : (payload.eleve_nom || 'Élève');
  const statut = payload.justifie ? 'justifie' : 'non_justifie';

  const cree = {
    id: crypto.randomUUID ? crypto.randomUUID() : `mock-abs-${Date.now()}`,
    eleve_id: payload.eleve_id ?? null,
    eleve: nomEleve,
    nom: eleve?.nom ?? '',
    prenom: eleve?.prenom ?? '',
    classe_id: eleve?.classe_id ?? null,
    classe: eleve?.classe ?? '—',
    date_absence: payload.date_absence ?? aujourdhuiIso(),
    type: payload.type === 'retard' ? 'retard' : 'absence',
    duree_heures: payload.type === 'retard' ? null : (payload.duree_heures ?? null),
    minutes_retard: payload.type === 'retard' ? (payload.minutes_retard ?? 10) : null,
    libelle: payload.libelle ?? null,
    motif: payload.motif ?? '',
    notes: payload.motif ?? '',
    statut,
    justifie: Boolean(payload.justifie),
    justificatif_envoye: false,
    telephone: eleve?.telephone ?? null,
    email: eleve?.email ?? null,
    created_at: new Date().toISOString(),
  };

  const liste = loadJSON(LS_ABSENCES, ABSENCES);
  saveJSON(LS_ABSENCES, [cree, ...liste]);
  return versAbsenceMock(cree);
}

// Mettre à jour une absence (justifier, modifier le motif, refuser le justificatif).
export async function updateAbsenceAdmin(id, payload) {
  if (!USE_MOCKS) {
    const data = await api.patch(`/admin/absences/${encodeURIComponent(id)}`, payload);
    return versAbsenceAdmin(data.absence);
  }

  const liste = loadJSON(LS_ABSENCES, ABSENCES);
  let maj = null;
  const suivante = liste.map(item => {
    if (item.id !== id) return item;
    const justifie = payload.justifie !== undefined ? Boolean(payload.justifie) : item.statut === 'justifie';
    const justificatif_envoye = payload.supprimer_justificatif ? false : (Boolean(item.justificatif_envoye) || item.statut === 'en_attente');
    const statut = justifie ? 'justifie' : (justificatif_envoye ? 'en_attente' : 'non_justifie');
    const motif = payload.motif !== undefined ? (payload.motif ?? '') : (item.motif ?? item.notes ?? '');
    maj = { ...item, justifie, justificatif_envoye, statut, motif, notes: motif };
    return maj;
  });
  if (!maj) throw new Error('Absence introuvable');
  saveJSON(LS_ABSENCES, suivante);
  return versAbsenceMock(maj);
}

// Joindre un justificatif côté administration (formulaire multipart).
export async function uploadJustificatifAdmin(id, { fichier, motif }) {
  if (!USE_MOCKS) {
    const formData = new FormData();
    formData.append('fichier', fichier);
    if (motif && motif.trim() !== '') {
      formData.append('motif', motif.trim());
    }
    const data = await api.post(`/admin/absences/${encodeURIComponent(id)}/justificatif`, formData);
    return versAbsenceAdmin(data.absence);
  }

  const liste = loadJSON(LS_ABSENCES, ABSENCES);
  let maj = null;
  const suivante = liste.map(item => {
    if (item.id !== id) return item;
    const justifie = item.statut === 'justifie';
    const nextMotif = motif?.trim() || item.motif || item.notes || '';
    maj = {
      ...item,
      justificatif_envoye: true,
      statut: justifie ? 'justifie' : 'en_attente',
      motif: nextMotif,
      notes: nextMotif,
    };
    return maj;
  });
  if (!maj) throw new Error('Absence introuvable');
  saveJSON(LS_ABSENCES, suivante);
  return versAbsenceMock(maj);
}

export function getJustificatifAbsenceUrl(id) {
  return `${BASE_URL}/admin/absences/${encodeURIComponent(id)}/justificatif`;
}

// Supprimer une absence côté administration.
export async function deleteAbsenceAdmin(id) {
  if (!USE_MOCKS) {
    await api.delete(`/admin/absences/${encodeURIComponent(id)}`);
    return;
  }
  const liste = loadJSON(LS_ABSENCES, ABSENCES);
  saveJSON(LS_ABSENCES, liste.filter(item => item.id !== id));
}

// ── Élève ───────────────────────────────────────────────────────────────────

// Absence ou retard du back (GET /eleve/absences) → ligne du tableau de la page Vie scolaire
//   { id, date, duree, type: 'Absence' | 'Retard', motif, statut }
// statut : « justifie », « en_attente » (justificatif envoyé, pas encore validé) ou « non_justifie »,
// calculé par le back (à défaut : d'après `justifie`).
export function versLigneAbsence(a) {
  const retard = a.type === 'retard';
  let duree = '—';
  if (retard && a.minutes_retard) duree = `${a.minutes_retard} min`;
  else if (!retard && a.duree_heures != null) duree = heures(a.duree_heures);
  else if (a.cours_debut && a.cours_fin) duree = `${heureCours(a.cours_debut)} – ${heureCours(a.cours_fin)}`;

  return {
    id: a.id,
    date: dateFr(a.date_absence),
    duree,
    type: retard ? 'Retard' : 'Absence',
    motif: a.motif || a.libelle || a.matiere || '',
    statut: a.statut ?? (a.justifie ? 'justifie' : 'non_justifie'),
  };
}

// Absences et retards de l'élève connecté (page Vie scolaire), de la plus récente à la plus ancienne :
// [{ id, date, duree, type, motif, statut }]. Le résumé du bloc d'accueil vient de services/accueil.js.
// Mocks : les absences de démonstration dont l'élève porte le nom de `user`.
export async function getAbsencesEleve(user) {
  if (!USE_MOCKS) return (await api.get('/eleve/absences')).absences.map(versLigneAbsence);

  const nomComplet = [user?.prenom, user?.nom].filter(Boolean).join(' ');
  return loadJSON(LS_ABSENCES, ABSENCES)
    .filter(a => !nomComplet || a.eleve === nomComplet)
    .map(versAbsenceMock)
    .map(a => ({ id: a.id, date: a.date, duree: a.duree, type: a.typeLabel, motif: a.motif, statut: a.statut }));
}

// Règles des fichiers du back (helpers.php), reprises pour valider avant l'envoi
export { EXTENSIONS_FICHIER, TAILLE_MAX_FICHIER } from './devoirs.js';
export const MOTIF_MAX = 2000;

// Envoie un justificatif pour une de MES absences (POST /eleve/absences/{id}/justificatif, formulaire multipart) :
// l'absence passe « en attente » jusqu'à la validation par l'administration.
// Renvoie { statut, motif } de l'absence après l'envoi. 404 si l'absence n'est pas la mienne, 409 si elle est déjà justifiée.
export async function envoyerJustificatifEleve(id, { fichier, motif }) {
  const motifPropre = motif?.trim() ?? '';
  if (!USE_MOCKS) {
    const formData = new FormData();
    formData.append('fichier', fichier);
    if (motifPropre) formData.append('motif', motifPropre);
    const data = await api.post(`/eleve/absences/${encodeURIComponent(id)}/justificatif`, formData);
    return { statut: data.absence.statut, motif: data.absence.motif ?? '' };
  }

  const liste = loadJSON(LS_ABSENCES, ABSENCES);
  const cible = liste.find(item => String(item.id) === String(id));
  if (!cible) throw Object.assign(new Error('Absence introuvable'), { status: 404 });
  if (cible.statut === 'justifie') throw Object.assign(new Error('Cette absence est déjà justifiée'), { status: 409 });
  const nouveauMotif = motifPropre || cible.motif || cible.notes || '';
  saveJSON(LS_ABSENCES, liste.map(item => (
    String(item.id) === String(id)
      ? { ...item, statut: 'en_attente', justificatif_envoye: true, motif: nouveauMotif, notes: nouveauMotif }
      : item
  )));
  return { statut: 'en_attente', motif: nouveauMotif };
}
