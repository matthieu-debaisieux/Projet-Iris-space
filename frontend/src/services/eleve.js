import { api, USE_MOCKS } from './api.js';
import { EMPLOI_DU_JOUR, NOTES, PROFIL, RACCOURCIS } from '@/mocks/eleve.js';

// Données de l'élève connecté

export async function getEmploiDuJour(date) {
  if (!USE_MOCKS) return api.get(`/eleve/emploi-du-temps?date=${date.toISOString().slice(0, 10)}`);
  return EMPLOI_DU_JOUR;
}

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
