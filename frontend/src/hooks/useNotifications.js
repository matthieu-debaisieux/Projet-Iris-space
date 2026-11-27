import { useCallback, useEffect, useRef, useState } from 'react';
import * as service from '@/services/notifications.js';

const INTERVALLE = 60_000; // rafraîchissement automatique : toutes les 60 s
const LIMITE = 20;

// Mes notifications, rafraîchies toutes les 60 s et au retour sur l'onglet.
//   const { notifications, nonLues, erreur, marquerLue, toutMarquerLu, recharger } = useNotifications();
// `actif` à faux : rien n'est chargé (compte sans le droit `notifications`).
export function useNotifications(actif = true) {
  const [etat, setEtat] = useState({ notifications: [], nonLues: 0, charge: false, erreur: null });
  const rang = useRef(0); // numéro de la dernière requête : une réponse plus ancienne est ignorée

  const recharger = useCallback(async () => {
    const monRang = ++rang.current;
    try {
      const { notifications, nonLues } = await service.getNotifications({ limit: LIMITE });
      if (monRang === rang.current) setEtat({ notifications, nonLues, charge: true, erreur: null });
    } catch (erreur) {
      // On garde ce qui est affiché : un raté du rafraîchissement ne vide pas la cloche
      if (monRang === rang.current) setEtat(s => ({ ...s, charge: true, erreur }));
    }
  }, []);

  useEffect(() => {
    if (!actif) return undefined;

    recharger();
    const surMinuteur = () => { if (!document.hidden) recharger(); };
    const minuteur = setInterval(surMinuteur, INTERVALLE);
    document.addEventListener('visibilitychange', surMinuteur); // retour sur l'onglet
    window.addEventListener('online', surMinuteur);

    return () => {
      rang.current++; // les réponses en cours ne sont plus utilisées
      clearInterval(minuteur);
      document.removeEventListener('visibilitychange', surMinuteur);
      window.removeEventListener('online', surMinuteur);
    };
  }, [actif, recharger]);

  // Affichage immédiat, puis envoi au serveur ; en cas d'échec on recharge l'état réel
  const marquerLue = useCallback(async id => {
    rang.current++;
    setEtat(s => {
      const cible = s.notifications.find(n => n.id === id);
      if (!cible || cible.lue) return s;
      return {
        ...s,
        nonLues: Math.max(0, s.nonLues - 1),
        notifications: s.notifications.map(n => (n.id === id ? { ...n, lue: true, lue_at: new Date().toISOString() } : n)),
      };
    });
    try {
      await service.marquerLue(id);
    } catch {
      recharger();
    }
  }, [recharger]);

  const toutMarquerLu = useCallback(async () => {
    rang.current++;
    const maintenant = new Date().toISOString();
    setEtat(s => ({
      ...s,
      nonLues: 0,
      notifications: s.notifications.map(n => (n.lue ? n : { ...n, lue: true, lue_at: maintenant })),
    }));
    try {
      await service.toutMarquerLu();
    } catch {
      recharger();
    }
  }, [recharger]);

  return { ...etat, marquerLue, toutMarquerLu, recharger };
}
