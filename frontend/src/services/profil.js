import { api, USE_MOCKS } from './api.js';
import { LS_PROFIL, loadJSON } from './storage.js';
import { PROFIL as PROFIL_DEFAUT } from '@/mocks/eleve.js';

export async function uploadPhotoProfil(fichier) {
  const form = new FormData();
  form.append('fichier', fichier);
  const data = await api.upload('/profil/photo', form);
  return data.photo_url;
}

export async function deletePhotoProfil() {
  await api.delete('/profil/photo');
}

function mockTotpActif(user) {
  const map = loadJSON('iris_mock_2fa_v1', {}, { seed: false });
  return Boolean(user?.id && map[user.id]);
}

export async function getMonProfil(user) {
  if (!USE_MOCKS) {
    const data = await api.get('/profil');
    return data?.profil ?? data;
  }

  const role = user?.role ?? 'eleve';
  const totp_actif = mockTotpActif(user);

  if (role === 'prof' || role === 'professeur') {
    return {
      role: 'professeur',
      identifiant: user?.identifiant ?? 'prof',
      nom: 'MARTIN',
      prenom: 'Claire',
      email: 'claire.martin@mediaschool.fr',
      telephone: '01 23 45 67 12',
      date_naissance: '1986-04-18',
      lieu_naissance: 'Lyon',
      pays_naissance: 'France',
      nationalite: 'Française',
      adresse: null,
      totp_actif,
      matieres: [
        { id: 1, code: 'DEV', nom: 'Développement web' },
        { id: 2, code: 'BDD', nom: 'Bases de données' },
      ],
      classes: [
        { id: 1, nom: 'B1 Développement' },
        { id: 2, nom: 'B2 SLAM' },
      ],
      derniere_connexion: '2026-11-26T09:15:00+01:00',
    };
  }

  if (role === 'dev') {
    return {
      role: 'dev',
      identifiant: user?.identifiant ?? 'dev',
      nom: 'DÉVELOPPEUR',
      prenom: 'Équipe Technique',
      email: 'dev@iris-space.fr',
      telephone: '01 23 45 67 00',
      date_naissance: null,
      lieu_naissance: 'Paris',
      pays_naissance: 'France',
      nationalite: 'Française',
      adresse: 'Campus IRIS, Paris',
      totp_actif,
      derniere_connexion: '2026-11-27T10:00:00+01:00',
    };
  }

  if (role === 'admin' || role === 'administrateur' || role === 'direction') {
    return {
      role: role === 'direction' ? 'direction' : 'administrateur',
      identifiant: user?.identifiant ?? 'admin',
      nom: 'ADMINISTRATION',
      prenom: 'Service Scolarité',
      email: 'scolarite@mediaschool.fr',
      telephone: '01 23 45 67 89',
      date_naissance: null,
      lieu_naissance: 'Paris',
      pays_naissance: 'France',
      nationalite: 'Française',
      adresse: 'Bâtiment A, bureau 12',
      totp_actif,
      derniere_connexion: '2026-11-27T08:30:00+01:00',
    };
  }

  // Élève : coordonnées modifiées dans la page Profil (services/eleve.js, updateProfil) gardées en localStorage
  const PROFIL = loadJSON(LS_PROFIL, PROFIL_DEFAUT, { seed: false });
  return {
    ...PROFIL,
    role: 'eleve',
    identifiant: user?.identifiant ?? 'eleve',
    date_naissance: PROFIL.dateNaissance,
    lieu_naissance: PROFIL.lieuNaissance,
    pays_naissance: PROFIL.paysNaissance,
    annee_scolaire: PROFIL.anneeScolaire,
    numero_etudiant: 'IRIS-2026-0042',
    totp_actif: false,
  };
}
