// matiere absente → créneau vide ; `pause` → libellé en italique
export const EMPLOI_DU_JOUR = [
  { heure: '08h00', matiere: 'Mathématiques', salle: 'Salle 204' },
  { heure: '09h00', matiere: 'Mathématiques', salle: 'Salle 204' },
  { heure: '10h00', matiere: 'Français', salle: 'Salle 108' },
  { heure: '11h00', matiere: 'Français', salle: 'Salle 108' },
  { heure: '12h00', pause: 'Pause déjeuner' },
  { heure: '13h00', matiere: 'Histoire-Géo', salle: 'Salle 112' },
  { heure: '14h00', matiere: 'SVT', salle: 'Labo 2' },
  { heure: '15h00', matiere: 'Anglais', salle: 'Salle 305' },
  { heure: '16h00', matiere: 'EPS', salle: 'Gymnase' },
  { heure: '17h00' },
  { heure: '18h00', matiere: 'Permanence', salle: 'Salle 401' },
  { heure: '19h00' },
  { heure: '20h00' },
];

// Chaque ligne : { label? (en gras), texte }
export const RACCOURCIS = [
  {
    titre: 'Travail à faire',
    lignes: [
      { label: 'Maths', texte: 'Exercices 12 à 15 p.42' },
      { label: 'Histoire', texte: 'Fiche de révision Ch.3' },
      { label: 'Anglais', texte: "Préparer l'oral" },
    ],
  },
  {
    titre: 'Dernières ressources',
    lignes: [
      { texte: '📄 Cours_SVT_chap4.pdf' },
      { texte: '📄 Diaporama_Physique.pptx' },
      { texte: '🔗 Lien vidéo — Révisions Bac' },
    ],
  },
  {
    titre: 'Vie Scolaire',
    lignes: [
      { texte: '✅ Retard justifié — 28/06' },
      { texte: '⚠️ Absence non justifiée — 24/06' },
      { texte: 'Ponctualité : 96%' },
    ],
  },
  {
    titre: 'Dernières notes',
    lignes: [
      { label: 'Maths', texte: '16/20' },
      { label: 'Français', texte: '13/20' },
      { label: 'SVT', texte: '15,5/20' },
    ],
  },
];

export const NOTES = [
  { id: 1, note: '16/20',   matiere: 'Mathématiques',   prof: 'M. Martin',    date: '28/06/2028' },
  { id: 2, note: '13/20',   matiere: 'Français',        prof: 'Mme. Dupont',  date: '25/06/2028' },
  { id: 3, note: '15,5/20', matiere: 'SVT',             prof: 'M. Bernard',   date: '20/06/2028' },
  { id: 4, note: '11/20',   matiere: 'Histoire-Géo',    prof: 'Mme. Robert',  date: '17/06/2028' },
  { id: 5, note: '18/20',   matiere: 'Anglais',         prof: 'M. Jackson',   date: '12/06/2028' },
  { id: 6, note: '14/20',   matiere: 'Physique-Chimie', prof: 'Mme. Richard', date: '05/06/2028' },
];

export const PROFIL = {
  civilite: 'Mr',
  nom: 'Doe',
  prenom: 'John',
  age: 20,
  dateNaissance: '15/08/2006',
  email: 'Exemple@mediaschool.fr',
  lieuNaissance: 'Nice',
  paysNaissance: 'France',
  nationalite: 'Française',
  classe: '1ère année',
  anneeScolaire: '2025-2026',
};
