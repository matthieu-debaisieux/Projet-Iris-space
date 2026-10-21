import { useState } from 'react';
import DataState from '@/components/ui/DataState.jsx';
import Modal from '@/components/ui/Modal.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { useAsync } from '@/hooks/useAsync.js';
import { getAbsences, STATUT_ABSENCE_LABEL } from '@/services/absences.js';
import { getActualitesPubliees } from '@/services/actualites.js';
import { getEmploiDuJour, getRaccourcis } from '@/services/eleve.js';
import { getCoursDuJour } from '@/services/planning.js';

const th = 'border border-gray-400 px-3 py-3 text-center font-semibold bg-[var(--color-background)]';
const td = 'border border-gray-400 px-3 py-2 text-center';
const h2 = 'text-xl font-bold text-[var(--color-titre)] text-center mb-3';

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

// ── Page ────────────────────────────────────────────────────────────────────
// Chaque bloc n'est affiché que si l'utilisateur a le droit correspondant.
export default function Accueil() {
  const { can } = useAuth();

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-[var(--color-page)] flex flex-col gap-10">
      {can('tableau_de_bord') && <SuiviDuJour />}

      <div className="flex flex-col xl:flex-row gap-8 items-start">
        {can('journee') && <MaJournee />}
        {can('actualites') && <DernieresActualites />}
      </div>
    </div>
  );
}

// ── Absences + cours du jour (établissement) ────────────────────────────────
function SuiviDuJour() {
  const absences = useAsync(getAbsences);
  const cours = useAsync(getCoursDuJour);
  const [contact, setContact] = useState(null);

  return (
    <div className="flex flex-col 2xl:flex-row gap-8">
      {/* Absences aujourd'hui */}
      <div className="flex-1 min-w-0">
        <h2 className={h2}>Absences aujourd'hui</h2>
        <div className="bg-[var(--color-background)] overflow-hidden">
          <DataState state={absences}>{rows => (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className={th}>Elèves</th>
                  <th className={th}>Classes</th>
                  <th className={th}>Heure</th>
                  <th className={th}>Justifié?</th>
                  <th className={th}>Contact</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id} className="hover:bg-gray-100">
                    <td className={td}>{row.eleve}</td>
                    <td className={td}>{row.classe}</td>
                    <td className={td}>{row.heureDebut} – {row.heureFin}</td>
                    <td className={td}>{STATUT_ABSENCE_LABEL[row.statut] ?? row.statut}</td>
                    <td className={td}>
                      <button
                        onClick={() => setContact(row)}
                        className="bg-(--color-secondaire) btn btn-sm text-white text-xs px-3 py-1 rounded-lg hover:opacity-80 transition"
                      >
                        Contact
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}</DataState>
        </div>
      </div>

      {/* Cours aujourd'hui */}
      <div className="flex-1 min-w-0">
        <h2 className={h2}>Cours Aujourd'hui</h2>
        <div className="bg-[var(--color-background)] overflow-hidden">
          <DataState state={cours}>{rows => (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className={`${th} px-2 w-14`}>Heure</th>
                  <th className={th}>Salle/Classe</th>
                  <th className={th}>Salle/Classe</th>
                  <th className={th}>Salle/Classe</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-100">
                    <td className="border border-gray-400 px-2 py-2 text-center text-xs font-semibold">{row.heureDebut}</td>
                    <td className={td}>{row.salle1 ?? ''}</td>
                    <td className={td}>{row.salle2 ?? ''}</td>
                    <td className={td}>{row.salle3 ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}</DataState>
        </div>
      </div>

      {/* Modale coordonnées contact */}
      {contact && (
        <Modal onClose={() => setContact(null)} className="max-w-sm rounded-lg p-8" label="Coordonnées du contact">
          <button onClick={() => setContact(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold leading-none">
            ✕
          </button>
          <h3 className="text-lg font-bold text-[var(--color-titre)] mb-6">Coordonnées du contact</h3>
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Élève</p>
              <p className="font-semibold text-gray-800 text-base">{contact.eleve}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Téléphone</p>
              <a
                href={contact.tel ? `tel:${contact.tel.replace(/\s/g, '')}` : '#'}
                className="font-medium text-[var(--color-secondaire)] hover:underline text-base"
              >
                {contact.tel ?? 'Non renseigné'}
              </a>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Email</p>
              <a
                href={contact.email ? `mailto:${contact.email}` : '#'}
                className="font-medium text-[var(--color-secondaire)] hover:underline text-base break-all"
              >
                {contact.email ?? 'Non renseigné'}
              </a>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Emploi du temps du jour + raccourcis (utilisateur connecté) ─────────────
function MaJournee() {
  const [date, setDate] = useState(() => new Date());
  const emploi = useAsync(() => getEmploiDuJour(date), [date]);
  const raccourcis = useAsync(getRaccourcis);

  const shiftDay = n => setDate(d => {
    const next = new Date(d);
    next.setDate(next.getDate() + n);
    return next;
  });

  return (
    <div className="flex flex-col gap-8 shrink-0">
      {/* navigation de date */}
      <div className="flex items-center gap-4">
        <ChevronButton direction="prev" label="Jour précédent" onClick={() => shiftDay(-1)} />
        <div className="border border-gray-300 rounded-full px-6 py-2 text-sm font-medium text-[var(--color-titre)]">
          {formatDate(date)}
        </div>
        <ChevronButton direction="next" label="Jour suivant" onClick={() => shiftDay(1)} />
      </div>

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
      </div>
    </div>
  );
}

// ── Dernières actualités publiées ───────────────────────────────────────────
function DernieresActualites() {
  const actualites = useAsync(getActualitesPubliees);

  return (
    <div className="flex-1 w-full min-w-0">
      <h2 className={h2}>Actualité</h2>
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
  );
}
