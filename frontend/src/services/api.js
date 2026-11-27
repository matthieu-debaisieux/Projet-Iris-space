// ── Client HTTP vers le back ────────────────────────────────────────────────
// Tant que `VITE_USE_MOCKS` vaut autre chose que "false", les services
// utilisent les mocks + localStorage et ce client n'est pas appelé.
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false';

export const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
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
    let message = `${method} ${path} → ${res.status}`;
    try {
      const payload = await res.json();
      if (payload && typeof payload.error === 'string' && payload.error.trim() !== '') {
        message = payload.error;
      }
    } catch {
      // Réponse non-JSON : on conserve le message par défaut
    }
    if (res.status === 401 && !skipUnauthorized && onUnauthorized) {
      onUnauthorized();
    }
    throw new ApiError(message, res.status);
  }

  return res.status === 204 ? null : res.json();
}

export const api = {
  get:    (path, opts)       => apiFetch(path, { ...opts, method: 'GET' }),
  post:   (path, body, opts) => apiFetch(path, { ...opts, method: 'POST', body }),
  put:    (path, body, opts) => apiFetch(path, { ...opts, method: 'PUT', body }),
  patch:  (path, body, opts) => apiFetch(path, { ...opts, method: 'PATCH', body }),
  delete: (path, opts)       => apiFetch(path, { ...opts, method: 'DELETE' }),
};
