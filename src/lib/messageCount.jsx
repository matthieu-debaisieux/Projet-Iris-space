import { createContext, useContext, useEffect, useState } from 'react';
import { LS_MESSAGES } from './storage.js';

// ── Compteur de messages non lus (badge de la navbar + panel DEV) ───────────
const MessageCountContext = createContext(null);

export function MessageCountProvider({ children }) {
  const [count, setCount] = useState(() => {
    const n = parseInt(localStorage.getItem(LS_MESSAGES) ?? '0', 10);
    return Number.isNaN(n) || n < 0 ? 0 : n;
  });

  useEffect(() => {
    localStorage.setItem(LS_MESSAGES, String(count));
  }, [count]);

  const value = {
    count,
    add:    () => setCount(c => c + 1),
    remove: () => setCount(c => Math.max(0, c - 1)),
    reset:  () => setCount(0),
  };

  return <MessageCountContext.Provider value={value}>{children}</MessageCountContext.Provider>;
}

export function useMessageCount() {
  return useContext(MessageCountContext);
}
