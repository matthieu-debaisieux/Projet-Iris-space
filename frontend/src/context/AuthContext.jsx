import { createContext, useContext, useState } from 'react';
import * as authService from '@/services/auth.js';
import { LS_SESSION, loadJSON, saveJSON } from '@/services/storage.js';

// ── Utilisateur connecté (null si déconnecté) ───────────────────────────────
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => loadJSON(LS_SESSION, null, { seed: false }));

  function ouvrirSession(u) {
    saveJSON(LS_SESSION, u);
    setUser(u);
  }

  // Renvoie le résultat de authService.login : { user, doubleAuthAConfigurer } ou { doubleAuthentification }
  async function login(identifiant, motDePasse) {
    const resultat = await authService.login(identifiant, motDePasse);
    if (resultat.user) ouvrirSession(resultat.user);
    return resultat;
  }

  // Deuxième étape de la connexion (double authentification)
  async function verifierCode(code) {
    const u = await authService.verifierCode(code);
    ouvrirSession(u);
    return u;
  }

  async function logout() {
    await authService.logout().catch(() => {});
    localStorage.removeItem(LS_SESSION);
    setUser(null);
  }

  // Vrai si l'utilisateur possède le droit (toujours faux si déconnecté)
  const can = droit => user?.droits?.includes(droit) ?? false;

  return <AuthContext.Provider value={{ user, login, verifierCode, logout, can }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
