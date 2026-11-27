import { api, USE_MOCKS } from './api.js';

export async function envoyerContact(demande) {
  if (USE_MOCKS) {
    await new Promise(resolve => setTimeout(resolve, 300));
    return { demande: { id: Date.now(), created_at: new Date().toISOString() } };
  }
  return api.post('/contact', demande);
}
