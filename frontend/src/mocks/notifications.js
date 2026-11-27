// Notifications de démonstration (mode mock uniquement). Chaque entrée a la forme d'une ligne du
// back (backend/routes/notifications.php) à deux détails près : `depuis_minutes` (âge de la
// notification à sa création) remplace `created_at`, et `lue` remplace `lue_at`. Le service
// transforme ces champs en vraies dates au premier chargement.
const MINUTE = 1;
const HEURE = 60 * MINUTE;
const JOUR = 24 * HEURE;

const ELEVE = [
  { type: 'devoir',    titre: 'Nouveau devoir en Mathématiques : exercices 4 à 9', lien: '/devoirs',   depuis_minutes: 12 * MINUTE, lue: false },
  { type: 'note',      titre: 'Nouvelle note en Histoire-Géographie',              lien: '/notes',     depuis_minutes: 3 * HEURE,   lue: false },
  { type: 'message',   titre: 'Nouveau message de Jeanne Martin',                  lien: '/messages',  depuis_minutes: 26 * HEURE,  lue: false },
  { type: 'absence',   titre: 'Absence enregistrée le 12/11',                      lien: '/absences',  depuis_minutes: 3 * JOUR,    lue: true },
  { type: 'actualite', titre: 'Nouvelle actualité : Journée portes ouvertes',      lien: '/actualites', depuis_minutes: 6 * JOUR,  lue: true },
];

const PROF = [
  { type: 'message',   titre: 'Nouveau message de la direction',                   lien: '/messages',        depuis_minutes: 25 * MINUTE, lue: false },
  { type: 'systeme',   titre: 'Cours déplacé : Mathématiques, classe B2',          lien: '/emploi-du-temps', depuis_minutes: 5 * HEURE,   lue: false },
  { type: 'actualite', titre: 'Nouvelle actualité : Journée portes ouvertes',      lien: '/actualites',      depuis_minutes: 6 * JOUR,    lue: true },
];

const ADMIN = [
  { type: 'actualite', titre: 'Nouvelle actualité : Journée portes ouvertes',      lien: '/actualites',      depuis_minutes: 40 * MINUTE, lue: false },
  { type: 'message',   titre: 'Nouveau message de Pierre Durand',                  lien: '/messages',        depuis_minutes: 2 * JOUR,    lue: true },
  { type: 'systeme',   titre: 'Bienvenue sur Iris Space',                          lien: null,               depuis_minutes: 8 * JOUR,    lue: true },
];

// Jeu de départ d'un compte, choisi selon ses droits (jamais selon son rôle) : `devoirs_gerer`
// distingue un professeur d'un élève, tous deux ayant le droit `devoirs`.
export function notificationsDemo(droits = []) {
  if (droits.includes('devoirs_gerer')) return PROF;
  if (droits.includes('devoirs')) return ELEVE;
  return ADMIN;
}
