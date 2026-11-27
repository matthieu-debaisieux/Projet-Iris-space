import { useState } from 'react';
import DataState from '@/components/ui/DataState.jsx';
import Modal from '@/components/ui/Modal.jsx';
import { useAsync } from '@/hooks/useAsync.js';
import { messageLisible } from '@/services/api.js';
import { jourISO } from '@/services/emploiDuTemps.js';
import {
  creerClasse, creerCours, creerSalle, getClasses, getCours, getMatieres, getProfesseurs, getSalles,
  modifierCours, supprimerCours,
} from '@/services/planning.js';
import {
  addDays, btnDanger, btnPrimaire, btnSecondaire, card, champ, Chip, coursParJour, DAY_NAMES,
  getMonday, Icon, label, NavigationSemaine, Stat, statsSemaine, TIME_OPTIONS, TimetableGrid, toDecimalHour,
} from './commun.jsx';

const triAlpha = (a, b) => a.nom.localeCompare(b.nom, 'fr', { numeric: true });
const erreurAction = (err, defaut) => messageLisible(err) ?? defaut;

// Vue « gestion » (droit `emploi_du_temps_gerer`) : créer des classes, des salles,
// ajouter / modifier / supprimer des cours directement depuis la grille.
export default function Gestion() {
  const referentiel = useAsync(() =>
    Promise.all([getClasses(), getSalles()]).then(([classes, salles]) => ({ classes, salles })),
  );

  return (
    <div className="flex-1 overflow-y-auto bg-[var(--color-page)]">
      <div className="mx-auto w-full max-w-[1200px] px-6 py-8">
        <DataState state={referentiel}>{() => <Contenu referentiel={referentiel} />}</DataState>
      </div>
    </div>
  );
}

function Contenu({ referentiel }) {
  const { classes, salles } = referentiel.data;
  const [chosenClassId, setChosenClassId] = useState(null);
  const selectedClass = classes.find(c => c.id === chosenClassId) ?? classes[0] ?? null;
  const selectedClassId = selectedClass?.id ?? null;

  const [monday, setMonday] = useState(() => getMonday(new Date()));
  const coursState = useAsync(
    () => (selectedClassId ? getCours(selectedClassId, monday, addDays(monday, 4)) : Promise.resolve([])),
    [selectedClassId, monday],
  );

  // modale courante : { type: 'class' | 'room' | 'course', editing? }
  const [modal, setModal] = useState(null);
  const closeModal = () => setModal(null);
  const openCourseModal = (editing = {}) => setModal({ type: 'course', editing });

  const classData = coursParJour(coursState.data ?? []);
  const stats = statsSemaine(classData);

  async function addClass(nom) {
    const nouvelle = await creerClasse(nom);
    referentiel.setData(d => ({ ...d, classes: [...d.classes, nouvelle].sort(triAlpha) }));
    setChosenClassId(nouvelle.id);
    closeModal();
  }

  async function addRoom(nom) {
    const nouvelle = await creerSalle(nom);
    referentiel.setData(d => ({ ...d, salles: [...d.salles, nouvelle].sort(triAlpha) }));
    closeModal();
  }

  async function saveCourse(payload) {
    const existingId = modal?.editing?.course?.id;
    if (existingId) {
      await modifierCours(existingId, payload);
    } else {
      await creerCours(payload);
    }
    coursState.reload();
    closeModal();
  }

  async function deleteCourse(id) {
    await supprimerCours(id);
    coursState.reload();
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
          <button
            type="button"
            onClick={() => openCourseModal()}
            disabled={!selectedClass}
            className={`${btnPrimaire} disabled:opacity-50`}
          >
            <Icon name="plus" /> Ajouter un cours
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Choisir une classe">
          {classes.map(c => (
            <Chip key={c.id} active={c.id === selectedClassId} onClick={() => setChosenClassId(c.id)}>
              {c.nom}
            </Chip>
          ))}
        </div>
        <div className="flex gap-3">
          <Stat nom="Cours" valeur={stats.cours} />
          <Stat nom="Heures" valeur={stats.heures} />
          <Stat nom="Salles" valeur={salles.length} />
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
          <DataState state={coursState}>{() => (
            <div className={coursState.loading ? 'opacity-60 transition-opacity' : ''}>
              <TimetableGrid
                classData={classData}
                monday={monday}
                onCourseClick={(day, index) => openCourseModal({ day, index, course: classData[day][index] })}
                onAddCourse={(day, start) => openCourseModal({ day, start })}
              />
            </div>
          )}</DataState>
        ) : (
          <p className="py-12 text-center text-sm text-[#6B7185]">Créez une classe pour commencer.</p>
        )}
      </section>

      {modal?.type === 'class' && (
        <NameModal
          title="Nouvelle classe"
          fieldLabel="Nom de la classe"
          placeholder="ex : BTS SIO 3"
          maxLength={50}
          onConfirm={addClass}
          onClose={closeModal}
        />
      )}
      {modal?.type === 'room' && (
        <NameModal
          title="Nouvelle salle"
          fieldLabel="Nom de la salle"
          placeholder="ex : Labo 4"
          maxLength={50}
          onConfirm={addRoom}
          onClose={closeModal}
        />
      )}
      {modal?.type === 'course' && selectedClass && (
        <CourseModal
          classe={selectedClass}
          monday={monday}
          editing={modal.editing}
          salles={salles}
          onSave={saveCourse}
          onDelete={deleteCourse}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

// ── Modale : saisir un nom (classe / salle) ─────────────────────────────────
function NameModal({ title, fieldLabel, placeholder, maxLength = 50, onConfirm, onClose }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Merci de saisir un nom.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await onConfirm(trimmed);
    } catch (err) {
      setError(erreurAction(err, "Impossible d'enregistrer."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal onClose={() => { if (!busy) onClose(); }} className="max-w-sm rounded-2xl p-6" label={title}>
      <form onSubmit={submit}>
        <h3 className="text-lg font-bold text-[#001257] mb-4">{title}</h3>
        <label htmlFor="nom" className={label}>{fieldLabel}</label>
        <input
          id="nom"
          autoFocus
          type="text"
          maxLength={maxLength}
          placeholder={placeholder}
          value={name}
          onChange={e => setName(e.target.value)}
          disabled={busy}
          className={champ}
        />
        {error && <p role="alert" className="mt-2 text-xs text-[#B23A3A]">{error}</p>}
        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={onClose} disabled={busy} className={btnSecondaire}>Annuler</button>
          <button type="submit" disabled={busy} className={`${btnPrimaire} disabled:opacity-50`}>
            {busy ? 'Ajout…' : 'Ajouter'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Modale : ajouter / modifier un cours ────────────────────────────────────
// `editing` = { day, index, course } en modification, sinon { day?, start? } en création
function CourseModal({ classe, monday, editing, salles, onSave, onDelete, onClose }) {
  const course = editing.course;
  const defaultStart = editing.start || TIME_OPTIONS[0];
  const defaultEndIndex = Math.min(TIME_OPTIONS.indexOf(defaultStart) + 2, TIME_OPTIONS.length - 1);

  const [form, setForm] = useState({
    day:          editing.day || DAY_NAMES[0],
    start:        course?.start ?? defaultStart,
    end:          course?.end ?? TIME_OPTIONS[defaultEndIndex >= 0 ? defaultEndIndex : 2],
    matiereId:    course?.matiereId ? String(course.matiereId) : '',
    professeurId: course?.professeurId ? String(course.professeurId) : '',
    salleId:      course?.salleId ? String(course.salleId) : '',
    annule:       Boolean(course?.annule),
    commentaire:  course?.commentaire ?? '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const matieresState = useAsync(() => getMatieres(classe.id), [classe.id]);
  const profsState = useAsync(
    () => (form.matiereId ? getProfesseurs(form.matiereId) : Promise.resolve([])),
    [form.matiereId],
  );

  const matieres = matieresState.data ?? [];
  const professeurs = profsState.data ?? [];

  const timeOptions = [...new Set([
    ...TIME_OPTIONS,
    ...(course?.start ? [course.start] : []),
    ...(course?.end ? [course.end] : []),
  ])].sort((a, b) => toDecimalHour(a) - toDecimalHour(b));

  const set = key => e => {
    setError('');
    setForm(f => ({ ...f, [key]: e.target.value }));
  };

  function handleMatiereChange(e) {
    const matiereId = e.target.value;
    setError('');
    setForm(f => ({ ...f, matiereId, professeurId: '' }));
  }

  async function save(e) {
    e.preventDefault();
    if (!form.matiereId) return setError('Merci de choisir une matière.');
    if (!form.professeurId) return setError('Merci de choisir un intervenant.');
    if (toDecimalHour(form.end) <= toDecimalHour(form.start)) {
      return setError("L'heure de fin doit être après l'heure de début.");
    }

    const dayIndex = DAY_NAMES.indexOf(form.day);
    const jour = jourISO(addDays(monday, dayIndex >= 0 ? dayIndex : 0));
    const horaire = h => `${jour}T${h.replace('h', ':')}`;

    const payload = {
      classe_id: classe.id,
      matiere_id: Number(form.matiereId),
      professeur_id: form.professeurId,
      salle_id: form.salleId ? Number(form.salleId) : null,
      debut: horaire(form.start),
      fin: horaire(form.end),
      annule: form.annule,
      commentaire: form.commentaire.trim() || null,
    };

    setError('');
    setBusy(true);
    try {
      await onSave(payload);
    } catch (err) {
      setError(erreurAction(err, "Impossible d'enregistrer le cours."));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!course?.id) return;
    setError('');
    setBusy(true);
    try {
      await onDelete(course.id);
    } catch (err) {
      setError(erreurAction(err, 'Impossible de supprimer le cours.'));
    } finally {
      setBusy(false);
    }
  }

  const erreurChargement = matieresState.error || profsState.error;

  return (
    <Modal
      onClose={() => { if (!busy) onClose(); }}
      className="max-w-md rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
      label={course ? 'Modifier le cours' : 'Ajouter un cours'}
    >
      <form onSubmit={save}>
        <h3 className="text-lg font-bold text-[#001257]">{course ? 'Modifier le cours' : 'Ajouter un cours'}</h3>
        <p className="text-xs text-[#6B7185] mb-5">Classe {classe.nom}</p>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="col-span-2">
            <label htmlFor="jour" className={label}>Jour</label>
            <select id="jour" value={form.day} onChange={set('day')} disabled={busy} className={champ}>
              {DAY_NAMES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="debut" className={label}>Début</label>
            <select id="debut" value={form.start} onChange={set('start')} disabled={busy} className={champ}>
              {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="fin" className={label}>Fin</label>
            <select id="fin" value={form.end} onChange={set('end')} disabled={busy} className={champ}>
              {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label htmlFor="matiere" className={label}>Matière</label>
            <select
              id="matiere"
              value={form.matiereId}
              onChange={handleMatiereChange}
              disabled={busy || matieresState.loading}
              className={champ}
            >
              <option value="">
                {matieresState.loading
                  ? 'Chargement…'
                  : (matieres.length ? 'Choisir une matière…' : 'Aucune matière au programme')}
              </option>
              {matieres.map(m => <option key={m.id} value={String(m.id)}>{m.nom}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="intervenant" className={label}>Intervenant</label>
            <select
              id="intervenant"
              value={form.professeurId}
              onChange={set('professeurId')}
              disabled={busy || !form.matiereId || profsState.loading}
              className={champ}
            >
              <option value="">
                {!form.matiereId
                  ? "Choisir d'abord une matière"
                  : (profsState.loading
                    ? 'Chargement…'
                    : (professeurs.length ? 'Choisir un intervenant…' : 'Aucun intervenant'))}
              </option>
              {professeurs.map(p => <option key={p.id} value={String(p.id)}>{p.nom}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="salle" className={label}>Salle</label>
            <select id="salle" value={form.salleId} onChange={set('salleId')} disabled={busy} className={champ}>
              <option value="">Aucune salle</option>
              {salles.map(s => <option key={s.id} value={String(s.id)}>{s.nom}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label htmlFor="commentaire" className={label}>Commentaire (facultatif)</label>
            <input
              id="commentaire"
              type="text"
              maxLength={500}
              value={form.commentaire}
              onChange={set('commentaire')}
              placeholder="ex : Apporter un PC"
              disabled={busy}
              className={champ}
            />
          </div>
          {course && (
            <div className="col-span-2">
              <label className="inline-flex items-center gap-2 text-sm text-[#1A1D2E] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.annule}
                  onChange={e => {
                    setError('');
                    setForm(f => ({ ...f, annule: e.target.checked }));
                  }}
                  disabled={busy}
                  className="rounded border-[#E1E5EE]"
                />
                Cours annulé
              </label>
            </div>
          )}
        </div>

        {erreurChargement && (
          <p role="alert" className="mb-3 text-xs text-[#B23A3A]">
            {erreurAction(erreurChargement, 'Impossible de charger les options du formulaire.')}
          </p>
        )}
        {error && (
          <p role="alert" className="mb-3 rounded-lg bg-[#FBE6E6] px-3 py-2 text-xs text-[#B23A3A]">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-[#E1E5EE]">
          {course && (
            confirmDelete
              ? (
                <button type="button" onClick={remove} disabled={busy} className={`${btnDanger} disabled:opacity-50`}>
                  <Icon name="trash" /> {busy ? 'Suppression…' : 'Confirmer'}
                </button>
              )
              : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  disabled={busy}
                  className={`${btnDanger} disabled:opacity-50`}
                >
                  <Icon name="trash" /> Supprimer
                </button>
              )
          )}
          <div className="flex gap-2 ml-auto">
            <button type="button" onClick={onClose} disabled={busy} className={btnSecondaire}>Annuler</button>
            <button type="submit" disabled={busy} className={`${btnPrimaire} disabled:opacity-50`}>
              {busy ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
