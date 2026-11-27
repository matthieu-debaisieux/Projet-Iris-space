import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext.jsx';
import { USE_MOCKS } from '@/services/api.js';
import { getNombreNonLus } from '@/services/conversations.js';
import { LS_MESSAGES } from '@/services/storage.js';

const DELAI_RAFRAICHISSEMENT_MS = 30_000;

// ── Compteur de messages non lus (badge de la navbar + panel DEV) ───────────
const MessageCountContext = createContext(null);

export function MessageCountProvider({ children }) {
  const { user, can } = useAuth();
  const peutMessagerie = can('messagerie');

  const [count, setCount] = useState(() => {
    if (!USE_MOCKS) return 0;
    const n = parseInt(localStorage.getItem(LS_MESSAGES) ?? '0', 10);
    return Number.isNaN(n) || n < 0 ? 0 : n;
  });

  useEffect(() => {
    if (USE_MOCKS) {
      localStorage.setItem(LS_MESSAGES, String(count));
    }
  }, [count]);

  const refresh = useCallback(async () => {
    if (USE_MOCKS || !peutMessagerie) return;
    try {
      const nonLus = await getNombreNonLus();
      setCount(nonLus);
    } catch {
      // Erreur réseau ou session expirée : on conserve la valeur courante
    }
  }, [peutMessagerie]);

  // En mode API : lecture immédiate puis rafraîchissement toutes les 30 secondes
  useEffect(() => {
    if (USE_MOCKS) return;
    if (!user || !peutMessagerie) {
      setCount(0);
      return;
    }

    let actif = true;
    const charger = async () => {
      try {
        const nonLus = await getNombreNonLus();
        if (actif) setCount(nonLus);
      } catch {
        // Ignoré (géré au niveau global si 401)
      }
    };

    charger();
    const timer = setInterval(charger, DELAI_RAFRAICHISSEMENT_MS);
    return () => {
      actif = false;
      clearInterval(timer);
    };
  }, [user?.id, peutMessagerie]);

  const value = {
    count,
    setCount,
    refresh,
    add:    () => setCount(c => c + 1),
    remove: () => setCount(c => Math.max(0, c - 1)),
    reset:  () => setCount(0),
  };

  return <MessageCountContext.Provider value={value}>{children}</MessageCountContext.Provider>;
}

export function useMessageCount() {
  return useContext(MessageCountContext);
}
