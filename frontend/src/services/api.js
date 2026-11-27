// ── Client HTTP vers le back ────────────────────────────────────────────────
// Tant que `VITE_USE_MOCKS` vaut autre chose que "false", les services
// utilisent les mocks + localStorage et ce client n'est pas appelé.
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false';

export const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

export class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// ── Fonctions dont la partie serveur n'existe pas encore ────────────────────
// En mode API, un service qui n'a pas (encore) de route côté back ne l'appelle pas : il lève cette
// erreur. DataState et les pages l'affichent comme un message neutre (pas comme une panne).
export function erreurNonDisponible(message) {
  const erreur = new Error(message);
  erreur.nonDisponible = true;
  return erreur;
}

export const estNonDisponible = erreur => erreur?.nonDisponible === true;

// Texte de l'erreur s'il peut s'afficher tel quel à l'utilisateur, sinon null :
//   - fonction « non disponible » (message écrit pour l'utilisateur)
//   - réponse du back au format { error: "…" } (message en français)
// Les autres erreurs (réseau, « GET /x → 404 », bug de code) restent techniques et ne s'affichent pas.
export function messageLisible(erreur) {
  if (estNonDisponible(erreur)) return erreur.message;
  if (erreur instanceof ApiError && typeof erreur.data?.error === 'string' && erreur.data.error.trim() !== '') {
    return erreur.data.error;
  }
  return null;
}

let onUnauthorized = null;

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

export async function apiFetch(path, { method = 'GET', body, skipUnauthorized = false } = {}) {
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  const res = await fetch(BASE_URL + path, {
    method,
    headers: body !== undefined && !isFormData ? { 'Content-Type': 'application/json' } : undefined,
    body: body === undefined ? undefined : (isFormData ? body : JSON.stringify(body)),
    credentials: 'include', // envoie le cookie de session
  });

  if (!res.ok) {
    let data = null;
    try {
      data = await res.json();
    } catch {
      // Réponse non-JSON : on conserve le message par défaut
    }

    const message =
      data && typeof data.error === 'string' && data.error.trim() !== ''
        ? data.error
        : `${method} ${path} → ${res.status}`;

    if (res.status === 401 && !skipUnauthorized && onUnauthorized) {
      onUnauthorized();
    }

    throw new ApiError(message, res.status, data);
  }

  return res.status === 204 ? null : res.json();
}

export const api = {
  get:    (path, opts)                     => apiFetch(path, { ...opts, method: 'GET' }),
  post:   (path, body, opts)               => apiFetch(path, { ...opts, method: 'POST', body }),
  put:    (path, body, opts)               => apiFetch(path, { ...opts, method: 'PUT', body }),
  patch:  (path, body, opts)               => apiFetch(path, { ...opts, method: 'PATCH', body }),
  delete: (path, opts)                     => apiFetch(path, { ...opts, method: 'DELETE' }),
  upload: (path, formData, method = 'POST', opts) => apiFetch(path, { ...opts, method, body: formData }),
};
