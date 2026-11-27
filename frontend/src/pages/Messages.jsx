import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DevTools } from '@/components/layout/DevPanel.jsx';
import Modal from '@/components/ui/Modal.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { useMessageCount } from '@/context/MessageCountContext.jsx';
import { USE_MOCKS } from '@/services/api.js';
import {
  creerConversation, devAjouterConversation, devAjouterMessageRecu, devResetConversations,
  envoyerMessage, getConversations, getMessages, marquerLue, rechercherUtilisateurs,
} from '@/services/conversations.js';

// ── Messagerie (MSG-03, MSG-04) ─────────────────────────────────────────────
// Conversations et messages viennent de services/conversations.js (API ou mocks).
// La liste et la conversation ouverte se rafraîchissent toutes les 30 secondes.
const INTERVALLE_MS = 30_000;
const TAILLE_MAX_FICHIER = 10 * 1024 * 1024; // même limite que le back

const nomComplet = p => `${p.prenom} ${p.nom}`.trim();
const initiales = nom => nom.split(/\s+/).filter(Boolean).slice(0, 2).map(m => m[0].toUpperCase()).join('');

const ROLES = { eleve: 'Élève', professeur: 'Professeur', administrateur: 'Administration', direction: 'Direction' };

function heure(date) {
  const d = new Date(date);
  const aujourdhui = new Date().toDateString() === d.toDateString();
  return aujourdhui
    ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

function apercu(conv) {
  const m = conv.dernierMessage;
  if (!m) return 'Nouvelle conversation';
  return (m.deMoi ? 'Vous : ' : '') + (m.contenu || 'Pièce jointe');
}

function Avatar({ nom, className = 'w-12 h-12' }) {
  return (
    <div className={`${className} rounded-full bg-[var(--color-background)] shrink-0 flex items-center justify-center text-sm font-bold text-[var(--color-principal)]`}>
      {initiales(nom)}
    </div>
  );
}

// ── État de la messagerie ───────────────────────────────────────────────────
function useMessagerie() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { setCount } = useMessageCount();
  const [conversations, setConversations] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [activeId, setActiveIdState] = useState(searchParams.get('conversation'));
  const [fil, setFil] = useState({ id: null, messages: [], encore: false, chargement: false });

  const chargerConversations = useCallback(async () => {
    try {
      const liste = await getConversations();
      setConversations(liste);
      setErreur(null);
      return liste;
    } catch (e) {
      setErreur(e.message);
      return null;
    }
  }, []);

  // Charge (ou recharge) les derniers messages de la conversation, en gardant les plus anciens déjà affichés
  const chargerFil = useCallback(async id => {
    if (!id) return;
    try {
      const { messages, encore } = await getMessages(id);
      setFil(f => {
        if (f.id !== id) return { id, messages, encore, chargement: false };
        const connus = new Set(messages.map(m => m.id));
        const anciens = f.messages.filter(m => !connus.has(m.id) && m.envoyeAt < (messages[0]?.envoyeAt ?? ''));
        return { ...f, messages: [...anciens, ...messages], encore: anciens.length ? f.encore : encore, chargement: false };
      });
    } catch (e) {
      setErreur(e.message);
    }
  }, []);

  const lire = useCallback(async id => {
    try {
      setCount(await marquerLue(id));
      setConversations(liste => liste?.map(c => (c.id === id ? { ...c, nonLus: 0 } : c)));
    } catch { /* pas bloquant */ }
  }, [setCount]);

  function setActiveId(id) {
    setActiveIdState(id);
    setSearchParams(id ? { conversation: id } : {}, { replace: true });
  }

  // Premier chargement, puis toutes les 30 secondes
  useEffect(() => {
    chargerConversations();
    const minuteur = setInterval(chargerConversations, INTERVALLE_MS);
    return () => clearInterval(minuteur);
  }, [chargerConversations]);

  // Conversation par défaut : celle de l'URL, sinon la plus récente
  const idAffiche = activeId ?? conversations?.[0]?.id ?? null;
  const active = conversations?.find(c => c.id === idAffiche) ?? null;

  useEffect(() => {
    if (!idAffiche) return undefined;
    setFil({ id: idAffiche, messages: [], encore: false, chargement: true });
    chargerFil(idAffiche);
    const minuteur = setInterval(() => chargerFil(idAffiche), INTERVALLE_MS);
    return () => clearInterval(minuteur);
  }, [idAffiche, chargerFil]);

  // Messages non lus dans la conversation affichée : on la marque comme lue
  useEffect(() => {
    if (active?.nonLus > 0) lire(active.id);
  }, [active?.id, active?.nonLus, lire]);

  return {
    conversations,
    erreur,
    setErreur,
    active,
    fil,
    setActiveId,
    async chargerPrecedents() {
      const plusAncien = fil.messages[0];
      if (!plusAncien) return;
      const { messages, encore } = await getMessages(fil.id, { avant: plusAncien.envoyeAt });
      setFil(f => ({ ...f, messages: [...messages, ...f.messages], encore }));
    },
    async envoyer(contenu, fichier) {
      const message = await envoyerMessage(active.id, contenu, fichier);
      setFil(f => ({ ...f, messages: [...f.messages, message] }));
      setConversations(liste => liste.map(c => (c.id === active.id
        ? { ...c, dernierMessage: { contenu: message.contenu, envoyeAt: message.envoyeAt, deMoi: true } }
        : c)));
    },
    async creer(participants, contenu, titre) {
      const conversation = await creerConversation(participants, contenu, titre);
      await chargerConversations();
      setActiveId(conversation.id);
      if (conversation.id === fil.id) chargerFil(conversation.id);
    },
    // Panel DEV (mode mock)
    async devRecharger() {
      await chargerConversations();
      if (idAffiche) chargerFil(idAffiche);
    },
  };
}

// ── Boutons propres à la messagerie dans le panel DEV (mode mock) ───────────
function MessagerieDevTools({ chat }) {
  if (!USE_MOCKS) return null;
  const btn = 'text-white rounded-lg px-3 py-2 text-left transition font-medium text-xs';
  return (
    <DevTools>
      <p className="text-gray-400 text-xs uppercase tracking-wider mt-3 mb-1">Messages (mocks)</p>
      <button
        onClick={async () => { chat.setActiveId(devAjouterConversation('Lorem Ipsum', 'Bonjour, ceci est un message de test.')); await chat.devRecharger(); }}
        className={`bg-blue-600 hover:bg-blue-700 ${btn}`}
      >+ Conversation reçue</button>
      <button
        onClick={async () => { if (chat.active) { devAjouterMessageRecu(chat.active.id, 'Nouveau message de test.'); await chat.devRecharger(); } }}
        className={`bg-blue-600 hover:bg-blue-700 ${btn}`}
      >+ Message reçu</button>
      <button
        onClick={async () => { devResetConversations(); chat.setActiveId(null); await chat.devRecharger(); }}
        className={`bg-gray-600 hover:bg-gray-700 ${btn}`}
      >Reset conversations</button>
    </DevTools>
  );
}

// ── Fenêtre « Nouvelle conversation » ───────────────────────────────────────
function NouvelleConversation({ onClose, onCreer }) {
  const [recherche, setRecherche] = useState('');
  const [resultats, setResultats] = useState([]);
  const [choisis, setChoisis] = useState([]);
  const [titre, setTitre] = useState('');
  const [contenu, setContenu] = useState('');
  const [erreur, setErreur] = useState(null);
  const [envoi, setEnvoi] = useState(false);

  // Recherche après 300 ms sans frappe, à partir de 2 caractères
  useEffect(() => {
    const texte = recherche.trim();
    if (texte.length < 2) {
      setResultats([]);
      return undefined;
    }
    const minuteur = setTimeout(() => {
      rechercherUtilisateurs(texte).then(setResultats, e => setErreur(e.message));
    }, 300);
    return () => clearTimeout(minuteur);
  }, [recherche]);

  function choisir(personne) {
    if (!choisis.some(p => p.id === personne.id)) setChoisis([...choisis, personne]);
    setRecherche('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!choisis.length || !contenu.trim()) return;
    setEnvoi(true);
    setErreur(null);
    try {
      await onCreer(choisis, contenu.trim(), titre.trim() || null);
      onClose();
    } catch (err) {
      setErreur(err.message);
      setEnvoi(false);
    }
  }

  return (
    <Modal onClose={onClose} className="max-w-lg rounded-2xl p-6" label="Nouvelle conversation">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-semibold text-[var(--color-principal)]">Nouvelle conversation</h2>
          <button type="button" onClick={onClose} className="text-2xl leading-none text-gray-400 hover:text-gray-600" aria-label="Fermer">×</button>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="destinataire" className="text-sm font-semibold text-[var(--color-principal)]">Destinataires</label>
          {choisis.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {choisis.map(p => (
                <span key={p.id} className="flex items-center gap-1 rounded-full bg-[var(--color-background)] px-3 py-1 text-sm">
                  {nomComplet(p)}
                  <button type="button" onClick={() => setChoisis(choisis.filter(c => c.id !== p.id))} aria-label={`Retirer ${nomComplet(p)}`} className="text-gray-500 hover:text-gray-800">×</button>
                </span>
              ))}
            </div>
          )}
          <input
            id="destinataire"
            type="search"
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
            placeholder="Nom, prénom ou identifiant (2 lettres minimum)"
            autoComplete="off"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-principal)]"
          />
          {resultats.length > 0 && (
            <ul className="max-h-48 overflow-y-auto rounded-md border border-gray-200">
              {resultats.map(p => (
                <li key={p.id}>
                  <button type="button" onClick={() => choisir(p)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-100">
                    <span>{nomComplet(p)}</span>
                    <span className="text-xs text-gray-500">{p.classe ?? ROLES[p.role] ?? ''}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {recherche.trim().length >= 2 && resultats.length === 0 && (
            <p className="text-xs text-gray-500">Personne trouvée à qui vous pouvez écrire.</p>
          )}
        </div>

        {choisis.length > 1 && (
          <div className="flex flex-col gap-1">
            <label htmlFor="titre-groupe" className="text-sm font-semibold text-[var(--color-principal)]">Nom du groupe</label>
            <input id="titre-groupe" type="text" maxLength={200} value={titre} onChange={e => setTitre(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label htmlFor="premier-message" className="text-sm font-semibold text-[var(--color-principal)]">Message</label>
          <textarea id="premier-message" rows={4} maxLength={5000} value={contenu} onChange={e => setContenu(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </div>

        {erreur && <p role="alert" className="text-sm text-red-600">{erreur}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">Annuler</button>
          <button type="submit" disabled={envoi || !choisis.length || !contenu.trim()} className="rounded-full bg-[var(--color-principal)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
            Envoyer
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Liste des conversations + panneau de discussion ─────────────────────────
function Messagerie({ chat }) {
  const { conversations, active, fil, setActiveId } = chat;
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [fichier, setFichier] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  const [nouvelle, setNouvelle] = useState(false);
  const threadRef = useRef(null);
  const inputRef = useRef(null);
  const fichierRef = useRef(null);
  const nbMessages = fil.messages.length;
  const dernierId = fil.messages.at(-1)?.id;

  const query = search.trim().toLowerCase();
  const visible = (conversations ?? []).filter(c => (c.nom + ' ' + apercu(c)).toLowerCase().includes(query));

  // Défilement vers le dernier message quand il en arrive un nouveau
  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [dernierId, active?.id]);

  function choisirFichier(e) {
    const f = e.target.files?.[0] ?? null;
    e.target.value = '';
    if (f && f.size > TAILLE_MAX_FICHIER) {
      chat.setErreur('Fichier trop volumineux (10 Mo maximum)');
      return;
    }
    setFichier(f);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const text = draft.trim();
    if ((!text && !fichier) || !active || envoi) return;
    setEnvoi(true);
    try {
      await chat.envoyer(text, fichier);
      setDraft('');
      setFichier(null);
      chat.setErreur(null);
    } catch (err) {
      chat.setErreur(err.message);
    } finally {
      setEnvoi(false);
      inputRef.current?.focus();
    }
  }

  const boutonNouvelle = (
    <button type="button" onClick={() => setNouvelle(true)} className="rounded-full bg-[var(--color-button)] px-4 py-2 text-sm font-medium text-white hover:opacity-90">
      + Nouvelle conversation
    </button>
  );

  return (
    <>
      {/* colonne : liste des conversations */}
      <div className="hidden lg:flex flex-col w-80 bg-[var(--color-principal)] overflow-hidden shrink-0 border-l border-white/10">
        {/* profil utilisateur courant */}
        <div className="flex flex-col items-center gap-2 px-6 pt-6">
          <Avatar nom={user ? `${user.prenom ?? ''} ${user.nom ?? ''}` : '?'} className="w-16 h-16" />
          <p className="text-white text-lg font-semibold tracking-wide">{user?.prenom} {user?.nom}</p>
          {boutonNouvelle}
        </div>

        {/* barre de recherche */}
        <div className="px-6 pt-4 pb-5">
          <label className="flex items-center gap-2 bg-white rounded-full px-4 py-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher"
              aria-label="Rechercher une conversation"
              className="w-full bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400"
            />
          </label>
        </div>

        <div className="mx-6 border-t border-white/20" />

        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-1">
          {conversations === null && <p className="text-white/60 text-sm text-center py-4">Chargement…</p>}
          {conversations?.length === 0 && <p className="text-white/60 text-sm text-center py-4">Aucune conversation pour l’instant.</p>}
          {visible.map(conv => (
            <button
              key={conv.id}
              type="button"
              onClick={() => setActiveId(conv.id)}
              className={`flex items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors ${conv.id === active?.id ? 'bg-white/10' : 'hover:bg-white/10'}`}
            >
              <Avatar nom={conv.nom} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className={`text-white leading-tight truncate ${conv.nonLus ? 'font-bold' : 'font-semibold'}`}>{conv.nom}</p>
                  {conv.dernierMessage && <span className="text-white/50 text-xs shrink-0">{heure(conv.dernierMessage.envoyeAt)}</span>}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-white/60 text-sm truncate">{apercu(conv)}</p>
                  {conv.nonLus > 0 && (
                    <span className="min-w-[20px] h-5 rounded-full bg-red-600 px-1 text-xs font-bold text-white flex items-center justify-center" aria-label={`${conv.nonLus} non lus`}>
                      {conv.nonLus > 99 ? '99+' : conv.nonLus}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* panneau de discussion */}
      <div className="flex-1 flex flex-col bg-[var(--color-page)] overflow-hidden">
        {/* petit écran : choix de la conversation */}
        <div className="flex lg:hidden items-center gap-2 px-4 pt-4">
          <select
            aria-label="Conversation"
            value={active?.id ?? ''}
            onChange={e => setActiveId(e.target.value)}
            className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            {(conversations ?? []).map(c => (
              <option key={c.id} value={c.id}>{c.nom}{c.nonLus ? ` (${c.nonLus})` : ''}</option>
            ))}
          </select>
          {boutonNouvelle}
        </div>

        {/* en-tête de la conversation */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-200 shrink-0">
          {active && <Avatar nom={active.nom} />}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 leading-tight truncate">{active?.nom ?? 'Messagerie'}</h1>
            <p className="text-gray-400 text-sm truncate">
              {active && (active.groupe
                ? active.participants.map(nomComplet).join(', ')
                : active.participants.map(p => ROLES[p.role] + (p.actif === false ? ' · compte désactivé' : '')).join(''))}
            </p>
          </div>
        </div>

        {chat.erreur && <p role="alert" className="mx-6 mt-3 rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">{chat.erreur}</p>}

        {/* fil de messages */}
        <div ref={threadRef} className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6" aria-live="polite">
          {fil.encore && (
            <button type="button" onClick={chat.chargerPrecedents} className="self-center rounded-full bg-white px-4 py-1 text-sm text-[var(--color-principal)] shadow hover:bg-gray-50">
              Afficher les messages précédents
            </button>
          )}
          {!active && conversations?.length === 0 && (
            <p className="m-auto text-gray-500">Commencez une conversation avec « Nouvelle conversation ».</p>
          )}
          {fil.chargement && nbMessages === 0 && <p className="m-auto text-gray-400 text-sm">Chargement…</p>}
          {fil.messages.map(msg => {
            const pieces = msg.piecesJointes.length > 0 && (
              <ul className="mt-2 flex flex-col gap-1">
                {msg.piecesJointes.map(pj => (
                  <li key={pj.id}>
                    <a href={pj.url} download={pj.nom} className="underline text-sm break-all">📎 {pj.nom}</a>
                  </li>
                ))}
              </ul>
            );
            return msg.deMoi ? (
              <div key={msg.id} className="flex flex-col items-end gap-1">
                <div className="bg-[var(--color-principal)] text-white rounded-2xl rounded-br-md px-5 py-4 max-w-md break-words whitespace-pre-wrap">
                  {msg.contenu}{pieces}
                </div>
                <span className="text-[10px] text-gray-400">{heure(msg.envoyeAt)}</span>
              </div>
            ) : (
              <div key={msg.id} className="flex items-end gap-3 max-w-2xl">
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <Avatar nom={nomComplet(msg.expediteur)} className="w-10 h-10" />
                  <span className="text-[10px] text-gray-400 tracking-wide">{msg.expediteur.prenom}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="bg-[var(--color-background)] rounded-2xl rounded-bl-md px-5 py-4 text-gray-700 break-words whitespace-pre-wrap">
                    {msg.contenu}{pieces}
                  </div>
                  <span className="text-[10px] text-gray-400">{heure(msg.envoyeAt)}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* barre de saisie */}
        {active && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-2 px-6 py-4 shrink-0">
            {fichier && (
              <p className="flex items-center gap-2 text-sm text-gray-600">
                📎 {fichier.name}
                <button type="button" onClick={() => setFichier(null)} className="text-gray-400 hover:text-gray-700" aria-label="Retirer la pièce jointe">×</button>
              </p>
            )}
            <div className="flex items-center gap-4">
              <input ref={fichierRef} type="file" className="hidden" onChange={choisirFichier}
                accept=".pdf,.txt,.csv,.zip,.doc,.docx,.odt,.xls,.xlsx,.ods,.ppt,.pptx,.odp,.jpg,.jpeg,.png,.gif,.webp" />
              <button type="button" onClick={() => fichierRef.current?.click()} aria-label="Joindre un fichier"
                className="w-12 h-12 shrink-0 rounded-full bg-[var(--color-background)] text-gray-600 flex items-center justify-center hover:opacity-80">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>
              <input
                ref={inputRef}
                type="text"
                value={draft}
                maxLength={5000}
                onChange={e => setDraft(e.target.value)}
                placeholder="Tapez votre message …"
                aria-label="Message"
                className="flex-1 bg-[var(--color-background)] rounded-full px-6 py-4 text-lg text-gray-700 placeholder-gray-500 outline-none"
              />
              <button
                type="submit"
                aria-label="Envoyer"
                disabled={envoi}
                className="w-14 h-14 shrink-0 rounded-full bg-[var(--color-button)] text-white flex items-center justify-center hover:opacity-90 transition disabled:opacity-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </form>
        )}
      </div>

      {nouvelle && <NouvelleConversation onClose={() => setNouvelle(false)} onCreer={chat.creer} />}
    </>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function Messages() {
  const chat = useMessagerie();

  return (
    <div className="flex flex-1 overflow-hidden">
      <Messagerie chat={chat} />
      <MessagerieDevTools chat={chat} />
    </div>
  );
}
