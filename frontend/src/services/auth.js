import { api, USE_MOCKS } from './api.js';
import { LS_SESSION, LS_UTILISATEURS, loadJSON, saveJSON } from './storage.js';
import { DROITS_PAR_ROLE, USERS } from '@/mocks/users.js';
import { UTILISATEURS_MOCK } from '@/mocks/utilisateurs.js';

const LS_MOCK_2FA = 'iris_mock_2fa_v1';
const LS_MOCK_2FA_PENDING = 'iris_mock_2fa_pending_v1';

function lireMock2FA() {
  return loadJSON(LS_MOCK_2FA, {}, { seed: false });
}

function utilisateurPublicMock(compte) {
  return {
    id: compte.id,
    identifiant: compte.identifiant,
    email: compte.email,
    role: compte.role,
    nom: compte.nom,
    prenom: compte.prenom,
    photo_url: compte.photo_url ?? null,
    droits: compte.droits ?? DROITS_PAR_ROLE[compte.role] ?? [],
  };
}

// Renvoie soit l'utilisateur connecté { id, identifiant, email, role, nom, prenom, photo_url, droits },
// soit { doubleAuthentificationRequise: true, expireDans } si une étape 2FA TOTP est requise.
export async function login(identifiant, motDePasse) {
  if (!USE_MOCKS) {
    const data = await api.post(
      '/auth/login',
      { identifiant, mot_de_passe: motDePasse },
      { skipUnauthorized: true },
    );
    if (data?.double_authentification_requise) {
      return {
        doubleAuthentificationRequise: true,
        expireDans: data.expire_dans ?? 300,
      };
    }
    return data?.user ?? data;
  }

  const listeMocks = loadJSON(LS_UTILISATEURS, UTILISATEURS_MOCK);
  const compteCree = listeMocks.find(
    u => u.identifiant === identifiant || u.email === identifiant,
  );
  if (compteCree) {
    if (compteCree.motDePasse !== motDePasse) {
      throw new Error('Identifiant ou mot de passe incorrect');
    }
    if (compteCree.actif === false) {
      throw new Error('Ce compte est désactivé');
    }
    const pub = utilisateurPublicMock(compteCree);
    if (lireMock2FA()[pub.id]) {
      saveJSON(LS_MOCK_2FA_PENDING, pub);
      return { doubleAuthentificationRequise: true, expireDans: 300 };
    }
    return pub;
  }

  // Comme le back : identifiant ou e-mail
  const user = USERS.find(
    u => (u.identifiant === identifiant || u.email === identifiant) && u.motDePasse === motDePasse,
  );
  if (!user) throw new Error('Identifiant ou mot de passe incorrect');
  const pub = utilisateurPublicMock(user);
  if (lireMock2FA()[pub.id]) {
    saveJSON(LS_MOCK_2FA_PENDING, pub);
    return { doubleAuthentificationRequise: true, expireDans: 300 };
  }
  return pub;
}

export async function verifierDoubleAuthentification(code) {
  if (!USE_MOCKS) {
    const data = await api.post('/auth/2fa/verifier', { code }, { skipUnauthorized: true });
    return data?.user ?? data;
  }

  const propre = String(code ?? '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(propre)) {
    throw new Error('Le code doit comporter 6 chiffres');
  }
  const enAttente = loadJSON(LS_MOCK_2FA_PENDING, null, { seed: false });
  if (!enAttente) {
    throw new Error('Session de vérification expirée. Veuillez vous reconnecter.');
  }
  localStorage.removeItem(LS_MOCK_2FA_PENDING);
  return enAttente;
}

export async function me() {
  if (USE_MOCKS) return null;
  const data = await api.get('/auth/me', { skipUnauthorized: true });
  return data?.user ?? data;
}

export async function logout() {
  if (!USE_MOCKS) {
    await api.post('/auth/logout', undefined, { skipUnauthorized: true });
  } else {
    localStorage.removeItem(LS_MOCK_2FA_PENDING);
  }
}

export async function changerMotDePasse(ancienMotDePasse, nouveauMotDePasse) {
  if (!USE_MOCKS) {
    return api.put('/auth/mot-de-passe', {
      ancien_mot_de_passe: ancienMotDePasse,
      nouveau_mot_de_passe: nouveauMotDePasse,
    });
  }

  if (!ancienMotDePasse) throw new Error('Le champ « ancien_mot_de_passe » est requis');
  if (typeof nouveauMotDePasse !== 'string' || nouveauMotDePasse.length < 8 || !/\p{L}/u.test(nouveauMotDePasse) || !/\d/.test(nouveauMotDePasse)) {
    throw new Error('Le mot de passe doit contenir au moins 8 caractères, une lettre et un chiffre');
  }
  if (ancienMotDePasse === nouveauMotDePasse) {
    throw new Error("Le nouveau mot de passe doit être différent de l'ancien");
  }
  return { message: 'Mot de passe modifié' };
}

export async function demanderReinitialisationMotDePasse(identifiant) {
  if (!USE_MOCKS) {
    return api.post('/auth/mot-de-passe-oublie', { identifiant });
  }
  if (!identifiant || !identifiant.trim()) {
    throw new Error('Identifiant ou e-mail requis');
  }
  return {
    message: 'Si ce compte existe, un lien de réinitialisation vient de lui être envoyé.',
  };
}

export async function reinitialiserMotDePasse(token, nouveauMotDePasse) {
  if (!USE_MOCKS) {
    return api.post('/auth/reinitialiser-mot-de-passe', {
      token,
      nouveau_mot_de_passe: nouveauMotDePasse,
    });
  }
  if (!token || !token.trim()) {
    throw new Error('Lien invalide ou expiré');
  }
  if (typeof nouveauMotDePasse !== 'string' || nouveauMotDePasse.length < 8 || !/\p{L}/u.test(nouveauMotDePasse) || !/\d/.test(nouveauMotDePasse)) {
    throw new Error('Le mot de passe doit contenir au moins 8 caractères, une lettre et un chiffre');
  }
  return { message: 'Mot de passe modifié. Vous pouvez vous connecter.' };
}

export async function preparerDoubleAuthentification() {
  if (!USE_MOCKS) {
    return api.post('/auth/2fa/preparer');
  }
  const session = loadJSON(LS_SESSION, null, { seed: false });
  const compte = session?.email || session?.identifiant || 'utilisateur';
  const secret = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';
  return {
    secret,
    otpauth_url: `otpauth://totp/Iris%20Space:${encodeURIComponent(compte)}?secret=${secret}&issuer=Iris%20Space&algorithm=SHA1&digits=6&period=30`,
  };
}

export async function confirmerDoubleAuthentification(code) {
  if (!USE_MOCKS) {
    return api.post('/auth/2fa/confirmer', { code });
  }
  const propre = String(code ?? '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(propre)) {
    throw new Error('Le code doit comporter 6 chiffres');
  }
  const session = loadJSON(LS_SESSION, null, { seed: false });
  if (session?.id) {
    const map = lireMock2FA();
    map[session.id] = true;
    saveJSON(LS_MOCK_2FA, map);
  }
  return { message: 'Double authentification activée', totp_actif: true };
}

export async function desactiverDoubleAuthentification(motDePasse) {
  if (!USE_MOCKS) {
    return api.post('/auth/2fa/desactiver', { mot_de_passe: motDePasse });
  }
  if (!motDePasse) {
    throw new Error('Le mot de passe est requis');
  }
  const session = loadJSON(LS_SESSION, null, { seed: false });
  if (session?.id) {
    const map = lireMock2FA();
    delete map[session.id];
    saveJSON(LS_MOCK_2FA, map);
  }
  return { message: 'Double authentification désactivée', totp_actif: false };
}
