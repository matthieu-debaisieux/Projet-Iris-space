const STORAGE_KEY = "iris_actualites";

/* ---- Fonctions modal ---- */
function openActuModal(actu) {
    document.getElementById("modal-titre").textContent = actu.titre;
    document.getElementById("modal-img").src = actu.image;
    document.getElementById("modal-meta").textContent =
    actu.date + " — Par " + actu.auteur;
    document.getElementById("modal-contenu").textContent = actu.contenu;
    document.getElementById("modal-date").textContent =
        "Publié le " + actu.date;

    const modal = document.getElementById("actu-modal");
    modal.style.opacity = "1";
    modal.style.pointerEvents = "all";
    document.getElementById("actu-modal-box").style.transform =
        "translateY(0)";
    document.body.style.overflow = "hidden";
    }

    function closeActuModal() {
        const modal = document.getElementById("actu-modal");
        modal.style.opacity = "0";
        modal.style.pointerEvents = "none";
        document.getElementById("actu-modal-box").style.transform =
          "translateY(24px)";
        document.body.style.overflow = "";
    }

    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") closeActuModal();
    });

      /* ---- Génération des cartes ---- */
    document.addEventListener("DOMContentLoaded", () => {
        const grille = document.getElementById("actu-grid");
        const saved = localStorage.getItem(STORAGE_KEY);
        const actualites = saved ? JSON.parse(saved) : [];

        const publies = actualites.filter((a) => a.statut === "Publié");

        if (publies.length === 0) {
            grille.innerHTML = `<p class="col-span-full text-gray-400 text-lg text-center py-10">Aucune actualité publiée pour le moment.</p>`;
          return;
        }

        publies.forEach((actu) => {
        const card = document.createElement("div");
        card.className =
            "max-w-md bg-gray-200 rounded-3xl p-5 border border-black/[0.08] flex flex-col gap-4 hover:-translate-y-1 transition-transform duration-200";

          /* On sérialise l'objet actu pour le passer au onclick */
        const actuJson = JSON.stringify(actu).replace(/'/g, "\\'");

          card.innerHTML = `
                <div class="flex items-center justify-between">
                <span class="inline-flex items-center gap-1.5 bg-teal-600 text-white text-[11px] font-medium px-3 py-1 rounded-full uppercase tracking-wide">
                    Actualité
                </span>
                <span class="text-xs text-gray-500">${actu.date}</span>
                </div>
                <h2 class="text-lg font-semibold text-teal-700 leading-snug">${actu.titre}</h2>
                <div class="flex gap-3 items-start">
                <p class="flex-1 text-sm text-gray-600 leading-relaxed line-clamp-3">${actu.contenu}</p>
                <div class="w-[100px] h-[80px] rounded-xl overflow-hidden flex-shrink-0 bg-gray-400">
                    <img src="${actu.image}" alt="Actualité" class="w-full h-full object-cover" />
                </div>
                </div>
                <div class="border-t border-black/10 pt-3 flex items-center justify-between">
                <span class="text-[11px] text-gray-400">Par ${actu.auteur}</span>
                <button
                    onclick='openActuModal(${JSON.stringify(actu)})'
                    class="border border-teal-600 text-teal-600 text-sm font-medium rounded-full px-4 py-1.5 hover:bg-teal-600 hover:text-white transition-colors duration-200 cursor-pointer"
                >+ d'informations</button>
                </div>
            `;
            grille.appendChild(card);
        });
    });