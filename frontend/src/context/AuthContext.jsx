import { createContext, useContext, useEffect, useState } from 'react';
import { setUnauthorizedHandler, USE_MOCKS } from '@/services/api.js';
import * as authService from '@/services/auth.js';
import { LS_SESSION, loadJSON, saveJSON } from '@/services/storage.js';
import { clearOfflineApiCache } from '@/lib/pwa.js';

// ── Utilisateur connecté (null si déconnecté) ───────────────────────────────
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => loadJSON(LS_SESSION, null, { seed: false }));
  const [loading, setLoading] = useState(!USE_MOCKS);

  useEffect(() => {
    let active = true;

    setUnauthorizedHandler(() => {
      localStorage.removeItem(LS_SESSION);
      if (active) setUser(null);
    });

    if (!USE_MOCKS) {
      authService.me()
        .then(u => {
          if (!active) return;
          if (u) {
            saveJSON(LS_SESSION, u);
            setUser(u);
          } else {
            localStorage.removeItem(LS_SESSION);
            setUser(null);
          }
        })
        .catch(err => {
          if (!active) return;
          // 401 : session expirée ou invalide -> retour à la connexion
          // Erreur réseau (ex. hors ligne PWA) : on garde l'utilisateur en cache local
          if (err?.status === 401) {
            localStorage.removeItem(LS_SESSION);
            setUser(null);
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }

    return () => {
      active = false;
      setUnauthorizedHandler(null);
    };
  }, []);

  async function login(identifiant, motDePasse) {
    const res = await authService.login(identifiant, motDePasse);
    if (res?.doubleAuthentificationRequise) {
      return res;
    }
    saveJSON(LS_SESSION, res);
    setUser(res);
    return res;
  }

  async function verifierDoubleAuthentification(code) {
    const u = await authService.verifierDoubleAuthentification(code);
    saveJSON(LS_SESSION, u);
    setUser(u);
    return u;
  }

  async function logout() {
    try {
      await authService.logout();
    } catch {
      // Déjà déconnecté ou hors ligne : on nettoie tout de même la session locale
    } finally {
      clearOfflineApiCache();
      localStorage.removeItem(LS_SESSION);
      setUser(null);
    }
  }

  // Met à jour localement des champs du user connecté (ex. photo_url) et persiste en session locale
  function updateUser(patch) {
    setUser(prev => {
      if (!prev) return prev;
      const next = typeof patch === 'function' ? patch(prev) : { ...prev, ...patch };
      saveJSON(LS_SESSION, next);
      return next;
    });
  }

  // Vrai si l'utilisateur possède le droit (toujours faux si déconnecté)
  const can = droit => user?.droits?.includes(droit) ?? false;

  return (
    <AuthContext.Provider value={{ user, loading, login, verifierDoubleAuthentification, logout, can, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
