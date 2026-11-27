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
    const u = await authService.login(identifiant, motDePasse);
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

  // Vrai si l'utilisateur possède le droit (toujours faux si déconnecté)
  const can = droit => user?.droits?.includes(droit) ?? false;

  return <AuthContext.Provider value={{ user, loading, login, logout, can }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
