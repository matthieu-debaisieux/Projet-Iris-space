import { api, USE_MOCKS } from './api.js';
import { LS_NOTIFICATIONS, LS_SESSION, loadJSON, saveJSON } from './storage.js';
import { notificationsDemo } from '@/mocks/notifications.js';

// Format d'une notification : celui du back (backend/ROUTES.md, section Notifications) :
//   { id, type, titre, lien, lue, lue_at, created_at }
// `lien` est une page du front ('/devoirs') ou null, `lue` un booléen.
export const TYPES_NOTIFICATION = {
  systeme: 'Information',
  actualite: 'Actualité',
  absence: 'Vie scolaire',
  note: 'Note',
  devoir: 'Devoir',
  message: 'Message',
};

// Les dates du back ressemblent à "2026-06-24 09:00:00.123+02" : on les met au format ISO pour
// que tous les navigateurs les lisent.
export const lireDate = valeur => new Date(String(valeur).replace(' ', 'T').replace(/(T[\d:.]+)([+-]\d\d)$/, '$1$2:00'));

const frRelatif = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });

// « à l'instant », « il y a 5 minutes », « il y a 2 heures », « hier », « il y a 4 jours »,
// puis la date (« 3 octobre 2026 ») au-delà d'une semaine
export function dateRelative(valeur, maintenant = Date.now()) {
  const date = lireDate(valeur);
  if (Number.isNaN(date.getTime())) return '';

  const minutes = Math.floor((maintenant - date.getTime()) / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return frRelatif.format(-minutes, 'minute');
  if (minutes < 24 * 60) return frRelatif.format(-Math.floor(minutes / 60), 'hour');
  if (minutes < 7 * 24 * 60) return frRelatif.format(-Math.floor(minutes / (24 * 60)), 'day');
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Date complète, pour l'infobulle
export function dateComplete(valeur) {
  const date = lireDate(valeur);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' });
}

const normaliser = n => ({
  id: n.id,
  type: n.type,
  titre: n.titre,
  lien: n.lien ?? null,
  lue: n.lue_at != null,
  lue_at: n.lue_at ?? null,
  created_at: n.created_at,
});

// Mes notifications, les plus récentes d'abord, et le nombre total de non lues (indépendant de
// `limit`) : { notifications, nonLues }
export async function getNotifications({ limit = 20, nonLues = false } = {}) {
  if (!USE_MOCKS) {
    const params = new URLSearchParams({ limit: String(limit) });
    if (nonLues) params.set('non_lues', 'true');
    const data = await api.get(`/notifications?${params}`);
    return { notifications: data.notifications.map(normaliser), nonLues: data.non_lues };
  }

  const toutes = lireMock();
  const liste = nonLues ? toutes.filter(n => !n.lue) : toutes;
  return { notifications: liste.slice(0, limit), nonLues: toutes.filter(n => !n.lue).length };
}

// Marque une notification comme lue (sans effet si elle l'est déjà) ; renvoie la notification
export async function marquerLue(id) {
  if (!USE_MOCKS) return normaliser((await api.patch(`/notifications/${id}/lue`)).notification);

  const toutes = lireMock();
  const notification = toutes.find(n => n.id === id);
  if (!notification) throw Object.assign(new Error('Notification introuvable'), { status: 404 });
  if (notification.lue) return notification;

  const lue = { ...notification, lue: true, lue_at: new Date().toISOString() };
  ecrireMock(toutes.map(n => (n.id === id ? lue : n)));
  return lue;
}

// Marque toutes mes notifications comme lues ; renvoie le nombre de notifications modifiées
export async function toutMarquerLu() {
  if (!USE_MOCKS) return (await api.post('/notifications/tout-lire')).marquees;

  const toutes = lireMock();
  const maintenant = new Date().toISOString();
  ecrireMock(toutes.map(n => (n.lue ? n : { ...n, lue: true, lue_at: maintenant })));
  return toutes.filter(n => !n.lue).length;
}

// ── Mode mocks : les notifications du compte connecté dans le localStorage ──────────────────
// Rangées par id de compte, créées au premier appel à partir du jeu de démonstration.
const utilisateurMock = () => loadJSON(LS_SESSION, null, { seed: false });

function lireMock() {
  const moi = utilisateurMock();
  if (!moi) return [];

  const parCompte = loadJSON(LS_NOTIFICATIONS, {});
  if (!parCompte[moi.id]) {
    const maintenant = Date.now();
    parCompte[moi.id] = notificationsDemo(moi.droits).map((n, i) => {
      const cree = new Date(maintenant - n.depuis_minutes * 60000).toISOString();
      return {
        id: `demo-${moi.id}-${i}`,
        type: n.type,
        titre: n.titre,
        lien: n.lien,
        lue: n.lue,
        lue_at: n.lue ? cree : null,
        created_at: cree,
      };
    });
    saveJSON(LS_NOTIFICATIONS, parCompte);
  }
  return [...parCompte[moi.id]].sort((a, b) => lireDate(b.created_at) - lireDate(a.created_at));
}

function ecrireMock(notifications) {
  const moi = utilisateurMock();
  if (!moi) return;
  saveJSON(LS_NOTIFICATIONS, { ...loadJSON(LS_NOTIFICATIONS, {}), [moi.id]: notifications });
}
