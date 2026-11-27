import { useCallback, useEffect, useRef, useState } from 'react';
import { DevTools } from '@/components/layout/DevPanel.jsx';
import { MessageErreur } from '@/components/ui/DataState.jsx';
import Modal from '@/components/ui/Modal.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { useMessageCount } from '@/context/MessageCountContext.jsx';
import { useAsync } from '@/hooks/useAsync.js';
import { messageLisible, USE_MOCKS } from '@/services/api.js';
import {
  apercuConversation,
  createConversation,
  devAddConversation,
  devResetConversations,
  formatDateMessage,
  getConversations,
  getMessages,
  libelleRole,
  marquerConversationLue,
  nomConversation,
  nomPersonne,
  searchDestinataires,
  sendMessage,
} from '@/services/conversations.js';
import { nomComplet } from '@/services/utilisateur.js';

const DELAI_RECHERCHE_MS = 250;
const DELAI_POLL_MESSAGES_MS = 30_000;

const initiales = nom =>
  (nom ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(m => m[0])
    .join('')
    .toUpperCase() || '?';

// ── Générateur Lorem ipsum (panel DEV en mode mocks uniquement) ───────────────
const LOREM_WORDS = (
  'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor '
  + 'incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation '
  + 'ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure reprehenderit voluptate'
).split(' ');
const LOREM_FIRST = ['Lorem', 'Ipsum', 'Dolor', 'Amet', 'Consectetur', 'Tempor', 'Magna', 'Veniam', 'Aliqua', 'Commodo'];
const LOREM_LAST = ['Sit', 'Elit', 'Eiusmod', 'Labore', 'Dolore', 'Minim', 'Nostrud', 'Ullamco', 'Consequat', 'Voluptate'];
const rand = arr => arr[Math.floor(Math.random() * arr.length)];
const loremName = () => `${rand(LOREM_FIRST)} ${rand(LOREM_LAST)}`;

function loremSentence(min = 6, max = 16) {
  const n = min + Math.floor(Math.random() * (max - min + 1));
  const text = Array.from({ length: n }, () => rand(LOREM_WORDS)).join(' ');
  return text.charAt(0).toUpperCase() + text.slice(1) + '.';
}

// ── Modale « Nouvelle conversation » ────────────────────────────────────────
function NouvelleConversationModal({ onClose, onCreated }) {
  const [recherche, setRecherche] = useState('');
  const [destinataires, setDestinataires] = useState([]);
  const [chargementDest, setChargementDest] = useState(true);
  const [erreurDest, setErreurDest] = useState(null);
  const [selection, setSelection] = useState([]);
  const [titre, setTitre] = useState('');
  const [premierMessage, setPremierMessage] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    let actif = true;
    setChargementDest(true);
    setErreurDest(null);

    const timer = setTimeout(async () => {
      try {
        const resultats = await searchDestinataires({ recherche, limit: 20 });
        if (actif) setDestinataires(resultats);
      } catch (err) {
        if (actif) setErreurDest(err);
      } finally {
        if (actif) setChargementDest(false);
      }
    }, recherche.trim() === '' ? 0 : DELAI_RECHERCHE_MS);

    return () => {
      actif = false;
      clearTimeout(timer);
    };
  }, [recherche]);

  function basculerDestinataire(utilisateur) {
    setErreur(null);
    setSelection(courante => (
      courante.some(u => u.id === utilisateur.id)
        ? courante.filter(u => u.id !== utilisateur.id)
        : [...courante, utilisateur]
    ));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selection.length) {
      setErreur('Sélectionnez au moins un destinataire.');
      return;
    }
    const contenu = premierMessage.trim();
    if (!contenu) {
      setErreur('Écrivez un premier message.');
      return;
    }

    setEnvoi(true);
    setErreur(null);
    try {
      const conversation = await createConversation({
        participant_ids: selection.map(u => u.id),
        message: contenu,
        titre: selection.length > 1 ? titre.trim() : undefined,
      });
      onCreated(conversation);
    } catch (err) {
      setErreur(messageLisible(err) || err.message || 'Impossible de créer la conversation.');
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Modal onClose={onClose} label="Nouvelle conversation" className="max-w-lg rounded-2xl p-6 max-h-[90vh] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-[var(--color-principal)]">Nouvelle conversation</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="text-gray-400 hover:text-gray-700 text-xl font-bold leading-none"
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-hidden flex-1">
        {/* Destinataires sélectionnés */}
        {selection.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selection.map(u => (
              <span
                key={u.id}
                className="inline-flex items-center gap-1.5 bg-[var(--color-principal)] text-white text-xs font-medium px-3 py-1.5 rounded-full"
              >
                {nomPersonne(u)}
                <button
                  type="button"
                  onClick={() => basculerDestinataire(u)}
                  aria-label={`Retirer ${nomPersonne(u)}`}
                  className="hover:text-[var(--color-secondaire)] font-bold"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Recherche de destinataire */}
        <div>
          <label htmlFor="recherche-destinataire" className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
            Destinataire(s)
          </label>
          <input
            id="recherche-destinataire"
            type="search"
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
            placeholder="Rechercher par nom, prénom, rôle ou classe…"
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-[var(--color-principal)]"
            autoFocus
          />
        </div>

        {/* Liste des destinataires trouvés */}
        <div className="border border-gray-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-gray-100">
          {chargementDest ? (
            <p className="text-sm text-gray-400 text-center py-4">Recherche en cours…</p>
          ) : erreurDest ? (
            <p className="text-sm text-red-500 text-center py-4">
              {messageLisible(erreurDest) || 'Impossible de charger les destinataires.'}
            </p>
          ) : destinataires.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Aucun destinataire trouvé.</p>
          ) : (
            destinataires.map(u => {
              const estSelectionne = selection.some(s => s.id === u.id);
              const details = [libelleRole(u.role), u.classe].filter(Boolean).join(' · ');
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => basculerDestinataire(u)}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors ${
                    estSelectionne ? 'bg-[var(--color-principal)]/10' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[var(--color-principal)] text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {initiales(nomPersonne(u))}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{nomPersonne(u)}</p>
                      <p className="text-xs text-gray-500 truncate">{details}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold shrink-0 ${estSelectionne ? 'text-[var(--color-principal)]' : 'text-gray-400'}`}>
                    {estSelectionne ? 'Sélectionné' : 'Choisir'}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Titre du groupe (si plusieurs destinataires) */}
        {selection.length > 1 && (
          <div>
            <label htmlFor="titre-groupe" className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
              Nom du groupe (facultatif)
            </label>
            <input
              id="titre-groupe"
              type="text"
              maxLength={200}
              value={titre}
              onChange={e => setTitre(e.target.value)}
              placeholder="Ex. Projet BTS SIO"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-[var(--color-principal)]"
            />
          </div>
        )}

        {/* Premier message */}
        <div>
          <label htmlFor="premier-message" className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
            Message
          </label>
          <textarea
            id="premier-message"
            rows={3}
            maxLength={5000}
            value={premierMessage}
            onChange={e => setPremierMessage(e.target.value)}
            placeholder="Tapez votre message…"
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-[var(--color-principal)] resize-none"
          />
        </div>

        {erreur && (
          <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">
            {erreur}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={envoi}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-button)] text-white hover:opacity-90 disabled:opacity-50 transition"
          >
            {envoi ? 'Envoi…' : 'Envoyer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── État des conversations ──────────────────────────────────────────────────
function useConversations() {
  const { user } = useAuth();
  const { setCount } = useMessageCount();
  const { data: conversations = [], loading, error, setData } = useAsync(getConversations, [user?.id]);

  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [plusAnciens, setPlusAnciens] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [threadError, setThreadError] = useState(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);

  const activeId = selectedId && conversations.some(c => c.id === selectedId)
    ? selectedId
    : (conversations[0]?.id ?? null);
  const active = conversations.find(c => c.id === activeId) ?? null;

  // La conversation ouverte par défaut est mémorisée : sinon, un nouveau message dans une autre conversation
  // (qui remonte en tête de liste au rafraîchissement) ferait changer de conversation sous les yeux de l'utilisateur
  useEffect(() => {
    if (selectedId === null && conversations.length > 0) setSelectedId(conversations[0].id);
  }, [selectedId, conversations]);

  const chargerFil = useCallback(async convId => {
    if (!convId) {
      setMessages([]);
      setPlusAnciens(false);
      return;
    }
    setLoadingThread(true);
    setThreadError(null);
    try {
      const res = await getMessages(convId);
      setMessages(res.messages ?? []);
      setPlusAnciens(Boolean(res.plus_anciens));
    } catch (err) {
      setThreadError(err);
    } finally {
      setLoadingThread(false);
    }
  }, []);

  // Chargement du fil à chaque changement de conversation active
  useEffect(() => {
    let actif = true;
    if (!activeId) {
      setMessages([]);
      setPlusAnciens(false);
      setThreadError(null);
      return;
    }

    setLoadingThread(true);
    setThreadError(null);
    setSendError(null);
    getMessages(activeId).then(
      res => {
        if (!actif) return;
        setMessages(res.messages ?? []);
        setPlusAnciens(Boolean(res.plus_anciens));
        setLoadingThread(false);
      },
      err => {
        if (!actif) return;
        setThreadError(err);
        setLoadingThread(false);
      },
    );
    return () => {
      actif = false;
    };
  }, [activeId]);

  // Marquer comme lu quand la conversation active a des messages non lus
  const activeNonLus = active?.non_lus ?? 0;
  useEffect(() => {
    if (!activeId || activeNonLus <= 0) return;
    let actif = true;
    marquerConversationLue(activeId)
      .then(totalNonLus => {
        if (!actif) return;
        setData(list => list.map(c => (c.id === activeId ? { ...c, non_lus: 0 } : c)));
        setCount(totalNonLus);
      })
      .catch(() => {
        // On ne bloque pas la lecture du fil si le marquage échoue temporairement
      });
    return () => {
      actif = false;
    };
  }, [activeId, activeNonLus, setData, setCount]);

  // Rafraîchissement périodique de la liste (et du fil actif si un nouveau message arrive)
  const dernierMessageId = active?.dernier_message?.id ?? null;
  useEffect(() => {
    if (USE_MOCKS || !user?.id) return;
    let actif = true;
    const timer = setInterval(async () => {
      try {
        const fraiches = await getConversations();
        if (!actif) return;
        setData(fraiches);
        const courante = fraiches.find(c => c.id === activeId);
        if (courante && courante.dernier_message?.id && courante.dernier_message.id !== dernierMessageId) {
          chargerFil(activeId);
        }
      } catch {
        // Ignoré en arrière-plan
      }
    }, DELAI_POLL_MESSAGES_MS);
    return () => {
      actif = false;
      clearInterval(timer);
    };
  }, [user?.id, activeId, dernierMessageId, setData, chargerFil]);

  async function loadOlder() {
    if (!activeId || !plusAnciens || loadingOlder || messages.length === 0) return;
    setLoadingOlder(true);
    try {
      const res = await getMessages(activeId, { avant: messages[0].id });
      const anciens = res.messages ?? [];
      setMessages(courants => {
        const ids = new Set(courants.map(m => m.id));
        return [...anciens.filter(m => !ids.has(m.id)), ...courants];
      });
      setPlusAnciens(Boolean(res.plus_anciens));
    } catch (err) {
      setThreadError(err);
    } finally {
      setLoadingOlder(false);
    }
  }

  async function send(contenu) {
    if (!activeId || sending) return false;
    setSending(true);
    setSendError(null);
    try {
      const msg = await sendMessage(activeId, contenu);
      setMessages(courants => (courants.some(m => m.id === msg.id) ? courants : [...courants, msg]));
      setData(list => {
        const apercu = {
          id: msg.id,
          contenu: msg.contenu.slice(0, 200),
          expediteur_id: msg.expediteur_id,
          envoye_at: msg.envoye_at,
        };
        const cible = list.find(c => c.id === activeId);
        if (!cible) return list;
        return [{ ...cible, dernier_message: apercu }, ...list.filter(c => c.id !== activeId)];
      });
      return true;
    } catch (err) {
      setSendError(messageLisible(err) || err.message || "Impossible d'envoyer le message.");
      return false;
    } finally {
      setSending(false);
    }
  }

  function integrerConversation(conv) {
    setData(list => [conv, ...list.filter(c => c.id !== conv.id)]);
    setSelectedId(conv.id);
    if (conv.id === activeId) {
      chargerFil(conv.id);
    }
  }

  return {
    conversations,
    loading,
    error,
    activeId,
    active,
    setActiveId: setSelectedId,
    messages,
    plusAnciens,
    loadingThread,
    loadingOlder,
    threadError,
    sending,
    sendError,
    loadOlder,
    send,
    integrerConversation,
    // Actions du menu dev (mode mocks uniquement)
    devAddContact() {
      const name = loremName();
      const conv = devAddConversation({
        id: 'lorem-' + Date.now(),
        name,
        group: false,
        non_lus: 1,
        messages: [{ from: name, text: loremSentence(), sent: false }],
      });
      setData(list => [conv, ...list]);
      setSelectedId(conv.id);
    },
    async devAddMessage() {
      if (!active) return;
      const from = active.est_groupe ? loremName() : nomConversation(active);
      const msg = await sendMessage(active.id, { from, text: loremSentence(), sent: false });
      setMessages(courants => [...courants, msg]);
      setData(list => list.map(c => (c.id === active.id ? {
        ...c,
        dernier_message: { id: msg.id, contenu: msg.contenu, expediteur_id: msg.expediteur_id, envoye_at: msg.envoye_at },
      } : c)));
    },
    devResetConv() {
      const defaut = devResetConversations();
      setData(defaut);
      setSelectedId(null);
    },
  };
}

// ── Boutons propres à la messagerie dans le panel DEV ───────────────────────
function MessagerieDevTools({ chat }) {
  const btn = 'text-white rounded-lg px-3 py-2 text-left transition font-medium text-xs';
  return (
    <DevTools>
      <p className="text-gray-400 text-xs uppercase tracking-wider mt-3 mb-1">Messages (Lorem)</p>
      <button onClick={chat.devAddContact} className={`bg-blue-600 hover:bg-blue-700 ${btn}`}>+ Ajouter un contact</button>
      <button onClick={chat.devAddMessage} className={`bg-blue-600 hover:bg-blue-700 ${btn}`}>+ Ajouter un message</button>
      <button onClick={chat.devResetConv} className={`bg-gray-600 hover:bg-gray-700 ${btn}`}>Reset conversations</button>
    </DevTools>
  );
}

// ── Liste des conversations + panneau de discussion ─────────────────────────
function Messagerie({ chat }) {
  const {
    conversations,
    loading,
    activeId,
    active,
    setActiveId,
    messages,
    plusAnciens,
    loadingThread,
    loadingOlder,
    threadError,
    sending,
    sendError,
    loadOlder,
    send,
    integrerConversation,
  } = chat;
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [nouvelleOuverte, setNouvelleOuverte] = useState(false);
  const [mobilePane, setMobilePane] = useState('list');
  const threadRef = useRef(null);
  const inputRef = useRef(null);
  const prevLastMsgIdRef = useRef(null);

  const query = search.trim().toLowerCase();
  const visible = conversations.filter(c => {
    const cible = `${nomConversation(c)} ${apercuConversation(c)}`.toLowerCase();
    return cible.includes(query);
  });

  // Défilement automatique vers le bas à l'ouverture ou à l'arrivée d'un nouveau message
  // (sans sauter en bas quand on charge des messages plus anciens en haut du fil)
  const dernierMsgId = messages.at(-1)?.id ?? null;
  useEffect(() => {
    if (dernierMsgId && dernierMsgId !== prevLastMsgIdRef.current && threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
    prevLastMsgIdRef.current = dernierMsgId;
  }, [activeId, dernierMsgId]);

  function selectionnerConversation(convId) {
    setActiveId(convId);
    setMobilePane('thread');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !active || sending) return;
    const ok = await send(text);
    if (ok) {
      setDraft('');
      inputRef.current?.focus();
    }
  }

  const sousTitreActif = active
    ? (active.est_groupe
      ? active.participants.map(p => `${nomPersonne(p)} (${libelleRole(p.role)})`).join(', ')
      : libelleRole(active.participants?.[0]?.role))
    : '';

  return (
    <>
      {/* colonne : liste des conversations */}
      <div className={`${mobilePane === 'list' ? 'flex' : 'hidden'} lg:flex flex-col w-full lg:w-80 bg-[var(--color-principal)] overflow-hidden shrink-0 border-l border-white/10`}>
        {/* profil utilisateur courant + bouton nouvelle conversation */}
        <div className="flex flex-col items-center gap-2 px-6 pt-6">
          <div className="w-16 h-16 rounded-full bg-[var(--color-secondaire)] text-[var(--color-principal)] font-bold text-xl flex items-center justify-center shrink-0">
            {initiales(nomComplet(user))}
          </div>
          <p className="text-white text-lg font-semibold tracking-wide text-center">{nomComplet(user)}</p>
          <button
            type="button"
            onClick={() => setNouvelleOuverte(true)}
            className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-secondaire)] text-[var(--color-principal)] px-4 py-1.5 text-sm font-semibold hover:opacity-90 transition"
          >
            <span>+</span>
            <span>Nouvelle conversation</span>
          </button>
        </div>

        {/* barre de recherche */}
        <div className="px-6 pt-4 pb-5">
          <label className="flex items-center gap-2 bg-white rounded-full px-4 py-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher"
              className="w-full bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400"
            />
          </label>
        </div>

        <div className="mx-6 border-t border-white/20" />

        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-1">
          {loading ? (
            <p className="text-white/60 text-sm text-center py-6">Chargement…</p>
          ) : visible.length === 0 ? (
            <p className="text-white/60 text-sm text-center py-6">
              {query ? 'Aucune conversation correspondante.' : 'Aucune conversation.'}
            </p>
          ) : (
            visible.map(conv => {
              const nom = nomConversation(conv);
              const dateAffichee = formatDateMessage(conv.dernier_message?.envoye_at ?? conv.created_at);
              const nonLus = conv.non_lus ?? 0;

              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => selectionnerConversation(conv.id)}
                  className={`flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors ${
                    conv.id === activeId ? 'bg-white/15' : 'hover:bg-white/10'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-[var(--color-background)] text-[var(--color-principal)] font-bold text-sm flex items-center justify-center shrink-0">
                    {conv.est_groupe ? `${conv.participants.length + 1}` : initiales(nom)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-white leading-tight truncate ${nonLus > 0 ? 'font-bold' : 'font-semibold'}`}>
                        {nom}
                      </p>
                      {dateAffichee && (
                        <span className="text-[11px] text-white/50 shrink-0">{dateAffichee}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className={`text-sm truncate ${nonLus > 0 ? 'text-white font-medium' : 'text-white/60'}`}>
                        {apercuConversation(conv)}
                      </p>
                      {nonLus > 0 && (
                        <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                          {nonLus > 99 ? '99+' : nonLus}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* panneau de discussion */}
      <div className={`${mobilePane === 'thread' ? 'flex' : 'hidden'} lg:flex flex-1 flex-col bg-[var(--color-page)] overflow-hidden`}>
        {!active ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
            <p className="text-gray-500 text-base">
              {loading ? 'Chargement des conversations…' : 'Sélectionnez une conversation ou démarrez-en une nouvelle.'}
            </p>
            {!loading && (
              <button
                type="button"
                onClick={() => setNouvelleOuverte(true)}
                className="rounded-full bg-[var(--color-principal)] text-white px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition"
              >
                + Nouvelle conversation
              </button>
            )}
          </div>
        ) : (
          <>
            {/* en-tête de la conversation */}
            <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-200 shrink-0">
              <button
                type="button"
                onClick={() => setMobilePane('list')}
                aria-label="Retour aux conversations"
                className="lg:hidden text-[var(--color-principal)] font-bold text-lg px-2 py-1 rounded-lg hover:bg-gray-100"
              >
                ←
              </button>
              <div className="relative shrink-0 w-14 h-12">
                {active.est_groupe ? (
                  <>
                    <div className="absolute top-0 right-0 w-10 h-10 rounded-full bg-[var(--color-background)] border-2 border-white" />
                    <div className="absolute bottom-0 left-0 w-10 h-10 rounded-full bg-[var(--color-principal)] text-white border-2 border-white flex items-center justify-center text-xs font-bold">
                      +{active.participants.length}
                    </div>
                  </>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[var(--color-principal)] text-white font-bold text-sm flex items-center justify-center mt-1">
                    {initiales(nomConversation(active))}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-gray-900 leading-tight truncate">{nomConversation(active)}</h1>
                {sousTitreActif && (
                  <p className="text-gray-400 text-sm truncate">{sousTitreActif}</p>
                )}
              </div>
            </div>

            {/* fil de messages */}
            <div ref={threadRef} className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-5">
              {plusAnciens && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={loadOlder}
                    disabled={loadingOlder}
                    className="text-xs font-semibold text-[var(--color-principal)] bg-gray-100 hover:bg-gray-200 px-4 py-1.5 rounded-full transition disabled:opacity-50"
                  >
                    {loadingOlder ? 'Chargement…' : 'Charger les messages plus anciens'}
                  </button>
                </div>
              )}

              {loadingThread ? (
                <p className="text-gray-400 text-sm text-center py-6">Chargement des messages…</p>
              ) : threadError ? (
                <MessageErreur error={threadError} />
              ) : messages.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-6">Aucun message pour le moment. Écrivez le premier !</p>
              ) : (
                messages.map(msg => {
                  const estMoi = String(msg.expediteur_id) === String(user?.id);
                  const expediteur = [msg.expediteur_prenom, msg.expediteur_nom].filter(Boolean).join(' ');
                  const heure = formatDateMessage(msg.envoye_at, { avecHeure: true });

                  return estMoi ? (
                    <div key={msg.id} className="flex flex-col items-end gap-1">
                      <div className="bg-[var(--color-principal)] text-white rounded-2xl rounded-br-md px-5 py-3.5 max-w-md break-words whitespace-pre-wrap">
                        {msg.contenu}
                      </div>
                      {heure && <span className="text-[11px] text-gray-400 pr-1">{heure}</span>}
                    </div>
                  ) : (
                    <div key={msg.id} className="flex items-end gap-3 max-w-2xl">
                      <div className="flex flex-col items-center gap-1 shrink-0">
                        <div className="w-10 h-10 rounded-full bg-[var(--color-background)] text-[var(--color-principal)] text-xs font-bold flex items-center justify-center">
                          {initiales(expediteur)}
                        </div>
                        <span className="text-[10px] text-gray-400 tracking-wide max-w-[80px] truncate">{expediteur}</span>
                      </div>
                      <div className="flex flex-col items-start gap-1">
                        <div className="bg-[var(--color-background)] rounded-2xl rounded-bl-md px-5 py-3.5 text-gray-800 break-words whitespace-pre-wrap">
                          {msg.contenu}
                        </div>
                        {heure && <span className="text-[11px] text-gray-400 pl-1">{heure}</span>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {sendError && (
              <p role="alert" className="mx-6 mb-2 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2">
                {sendError}
              </p>
            )}

            {/* barre de saisie (sans pièces jointes) */}
            <form onSubmit={handleSubmit} className="flex items-center gap-4 px-6 py-4 shrink-0 border-t border-gray-100">
              <input
                ref={inputRef}
                type="text"
                maxLength={5000}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder="Tapez votre message …"
                disabled={sending}
                className="flex-1 bg-[var(--color-background)] rounded-full px-6 py-4 text-base text-gray-700 placeholder-gray-500 outline-none disabled:opacity-60"
              />
              <button
                type="submit"
                aria-label="Envoyer"
                disabled={sending || !draft.trim()}
                className="w-14 h-14 shrink-0 rounded-full bg-[var(--color-button)] text-white flex items-center justify-center hover:opacity-90 disabled:opacity-50 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </form>
          </>
        )}
      </div>

      {nouvelleOuverte && (
        <NouvelleConversationModal
          onClose={() => setNouvelleOuverte(false)}
          onCreated={conv => {
            integrerConversation(conv);
            setMobilePane('thread');
            setNouvelleOuverte(false);
          }}
        />
      )}
    </>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function Messages() {
  const chat = useConversations();

  return (
    <div className="flex flex-1 overflow-hidden">
      {chat.error ? (
        <div className="flex flex-1 items-center justify-center bg-[var(--color-page)] px-6">
          <MessageErreur error={chat.error} />
        </div>
      ) : (
        <Messagerie chat={chat} />
      )}
      {USE_MOCKS && <MessagerieDevTools chat={chat} />}
    </div>
  );
}
