// ===== DONNÉES ACTUALITÉS =====
const actualites = [
  { id: 0, titre: "Actualité #0", date: "24 juin 2026", statut: "Publié",    image: "votre-image.jpg", contenu: "Contenu complet de l'actualité #0.", auteur: "Admin" },
  { id: 1, titre: "Actualité #1", date: "20 juin 2026", statut: "Brouillon", image: "votre-image.jpg", contenu: "Contenu complet de l'actualité #1.", auteur: "Admin" },
  { id: 2, titre: "Actualité #2", date: "15 juin 2026", statut: "Archivé",   image: "votre-image.jpg", contenu: "Contenu complet de l'actualité #2.", auteur: "Admin" },
  { id: 3, titre: "Actualité #3", date: "10 juin 2026", statut: "Publié",    image: "votre-image.jpg", contenu: "Contenu complet de l'actualité #3.", auteur: "Admin" },
];

const statutClasses = {
  "Publié":    "text-teal-700 bg-teal-50 border border-teal-200",
  "Brouillon": "text-amber-700 bg-amber-50 border border-amber-200",
  "Archivé":   "text-gray-500 bg-gray-100 border border-gray-300",
};

// ===== HELPERS MODALES =====
function ouvrirModale(id) {
  const m = document.getElementById(id);
  m.classList.remove("hidden");
  m.classList.add("flex");
  document.body.style.overflow = "hidden";
}

function fermerModale(id) {
  const m = document.getElementById(id);
  m.classList.add("hidden");
  m.classList.remove("flex");
  document.body.style.overflow = "";
}

function bindFermer(backdropId, closeId, fermerId, modalId) {
  document.getElementById(backdropId)?.addEventListener("click", () => fermerModale(modalId));
  document.getElementById(closeId)?.addEventListener("click",   () => fermerModale(modalId));
  document.getElementById(fermerId)?.addEventListener("click",  () => fermerModale(modalId));
}

// ===== MODALE DETAIL ACTUALITE =====
let actuIdCourant = null;

function ouvrirModalActu(id) {
  const actu = actualites.find(a => a.id === id);
  if (!actu) return;
  actuIdCourant = id;

  document.getElementById("modal-actu-titre").textContent   = actu.titre;
  document.getElementById("modal-actu-date").textContent    = actu.date;
  document.getElementById("modal-actu-auteur").textContent  = actu.auteur;
  document.getElementById("modal-actu-contenu").textContent = actu.contenu;
  document.getElementById("modal-actu-image").src           = actu.image;

  const badge = document.getElementById("modal-actu-statut");
  badge.textContent = actu.statut;
  badge.className   = `text-[11px] font-medium px-3 py-0.5 rounded-full ${statutClasses[actu.statut] ?? ""}`;

  ouvrirModale("modal-actualite");
}

// ===== MODALE MODIFIER =====
function ouvrirModalModifier(id) {
  const actu = actualites.find(a => a.id === id);
  if (!actu) return;

  document.getElementById("modifier-titre").value   = actu.titre;
  document.getElementById("modifier-statut").value  = actu.statut;
  document.getElementById("modifier-contenu").value = actu.contenu;
  document.getElementById("modifier-auteur").value  = actu.auteur;
  document.getElementById("modifier-erreur").classList.add("hidden");
  ouvrirModale("modal-modifier");
}

function validerModifier() {
  const titre   = document.getElementById("modifier-titre").value.trim();
  const statut  = document.getElementById("modifier-statut").value;
  const contenu = document.getElementById("modifier-contenu").value.trim();
  const auteur  = document.getElementById("modifier-auteur").value.trim();

  if (!titre || !contenu || !auteur) {
    document.getElementById("modifier-erreur").classList.remove("hidden");
    return;
  }

  const actu = actualites.find(a => a.id === actuIdCourant);
  if (!actu) return;

  actu.titre   = titre;
  actu.statut  = statut;
  actu.contenu = contenu;
  actu.auteur  = auteur;

  // Mettre à jour la card dans la grille
  const btn = document.querySelector(`[data-actu-id="${actuIdCourant}"]`);
  if (btn) {
    const card = btn.closest(".rounded-3xl");
    if (card) {
      card.querySelector("h2").textContent = titre;
      card.querySelector(".extrait-contenu").textContent = contenu;
      card.querySelector(".extrait-auteur").textContent = "Par " + auteur;
      const badgeStatut = card.querySelector(".badge-statut");
      badgeStatut.textContent = statut;
      badgeStatut.className = `badge-statut text-[11px] px-2 py-0.5 rounded-full ${statutClasses[statut] ?? ""}`;
    }
  }

  fermerModale("modal-modifier");
  fermerModale("modal-actualite");
}

// ===== CREER UNE CARD =====
function ajouterCard(actu) {
  const grille = document.getElementById("actu-grid");
  const card = document.createElement("div");
  card.className = "bg-gray-200 rounded-3xl p-5 border border-black/[0.08] flex flex-col gap-4 hover:-translate-y-1 transition-transform duration-200";
  card.innerHTML = `
    <div class="flex items-center justify-between">
      <span class="inline-flex items-center gap-1.5 bg-teal-600 text-white text-[11px] font-medium px-3 py-1 rounded-full uppercase tracking-wide">
        <i class="ti ti-news" style="font-size:12px" aria-hidden="true"></i>
        Actualité
      </span>
      <span class="text-xs text-gray-500">${actu.date}</span>
    </div>
    <h2 class="text-lg font-semibold text-teal-700 leading-snug">${actu.titre}</h2>
    <div class="flex gap-3 items-start">
      <p class="extrait-contenu flex-1 text-sm text-gray-600 leading-relaxed line-clamp-3">${actu.contenu}</p>
      <div class="w-[100px] h-[80px] rounded-xl overflow-hidden flex-shrink-0 bg-gray-400">
        <img src="${actu.image}" alt="Actualité" class="w-full h-full object-cover" />
      </div>
    </div>
    <div class="border-t border-black/10 pt-3 flex items-center justify-between">
      <div class="flex flex-col gap-0.5">
        <span class="badge-statut text-[11px] px-2 py-0.5 rounded-full ${statutClasses[actu.statut] ?? ""}">${actu.statut}</span>
        <span class="extrait-auteur text-[11px] text-gray-400">Par ${actu.auteur}</span>
      </div>
      <button data-actu-id="${actu.id}" class="inline-flex items-center gap-1 text-xs font-medium text-teal-700 border border-teal-700 rounded-full px-3 py-1 hover:bg-teal-50 transition-colors">
        + d'informations
      </button>
    </div>
  `;

  card.querySelector("[data-actu-id]").addEventListener("click", () => ouvrirModalActu(actu.id));
  grille.appendChild(card);
}

// ===== MODALE CREER UN ARTICLE =====
function ouvrirModalCreer() {
  ["creer-titre", "creer-date", "creer-contenu", "creer-auteur"].forEach(id => {
    document.getElementById(id).value = "";
  });
  document.getElementById("creer-statut").value = "Publié";
  document.getElementById("creer-erreur").classList.add("hidden");
  ouvrirModale("modal-creer");
}

function validerCreer() {
  const titre   = document.getElementById("creer-titre").value.trim();
  const date    = document.getElementById("creer-date").value;
  const statut  = document.getElementById("creer-statut").value;
  const contenu = document.getElementById("creer-contenu").value.trim();
  const auteur  = document.getElementById("creer-auteur").value.trim();

  if (!titre || !date || !contenu || !auteur) {
    document.getElementById("creer-erreur").classList.remove("hidden");
    return;
  }

  const dateFr = new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const nouvelId = actualites.length;
  actualites.push({ id: nouvelId, titre, date: dateFr, statut, image: "votre-image.jpg", contenu, auteur });

  ajouterCard({ id: nouvelId, titre, date: dateFr, statut, image: "votre-image.jpg", contenu, auteur });
  fermerModale("modal-creer");
}

// ===== MODALE RECHERCHER =====
function ouvrirModalRechercher() {
  document.getElementById("rechercher-input").value = "";
  document.getElementById("rechercher-resultats").innerHTML = "<p class='text-sm text-gray-400'>Tapez pour rechercher...</p>";
  ouvrirModale("modal-rechercher");
  setTimeout(() => document.getElementById("rechercher-input").focus(), 100);
}

function rechercherActus(query) {
  const resultats = document.getElementById("rechercher-resultats");
  if (!query) {
    resultats.innerHTML = "<p class='text-sm text-gray-400'>Tapez pour rechercher...</p>";
    return;
  }

  const found = actualites.filter(a =>
    a.titre.toLowerCase().includes(query.toLowerCase()) ||
    a.contenu.toLowerCase().includes(query.toLowerCase()) ||
    a.auteur.toLowerCase().includes(query.toLowerCase())
  );

  if (found.length === 0) {
    resultats.innerHTML = "<p class='text-sm text-gray-400'>Aucun résultat trouvé.</p>";
    return;
  }

  resultats.innerHTML = found.map(a => `
    <div class="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors" data-result-id="${a.id}">
      <div>
        <p class="text-sm font-medium text-teal-700">${a.titre}</p>
        <p class="text-xs text-gray-400">${a.date} · ${a.auteur}</p>
      </div>
      <span class="text-[11px] font-medium px-2 py-0.5 rounded-full ${statutClasses[a.statut] ?? ""}">${a.statut}</span>
    </div>
  `).join("");

  resultats.querySelectorAll("[data-result-id]").forEach(el => {
    el.addEventListener("click", () => {
      fermerModale("modal-rechercher");
      ouvrirModalActu(Number(el.dataset.resultId));
    });
  });
}

// ===== INIT =====
document.addEventListener("DOMContentLoaded", () => {

  // Générer toutes les cards depuis les données
  actualites.forEach(actu => ajouterCard(actu));

  // Modale detail
  bindFermer("modal-actu-backdrop", "modal-actu-close", "modal-actu-fermer", "modal-actualite");

  // Bouton Modifier
  document.getElementById("modal-actu-modifier")?.addEventListener("click", () => {
    fermerModale("modal-actualite");
    ouvrirModalModifier(actuIdCourant);
  });

  // Modale modifier
  bindFermer("modal-modifier-backdrop", "modal-modifier-close", "modal-modifier-fermer", "modal-modifier");
  document.getElementById("modal-modifier-valider")?.addEventListener("click", validerModifier);

  // Bouton "Créer un article"
  document.getElementById("btn-creer")?.addEventListener("click", ouvrirModalCreer);
  bindFermer("modal-creer-backdrop", "modal-creer-close", "modal-creer-fermer", "modal-creer");
  document.getElementById("modal-creer-valider")?.addEventListener("click", validerCreer);

  // Bouton "Rechercher"
  document.getElementById("btn-rechercher")?.addEventListener("click", ouvrirModalRechercher);
  bindFermer("modal-rechercher-backdrop", "modal-rechercher-close", "modal-rechercher-fermer", "modal-rechercher");
  document.getElementById("rechercher-input")?.addEventListener("input", e => rechercherActus(e.target.value));
});