// ── Menu burger ──────────────────────────────────────────────────────────────
const overlay  = document.getElementById('dropdown-overlay');
const panel    = document.getElementById('dropdown-panel');
const checkbox = document.querySelector('.swap input');

function openMenu() {
    overlay.classList.remove('hidden');
    requestAnimationFrame(() => panel.classList.remove('translate-x-full'));
}

function closeMenu() {
    panel.classList.add('translate-x-full');
    panel.addEventListener('transitionend', () => overlay.classList.add('hidden'), { once: true });
    if (checkbox) checkbox.checked = false;
}

checkbox?.addEventListener('change', () => checkbox.checked ? openMenu() : closeMenu());
document.getElementById('dropdown-backdrop')?.addEventListener('click', closeMenu);
document.getElementById('dropdown-close')?.addEventListener('click', closeMenu);

// ── Compteur messages ─────────────────────────────────────────────────────────
let messageCount = 0;

function updateMessageBadge() {
    const badge   = document.getElementById('msg-badge');
    const counter = document.getElementById('debug-counter');

    if (messageCount <= 0) {
        messageCount = 0;
        badge.classList.add('hidden');
        badge.classList.remove('flex');
    } else {
        badge.textContent = messageCount > 99 ? '99+' : String(messageCount);
        badge.classList.remove('hidden');
        badge.classList.add('flex');
    }

    if (counter) counter.textContent = String(messageCount);
}

function addMessage()    { messageCount++;                        updateMessageBadge(); }
function removeMessage() { if (messageCount > 0) messageCount--; updateMessageBadge(); }
function resetMessages() { messageCount = 0;                      updateMessageBadge(); }

// ── Modales ───────────────────────────────────────────────────────────────────
function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.style.overflow = '';
}

// Fermeture via boutons .modal-close
document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.modal));
});

// Fermeture via backdrop
document.getElementById('modal-absence-backdrop')?.addEventListener('click', () => closeModal('modal-absence'));
document.getElementById('modal-cours-backdrop')?.addEventListener('click',   () => closeModal('modal-cours'));

// Fermeture via touche Escape
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        closeModal('modal-absence');
        closeModal('modal-cours');
    }
});

// Soumission formulaires (placeholder)
document.getElementById('form-absence')?.addEventListener('submit', e => {
    e.preventDefault();
    console.log('Absence enregistrée');
    closeModal('modal-absence');
});
document.getElementById('form-cours')?.addEventListener('submit', e => {
    e.preventDefault();
    console.log('Cours enregistré');
    closeModal('modal-cours');
});

// ── Barre de recherche ────────────────────────────────────────────────────────
let searchOpen = false;
const searchBtn   = document.getElementById('search-btn');
const searchInput = document.getElementById('search-input');

searchBtn?.addEventListener('click', () => {
    searchOpen = !searchOpen;
    if (searchOpen) {
        searchInput.classList.remove('w-0', 'opacity-0');
        searchInput.classList.add('w-48', 'opacity-100', 'pr-2');
        searchInput.focus();
    } else {
        searchInput.classList.add('w-0', 'opacity-0');
        searchInput.classList.remove('w-48', 'opacity-100', 'pr-2');
        searchInput.value = '';
        filterTables('');
    }
});

searchInput?.addEventListener('input', () => filterTables(searchInput.value.trim().toLowerCase()));

function filterTables(query) {
    document.querySelectorAll('#absences-tbody tr, #cours-tbody tr').forEach(row => {
        row.style.display = query === '' || row.textContent.toLowerCase().includes(query) ? '' : 'none';
    });
}

// ── Panel debug / dev ─────────────────────────────────────────────────────────
const debugPanel  = document.getElementById('debug-panel');
const debugToggle = document.getElementById('debug-toggle');
const debugClose  = document.getElementById('debug-close');

debugToggle?.addEventListener('click', () => {
    debugPanel.classList.toggle('hidden');
});
debugClose?.addEventListener('click', () => {
    debugPanel.classList.add('hidden');
});

document.getElementById('dev-msg-add')?.addEventListener('click',    addMessage);
document.getElementById('dev-msg-remove')?.addEventListener('click', removeMessage);
document.getElementById('dev-msg-reset')?.addEventListener('click',  resetMessages);
