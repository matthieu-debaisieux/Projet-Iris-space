// Données de démonstration pour les pages Programme (CPT-02) et Classe (CPT-03).
// Format aligné sur les routes backend (/api/admin/programme/*, /api/admin/classes/{id}/eleves,
// /api/prof/classes*, /api/eleve/classe).

export const PROGRAMME_MOCK_INITIAL = {
  matieres: [
    { id: 1, code: 'DEV', nom: 'Développement web' },
    { id: 2, code: 'BDD', nom: 'Bases de données' },
    { id: 3, code: 'CYBER', nom: 'Cybersécurité' },
    { id: 4, code: 'ANG', nom: 'Anglais' },
    { id: 5, code: 'CEJM', nom: 'CEJM' },
  ],
  professeurs: [
    { id: '3', identifiant: 'prof', nom: 'MARTIN', prenom: 'Claire', actif: true, matiere_ids: [1, 2] },
    { id: 'mock-prof-2', identifiant: 'p.leroy', nom: 'LEROY', prenom: 'Paul', actif: true, matiere_ids: [1, 3] },
    { id: 'mock-prof-3', identifiant: 'j.dupont', nom: 'DUPONT', prenom: 'Julie', actif: true, matiere_ids: [4, 5] },
  ],
  classes: [
    {
      id: 1,
      nom: 'B1 Développement',
      annee_scolaire: '2026-2027',
      courante: true,
      campus: 'Paris',
      matieres: [
        { matiere_id: 1, coefficient: '3.00' },
        { matiere_id: 2, coefficient: '2.00' },
        { matiere_id: 4, coefficient: '1.50' },
      ],
    },
    {
      id: 2,
      nom: 'B2 SLAM',
      annee_scolaire: '2026-2027',
      courante: true,
      campus: 'Paris',
      matieres: [
        { matiere_id: 1, coefficient: '4.00' },
        { matiere_id: 2, coefficient: '3.00' },
        { matiere_id: 3, coefficient: '2.00' },
      ],
    },
    {
      id: 3,
      nom: 'B2 SISR',
      annee_scolaire: '2026-2027',
      courante: true,
      campus: 'Paris',
      matieres: [
        { matiere_id: 3, coefficient: '4.00' },
        { matiere_id: 4, coefficient: '2.00' },
      ],
    },
    {
      id: 4,
      nom: 'B3 Cybersécurité',
      annee_scolaire: '2026-2027',
      courante: true,
      campus: 'Paris',
      matieres: [
        { matiere_id: 3, coefficient: '5.00' },
        { matiere_id: 5, coefficient: '2.00' },
      ],
    },
  ],
};

// Élèves par classe (mode mock) : uniquement id, nom, prenom, photo_url, numero_etudiant
// (jamais d'e-mail, téléphone ni adresse).
export const ELEVES_PAR_CLASSE_MOCK = {
  1: [
    { id: 'mock-e-1', nom: 'BERNARD', prenom: 'Lucas', photo_url: null, numero_etudiant: 'IRIS-2026-0011' },
    { id: '4', nom: 'DOE', prenom: 'John', photo_url: null, numero_etudiant: 'IRIS-2026-0042' },
    { id: 'mock-e-2', nom: 'ROBERT', prenom: 'Camille', photo_url: null, numero_etudiant: 'IRIS-2026-0012' },
  ],
  2: [
    { id: 'mock-e-3', nom: 'DURAND', prenom: 'Léo', photo_url: null, numero_etudiant: 'IRIS-2026-0021' },
    { id: 'mock-e-4', nom: 'MOREAU', prenom: 'Emma', photo_url: null, numero_etudiant: 'IRIS-2026-0022' },
    { id: 'mock-e-5', nom: 'PETIT', prenom: 'Théo', photo_url: null, numero_etudiant: 'IRIS-2026-0023' },
  ],
  3: [
    { id: 'mock-e-6', nom: 'GARNIER', prenom: 'Chloé', photo_url: null, numero_etudiant: 'IRIS-2026-0031' },
    { id: 'mock-e-7', nom: 'ROUX', prenom: 'Nathan', photo_url: null, numero_etudiant: 'IRIS-2026-0032' },
  ],
  4: [
    { id: 'mock-e-8', nom: 'FAURE', prenom: 'Inès', photo_url: null, numero_etudiant: 'IRIS-2026-0051' },
  ],
};
