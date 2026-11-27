import { api, BASE_URL, USE_MOCKS } from './api.js';
import { EXTENSIONS_FICHIER, TAILLE_MAX_FICHIER } from './devoirs.js';
import { LS_CONVERSATIONS, LS_SESSION, LS_UTILISATEURS, loadJSON, saveJSON } from './storage.js';
import { CONVERSATIONS } from '@/mocks/conversations.js';
import { UTILISATEURS_MOCK } from '@/mocks/utilisateurs.js';

const ROLES_LIBELLES = {
  eleve: 'Élève',
  professeur: 'Professeur',
  administrateur: 'Administration',
  direction: 'Direction',
  dev: 'Développeur',
};

const ROLES_ALIAS = {
  eleve: ['eleve', 'etudiant'],
  professeur: ['professeur', 'enseignant'],
  administrateur: ['administrateur', 'administration'],
  direction: ['direction'],
  dev: ['dev', 'developpeur'],
};

export const libelleRole = role => ROLES_LIBELLES[role] ?? role ?? '';

export const nomPersonne = personne => [personne?.prenom, personne?.nom].filter(Boolean).join(' ');

export function nomConversation(conversation) {
  if (!conversation) return '';
  if (conversation.est_groupe) {
    if (conversation.titre) return conversation.titre;
    const noms = (conversation.participants ?? []).map(nomPersonne).filter(Boolean);
    return noms.length ? noms.join(', ') : 'Groupe';
  }
  return nomPersonne(conversation.participants?.[0]) || 'Conversation';
}

export function apercuConversation(conversation) {
  const dernier = conversation?.dernier_message;
  if (dernier?.contenu) return dernier.contenu;
  if (dernier?.nb_pieces_jointes > 0) return dernier.nb_pieces_jointes > 1 ? 'Pièces jointes' : 'Pièce jointe';
  return 'Nouvelle conversation';
}

// ── Pièces jointes ──────────────────────────────────────────────────────────
// Règles du back (messagerie.php, helpers.php) reprises ici pour valider avant l'envoi
export const MAX_PIECES_JOINTES = 5;
export const TAILLE_MAX_PIECE_JOINTE = TAILLE_MAX_FICHIER;

// Texte de l'erreur si la liste de fichiers n'est pas acceptable, sinon null
export function erreurPiecesJointes(fichiers) {
  if (fichiers.length > MAX_PIECES_JOINTES) {
    return `Un message ne peut pas avoir plus de ${MAX_PIECES_JOINTES} pièces jointes.`;
  }
  for (const fichier of fichiers) {
    const extension = fichier.name.includes('.') ? fichier.name.split('.').pop().toLowerCase() : '';
    if (!EXTENSIONS_FICHIER.includes(extension)) return `« ${fichier.name} » : type de fichier non autorisé.`;
    if (fichier.size > TAILLE_MAX_PIECE_JOINTE) return `« ${fichier.name} » : fichier trop volumineux (10 Mo maximum).`;
  }
  return null;
}

// Adresse de téléchargement d'une pièce jointe (réservée aux participants de la conversation)
export function getPieceJointeUrl(id) {
  return `${BASE_URL}/messages/pieces-jointes/${encodeURIComponent(id)}/telecharger`;
}

// Mocks : les fichiers envoyés pendant la session restent en mémoire pour pouvoir être retéléchargés
const fichiersMockMemoire = new Map();

export const aPieceJointeMock = id => fichiersMockMemoire.has(id);

export function telechargerPieceJointeMock(id) {
  const fichier = fichiersMockMemoire.get(id);
  if (!fichier) return;
  const url = URL.createObjectURL(fichier);
  const a = document.createElement('a');
  a.href = url;
  a.download = fichier.name || 'fichier';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function lireDate(valeur) {
  if (!valeur) return null;
  const iso = String(valeur).replace(' ', 'T').replace(/(T[\d:.]+)([+-]\d\d)$/, '$1$2:00');
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateMessage(valeur, { avecHeure = false } = {}) {
  const date = lireDate(valeur);
  if (!date) return '';
  const maintenant = new Date();
  const memeJour = date.toDateString() === maintenant.toDateString();
  if (memeJour) {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  if (avecHeure) {
    return date.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

const requete = (chemin, params) => {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  ).toString();
  return qs ? `${chemin}?${qs}` : chemin;
};

// ── API réelle ──────────────────────────────────────────────────────────────

export async function getConversations({ limit } = {}) {
  if (!USE_MOCKS) {
    return (await api.get(requete('/conversations', { limit }))).conversations;
  }
  return lireMocksNormalises();
}

export async function getMessages(conversationId, { limit, avant } = {}) {
  if (!USE_MOCKS) {
    return api.get(requete(`/conversations/${conversationId}/messages`, { limit, avant }));
  }
  const conv = lireMocksNormalises().find(c => c.id === conversationId);
  if (!conv) throw erreurMock('Conversation introuvable', 404);
  return { messages: conv._messages ?? [], plus_anciens: false };
}

export async function createConversation({ participant_ids, message, titre } = {}) {
  if (!USE_MOCKS) {
    const body = { participant_ids };
    if (message !== undefined && message !== null && String(message).trim() !== '') {
      body.message = message;
    }
    if (titre !== undefined && titre !== null && String(titre).trim() !== '') {
      body.titre = titre;
    }
    return (await api.post('/conversations', body)).conversation;
  }

  const moi = utilisateurMock();
  const destinatairesIds = [...new Set((participant_ids ?? []).map(String))].filter(id => id !== String(moi?.id));
  if (!destinatairesIds.length) throw erreurMock('Choisissez au moins un destinataire', 400);

  const annuaire = loadJSON(LS_UTILISATEURS, UTILISATEURS_MOCK);
  const participants = destinatairesIds
    .map(id => annuaire.find(u => String(u.id) === id && u.actif !== false))
    .filter(Boolean)
    .map(u => ({ id: u.id, nom: u.nom, prenom: u.prenom, role: u.role, photo_url: u.photo_url ?? null }));

  if (participants.length !== destinatairesIds.length) {
    throw erreurMock('Destinataire introuvable', 404);
  }

  const nbEleves = participants.filter(p => p.role === 'eleve').length + (moi?.role === 'eleve' ? 1 : 0);
  if (nbEleves > 1) {
    throw erreurMock("Une conversation ne peut pas réunir plusieurs élèves : un élève écrit aux professeurs et à l'administration", 403);
  }

  const liste = lireMocksNormalises();
  const estGroupe = participants.length > 1;
  const texteMessage = typeof message === 'string' && message.trim() !== '' ? message.trim() : null;

  if (!estGroupe) {
    const existante = liste.find(
      c => !c.est_groupe && c.participants?.length === 1 && String(c.participants[0].id) === String(participants[0].id),
    );
    if (existante) {
      if (texteMessage) {
        await sendMessage(existante.id, texteMessage);
        return lireMocksNormalises().find(c => c.id === existante.id);
      }
      return existante;
    }
  }

  const id = 'conv-' + Date.now();
  const maintenant = new Date().toISOString();
  const msg = texteMessage ? creerMessageMock(id, moi, texteMessage, maintenant) : null;
  const nouvelle = {
    id,
    titre: estGroupe && titre?.trim() ? titre.trim() : null,
    est_groupe: estGroupe,
    created_at: maintenant,
    participants,
    dernier_message: msg ? versApercu(msg) : null,
    non_lus: 0,
    _messages: msg ? [msg] : [],
  };

  saveJSON(LS_CONVERSATIONS, [nouvelle, ...liste]);
  return nouvelle;
}

// payload : le texte, ou { text, fichiers } (fichiers = objets File joints au message : multipart « fichiers[] »).
// (Mocks seulement : { text, sent: false, from } simule un message reçu, pour le panneau DEV.)
export async function sendMessage(conversationId, payload) {
  const contenu = typeof payload === 'string' ? payload : (payload?.text ?? '');
  const fichiers = typeof payload === 'object' && payload !== null ? (payload.fichiers ?? []) : [];
  if (!USE_MOCKS) {
    if (!fichiers.length) {
      return (await api.post(`/conversations/${conversationId}/messages`, { contenu })).message;
    }
    const formData = new FormData();
    if (contenu.trim() !== '') formData.append('contenu', contenu);
    fichiers.forEach(fichier => formData.append('fichiers[]', fichier));
    return (await api.post(`/conversations/${conversationId}/messages`, formData)).message;
  }

  const erreurFichiers = erreurPiecesJointes(fichiers);
  if (erreurFichiers) throw erreurMock(erreurFichiers, 400);
  if (!String(contenu).trim() && !fichiers.length) throw erreurMock('Le champ « contenu » est requis', 400);

  const moi = utilisateurMock();
  const estExterne = typeof payload === 'object' && payload !== null && payload.sent === false;
  const auteur = estExterne
    ? { id: 'mock-' + (payload.from ?? 'contact'), nom: '', prenom: payload.from ?? 'Contact' }
    : moi;

  const msg = creerMessageMock(conversationId, auteur, contenu, new Date().toISOString());
  msg.pieces_jointes = fichiers.map(fichier => {
    const id = 'pj-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    fichiersMockMemoire.set(id, fichier);
    return { id, nom: fichier.name };
  });
  const liste = lireMocksNormalises();
  let trouve = false;
  const maj = liste.map(c => {
    if (c.id !== conversationId) return c;
    trouve = true;
    const messages = [...(c._messages ?? []), msg];
    return {
      ...c,
      dernier_message: versApercu(msg),
      non_lus: estExterne ? (c.non_lus ?? 0) + 1 : c.non_lus ?? 0,
      _messages: messages,
    };
  });
  if (!trouve) throw erreurMock('Conversation introuvable', 404);

  saveJSON(LS_CONVERSATIONS, maj);
  return msg;
}

export async function marquerConversationLue(conversationId) {
  if (!USE_MOCKS) {
    return (await api.post(`/conversations/${conversationId}/lu`)).non_lus;
  }
  const liste = lireMocksNormalises().map(c => (c.id === conversationId ? { ...c, non_lus: 0 } : c));
  saveJSON(LS_CONVERSATIONS, liste);
  return liste.reduce((total, c) => total + (c.non_lus ?? 0), 0);
}

export async function getNombreNonLus() {
  if (!USE_MOCKS) {
    return (await api.get('/messages/non-lus')).non_lus;
  }
  return lireMocksNormalises().reduce((total, c) => total + (c.non_lus ?? 0), 0);
}

export async function searchDestinataires({ recherche = '', limit = 20 } = {}) {
  if (!USE_MOCKS) {
    return (await api.get(requete('/utilisateurs', { recherche: recherche.trim(), limit }))).utilisateurs;
  }

  const moi = utilisateurMock();
  const mots = normaliser(recherche).split(/\s+/).filter(Boolean).slice(0, 5);
  return loadJSON(LS_UTILISATEURS, UTILISATEURS_MOCK)
    .filter(u => u.actif !== false && String(u.id) !== String(moi?.id))
    .filter(u => moi?.role !== 'eleve' || u.role !== 'eleve')
    .filter(u => mots.every(mot => {
      const champs = [u.nom, u.prenom, u.classe].map(normaliser);
      const matchTexte = champs.some(val => val.includes(mot));
      const matchRole = mot.length >= 3 && (ROLES_ALIAS[u.role] ?? []).some(alias => alias.startsWith(mot));
      return matchTexte || matchRole;
    }))
    .sort((a, b) => (a.nom + a.prenom).localeCompare(b.nom + b.prenom, 'fr'))
    .slice(0, limit)
    .map(u => ({
      id: u.id,
      nom: u.nom,
      prenom: u.prenom,
      role: u.role,
      classe: u.classe ?? null,
      photo_url: u.photo_url ?? null,
    }));
}

// ── Mode mocks + Panel DEV ──────────────────────────────────────────────────

const lireRaw = () => loadJSON(LS_CONVERSATIONS, CONVERSATIONS);
const utilisateurMock = () => loadJSON(LS_SESSION, null, { seed: false });
const erreurMock = (message, status) => Object.assign(new Error(message), { status });

const normaliser = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const versApercu = msg => ({
  id: msg.id,
  contenu: msg.contenu.slice(0, 200),
  expediteur_id: msg.expediteur_id,
  envoye_at: msg.envoye_at,
  nb_pieces_jointes: msg.pieces_jointes?.length ?? 0,
});

function creerMessageMock(conversationId, auteur, contenu, envoyeAt) {
  return {
    id: 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    conversation_id: conversationId,
    expediteur_id: auteur?.id ?? 'me',
    expediteur_nom: auteur?.nom ?? '',
    expediteur_prenom: auteur?.prenom ?? 'Moi',
    contenu: String(contenu ?? ''),
    envoye_at: envoyeAt,
    modifie_at: null,
    pieces_jointes: [],
  };
}

function normaliserMockConversation(conv, moi) {
  if (Array.isArray(conv.participants) && Array.isArray(conv._messages)) {
    return conv;
  }
  const estGroupe = Boolean(conv.group);
  const messages = (conv.messages ?? []).map((m, i) => ({
    id: `${conv.id}-m${i}`,
    conversation_id: conv.id,
    expediteur_id: m.sent ? (moi?.id ?? 'me') : `mock-${m.from}`,
    expediteur_nom: m.sent ? (moi?.nom ?? '') : '',
    expediteur_prenom: m.sent ? (moi?.prenom ?? 'Moi') : m.from,
    contenu: m.text,
    envoye_at: new Date().toISOString(),
    modifie_at: null,
    pieces_jointes: [],
  }));
  const dernier = messages.at(-1) ?? null;

  return {
    id: conv.id,
    titre: estGroupe ? conv.name : null,
    est_groupe: estGroupe,
    created_at: new Date().toISOString(),
    participants: estGroupe
      ? [{ id: 'mock-groupe', nom: conv.name, prenom: '', role: 'professeur', photo_url: null }]
      : [{ id: `mock-${conv.id}`, nom: conv.name, prenom: '', role: 'professeur', photo_url: null }],
    dernier_message: dernier ? versApercu(dernier) : null,
    non_lus: conv.non_lus ?? 0,
    _messages: messages,
  };
}

function lireMocksNormalises() {
  const moi = utilisateurMock();
  return lireRaw().map(conv => normaliserMockConversation(conv, moi));
}

export function devAddConversation(conversation) {
  const moi = utilisateurMock();
  const norm = normaliserMockConversation(conversation, moi);
  saveJSON(LS_CONVERSATIONS, [norm, ...lireMocksNormalises()]);
  return norm;
}

export function devResetConversations() {
  localStorage.removeItem(LS_CONVERSATIONS);
  return lireMocksNormalises();
}
