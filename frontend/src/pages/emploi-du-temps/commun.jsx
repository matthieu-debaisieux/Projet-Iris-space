import '@tabler/icons-webfont/dist/tabler-icons.min.css';
import Modal from '@/components/ui/Modal.jsx';

// Éléments partagés par les vues « consultation » et « gestion » de l'emploi du temps.
// Données : services/planning.js → classes[classe][jour] = tableau de cours
// Chaque cours : { start, end, subject, intervenant, room }

export const DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
export const MONTH_NAMES = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];
const HOUR_SLOTS = ['08h00', '09h00', '10h00', '11h00', '12h00', '13h00', '14h00', '15h00', '16h00', '17h00', '18h00', '19h00'];
const ROW_HEIGHT = 34; // px par tranche de 30 min

// ── Styles communs (mêmes codes que Notes / Vie scolaire / Actualités) ──────
export const card = 'bg-white rounded-2xl border border-[#E1E5EE] shadow-[0_1px_2px_rgba(0,18,87,0.04)]';
export const champ = 'w-full rounded-lg border border-[#E1E5EE] bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-[#001257]';
export const label = 'block mb-1.5 text-xs font-semibold text-[#1A1D2E]';
export const btnPrimaire = 'inline-flex items-center justify-center gap-2 rounded-lg bg-[#EC6F6F] px-4 py-2.5 text-sm font-bold text-[#001257] hover:opacity-90 transition';
export const btnSecondaire = 'inline-flex items-center justify-center gap-2 rounded-lg border border-[#E1E5EE] bg-white px-4 py-2.5 text-sm font-semibold text-[#001257] hover:bg-[#EEF1F7] transition';
export const btnDanger = 'inline-flex items-center justify-center gap-2 rounded-lg border border-[#F3C4C4] bg-white px-4 py-2.5 text-sm font-semibold text-[#B23A3A] hover:bg-[#FBE6E6] transition';

export const Icon = ({ name, size = 16, className = '' }) => (
  <i className={`ti ti-${name} ${className}`} style={{ fontSize: size }} aria-hidden="true" />
);

export const Stat = ({ nom, valeur }) => (
  <div className={`${card} px-5 py-3 min-w-28`}>
    <p className="text-xs text-[#6B7185]">{nom}</p>
    <p className="text-2xl font-bold text-[#001257]">{valeur}</p>
  </div>
);

export const Chip = ({ active, onClick, children }) => (
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

// ── Couleurs des matières (attribuées automatiquement, stables par matière) ─
const COLOR_PALETTE = [
  'bg-[#E8EEFF] text-[#1E3A8A] border-[#5B7CFA]',
  'bg-[#FDEBEC] text-[#9F1D2B] border-[#EC6F6F]',
  'bg-[#E3F5EC] text-[#14532D] border-[#34A877]',
  'bg-[#FFF3D6] text-[#7A4B00] border-[#F8B005]',
  'bg-[#E0F5F5] text-[#0B5E5E] border-[#07A6A6]',
  'bg-[#F1E9FF] text-[#4C1D95] border-[#8B5CF6]',
  'bg-[#FFEBDD] text-[#7C2D12] border-[#F97316]',
  'bg-[#FCE7F6] text-[#831843] border-[#E255B4]',
  'bg-[#ECF7DA] text-[#3F6212] border-[#84CC16]',
  'bg-[#E0F2FE] text-[#0C4A6E] border-[#0EA5E9]',
];
const subjectColors = {};

export function getColorForSubject(rawSubject) {
  const subject = (rawSubject || '').trim();
  if (!subject) return 'bg-[#EEF1F7] text-[#6B7185] border-[#C7CCDA]';
  if (!subjectColors[subject]) {
    subjectColors[subject] = COLOR_PALETTE[Object.keys(subjectColors).length % COLOR_PALETTE.length];
  }
  return subjectColors[subject];
}

// ── Heures ──────────────────────────────────────────────────────────────────
// "09h30" -> 9.5
export function toDecimalHour(str) {
  const [h, m] = str.split('h').map(Number);
  return h + m / 60;
}

// 10.5 -> "10h30"
function hourLabelForHour(decimalHour) {
  const h = Math.floor(decimalHour);
  const m = Math.round((decimalHour - h) * 60);
  return `${String(h).padStart(2, '0')}h${String(m).padStart(2, '0')}`;
}

export const duree = c => toDecimalHour(c.end) - toDecimalHour(c.start);
export const formatDuree = h => {
  const heures = Math.floor(h);
  const minutes = Math.round((h - heures) * 60);
  return minutes ? `${heures}h${String(minutes).padStart(2, '0')}` : `${heures}h`;
};

// Créneaux de 30 min entre le premier et le dernier HOUR_SLOTS
export const TIME_OPTIONS = (() => {
  const opts = [];
  const startH = parseInt(HOUR_SLOTS[0], 10);
  const endH = parseInt(HOUR_SLOTS[HOUR_SLOTS.length - 1], 10);
  for (let h = startH; h <= endH; h++) {
    opts.push(`${String(h).padStart(2, '0')}h00`);
    if (h < endH) opts.push(`${String(h).padStart(2, '0')}h30`);
  }
  return opts;
})();

// ── Dates ───────────────────────────────────────────────────────────────────
export function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  date.setDate(date.getDate() - day + (day === 0 ? -6 : 1));
  date.setHours(0, 0, 0, 0);
  return date;
}

export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

const memeJour = (a, b) => a.toDateString() === b.toDateString();

// Statistiques d'une semaine de cours : { cours, heures, matieres }
export function statsSemaine(classData) {
  const cours = Object.values(classData).flat();
  return {
    cours: cours.length,
    heures: formatDuree(cours.reduce((s, c) => s + duree(c), 0)),
    matieres: new Set(cours.map(c => c.subject.trim())).size,
  };
}

// ── Navigation semaine ──────────────────────────────────────────────────────
export function NavigationSemaine({ monday, setMonday }) {
  const friday = addDays(monday, 4);
  const debut = monday.getMonth() === friday.getMonth()
    ? monday.getDate()
    : `${monday.getDate()} ${MONTH_NAMES[monday.getMonth()]}`;
  const estCetteSemaine = memeJour(monday, getMonday(new Date()));

  const fleche = 'w-9 h-9 flex items-center justify-center rounded-lg border border-[#E1E5EE] bg-white text-[#001257] hover:bg-[#EEF1F7] transition';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => setMonday(m => addDays(m, -7))} className={fleche} aria-label="Semaine précédente">
        <Icon name="chevron-left" size={18} />
      </button>
      <p className="min-w-56 text-center text-sm font-bold text-[#001257]">
        Semaine du {debut} au {friday.getDate()} {MONTH_NAMES[friday.getMonth()]} {friday.getFullYear()}
      </p>
      <button type="button" onClick={() => setMonday(m => addDays(m, 7))} className={fleche} aria-label="Semaine suivante">
        <Icon name="chevron-right" size={18} />
      </button>
      <button
        type="button"
        onClick={() => setMonday(getMonday(new Date()))}
        disabled={estCetteSemaine}
        className="ml-1 rounded-full border border-[#E1E5EE] bg-white px-4 py-1.5 text-xs font-semibold text-[#001257] hover:bg-[#EEF1F7] transition disabled:opacity-40 disabled:cursor-default disabled:hover:bg-white"
      >
        Aujourd'hui
      </button>
    </div>
  );
}

// ── Grille du planning ──────────────────────────────────────────────────────
// Chaque cellule est placée explicitement avec grid-column / grid-row
// (l'auto-placement CSS Grid casse dès qu'on saute une cellule fusionnée).
// `onCourseClick(day, index)` : clic sur un cours
// `onAddCourse(day, start)` : clic sur un créneau vide (absent = lecture seule)
export function TimetableGrid({ classData, monday, onCourseClick, onAddCourse }) {
  const startHour = toDecimalHour(HOUR_SLOTS[0]);
  const totalRows = (HOUR_SLOTS.length - 1) * 2; // demi-heures
  const today = new Date();
  const cells = [];

  for (let r = 0; r < totalRows; r++) {
    const currentHour = startHour + r * 0.5;
    const gridRow = r + 2; // la ligne 1 est l'en-tête des jours
    const ligne = r % 2 === 0 ? 'border-t border-[#E1E5EE]' : 'border-t border-dashed border-[#EEF1F7]';

    // Colonne heure
    cells.push(
      <div
        key={`h-${r}`}
        className={`pr-3 text-right text-[11px] font-medium text-[#6B7185] ${r % 2 === 0 ? '' : 'invisible'}`}
        style={{ height: ROW_HEIGHT, gridColumn: 1, gridRow, transform: 'translateY(-7px)' }}
      >
        {HOUR_SLOTS[r / 2] ?? ''}
      </div>,
    );

    DAY_NAMES.forEach((day, d) => {
      const courses = classData[day] || [];
      const gridColumn = d + 2; // la colonne 1 est celle des heures
      const estAujourdhui = memeJour(addDays(monday, d), today);
      const fond = estAujourdhui ? 'bg-[#F7F9FD]' : '';

      // Un cours commence à cette demi-heure ?
      const index = courses.findIndex(c => toDecimalHour(c.start) === currentHour);
      if (index !== -1) {
        const course = courses[index];
        const span = duree(course) * 2;
        cells.push(
          <div
            key={`c-${r}-${d}`}
            className={`border-l border-[#E1E5EE] ${ligne} ${fond} p-1`}
            style={{ gridColumn, gridRow: `${gridRow} / span ${span}` }}
          >
            <button
              type="button"
              onClick={() => onCourseClick?.(day, index)}
              className={`h-full w-full rounded-lg border-l-4 ${getColorForSubject(course.subject)} px-2.5 py-1.5 text-left flex flex-col gap-0.5 overflow-hidden hover:shadow-md hover:-translate-y-px transition`}
            >
              <span className="text-[11px] font-semibold opacity-75">{course.start} – {course.end}</span>
              <span className="text-sm font-bold leading-tight truncate w-full">{course.subject}{course.annule && ' (annulé)'}</span>
              {span >= 3 && (
                <span className="text-xs leading-tight truncate w-full flex items-center gap-1">
                  <Icon name="user" size={12} /> {course.intervenant}
                </span>
              )}
              {span >= 4 && (
                <span className="text-xs leading-tight truncate w-full flex items-center gap-1 opacity-80">
                  <Icon name="map-pin" size={12} /> {course.room}
                </span>
              )}
            </button>
          </div>,
        );
        return;
      }

      // Case couverte par un cours commencé avant : rien à dessiner
      const covered = courses.some(c => toDecimalHour(c.start) < currentHour && toDecimalHour(c.end) > currentHour);
      if (covered) return;

      cells.push(
        onAddCourse ? (
          <button
            key={`e-${r}-${d}`}
            type="button"
            onClick={() => onAddCourse(day, hourLabelForHour(currentHour))}
            className={`group border-l border-[#E1E5EE] ${ligne} ${fond} flex items-center justify-center hover:bg-[#EEF1F7] transition`}
            style={{ height: ROW_HEIGHT, gridColumn, gridRow }}
            aria-label={`Ajouter un cours ${day} à ${hourLabelForHour(currentHour)}`}
          >
            <Icon name="plus" size={14} className="text-[#6B7185] opacity-0 group-hover:opacity-100 transition" />
          </button>
        ) : (
          <div
            key={`e-${r}-${d}`}
            className={`border-l border-[#E1E5EE] ${ligne} ${fond}`}
            style={{ height: ROW_HEIGHT, gridColumn, gridRow }}
          />
        ),
      );
    });
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[760px] pb-1" style={{ display: 'grid', gridTemplateColumns: '64px repeat(5, minmax(0, 1fr))' }}>
        <div style={{ gridColumn: 1, gridRow: 1 }} />
        {DAY_NAMES.map((name, i) => {
          const date = addDays(monday, i);
          const estAujourdhui = memeJour(date, today);
          return (
            <div
              key={name}
              className={`flex flex-col items-center gap-1 pb-3 pt-1 ${estAujourdhui ? 'bg-[#F7F9FD] rounded-t-xl' : ''}`}
              style={{ gridColumn: i + 2, gridRow: 1 }}
            >
              <span className={`text-xs font-medium ${estAujourdhui ? 'text-[#001257]' : 'text-[#6B7185]'}`}>{name}</span>
              <span
                className={`flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-sm font-bold ${
                  estAujourdhui ? 'bg-[#001257] text-white' : 'text-[#001257]'
                }`}
              >
                {date.getDate()}
              </span>
            </div>
          );
        })}
        {cells}
      </div>
    </div>
  );
}

// ── Détail d'un cours (lecture seule) ───────────────────────────────────────
const Ligne = ({ icon, children }) => (
  <li className="flex items-center gap-3 text-sm text-[#1A1D2E]">
    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EEF1F7] text-[#001257]"><Icon name={icon} /></span>
    <span>{children}</span>
  </li>
);

export function DetailCours({ cours, jour, classe, onClose }) {
  return (
    <Modal onClose={onClose} className="max-w-sm rounded-2xl p-6" label={cours.subject}>
      <div className={`mb-4 rounded-xl border-l-4 px-4 py-3 ${getColorForSubject(cours.subject)}`}>
        <p className="text-xs font-semibold opacity-75">{classe}</p>
        <h3 className="text-lg font-bold">{cours.subject}</h3>
      </div>
      <ul className="flex flex-col gap-3 mb-6">
        <Ligne icon="calendar">{jour}, {cours.start} – {cours.end} <span className="text-[#6B7185]">({formatDuree(duree(cours))})</span></Ligne>
        <Ligne icon="user">{cours.intervenant}</Ligne>
        <Ligne icon="map-pin">{cours.room}</Ligne>
      </ul>
      <div className="flex justify-end gap-2 pt-4 border-t border-[#E1E5EE]">
        <button type="button" onClick={onClose} className={btnSecondaire}>Fermer</button>
      </div>
    </Modal>
  );
}
