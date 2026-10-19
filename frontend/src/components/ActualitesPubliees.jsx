import { useCallback, useState } from 'react';
import DataState from '@/components/ui/DataState.jsx';
import { useAsync } from '@/hooks/useAsync.js';
import { useEscape } from '@/hooks/useEscape.js';
import { getActualitesPubliees } from '@/services/actualites.js';

// ── Grille des actualités publiées (lecture seule : visiteur / élève) ───────
export default function ActualitesPubliees({ className = '' }) {
  const [selected, setSelected] = useState(null);
  const close = useCallback(() => setSelected(null), []);
  useEscape(close, selected !== null);

  const actualites = useAsync(getActualitesPubliees);

  return (
    <>
      <DataState state={actualites}>{publies => (
        <div className={`grid grid-cols-1 lg:grid-cols-3 gap-30 max-w-screen-xl mx-auto ${className}`}>
          {publies.length === 0 ? (
            <p className="col-span-full text-gray-400 text-lg text-center py-10">Aucune actualité publiée pour le moment.</p>
          ) : (
            publies.map(actu => (
              <div
                key={actu.id}
                className="max-w-md bg-gray-200 rounded-3xl p-5 border border-black/[0.08] flex flex-col gap-4 hover:-translate-y-1 transition-transform duration-200"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 bg-teal-600 text-white text-[11px] font-medium px-3 py-1 rounded-full uppercase tracking-wide">
                    Actualité
                  </span>
                  <span className="text-xs text-gray-500">{actu.date}</span>
                </div>
                <h2 className="text-lg font-semibold text-teal-700 leading-snug">{actu.titre}</h2>
                <div className="flex gap-3 items-start">
                  <p className="flex-1 text-sm text-gray-600 leading-relaxed line-clamp-3">{actu.contenu}</p>
                  <div className="w-[100px] h-[80px] rounded-xl overflow-hidden flex-shrink-0 bg-gray-400">
                    <img src={actu.image || undefined} alt="Actualité" className="w-full h-full object-cover" />
                  </div>
                </div>
                <div className="border-t border-black/10 pt-3 flex items-center justify-between">
                  <span className="text-[11px] text-gray-400">Par {actu.auteur}</span>
                  <button
                    onClick={() => setSelected(actu)}
                    className="border border-teal-600 text-teal-600 text-sm font-medium rounded-full px-4 py-1.5 hover:bg-teal-600 hover:text-white transition-colors duration-200 cursor-pointer"
                  >
                    + d'informations
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}</DataState>

      <ActuModal actu={selected} onClose={close} />
    </>
  );
}

// ── Pop-up de détail (fondu + glissement) ──────────────────────────────────
function ActuModal({ actu, onClose }) {
  // On garde le dernier contenu affiché pendant l'animation de fermeture
  const [shown, setShown] = useState(actu);
  if (actu && actu !== shown) setShown(actu);
  const open = actu !== null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Détail de l'actualité"
      className={`fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 transition-opacity duration-250 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className={`bg-white rounded-3xl max-w-[520px] w-full p-7 flex flex-col gap-4 max-h-[90vh] overflow-y-auto transition-transform duration-250 ${open ? 'translate-y-0' : 'translate-y-6'}`}
      >
        <div className="flex justify-between items-start gap-4">
          <h2 className="text-xl font-bold text-teal-700 leading-tight m-0">{shown?.titre}</h2>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="text-[1.75rem] leading-none text-gray-400 hover:text-gray-700 transition-colors shrink-0 px-1 rounded-md cursor-pointer"
          >
            ×
          </button>
        </div>

        <img src={shown?.image || undefined} alt="Image de l'actualité" className="w-full h-[200px] rounded-2xl object-cover bg-gray-300" />

        <div className="flex gap-2 items-center flex-wrap">
          <span className="inline-flex items-center bg-teal-600 text-white text-[11px] font-semibold px-3 py-[3px] rounded-full uppercase tracking-wider">
            Actualité
          </span>
          <span className="text-xs text-gray-500">{shown && `${shown.date} — Par ${shown.auteur}`}</span>
        </div>

        <p className="text-[15px] text-gray-700 leading-7 m-0">{shown?.contenu}</p>

        <p className="text-xs text-gray-400 border-t border-gray-100 pt-3 m-0">{shown && `Publié le ${shown.date}`}</p>
      </div>
    </div>
  );
}
