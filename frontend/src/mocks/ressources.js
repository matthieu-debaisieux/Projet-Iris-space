// Classes et matières du professeur de test, au format de GET /api/prof/classes (back : routes/prof.php) :
// { id, nom, matieres: [{ id, nom, coefficient }] }
export const CLASSES_PROF = [
  { id: 1, nom: 'B1 Informatique', matieres: [{ id: 1, nom: 'Développement et BDD', coefficient: '4.00' }, { id: 2, nom: 'Systèmes et réseaux', coefficient: '4.00' }] },
  { id: 2, nom: 'B2 SLAM', matieres: [{ id: 1, nom: 'Développement et BDD', coefficient: '5.00' }] },
];

// Ressources déjà déposées par le professeur de test (id '3' dans mocks/users.js), au format de
// GET /api/prof/ressources, plus `professeur_id` (propre aux mocks : le back ne renvoie que les siennes).
export const RESSOURCES = [
  {
    id: 'demo-1', classe_id: 1, classe: 'B1 Informatique', matiere_id: 1, matiere: 'Développement et BDD', cours_id: null,
    type: 'lien', titre: 'Documentation MDN – JavaScript', contenu: null, url: 'https://developer.mozilla.org/fr/docs/Web/JavaScript',
    created_at: '2026-09-15T08:00:00.000Z', professeur_id: '3',
  },
  {
    id: 'demo-2', classe_id: 2, classe: 'B2 SLAM', matiere_id: 1, matiere: 'Développement et BDD', cours_id: null,
    type: 'texte', titre: 'Consignes du projet de fin d’année', contenu: 'Le projet se fait en binôme.\nRendu : dernière semaine de mai, avec le dépôt Git et un court rapport.',
    url: null, created_at: '2026-09-22T08:00:00.000Z', professeur_id: '3',
  },
];
