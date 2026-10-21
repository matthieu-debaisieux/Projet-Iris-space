import { useMemo, useState } from 'react';
import DataState from '@/components/ui/DataState.jsx';
import { useAsync } from '@/hooks/useAsync.js';
import { getNotes } from '@/services/eleve.js';

// Lignes renvoyées par getNotes() : { id, note, matiere, prof, date }
// Champs optionnels, affichés seulement s'ils existent : moyenneClasse, appreciation

const card = 'bg-white rounded-2xl border border-[#E1E5EE] shadow-[0_1px_2px_rgba(0,18,87,0.04)]';
const th = 'bg-[#EEF1F7] px-4 py-3 text-left text-xs font-medium text-[#6B7185] first:rounded-l-lg last:rounded-r-lg';
const td = 'px-4 py-3.5 border-b border-[#E1E5EE]';

const valeur = n => parseFloat(String(n).replace(',', '.'));
const fmt = n => n.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const moyenne = (rows, key) => {
  const v = rows.map(r => valeur(r[key])).filter(Number.isFinite);
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
};
// Recherche insensible à la casse et aux accents
const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const Stat = ({ label, value }) => (
  <div className={`${card} px-5 py-3 min-w-36`}>
    <p className="text-xs text-[#6B7185]">{label}</p>
    <p className="text-2xl font-bold text-[#001257]">{value}</p>
  </div>
);

const Chip = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
      active
        ? 'bg-[#001257] border-[#001257] text-white'
        : 'bg-white border-[#E1E5EE] text-[#001257] hover:bg-[#EEF1F7]'
    }`}
  >
    {children}
  </button>
);

export default function Notes() {
  const notes = useAsync(getNotes);

  return (
    <div className="flex-1 overflow-y-auto bg-[var(--color-page)]">
      <div className="mx-auto w-full max-w-[1200px] px-6 py-8">
        <DataState state={notes}>{liste => <Contenu liste={liste} />}</DataState>
      </div>
    </div>
  );
}

function Contenu({ liste }) {
  const [matiere, setMatiere] = useState('Toutes');
  const [recherche, setRecherche] = useState('');

  const matieres = useMemo(() => [...new Set(liste.map(n => n.matiere))], [liste]);
  const avecMoyClasse = liste.some(n => n.moyenneClasse != null);
  const avecAppreciation = liste.some(n => n.appreciation);

  const visibles = useMemo(() => {
    const q = norm(recherche.trim());
    return liste.filter(n =>
      (matiere === 'Toutes' || n.matiere === matiere) &&
      (!q || [n.matiere, n.prof, n.date].some(v => norm(v).includes(q)))
    );
  }, [liste, matiere, recherche]);

  // Moyennes calculées sur les notes affichées (elles suivent donc le filtre)
  const maMoy = moyenne(visibles, 'note');
  const moyClasse = avecMoyClasse ? moyenne(visibles, 'moyenneClasse') : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-bold text-[#001257]">Mes notes</h1>
        <div className="flex gap-3">
          <Stat label="Ma moyenne" value={maMoy == null ? '–' : fmt(maMoy)} />
          {avecMoyClasse && <Stat label="Moyenne de la classe" value={moyClasse == null ? '–' : fmt(moyClasse)} />}
        </div>
      </div>

      {/* Recherche + filtres par cours */}
      <div className="flex flex-col gap-3">
        <form role="search" onSubmit={e => e.preventDefault()} className="relative max-w-sm">
          <label htmlFor="recherche-notes" className="sr-only">Rechercher un cours ou un professeur</label>
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7185]" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            id="recherche-notes"
            type="search"
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
            placeholder="Rechercher un cours, un professeur…"
            className="w-full rounded-lg border border-[#E1E5EE] bg-white py-2.5 pl-9 pr-3 text-sm text-[#1A1D2E] placeholder:text-[#6B7185] focus:outline-none focus:border-[#001257] focus:ring-2 focus:ring-[#001257]/10"
          />
        </form>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer par cours">
          {['Toutes', ...matieres].map(m => (
            <Chip key={m} active={matiere === m} onClick={() => setMatiere(m)}>{m}</Chip>
          ))}
        </div>
      </div>

      {/* Tableau */}
      <div className={`${card} p-3 overflow-x-auto`}>
        <table className="w-full min-w-[560px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className={th}>Matière</th>
              <th className={th}>Note</th>
              {avecMoyClasse && <th className={th}>Moyenne classe</th>}
              <th className={th}>Professeur</th>
              <th className={th}>Date</th>
              {avecAppreciation && <th className={th}>Appréciation</th>}
            </tr>
          </thead>
          <tbody>
            {visibles.map(n => (
              <tr key={n.id} className="hover:bg-[#F7F8FB]">
                <td className={`${td} font-semibold text-[#001257]`}>{n.matiere}</td>
                <td className={`${td} font-bold text-[#001257]`}>{n.note}</td>
                {avecMoyClasse && <td className={`${td} text-[#6B7185]`}>{n.moyenneClasse}</td>}
                <td className={`${td} text-[#1A1D2E]`}>{n.prof}</td>
                <td className={`${td} text-[#6B7185]`}>{n.date}</td>
                {avecAppreciation && <td className={`${td} text-[#1A1D2E]`}>{n.appreciation}</td>}
              </tr>
            ))}
          </tbody>
        </table>
        {!visibles.length && (
          <p className="px-4 py-8 text-center text-sm text-[#6B7185]">Aucune note ne correspond à votre recherche.</p>
        )}
      </div>
    </div>
  );
}