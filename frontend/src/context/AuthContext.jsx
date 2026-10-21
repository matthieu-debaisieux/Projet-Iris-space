import { createContext, useContext, useState } from 'react';
import * as authService from '@/services/auth.js';
import { LS_SESSION, loadJSON, saveJSON } from '@/services/storage.js';

// ── Utilisateur connecté (null si déconnecté) ───────────────────────────────
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => loadJSON(LS_SESSION, null, { seed: false }));

  async function login(identifiant, motDePasse) {
    const u = await authService.login(identifiant, motDePasse);
    saveJSON(LS_SESSION, u);
    setUser(u);
    return u;
  }

  async function logout() {
    await authService.logout();
    localStorage.removeItem(LS_SESSION);
    setUser(null);
  }

  // Vrai si l'utilisateur possède le droit (toujours faux si déconnecté)
  const can = droit => user?.droits?.includes(droit) ?? false;

  return <AuthContext.Provider value={{ user, login, logout, can }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
