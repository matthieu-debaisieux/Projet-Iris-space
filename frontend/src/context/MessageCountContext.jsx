import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext.jsx';
import { getNonLus } from '@/services/conversations.js';

// Rafraîchissement de la pastille (MSG-03)
const INTERVALLE_MS = 30_000;

// ── Compteur de messages non lus (badge de la navbar + panel DEV) ───────────
// Lu sur le back (ou les mocks) à la connexion puis toutes les 30 secondes.
const MessageCountContext = createContext(null);

export function MessageCountProvider({ children }) {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      setCount(await getNonLus());
    } catch {
      // Pas grave : on réessaie au prochain tour
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setCount(0);
      return undefined;
    }
    refresh();
    const minuteur = setInterval(refresh, INTERVALLE_MS);
    return () => clearInterval(minuteur);
  }, [user, refresh]);

  const value = {
    count,
    setCount,
    refresh,
    // Boutons du panel DEV
    add:    () => setCount(c => c + 1),
    remove: () => setCount(c => Math.max(0, c - 1)),
    reset:  () => setCount(0),
  };

  return <MessageCountContext.Provider value={value}>{children}</MessageCountContext.Provider>;
}

export function useMessageCount() {
  return useContext(MessageCountContext);
}
