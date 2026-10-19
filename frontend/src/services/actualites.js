import { api, USE_MOCKS } from './api.js';
import { LS_ACTUALITES, loadJSON, saveJSON } from './storage.js';
import { ACTUALITES } from '@/mocks/actualites.js';

export const STATUTS_ACTUALITE = ['Publié', 'Brouillon', 'Archivé'];

const lire = () => loadJSON(LS_ACTUALITES, ACTUALITES);

export async function getActualites() {
  if (!USE_MOCKS) return api.get('/actualites');
  return lire();
}

export async function getActualitesPubliees() {
  if (!USE_MOCKS) return api.get('/actualites?statut=Publié');
  return lire().filter(a => a.statut === 'Publié');
}

// Renvoie l'actualité créée (avec son id)
export async function createActualite(data) {
  if (!USE_MOCKS) return api.post('/actualites', data);
  const all = lire();
  const actu = { id: all.length > 0 ? Math.max(...all.map(a => a.id)) + 1 : 0, image: '', ...data };
  saveJSON(LS_ACTUALITES, [...all, actu]);
  return actu;
}

// Renvoie l'actualité modifiée
export async function updateActualite(id, data) {
  if (!USE_MOCKS) return api.put(`/actualites/${id}`, data);
  const all = lire().map(a => (a.id === id ? { ...a, ...data } : a));
  saveJSON(LS_ACTUALITES, all);
  return all.find(a => a.id === id);
}

export async function deleteActualite(id) {
  if (!USE_MOCKS) return api.delete(`/actualites/${id}`);
  saveJSON(LS_ACTUALITES, lire().filter(a => a.id !== id));
}
