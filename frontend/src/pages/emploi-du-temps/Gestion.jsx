import { useState } from 'react';
import DataState from '@/components/ui/DataState.jsx';
import Modal from '@/components/ui/Modal.jsx';
import { useAsync } from '@/hooks/useAsync.js';
import { getPlanning } from '@/services/planning.js';
import {
  btnDanger, btnPrimaire, btnSecondaire, card, champ, Chip, DAY_NAMES, getMonday, Icon, label,
  NavigationSemaine, Stat, statsSemaine, TIME_OPTIONS, TimetableGrid, toDecimalHour,
} from './commun.jsx';

// Vue « gestion » (droit `emploi_du_temps_gerer`) : créer des classes, des salles,
// ajouter / modifier / supprimer des cours directement depuis la grille.
// Les modifications restent en mémoire de la page : à brancher sur l'API plus tard.
export default function Gestion() {
  const planning = useAsync(getPlanning);

  return (
    <div className="flex-1 overflow-y-auto bg-[var(--color-page)]">
      <div className="mx-auto w-full max-w-[1200px] px-6 py-8">
        <DataState state={planning}>{() => <Contenu planning={planning} />}</DataState>
      </div>
    </div>
  );
}

function Contenu({ planning }) {
  const schedule = planning.data.classes;
  const rooms = planning.data.salles;
  const setSchedule = update => planning.setData(p => ({ ...p, classes: update(p.classes) }));
  const setRooms = update => planning.setData(p => ({ ...p, salles: update(p.salles) }));

  const [chosenClass, setSelectedClass] = useState('');
  const selectedClass = schedule[chosenClass] ? chosenClass : Object.keys(schedule)[0] || '';
  const classData = schedule[selectedClass] ?? {};
  const stats = statsSemaine(classData);

  const [monday, setMonday] = useState(() => getMonday(new Date()));
  // modale courante : { type: 'class' | 'room' | 'course', editing? }
  const [modal, setModal] = useState(null);
  const closeModal = () => setModal(null);

  const openCourseModal = (editing = {}) => setModal({ type: 'course', editing });

  function addClass(name) {
    if (!name) return 'Merci de saisir un nom de classe.';
    if (schedule[name]) return 'Cette classe existe déjà.';
    setSchedule(s => ({ ...s, [name]: {} }));
    setSelectedClass(name);
    closeModal();
  }

  function addRoom(name) {
    if (!name) return 'Merci de saisir un nom de salle.';
    if (rooms.includes(name)) return 'Cette salle existe déjà.';
    setRooms(r => [...r, name].sort());
    closeModal();
  }

  // Copie des cours de la classe sélectionnée, sans le cours en cours d'édition
  function classDataWithout(editing) {
    const copy = Object.fromEntries(Object.entries(classData).map(([day, courses]) => [day, [...courses]]));
    if (editing?.course) copy[editing.day].splice(editing.index, 1);
    return copy;
  }

  // Renvoie true si le créneau chevauche un autre cours (le formulaire demande alors confirmation)
  function hasOverlap({ day, start, end }) {
    return (classDataWithout(modal.editing)[day] ?? []).some(
      c => toDecimalHour(c.start) < toDecimalHour(end) && toDecimalHour(c.end) > toDecimalHour(start),
    );
  }

  function saveCourse({ day, start, end, subject, intervenant, room }) {
    const copy = classDataWithout(modal.editing);
    copy[day] = [...(copy[day] ?? []), { start, end, subject, intervenant, room }]
      .sort((a, b) => toDecimalHour(a.start) - toDecimalHour(b.start));
    setSchedule(s => ({ ...s, [selectedClass]: copy }));
    closeModal();
  }

  function deleteCourse() {
    setSchedule(s => ({ ...s, [selectedClass]: classDataWithout(modal.editing) }));
    closeModal();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#001257]">Emplois du temps</h1>
          <p className="mt-1 text-sm text-[#6B7185]">Gérez les plannings des classes et les salles.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setModal({ type: 'class' })} className={btnSecondaire}>
            <Icon name="users-plus" /> Classe
          </button>
          <button type="button" onClick={() => setModal({ type: 'room' })} className={btnSecondaire}>
            <Icon name="door" /> Salle
          </button>
          <button type="button" onClick={() => openCourseModal()} disabled={!selectedClass} className={`${btnPrimaire} disabled:opacity-50`}>
            <Icon name="plus" /> Ajouter un cours
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Choisir une classe">
          {Object.keys(schedule).map(n => (
            <Chip key={n} active={n === selectedClass} onClick={() => setSelectedClass(n)}>{n}</Chip>
          ))}
        </div>
        <div className="flex gap-3">
          <Stat nom="Cours" valeur={stats.cours} />
          <Stat nom="Heures" valeur={stats.heures} />
          <Stat nom="Salles" valeur={rooms.length} />
        </div>
      </div>

      <section className={`${card} p-6 flex flex-col gap-5`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <NavigationSemaine monday={monday} setMonday={setMonday} />
          <p className="flex items-center gap-1.5 text-xs text-[#6B7185]">
            <Icon name="info-circle" size={14} />
            Cliquez sur un créneau vide pour ajouter un cours, sur un cours pour le modifier.
          </p>
        </div>

        {selectedClass ? (
          <TimetableGrid
            classData={classData}
            monday={monday}
            onCourseClick={(day, index) => openCourseModal({ day, index, course: classData[day][index] })}
            onAddCourse={(day, start) => openCourseModal({ day, start })}
          />
        ) : (
          <p className="py-12 text-center text-sm text-[#6B7185]">Créez une classe pour commencer.</p>
        )}
      </section>

      {modal?.type === 'class' && (
        <NameModal title="Nouvelle classe" fieldLabel="Nom de la classe" placeholder="ex : Iris 3" onConfirm={addClass} onClose={closeModal} />
      )}
      {modal?.type === 'room' && (
        <NameModal title="Nouvelle salle" fieldLabel="Nom de la salle" placeholder="ex : Labo 4" onConfirm={addRoom} onClose={closeModal} />
      )}
      {modal?.type === 'course' && (
        <CourseModal
          className={selectedClass}
          editing={modal.editing}
          rooms={rooms}
          hasOverlap={hasOverlap}
          onSave={saveCourse}
          onDelete={deleteCourse}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

// ── Modale : saisir un nom (classe / salle) ─────────────────────────────────
// `onConfirm(nom)` renvoie un message d'erreur, ou rien si c'est bon
function NameModal({ title, fieldLabel, placeholder, onConfirm, onClose }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const submit = e => {
    e.preventDefault();
    setError(onConfirm(name.trim()) || '');
  };

  return (
    <Modal onClose={onClose} className="max-w-sm rounded-2xl p-6" label={title}>
      <form onSubmit={submit}>
        <h3 className="text-lg font-bold text-[#001257] mb-4">{title}</h3>
        <label htmlFor="nom" className={label}>{fieldLabel}</label>
        <input id="nom" autoFocus type="text" placeholder={placeholder} value={name} onChange={e => setName(e.target.value)} className={champ} />
        {error && <p role="alert" className="mt-2 text-xs text-[#B23A3A]">{error}</p>}
        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={onClose} className={btnSecondaire}>Annuler</button>
          <button type="submit" className={btnPrimaire}>Ajouter</button>
        </div>
      </form>
    </Modal>
  );
}

// ── Modale : ajouter / modifier un cours ────────────────────────────────────
// `editing` = { day, index, course } en modification, sinon { day?, start? } en création
function CourseModal({ className, editing, rooms, hasOverlap, onSave, onDelete, onClose }) {
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
  const [confirmOverlap, setConfirmOverlap] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = key => e => { setConfirmOverlap(false); setForm(f => ({ ...f, [key]: e.target.value })); };

  // La salle d'un cours existant peut ne plus figurer dans la liste
  const roomOptions = rooms.length ? [...rooms] : ['Salle'];
  if (!roomOptions.includes(form.room)) roomOptions.push(form.room);

  function save(e) {
    e.preventDefault();
    const subject = form.subject.trim();
    const intervenant = form.intervenant.trim();
    if (!subject) return setError('Merci de renseigner la matière.');
    if (!intervenant) return setError("Merci de renseigner l'intervenant.");
    if (toDecimalHour(form.end) <= toDecimalHour(form.start)) return setError("L'heure de fin doit être après l'heure de début.");
    setError('');
    if (!confirmOverlap && hasOverlap(form)) return setConfirmOverlap(true);
    onSave({ ...form, subject, intervenant });
  }

  return (
    <Modal onClose={onClose} className="max-w-md rounded-2xl p-6" label={course ? 'Modifier le cours' : 'Ajouter un cours'}>
      <form onSubmit={save}>
        <h3 className="text-lg font-bold text-[#001257]">{course ? 'Modifier le cours' : 'Ajouter un cours'}</h3>
        <p className="text-xs text-[#6B7185] mb-5">Classe {className}</p>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="col-span-2">
            <label htmlFor="jour" className={label}>Jour</label>
            <select id="jour" value={form.day} onChange={set('day')} className={champ}>
              {DAY_NAMES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="debut" className={label}>Début</label>
            <select id="debut" value={form.start} onChange={set('start')} className={champ}>
              {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="fin" className={label}>Fin</label>
            <select id="fin" value={form.end} onChange={set('end')} className={champ}>
              {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label htmlFor="matiere" className={label}>Matière</label>
            <input id="matiere" type="text" value={form.subject} onChange={set('subject')} placeholder="ex : Mathématiques" className={champ} />
          </div>
          <div>
            <label htmlFor="intervenant" className={label}>Intervenant</label>
            <input id="intervenant" type="text" value={form.intervenant} onChange={set('intervenant')} placeholder="ex : M. Martin" className={champ} />
          </div>
          <div>
            <label htmlFor="salle" className={label}>Salle</label>
            <select id="salle" value={form.room} onChange={set('room')} className={champ}>
              {roomOptions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>

        {error && <p role="alert" className="mb-3 text-xs text-[#B23A3A]">{error}</p>}
        {confirmOverlap && (
          <p role="alert" className="mb-3 rounded-lg bg-[#FFF3D6] px-3 py-2 text-xs text-[#8A5A00]">
            Ce créneau chevauche un autre cours de la classe. Cliquez à nouveau sur « Enregistrer » pour confirmer.
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-[#E1E5EE]">
          {course && (
            confirmDelete
              ? <button type="button" onClick={onDelete} className={btnDanger}><Icon name="trash" /> Confirmer</button>
              : <button type="button" onClick={() => setConfirmDelete(true)} className={btnDanger}><Icon name="trash" /> Supprimer</button>
          )}
          <div className="flex gap-2 ml-auto">
            <button type="button" onClick={onClose} className={btnSecondaire}>Annuler</button>
            <button type="submit" className={btnPrimaire}>Enregistrer</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
