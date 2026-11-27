import { api, USE_MOCKS } from './api.js';
import { LS_UTILISATEURS, loadJSON } from './storage.js';
import { DROITS_PAR_ROLE, USERS } from '@/mocks/users.js';
import { UTILISATEURS_MOCK } from '@/mocks/utilisateurs.js';

// Renvoie l'utilisateur connecté { id, identifiant, role, nom, prenom?, droits } ou lève une erreur
export async function login(identifiant, motDePasse) {
  if (!USE_MOCKS) {
    const data = await api.post(
      '/auth/login',
      { identifiant, mot_de_passe: motDePasse },
      { skipUnauthorized: true },
    );
    return data?.user ?? data;
  }

  const listeMocks = loadJSON(LS_UTILISATEURS, UTILISATEURS_MOCK);
  const compteCree = listeMocks.find(
    u => u.identifiant === identifiant || u.email === identifiant,
  );
  if (compteCree) {
    if (compteCree.motDePasse !== motDePasse) {
      throw new Error('Identifiants incorrects');
    }
    if (compteCree.actif === false) {
      throw new Error('Ce compte est désactivé');
    }
    return {
      id: compteCree.id,
      identifiant: compteCree.identifiant,
      email: compteCree.email,
      role: compteCree.role,
      nom: compteCree.nom,
      prenom: compteCree.prenom,
      droits: DROITS_PAR_ROLE[compteCree.role] ?? [],
    };
  }

  const user = USERS.find(u => u.identifiant === identifiant && u.motDePasse === motDePasse);
  if (!user) throw new Error('Identifiants incorrects');
  const { motDePasse: _, ...publicUser } = user;
  return publicUser;
}

export async function me() {
  if (USE_MOCKS) return null;
  const data = await api.get('/auth/me', { skipUnauthorized: true });
  return data?.user ?? data;
}

export async function logout() {
  if (!USE_MOCKS) {
    await api.post('/auth/logout', undefined, { skipUnauthorized: true });
  }
}
