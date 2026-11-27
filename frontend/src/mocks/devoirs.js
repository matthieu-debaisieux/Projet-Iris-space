// Données de démonstration des devoirs (élève et professeur).
// Même format que les réponses du back (backend/routes/prof.php et eleve.php).

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

// Élèves de chaque classe (id de classe → élèves). John Doe (id '4') est le compte « eleve » de
// mocks/users.js : c'est lui qui voit la page élève en mode mocks. Les autres n'existent que pour
// remplir le suivi du professeur.
export const ID_ELEVE_MOCK = '4';
export const ELEVES_CLASSES = {
  1: [
    { id: ID_ELEVE_MOCK, nom: 'Doe', prenom: 'John' },
    { id: 'mock-eleve-101', nom: 'Martin', prenom: 'Sophie' },
    { id: 'mock-eleve-102', nom: 'Petit', prenom: 'Hugo' },
    { id: 'mock-eleve-103', nom: 'Bernard', prenom: 'Emma' },
  ],
  2: [
    { id: 'mock-eleve-201', nom: 'Moreau', prenom: 'Lucas' },
    { id: 'mock-eleve-202', nom: 'Durand', prenom: 'Chloé' },
    { id: 'mock-eleve-203', nom: 'Leroy', prenom: 'Noah' },
  ],
};

// Suivi d'un élève pour un devoir (une ligne de GET /api/prof/devoirs/{id}/suivi) :
// { eleve_id, nom, prenom, statut, fait_at, rendu_at, commentaire_eleve, note, appreciation,
//   corrige_at, fichiers: fichiers rendus [{ id, nom, depose_at }] }
export const suiviEleve = (eleve, details = {}) => ({
  eleve_id: eleve.id, nom: eleve.nom, prenom: eleve.prenom,
  statut: 'a_faire', fait_at: null, rendu_at: null, commentaire_eleve: null,
  note: null, appreciation: null, corrige_at: null, fichiers: [],
  ...details,
});

// Un devoir sans rien de fait : un suivi « à faire » par élève de la classe
export const suiviVide = classeId => (ELEVES_CLASSES[classeId] ?? []).map(e => suiviEleve(e));

// Pour les données ci-dessous : le suivi des élèves de la classe, avec le détail de certains (par id d'élève)
const suiviClasse = (classeId, parEleve = {}) =>
  ELEVES_CLASSES[classeId].map(e => suiviEleve(e, parEleve[e.id]));
const rendu = (id, nom, depose_at) => ({ id, nom, depose_at });

// Devoirs du professeur, avec le suivi de chaque élève (`suivi`).
// GET /api/prof/devoirs ne renvoie que le nombre d'élèves (`eleves`), de « faits » et de « rendus » :
// le service les calcule à partir du suivi. L'élève voit son propre suivi dans GET /api/eleve/devoirs.
// Dates comme le back : `donne_le` AAAA-MM-JJ, `a_rendre_le` « AAAA-MM-JJ HH:MM:SS+01 ».
// `fichiers` : pièces jointes du professeur { id, nom, taille_o } (en mode mocks, ceux d'exemple n'ont
// pas de contenu à télécharger ; seuls les fichiers ajoutés pendant la session en ont un).
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
    fichiers: [],
    suivi: suiviClasse(2),
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
    fichiers: [{ id: 'f0000000-0001-4000-8000-000000000001', nom: 'Chapitre 4 - fiche de revision.pdf', taille_o: 245760 }],
    suivi: suiviClasse(1, {
      'mock-eleve-103': { statut: 'fait', fait_at: '2026-11-26T18:30:00+01:00' },
    }),
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
    fichiers: [],
    suivi: suiviClasse(1, {
      'mock-eleve-101': {
        statut: 'rendu', rendu_at: '2026-11-26T20:12:00+01:00', commentaire_eleve: "Je n'ai pas réussi le 15.",
        fichiers: [rendu('f0000000-0003-4000-8000-000000000001', 'exercices-sophie.pdf', '2026-11-26T20:12:00+01:00')],
      },
      'mock-eleve-102': { statut: 'fait', fait_at: '2026-11-26T21:00:00+01:00' },
      'mock-eleve-103': {
        statut: 'corrige', rendu_at: '2026-11-25T18:03:00+01:00', note: 16, appreciation: 'Très bien, rédaction soignée.',
        corrige_at: '2026-11-27T09:00:00+01:00',
        fichiers: [rendu('f0000000-0003-4000-8000-000000000002', 'exercices-emma.pdf', '2026-11-25T18:03:00+01:00')],
      },
    }),
  },
  {
    id: 'a1b2c3d4-0004-4000-8000-000000000004',
    classe_id: 1, classe: 'Iris 1',
    matiere_id: 3, matiere: 'Cybersécurité',
    type: 'travail_a_faire',
    titre: 'TP : configurer un pare-feu',
    description: "Suivre le sujet du TP, puis rendre le compte rendu avec vos captures d'écran.\nLe travail est individuel.",
    donne_le: '2026-11-18',
    a_rendre_le: '2026-11-25 18:00:00+01', // échéance passée : « en retard » pour qui n'a rien rendu
    rendu_en_ligne: true,
    fichiers: [{ id: 'f0000000-0004-4000-8000-000000000001', nom: 'Sujet TP pare-feu.pdf', taille_o: 512000 }],
    suivi: suiviClasse(1, {
      'mock-eleve-101': {
        statut: 'rendu', rendu_at: '2026-11-25T17:40:00+01:00',
        fichiers: [rendu('f0000000-0004-4000-8000-000000000002', 'compte-rendu-sophie.pdf', '2026-11-25T17:40:00+01:00')],
      },
    }),
  },
  {
    id: 'a1b2c3d4-0005-4000-8000-000000000005',
    classe_id: 1, classe: 'Iris 1',
    matiere_id: 1, matiere: 'Mathématiques',
    type: 'lecture',
    titre: 'Lire le chapitre 5',
    description: 'Lecture du chapitre 5 (suites numériques) avant le prochain cours.',
    donne_le: '2026-11-24',
    a_rendre_le: '2026-12-02 08:00:00+01',
    rendu_en_ligne: false,
    fichiers: [],
    suivi: suiviClasse(1, {
      [ID_ELEVE_MOCK]: { statut: 'fait', fait_at: '2026-11-26T19:00:00+01:00' },
    }),
  },
  {
    id: 'a1b2c3d4-0006-4000-8000-000000000006',
    classe_id: 1, classe: 'Iris 1',
    matiere_id: 3, matiere: 'Cybersécurité',
    type: 'projet',
    titre: 'Dossier de veille technologique',
    description: 'Un dossier de 4 pages maximum sur une menace récente (source citée).',
    donne_le: '2026-11-20',
    a_rendre_le: '2026-12-12 23:59:00+01',
    rendu_en_ligne: true,
    fichiers: [],
    suivi: suiviClasse(1, {
      [ID_ELEVE_MOCK]: {
        statut: 'rendu', rendu_at: '2026-11-26T22:15:00+01:00', commentaire_eleve: 'Sujet choisi : les attaques par rançongiciel.',
        fichiers: [rendu('f0000000-0006-4000-8000-000000000001', 'veille-doe.pdf', '2026-11-26T22:15:00+01:00')],
      },
    }),
  },
  {
    id: 'a1b2c3d4-0007-4000-8000-000000000007',
    classe_id: 1, classe: 'Iris 1',
    matiere_id: 1, matiere: 'Mathématiques',
    type: 'travail_a_faire',
    titre: 'Devoir maison n°1',
    description: 'Le devoir maison n°1 est à rendre en PDF.',
    donne_le: '2026-11-10',
    a_rendre_le: '2026-11-18 23:59:00+01',
    rendu_en_ligne: true,
    fichiers: [],
    suivi: suiviClasse(1, {
      [ID_ELEVE_MOCK]: {
        statut: 'corrige', rendu_at: '2026-11-17T21:30:00+01:00', note: 14.5, appreciation: 'Bon travail. Pensez à détailler vos calculs.',
        corrige_at: '2026-11-21T10:00:00+01:00',
        fichiers: [rendu('f0000000-0007-4000-8000-000000000001', 'dm1-doe.pdf', '2026-11-17T21:30:00+01:00')],
      },
      'mock-eleve-101': { statut: 'corrige', note: 17, corrige_at: '2026-11-21T10:00:00+01:00' },
    }),
  },
];
