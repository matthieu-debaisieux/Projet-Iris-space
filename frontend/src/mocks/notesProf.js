// Données de démonstration des notes côté professeur (mode mocks).
// Les classes et matières du prof sont CLASSES_PROF (mocks/devoirs.js, GET /prof/classes).

// Élèves de chaque classe (id de classe → élèves), triés par nom comme le fait le back
export const ELEVES_PAR_CLASSE = {
  1: [
    { id: 'e1000000-0001-4000-8000-000000000001', nom: 'Bernard', prenom: 'Chloé' },
    { id: 'e1000000-0001-4000-8000-000000000002', nom: 'Dubois',  prenom: 'Hugo' },
    { id: 'e1000000-0001-4000-8000-000000000003', nom: 'Garcia',  prenom: 'Inès' },
    { id: 'e1000000-0001-4000-8000-000000000004', nom: 'Lambert', prenom: 'Noah' },
    { id: 'e1000000-0001-4000-8000-000000000005', nom: 'Roux',    prenom: 'Léa' },
  ],
  2: [
    { id: 'e2000000-0002-4000-8000-000000000001', nom: 'Fabre',   prenom: 'Jules' },
    { id: 'e2000000-0002-4000-8000-000000000002', nom: 'Girard',  prenom: 'Manon' },
    { id: 'e2000000-0002-4000-8000-000000000003', nom: 'Moreau',  prenom: 'Emma' },
    { id: 'e2000000-0002-4000-8000-000000000004', nom: 'Petit',   prenom: 'Tom' },
  ],
};

// Évaluations du prof (GET /prof/evaluations, sans les champs calculés `notes` et `moyenne`)
// et notes saisies, par évaluation : { eleve_id, valeur, absent, commentaire }
export const NOTES_PROF = {
  evaluations: [
    {
      id: 'b1000000-0001-4000-8000-000000000001',
      classe_id: 1, classe: 'Iris 1', matiere_id: 3, matiere: 'Cybersécurité',
      devoir_id: null, titre: 'Contrôle : pare-feu et VPN', date_eval: '2026-11-24',
      coefficient: 2, bareme: 20, periode: 'S1',
    },
    {
      id: 'b1000000-0001-4000-8000-000000000002',
      classe_id: 1, classe: 'Iris 1', matiere_id: 1, matiere: 'Mathématiques',
      devoir_id: null, titre: 'Interrogation logique', date_eval: '2026-11-19',
      coefficient: 1, bareme: 10, periode: 'S1',
    },
    {
      id: 'b1000000-0001-4000-8000-000000000003',
      classe_id: 2, classe: 'Iris 2', matiere_id: 4, matiere: 'Anglais',
      devoir_id: null, titre: 'Oral de présentation', date_eval: '2026-11-12',
      coefficient: 1, bareme: 20, periode: 'S1',
    },
  ],
  notes: {
    'b1000000-0001-4000-8000-000000000001': [
      { eleve_id: 'e1000000-0001-4000-8000-000000000001', valeur: 15.5, absent: false, commentaire: 'Très bien.' },
      { eleve_id: 'e1000000-0001-4000-8000-000000000002', valeur: 11, absent: false, commentaire: null },
      { eleve_id: 'e1000000-0001-4000-8000-000000000003', valeur: 17, absent: false, commentaire: 'Excellent travail.' },
      { eleve_id: 'e1000000-0001-4000-8000-000000000004', valeur: null, absent: true, commentaire: null },
    ],
    'b1000000-0001-4000-8000-000000000002': [
      { eleve_id: 'e1000000-0001-4000-8000-000000000001', valeur: 8, absent: false, commentaire: null },
      { eleve_id: 'e1000000-0001-4000-8000-000000000002', valeur: 6.5, absent: false, commentaire: 'Revoir les tables de vérité.' },
    ],
    'b1000000-0001-4000-8000-000000000003': [],
  },
};
