import { useEffect, useRef, useState } from 'react';
import { DevTools } from '@/components/layout/DevPanel.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { useAsync } from '@/hooks/useAsync.js';
import { devAddConversation, devResetConversations, getConversations, sendMessage } from '@/services/conversations.js';

const lastPreview = conv => conv.messages.length ? conv.messages[conv.messages.length - 1].text : 'Nouvelle conversation';

// ── Générateur Lorem ipsum ──────────────────────────────────────────────────
const LOREM_WORDS = ('lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor '
  + 'incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation '
  + 'ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure reprehenderit voluptate').split(' ');
const LOREM_FIRST = ['Lorem', 'Ipsum', 'Dolor', 'Amet', 'Consectetur', 'Tempor', 'Magna', 'Veniam', 'Aliqua', 'Commodo'];
const LOREM_LAST  = ['Sit', 'Elit', 'Eiusmod', 'Labore', 'Dolore', 'Minim', 'Nostrud', 'Ullamco', 'Consequat', 'Voluptate'];

const rand = arr => arr[Math.floor(Math.random() * arr.length)];

function loremSentence(min = 6, max = 16) {
  const n = min + Math.floor(Math.random() * (max - min + 1));
  const text = Array.from({ length: n }, () => rand(LOREM_WORDS)).join(' ');
  return text.charAt(0).toUpperCase() + text.slice(1) + '.';
}

const loremName = () => `${rand(LOREM_FIRST)} ${rand(LOREM_LAST)}`;

// ── État des conversations ──────────────────────────────────────────────────
function useConversations() {
  const { data: conversations = [], setData } = useAsync(getConversations);
  const [selectedId, setSelectedId] = useState(null);
  const activeId = selectedId ?? conversations[0]?.id ?? null;

  function appendLocal(id, message) {
    setData(list => list.map(c => (c.id === id ? { ...c, messages: [...c.messages, message] } : c)));
  }

  async function post(id, message) {
    appendLocal(id, await sendMessage(id, message));
  }

  return {
    conversations,
    activeId,
    setActiveId: setSelectedId,
    send(text) {
      return post(activeId, { from: 'me', text, sent: true });
    },
    // Actions du menu dev (mode mock)
    devAddContact() {
      const name = loremName();
      const conv = {
        id: 'lorem-' + Date.now(),
        name,
        group: false,
        lastSeen: 'à l’instant',
        messages: [{ from: name, text: loremSentence(), sent: false }],
      };
      devAddConversation(conv);
      setData(list => [...list, conv]);
      setSelectedId(conv.id);
    },
    devAddMessage() {
      const conv = conversations.find(c => c.id === activeId);
      if (!conv) return;
      post(conv.id, { from: conv.group ? loremName() : conv.name, text: loremSentence(), sent: false });
    },
    devResetConv() {
      setData(devResetConversations());
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
  const { conversations, activeId, setActiveId } = chat;
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const threadRef = useRef(null);
  const inputRef = useRef(null);

  const active = conversations.find(c => c.id === activeId);
  const query = search.trim().toLowerCase();
  const visible = conversations.filter(c => (c.name + ' ' + lastPreview(c)).toLowerCase().includes(query));

  // Défilement automatique vers le dernier message
  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [active]);

  function handleSubmit(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !active) return;
    chat.send(text);
    setDraft('');
    inputRef.current?.focus();
  }

  return (
    <>
      {/* colonne : liste des conversations */}
      <div className="hidden lg:flex flex-col w-80 bg-[var(--color-principal)] overflow-hidden shrink-0 border-l border-white/10">
        {/* profil utilisateur courant */}
        <div className="flex flex-col items-center gap-2 px-6 pt-6">
          <div className="w-16 h-16 rounded-full bg-[var(--color-background)] shrink-0" />
          <p className="text-white text-lg font-semibold tracking-wide">{user?.nom}</p>
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
          {visible.map(conv => (
            <button
              key={conv.id}
              type="button"
              onClick={() => setActiveId(conv.id)}
              className={`flex items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors ${conv.id === activeId ? 'bg-white/10' : 'hover:bg-white/10'}`}
            >
              <div className="w-12 h-12 rounded-full bg-[var(--color-background)] shrink-0" />
              <div className="min-w-0">
                <p className="text-white font-semibold leading-tight">{conv.name}</p>
                <p className="text-white/60 text-sm truncate">{lastPreview(conv)}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* panneau de discussion */}
      <div className="flex-1 flex flex-col bg-[var(--color-page)] overflow-hidden">
        {/* en-tête de la conversation */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-200 shrink-0">
          <div className="relative shrink-0 w-14 h-12">
            {active && (active.group ? (
              <>
                <div className="absolute top-0 right-0 w-10 h-10 rounded-full bg-[var(--color-background)] border-2 border-white" />
                <div className="absolute bottom-0 left-0 w-10 h-10 rounded-full bg-[var(--color-background)] border-2 border-white flex items-end justify-end">
                  <span className="text-[10px] font-bold text-gray-600 leading-none mb-0.5 mr-0.5">{active.extra ?? ''}</span>
                </div>
              </>
            ) : (
              <div className="w-10 h-10 rounded-full bg-[var(--color-background)] mt-1" />
            ))}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">{active?.name}</h1>
            <p className="text-gray-400 text-sm">{active && `Dernière personne présente ${active.lastSeen}`}</p>
          </div>
        </div>

        {/* fil de messages */}
        <div ref={threadRef} className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6">
          {active?.messages.map((msg, i) => msg.sent ? (
            <div key={i} className="flex justify-end">
              <div className="bg-[var(--color-principal)] text-white rounded-2xl rounded-br-md px-5 py-4 max-w-md break-words">{msg.text}</div>
            </div>
          ) : (
            <div key={i} className="flex items-end gap-3 max-w-2xl">
              <div className="flex flex-col items-center gap-1 shrink-0">
                <div className="w-10 h-10 rounded-full bg-[var(--color-background)]" />
                <span className="text-[10px] text-gray-400 tracking-wide">{msg.from}</span>
              </div>
              <div className="bg-[var(--color-background)] rounded-2xl rounded-bl-md px-5 py-4 text-gray-700 break-words">{msg.text}</div>
            </div>
          ))}
        </div>

        {/* barre de saisie */}
        <form onSubmit={handleSubmit} className="flex items-center gap-4 px-6 py-4 shrink-0">
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Tapez votre message …"
            className="flex-1 bg-[var(--color-background)] rounded-full px-6 py-4 text-lg text-gray-700 placeholder-gray-500 outline-none"
          />
          <button
            type="submit"
            aria-label="Envoyer"
            className="w-14 h-14 shrink-0 rounded-full bg-[var(--color-button)] text-white flex items-center justify-center hover:opacity-90 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </form>
      </div>
    </>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function Messages() {
  const chat = useConversations();

  return (
    <div className="flex flex-1 overflow-hidden">
      <Messagerie chat={chat} />
      <MessagerieDevTools chat={chat} />
    </div>
  );
}
