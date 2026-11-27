import { erreurNonDisponible, USE_MOCKS } from './api.js';
import { LS_CONVERSATIONS, loadJSON, saveJSON } from './storage.js';
import { CONVERSATIONS } from '@/mocks/conversations.js';

const lire = () => loadJSON(LS_CONVERSATIONS, CONVERSATIONS);

// La messagerie n'a pas encore de routes côté back (tâche MSG-01, voir backend/ROUTES.md) :
// en mode API on ne les appelle pas, la page affiche ce message.
const NON_DISPONIBLE = "La messagerie n'est pas encore disponible sur le serveur.";

export async function getConversations() {
  if (!USE_MOCKS) throw erreurNonDisponible(NON_DISPONIBLE);
  return lire();
}

// message : { from, text, sent } — renvoie le message enregistré
export async function sendMessage(conversationId, message) {
  if (!USE_MOCKS) throw erreurNonDisponible(NON_DISPONIBLE);
  saveJSON(LS_CONVERSATIONS, lire().map(c => (
    c.id === conversationId ? { ...c, messages: [...c.messages, message] } : c
  )));
  return message;
}

// ── Panel DEV (mode mock uniquement) ────────────────────────────────────────
export function devAddConversation(conversation) {
  saveJSON(LS_CONVERSATIONS, [...lire(), conversation]);
}

export function devResetConversations() {
  localStorage.removeItem(LS_CONVERSATIONS);
  return lire();
}
