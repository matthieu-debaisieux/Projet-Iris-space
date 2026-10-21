// Comptes de test (mode mock uniquement).
// `droits` : codes renvoyés par le back (droits du rôle en base). Le front
// n'utilise jamais `role` pour afficher quelque chose, uniquement ces droits :
//   - un droit par page (`notes`, `documents`…) pour y accéder
//   - `<page>_gerer` pour les boutons de modification dans la page
//   - `tableau_de_bord` / `journee` : blocs de la page d'accueil
//   - `outils_dev` : panel DEV, `menu_lateral` : menu sur le côté au lieu d'en haut
const DROITS_ADMIN = [
  'menu_lateral', 'tableau_de_bord', 'absences', 'actualites', 'actualites_gerer', 'emploi_du_temps',
  'emploi_du_temps_gerer', 'documents', 'documents_gerer', 'messagerie', 'outils_dev',
];
const DROITS_PROF = [
  'journee', 'devoirs', 'notes', 'actualites', 'emploi_du_temps', 'messagerie', 'outils_dev',
];
const DROITS_ELEVE = [
  'journee', 'devoirs', 'notes', 'absences', 'actualites', 'emploi_du_temps', 'documents', 'messagerie',
];

export const USERS = [
  { id: 1, identifiant: 'admin', motDePasse: 'admin', role: 'admin', nom: 'Administration', droits: DROITS_ADMIN },
  { id: 2, identifiant: 'prof',  motDePasse: 'prof',  role: 'prof',  nom: 'NOM PRENOM',     droits: DROITS_PROF },
  { id: 3, identifiant: 'eleve', motDePasse: 'eleve', role: 'eleve', nom: 'John Doe',       droits: DROITS_ELEVE },
];
