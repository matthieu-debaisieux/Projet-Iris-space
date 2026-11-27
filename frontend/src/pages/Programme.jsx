import { useMemo, useState } from 'react';
import DataState from '@/components/ui/DataState.jsx';
import Modal from '@/components/ui/Modal.jsx';
import { useAsync } from '@/hooks/useAsync.js';
import {
  createMatiere,
  getProgrammeClasses,
  getProgrammeMatieres,
  getProgrammeProfesseurs,
  updateClasseMatieres,
  updateProfesseurMatieres,
} from '@/services/programme.js';

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#07A6A6]';
const labelClass = 'block text-xs font-semibold text-[var(--color-principal)] mb-1';

function formaterCoefficient(valeur) {
  const n = Number(valeur);
  if (Number.isNaN(n)) return String(valeur ?? '1');
  return Number.isInteger(n) ? String(n) : String(n).replace('.', ',');
}

function MatiereFormModal({ onCreated, onClose }) {
  const [nom, setNom] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!nom.trim()) {
      setError('Le nom de la matière est requis.');
      return;
    }

    setBusy(true);
    try {
      const created = await createMatiere({ code, nom });
      onCreated(created);
    } catch (err) {
      setError(err?.message || 'Impossible de créer la matière.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal onClose={() => { if (!busy) onClose(); }} className="max-w-md rounded-2xl p-6" label="Créer une matière">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--color-principal)]">Nouvelle matière</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Ajoutez une matière au référentiel pour pouvoir l&apos;associer aux professeurs et aux classes.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="text-2xl leading-none text-gray-400 hover:text-gray-600"
          aria-label="Fermer"
        >
          ×
        </button>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="matiere-nom" className={labelClass}>
            Nom <span className="text-[#EC6F6F]">*</span>
          </label>
          <input
            id="matiere-nom"
            type="text"
            maxLength={100}
            value={nom}
            onChange={e => setNom(e.target.value)}
            placeholder="ex. Architecture logicielle"
            className={inputClass}
            disabled={busy}
            autoFocus
          />
        </div>

        <div>
          <label htmlFor="matiere-code" className={labelClass}>Code (facultatif)</label>
          <input
            id="matiere-code"
            type="text"
            maxLength={20}
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="ex. ARCHI"
            className={inputClass}
            disabled={busy}
          />
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 font-medium">
            {error}
          </div>
        )}

        <div className="modal-action mt-2">
          <button type="button" onClick={onClose} disabled={busy} className="btn btn-ghost">
            Annuler
          </button>
          <button
            type="submit"
            disabled={busy}
            className="btn bg-[#07A6A6] hover:bg-[#07A6A6]/90 text-white border-0"
          >
            {busy ? 'Création…' : 'Créer la matière'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ProfesseurMatieresModal({ professeur, toutesMatieres, onSaved, onClose }) {
  const [selection, setSelection] = useState(() => new Set((professeur.matieres ?? []).map(m => m.id)));
  const [filtre, setFiltre] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const matieresFiltrees = useMemo(() => {
    const q = filtre.trim().toLowerCase();
    if (!q) return toutesMatieres;
    return toutesMatieres.filter(
      m => m.nom.toLowerCase().includes(q) || (m.code ?? '').toLowerCase().includes(q),
    );
  }, [toutesMatieres, filtre]);

  function toggle(id) {
    setSelection(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const matieres = await updateProfesseurMatieres(professeur.id, Array.from(selection));
      onSaved(professeur.id, matieres);
    } catch (err) {
      setError(err?.message || "Impossible d'enregistrer les matières du professeur.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      onClose={() => { if (!busy) onClose(); }}
      className="max-w-lg rounded-2xl p-6 max-h-[90vh] flex flex-col"
      label="Matières du professeur"
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--color-principal)]">
            {[professeur.prenom, professeur.nom].filter(Boolean).join(' ')}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Cochez les matières enseignées par ce professeur ({selection.size} sélectionnée{selection.size > 1 ? 's' : ''}).
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="text-2xl leading-none text-gray-400 hover:text-gray-600"
          aria-label="Fermer"
        >
          ×
        </button>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3 min-h-0 flex-1">
        <input
          type="search"
          value={filtre}
          onChange={e => setFiltre(e.target.value)}
          placeholder="Filtrer les matières…"
          className="input input-bordered input-sm w-full"
          disabled={busy}
        />

        <div className="overflow-y-auto max-h-72 border border-gray-200 rounded-xl divide-y divide-gray-100">
          {matieresFiltrees.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-6">Aucune matière disponible.</p>
          ) : (
            matieresFiltrees.map(m => {
              const checked = selection.has(m.id);
              return (
                <label
                  key={m.id}
                  className={`flex items-center justify-between gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 ${
                    checked ? 'bg-teal-50/50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(m.id)}
                      disabled={busy}
                      className="checkbox checkbox-sm checkbox-accent"
                    />
                    <span className="text-sm font-medium text-[var(--color-principal)] truncate">{m.nom}</span>
                  </div>
                  {m.code && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-600 shrink-0">
                      {m.code}
                    </span>
                  )}
                </label>
              );
            })
          )}
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 font-medium">
            {error}
          </div>
        )}

        <div className="modal-action mt-2">
          <button type="button" onClick={onClose} disabled={busy} className="btn btn-ghost">
            Annuler
          </button>
          <button
            type="submit"
            disabled={busy}
            className="btn bg-[#07A6A6] hover:bg-[#07A6A6]/90 text-white border-0"
          >
            {busy ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ClasseMatieresModal({ classe, toutesMatieres, onSaved, onClose }) {
  const [selection, setSelection] = useState(() => {
    const map = {};
    for (const m of classe.matieres ?? []) {
      map[m.id] = String(Number(m.coefficient ?? 1));
    }
    return map;
  });
  const [filtre, setFiltre] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const matieresFiltrees = useMemo(() => {
    const q = filtre.trim().toLowerCase();
    if (!q) return toutesMatieres;
    return toutesMatieres.filter(
      m => m.nom.toLowerCase().includes(q) || (m.code ?? '').toLowerCase().includes(q),
    );
  }, [toutesMatieres, filtre]);

  function toggle(id) {
    setSelection(prev => {
      const next = { ...prev };
      if (Object.hasOwn(next, id)) delete next[id];
      else next[id] = '1';
      return next;
    });
  }

  function setCoeff(id, value) {
    setSelection(prev => ({ ...prev, [id]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    setError('');

    const payload = [];
    for (const [idStr, coeffStr] of Object.entries(selection)) {
      const coeff = Number(String(coeffStr).replace(',', '.'));
      if (Number.isNaN(coeff) || coeff <= 0 || coeff >= 100) {
        const nom = toutesMatieres.find(m => m.id === Number(idStr))?.nom ?? `#${idStr}`;
        setError(`Le coefficient de « ${nom} » doit être compris entre 0 et 100 (ex. 2 ou 1.5).`);
        return;
      }
      payload.push({ matiere_id: Number(idStr), coefficient: coeff });
    }

    setBusy(true);
    try {
      const matieres = await updateClasseMatieres(classe.id, payload);
      onSaved(classe.id, matieres);
    } catch (err) {
      setError(err?.message || "Impossible d'enregistrer le programme de la classe.");
    } finally {
      setBusy(false);
    }
  }

  const nbSelectionnees = Object.keys(selection).length;

  return (
    <Modal
      onClose={() => { if (!busy) onClose(); }}
      className="max-w-xl rounded-2xl p-6 max-h-[90vh] flex flex-col"
      label="Programme de la classe"
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--color-principal)]">
            Programme — {classe.nom}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {[classe.annee_scolaire, classe.campus].filter(Boolean).join(' · ')} — {nbSelectionnees} matière{nbSelectionnees > 1 ? 's' : ''} au programme.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="text-2xl leading-none text-gray-400 hover:text-gray-600"
          aria-label="Fermer"
        >
          ×
        </button>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3 min-h-0 flex-1">
        <input
          type="search"
          value={filtre}
          onChange={e => setFiltre(e.target.value)}
          placeholder="Filtrer les matières…"
          className="input input-bordered input-sm w-full"
          disabled={busy}
        />

        <div className="overflow-y-auto max-h-80 border border-gray-200 rounded-xl divide-y divide-gray-100">
          {matieresFiltrees.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-6">Aucune matière disponible.</p>
          ) : (
            matieresFiltrees.map(m => {
              const checked = Object.hasOwn(selection, m.id);
              return (
                <div
                  key={m.id}
                  className={`flex items-center justify-between gap-3 px-3 py-2.5 ${
                    checked ? 'bg-teal-50/50' : 'hover:bg-gray-50'
                  }`}
                >
                  <label className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(m.id)}
                      disabled={busy}
                      className="checkbox checkbox-sm checkbox-accent"
                    />
                    <span className="text-sm font-medium text-[var(--color-principal)] truncate">{m.nom}</span>
                    {m.code && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-600 shrink-0">
                        {m.code}
                      </span>
                    )}
                  </label>
                  {checked && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <label htmlFor={`coeff-${m.id}`} className="text-xs text-gray-500">
                        Coeff.
                      </label>
                      <input
                        id={`coeff-${m.id}`}
                        type="number"
                        step="any"
                        min="0.01"
                        max="99.99"
                        value={selection[m.id]}
                        onChange={e => setCoeff(m.id, e.target.value)}
                        disabled={busy}
                        className="w-20 rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#07A6A6]"
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 font-medium">
            {error}
          </div>
        )}

        <div className="modal-action mt-2">
          <button type="button" onClick={onClose} disabled={busy} className="btn btn-ghost">
            Annuler
          </button>
          <button
            type="submit"
            disabled={busy}
            className="btn bg-[#07A6A6] hover:bg-[#07A6A6]/90 text-white border-0"
          >
            {busy ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

const ONGLETS = [
  { id: 'classes', label: 'Classes et coefficients' },
  { id: 'professeurs', label: 'Professeurs et matières' },
  { id: 'matieres', label: 'Matières' },
];

export default function Programme() {
  const matieresState = useAsync(getProgrammeMatieres);
  const professeursState = useAsync(getProgrammeProfesseurs);
  const classesState = useAsync(getProgrammeClasses);

  const [onglet, setOnglet] = useState('classes');
  const [recherche, setRecherche] = useState('');
  const [modal, setModal] = useState(null);
  const [feedback, setFeedback] = useState('');

  const matieres = matieresState.data ?? [];
  const professeurs = professeursState.data ?? [];
  const classes = classesState.data ?? [];

  const q = recherche.trim().toLowerCase();

  const matieresFiltrees = useMemo(() => {
    if (!q) return matieres;
    return matieres.filter(
      m => m.nom.toLowerCase().includes(q) || (m.code ?? '').toLowerCase().includes(q),
    );
  }, [matieres, q]);

  const professeursFiltres = useMemo(() => {
    if (!q) return professeurs;
    return professeurs.filter(p => {
      const nomsMatieres = (p.matieres ?? []).map(m => `${m.nom} ${m.code ?? ''}`).join(' ');
      const cible = `${p.prenom ?? ''} ${p.nom ?? ''} ${p.identifiant ?? ''} ${nomsMatieres}`.toLowerCase();
      return cible.includes(q);
    });
  }, [professeurs, q]);

  const classesFiltrees = useMemo(() => {
    if (!q) return classes;
    return classes.filter(c => {
      const nomsMatieres = (c.matieres ?? []).map(m => `${m.nom} ${m.code ?? ''}`).join(' ');
      const cible = `${c.nom ?? ''} ${c.annee_scolaire ?? ''} ${c.campus ?? ''} ${nomsMatieres}`.toLowerCase();
      return cible.includes(q);
    });
  }, [classes, q]);

  function handleMatiereCreated(created) {
    matieresState.setData(prev => {
      const next = [...(prev ?? []), { ...created, nb_professeurs: 0, nb_classes: 0 }];
      return next.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
    });
    setModal(null);
    setFeedback(`Matière « ${created.nom} » créée.`);
  }

  function handleProfesseurSaved(profId, matieresMaj) {
    professeursState.setData(prev =>
      (prev ?? []).map(p => (p.id === profId ? { ...p, matieres: matieresMaj } : p)),
    );
    matieresState.reload();
    setModal(null);
    setFeedback('Matières du professeur mises à jour.');
  }

  function handleClasseSaved(classeId, matieresMaj) {
    classesState.setData(prev =>
      (prev ?? []).map(c => (c.id === classeId ? { ...c, matieres: matieresMaj } : c)),
    );
    matieresState.reload();
    setModal(null);
    setFeedback('Programme de la classe mis à jour.');
  }

  function reloadTout() {
    matieresState.reload();
    professeursState.reload();
    classesState.reload();
  }

  return (
    <>
      <main className="flex-1 overflow-y-auto p-6 bg-[#F5F5F5]">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-[#07A6A6]">Programme pédagogique</h1>
            <p className="text-sm text-gray-600 mt-1">
              Matières, affectation des professeurs et coefficients par classe.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModal({ type: 'create-matiere' })}
            className="inline-flex items-center gap-2 bg-[#E8735A] text-white font-semibold text-sm sm:text-base px-5 py-2.5 rounded-full hover:brightness-90 transition shadow-sm"
          >
            Nouvelle matière
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* Cartes résumé */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Matières</p>
            <p className="text-2xl font-bold text-[var(--color-principal)] mt-1">{matieres.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Professeurs</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{professeurs.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-teal-200 p-4 shadow-sm">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Classes</p>
            <p className="text-2xl font-bold text-[#07A6A6] mt-1">{classes.length}</p>
          </div>
        </div>

        {feedback && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
            <span>{feedback}</span>
            <button type="button" onClick={() => setFeedback('')} className="font-bold text-emerald-700 hover:underline text-xs">
              Fermer
            </button>
          </div>
        )}

        <section className="bg-white rounded-xl shadow-md p-5">
          {/* Onglets + recherche */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5 border-b border-gray-200 pb-4">
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Sections du programme">
              {ONGLETS.map(o => {
                const actif = onglet === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    role="tab"
                    aria-selected={actif}
                    onClick={() => setOnglet(o.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                      actif
                        ? 'bg-[var(--color-principal)] text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 flex-1 sm:flex-initial min-w-[220px]">
              <input
                type="search"
                value={recherche}
                onChange={e => setRecherche(e.target.value)}
                placeholder="Rechercher…"
                className="input input-bordered input-sm flex-1 min-w-[180px]"
              />
              <button
                type="button"
                onClick={reloadTout}
                className="btn btn-sm btn-ghost text-[#07A6A6]"
              >
                Actualiser
              </button>
            </div>
          </div>

          {onglet === 'classes' && (
            <DataState state={classesState}>{() => (
              classesFiltrees.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">Aucune classe trouvée.</p>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {classesFiltrees.map(c => (
                    <article key={c.id} className="rounded-xl border border-gray-200 p-4 flex flex-col gap-3 hover:border-[#07A6A6]/60 transition">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-base font-bold text-[var(--color-principal)]">{c.nom}</h2>
                            {c.courante && (
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                Année en cours
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {[c.annee_scolaire, c.campus].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setModal({ type: 'edit-classe', classe: c })}
                          className="btn btn-xs bg-[#07A6A6] hover:bg-[#07A6A6]/90 text-white border-0 shrink-0"
                        >
                          Modifier
                        </button>
                      </div>

                      {c.matieres && c.matieres.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {c.matieres.map(m => (
                            <span
                              key={m.id}
                              className="inline-flex items-center gap-1.5 rounded-full bg-[#EEF1F7] px-3 py-1 text-xs font-medium text-[#001257]"
                            >
                              <span>{m.nom}</span>
                              <span className="rounded-full bg-white px-1.5 py-0.5 text-[11px] font-bold text-[#07A6A6]">
                                Coeff. {formaterCoefficient(m.coefficient)}
                              </span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic">Aucune matière au programme pour cette classe.</p>
                      )}
                    </article>
                  ))}
                </div>
              )
            )}</DataState>
          )}

          {onglet === 'professeurs' && (
            <DataState state={professeursState}>{() => (
              professeursFiltres.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">Aucun professeur trouvé.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table table-sm w-full">
                    <thead>
                      <tr className="text-xs uppercase text-gray-500 border-b border-gray-200">
                        <th>Professeur</th>
                        <th>Statut</th>
                        <th>Matières enseignées</th>
                        <th className="text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {professeursFiltres.map(p => {
                        const estActif = p.actif !== false;
                        return (
                          <tr key={p.id} className="hover:bg-gray-50 border-b border-gray-100">
                            <td>
                              <div className="font-semibold text-[var(--color-principal)]">
                                {[p.prenom, p.nom].filter(Boolean).join(' ') || p.identifiant}
                              </div>
                              <div className="text-xs text-gray-500">@{p.identifiant}</div>
                            </td>
                            <td>
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  estActif ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'
                                }`}
                              >
                                {estActif ? 'Actif' : 'Désactivé'}
                              </span>
                            </td>
                            <td>
                              {p.matieres && p.matieres.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {p.matieres.map(m => (
                                    <span
                                      key={m.id}
                                      className="inline-flex items-center gap-1 rounded-full bg-[#EEF1F7] px-2.5 py-0.5 text-xs font-medium text-[#001257]"
                                    >
                                      {m.nom}
                                      {m.code && <span className="text-[10px] text-gray-500">({m.code})</span>}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400 italic">Aucune matière assignée</span>
                              )}
                            </td>
                            <td className="text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => setModal({ type: 'edit-prof', professeur: p })}
                                className="btn btn-xs btn-ghost text-[#07A6A6]"
                              >
                                Modifier les matières
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            )}</DataState>
          )}

          {onglet === 'matieres' && (
            <DataState state={matieresState}>{() => (
              matieresFiltrees.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">Aucune matière trouvée.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table table-sm w-full">
                    <thead>
                      <tr className="text-xs uppercase text-gray-500 border-b border-gray-200">
                        <th>Matière</th>
                        <th>Code</th>
                        <th className="text-center">Professeurs</th>
                        <th className="text-center">Classes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matieresFiltrees.map(m => (
                        <tr key={m.id} className="hover:bg-gray-50 border-b border-gray-100">
                          <td className="font-semibold text-[var(--color-principal)]">{m.nom}</td>
                          <td>
                            {m.code ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs font-semibold">
                                {m.code}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                          <td className="text-center text-sm text-gray-700">{Number(m.nb_professeurs ?? 0)}</td>
                          <td className="text-center text-sm text-gray-700">{Number(m.nb_classes ?? 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}</DataState>
          )}
        </section>
      </main>

      {modal?.type === 'create-matiere' && (
        <MatiereFormModal
          onClose={() => setModal(null)}
          onCreated={handleMatiereCreated}
        />
      )}

      {modal?.type === 'edit-prof' && (
        <ProfesseurMatieresModal
          professeur={modal.professeur}
          toutesMatieres={matieres}
          onClose={() => setModal(null)}
          onSaved={handleProfesseurSaved}
        />
      )}

      {modal?.type === 'edit-classe' && (
        <ClasseMatieresModal
          classe={modal.classe}
          toutesMatieres={matieres}
          onClose={() => setModal(null)}
          onSaved={handleClasseSaved}
        />
      )}
    </>
  );
}
