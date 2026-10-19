import { api, USE_MOCKS } from './api.js';
import { USERS } from '@/mocks/users.js';

// Renvoie l'utilisateur connecté { id, identifiant, role, nom } ou lève une erreur
export async function login(identifiant, motDePasse) {
  if (!USE_MOCKS) return api.post('/auth/login', { identifiant, motDePasse });

  const user = USERS.find(u => u.identifiant === identifiant && u.motDePasse === motDePasse);
  if (!user) throw new Error('Identifiants incorrects');
  const { motDePasse: _, ...publicUser } = user;
  return publicUser;
}

export async function logout() {
  if (!USE_MOCKS) await api.post('/auth/logout');
}
