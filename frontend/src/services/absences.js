import { api, USE_MOCKS } from './api.js';
import { LS_ABSENCES, loadJSON } from './storage.js';
import { ABSENCES } from '@/mocks/absences.js';

export const STATUT_ABSENCE_LABEL = {
  en_attente:   'En attente',
  justifie:     'Justifié',
  non_justifie: 'Non justifié',
};

// Absences du jour
export async function getAbsences() {
  if (!USE_MOCKS) return api.get('/absences?date=today');
  return loadJSON(LS_ABSENCES, ABSENCES);
}
