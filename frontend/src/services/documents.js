import { api, USE_MOCKS } from './api.js';
import { ESPACES } from '@/mocks/documents.js';

// Espaces documentaires : [{ id, name, docs: [{ id, name }] }]
// (mode mock : les modifications ne sont pas persistées)
export async function getEspaces() {
  if (!USE_MOCKS) return api.get('/espaces');
  return structuredClone(ESPACES);
}
