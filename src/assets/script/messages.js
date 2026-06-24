// ── Page Messages ───────────────────────────────────────────────────────────
const LS_CONVERSATIONS = 'iris_conversations';

// ── Données initiales ───────────────────────────────────────────────────────
const DEFAULT_CONVERSATIONS = [
    {
        id: 'sio-slam',
        name: 'SIO SLAM',
        group: true,
        extra: '+6',
        lastSeen: 'il y a 6 minutes',
        messages: [
            { from: 'Marie Lambert', text: 'Bonjour, est-ce que le rendu du projet est bien pour vendredi ?', sent: false },
            { from: 'Lucas Martin',  text: "Oui c'est confirmé, vendredi 18h dernier délai.", sent: false },
            { from: 'Jean Dupond',   text: 'Merci pour la précision !', sent: false },
        ],
    },
    {
        id: 'jean-dupond',
        name: 'Jean Dupond',
        group: false,
        lastSeen: 'il y a 2 minutes',
        messages: [
            { from: 'Jean Dupond', text: "Bonjour, j'ai une question sur mon absence de lundi.", sent: false },
        ],
    },
    {
        id: 'marie-lambert',
        name: 'Marie Lambert',
        group: false,
        lastSeen: 'il y a 1 heure',
        messages: [
            { from: 'Marie Lambert', text: 'Mon certificat médical a bien été reçu ?', sent: false },
            { from: 'me',            text: 'Oui, tout est en ordre. Bonne journée !', sent: true },
        ],
    },
    {
        id: 'lucas-martin',
        name: 'Lucas Martin',
        group: false,
        lastSeen: 'il y a 3 heures',
        messages: [
            { from: 'Lucas Martin', text: 'Pouvez-vous me transmettre mon emploi du temps ?', sent: false },
        ],
    },
    {
        id: 'sophie-bernard',
        name: 'Sophie Bernard',
        group: false,
        lastSeen: 'hier',
        messages: [
            { from: 'Sophie Bernard', text: 'Merci pour votre retour rapide.', sent: false },
        ],
    },
    {
        id: 'direction',
        name: 'Direction',
        group: false,
        lastSeen: 'il y a 5 minutes',
        messages: [
            { from: 'Direction', text: 'Réunion pédagogique reportée à jeudi 14h.', sent: false },
        ],
    },
];

// ── Persistance ─────────────────────────────────────────────────────────────
function loadConversations() {
    const raw = localStorage.getItem(LS_CONVERSATIONS);
    if (raw) {
        try { return JSON.parse(raw); } catch { /* données corrompues : on réinitialise */ }
    }
    localStorage.setItem(LS_CONVERSATIONS, JSON.stringify(DEFAULT_CONVERSATIONS));
    return DEFAULT_CONVERSATIONS;
}

function saveConversations(data) {
    localStorage.setItem(LS_CONVERSATIONS, JSON.stringify(data));
}

// ── État ────────────────────────────────────────────────────────────────────
let conversations = loadConversations();
let activeId = conversations[0]?.id ?? null;

// ── Éléments du DOM ─────────────────────────────────────────────────────────
const convList    = document.getElementById('conv-list');
const thread      = document.getElementById('message-thread');
const chatName    = document.getElementById('chat-name');
const chatLastSeen = document.getElementById('chat-lastseen');
const chatAvatars = document.getElementById('chat-avatars');
const convSearch  = document.getElementById('conv-search');
const messageForm  = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const lastPreview = (conv) => conv.messages.length ? conv.messages[conv.messages.length - 1].text : 'Nouvelle conversation';

// ── Rendu de la liste des conversations ─────────────────────────────────────
function renderConvList() {
    convList.innerHTML = conversations.map(conv => `
        <a href="#" class="conv-item flex items-center gap-3 rounded-xl px-2 py-2 transition-colors ${conv.id === activeId ? 'bg-white/10' : 'hover:bg-white/10'}" data-id="${conv.id}">
            <div class="w-12 h-12 rounded-full bg-[var(--color-background)] shrink-0"></div>
            <div class="min-w-0">
                <p class="text-white font-semibold leading-tight">${escapeHtml(conv.name)}</p>
                <p class="text-white/60 text-sm truncate">${escapeHtml(lastPreview(conv))}</p>
            </div>
        </a>`).join('');

    convList.querySelectorAll('.conv-item').forEach(item => {
        item.addEventListener('click', e => {
            e.preventDefault();
            activeId = item.dataset.id;
            renderConvList();
            renderChat();
        });
    });

    filterConvList();
}

// ── Rendu du panneau de discussion ──────────────────────────────────────────
function renderChat() {
    const conv = conversations.find(c => c.id === activeId);
    if (!conv) return;

    chatName.textContent = conv.name;
    chatLastSeen.textContent = `Dernière personne présente ${conv.lastSeen}`;

    chatAvatars.innerHTML = conv.group
        ? `<div class="absolute top-0 right-0 w-10 h-10 rounded-full bg-[var(--color-background)] border-2 border-white"></div>
           <div class="absolute bottom-0 left-0 w-10 h-10 rounded-full bg-[var(--color-background)] border-2 border-white flex items-end justify-end">
               <span class="text-[10px] font-bold text-gray-600 leading-none mb-0.5 mr-0.5">${escapeHtml(conv.extra ?? '')}</span>
           </div>`
        : `<div class="w-10 h-10 rounded-full bg-[var(--color-background)] mt-1"></div>`;

    thread.innerHTML = conv.messages.map(msg => msg.sent
        ? `<div class="flex justify-end">
               <div class="bg-[var(--color-principal)] text-white rounded-2xl rounded-br-md px-5 py-4 max-w-md break-words">${escapeHtml(msg.text)}</div>
           </div>`
        : `<div class="flex items-end gap-3 max-w-2xl">
               <div class="flex flex-col items-center gap-1 shrink-0">
                   <div class="w-10 h-10 rounded-full bg-[var(--color-background)]"></div>
                   <span class="text-[10px] text-gray-400 tracking-wide">${escapeHtml(msg.from)}</span>
               </div>
               <div class="bg-[var(--color-background)] rounded-2xl rounded-bl-md px-5 py-4 text-gray-700 break-words">${escapeHtml(msg.text)}</div>
           </div>`
    ).join('');

    thread.scrollTop = thread.scrollHeight;
}

// ── Envoi d'un message ──────────────────────────────────────────────────────
messageForm?.addEventListener('submit', e => {
    e.preventDefault();
    const text = messageInput.value.trim();
    const conv = conversations.find(c => c.id === activeId);
    if (!text || !conv) return;

    conv.messages.push({ from: 'me', text, sent: true });
    saveConversations(conversations);

    messageInput.value = '';
    renderChat();
    renderConvList();
    messageInput.focus();
});

// ── Recherche dans la liste ─────────────────────────────────────────────────
function filterConvList() {
    const query = (convSearch?.value ?? '').trim().toLowerCase();
    convList.querySelectorAll('.conv-item').forEach(item => {
        item.style.display = item.textContent.toLowerCase().includes(query) ? '' : 'none';
    });
}

convSearch?.addEventListener('input', filterConvList);

// ── Générateur Lorem ipsum ──────────────────────────────────────────────────
const LOREM_WORDS = ('lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor '
    + 'incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation '
    + 'ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure reprehenderit voluptate').split(' ');
const LOREM_FIRST = ['Lorem', 'Ipsum', 'Dolor', 'Amet', 'Consectetur', 'Tempor', 'Magna', 'Veniam', 'Aliqua', 'Commodo'];
const LOREM_LAST  = ['Sit', 'Elit', 'Eiusmod', 'Labore', 'Dolore', 'Minim', 'Nostrud', 'Ullamco', 'Consequat', 'Voluptate'];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

function loremSentence(min = 6, max = 16) {
    const n = min + Math.floor(Math.random() * (max - min + 1));
    const words = Array.from({ length: n }, () => rand(LOREM_WORDS));
    const text = words.join(' ');
    return text.charAt(0).toUpperCase() + text.slice(1) + '.';
}

function loremName() {
    return `${rand(LOREM_FIRST)} ${rand(LOREM_LAST)}`;
}

// ── Actions du menu dev ─────────────────────────────────────────────────────
function devAddContact() {
    const name = loremName();
    const conv = {
        id: 'lorem-' + Date.now(),
        name,
        group: false,
        lastSeen: 'à l’instant',
        messages: [{ from: name, text: loremSentence(), sent: false }],
    };
    conversations.push(conv);
    saveConversations(conversations);
    activeId = conv.id;
    renderConvList();
    renderChat();
}

function devAddMessage() {
    const conv = conversations.find(c => c.id === activeId);
    if (!conv) return;
    conv.messages.push({ from: conv.group ? loremName() : conv.name, text: loremSentence(), sent: false });
    saveConversations(conversations);
    renderChat();
    renderConvList();
}

function devResetConv() {
    localStorage.removeItem(LS_CONVERSATIONS);
    conversations = loadConversations();
    activeId = conversations[0]?.id ?? null;
    renderConvList();
    renderChat();
}

document.getElementById('dev-add-contact')?.addEventListener('click', devAddContact);
document.getElementById('dev-add-message')?.addEventListener('click', devAddMessage);
document.getElementById('dev-reset-conv')?.addEventListener('click', devResetConv);

// ── Initialisation ──────────────────────────────────────────────────────────
if (convList && thread) {
    renderConvList();
    renderChat();
}
