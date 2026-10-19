import { api, USE_MOCKS } from './api.js';
import { LS_CONVERSATIONS, loadJSON, saveJSON } from './storage.js';
import { CONVERSATIONS } from '@/mocks/conversations.js';

const lire = () => loadJSON(LS_CONVERSATIONS, CONVERSATIONS);

export async function getConversations() {
  if (!USE_MOCKS) return api.get('/conversations');
  return lire();
}

// message : { from, text, sent } — renvoie le message enregistré
export async function sendMessage(conversationId, message) {
  if (!USE_MOCKS) return api.post(`/conversations/${conversationId}/messages`, message);
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
