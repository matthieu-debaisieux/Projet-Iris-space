// ── Client HTTP vers le back ────────────────────────────────────────────────
// Tant que `VITE_USE_MOCKS` vaut autre chose que "false", les services
// utilisent les mocks + localStorage et ce client n'est pas appelé.
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false';

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

// Erreur renvoyée par le back : `message` est le texte de { "error" }, affichable tel quel ;
// `status` le code HTTP (401, 403, 429…).
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// `body` : objet (envoyé en JSON) ou FormData (formulaire avec fichier, champ « fichier »)
export async function apiFetch(path, { method = 'GET', body } = {}) {
  const estFormulaire = body instanceof FormData;
  const res = await fetch(BASE_URL + path, {
    method,
    headers: body !== undefined && !estFormulaire ? { 'Content-Type': 'application/json' } : undefined,
    body: body === undefined ? undefined : (estFormulaire ? body : JSON.stringify(body)),
    credentials: 'include', // envoie le cookie de session
  });
  if (!res.ok) {
    const erreur = await res.json().catch(() => null);
    throw new ApiError(erreur?.error ?? `${method} ${path} → ${res.status}`, res.status);
  }
  return res.status === 204 ? null : res.json();
}

export const api = {
  get:    path         => apiFetch(path),
  post:   (path, body) => apiFetch(path, { method: 'POST', body }),
  put:    (path, body) => apiFetch(path, { method: 'PUT', body }),
  patch:  (path, body) => apiFetch(path, { method: 'PATCH', body }),
  delete: path         => apiFetch(path, { method: 'DELETE' }),
};
