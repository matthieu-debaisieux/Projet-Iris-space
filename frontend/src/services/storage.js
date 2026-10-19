// ── Clés localStorage ───────────────────────────────────────────────────────
export const LS_SESSION       = 'iris_session';
export const LS_MESSAGES      = 'iris_messageCount';
export const LS_ABSENCES      = 'iris_absences_v2';
export const LS_COURS         = 'iris_cours';
export const LS_ACTUALITES    = 'iris_actualites';
export const LS_CONVERSATIONS = 'iris_conversations';

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
  [LS_ABSENCES, LS_COURS, LS_ACTUALITES].forEach(key => localStorage.removeItem(key));
}
