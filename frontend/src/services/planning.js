import { erreurNonDisponible, USE_MOCKS } from './api.js';
import { LS_COURS, loadJSON } from './storage.js';
import { CLASSES, COURS_DU_JOUR } from '@/mocks/planning.js';

// Les routes admin des emplois du temps (GET /admin/cours…, tâches EDT-01 et EDT-02 de backend/ROUTES.md)
// n'existent pas encore : en mode API on ne les appelle pas, les pages affichent ces messages.
// (L'emploi du temps personnel d'un élève ou d'un prof est dans services/emploiDuTemps.js, il existe côté back.)

// Emplois du temps de toutes les classes + liste des salles
// → { classes: { [classe]: { [jour]: cours[] } }, salles: string[] }
export async function getPlanning() {
  if (!USE_MOCKS) {
    throw erreurNonDisponible("Les emplois du temps des classes ne sont pas encore disponibles sur le serveur.");
  }

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
  if (!USE_MOCKS) {
    throw erreurNonDisponible("Les cours du jour de l'établissement ne sont pas encore disponibles sur le serveur.");
  }
  return loadJSON(LS_COURS, COURS_DU_JOUR);
}
