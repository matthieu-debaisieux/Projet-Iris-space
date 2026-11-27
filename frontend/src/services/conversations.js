import { api, USE_MOCKS } from './api.js';
import { LS_CONVERSATIONS, loadJSON, saveJSON } from './storage.js';
import { CONVERSATIONS } from '@/mocks/conversations.js';

// ── Messagerie (MSG-03) ─────────────────────────────────────────────────────
// Format renvoyé aux pages, le même en mock et avec l'API :
//   conversation : { id, nom, groupe, participants: [{ id, nom, prenom, role, actif }],
//                    dernierMessage: { contenu, envoyeAt, deMoi } | null, nonLus }
//   message      : { id, contenu, envoyeAt, deMoi, expediteur: { id, nom, prenom },
//                    piecesJointes: [{ id, nom, url }] }
// Règles (décision D10) : un élève n'écrit pas aux autres élèves ; seuls les profs
// et l'administration créent des groupes. Le back les vérifie ; la recherche
// d'utilisateurs ne propose que les personnes à qui l'on peut écrire.

const nomComplet = p => `${p.prenom} ${p.nom}`.trim();

function nomConversation(titre, groupe, participants) {
  if (groupe && titre) return titre;
  return participants.map(nomComplet).join(', ') || 'Conversation';
}

// ── Conversion des réponses de l'API ────────────────────────────────────────
function depuisApiConversation(c) {
  return {
    id: c.id,
    nom: nomConversation(c.titre, c.est_groupe, c.participants),
    groupe: c.est_groupe,
    participants: c.participants,
    dernierMessage: c.dernier_message && {
      contenu: c.dernier_message.contenu,
      envoyeAt: c.dernier_message.envoye_at,
      deMoi: c.dernier_message.de_moi,
    },
    nonLus: c.non_lus,
  };
}

function depuisApiMessage(m) {
  return {
    id: m.id,
    contenu: m.contenu,
    envoyeAt: m.envoye_at,
    deMoi: m.de_moi,
    expediteur: m.expediteur,
    piecesJointes: m.pieces_jointes.map(pj => ({ id: pj.id, nom: pj.nom, url: pj.url_telechargement })),
  };
}

// ── Mocks (localStorage) ────────────────────────────────────────────────────
// Les mocks de mocks/conversations.js sont convertis une fois au format ci-dessus.
function personneMock(nom) {
  const [prenom, ...reste] = nom.split(' ');
  return { id: 'mock-' + nom.toLowerCase().replace(/\s+/g, '-'), prenom, nom: reste.join(' '), role: 'professeur', actif: true };
}

function convertirMocks() {
  const maintenant = Date.now();
  return CONVERSATIONS.map((c, i) => {
    const auteurs = [...new Set(c.messages.filter(m => !m.sent).map(m => m.from))];
    const participants = (c.group ? auteurs : [c.name]).map(personneMock);
    const messages = c.messages.map((m, j) => ({
      id: `${c.id}-${j}`,
      contenu: m.text,
      envoyeAt: new Date(maintenant - (i * 60 + (c.messages.length - j)) * 60000).toISOString(),
      deMoi: m.sent,
      expediteur: m.sent ? { id: 'moi', prenom: 'Moi', nom: '' } : personneMock(m.from),
      piecesJointes: [],
    }));
    return { id: c.id, titre: c.group ? c.name : null, groupe: c.group, participants, nonLus: c.messages.at(-1)?.sent ? 0 : 1, messages };
  });
}

const lire = () => loadJSON(LS_CONVERSATIONS, convertirMocks());
const ecrire = liste => saveJSON(LS_CONVERSATIONS, liste);

function versPage(c) {
  const dernier = c.messages.at(-1);
  return {
    id: c.id,
    nom: nomConversation(c.titre, c.groupe, c.participants),
    groupe: c.groupe,
    participants: c.participants,
    dernierMessage: dernier ? { contenu: dernier.contenu, envoyeAt: dernier.envoyeAt, deMoi: dernier.deMoi } : null,
    nonLus: c.nonLus,
  };
}

const CONTACTS_MOCK = ['Claire Martin', 'Karim Benali', 'Hélène Durand', 'Jean Dupond', 'Sophie Bernard'].map(personneMock);

// ── API publique du service ─────────────────────────────────────────────────

// Conversations, les plus récentes d'abord
export async function getConversations() {
  if (!USE_MOCKS) return (await api.get('/conversations')).conversations.map(depuisApiConversation);
  return lire()
    .map(versPage)
    .sort((a, b) => (b.dernierMessage?.envoyeAt ?? '').localeCompare(a.dernierMessage?.envoyeAt ?? ''));
}

// Les derniers messages (du plus ancien au plus récent). `avant` : envoyeAt du plus ancien affiché,
// pour charger les précédents. Renvoie { messages, encore }.
export async function getMessages(conversationId, { avant } = {}) {
  if (!USE_MOCKS) {
    const parametres = new URLSearchParams({ limit: '50' });
    if (avant) parametres.set('avant', avant);
    const reponse = await api.get(`/conversations/${conversationId}/messages?${parametres}`);
    return { messages: reponse.messages.map(depuisApiMessage), encore: reponse.encore };
  }
  const conversation = lire().find(c => c.id === conversationId);
  return { messages: conversation?.messages ?? [], encore: false };
}

// Envoie un message, avec ou sans pièce jointe (File). Renvoie le message enregistré.
export async function envoyerMessage(conversationId, contenu, fichier = null) {
  if (!USE_MOCKS) {
    let corps = { contenu };
    if (fichier) {
      corps = new FormData();
      corps.append('contenu', contenu);
      corps.append('fichier', fichier);
    }
    return depuisApiMessage((await api.post(`/conversations/${conversationId}/messages`, corps)).message);
  }
  const message = {
    id: 'mock-' + Date.now(),
    contenu,
    envoyeAt: new Date().toISOString(),
    deMoi: true,
    expediteur: { id: 'moi', prenom: 'Moi', nom: '' },
    // En mock, le fichier n'est gardé que le temps de la page
    piecesJointes: fichier ? [{ id: 'pj-' + Date.now(), nom: fichier.name, url: URL.createObjectURL(fichier) }] : [],
  };
  ecrire(lire().map(c => (c.id === conversationId ? { ...c, messages: [...c.messages, { ...message, piecesJointes: [] }] } : c)));
  return message;
}

// Nouvelle conversation avec un premier message. Avec une seule personne, la conversation
// existante est reprise. Renvoie la conversation.
export async function creerConversation(participants, contenu, titre = null) {
  if (!USE_MOCKS) {
    const reponse = await api.post('/conversations', {
      participant_ids: participants.map(p => p.id),
      contenu,
      titre: participants.length > 1 ? titre : undefined,
    });
    return depuisApiConversation(reponse.conversation);
  }
  const liste = lire();
  const existante = participants.length === 1
    && liste.find(c => !c.groupe && c.participants.length === 1 && c.participants[0].id === participants[0].id);
  const id = existante ? existante.id : 'mock-conv-' + Date.now();
  const message = { id: 'mock-' + Date.now(), contenu, envoyeAt: new Date().toISOString(), deMoi: true, expediteur: { id: 'moi', prenom: 'Moi', nom: '' }, piecesJointes: [] };
  ecrire(existante
    ? liste.map(c => (c.id === id ? { ...c, messages: [...c.messages, message] } : c))
    : [...liste, { id, titre: participants.length > 1 ? titre : null, groupe: participants.length > 1, participants, nonLus: 0, messages: [message] }]);
  return versPage(lire().find(c => c.id === id));
}

// Marque la conversation comme lue. Renvoie le nouveau total de messages non lus.
export async function marquerLue(conversationId) {
  if (!USE_MOCKS) return (await api.post(`/conversations/${conversationId}/lu`)).non_lus;
  ecrire(lire().map(c => (c.id === conversationId ? { ...c, nonLus: 0 } : c)));
  return lire().reduce((total, c) => total + c.nonLus, 0);
}

// Total des messages non lus (pastille de la navbar)
export async function getNonLus() {
  if (!USE_MOCKS) return (await api.get('/messages/non-lus')).non_lus;
  return lire().reduce((total, c) => total + c.nonLus, 0);
}

// Personnes à qui l'utilisateur connecté peut écrire (2 caractères minimum)
export async function rechercherUtilisateurs(texte) {
  if (!USE_MOCKS) {
    return (await api.get(`/utilisateurs?recherche=${encodeURIComponent(texte)}&limit=10`)).utilisateurs;
  }
  const t = texte.toLowerCase();
  return CONTACTS_MOCK.filter(p => nomComplet(p).toLowerCase().includes(t));
}

// ── Panel DEV (mode mock uniquement) ────────────────────────────────────────
export function devAjouterMessageRecu(conversationId, contenu) {
  ecrire(lire().map(c => {
    if (c.id !== conversationId) return c;
    const auteur = c.participants[0] ?? personneMock('Lorem Ipsum');
    const message = { id: 'mock-' + Date.now(), contenu, envoyeAt: new Date().toISOString(), deMoi: false, expediteur: auteur, piecesJointes: [] };
    return { ...c, nonLus: c.nonLus + 1, messages: [...c.messages, message] };
  }));
}

export function devAjouterConversation(nom, contenu) {
  const personne = personneMock(nom);
  const message = { id: 'mock-' + Date.now(), contenu, envoyeAt: new Date().toISOString(), deMoi: false, expediteur: personne, piecesJointes: [] };
  const id = 'mock-conv-' + Date.now();
  ecrire([...lire(), { id, titre: null, groupe: false, participants: [personne], nonLus: 1, messages: [message] }]);
  return id;
}

export function devResetConversations() {
  localStorage.removeItem(LS_CONVERSATIONS);
}
