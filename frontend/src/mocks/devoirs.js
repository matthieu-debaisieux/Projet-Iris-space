// Données de démonstration de l'espace professeur pour les devoirs.
// Même format que les réponses du back (backend/routes/prof.php).

// GET /api/prof/classes → { classes } : les classes de l'année où le prof enseigne,
// chacune avec les matières qu'il y enseigne (menus « Classe » puis « Matière »).
export const CLASSES_PROF = [
  {
    id: 1,
    nom: 'Iris 1',
    matieres: [
      { id: 1, nom: 'Mathématiques', coefficient: 2 },
      { id: 3, nom: 'Cybersécurité', coefficient: 3 },
    ],
  },
  {
    id: 2,
    nom: 'Iris 2',
    matieres: [
      { id: 3, nom: 'Cybersécurité', coefficient: 4 },
      { id: 4, nom: 'Anglais', coefficient: 2 },
    ],
  },
];

// GET /api/prof/devoirs → { devoirs } : les devoirs du prof connecté, du plus lointain au plus proche.
// Dates comme le back : `donne_le` AAAA-MM-JJ, `a_rendre_le` « AAAA-MM-JJ HH:MM:SS+01 ».
// Deux champs en plus de la réponse actuelle de la liste (`description` et `fichiers`), que le back
// renvoie déjà pour un seul devoir (`description`) ou renverra avec les pièces jointes (DEV-05, table
// devoir_fichier : { id, nom, taille_o }).
export const DEVOIRS_PROF = [
  {
    id: 'a1b2c3d4-0001-4000-8000-000000000001',
    classe_id: 2, classe: 'Iris 2',
    matiere_id: 4, matiere: 'Anglais',
    type: 'projet',
    titre: 'Présentation orale : une entreprise du numérique',
    description: 'Préparer 5 minutes de présentation en anglais sur une entreprise du numérique de votre choix.',
    donne_le: '2026-11-23',
    a_rendre_le: '2026-12-10 08:00:00+01',
    rendu_en_ligne: false,
    eleves: 22, faits: 0, rendus: 0,
    fichiers: [],
  },
  {
    id: 'a1b2c3d4-0002-4000-8000-000000000002',
    classe_id: 1, classe: 'Iris 1',
    matiere_id: 3, matiere: 'Cybersécurité',
    type: 'controle',
    titre: 'Contrôle : pare-feu et VPN',
    description: 'Réviser le chapitre 4 (pare-feu, VPN, DMZ). Aucun document autorisé.',
    donne_le: '2026-11-25',
    a_rendre_le: '2026-12-08 08:00:00+01',
    rendu_en_ligne: false,
    eleves: 24, faits: 0, rendus: 0,
    fichiers: [{ id: 'f0000000-0001-4000-8000-000000000001', nom: 'Chapitre 4 - fiche de revision.pdf', taille_o: 245760 }],
  },
  {
    id: 'a1b2c3d4-0003-4000-8000-000000000003',
    classe_id: 1, classe: 'Iris 1',
    matiere_id: 1, matiere: 'Mathématiques',
    type: 'travail_a_faire',
    titre: 'Exercices 12 à 15',
    description: 'Exercices 12 à 15 page 42 du manuel. À rendre en ligne sous forme de photo ou de PDF.',
    donne_le: '2026-11-24',
    a_rendre_le: '2026-12-03 23:59:00+01',
    rendu_en_ligne: true,
    eleves: 24, faits: 0, rendus: 0,
    fichiers: [],
  },
];
