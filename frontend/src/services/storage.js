// ── Clés localStorage ───────────────────────────────────────────────────────
export const LS_SESSION       = 'iris_session_v2';
export const LS_MESSAGES      = 'iris_messageCount';
export const LS_ABSENCES      = 'iris_absences_v2';
export const LS_COURS         = 'iris_cours';
export const LS_ACTUALITES    = 'iris_actualites_v2'; // v2 : format du back (auteur_id, statut publie / brouillon…)
export const LS_CONVERSATIONS = 'iris_conversations';
export const LS_DOCUMENTS     = 'iris_documents_v2';
export const LS_MES_DOCUMENTS = 'iris_mes_documents_v1';
export const LS_UTILISATEURS  = 'iris_utilisateurs_v1';
export const LS_PROGRAMME     = 'iris_programme_v1';
export const LS_DEVOIRS       = 'iris_devoirs';
export const LS_PROFIL        = 'iris_profil';
export const LS_NOTIFICATIONS = 'iris_notifications_v1'; // { [id du compte]: notifications } : mode mocks
export const LS_NOTES_PROF    = 'iris_notes_prof_v1'; // évaluations et notes saisies par le professeur

// Lit une valeur JSON ; si absente ou corrompue, enregistre (quand `seed` est
// vrai) et renvoie une copie de `fallback`.
export function loadJSON(key, fallback, { seed = true } = {}) {
  const raw = localStorage.getItem(key);
  if (raw) {
    try { return JSON.parse(raw); } catch { /* données corrompues : on réinitialise */ }
  }
  const value = structuredClone(fallback);
  if (seed) saveJSON(key, value);
  return value;
}

export function saveJSON(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// Panel DEV : remet les données de démonstration à zéro
export function resetDemoData() {
  [LS_ABSENCES, LS_COURS, LS_ACTUALITES, LS_DOCUMENTS, LS_MES_DOCUMENTS, LS_UTILISATEURS, LS_DEVOIRS, LS_PROFIL, LS_NOTIFICATIONS, LS_NOTES_PROF, LS_PROGRAMME].forEach(key => localStorage.removeItem(key));
}
