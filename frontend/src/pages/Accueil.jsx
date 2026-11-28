import { useState } from 'react';
import DataState from '@/components/ui/DataState.jsx';
import Modal from '@/components/ui/Modal.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { useAsync } from '@/hooks/useAsync.js';
import { getAbsencesDuJour, STATUT_ABSENCE_LABEL } from '@/services/absences.js';
import { blocsAccueil } from '@/services/accueil.js';
import { dateActualite, getActualites } from '@/services/actualites.js';
import { getEmploiDuTemps } from '@/services/emploiDuTemps.js';
import { getCoursDuJour } from '@/services/planning.js';

// ── Styles partagés (maquette Figma « Accueil élève ») ──────────────────────
const card = 'bg-white rounded-2xl border border-[#E1E5EE] p-6 shadow-[0_1px_2px_rgba(0,18,87,0.04)]';
const cardTitle = 'text-base font-bold text-[#001257] mb-4';
const BARRES = ['bg-[#07A6A6]', 'bg-[#F8B005]', 'bg-[#EC6F6F]'];
const BADGES = {
  ok: 'bg-[#E3F5EC] text-[#1E7F55]',
  attente: 'bg-[#FFF3D6] text-[#8A5A00]',
  alerte: 'bg-[#FBE6E6] text-[#B23A3A]',
};

const Badge = ({ ton = 'attente', children }) => (
  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${BADGES[ton] ?? BADGES.attente}`}>
    {children}
  </span>
);

// "lundi 19 octobre 2026" → "Lundi 19 octobre 2026"
function formatDate(date) {
  const s = date.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const ChevronButton = ({ direction, label, onClick }) => (
  <button
    onClick={onClick}
    aria-label={label}
    className="w-8 h-8 rounded-full border border-[#E1E5EE] bg-white text-[#001257] flex items-center justify-center hover:bg-[#EEF1F7] transition"
  >
    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d={direction === 'prev' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </button>
);

// ── Page ────────────────────────────────────────────────────────────────────
// Chaque bloc n'est affiché que si l'utilisateur a le droit correspondant.
export default function Accueil() {
  const { can, user } = useAuth();
  const prenom = user?.prenom;
  const classe = user?.classe;

  return (
    <div className="flex-1 overflow-y-auto bg-[var(--color-page)]">
      <div className="mx-auto w-full max-w-[1200px] px-6 py-8 flex flex-col gap-6">
        <header>
          <h1 className="text-3xl font-bold text-[#001257]">{prenom ? `Bonjour ${prenom}` : 'Bonjour'}</h1>
          <p className="mt-1 text-sm text-[#6B7185]">
            {formatDate(new Date())}{classe ? ` · ${classe}` : ''}
          </p>
        </header>

        {can('tableau_de_bord') && <SuiviDuJour />}
        {can('journee') && <MaJournee />}
        {can('actualites') && <DernieresActualites />}
      </div>
    </div>
  );
}

// ── Emploi du temps du jour + raccourcis (utilisateur connecté) ─────────────
// Élève ou prof : le service choisit la route selon le rôle
function MaJournee() {
  const { can, user } = useAuth();
  const [date, setDate] = useState(() => new Date());
  const emploi = useAsync(() => getEmploiDuTemps(user, date, date), [user, date]);

  const shiftDay = n => setDate(d => {
    const next = new Date(d);
    next.setDate(next.getDate() + n);
    return next;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-stretch">
      {/* Cours du jour */}
      <section className={card}>
        <div className="flex items-center justify-between gap-4 mb-5">
          <h2 className="text-base font-bold text-[#001257]">Cours d&apos;aujourd&apos;hui</h2>
          <div className="flex items-center gap-2">
            <ChevronButton direction="prev" label="Jour précédent" onClick={() => shiftDay(-1)} />
            <span className="text-sm font-medium text-[#1A1D2E] min-w-44 text-center">{formatDate(date)}</span>
            <ChevronButton direction="next" label="Jour suivant" onClick={() => shiftDay(1)} />
          </div>
        </div>

        <DataState state={emploi}>{cours => {
          if (!cours.length) return <p className="text-sm text-[#6B7185]">Aucun cours ce jour.</p>;
          return (
            <ul className="flex flex-col gap-5">
              {cours.map((c, i) => (
                <li key={c.id} className="flex items-stretch gap-4">
                  <div className="w-[56px] shrink-0 text-right">
                    <p className="text-sm font-semibold text-[#001257]">{c.start}</p>
                    {c.end && <p className="text-xs text-[#6B7185]">{c.end}</p>}
                  </div>
                  <span className={`w-1 rounded-full ${BARRES[i % BARRES.length]}`} aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#1A1D2E]">
                      {c.subject}{c.annule && ' (annulé)'}
                    </p>
                    <p className="text-xs text-[#6B7185]">
                      {[c.intervenant, c.room && `Salle ${c.room}`].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          );
        }}</DataState>
      </section>

      {/* Raccourcis : devoirs, ressources, vie scolaire, notes (élève) / devoirs, évaluations (prof).
          Un bloc par route du back, affiché selon les droits ; chacun se charge seul. */}
      <div className="flex flex-col gap-6">
        {blocsAccueil(can).map(bloc => <BlocRaccourci key={bloc.titre} bloc={bloc} />)}
      </div>
    </div>
  );
}

// Un bloc de la colonne de droite : son titre reste affiché même si sa route échoue
function BlocRaccourci({ bloc }) {
  const etat = useAsync(bloc.charger, [bloc.charger]);

  return (
    <section className={card}>
      <h2 className={cardTitle}>{bloc.titre}</h2>
      <DataState state={etat}>{({ lignes }) => (lignes.length ? (
        <ul className="flex flex-col divide-y divide-[#E1E5EE]">
          {lignes.map((ligne, i) => (
            <li key={i} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                {ligne.label && <p className="text-sm font-semibold text-[#1A1D2E]">{ligne.label}</p>}
                <p className="text-xs text-[#6B7185]">{ligne.texte}</p>
              </div>
              {ligne.badge && <Badge ton={ligne.badge.ton}>{ligne.badge.texte}</Badge>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[#6B7185]">{bloc.vide ?? 'Rien à afficher pour le moment.'}</p>
      ))}</DataState>
    </section>
  );
}

// ── Dernières actualités publiées ───────────────────────────────────────────
function DernieresActualites() {
  const actualites = useAsync(() => getActualites({ limit: 3 }));

  return (
    <section className={card}>
      <h2 className={cardTitle}>Actualités</h2>
      <DataState state={actualites}>{liste => (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {liste.map(actu => (
            <article key={actu.id} className="rounded-xl bg-[#EEF1F7] p-4 flex flex-col gap-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#07A6A6]">{dateActualite(actu)}</p>
              <p className="text-sm font-semibold text-[#001257]">{actu.titre}</p>
              <p className="text-xs text-[#6B7185] line-clamp-2">{actu.contenu}</p>
            </article>
          ))}
        </div>
      )}</DataState>
    </section>
  );
}

// ── Absences + cours du jour (établissement) ────────────────────────────────
const th = 'px-3 py-2.5 text-left text-xs font-semibold text-[#6B7185] bg-[#EEF1F7] first:rounded-l-lg last:rounded-r-lg';
const td = 'px-3 py-3 text-sm text-[#1A1D2E] border-b border-[#E1E5EE]';

function SuiviDuJour() {
  const absences = useAsync(getAbsencesDuJour);
  const cours = useAsync(getCoursDuJour);
  const [contact, setContact] = useState(null);

  return (
    <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6">
      {/* Absences aujourd'hui */}
      <section className={`${card} min-w-0`}>
        <h2 className={cardTitle}>Absences aujourd&apos;hui</h2>
        <DataState state={absences}>{rows => (rows.length ? (
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr>
                <th scope="col" className={th}>Élève</th>
                <th scope="col" className={th}>Classe</th>
                <th scope="col" className={th}>Heure / Durée</th>
                <th scope="col" className={th}>Justifié ?</th>
                <th scope="col" className={th}><span className="sr-only">Contact</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id} className="hover:bg-[#F7F8FB]">
                  <td className={`${td} font-medium`}>{row.eleve}</td>
                  <td className={td}>{row.classe}</td>
                  <td className={td}>
                    {row.heureDebut && row.heureFin ? `${row.heureDebut} – ${row.heureFin}` : (row.duree ?? '—')}
                  </td>
                  <td className={td}>{STATUT_ABSENCE_LABEL[row.statut] ?? row.statut}</td>
                  <td className={`${td} text-right`}>
                    <button
                      onClick={() => setContact(row)}
                      className="rounded-lg bg-[#EC6F6F] px-3 py-1.5 text-xs font-semibold text-[#001257] hover:opacity-90 transition"
                    >
                      Contact
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="py-6 text-center text-sm text-[#6B7185]">Aucune absence aujourd&apos;hui.</p>
        ))}</DataState>
      </section>

      {/* Cours aujourd'hui */}
      <section className={`${card} min-w-0`}>
        <h2 className={cardTitle}>Cours aujourd&apos;hui</h2>
        <DataState state={cours}>{rows => (rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  <th scope="col" className={`${th} whitespace-nowrap`}>Heure</th>
                  <th scope="col" className={th}>Classe</th>
                  <th scope="col" className={th}>Matière</th>
                  <th scope="col" className={th}>Salle</th>
                  <th scope="col" className={th}>Professeur</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id} className={`hover:bg-[#F7F8FB] ${row.annule ? 'opacity-60' : ''}`}>
                    <td className={`${td} text-xs font-semibold text-[#001257] whitespace-nowrap`}>
                      {row.start} – {row.end}
                    </td>
                    <td className={`${td} font-medium`}>{row.classe}</td>
                    <td className={td}>{row.subject}{row.annule && ' (annulé)'}</td>
                    <td className={td}>{row.room || '—'}</td>
                    <td className={td}>{row.intervenant}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-[#6B7185]">Aucun cours prévu aujourd&apos;hui.</p>
        ))}</DataState>
      </section>

      {/* Modale coordonnées contact */}
      {contact && (
        <Modal onClose={() => setContact(null)} className="max-w-sm rounded-2xl p-8" label="Coordonnées du contact">
          <button
            onClick={() => setContact(null)}
            aria-label="Fermer"
            className="absolute top-4 right-4 text-[#6B7185] hover:text-[#1A1D2E] text-2xl font-bold leading-none"
          >
            ✕
          </button>
          <h3 className="text-lg font-bold text-[#001257] mb-6">Coordonnées du contact</h3>
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs text-[#6B7185] uppercase tracking-wider mb-1">Élève</p>
              <p className="font-semibold text-[#1A1D2E] text-base">{contact.eleve}</p>
            </div>
            <div>
              <p className="text-xs text-[#6B7185] uppercase tracking-wider mb-1">Téléphone</p>
              <a
                href={contact.tel ? `tel:${contact.tel.replace(/\s/g, '')}` : '#'}
                className="font-medium text-[#001257] hover:underline text-base"
              >
                {contact.tel ?? 'Non renseigné'}
              </a>
            </div>
            <div>
              <p className="text-xs text-[#6B7185] uppercase tracking-wider mb-1">Email</p>
              <a
                href={contact.email ? `mailto:${contact.email}` : '#'}
                className="font-medium text-[#001257] hover:underline text-base break-all"
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
