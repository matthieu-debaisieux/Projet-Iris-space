import { api, USE_MOCKS } from './api.js';
import { LS_COURS, loadJSON } from './storage.js';
import { CLASSES, COURS_DU_JOUR } from '@/mocks/planning.js';

// Emplois du temps de toutes les classes + liste des salles
// → { classes: { [classe]: { [jour]: cours[] } }, salles: string[] }
export async function getPlanning() {
  if (!USE_MOCKS) return api.get('/planning');

  const classes = structuredClone(CLASSES);
  const salles = Array.from(new Set(
    Object.values(classes)
      .flatMap(jours => Object.values(jours).flat())
      .map(c => c.room.trim())
      .filter(Boolean),
  )).sort();
  return { classes, salles };
}

// Tableau "Cours aujourd'hui" du dashboard admin
export async function getCoursDuJour() {
  if (!USE_MOCKS) return api.get('/planning/aujourdhui');
  return loadJSON(LS_COURS, COURS_DU_JOUR);
}
