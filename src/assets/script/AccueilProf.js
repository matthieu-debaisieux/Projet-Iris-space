// ── Clés localStorage (widgets de l'accueil professeur) ───────────────────────
const LS_PLANNING     = 'iris_prof_planning';
const LS_DEVOIR       = 'iris_prof_devoir';
const LS_TRAVAIL      = 'iris_prof_travail';
const LS_RESSOURCES   = 'iris_prof_ressources';
const LS_NOTES_RESUME = 'iris_prof_notes_resume';
const LS_ACTUALITES   = 'iris_actualites'; // partagé avec la page Actualité de l'administration

// ── Données par défaut ─────────────────────────────────────────────────────────
const DEFAULT_PLANNING = [
    { heure: '10h00', matiere: 'FRANCAIS', classe: 'BTS 1re année', salle: '318' },
    { heure: '11h00', matiere: 'FRANCAIS', classe: 'BTS 1re année', salle: '318' },
];

const DEFAULT_DEVOIR = { titre: 'Dissertation chapitre 3', classe: 'BTS 1re année', date: '2028-09-16' };

const DEFAULT_TRAVAIL = [{ classe: 'BTS 1re année', titre: 'Exercices p.42 à rendre pour vendredi' }];
const DEFAULT_RESSOURCES  = ['Support de cours - Chapitre 3.pdf'];
const DEFAULT_NOTES_RESUME = ['Jean Dupond — Français : 14/20'];

// ── Générique localStorage JSON ─────────────────────────────────────────────────
function loadJSON(key, fallback) {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
    localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
}

function saveJSON(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

// ── Modales (dupliqué localement : script.js est un module isolé) ──────────────
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

// ── Actualité (lecture seule, données partagées avec l'administration) ─────────
const MOIS_ABBR = {
    janvier: 'janv', février: 'févr', mars: 'mars', avril: 'avr', mai: 'mai', juin: 'juin',
    juillet: 'juil', août: 'août', septembre: 'sept', octobre: 'oct', novembre: 'nov', décembre: 'déc',
};

function parseDateFr(dateStr) {
    const m = (dateStr ?? '').match(/(\d+)\s+(\S+)/);
    if (!m) return { jour: '--', mois: '' };
    return { jour: m[1], mois: MOIS_ABBR[m[2].toLowerCase()] ?? m[2].slice(0, 4) };
}

function renderActualites() {
    const raw = localStorage.getItem(LS_ACTUALITES);
    const liste = raw ? JSON.parse(raw) : [];
    const publiees = liste.filter(a => !a.statut || a.statut === 'Publié').slice(0, 3);

    const mobileList  = document.getElementById('actualites-mobile-list');
    const desktopList = document.getElementById('actualites-desktop-list');

    if (publiees.length === 0) {
        const vide = '<p class="text-sm text-gray-400 text-center py-4">Aucune actualité publiée.</p>';
        if (mobileList)  mobileList.innerHTML  = vide;
        if (desktopList) desktopList.innerHTML = vide;
        return;
    }

    if (mobileList) {
        mobileList.innerHTML = publiees.map(a => {
            const { jour, mois } = parseDateFr(a.date);
            return `
                <li class="flex items-start gap-3">
                    <div class="shrink-0 w-10 h-10 rounded-full bg-gray-200 flex flex-col items-center justify-center leading-none text-[10px] font-semibold text-gray-500">
                        <span>${jour}</span>
                        <span>${mois}</span>
                    </div>
                    <div>
                        <p class="font-bold text-sm text-[var(--color-titre)]">${a.titre}</p>
                        <p class="text-sm text-gray-500">${(a.contenu ?? '').slice(0, 60)}</p>
                    </div>
                </li>`;
        }).join('');
    }

    if (desktopList) {
        desktopList.innerHTML = publiees.map(a => `
            <a href="actualité.html" class="block px-3 py-2 rounded-lg hover:bg-gray-300 transition">
                <p class="font-semibold text-sm text-[var(--color-titre)] truncate">${a.titre}</p>
                <p class="text-xs text-gray-500">${a.date}</p>
            </a>`).join('');
    }
}

// ── Prochain devoir ──────────────────────────────────────────────────────────
function loadDevoir() { return loadJSON(LS_DEVOIR, DEFAULT_DEVOIR); }
function saveDevoir(d) { saveJSON(LS_DEVOIR, d); }

function renderDevoir() {
    const text = document.getElementById('devoir-text');
    if (!text) return;
    const d = loadDevoir();
    if (!d || !d.titre) {
        text.textContent = 'Aucun devoir à venir — cliquez pour en ajouter un';
        return;
    }
    const dateLisible = d.date
        ? new Date(d.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
        : 'date non définie';
    text.textContent = `${d.titre} (${d.classe}) — à rendre le ${dateLisible}`;
}

function showDevoirForm() {
    const d = loadDevoir();
    document.getElementById('devoir-titre').value  = d?.titre  ?? '';
    document.getElementById('devoir-classe').value = d?.classe ?? '';
    document.getElementById('devoir-date').value   = d?.date   ?? '';
    document.getElementById('devoir-text').classList.add('hidden');
    document.getElementById('devoir-form').classList.remove('hidden');
    document.getElementById('devoir-form').classList.add('flex');
}

function hideDevoirForm() {
    document.getElementById('devoir-form').classList.add('hidden');
    document.getElementById('devoir-form').classList.remove('flex');
    document.getElementById('devoir-text').classList.remove('hidden');
}

// ── Planning (cours à venir) ────────────────────────────────────────────────
function loadPlanning() { return loadJSON(LS_PLANNING, DEFAULT_PLANNING); }
function savePlanning(data) { saveJSON(LS_PLANNING, data); }

function renderPlanningMobile(data) {
    const ul = document.getElementById('cours-a-venir-mobile');
    if (!ul) return;
    if (data.length === 0) {
        ul.innerHTML = '<li class="text-center text-sm text-gray-400 py-2">Aucun cours prévu.</li>';
        return;
    }
    ul.innerHTML = data.map((c, i) => `
        <li class="flex items-center gap-3 py-2" data-index="${i}">
            <span class="text-sm text-gray-500 w-12 shrink-0">${c.heure}</span>
            <span class="text-sm font-bold text-sky-500 w-20 shrink-0">${c.matiere}</span>
            <span class="text-sm text-gray-500 flex-1">${c.classe}</span>
            <span class="text-sm text-gray-500">${c.salle}</span>
            <button class="planning-del text-gray-300 hover:text-red-500 transition text-xs" data-index="${i}" title="Supprimer">✕</button>
        </li>`).join('');

    ul.querySelectorAll('.planning-del').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            removePlanningEntry(parseInt(btn.dataset.index, 10));
        });
    });
}

function renderPlanningDesktop(data) {
    const rows = document.querySelectorAll('#planning-tbody tr');
    rows.forEach(tr => {
        const heure = tr.dataset.heure;
        const cell  = tr.querySelector('.planning-cell');
        const cours = data.find(c => c.heure === heure);
        if (cours) {
            cell.className = 'planning-cell border border-gray-300 bg-sky-100 px-2 py-1 align-top';
            cell.innerHTML = `<p class="text-xs font-bold text-sky-600">${cours.matiere}</p><p class="text-[11px] text-gray-500">${cours.classe} · salle ${cours.salle}</p>`;
        } else {
            cell.className = 'planning-cell border border-gray-300 bg-gray-100';
            cell.innerHTML = '';
        }
    });
}

function renderPlanning() {
    const data = loadPlanning();
    renderPlanningMobile(data);
    renderPlanningDesktop(data);
}

function removePlanningEntry(index) {
    const data = loadPlanning();
    data.splice(index, 1);
    savePlanning(data);
    renderPlanning();
}

// ── Travail donné (assignable à une classe) ─────────────────────────────────────
function renderTravailList() {
    const container = document.getElementById('travail-donne-list');
    if (!container) return;
    const items = loadJSON(LS_TRAVAIL, DEFAULT_TRAVAIL);
    if (items.length === 0) {
        container.innerHTML = '<p class="text-xs text-gray-400 text-center py-3">Aucun travail donné pour le moment.</p>';
        return;
    }
    container.innerHTML = items.map((item, i) => `
        <div class="flex items-center justify-between gap-2 px-2 py-1.5 text-xs text-gray-700 border-b border-gray-300 last:border-0">
            <span class="truncate"><span class="font-semibold text-[var(--color-secondaire)]">${item.classe}</span> — ${item.titre}</span>
            <button class="travail-del text-gray-400 hover:text-red-500 transition shrink-0" data-index="${i}" title="Supprimer">✕</button>
        </div>`).join('');

    container.querySelectorAll('.travail-del').forEach(btn => {
        btn.addEventListener('click', () => {
            const data = loadJSON(LS_TRAVAIL, DEFAULT_TRAVAIL);
            data.splice(parseInt(btn.dataset.index, 10), 1);
            saveJSON(LS_TRAVAIL, data);
            renderTravailList();
        });
    });
}

// ── Listes simples en lecture seule (ressources / notes) ────────────────────────
function renderSimpleList(containerId, key, def) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const items = loadJSON(key, def);
    if (items.length === 0) {
        container.innerHTML = '<p class="text-xs text-gray-400 text-center py-3">Aucune donnée pour le moment.</p>';
        return;
    }
    container.innerHTML = items.map(txt => `
        <div class="px-2 py-1.5 text-xs text-gray-700 border-b border-gray-300 last:border-0">
            <span class="truncate">${txt}</span>
        </div>`).join('');
}

function refreshAllSimpleLists() {
    renderTravailList();
    renderSimpleList('ressources-list', LS_RESSOURCES, DEFAULT_RESSOURCES);
    renderSimpleList('notes-resume-list', LS_NOTES_RESUME, DEFAULT_NOTES_RESUME);
}

// ── Initialisation ────────────────────────────────────────────────────────────
renderActualites();
renderDevoir();
renderPlanning();
refreshAllSimpleLists();

document.getElementById('travail-add-btn')?.addEventListener('click', () => {
    const row = document.getElementById('travail-add-row');
    row.classList.toggle('hidden');
    if (!row.classList.contains('hidden')) document.getElementById('travail-add-classe').focus();
});

document.getElementById('travail-add-input')?.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const classeInput = document.getElementById('travail-add-classe');
    const classe = classeInput.value.trim();
    const titre  = e.target.value.trim();
    if (!classe || !titre) return;
    const data = loadJSON(LS_TRAVAIL, DEFAULT_TRAVAIL);
    data.push({ classe, titre });
    saveJSON(LS_TRAVAIL, data);
    classeInput.value = '';
    e.target.value = '';
    renderTravailList();
});

// Prochain devoir : édition inline
document.getElementById('devoir-text')?.addEventListener('click', showDevoirForm);
document.getElementById('devoir-cancel')?.addEventListener('click', hideDevoirForm);
document.getElementById('devoir-save')?.addEventListener('click', () => {
    saveDevoir({
        titre:  document.getElementById('devoir-titre').value.trim(),
        classe: document.getElementById('devoir-classe').value.trim(),
        date:   document.getElementById('devoir-date').value,
    });
    renderDevoir();
    hideDevoirForm();
});

// Planning : ouverture / soumission de la modale d'ajout
document.getElementById('planning-add-btn-mobile')?.addEventListener('click', () => openModal('modal-planning'));
document.getElementById('planning-add-btn-desktop')?.addEventListener('click', () => openModal('modal-planning'));
document.getElementById('modal-planning-backdrop')?.addEventListener('click', () => closeModal('modal-planning'));
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal('modal-planning'); });

document.getElementById('form-planning')?.addEventListener('submit', e => {
    e.preventDefault();
    const matiere = document.getElementById('planning-matiere').value.trim();
    const classe  = document.getElementById('planning-classe').value.trim();
    const salle   = document.getElementById('planning-salle').value.trim();
    if (!matiere || !classe || !salle) return;

    const data = loadPlanning();
    data.push({ heure: document.getElementById('planning-heure').value, matiere, classe, salle });
    savePlanning(data);
    renderPlanning();
    e.target.reset();
    closeModal('modal-planning');
});

// Panel debug : le bouton "Reset données" (script.js) réinitialise aussi ces widgets
document.getElementById('dev-reset-data')?.addEventListener('click', () => {
    localStorage.removeItem(LS_PLANNING);
    localStorage.removeItem(LS_DEVOIR);
    localStorage.removeItem(LS_TRAVAIL);
    localStorage.removeItem(LS_RESSOURCES);
    localStorage.removeItem(LS_NOTES_RESUME);
    renderDevoir();
    renderPlanning();
    refreshAllSimpleLists();
});
