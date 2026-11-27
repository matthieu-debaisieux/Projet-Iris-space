export const ESPACES = [
  'Administration',
  'B1 Développement et BDD',
  'B1 Système et réseaux',
  'B2 SISR',
  'B2 SLAM',
  'B3 Cybersécurité',
  'CEJM',
  'Culture général et expression',
  'Anglais',
  'Mathématique',
].map((nom, i) => ({
  id: i + 1,
  nom,
  documents: [
    {
      id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
      titre: 'Doc.test.pdf',
      utilisateur_id: null,
      created_at: '2026-10-21T09:00:00+02:00',
    },
  ],
}));

export const MES_DOCUMENTS_ELEVE = [
  {
    id: '10000000-0000-4000-8000-000000000001',
    titre: 'Attestation_assurance_2026.pdf',
    created_at: '2026-10-20T14:30:00+02:00',
    espace_id: 99,
    espace: 'Mes documents',
    personnel: true,
    depose_par_moi: true,
  },
];
