const addSpaceButton   = document.getElementById("add-space-button");
const documentsSection = document.getElementById("documents-section");

/* ── Modales ─────────────────────────────────────────────────── */
const modalSpace       = document.getElementById("modal-space");
const modalDoc         = document.getElementById("modal-doc");
const modalRename      = document.getElementById("modal-rename");
const modalDeleteSpace = document.getElementById("modal-delete-space");
const modalDeleteDoc   = document.getElementById("modal-delete-doc");

/* ── Données initiales ──────────────────────────────────────── */
const initialSpaces = [
  { name: "Administration",               docs: ["Doc.test"] },
  { name: "B1 Développement et BDD",      docs: ["Doc.test"] },
  { name: "B1 Système et réseaux",        docs: ["Doc.test"] },
  { name: "B2 SISR",                      docs: ["Doc.test"] },
  { name: "B2 SLAM",                      docs: ["Doc.test"] },
  { name: "B3 Cybersécurité",             docs: ["Doc.test"] },
  { name: "CEJM",                         docs: ["Doc.test"] },
  { name: "Culture général et expression",docs: ["Doc.test"] },
  { name: "Anglais",                      docs: ["Doc.test"] },
  { name: "Mathématique",                 docs: ["Doc.test"] },
];

/* ── Helpers modales ─────────────────────────────────────────── */
function openModal(dialog) {
  dialog.showModal();
  const first = dialog.querySelector("input");
  if (first) setTimeout(() => first.focus(), 50);
}
function closeModal(dialog) {
  dialog.close();
  dialog.querySelectorAll("input").forEach((el) => (el.value = ""));
}

/* ── Icône dossier SVG ───────────────────────────────────────── */
function folderIcon() {
  return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" class="shrink-0">
    <path d="M0 1H6L9 4H16V14H0V1Z" fill="#07A6A6"/>
  </svg>`;
}

/* ── Icône corbeille SVG ─────────────────────────────────────── */
function trashIcon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
    <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V5a1 1 0 011-1h6a1 1 0 011 1v2"/>
  </svg>`;
}

/* ── Icône chevron SVG ───────────────────────────────────────── */
function chevronIcon() {
  return `<svg class="chevron-icon transition-transform duration-200" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
  </svg>`;
}

/* ── Crée une ligne de document ──────────────────────────────── */
function createDocRow(docName, onDelete) {
  const row = document.createElement("div");
  row.className = "flex items-center justify-between gap-2 py-1";
  row.innerHTML = `
    <span class="flex items-center gap-2 text-sm text-gray-700">
      ${folderIcon()}
      <span class="doc-name">${docName}</span>
    </span>
    <button type="button" class="delete-doc-btn text-gray-400 hover:text-[#EC6F6F] transition-colors" title="Supprimer ce document">
      ${trashIcon()}
    </button>
  `;
  row.querySelector(".delete-doc-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    onDelete(row, docName);
  });
  return row;
}

/* ── Crée un collapse complet ────────────────────────────────── */
function createCollapse(spaceName, docs = []) {
  const wrapper = document.createElement("div");
  wrapper.className = "border border-base-300 rounded-lg overflow-hidden bg-base-100";

  /* ─ En-tête cliquable ─ */
  const header = document.createElement("div");
  header.className = "flex items-center justify-between gap-2 px-4 py-3 cursor-pointer select-none hover:bg-gray-50 transition-colors";

  const leftSide = document.createElement("div");
  leftSide.className = "flex items-center gap-2 flex-1 min-w-0";

  const chevron = document.createElement("span");
  chevron.className = "shrink-0 text-gray-400";
  chevron.innerHTML = chevronIcon();

  const titleText = document.createElement("span");
  titleText.className = "space-title font-semibold truncate";
  titleText.textContent = spaceName;

  leftSide.appendChild(chevron);
  leftSide.appendChild(titleText);

  const rightSide = document.createElement("div");
  rightSide.className = "flex items-center gap-1 shrink-0";

  /* Bouton Renommer */
  const renameBtn = document.createElement("button");
  renameBtn.type = "button";
  renameBtn.className = "text-xs text-[#07A6A6] font-semibold hover:text-[#0b7d7d] transition px-2 py-1 rounded hover:bg-[#07A6A6]/10";
  renameBtn.textContent = "Renommer";

  /* Bouton Supprimer l'espace */
  const deleteSpaceBtn = document.createElement("button");
  deleteSpaceBtn.type = "button";
  deleteSpaceBtn.className = "text-gray-400 hover:text-[#EC6F6F] transition-colors p-1 rounded";
  deleteSpaceBtn.title = "Supprimer cet espace";
  deleteSpaceBtn.innerHTML = trashIcon();

  rightSide.appendChild(renameBtn);
  rightSide.appendChild(deleteSpaceBtn);
  header.appendChild(leftSide);
  header.appendChild(rightSide);

  /* ─ Corps (masqué par défaut) ─ */
  const body = document.createElement("div");
  body.className = "border-t border-base-300 px-4 pb-4 pt-3 flex flex-col gap-1 hidden";

  const docList = document.createElement("div");
  docList.className = "doc-list flex flex-col divide-y divide-gray-100";

  const emptyMsg = document.createElement("p");
  emptyMsg.className = "empty-msg text-gray-400 italic text-xs py-1";
  emptyMsg.textContent = "Aucun document dans cet espace.";

  function refreshEmpty() {
    const hasDoc = docList.querySelector(".flex.items-center");
    emptyMsg.style.display = hasDoc ? "none" : "block";
  }

  docs.forEach((docName) => {
    docList.appendChild(
      createDocRow(docName, (row, name) => {
        openDeleteDocModal(name, () => { row.remove(); refreshEmpty(); });
      })
    );
  });
  refreshEmpty();

  /* Bouton "+ Ajouter un document" */
  const addDocBtn = document.createElement("button");
  addDocBtn.type = "button";
  addDocBtn.className = "btn btn-xs bg-[#07A6A6] hover:bg-[#07A6A6]/90 text-white font-bold self-start mt-3";
  addDocBtn.textContent = "+ Ajouter un document";

  body.appendChild(docList);
  body.appendChild(emptyMsg);
  body.appendChild(addDocBtn);

  wrapper.appendChild(header);
  wrapper.appendChild(body);

  /* ─ Toggle ouverture/fermeture ─ */
  let isOpen = false;
  function toggleBody() {
    isOpen = !isOpen;
    body.classList.toggle("hidden", !isOpen);
    chevron.querySelector("svg").style.transform = isOpen ? "rotate(180deg)" : "";
  }

  header.addEventListener("click", (e) => {
    if (e.target.closest("button")) return; // ne pas déclencher si bouton d'action cliqué
    toggleBody();
  });

  /* ─ Renommer ─ */
  renameBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    document.getElementById("rename-input").value = titleText.textContent;
    openModal(modalRename);

    const onConfirm = () => {
      const newName = document.getElementById("rename-input").value.trim();
      if (newName) titleText.textContent = newName;
      closeModal(modalRename);
    };
    const onCancel = () => closeModal(modalRename);

    document.getElementById("rename-confirm").addEventListener("click", onConfirm, { once: true });
    document.getElementById("rename-cancel").addEventListener("click", onCancel, { once: true });
  });

  /* ─ Supprimer l'espace ─ */
  deleteSpaceBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    document.getElementById("delete-space-name").textContent = titleText.textContent;
    openModal(modalDeleteSpace);

    const onConfirm = () => { wrapper.remove(); closeModal(modalDeleteSpace); };
    const onCancel  = () => closeModal(modalDeleteSpace);

    document.getElementById("delete-space-confirm").addEventListener("click", onConfirm, { once: true });
    document.getElementById("delete-space-cancel").addEventListener("click", onCancel, { once: true });
  });

  /* ─ Ajouter un document (bouton interne) ─ */
  addDocBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    document.getElementById("doc-name-input").value = "";
    openModal(modalDoc);

    const onConfirm = () => {
      const docName = document.getElementById("doc-name-input").value.trim();
      if (!docName) return;
      docList.appendChild(
        createDocRow(docName, (row, name) => {
          openDeleteDocModal(name, () => { row.remove(); refreshEmpty(); });
        })
      );
      refreshEmpty();
      closeModal(modalDoc);
    };
    const onCancel = () => closeModal(modalDoc);

    document.getElementById("doc-confirm").addEventListener("click", onConfirm, { once: true });
    document.getElementById("doc-cancel").addEventListener("click", onCancel, { once: true });
  });

  return wrapper;
}

/* ── Modale suppression document ─────────────────────────────── */
function openDeleteDocModal(docName, onConfirm) {
  document.getElementById("delete-doc-name").textContent = docName;
  openModal(modalDeleteDoc);

  const confirm = () => { onConfirm(); closeModal(modalDeleteDoc); };
  const cancel  = () => closeModal(modalDeleteDoc);

  document.getElementById("delete-doc-confirm").addEventListener("click", confirm, { once: true });
  document.getElementById("delete-doc-cancel").addEventListener("click", cancel,  { once: true });
}

/* ── Initialisation ──────────────────────────────────────────── */
initialSpaces.forEach(({ name, docs }) => {
  documentsSection.appendChild(createCollapse(name, docs));
});

/* ── Bouton "Ajouter un espace" ──────────────────────────────── */
addSpaceButton?.addEventListener("click", () => {
  document.getElementById("space-name-input").value = "";
  openModal(modalSpace);
});

document.getElementById("space-cancel")?.addEventListener("click", () => closeModal(modalSpace));
document.getElementById("space-confirm")?.addEventListener("click", () => {
  const name = document.getElementById("space-name-input").value.trim();
  if (!name) return;
  documentsSection.appendChild(createCollapse(name, []));
  closeModal(modalSpace);
});

/* ── Touche Entrée dans les modales ──────────────────────────── */
document.getElementById("space-name-input")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("space-confirm").click();
});
document.getElementById("doc-name-input")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("doc-confirm").click();
});
document.getElementById("rename-input")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("rename-confirm").click();
});