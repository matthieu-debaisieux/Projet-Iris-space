import { useState } from 'react';
import EleveLayout from '../../layouts/EleveLayout.jsx';

// ── Données de démonstration ────────────────────────────────────────────────
// matiere absente → créneau vide ; `pause` → libellé en italique
const EMPLOI_DU_JOUR = [
  { heure: '08h00', matiere: 'Mathématiques', salle: 'Salle 204' },
  { heure: '09h00', matiere: 'Mathématiques', salle: 'Salle 204' },
  { heure: '10h00', matiere: 'Français', salle: 'Salle 108' },
  { heure: '11h00', matiere: 'Français', salle: 'Salle 108' },
  { heure: '12h00', pause: 'Pause déjeuner' },
  { heure: '13h00', matiere: 'Histoire-Géo', salle: 'Salle 112' },
  { heure: '14h00', matiere: 'SVT', salle: 'Labo 2' },
  { heure: '15h00', matiere: 'Anglais', salle: 'Salle 305' },
  { heure: '16h00', matiere: 'EPS', salle: 'Gymnase' },
  { heure: '17h00' },
  { heure: '18h00', matiere: 'Permanence', salle: 'Salle 401' },
  { heure: '19h00' },
  { heure: '20h00' },
];

const RACCOURCIS = [
  {
    titre: 'Travail à faire',
    lignes: [
      <><span className="font-semibold">Maths</span> — Exercices 12 à 15 p.42</>,
      <><span className="font-semibold">Histoire</span> — Fiche de révision Ch.3</>,
      <><span className="font-semibold">Anglais</span> — Préparer l'oral</>,
    ],
  },
  {
    titre: 'Dernières ressources',
    lignes: ['📄 Cours_SVT_chap4.pdf', '📄 Diaporama_Physique.pptx', '🔗 Lien vidéo — Révisions Bac'],
  },
  {
    titre: 'Vie Scolaire',
    lignes: ['✅ Retard justifié — 28/06', '⚠️ Absence non justifiée — 24/06', 'Ponctualité : 96%'],
  },
  {
    titre: 'Dernières notes',
    lignes: [
      <><span className="font-semibold">Maths</span> — 16/20</>,
      <><span className="font-semibold">Français</span> — 13/20</>,
      <><span className="font-semibold">SVT</span> — 15,5/20</>,
    ],
  },
];

const ACTUALITES = [
  {
    titre: 'Sortie pédagogique au musée — 15 septembre',
    date: '28/06/2028',
    texte: 'Les élèves de seconde participeront à une sortie au musée des sciences. Autorisation à retourner avant le 10 septembre.',
  },
  { titre: 'Réunion parents-professeurs', date: '25/06/2028', texte: 'La réunion aura lieu le 20 septembre à 18h en salle polyvalente.' },
  { titre: 'Fermeture exceptionnelle', date: '20/06/2028', texte: "L'établissement sera fermé le 1er septembre pour travaux de maintenance." },
];

// "jeudi 09 septembre 2028" → "Jeudi 09 Septembre 2028"
function formatDate(date) {
  return date
    .toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
    .replace(/(^|\s)\p{L}/gu, c => c.toUpperCase());
}

const ChevronButton = ({ direction, label, onClick }) => (
  <button
    onClick={onClick}
    className="w-9 h-9 rounded-full bg-[var(--color-secondaire)] text-white flex items-center justify-center hover:opacity-90 transition"
    aria-label={label}
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
      <path d={direction === 'prev' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </button>
);

export default function Accueil() {
  const [date, setDate] = useState(() => new Date());

  const shiftDay = n => setDate(d => {
    const next = new Date(d);
    next.setDate(next.getDate() + n);
    return next;
  });

  return (
    <EleveLayout>
      <div className="flex-1 overflow-y-auto p-6 bg-[var(--color-page)]">
        {/* navigation de date */}
        <div className="flex items-center gap-4 mb-8">
          <ChevronButton direction="prev" label="Jour précédent" onClick={() => shiftDay(-1)} />
          <div className="border border-gray-300 rounded-full px-6 py-2 text-sm font-medium text-[var(--color-titre)]">
            {formatDate(date)}
          </div>
          <ChevronButton direction="next" label="Jour suivant" onClick={() => shiftDay(1)} />
        </div>

        {/* grille : emploi du temps / raccourcis / actualité */}
        <div className="flex flex-col xl:flex-row gap-8 items-start">
          {/* emploi du temps du jour */}
          <div className="w-full xl:w-72 shrink-0">
            <div className="border border-gray-300 rounded-md overflow-hidden">
              <table className="w-full border-collapse text-xs">
                <tbody>
                  {EMPLOI_DU_JOUR.map(c => (
                    <tr key={c.heure}>
                      <td className="border border-gray-500 align-top px-2 py-3 w-16 text-gray-600 font-medium">{c.heure}</td>
                      <td className="border border-gray-500 bg-[var(--color-background)] h-16 px-2 py-1">
                        {c.matiere && (
                          <>
                            <p className="text-xs font-semibold text-[var(--color-titre)] leading-tight mt-1">{c.matiere}</p>
                            <p className="text-[11px] text-gray-500 leading-tight">{c.salle}</p>
                          </>
                        )}
                        {c.pause && <p className="text-xs italic text-gray-500 text-center mt-3">{c.pause}</p>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* raccourcis */}
          <div className="w-full xl:w-72 shrink-0 flex flex-col gap-6">
            {RACCOURCIS.map(bloc => (
              <div key={bloc.titre}>
                <h2 className="text-lg font-bold text-[var(--color-titre)] text-center mb-2">{bloc.titre}</h2>
                <div className="bg-[var(--color-background)] rounded-lg p-3 flex flex-col text-xs text-gray-700 divide-y divide-gray-400">
                  {bloc.lignes.map((ligne, i) => <p key={i} className="py-1.5">{ligne}</p>)}
                </div>
              </div>
            ))}
          </div>

          {/* actualité */}
          <div className="flex-1 w-full min-w-0">
            <h2 className="text-xl font-bold text-[var(--color-titre)] text-center mb-3">Actualité</h2>
            <div className="bg-[var(--color-background)] rounded-lg h-[420px] p-4 flex flex-col text-sm text-gray-700 overflow-y-auto divide-y divide-gray-400">
              {ACTUALITES.map(actu => (
                <div key={actu.titre} className="py-4 first:pt-0 last:pb-0">
                  <p className="font-semibold text-[var(--color-titre)]">{actu.titre}</p>
                  <p className="text-xs text-gray-500 mb-1">Publié le {actu.date}</p>
                  <p>{actu.texte}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </EleveLayout>
  );
}
