// ── Clés localStorage (identiques à l'ancienne version HTML) ─────────────────
export const LS_MESSAGES      = 'iris_messageCount';
export const LS_ABSENCES      = 'iris_absences';
export const LS_COURS         = 'iris_cours';
export const LS_ACTUALITES    = 'iris_actualites';
export const LS_CONVERSATIONS = 'iris_conversations';

// Lit une valeur JSON ; si absente ou corrompue, enregistre et renvoie `fallback`
// (quand `seed` est vrai) ou renvoie simplement `fallback`.
export function loadJSON(key, fallback, { seed = true } = {}) {
  const raw = localStorage.getItem(key);
  if (raw) {
    try { return JSON.parse(raw); } catch { /* données corrompues : on réinitialise */ }
  }
  if (seed) localStorage.setItem(key, JSON.stringify(fallback));
  return fallback;
}

export function saveJSON(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}
