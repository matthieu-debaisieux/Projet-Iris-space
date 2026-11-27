// ── Aides sur l'objet utilisateur renvoyé par le back ───────────────────────
// Forme (back : routes/auth.php, POST /auth/login et GET /auth/me) :
//   { id, identifiant, email, role, nom, prenom, photo_url }
// `role` vaut l'une des valeurs de l'enum SQL `role_utilisateur`.
//
// Règle du projet : une page n'utilise PAS ces fonctions pour décider quoi afficher,
// elle passe par les droits (`useAuth().can('droit')`). Elles servent aux rares cas
// où le rôle lui-même compte (redirection après connexion, libellé…).

export const ROLES = {
  ADMINISTRATEUR: 'administrateur',
  DIRECTION: 'direction',
  PROFESSEUR: 'professeur',
  ELEVE: 'eleve',
  DEV: 'dev',
};

// Le back donne les mêmes accès à `administrateur` et `direction` (groupe /api/admin)
export const estAdmin = user => user?.role === ROLES.ADMINISTRATEUR || user?.role === ROLES.DIRECTION;
export const estProf  = user => user?.role === ROLES.PROFESSEUR;
export const estEleve = user => user?.role === ROLES.ELEVE;
export const estDev   = user => user?.role === ROLES.DEV;

// « Prénom Nom » (le back sépare `prenom` et `nom`) ; ignore un champ vide
export const nomComplet = user => [user?.prenom, user?.nom].filter(Boolean).join(' ');
