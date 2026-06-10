// ── Clés localStorage ─────────────────────────────────────────────────────────
const LS_MESSAGES = 'iris_messageCount';
const LS_ABSENCES = 'iris_absences';
const LS_COURS    = 'iris_cours';

// ── Menu burger ───────────────────────────────────────────────────────────────
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
let messageCount = parseInt(localStorage.getItem(LS_MESSAGES) ?? '0', 10);

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
    localStorage.setItem(LS_MESSAGES, String(messageCount));
}

function addMessage()    { messageCount++;                        updateMessageBadge(); }
function removeMessage() { if (messageCount > 0) messageCount--; updateMessageBadge(); }
function resetMessages() { messageCount = 0;                      updateMessageBadge(); }

// ── Données initiales (absences) ──────────────────────────────────────────────
const DEFAULT_ABSENCES = [
    { eleve: 'Jean Dupond',     classe: 'BTS 1ère Année', heureDebut: '09:00', heureFin: '13:00', statut: 'en_attente',   notes: 'Parents non joignables.',   tel: '06 12 34 56 78', email: 'dupond.famille@email.fr' },
    { eleve: 'Marie Lambert',   classe: 'BTS 2ème Année', heureDebut: '10:00', heureFin: '12:00', statut: 'justifie',     notes: 'Certificat médical fourni.', tel: '07 23 45 67 89', email: 'lambert.contact@email.fr' },
    { eleve: 'Lucas Martin',    classe: 'BTS 1ère Année', heureDebut: '14:00', heureFin: '18:00', statut: 'non_justifie', notes: '',                           tel: '06 34 56 78 90', email: 'martin.lucas@email.fr' },
    { eleve: 'Sophie Bernard',  classe: 'BTS 3ème Année', heureDebut: '08:00', heureFin: '10:00', statut: 'en_attente',   notes: 'Convocation reçue.',         tel: '07 45 67 89 01', email: 'bernard.sophie@email.fr' },
];

const DEFAULT_COURS = [];

function loadAbsences() {
    const raw = localStorage.getItem(LS_ABSENCES);
    if (raw) return JSON.parse(raw);
    // Premier lancement : on insère les données par défaut
    localStorage.setItem(LS_ABSENCES, JSON.stringify(DEFAULT_ABSENCES));
    return DEFAULT_ABSENCES;
}

function saveAbsences(data) {
    localStorage.setItem(LS_ABSENCES, JSON.stringify(data));
}

function loadCours() {
    const raw = localStorage.getItem(LS_COURS);
    if (raw) return JSON.parse(raw);
    localStorage.setItem(LS_COURS, JSON.stringify(DEFAULT_COURS));
    return DEFAULT_COURS;
}

function saveCours(data) {
    localStorage.setItem(LS_COURS, JSON.stringify(data));
}

// ── Rendu des tableaux ────────────────────────────────────────────────────────
const STATUT_LABEL = { en_attente: 'En attente', justifie: 'Justifié', non_justifie: 'Non justifié' };

function renderAbsences() {
    const tbody = document.getElementById('absences-tbody');
    if (!tbody) return;
    const data = loadAbsences();
    tbody.innerHTML = data.map((row, i) => `
        <tr class="hover:bg-gray-100 cursor-pointer" data-index="${i}" data-table="absence">
            <td class="border border-gray-400 px-3 py-2 text-center">${row.eleve}</td>
            <td class="border border-gray-400 px-3 py-2 text-center">${row.classe}</td>
            <td class="border border-gray-400 px-3 py-2 text-center">${row.heureDebut} – ${row.heureFin}</td>
            <td class="border border-gray-400 px-3 py-2 text-center">${STATUT_LABEL[row.statut] ?? row.statut}</td>
            <td class="border border-gray-400 px-3 py-2 text-center">
                <button class="contact-btn bg-(--color-secondaire) text-white text-xs font-medium px-3 py-1 rounded-lg hover:opacity-80 transition" data-index="${i}">Contact</button>
            </td>
        </tr>`).join('');

    tbody.querySelectorAll('tr').forEach(tr => {
        tr.addEventListener('click', () => openAbsenceModal(parseInt(tr.dataset.index, 10)));
    });

    tbody.querySelectorAll('.contact-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            openContactModal(parseInt(btn.dataset.index, 10));
        });
    });
}

function renderCours() {
    const tbody = document.getElementById('cours-tbody');
    if (!tbody) return;
    const data = loadCours();
    tbody.innerHTML = data.map((row, i) => `
        <tr class="hover:bg-gray-100 cursor-pointer" data-index="${i}" data-table="cours">
            <td class="border border-gray-400 px-2 py-2 text-center text-xs font-semibold">${row.heureDebut}</td>
            <td class="border border-gray-400 px-3 py-2 text-center">${row.salle1 ?? ''}</td>
            <td class="border border-gray-400 px-3 py-2 text-center">${row.salle2 ?? ''}</td>
            <td class="border border-gray-400 px-3 py-2 text-center">${row.salle3 ?? ''}</td>
        </tr>`).join('');

    tbody.querySelectorAll('tr').forEach(tr => {
        tr.addEventListener('click', () => openCoursModal(parseInt(tr.dataset.index, 10)));
    });
}

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

let editingAbsenceIndex = null;

function openAbsenceModal(index = null) {
    editingAbsenceIndex = index;
    const data = loadAbsences();
    const row  = index !== null ? data[index] : null;

    document.getElementById('abs-eleve').value       = row?.eleve       ?? '';
    document.getElementById('abs-classe').value      = row?.classe      ?? '';
    document.getElementById('abs-heure-debut').value = row?.heureDebut  ?? '';
    document.getElementById('abs-heure-fin').value   = row?.heureFin    ?? '';
    document.getElementById('abs-statut').value      = row?.statut      ?? '';
    document.getElementById('abs-notes').value       = row?.notes       ?? '';

    document.querySelector('#modal-absence h3').textContent =
        index !== null ? 'Absence — Modifier' : 'Absence — Nouvelle';

    openModal('modal-absence');
}

let editingCoursIndex = null;

function openCoursModal(index = null) {
    editingCoursIndex = index;
    const data = loadCours();
    const row  = index !== null ? data[index] : null;

    document.getElementById('cours-salle').value       = row?.salle       ?? '';
    document.getElementById('cours-classe').value      = row?.classe      ?? '';
    document.getElementById('cours-prof').value        = row?.prof        ?? '';
    document.getElementById('cours-heure-debut').value = row?.heureDebut  ?? '';
    document.getElementById('cours-heure-fin').value   = row?.heureFin    ?? '';

    openModal('modal-cours');
}

// Fermeture via boutons .modal-close
document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.modal));
});

function openContactModal(index) {
    const data = loadAbsences();
    const row  = data[index];
    if (!row) return;

    document.getElementById('contact-nom').textContent   = row.eleve;
    const telEl   = document.getElementById('contact-tel');
    const emailEl = document.getElementById('contact-email');
    telEl.textContent   = row.tel   ?? 'Non renseigné';
    telEl.href          = row.tel   ? `tel:${row.tel.replace(/\s/g, '')}` : '#';
    emailEl.textContent = row.email ?? 'Non renseigné';
    emailEl.href        = row.email ? `mailto:${row.email}` : '#';

    openModal('modal-contact');
}

document.getElementById('modal-absence-backdrop')?.addEventListener('click', () => closeModal('modal-absence'));
document.getElementById('modal-cours-backdrop')?.addEventListener('click',   () => closeModal('modal-cours'));
document.getElementById('modal-contact-backdrop')?.addEventListener('click', () => closeModal('modal-contact'));

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeModal('modal-absence'); closeModal('modal-cours'); closeModal('modal-contact'); }
});

// Soumission absence → sauvegarde localStorage
document.getElementById('form-absence')?.addEventListener('submit', e => {
    e.preventDefault();
    const data = loadAbsences();
    const entry = {
        eleve:      document.getElementById('abs-eleve').value.trim(),
        classe:     document.getElementById('abs-classe').value.trim(),
        heureDebut: document.getElementById('abs-heure-debut').value,
        heureFin:   document.getElementById('abs-heure-fin').value,
        statut:     document.getElementById('abs-statut').value,
        notes:      document.getElementById('abs-notes').value.trim(),
    };
    if (editingAbsenceIndex !== null) {
        data[editingAbsenceIndex] = entry;
    } else {
        data.push(entry);
    }
    saveAbsences(data);
    renderAbsences();
    closeModal('modal-absence');
});

// Soumission cours → sauvegarde localStorage
document.getElementById('form-cours')?.addEventListener('submit', e => {
    e.preventDefault();
    const data = loadCours();
    const entry = {
        salle:      document.getElementById('cours-salle').value.trim(),
        classe:     document.getElementById('cours-classe').value.trim(),
        prof:       document.getElementById('cours-prof').value.trim(),
        heureDebut: document.getElementById('cours-heure-debut').value,
        heureFin:   document.getElementById('cours-heure-fin').value,
    };
    if (editingCoursIndex !== null) {
        data[editingCoursIndex] = entry;
    } else {
        data.push(entry);
    }
    saveCours(data);
    renderCours();
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

debugToggle?.addEventListener('click', () => debugPanel.classList.toggle('hidden'));
debugClose?.addEventListener('click',  () => debugPanel.classList.add('hidden'));

document.getElementById('dev-msg-add')?.addEventListener('click',    addMessage);
document.getElementById('dev-msg-remove')?.addEventListener('click', removeMessage);
document.getElementById('dev-msg-reset')?.addEventListener('click',  resetMessages);

document.getElementById('dev-reset-data')?.addEventListener('click', () => {
    localStorage.removeItem(LS_ABSENCES);
    localStorage.removeItem(LS_COURS);
    renderAbsences();
    renderCours();
});

// ── Initialisation ────────────────────────────────────────────────────────────
updateMessageBadge();
renderAbsences();
renderCours();
