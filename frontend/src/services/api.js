// ── Client HTTP vers le back ────────────────────────────────────────────────
// Tant que `VITE_USE_MOCKS` vaut autre chose que "false", les services
// utilisent les mocks + localStorage et ce client n'est pas appelé.
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false';

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

export async function apiFetch(path, { method = 'GET', body } = {}) {
  const res = await fetch(BASE_URL + path, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'include', // envoie le cookie de session
  });
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}`);
  return res.status === 204 ? null : res.json();
}

export const api = {
  get:    path         => apiFetch(path),
  post:   (path, body) => apiFetch(path, { method: 'POST', body }),
  put:    (path, body) => apiFetch(path, { method: 'PUT', body }),
  delete: path         => apiFetch(path, { method: 'DELETE' }),
};
