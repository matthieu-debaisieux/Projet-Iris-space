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

// Une ligne par matière (moyenne de l'élève sur 20) :
//   note           → moyenne de l'élève dans la matière, sur 20
//   moyenneClasse  → moyenne de la classe dans la matière, sur 20
//   appreciation   → commentaire du professeur (facultatif)
//   court          → libellé court pour la pastille de filtre (facultatif)
export const NOTES = [
  { id: 1, matiere: 'Algorithmique appliquée', court: 'Algorithmique',   note: 14, moyenneClasse: 12.5, appreciation: 'Très bien' },
  { id: 2, matiere: 'Bases de données',                                  note: 16, moyenneClasse: 13,   appreciation: 'Excellent travail' },
  { id: 3, matiere: 'Anglais',                                           note: 12, moyenneClasse: 11.8, appreciation: 'Bien' },
  { id: 4, matiere: 'Cybersécurité',                                     note: 11, moyenneClasse: 10.4, appreciation: 'Assez bien' },
  { id: 5, matiere: 'CEJM',                                              note: 13, moyenneClasse: 12,   appreciation: 'Bien' },
  { id: 6, matiere: 'Mathématiques',                                     note: 10, moyenneClasse: 9.6,  appreciation: 'Correct, peut mieux faire' },
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
