// Même format que la réponse de `GET /actualites` du back (voir backend/ROUTES.md) :
//   - `statut` : "publie" ou "brouillon" (pas de statut archivé dans la bêta) ; `publie_at` est null pour un brouillon
//   - `publique` : vrai = visible par les visiteurs sans connexion
//   - l'auteur est un compte (`auteur_id` = id d'un utilisateur de mocks/users.js), plus un texte libre
export const ACTUALITES = [
  {
    id: 0, titre: 'Actualité #0', contenu: "Contenu complet de l'actualité #0.", image_url: null,
    publique: true, statut: 'publie', publie_at: '2026-06-24 09:00:00+02',
    created_at: '2026-06-23 17:30:00+02', updated_at: '2026-06-24 09:00:00+02',
    auteur_id: 1, auteur_nom: 'Administration', auteur_prenom: '',
  },
  {
    id: 1, titre: 'Actualité #1', contenu: "Contenu complet de l'actualité #1.", image_url: null,
    publique: true, statut: 'brouillon', publie_at: null,
    created_at: '2026-06-20 11:00:00+02', updated_at: '2026-06-20 11:00:00+02',
    auteur_id: 1, auteur_nom: 'Administration', auteur_prenom: '',
  },
  {
    id: 2, titre: 'Actualité #2', contenu: "Contenu complet de l'actualité #2, réservée aux comptes connectés.", image_url: null,
    publique: false, statut: 'publie', publie_at: '2026-06-15 14:00:00+02',
    created_at: '2026-06-15 13:00:00+02', updated_at: '2026-06-15 14:00:00+02',
    auteur_id: 2, auteur_nom: 'NOM PRENOM', auteur_prenom: '',
  },
  {
    id: 3, titre: 'Actualité #3', contenu: "Contenu complet de l'actualité #3.", image_url: null,
    publique: true, statut: 'publie', publie_at: '2026-06-10 08:30:00+02',
    created_at: '2026-06-09 16:00:00+02', updated_at: '2026-06-10 08:30:00+02',
    auteur_id: 1, auteur_nom: 'Administration', auteur_prenom: '',
  },
];
