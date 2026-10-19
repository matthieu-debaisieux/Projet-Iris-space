import { useEffect } from 'react';

// Appelle `onEscape` quand on appuie sur Échap (tant que `active` est vrai)
export function useEscape(onEscape, active = true) {
  useEffect(() => {
    if (!active) return;
    const handler = e => { if (e.key === 'Escape') onEscape(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onEscape, active]);
}
