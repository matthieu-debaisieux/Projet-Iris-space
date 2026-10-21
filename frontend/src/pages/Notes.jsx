import { useMemo, useState } from 'react';
import DataState from '@/components/ui/DataState.jsx';
import { useAsync } from '@/hooks/useAsync.js';
import { getNotes } from '@/services/eleve.js';

// ── Helpers ─────────────────────────────────────────────────────────────────
const moyenne = valeurs => valeurs.reduce((s, v) => s + v, 0) / valeurs.length;

// 12.6666 → "12,7" ; 14 → "14" ; 11.55 → "11,6" (le epsilon évite 11,5 dû aux flottants)
const fmt = n => (Math.round(n * 10 + 1e-9) / 10).toLocaleString('fr-FR', { maximumFractionDigits: 1 });

// Appréciation par défaut si le back n'en renvoie pas
function appreciationAuto(note) {
  if (note >= 16) return 'Excellent travail';
  if (note >= 14) return 'Très bien';
  if (note >= 12) return 'Bien';
  if (note >= 10) return 'Assez bien';
  return 'Insuffisant';
}

const libelleFiltre = n => n.court ?? n.matiere;

// ── Page ────────────────────────────────────────────────────────────────────
export default function Notes() {
  const notes = useAsync(getNotes);

  return (
    <div className="flex-1 overflow-y-auto bg-[#F7F8FC] px-4 py-6 md:px-10 md:py-10">
      <div className="w-full max-w-5xl mx-auto flex flex-col gap-6">
        <DataState state={notes}>{liste => <Contenu liste={liste} />}</DataState>
      </div>
    </div>
  );
}

function Contenu({ liste }) {
  const [filtre, setFiltre] = useState(null); // id de la matière, null = toutes

  const maMoyenne = liste.length ? moyenne(liste.map(n => n.note)) : null;
  const moyenneClasse = liste.length ? moyenne(liste.map(n => n.moyenneClasse)) : null;

  const visibles = useMemo(
    () => (filtre === null ? liste : liste.filter(n => n.id === filtre)),
    [liste, filtre],
  );

  return (
    <>
      {/* Titre + moyennes */}
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-3xl font-bold text-[var(--color-principal)]">Mes notes</h1>
        {maMoyenne !== null && (
          <div className="flex gap-3 shrink-0">
            <CarteMoyenne titre="Ma moyenne" valeur={fmt(maMoyenne)} />
            <CarteMoyenne titre="Moyenne de la classe" valeur={fmt(moyenneClasse)} />
          </div>
        )}
      </div>

      {liste.length === 0 ? (
        <p className="bg-white border border-gray-200 rounded-2xl text-gray-500 text-center py-10">
          Aucune note pour le moment.
        </p>
      ) : (
        <>
          {/* Filtres par matière */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap" role="group" aria-label="Filtrer par matière">
            <Pastille actif={filtre === null} onClick={() => setFiltre(null)}>Toutes</Pastille>
            {liste.map(n => (
              <Pastille key={n.id} actif={filtre === n.id} onClick={() => setFiltre(n.id)}>
                {libelleFiltre(n)}
              </Pastille>
            ))}
          </div>

          {/* Desktop : tableau */}
          <div className="hidden md:block bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#EEF1F8] text-gray-500 text-left">
                  <th className="font-medium px-4 py-3 rounded-l-lg">Matière</th>
                  <th className="font-medium px-4 py-3">Note /20</th>
                  <th className="font-medium px-4 py-3">Moyenne classe</th>
                  <th className="font-medium px-4 py-3 rounded-r-lg">Appréciation</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map(n => (
                  <tr key={n.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-4 font-semibold text-gray-900">{n.matiere}</td>
                    <td className="px-4 py-4 font-bold text-[var(--color-principal)]">{fmt(n.note)}</td>
                    <td className="px-4 py-4 text-gray-500">{fmt(n.moyenneClasse)}</td>
                    <td className="px-4 py-4 text-gray-700">{n.appreciation ?? appreciationAuto(n.note)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile : liste de cartes */}
          <ul className="md:hidden flex flex-col gap-3">
            {visibles.map(n => (
              <li key={n.id} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{n.matiere}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {n.appreciation ?? appreciationAuto(n.note)} · Classe {fmt(n.moyenneClasse)}
                  </p>
                </div>
                <span
                  className="shrink-0 min-w-11 text-center rounded-lg bg-[var(--color-principal)] text-white font-bold px-2 py-2"
                  aria-label={`Note : ${fmt(n.note)} sur 20`}
                >
                  {fmt(n.note)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

// ── Petits composants ───────────────────────────────────────────────────────
function CarteMoyenne({ titre, valeur }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 min-w-28 shadow-sm">
      <p className="text-[11px] text-gray-500 leading-tight">{titre}</p>
      <p className="text-2xl font-bold text-[var(--color-principal)] mt-1">{valeur}</p>
    </div>
  );
}

function Pastille({ actif, onClick, children }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={actif}
      className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition ${
        actif
          ? 'bg-[var(--color-principal)] border-[var(--color-principal)] text-white'
          : 'bg-white border-gray-200 text-gray-800 hover:border-[var(--color-principal)]'
      }`}
    >
      {children}
    </button>
  );
}
