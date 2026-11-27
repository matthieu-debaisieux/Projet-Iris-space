// ── Client HTTP vers le back ────────────────────────────────────────────────
// Tant que `VITE_USE_MOCKS` vaut autre chose que "false", les services
// utilisent les mocks + localStorage et ce client n'est pas appelé.
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false';

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

export async function apiFetch(path, { method = 'GET', body } = {}) {
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  const res = await fetch(BASE_URL + path, {
    method,
    headers: isFormData || body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: isFormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
    credentials: 'include', // envoie le cookie de session
  });

  if (!res.ok) {
    let data = null;
    try {
      data = await res.json();
    } catch {
      // Ignorer l'échec de lecture si le corps n'est pas du JSON
    }

    const message = data?.error ? data.error : `${method} ${path} → ${res.status}`;
    const error = new Error(message);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return res.status === 204 ? null : res.json();
}

export const api = {
  get:    path                              => apiFetch(path),
  post:   (path, body)                      => apiFetch(path, { method: 'POST', body }),
  put:    (path, body)                      => apiFetch(path, { method: 'PUT', body }),
  patch:  (path, body)                      => apiFetch(path, { method: 'PATCH', body }),
  delete: path                              => apiFetch(path, { method: 'DELETE' }),
  upload: (path, formData, method = 'POST') => apiFetch(path, { method, body: formData }),
};
