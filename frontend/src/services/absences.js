import { api, erreurNonDisponible, USE_MOCKS } from './api.js';
import { LS_ABSENCES, loadJSON } from './storage.js';
import { ABSENCES } from '@/mocks/absences.js';

export const STATUT_ABSENCE_LABEL = {
  en_attente:   'En attente',
  justifie:     'Justifié',
  non_justifie: 'Non justifié',
};

// Absences du jour de tout l'établissement (bloc « Absences aujourd'hui » du tableau de bord admin).
// La route admin (GET /admin/absences, tâche bonus VSC-01 de backend/ROUTES.md) n'existe pas encore :
// en mode API on ne l'appelle pas, le tableau de bord affiche ce message.
export async function getAbsencesDuJour() {
  if (!USE_MOCKS) {
    throw erreurNonDisponible("Les absences du jour ne sont pas encore disponibles sur le serveur.");
  }
  return loadJSON(LS_ABSENCES, ABSENCES);
}

// 'AAAA-MM-JJ' → 'JJ/MM/AAAA' (lu dans le texte, sans passer par Date : pas de décalage de fuseau)
const dateFr = iso => iso.split('-').reverse().join('/');

// Nombre d'heures du back ('4.00') → '4 h', '1,5 h'
const heures = n => `${Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} h`;

// Heure de Paris du back ('2026-10-21 09:30:00+02') → '09h30'
const heureCours = horodatage => horodatage.replace(/^\d{4}-\d{2}-\d{2}[T ](\d{2}):(\d{2}).*$/, '$1h$2');

// Absence ou retard du back (GET /eleve/absences) → ligne du tableau de la page Vie scolaire
//   { id, date, duree, type: 'Absence' | 'Retard', motif, statut }
// Le back ne connaît que « justifié » ou non : le statut « en attente » n'existe que pour les justifications
// envoyées depuis le formulaire de la page.
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
    statut: a.justifie ? 'justifie' : 'non_justifie',
  };
}

// Absences et retards de l'élève connecté (page Vie scolaire), de la plus récente à la plus ancienne :
// [{ id, date, duree, type, motif, statut }]. Le résumé du bloc d'accueil vient de services/accueil.js.
// Mocks : les absences de démonstration dont l'élève porte le nom de `user`.
export async function getAbsencesEleve(user) {
  if (!USE_MOCKS) return (await api.get('/eleve/absences')).absences.map(versLigneAbsence);

  const liste = loadJSON(LS_ABSENCES, ABSENCES);
  return user?.nom ? liste.filter(a => a.eleve === user.nom) : liste;
}
