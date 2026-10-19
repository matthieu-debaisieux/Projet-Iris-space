import { useState } from 'react';
import DataState from '@/components/ui/DataState.jsx';
import { useAsync } from '@/hooks/useAsync.js';
import { getActualitesPubliees } from '@/services/actualites.js';
import { getEmploiDuJour, getRaccourcis } from '@/services/eleve.js';

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
  const emploi = useAsync(() => getEmploiDuJour(date), [date]);
  const raccourcis = useAsync(getRaccourcis);
  const actualites = useAsync(getActualitesPubliees);

  const shiftDay = n => setDate(d => {
    const next = new Date(d);
    next.setDate(next.getDate() + n);
    return next;
  });

  return (
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
            <DataState state={emploi}>{creneaux => (
              <table className="w-full border-collapse text-xs">
                <tbody>
                  {creneaux.map(c => (
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
            )}</DataState>
          </div>
        </div>

        {/* raccourcis */}
        <div className="w-full xl:w-72 shrink-0 flex flex-col gap-6">
          <DataState state={raccourcis}>{blocs => blocs.map(bloc => (
            <div key={bloc.titre}>
              <h2 className="text-lg font-bold text-[var(--color-titre)] text-center mb-2">{bloc.titre}</h2>
              <div className="bg-[var(--color-background)] rounded-lg p-3 flex flex-col text-xs text-gray-700 divide-y divide-gray-400">
                {bloc.lignes.map((ligne, i) => (
                  <p key={i} className="py-1.5">
                    {ligne.label && <><span className="font-semibold">{ligne.label}</span> — </>}
                    {ligne.texte}
                  </p>
                ))}
              </div>
            </div>
          ))}</DataState>
        </div>

        {/* actualité */}
        <div className="flex-1 w-full min-w-0">
          <h2 className="text-xl font-bold text-[var(--color-titre)] text-center mb-3">Actualité</h2>
          <div className="bg-[var(--color-background)] rounded-lg h-[420px] p-4 flex flex-col text-sm text-gray-700 overflow-y-auto divide-y divide-gray-400">
            <DataState state={actualites}>{liste => liste.map(actu => (
              <div key={actu.id} className="py-4 first:pt-0 last:pb-0">
                <p className="font-semibold text-[var(--color-titre)]">{actu.titre}</p>
                <p className="text-xs text-gray-500 mb-1">Publié le {actu.date}</p>
                <p>{actu.contenu}</p>
              </div>
            ))}</DataState>
          </div>
        </div>
      </div>
    </div>
  );
}
