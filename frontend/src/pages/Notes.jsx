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
