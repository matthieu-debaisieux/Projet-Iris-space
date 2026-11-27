import { api, USE_MOCKS } from './api.js';
import { USERS } from '@/mocks/users.js';

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
