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

// Forme alignée sur l'utilisateur renvoyé par le back (routes/auth.php) :
// { id, identifiant, email, role, nom, prenom, photo_url }, avec les rôles de l'enum SQL
// `role_utilisateur` : 'administrateur', 'direction', 'professeur', 'eleve'.
// En plus, pour le front seulement : `droits` (voir plus haut) et `motDePasse`
// (connexion mock, retiré par services/auth.js avant de renvoyer l'utilisateur).
// Le back donne à `direction` les mêmes accès qu'à `administrateur` (middleware requireRole).
export const USERS = [
  { id: '00000000-0000-4000-8000-000000000001', identifiant: 'admin',     motDePasse: 'admin',     email: 'admin@iris-space.fr',     role: 'administrateur', nom: 'Administration', prenom: '',       photo_url: null, droits: DROITS_ADMIN },
  { id: '00000000-0000-4000-8000-000000000002', identifiant: 'direction', motDePasse: 'direction', email: 'direction@iris-space.fr', role: 'direction',      nom: 'Direction',      prenom: '',       photo_url: null, droits: DROITS_ADMIN },
  { id: '00000000-0000-4000-8000-000000000003', identifiant: 'prof',      motDePasse: 'prof',      email: 'prof@iris-space.fr',      role: 'professeur',     nom: 'NOM',            prenom: 'PRENOM', photo_url: null, droits: DROITS_PROF },
  { id: '00000000-0000-4000-8000-000000000004', identifiant: 'eleve',     motDePasse: 'eleve',     email: 'eleve@iris-space.fr',     role: 'eleve',          nom: 'Doe',            prenom: 'John',   photo_url: null, droits: DROITS_ELEVE },
];
