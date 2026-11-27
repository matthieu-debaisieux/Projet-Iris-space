// Semaine type récurrente (mode mocks) : classes[classe][jour] = tableau de cours
// Chaque cours : { start, end, subject, intervenant, room }
// services/planning.js en tire des cours datés, au format du back, pour les semaines autour d'aujourd'hui.
export const CLASSES = {
  'Iris 1': {
    Mercredi: [
      { start: '09h00', end: '13h00', subject: 'Cours1', intervenant: 'Intervenant 1', room: 'Salle' },
      { start: '14h00', end: '18h00', subject: 'Cours1', intervenant: 'Intervenant 1', room: 'Salle' },
    ],
    Jeudi: [
      { start: '09h00', end: '10h30', subject: 'Cours5', intervenant: 'Intervenant 8', room: 'Salle' },
      { start: '10h30', end: '12h00', subject: 'Cours3', intervenant: 'Intervenant 9', room: 'Salle' },
      { start: '13h00', end: '16h00', subject: 'Cours4', intervenant: 'Intervenant 4', room: 'Salle' },
      { start: '16h00', end: '18h00', subject: 'Cours6', intervenant: 'Intervenant 5', room: 'Salle' },
    ],
    Vendredi: [
      { start: '09h00', end: '11h00', subject: 'Cours1', intervenant: 'Intervenant 2', room: 'Salle' },
      { start: '11h00', end: '13h00', subject: 'Cours2', intervenant: 'Intervenant 6', room: 'Salle' },
      { start: '14h00', end: '18h00', subject: 'Cours9', intervenant: 'Intervenant 3', room: 'Salle' },
    ],
  },
  'Iris 2': {
    Mercredi: [
      { start: '09h00', end: '13h00', subject: 'Cours2', intervenant: 'Intervenant 6', room: 'Salle' },
      { start: '14h00', end: '18h00', subject: 'Cours5', intervenant: 'Intervenant 8', room: 'Salle' },
    ],
    Jeudi: [
      { start: '09h00', end: '10h30', subject: 'Cours1', intervenant: 'Intervenant 10', room: 'Salle' },
      { start: '10h30', end: '12h00', subject: 'Cours3', intervenant: 'Intervenant 7', room: 'Salle' },
      { start: '13h00', end: '18h00', subject: 'Cours1', intervenant: 'Intervenant 11', room: 'Salle' },
    ],
    Vendredi: [
      { start: '09h00', end: '11h00', subject: 'Cours3', intervenant: 'Intervenant 9', room: 'Salle' },
      { start: '11h00', end: '13h00', subject: 'Cours8', intervenant: 'Intervenant 3', room: 'Salle' },
      { start: '14h00', end: '18h00', subject: 'Cours7', intervenant: 'Intervenant 4', room: 'Salle' },
    ],
  },
};

// Jours de la semaine type ci-dessus, dans l'ordre (le lundi vaut 0)
export const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
