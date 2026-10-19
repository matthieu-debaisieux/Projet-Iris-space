export const CONVERSATIONS = [
  {
    id: 'sio-slam',
    name: 'SIO SLAM',
    group: true,
    extra: '+6',
    lastSeen: 'il y a 6 minutes',
    messages: [
      { from: 'Marie Lambert', text: 'Bonjour, est-ce que le rendu du projet est bien pour vendredi ?', sent: false },
      { from: 'Lucas Martin',  text: "Oui c'est confirmé, vendredi 18h dernier délai.", sent: false },
      { from: 'Jean Dupond',   text: 'Merci pour la précision !', sent: false },
    ],
  },
  {
    id: 'jean-dupond',
    name: 'Jean Dupond',
    group: false,
    lastSeen: 'il y a 2 minutes',
    messages: [
      { from: 'Jean Dupond', text: "Bonjour, j'ai une question sur mon absence de lundi.", sent: false },
    ],
  },
  {
    id: 'marie-lambert',
    name: 'Marie Lambert',
    group: false,
    lastSeen: 'il y a 1 heure',
    messages: [
      { from: 'Marie Lambert', text: 'Mon certificat médical a bien été reçu ?', sent: false },
      { from: 'me',            text: 'Oui, tout est en ordre. Bonne journée !', sent: true },
    ],
  },
  {
    id: 'lucas-martin',
    name: 'Lucas Martin',
    group: false,
    lastSeen: 'il y a 3 heures',
    messages: [
      { from: 'Lucas Martin', text: 'Pouvez-vous me transmettre mon emploi du temps ?', sent: false },
    ],
  },
  {
    id: 'sophie-bernard',
    name: 'Sophie Bernard',
    group: false,
    lastSeen: 'hier',
    messages: [
      { from: 'Sophie Bernard', text: 'Merci pour votre retour rapide.', sent: false },
    ],
  },
  {
    id: 'direction',
    name: 'Direction',
    group: false,
    lastSeen: 'il y a 5 minutes',
    messages: [
      { from: 'Direction', text: 'Réunion pédagogique reportée à jeudi 14h.', sent: false },
    ],
  },
];
