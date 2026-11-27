import { useState } from 'react';
import '@tabler/icons-webfont/dist/tabler-icons.min.css';
import Modal from '@/components/ui/Modal.jsx';
import DataState from '@/components/ui/DataState.jsx';
import { useAsync } from '@/hooks/useAsync.js';
import {
  COMMENTAIRE_NOTE_MAX, PERIODE_MAX, TITRE_EVALUATION_MAX,
  creerEvaluation, enregistrerNotes, formatDate, formatNombre, getClassesProf, getEvaluations,
  getNotesEvaluation, modifierEvaluation, supprimerEvaluation,
} from '@/services/notes.js';

// ─────────────────────────────────────────────────────────────────────────────
// Page Notes du professeur (droit `notes_gerer`) :
//   - la liste de ses évaluations, filtrable par classe et par matière ;
//   - « Nouvelle évaluation » (classe, matière, titre, date, barème, coefficient, période) ;
//   - pour chaque évaluation, une grille de saisie : une ligne par élève de la classe
//     (note sur le barème, case « Absent », commentaire), enregistrée en une fois et modifiable ensuite.
// Le back (prof.php) ne laisse un professeur toucher qu'à ses propres évaluations.
// ─────────────────────────────────────────────────────────────────────────────

const btnPrincipal = 'inline-flex items-center gap-2 rounded-lg bg-[#EC6F6F] px-4 py-2.5 text-sm font-bold text-[#001257] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition';
const btnSecondaire = 'inline-flex items-center gap-1.5 rounded-lg border border-[#E1E5EE] bg-white px-3.5 py-2 text-sm font-semibold text-[#001257] hover:bg-[#EEF1F7] disabled:opacity-50 disabled:cursor-not-allowed transition';
const btnDanger = 'inline-flex items-center gap-1.5 rounded-lg bg-[#B23A3A] px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition';
const etiquette = 'block mb-1.5 text-xs font-semibold text-[#1A1D2E]';
const champ = invalide => `w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:border-[#001257] disabled:bg-[#EEF1F7] disabled:text-[#6B7185] ${invalide ? 'border-[#B23A3A] bg-[#FBE6E6]' : 'border-[#E1E5EE] bg-white'}`;

const Icon = ({ name, size = 16, className = '' }) => (
  <i className={`ti ti-${name} ${className}`} style={{ fontSize: size }} aria-hidden="true" />
);

const deuxChiffres = n => String(n).padStart(2, '0');
const jourLocal = date => `${date.getFullYear()}-${deuxChiffres(date.getMonth() + 1)}-${deuxChiffres(date.getDate())}`;

// Les plus récentes d'abord, comme le back
const trier = liste => [...liste].sort((a, b) => b.date_eval.localeCompare(a.date_eval) || a.titre.localeCompare(b.titre));

// « 12,5 » ou « 12.5 » → 12.5 ; texte vide → null ; texte qui n'est pas un nombre positif → NaN
const lireDecimal = texte => {
  const t = String(texte ?? '').trim().replace(',', '.');
  if (!t) return null;
  return /^\d+(\.\d+)?$/.test(t) ? Number(t) : NaN;
};
const texteNombre = n => (n == null ? '' : String(n).replace('.', ','));
const nomComplet = n => `${n.prenom} ${n.nom}`.trim();
const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;
const notesSaisies = n => `${n} ${n > 1 ? 'notes saisies' : 'note saisie'}`;

export default function NotesProf() {
  const evaluations = useAsync(getEvaluations);
  const classes = useAsync(getClassesProf); // menus des filtres et du formulaire
  const [classeId, setClasseId] = useState('');
  const [matiereId, setMatiereId] = useState('');
  const [formulaire, setFormulaire] = useState(null); // null, { } (création) ou { evaluation } (modification)
  const [grille, setGrille] = useState(null);         // id de l'évaluation dont on saisit les notes
  const [aSupprimer, setASupprimer] = useState(null); // évaluation en attente de confirmation
  const [notice, setNotice] = useState(null);         // { texte } après une action réussie

  const listeClasses = classes.data ?? [];
  const classeFiltre = listeClasses.find(c => String(c.id) === classeId);
  // Matières du filtre : celles de la classe choisie, sinon toutes celles enseignées
  const matieresFiltre = classeFiltre
    ? classeFiltre.matieres
    : [...new Map(listeClasses.flatMap(c => c.matieres).map(m => [m.id, m])).values()].sort((a, b) => a.nom.localeCompare(b.nom));

  const changerClasse = valeur => {
    setClasseId(valeur);
    const suivante = listeClasses.find(c => String(c.id) === valeur);
    if (suivante && !suivante.matieres.some(m => String(m.id) === matiereId)) setMatiereId('');
  };

  const visibles = (evaluations.data ?? []).filter(e =>
    (!classeId || String(e.classe_id) === classeId) && (!matiereId || String(e.matiere_id) === matiereId));
  const evaluationGrille = grille ? evaluations.data?.find(e => e.id === grille) : null;

  // Les évaluations créées, modifiées ou supprimées s'appliquent à la liste sans la recharger
  const apresEnregistrement = (evaluation, creation) => {
    evaluations.setData(liste => trier([...(liste ?? []).filter(e => e.id !== evaluation.id), evaluation]));
    setFormulaire(null);
    setNotice({ texte: creation ? `L'évaluation « ${evaluation.titre} » a été créée. Saisissez maintenant les notes.` : `L'évaluation « ${evaluation.titre} » a été modifiée.` });
    if (creation) setGrille(evaluation.id);
  };
  const apresSuppression = evaluation => {
    evaluations.setData(liste => (liste ?? []).filter(e => e.id !== evaluation.id));
    setASupprimer(null);
    setNotice({ texte: `L'évaluation « ${evaluation.titre} » a été supprimée.` });
  };
  const apresSaisie = evaluation => {
    evaluations.setData(liste => (liste ?? []).map(e => (e.id === evaluation.id ? evaluation : e)));
  };

  return (
    <>
      <main className="flex-1 overflow-y-auto bg-[var(--color-page)]">
        <div className="mx-auto w-full max-w-[1100px] px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#001257]">Notes</h1>
              <p className="mt-1 text-sm text-[#6B7185]">Créez vos évaluations, saisissez les notes de vos classes et modifiez-les quand vous voulez.</p>
            </div>
            <button type="button" onClick={() => { setNotice(null); setFormulaire({}); }} className={btnPrincipal}>
              <Icon name="plus" /> Nouvelle évaluation
            </button>
          </div>

          {notice && (
            <div role="status" className="flex items-start gap-3 rounded-xl bg-[#E3F5EC] px-4 py-3 text-sm text-[#1E7F55]">
              <Icon name="circle-check" size={18} className="mt-0.5 shrink-0" />
              <p className="min-w-0 flex-1 font-semibold break-words">{notice.texte}</p>
              <button type="button" onClick={() => setNotice(null)} aria-label="Fermer le message" className="shrink-0 rounded p-1 hover:bg-black/5">
                <Icon name="x" size={16} />
              </button>
            </div>
          )}

          {/* Filtres */}
          <div className="flex flex-wrap gap-3">
            <div className="w-full sm:w-52">
              <label htmlFor="filtre-classe" className="sr-only">Filtrer par classe</label>
              <select id="filtre-classe" value={classeId} onChange={e => changerClasse(e.target.value)} className={champ(false)}>
                <option value="">Toutes les classes</option>
                {listeClasses.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </div>
            <div className="w-full sm:w-52">
              <label htmlFor="filtre-matiere" className="sr-only">Filtrer par matière</label>
              <select id="filtre-matiere" value={matiereId} onChange={e => setMatiereId(e.target.value)} className={champ(false)}>
                <option value="">Toutes les matières</option>
                {matieresFiltre.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
              </select>
            </div>
          </div>

          <DataState state={evaluations}>
            {liste => (visibles.length ? (
              <ul className="flex flex-col gap-3">
                {visibles.map(evaluation => (
                  <li key={evaluation.id}>
                    <CarteEvaluation
                      evaluation={evaluation}
                      onSaisie={() => { setNotice(null); setGrille(evaluation.id); }}
                      onModifier={() => { setNotice(null); setFormulaire({ evaluation }); }}
                      onSupprimer={() => setASupprimer(evaluation)}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-12 text-center text-sm text-[#6B7185]">
                {liste.length ? 'Aucune évaluation ne correspond à ce filtre.' : "Vous n'avez pas encore créé d'évaluation."}
              </p>
            ))}
          </DataState>
        </div>
      </main>

      {formulaire && (
        <FormulaireEvaluation
          classes={classes}
          evaluation={formulaire.evaluation}
          onEnregistre={apresEnregistrement}
          onClose={() => setFormulaire(null)}
        />
      )}
      {evaluationGrille && (
        <GrilleNotes
          evaluation={evaluationGrille}
          onEnregistre={apresSaisie}
          onClose={() => setGrille(null)}
        />
      )}
      {aSupprimer && (
        <ConfirmationSuppression evaluation={aSupprimer} onSupprimee={apresSuppression} onClose={() => setASupprimer(null)} />
      )}
    </>
  );
}

// ── Une évaluation de la liste ──────────────────────────────────────────────
function CarteEvaluation({ evaluation, onSaisie, onModifier, onSupprimer }) {
  const { notes, moyenne, bareme } = evaluation;
  return (
    <article className="rounded-2xl border border-[#E1E5EE] bg-white p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wide text-[#07A6A6]">{evaluation.classe} · {evaluation.matiere}</span>
          {evaluation.periode && (
            <span className="rounded-full bg-[#EEF1F7] px-2.5 py-0.5 text-[11px] font-semibold text-[#001257]">{evaluation.periode}</span>
          )}
        </div>
        <h2 className="text-base font-bold text-[#001257] leading-snug break-words">{evaluation.titre}</h2>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-[#6B7185]">
          <span className="inline-flex items-center gap-1.5"><Icon name="calendar" size={14} />{formatDate(evaluation.date_eval)}</span>
          <span>Coefficient {formatNombre(evaluation.coefficient)}</span>
          <span>Barème : /{formatNombre(bareme)}</span>
          <span className="font-semibold text-[#001257]">
            {notes ? `${notesSaisies(notes)} · moyenne de la classe : ${formatNombre(moyenne)}/${formatNombre(bareme)}` : 'Aucune note saisie'}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 shrink-0">
        <button type="button" onClick={onSaisie} className={btnPrincipal}>
          <Icon name="edit" /> {notes ? 'Voir / modifier les notes' : 'Saisir les notes'}
        </button>
        <button type="button" onClick={onModifier} className={btnSecondaire} aria-label={`Modifier l'évaluation ${evaluation.titre}`}>
          <Icon name="settings" /> Modifier
        </button>
        <button type="button" onClick={onSupprimer} className={btnSecondaire} aria-label={`Supprimer l'évaluation ${evaluation.titre}`}>
          <Icon name="trash" />
        </button>
      </div>
    </article>
  );
}

// ── Création / modification d'une évaluation ────────────────────────────────
// Champs envoyés : ceux de champsEvaluation dans le back (titre, date_eval, coefficient, bareme, periode)
// + classe_id et matiere_id à la création (ils ne se modifient plus ensuite).
function FormulaireEvaluation({ classes, evaluation, onEnregistre, onClose }) {
  const modification = Boolean(evaluation);
  const [classeId, setClasseId] = useState(modification ? String(evaluation.classe_id) : '');
  const [matiereId, setMatiereId] = useState(modification ? String(evaluation.matiere_id) : '');
  const [titre, setTitre] = useState(evaluation?.titre ?? '');
  const [date, setDate] = useState(evaluation?.date_eval ?? jourLocal(new Date()));
  const [bareme, setBareme] = useState(texteNombre(evaluation?.bareme ?? 20));
  const [coefficient, setCoefficient] = useState(texteNombre(evaluation?.coefficient ?? 1));
  const [periode, setPeriode] = useState(evaluation?.periode ?? '');
  const [erreurs, setErreurs] = useState({});
  const [erreurServeur, setErreurServeur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const listeClasses = classes.data ?? [];
  const classe = listeClasses.find(c => String(c.id) === classeId);
  const matieres = classe?.matieres ?? [];
  const pasDeClasse = !modification && !classes.error && classes.data !== undefined && listeClasses.length === 0;

  const changerClasse = valeur => {
    setClasseId(valeur);
    const suivante = listeClasses.find(c => String(c.id) === valeur);
    setMatiereId(suivante?.matieres.length === 1 ? String(suivante.matieres[0].id) : '');
    setErreurs(er => ({ ...er, classe: undefined, matiere: undefined }));
  };
  const saisir = (setter, cle) => valeur => {
    setter(valeur);
    setErreurs(er => ({ ...er, [cle]: undefined }));
  };

  const valider = () => {
    const errs = {};
    if (!modification && !classeId) errs.classe = 'Choisissez une classe.';
    if (!modification && !matiereId) errs.matiere = 'Choisissez une matière.';
    if (!titre.trim()) errs.titre = "Donnez un titre à l'évaluation.";
    else if (titre.trim().length > TITRE_EVALUATION_MAX) errs.titre = `Le titre ne doit pas dépasser ${TITRE_EVALUATION_MAX} caractères.`;
    if (!date) errs.date = 'Indiquez la date.';
    const b = lireDecimal(bareme);
    if (b === null || Number.isNaN(b) || b <= 0 || b >= 1000) errs.bareme = 'Le barème doit être un nombre entre 0 et 1000.';
    const c = lireDecimal(coefficient);
    if (c === null || Number.isNaN(c) || c <= 0 || c >= 100) errs.coefficient = 'Le coefficient doit être un nombre entre 0 et 100.';
    if (periode.trim().length > PERIODE_MAX) errs.periode = `La période ne doit pas dépasser ${PERIODE_MAX} caractères.`;
    return errs;
  };

  const envoyer = async e => {
    e.preventDefault();
    const errs = valider();
    setErreurs(errs);
    setErreurServeur('');
    if (Object.values(errs).some(Boolean)) return;

    const champs = {
      titre: titre.trim(),
      date_eval: date,
      bareme: lireDecimal(bareme),
      coefficient: lireDecimal(coefficient),
      periode: periode.trim(),
    };
    setEnvoi(true);
    try {
      const enregistree = modification
        ? await modifierEvaluation(evaluation.id, champs)
        : await creerEvaluation({ ...champs, classe_id: Number(classeId), matiere_id: Number(matiereId) });
      onEnregistre(enregistree, !modification);
    } catch (err) {
      setErreurServeur(err.message || "L'évaluation n'a pas pu être enregistrée. Réessayez.");
      setEnvoi(false);
    }
  };

  const erreurChamp = (cle, id) => erreurs[cle] && <p id={`${id}-erreur`} className="mt-1 text-xs text-[#B23A3A]">{erreurs[cle]}</p>;
  const aria = (cle, id) => ({ 'aria-invalid': Boolean(erreurs[cle]), 'aria-describedby': erreurs[cle] ? `${id}-erreur` : undefined });
  const titreModale = modification ? "Modifier l'évaluation" : 'Nouvelle évaluation';

  return (
    <Modal onClose={onClose} className="max-w-xl rounded-2xl max-h-[90vh] overflow-y-auto" label={titreModale}>
      <form onSubmit={envoyer} noValidate className="p-6 flex flex-col gap-4">
        <h2 className="text-xl font-bold text-[#001257]">{titreModale}</h2>

        {classes.error && !modification && (
          <p role="alert" className="rounded-lg bg-[#FBE6E6] px-3 py-2 text-xs font-medium text-[#B23A3A]">
            Impossible de charger vos classes et vos matières. Fermez cette fenêtre puis réessayez.
          </p>
        )}
        {pasDeClasse && (
          <p role="alert" className="rounded-lg bg-[#FFF3D6] px-3 py-2 text-xs font-medium text-[#8A5A00]">
            Aucune classe ne vous est rattachée pour le moment : demandez à l'administration de vérifier vos matières.
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="eval-classe" className={etiquette}>Classe *</label>
            <select
              id="eval-classe" autoFocus={!modification} required value={classeId} onChange={e => changerClasse(e.target.value)}
              disabled={modification || classes.data === undefined || pasDeClasse} className={champ(erreurs.classe)} {...aria('classe', 'eval-classe')}
            >
              {modification
                ? <option value={classeId}>{evaluation.classe}</option>
                : <option value="">{classes.data === undefined && !classes.error ? 'Chargement…' : 'Choisir une classe'}</option>}
              {!modification && listeClasses.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
            {erreurChamp('classe', 'eval-classe')}
          </div>
          <div>
            <label htmlFor="eval-matiere" className={etiquette}>Matière *</label>
            <select
              id="eval-matiere" required value={matiereId} onChange={e => saisir(setMatiereId, 'matiere')(e.target.value)}
              disabled={modification || !classe} className={champ(erreurs.matiere)} {...aria('matiere', 'eval-matiere')}
            >
              {modification
                ? <option value={matiereId}>{evaluation.matiere}</option>
                : <option value="">{classe ? 'Choisir une matière' : "Choisissez d'abord une classe"}</option>}
              {!modification && matieres.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
            </select>
            {erreurChamp('matiere', 'eval-matiere')}
          </div>
        </div>
        {modification && <p className="-mt-2 text-xs text-[#6B7185]">La classe et la matière ne se modifient plus une fois l'évaluation créée.</p>}

        <div>
          <label htmlFor="eval-titre" className={etiquette}>Titre *</label>
          <input
            id="eval-titre" type="text" required maxLength={TITRE_EVALUATION_MAX} value={titre} onChange={e => saisir(setTitre, 'titre')(e.target.value)}
            placeholder="Contrôle, TP noté, oral…" className={champ(erreurs.titre)} {...aria('titre', 'eval-titre')}
          />
          {erreurChamp('titre', 'eval-titre')}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="eval-date" className={etiquette}>Date *</label>
            <input
              id="eval-date" type="date" required value={date} onChange={e => saisir(setDate, 'date')(e.target.value)}
              className={champ(erreurs.date)} {...aria('date', 'eval-date')}
            />
            {erreurChamp('date', 'eval-date')}
          </div>
          <div>
            <label htmlFor="eval-periode" className={etiquette}>Période</label>
            <input
              id="eval-periode" type="text" list="eval-periodes" maxLength={PERIODE_MAX} value={periode} onChange={e => saisir(setPeriode, 'periode')(e.target.value)}
              placeholder="S1, S2…" className={champ(erreurs.periode)} {...aria('periode', 'eval-periode')}
            />
            <datalist id="eval-periodes"><option value="S1" /><option value="S2" /></datalist>
            {erreurChamp('periode', 'eval-periode')}
          </div>
          <div>
            <label htmlFor="eval-bareme" className={etiquette}>Barème (note maximale) *</label>
            <input
              id="eval-bareme" type="text" inputMode="decimal" required value={bareme} onChange={e => saisir(setBareme, 'bareme')(e.target.value)}
              className={champ(erreurs.bareme)} {...aria('bareme', 'eval-bareme')}
            />
            {erreurChamp('bareme', 'eval-bareme')}
          </div>
          <div>
            <label htmlFor="eval-coefficient" className={etiquette}>Coefficient *</label>
            <input
              id="eval-coefficient" type="text" inputMode="decimal" required value={coefficient} onChange={e => saisir(setCoefficient, 'coefficient')(e.target.value)}
              className={champ(erreurs.coefficient)} {...aria('coefficient', 'eval-coefficient')}
            />
            {erreurChamp('coefficient', 'eval-coefficient')}
          </div>
        </div>

        {erreurServeur && (
          <p role="alert" className="rounded-lg bg-[#FBE6E6] px-3 py-2 text-xs font-medium text-[#B23A3A]">{erreurServeur}</p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className={btnSecondaire}>Annuler</button>
          <button type="submit" disabled={envoi || pasDeClasse} className={btnPrincipal}>
            {envoi ? 'Enregistrement…' : (modification ? 'Enregistrer' : "Créer l'évaluation")}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Suppression d'une évaluation (avec ses notes) ───────────────────────────
function ConfirmationSuppression({ evaluation, onSupprimee, onClose }) {
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');

  const supprimer = async () => {
    setEnvoi(true);
    setErreur('');
    try {
      await supprimerEvaluation(evaluation.id);
      onSupprimee(evaluation);
    } catch (err) {
      setErreur(err.message || "L'évaluation n'a pas pu être supprimée. Réessayez.");
      setEnvoi(false);
    }
  };

  return (
    <Modal onClose={onClose} className="max-w-md rounded-2xl" label="Supprimer l'évaluation">
      <div className="p-6 flex flex-col gap-4">
        <h2 className="text-xl font-bold text-[#001257]">Supprimer l'évaluation ?</h2>
        <p className="text-sm text-[#1A1D2E] break-words">
          « {evaluation.titre} » ({evaluation.classe} · {evaluation.matiere}) sera supprimée
          {evaluation.notes ? `, avec ${evaluation.notes > 1 ? `ses ${evaluation.notes} notes saisies` : 'sa note saisie'}` : ''}. Cette action est définitive.
        </p>
        {erreur && <p role="alert" className="rounded-lg bg-[#FBE6E6] px-3 py-2 text-xs font-medium text-[#B23A3A]">{erreur}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btnSecondaire}>Annuler</button>
          <button type="button" onClick={supprimer} disabled={envoi} className={btnDanger}>{envoi ? 'Suppression…' : 'Supprimer'}</button>
        </div>
      </div>
    </Modal>
  );
}

// ── Grille de saisie des notes d'une évaluation ─────────────────────────────
function GrilleNotes({ evaluation, onEnregistre, onClose }) {
  const donnees = useAsync(() => getNotesEvaluation(evaluation.id), [evaluation.id]);
  const [modifiee, setModifiee] = useState(false); // des notes saisies n'ont pas encore été enregistrées

  const fermer = () => {
    if (modifiee && !window.confirm("Des notes n'ont pas été enregistrées. Fermer quand même ?")) return;
    onClose();
  };

  return (
    <Modal onClose={fermer} className="max-w-5xl rounded-2xl max-h-[92vh] overflow-y-auto" label={`Notes : ${evaluation.titre}`}>
      <div className="p-6 flex flex-col gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[#07A6A6]">{evaluation.classe} · {evaluation.matiere}</p>
          <h2 className="text-xl font-bold text-[#001257] break-words">{evaluation.titre}</h2>
          <p className="mt-1 text-xs text-[#6B7185]">
            {formatDate(evaluation.date_eval)} · coefficient {formatNombre(evaluation.coefficient)} · barème /{formatNombre(evaluation.bareme)}
            {evaluation.periode ? ` · ${evaluation.periode}` : ''}
          </p>
        </div>

        <DataState state={donnees}>
          {({ notes }) => (
            <Saisie
              evaluation={evaluation}
              notes={notes}
              onModifiee={setModifiee}
              onEnregistre={onEnregistre}
              onFermer={fermer}
            />
          )}
        </DataState>
      </div>
    </Modal>
  );
}

// Une ligne par élève ; les notes sont gardées en texte pendant la saisie (virgule ou point acceptés)
const lignesDepuis = notes => notes.map(n => ({
  eleve_id: n.eleve_id, nom: n.nom, prenom: n.prenom,
  valeur: texteNombre(n.valeur), absent: n.absent, commentaire: n.commentaire ?? '',
}));

function Saisie({ evaluation, notes, onModifiee, onEnregistre, onFermer }) {
  const { bareme } = evaluation;
  const [lignes, setLignes] = useState(() => lignesDepuis(notes));
  const [erreurs, setErreurs] = useState({});      // eleve_id → message
  const [erreurServeur, setErreurServeur] = useState('');
  const [succes, setSucces] = useState(false);
  const [envoi, setEnvoi] = useState(false);

  const modifier = (eleveId, changes) => {
    setLignes(ls => ls.map(l => (l.eleve_id === eleveId ? { ...l, ...changes } : l)));
    setErreurs(er => ({ ...er, [eleveId]: undefined }));
    setSucces(false);
    onModifiee(true);
  };

  // Moyenne de la classe sur les notes saisies à l'écran (les absents et les cases vides n'en font pas partie)
  const valeurs = lignes.filter(l => !l.absent).map(l => lireDecimal(l.valeur)).filter(v => v !== null && Number.isFinite(v) && v <= bareme);
  const moyenne = valeurs.length ? valeurs.reduce((s, v) => s + v, 0) / valeurs.length : null;

  const valider = () => {
    const errs = {};
    for (const l of lignes) {
      if (l.absent) continue;
      const v = lireDecimal(l.valeur);
      if (Number.isNaN(v)) errs[l.eleve_id] = 'Saisissez un nombre.';
      else if (v !== null && (v < 0 || v > bareme)) errs[l.eleve_id] = `Une note doit être entre 0 et ${formatNombre(bareme)}.`;
      if (l.commentaire.trim().length > COMMENTAIRE_NOTE_MAX) errs[l.eleve_id] = `Le commentaire ne doit pas dépasser ${COMMENTAIRE_NOTE_MAX} caractères.`;
    }
    return errs;
  };

  const enregistrer = async e => {
    e.preventDefault();
    const errs = valider();
    setErreurs(errs);
    setErreurServeur('');
    setSucces(false);
    if (Object.values(errs).some(Boolean)) return;

    setEnvoi(true);
    try {
      const resultat = await enregistrerNotes(evaluation.id, lignes.map(l => ({
        eleve_id: l.eleve_id,
        valeur: l.absent ? null : lireDecimal(l.valeur),
        absent: l.absent,
        commentaire: l.commentaire,
      })));
      setLignes(lignesDepuis(resultat.notes));
      setSucces(true);
      onModifiee(false);
      onEnregistre(resultat.evaluation);
    } catch (err) {
      setErreurServeur(err.message || "Les notes n'ont pas pu être enregistrées. Réessayez.");
    } finally {
      setEnvoi(false);
    }
  };

  if (!lignes.length) {
    return <p className="py-8 text-center text-sm text-[#6B7185]">Aucun élève dans cette classe.</p>;
  }

  return (
    <form onSubmit={enregistrer} noValidate className="flex flex-col gap-4">
      <p className="text-sm font-semibold text-[#001257]" aria-live="polite">
        Moyenne de la classe : {moyenne === null ? '–' : `${formatNombre(moyenne)}/${formatNombre(bareme)}`}
        <span className="ml-2 font-normal text-[#6B7185]">({pluriel(valeurs.length, 'note')} sur {lignes.length} élèves)</span>
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              {['Élève', `Note (/${formatNombre(bareme)})`, 'Absent', 'Commentaire'].map(t => (
                <th key={t} className="bg-[#EEF1F7] px-3 py-2.5 text-left text-xs font-medium text-[#6B7185] first:rounded-l-lg last:rounded-r-lg">{t}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lignes.map(l => {
              const erreur = erreurs[l.eleve_id];
              return (
                <tr key={l.eleve_id}>
                  <td className="px-3 py-2 border-b border-[#E1E5EE] font-semibold text-[#001257] whitespace-nowrap">{nomComplet(l)}</td>
                  <td className="px-3 py-2 border-b border-[#E1E5EE] align-top">
                    <input
                      type="text" inputMode="decimal" autoComplete="off" value={l.absent ? '' : l.valeur} disabled={l.absent}
                      onChange={e => modifier(l.eleve_id, { valeur: e.target.value })}
                      aria-label={`Note de ${nomComplet(l)}`} aria-invalid={Boolean(erreur)}
                      className={`${champ(erreur)} w-24 py-2`}
                    />
                    {erreur && <p role="alert" className="mt-1 max-w-[16rem] text-xs text-[#B23A3A]">{erreur}</p>}
                  </td>
                  <td className="px-3 py-2 border-b border-[#E1E5EE] align-top">
                    <input
                      type="checkbox" checked={l.absent} onChange={e => modifier(l.eleve_id, { absent: e.target.checked })}
                      aria-label={`${nomComplet(l)} absent`} className="mt-2.5 h-4 w-4 accent-[#001257]"
                    />
                  </td>
                  <td className="px-3 py-2 border-b border-[#E1E5EE] align-top">
                    <input
                      type="text" value={l.commentaire} onChange={e => modifier(l.eleve_id, { commentaire: e.target.value })}
                      aria-label={`Commentaire pour ${nomComplet(l)}`} placeholder="Facultatif" className={`${champ(false)} py-2`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {Object.values(erreurs).some(Boolean) && (
        <p role="alert" className="rounded-lg bg-[#FBE6E6] px-3 py-2 text-xs font-medium text-[#B23A3A]">Corrigez les notes signalées avant d'enregistrer.</p>
      )}
      {erreurServeur && <p role="alert" className="rounded-lg bg-[#FBE6E6] px-3 py-2 text-xs font-medium text-[#B23A3A]">{erreurServeur}</p>}
      {succes && (
        <p role="status" className="flex items-center gap-2 rounded-lg bg-[#E3F5EC] px-3 py-2 text-sm font-semibold text-[#1E7F55]">
          <Icon name="circle-check" size={18} /> Les notes ont été enregistrées.
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onFermer} className={btnSecondaire}>Fermer</button>
        <button type="submit" disabled={envoi} className={btnPrincipal}>{envoi ? 'Enregistrement…' : 'Enregistrer les notes'}</button>
      </div>
    </form>
  );
}
