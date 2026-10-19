import { useState } from 'react';
import AdminLayout from '../../layouts/AdminLayout.jsx';

/* =========================================================
   DONNÉES DE DÉMONSTRATION
   À remplacer par un appel API / base de données réelle.
   Structure : schedule[classe][jour] = tableau de cours
   Chaque cours : { start, end, subject, intervenant, room }
========================================================= */
const DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
const MONTH_NAMES = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];
const HOUR_SLOTS = ['09h00', '10h00', '11h00', '12h00', '13h00', '14h00', '15h00', '16h00', '17h00', '18h00'];
const ROW_HEIGHT = 40; // px par tranche de 30 min

// Palette de couleurs assignée automatiquement à chaque nouvelle matière
const COLOR_PALETTE = [
  'bg-blue-100 text-blue-800 border-blue-300',
  'bg-rose-100 text-rose-800 border-rose-300',
  'bg-emerald-100 text-emerald-800 border-emerald-300',
  'bg-amber-100 text-amber-800 border-amber-300',
  'bg-lime-100 text-lime-800 border-lime-300',
  'bg-cyan-100 text-cyan-800 border-cyan-300',
  'bg-orange-100 text-orange-800 border-orange-300',
  'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300',
  'bg-purple-100 text-purple-800 border-purple-300',
  'bg-sky-100 text-sky-800 border-sky-300',
  'bg-teal-100 text-teal-800 border-teal-300',
  'bg-indigo-100 text-indigo-800 border-indigo-300',
  'bg-pink-100 text-pink-800 border-pink-300',
  'bg-yellow-100 text-yellow-800 border-yellow-300',
  'bg-green-100 text-green-800 border-green-300',
  'bg-violet-100 text-violet-800 border-violet-300',
];
const subjectColors = Object.fromEntries(
  Array.from({ length: 9 }, (_, i) => [`Cours${i + 1}`, COLOR_PALETTE[i]]),
);

// Renvoie (et crée si besoin) une couleur pour une matière donnée
function getColorForSubject(rawSubject) {
  const subject = (rawSubject || '').trim();
  if (!subject) return 'bg-gray-100 text-gray-700 border-gray-300';
  if (!subjectColors[subject]) {
    subjectColors[subject] = COLOR_PALETTE[Object.keys(subjectColors).length % COLOR_PALETTE.length];
  }
  return subjectColors[subject];
}

const INITIAL_SCHEDULE = {
  'Iris 1': {
    Mercredi: [
      { start: '09h00', end: '13h00', subject: 'Cours1', intervenant: 'Intervenant 1', room: 'Salle' },
      { start: '14h00', end: '18h00', subject: 'Cours1', intervenant: 'Intervenant 1', room: 'Salle' },
    ],
    Jeudi: [
      { start: '09h00', end: '10h30', subject: 'Cours5', intervenant: 'Intervenant 8', room: 'Salle' },
      { start: '10h30', end: '12h00', subject: 'Cours3', intervenant: 'Intervenant 9', room: 'Salle' },
      { start: '13h00', end: '16h00', subject: 'Cours4', intervenant: 'Intervenant 4', room: 'Salle' },
      { start: '16h00', end: '18h00', subject: 'Cours6', intervenant: 'Intervenant 5', room: 'Salle' },
    ],
    Vendredi: [
      { start: '09h00', end: '11h00', subject: 'Cours1', intervenant: 'Intervenant 2', room: 'Salle' },
      { start: '11h00', end: '13h00', subject: 'Cours2', intervenant: 'Intervenant 6', room: 'Salle' },
      { start: '14h00', end: '18h00', subject: 'Cours9', intervenant: 'Intervenant 3', room: 'Salle' },
    ],
  },
  'Iris 2': {
    Mercredi: [
      { start: '09h00', end: '13h00', subject: 'Cours2', intervenant: 'Intervenant 6', room: 'Salle' },
      { start: '14h00', end: '18h00', subject: 'Cours5', intervenant: 'Intervenant 8', room: 'Salle' },
    ],
    Jeudi: [
      { start: '09h00', end: '10h30', subject: 'Cours1', intervenant: 'Intervenant 10', room: 'Salle' },
      { start: '10h30', end: '12h00', subject: 'Cours3', intervenant: 'Intervenant 7', room: 'Salle' },
      { start: '13h00', end: '18h00', subject: 'Cours1', intervenant: 'Intervenant 11', room: 'Salle' },
    ],
    Vendredi: [
      { start: '09h00', end: '11h00', subject: 'Cours3', intervenant: 'Intervenant 9', room: 'Salle' },
      { start: '11h00', end: '13h00', subject: 'Cours8', intervenant: 'Intervenant 3', room: 'Salle' },
      { start: '14h00', end: '18h00', subject: 'Cours7', intervenant: 'Intervenant 4', room: 'Salle' },
    ],
  },
};

// Liste des salles, initialisée à partir des données existantes
const INITIAL_ROOMS = Array.from(
  new Set(
    Object.values(INITIAL_SCHEDULE)
      .flatMap(classData => Object.values(classData))
      .flat()
      .map(c => c.room.trim())
      .filter(Boolean),
  ),
).sort();

// Convertit "09h00" -> 9 (en heures décimales)
function toDecimalHour(str) {
  const [h, m] = str.split('h').map(Number);
  return h + m / 60;
}

// Convertit une heure décimale (ex: 10.5) en libellé "10h30"
function hourLabelForHour(decimalHour) {
  const h = Math.floor(decimalHour);
  const m = Math.round((decimalHour - h) * 60);
  return `${String(h).padStart(2, '0')}h${String(m).padStart(2, '0')}`;
}

// Créneaux de 30 min entre le premier et le dernier HOUR_SLOTS
const TIME_OPTIONS = (() => {
  const opts = [];
  const startH = parseInt(HOUR_SLOTS[0], 10);
  const endH = parseInt(HOUR_SLOTS[HOUR_SLOTS.length - 1], 10);
  for (let h = startH; h <= endH; h++) {
    opts.push(`${String(h).padStart(2, '0')}h00`);
    if (h < endH) opts.push(`${String(h).padStart(2, '0')}h30`);
  }
  return opts;
})();

function getMonday(d) {
  d = new Date(d);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400';

// ── Grille du planning ──────────────────────────────────────────────────────
// NB : chaque cellule est placée explicitement avec grid-column / grid-row
// (l'auto-placement CSS Grid casse dès qu'on saute une cellule fusionnée).
function TimetableGrid({ classData, monday, onEditCourse, onAddCourse }) {
  const startHour = toDecimalHour(HOUR_SLOTS[0]);
  const totalRows = (HOUR_SLOTS.length - 1) * 2; // demi-heures
  const cells = [];

  for (let r = 0; r < totalRows; r++) {
    const currentHour = startHour + r * 0.5;
    const gridRow = r + 2; // +2 car la ligne 1 est l'en-tête des jours
    const isLastRow = r === totalRows - 1;

    // Colonne heure
    cells.push(
      <div
        key={`h-${r}`}
        className={`border-r border-gray-800 flex items-start justify-start pl-1 text-xs text-gray-700 bg-gray-50${isLastRow ? '' : ' border-b'}`}
        style={{ height: ROW_HEIGHT, gridColumn: 1, gridRow }}
      >
        {r % 2 === 0 ? HOUR_SLOTS[r / 2] : ''}
      </div>,
    );

    // Colonnes des jours
    DAY_NAMES.forEach((day, d) => {
      const courses = classData[day] || [];
      const gridColumn = d + 2; // +2 car la colonne 1 est celle des heures
      const isLastCol = d === DAY_NAMES.length - 1;

      // Un cours commence-t-il exactement à cette demi-heure ?
      const index = courses.findIndex(c => toDecimalHour(c.start) === currentHour);
      if (index !== -1) {
        const course = courses[index];
        const span = (toDecimalHour(course.end) - toDecimalHour(course.start)) * 2;
        cells.push(
          <div
            key={`c-${r}-${d}`}
            className={`border-r ${isLastCol ? 'border-r-0' : ''} border-gray-800 p-0 cursor-pointer group`}
            style={{ gridColumn, gridRow: `${gridRow} / span ${span}` }}
            title="Cliquer pour modifier ce cours"
            onClick={() => onEditCourse(day, index)}
          >
            <div className={`h-full w-full ${getColorForSubject(course.subject)} border-l-4 px-2 py-1 flex flex-col justify-center overflow-hidden group-hover:brightness-95 transition`}>
              <p className="text-xs font-bold leading-tight truncate">{course.subject}</p>
              <p className="text-[11px] leading-tight truncate">{course.intervenant}</p>
              <p className="text-[11px] leading-tight opacity-75 truncate">{course.room}</p>
            </div>
          </div>,
        );
        return;
      }

      // Case déjà couverte par un cours démarré avant : rien à dessiner
      const covered = courses.some(c => toDecimalHour(c.start) < currentHour && toDecimalHour(c.end) > currentHour);
      if (covered) return;

      cells.push(
        <div
          key={`e-${r}-${d}`}
          className={`border-r border-gray-800 bg-gray-100 hover:bg-amber-50 cursor-pointer transition${isLastCol ? ' border-r-0' : ''}${isLastRow ? '' : ' border-b'}`}
          style={{ height: ROW_HEIGHT, gridColumn, gridRow }}
          title="Cliquer pour ajouter un cours"
          onClick={() => onAddCourse(day, hourLabelForHour(currentHour))}
        />,
      );
    });
  }

  const dayHeader = 'border-b border-gray-800 py-2 text-center text-sm font-semibold text-gray-800 bg-gray-50';

  return (
    <div className="border border-gray-800 overflow-hidden rounded-lg" style={{ display: 'grid', gridTemplateColumns: '80px repeat(5, 1fr)' }}>
      <div className="border-b border-r border-gray-800 bg-gray-50" style={{ gridColumn: 1, gridRow: 1 }} />
      {DAY_NAMES.map((name, i) => {
        const date = addDays(monday, i);
        return (
          <div key={name} className={`${dayHeader}${i < 4 ? ' border-r' : ''}`} style={{ gridColumn: i + 2, gridRow: 1 }}>
            {`${name} ${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`}
          </div>
        );
      })}
      {cells}
    </div>
  );
}

// ── Modale : saisir un nom (classe / salle) ─────────────────────────────────
function NameModal({ title, label, placeholder, onConfirm, onClose }) {
  const [name, setName] = useState('');
  return (
    <div className="flex fixed inset-0 z-[100] items-center justify-center bg-black/40" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-sm mx-4">
        <h3 className="text-lg font-bold text-[var(--color-titre)] mb-4">{title}</h3>
        <label className="text-xs font-medium text-gray-600">{label}</label>
        <input
          autoFocus
          type="text"
          placeholder={placeholder}
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 transition">Annuler</button>
          <button onClick={() => onConfirm(name.trim())} className="px-4 py-2 text-sm rounded-lg bg-amber-400 hover:bg-amber-500 text-white font-medium transition">Ajouter</button>
        </div>
      </div>
    </div>
  );
}

// ── Modale : ajouter / modifier un cours ────────────────────────────────────
// `editing` = { day, index, course } en modification, sinon { day, start } en création
function CourseModal({ className, editing, rooms, onSave, onDelete, onClose }) {
  const course = editing.course;
  const defaultStart = editing.start || TIME_OPTIONS[0];
  const [form, setForm] = useState({
    day:         editing.day || DAY_NAMES[0],
    start:       course?.start ?? defaultStart,
    end:         course?.end ?? TIME_OPTIONS[Math.min(TIME_OPTIONS.indexOf(defaultStart) + 2, TIME_OPTIONS.length - 1)],
    subject:     course?.subject.trim() ?? '',
    intervenant: course?.intervenant.trim() ?? '',
    room:        course?.room.trim() ?? (rooms[0] || 'Salle'),
  });
  const [error, setError] = useState('');
  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }));

  // La salle d'un cours existant peut ne plus figurer dans la liste
  const roomOptions = rooms.length ? [...rooms] : ['Salle'];
  if (!roomOptions.includes(form.room)) roomOptions.push(form.room);

  function save() {
    const subject = form.subject.trim();
    const intervenant = form.intervenant.trim();
    if (!subject) return setError('Merci de renseigner la matière.');
    if (!intervenant) return setError("Merci de renseigner l'intervenant.");
    if (toDecimalHour(form.end) <= toDecimalHour(form.start)) {
      return setError("L'heure de fin doit être après l'heure de début.");
    }
    setError('');
    onSave({ ...form, subject, intervenant });
  }

  return (
    <div className="flex fixed inset-0 z-[100] items-center justify-center bg-black/40" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-bold text-[var(--color-titre)] mb-4">{course ? 'Modifier le cours' : 'Ajouter un cours'}</h3>
        <p className="text-xs text-gray-400 mb-4">Classe : {className}</p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="col-span-2">
            <label className="text-xs font-medium text-gray-600">Jour</label>
            <select value={form.day} onChange={set('day')} className={inputClass}>
              {DAY_NAMES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Début</label>
            <select value={form.start} onChange={set('start')} className={inputClass}>
              {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Fin</label>
            <select value={form.end} onChange={set('end')} className={inputClass}>
              {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-gray-600">Matière</label>
            <input type="text" value={form.subject} onChange={set('subject')} placeholder="ex : Mathématiques" className={inputClass} />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-gray-600">Intervenant</label>
            <input type="text" value={form.intervenant} onChange={set('intervenant')} placeholder="ex : Intervenant 1" className={inputClass} />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-medium text-gray-600">Salle</label>
            <select value={form.room} onChange={set('room')} className={inputClass}>
              {roomOptions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>

        {error && <p className="text-xs text-red-600 mb-3">{error}</p>}

        <div className="flex justify-between items-center">
          {course && (
            <button onClick={onDelete} className="px-4 py-2 text-sm rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition">
              Supprimer
            </button>
          )}
          <div className="flex gap-2 ml-auto">
            <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 transition">Annuler</button>
            <button onClick={save} className="px-4 py-2 text-sm rounded-lg bg-amber-400 hover:bg-amber-500 text-white font-medium transition">Enregistrer</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function EmploiDuTemps() {
  const [schedule, setSchedule] = useState(INITIAL_SCHEDULE);
  const [rooms, setRooms] = useState(INITIAL_ROOMS);
  const [selectedClass, setSelectedClass] = useState(Object.keys(INITIAL_SCHEDULE)[0] ?? '');
  const [monday, setMonday] = useState(() => getMonday(new Date()));
  // modale courante : { type: 'class' | 'room' | 'course', editing? }
  const [modal, setModal] = useState(null);
  const closeModal = () => setModal(null);

  const friday = addDays(monday, 4);

  function openCourseModal(editing = {}) {
    if (!selectedClass) return alert("Merci de sélectionner ou créer une classe d'abord.");
    setModal({ type: 'course', editing });
  }

  function addClass(name) {
    if (!name) return alert('Merci de saisir un nom de classe.');
    if (schedule[name]) return alert('Cette classe existe déjà.');
    setSchedule(s => ({ ...s, [name]: {} }));
    setSelectedClass(name);
    closeModal();
  }

  function addRoom(name) {
    if (!name) return alert('Merci de saisir un nom de salle.');
    if (rooms.includes(name)) return alert('Cette salle existe déjà.');
    setRooms(r => [...r, name].sort());
    closeModal();
  }

  // Copie des cours de la classe sélectionnée, sans le cours en cours d'édition
  function classDataWithout(editing) {
    const classData = Object.fromEntries(
      Object.entries(schedule[selectedClass]).map(([day, courses]) => [day, [...courses]]),
    );
    if (editing?.course) classData[editing.day].splice(editing.index, 1);
    return classData;
  }

  function saveCourse({ day, start, end, subject, intervenant, room }) {
    const classData = classDataWithout(modal.editing);
    const dayCourses = classData[day] ?? [];

    // Vérifier les chevauchements avec les autres cours du même jour
    const overlap = dayCourses.some(
      c => toDecimalHour(c.start) < toDecimalHour(end) && toDecimalHour(c.end) > toDecimalHour(start),
    );
    if (overlap && !confirm('Ce créneau chevauche un autre cours de cette classe. Enregistrer quand même ?')) return;

    classData[day] = [...dayCourses, { start, end, subject, intervenant, room }];
    setSchedule(s => ({ ...s, [selectedClass]: classData }));
    closeModal();
  }

  function deleteCourse() {
    setSchedule(s => ({ ...s, [selectedClass]: classDataWithout(modal.editing) }));
    closeModal();
  }

  return (
    <AdminLayout>
      <div className="flex-1 overflow-y-auto p-6 bg-[var(--color-page)]">
        <div className="max-w-7xl mx-auto">
          {/* Titre + sélecteur de classe */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h1 className="text-2xl font-bold text-[var(--color-titre)]">Emplois du temps</h1>
            <div className="flex items-center gap-3">
              <label htmlFor="classSelect" className="text-sm font-medium text-gray-600">Classe :</label>
              <select
                id="classSelect"
                value={selectedClass}
                onChange={e => setSelectedClass(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                {Object.keys(schedule).map(name => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>
          </div>

          {/* Boutons de gestion */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <button
              onClick={() => setModal({ type: 'class' })}
              className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white hover:bg-gray-50 shadow-sm transition"
            >
              <span className="text-base leading-none">+</span> Ajouter une classe
            </button>
            <button
              onClick={() => setModal({ type: 'room' })}
              className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white hover:bg-gray-50 shadow-sm transition"
            >
              <span className="text-base leading-none">+</span> Ajouter une salle
            </button>
            <button
              onClick={() => openCourseModal()}
              className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg bg-amber-400 hover:bg-amber-500 text-white font-medium shadow-sm transition"
            >
              <span className="text-base leading-none">+</span> Ajouter un cours
            </button>
          </div>

          {/* Navigation semaine */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <button
              onClick={() => setMonday(m => addDays(m, -7))}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-amber-400 hover:bg-amber-500 text-white shadow transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <div className="px-6 py-2 rounded-full bg-amber-400 text-white font-semibold shadow text-sm">
              {`Semaine du ${monday.getDate()} au ${friday.getDate()} ${MONTH_NAMES[friday.getMonth()]}`}
            </div>
            <button
              onClick={() => setMonday(m => addDays(m, 7))}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-amber-400 hover:bg-amber-500 text-white shadow transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          <TimetableGrid
            classData={schedule[selectedClass] || {}}
            monday={monday}
            onEditCourse={(day, index) => openCourseModal({ day, index, course: schedule[selectedClass][day][index] })}
            onAddCourse={(day, start) => openCourseModal({ day, start })}
          />
        </div>
      </div>

      {modal?.type === 'class' && (
        <NameModal title="Ajouter une classe" label="Nom de la classe" placeholder="ex : 4ème C" onConfirm={addClass} onClose={closeModal} />
      )}
      {modal?.type === 'room' && (
        <NameModal title="Ajouter une salle" label="Nom de la salle" placeholder="ex : Labo 4" onConfirm={addRoom} onClose={closeModal} />
      )}
      {modal?.type === 'course' && (
        <CourseModal
          className={selectedClass}
          editing={modal.editing}
          rooms={rooms}
          onSave={saveCourse}
          onDelete={deleteCourse}
          onClose={closeModal}
        />
      )}
    </AdminLayout>
  );
}
