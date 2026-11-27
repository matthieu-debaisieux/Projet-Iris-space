import { api, USE_MOCKS } from './api.js';
import { USERS } from '@/mocks/users.js';

// Connexion. Renvoie :
//   { user }                                   connecté
//   { user, doubleAuthAConfigurer: true }      connecté, mais doit configurer la double authentification
//   { doubleAuthentification: true }           mot de passe bon, il faut encore le code (verifierCode)
export async function login(identifiant, motDePasse) {
  if (!USE_MOCKS) {
    const reponse = await api.post('/auth/login', { identifiant, mot_de_passe: motDePasse });
    if (reponse.double_authentification) return { doubleAuthentification: true };
    return { user: reponse.user, doubleAuthAConfigurer: reponse.double_authentification_a_configurer === true };
  }

  const user = USERS.find(u => u.identifiant === identifiant && u.motDePasse === motDePasse);
  if (!user) throw new Error('Identifiant ou mot de passe incorrect');
  const { motDePasse: _, ...publicUser } = user;
  return { user: publicUser };
}

// Deuxième étape de la connexion : code à 6 chiffres de l'application. Renvoie l'utilisateur.
export async function verifierCode(code) {
  if (USE_MOCKS) throw new Error('La double authentification ne marche qu’avec la vraie API');
  return (await api.post('/auth/double-authentification/verifier', { code })).user;
}

export async function logout() {
  if (!USE_MOCKS) await api.post('/auth/logout');
}

// ── Mot de passe ────────────────────────────────────────────────────────────
// Le message de réponse s'affiche tel quel (il est le même que le compte existe ou non)
export async function motDePasseOublie(identifiant) {
  if (USE_MOCKS) return { message: 'Si ce compte existe, un lien de réinitialisation vient de lui être envoyé.' };
  return api.post('/auth/mot-de-passe-oublie', { identifiant });
}

export async function reinitialiserMotDePasse(token, nouveauMotDePasse) {
  if (USE_MOCKS) return { message: 'Mot de passe modifié. Vous pouvez vous connecter.' };
  return api.post('/auth/reinitialiser-mot-de-passe', { token, nouveau_mot_de_passe: nouveauMotDePasse });
}

export async function changerMotDePasse(ancien, nouveau) {
  if (USE_MOCKS) return { message: 'Mot de passe modifié' };
  return api.put('/auth/mot-de-passe', { ancien_mot_de_passe: ancien, nouveau_mot_de_passe: nouveau });
}

// ── Double authentification ─────────────────────────────────────────────────
// { active, active_le, obligatoire }
export async function getDoubleAuth() {
  if (USE_MOCKS) return { active: false, active_le: null, obligatoire: false };
  return api.get('/auth/double-authentification');
}

// { secret, otpauth_url } : à afficher en QR code
export async function configurerDoubleAuth() {
  if (USE_MOCKS) throw new Error('La double authentification ne marche qu’avec la vraie API');
  return api.post('/auth/double-authentification/configurer');
}

export async function activerDoubleAuth(code) {
  return api.post('/auth/double-authentification/activer', { code });
}

export async function desactiverDoubleAuth(motDePasse) {
  return api.post('/auth/double-authentification/desactiver', { mot_de_passe: motDePasse });
}
