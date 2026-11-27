import { api, USE_MOCKS } from './api.js';
import { NOTES, PROFIL, RACCOURCIS } from '@/mocks/eleve.js';

// Données de l'élève connecté

export async function getRaccourcis() {
  if (!USE_MOCKS) return api.get('/eleve/raccourcis');
  return RACCOURCIS;
}

export async function getNotes() {
  if (!USE_MOCKS) return api.get('/eleve/notes');
  return NOTES;
}

export async function getProfil() {
  if (!USE_MOCKS) return api.get('/eleve/profil');
  return PROFIL;
}
