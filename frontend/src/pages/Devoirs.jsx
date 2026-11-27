import { useState } from 'react';
import '@tabler/icons-webfont/dist/tabler-icons.min.css';
import Modal from '@/components/ui/Modal.jsx';
import DataState from '@/components/ui/DataState.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { useAsync } from '@/hooks/useAsync.js';
import {
  DESCRIPTION_MAX, EXTENSIONS_FICHIER, TAILLE_MAX_FICHIER, TITRE_MAX, TYPES_DEVOIR,
  creerDevoir, getClassesMatieresProf, getDevoirsProf, lireDate, trierDevoirs,
} from '@/services/devoirs.js';

// ─────────────────────────────────────────────────────────────────────────────
// Page Devoirs, la même pour tous : ce qui s'affiche dépend des droits.
//   - droit `devoirs_gerer` (professeur) : donner un devoir (avec pièces jointes facultatives)
//     et voir la liste des devoirs qu'il a donnés
//   - sinon (élève) : simple message pour l'instant. La page élève (travail à faire, marquer
//     « fait », rendre en ligne) est la tâche DEV-02 : elle remplacera `DevoirsEleve`.
//
// Masquer le bouton n'est pas une sécurité : le back refuse POST /prof/devoirs à un non-prof (403).
// ─────────────────────────────────────────────────────────────────────────────
export default function Devoirs() {
  const { can } = useAuth();
  return can('devoirs_gerer') ? <DevoirsProf /> : <DevoirsEleve />;
}

const btnPrincipal = 'inline-flex items-center gap-2 rounded-lg bg-[#EC6F6F] px-4 py-2.5 text-sm font-bold text-[#001257] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition';
const btnSecondaire = 'inline-flex items-center gap-1.5 rounded-lg border border-[#E1E5EE] bg-white px-4 py-2.5 text-sm font-semibold text-[#001257] hover:bg-[#EEF1F7] transition';
const etiquette = 'block mb-1.5 text-xs font-semibold text-[#1A1D2E]';
const champ = invalide => `w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:border-[#001257] disabled:bg-[#EEF1F7] disabled:text-[#6B7185] ${invalide ? 'border-[#B23A3A] bg-[#FBE6E6]' : 'border-[#E1E5EE] bg-white'}`;

const Icon = ({ name, size = 16, className = '' }) => (
  <i className={`ti ti-${name} ${className}`} style={{ fontSize: size }} aria-hidden="true" />
);

const COULEURS_TYPE = {
  travail_a_faire: 'bg-[#EEF1F7] text-[#001257]',
  controle:        'bg-[#FBE6E6] text-[#B23A3A]',
  projet:          'bg-[#E3F5EC] text-[#1E7F55]',
  lecture:         'bg-[#FFF3D6] text-[#8A5A00]',
};
const libelleType = valeur => TYPES_DEVOIR.find(t => t.valeur === valeur)?.libelle ?? valeur;

const HEURE_PAR_DEFAUT = '23:59'; // échéance « dans la journée »
const deuxChiffres = n => String(n).padStart(2, '0');
const jourLocal = date => `${date.getFullYear()}-${deuxChiffres(date.getMonth() + 1)}-${deuxChiffres(date.getDate())}`;
const dateLongue = date => date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const heureCourte = date => `${deuxChiffres(date.getHours())}h${deuxChiffres(date.getMinutes())}`;
const taille = o => (o < 1024 * 1024 ? `${Math.max(1, Math.round(o / 1024))} Ko` : `${(o / 1024 / 1024).toFixed(1)} Mo`);
const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;

// ── Élève : en attendant la tâche DEV-02 ────────────────────────────────────
function DevoirsEleve() {
  return (
    <main className="flex-1 overflow-y-auto bg-[var(--color-page)]">
      <div className="mx-auto w-full max-w-[1000px] px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-5">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#001257]">Devoirs</h1>
        <p className="py-12 text-center text-sm text-[#6B7185]">Aucun devoir pour l'instant.</p>
      </div>
    </main>
  );
}

// ── Professeur : donner un devoir et voir ceux déjà donnés ──────────────────
function DevoirsProf() {
  const devoirs = useAsync(getDevoirsProf);
  const classes = useAsync(getClassesMatieresProf); // menus du formulaire
  const [ouvert, setOuvert] = useState(false);
  const [notice, setNotice] = useState(null); // { titre, echecs } après une création

  // Le devoir créé s'ajoute à la liste sans la recharger (le back ne renvoie pas encore ses pièces jointes dans la liste)
  const apresCreation = ({ devoir, echecs }) => {
    devoirs.setData(liste => trierDevoirs([devoir, ...(liste ?? [])]));
    setNotice({ titre: devoir.titre, echecs });
    setOuvert(false);
  };

  return (
    <>
      <main className="flex-1 overflow-y-auto bg-[var(--color-page)]">
        <div className="mx-auto w-full max-w-[1000px] px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#001257]">Devoirs</h1>
              <p className="mt-1 text-sm text-[#6B7185]">Donnez du travail à vos classes et retrouvez les devoirs déjà donnés.</p>
            </div>
            <button type="button" onClick={() => { setNotice(null); setOuvert(true); }} className={btnPrincipal}>
              <Icon name="plus" /> Ajouter un devoir
            </button>
          </div>

          {notice && <Notice notice={notice} onClose={() => setNotice(null)} />}

          <DataState state={devoirs}>
            {liste => (liste.length ? (
              <ul className="flex flex-col gap-3">
                {liste.map(devoir => <li key={devoir.id}><CarteDevoir devoir={devoir} /></li>)}
              </ul>
            ) : (
              <p className="py-12 text-center text-sm text-[#6B7185]">Vous n'avez pas encore donné de devoir.</p>
            ))}
          </DataState>
        </div>
      </main>

      {ouvert && <Formulaire classes={classes} onCree={apresCreation} onClose={() => setOuvert(false)} />}
    </>
  );
}

// Confirmation après création, avec les pièces jointes qui n'ont pas pu être envoyées
function Notice({ notice, onClose }) {
  const { titre, echecs } = notice;
  const avertissement = echecs.length > 0;
  return (
    <div
      role="status"
      className={`flex items-start gap-3 rounded-xl px-4 py-3 text-sm ${avertissement ? 'bg-[#FFF3D6] text-[#8A5A00]' : 'bg-[#E3F5EC] text-[#1E7F55]'}`}
    >
      <Icon name={avertissement ? 'alert-triangle' : 'circle-check'} size={18} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Le devoir « {titre} » a été ajouté.</p>
        {avertissement && (
          <>
            <p className="mt-1">
              {echecs.length > 1 ? "Ces pièces jointes n'ont pas pu être envoyées" : "Cette pièce jointe n'a pas pu être envoyée"} :
            </p>
            <ul className="mt-1 list-disc pl-5">
              {echecs.map((e, i) => <li key={i} className="break-words">{e.nom} ({e.message})</li>)}
            </ul>
          </>
        )}
      </div>
      <button type="button" onClick={onClose} aria-label="Fermer le message" className="shrink-0 rounded p-1 hover:bg-black/5">
        <Icon name="x" size={16} />
      </button>
    </div>
  );
}

// ── Un devoir de la liste ───────────────────────────────────────────────────
function CarteDevoir({ devoir }) {
  const echeance = lireDate(devoir.a_rendre_le);
  const donne = lireDate(devoir.donne_le);
  const nbFichiers = devoir.fichiers?.length; // absent tant que le back ne renvoie pas les pièces jointes
  const aHeure = echeance && heureCourte(echeance) !== '23h59'; // 23h59 = « dans la journée », inutile à afficher

  return (
    <article className="rounded-2xl border border-[#E1E5EE] bg-white p-5 flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${COULEURS_TYPE[devoir.type] ?? COULEURS_TYPE.travail_a_faire}`}>
          {libelleType(devoir.type)}
        </span>
        <span className="text-xs font-bold uppercase tracking-wide text-[#07A6A6]">{devoir.classe} · {devoir.matiere}</span>
      </div>

      <h2 className="text-base font-bold text-[#001257] leading-snug break-words">{devoir.titre}</h2>
      {devoir.description && (
        <p className="text-sm leading-relaxed text-[#1A1D2E] whitespace-pre-line break-words">{devoir.description}</p>
      )}

      <div className="flex flex-wrap gap-x-5 gap-y-1 pt-1 text-xs text-[#6B7185]">
        <span className="inline-flex items-center gap-1.5">
          <Icon name="calendar-due" size={14} />
          {echeance ? `Pour le ${dateLongue(echeance)}${aHeure ? ` à ${heureCourte(echeance)}` : ''}` : 'Sans date limite'}
        </span>
        {donne && <span className="inline-flex items-center gap-1.5"><Icon name="calendar" size={14} />Donné le {donne.toLocaleDateString('fr-FR')}</span>}
        {devoir.rendu_en_ligne && <span className="inline-flex items-center gap-1.5"><Icon name="upload" size={14} />À rendre en ligne</span>}
        {nbFichiers !== undefined && (
          <span className="inline-flex items-center gap-1.5">
            <Icon name="paperclip" size={14} />
            {nbFichiers ? pluriel(nbFichiers, 'pièce jointe') : 'Aucune pièce jointe'}
          </span>
        )}
      </div>
    </article>
  );
}

// ── Formulaire « Ajouter un devoir » ────────────────────────────────────────
// Champs envoyés : ceux de champsDevoir dans le back (type, titre, description, a_rendre_le,
// rendu_en_ligne) + classe_id et matiere_id.
function extension(nom) {
  return nom.includes('.') ? nom.split('.').pop().toLowerCase() : '';
}

// Message d'erreur si le fichier serait refusé par le back, sinon ''
function verifierFichier(fichier) {
  if (!EXTENSIONS_FICHIER.includes(extension(fichier.name))) {
    return `format non accepté (${EXTENSIONS_FICHIER.join(', ')})`;
  }
  if (fichier.size === 0) return 'le fichier est vide';
  if (fichier.size > TAILLE_MAX_FICHIER) return `fichier trop lourd (${taille(fichier.size)}, 10 Mo maximum)`;
  return '';
}

function Formulaire({ classes, onCree, onClose }) {
  const [classeId, setClasseId] = useState('');
  const [matiereId, setMatiereId] = useState('');
  const [type, setType] = useState('travail_a_faire');
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [jour, setJour] = useState('');
  const [heure, setHeure] = useState(HEURE_PAR_DEFAUT);
  const [renduEnLigne, setRenduEnLigne] = useState(false);
  const [fichiers, setFichiers] = useState([]);
  const [refuses, setRefuses] = useState([]); // fichiers écartés à la sélection, avec la raison
  const [erreurs, setErreurs] = useState({});
  const [erreurServeur, setErreurServeur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const listeClasses = classes.data ?? [];
  const classe = listeClasses.find(c => String(c.id) === classeId);
  const matieres = classe?.matieres ?? [];
  const aujourdhui = jourLocal(new Date());

  // Les matières proposées dépendent de la classe : on repart de zéro (ou de la seule matière possible)
  const changerClasse = valeur => {
    setClasseId(valeur);
    const suivante = listeClasses.find(c => String(c.id) === valeur);
    setMatiereId(suivante?.matieres.length === 1 ? String(suivante.matieres[0].id) : '');
    setErreurs(er => ({ ...er, classe: undefined, matiere: undefined }));
  };

  const saisir = (setter, cle) => valeur => {
    setter(valeur);
    if (cle) setErreurs(er => ({ ...er, [cle]: undefined }));
  };

  // Les sélections successives s'additionnent (un <input type="file"> remplace sinon la précédente)
  const choisirFichiers = e => {
    const choisis = Array.from(e.target.files ?? []);
    e.target.value = '';
    const ecartes = [];
    const acceptes = [];
    for (const f of choisis) {
      const raison = verifierFichier(f);
      const doublon = [...fichiers, ...acceptes].some(g => g.name === f.name && g.size === f.size && g.lastModified === f.lastModified);
      if (raison) ecartes.push({ nom: f.name, raison });
      else if (!doublon) acceptes.push(f);
    }
    setRefuses(ecartes);
    if (acceptes.length) setFichiers(l => [...l, ...acceptes]);
  };

  const retirerFichier = index => setFichiers(l => l.filter((_, i) => i !== index));

  // Validation avant envoi : un message par champ
  const valider = () => {
    const errs = {};
    if (!classeId) errs.classe = 'Choisissez une classe.';
    if (!matiereId) errs.matiere = 'Choisissez une matière.';
    if (!titre.trim()) errs.titre = 'Donnez un titre au devoir.';
    else if (titre.trim().length > TITRE_MAX) errs.titre = `Le titre ne doit pas dépasser ${TITRE_MAX} caractères.`;
    if (description.trim().length > DESCRIPTION_MAX) errs.description = `La consigne ne doit pas dépasser ${DESCRIPTION_MAX} caractères.`;
    if (!jour) errs.echeance = "Indiquez la date d'échéance.";
    else if (!heure) errs.echeance = "Indiquez l'heure d'échéance.";
    else if (new Date(`${jour}T${heure}`) < new Date()) errs.echeance = "L'échéance ne peut pas être dans le passé.";
    return errs;
  };

  const envoyer = async e => {
    e.preventDefault();
    const errs = valider();
    setErreurs(errs);
    setErreurServeur('');
    if (Object.values(errs).some(Boolean)) return;

    setEnvoi(true);
    try {
      const resultat = await creerDevoir({
        classe_id: Number(classeId),
        matiere_id: Number(matiereId),
        type,
        titre: titre.trim(),
        description: description.trim(),
        a_rendre_le: `${jour}T${heure}`,
        rendu_en_ligne: renduEnLigne,
      }, fichiers);
      onCree(resultat); // ferme la modale
    } catch (err) {
      setErreurServeur(err.message || "Le devoir n'a pas pu être enregistré. Réessayez.");
      setEnvoi(false);
    }
  };

  const erreurChamp = (cle, id) => erreurs[cle] && (
    <p id={`${id}-erreur`} className="mt-1 text-xs text-[#B23A3A]">{erreurs[cle]}</p>
  );
  const aria = (cle, id) => ({ 'aria-invalid': Boolean(erreurs[cle]), 'aria-describedby': erreurs[cle] ? `${id}-erreur` : undefined });

  const pasDeClasse = !classes.error && classes.data !== undefined && listeClasses.length === 0;

  return (
    <Modal onClose={onClose} className="max-w-xl rounded-2xl max-h-[90vh] overflow-y-auto" label="Ajouter un devoir">
      <form onSubmit={envoyer} noValidate className="p-6 flex flex-col gap-4">
        <h2 className="text-xl font-bold text-[#001257]">Ajouter un devoir</h2>

        {classes.error && (
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
            <label htmlFor="devoir-classe" className={etiquette}>Classe *</label>
            <select
              id="devoir-classe" autoFocus required value={classeId} onChange={e => changerClasse(e.target.value)}
              disabled={classes.data === undefined || pasDeClasse} className={champ(erreurs.classe)} {...aria('classe', 'devoir-classe')}
            >
              <option value="">{classes.data === undefined && !classes.error ? 'Chargement…' : 'Choisir une classe'}</option>
              {listeClasses.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
            {erreurChamp('classe', 'devoir-classe')}
          </div>
          <div>
            <label htmlFor="devoir-matiere" className={etiquette}>Matière *</label>
            <select
              id="devoir-matiere" required value={matiereId} onChange={e => saisir(setMatiereId, 'matiere')(e.target.value)}
              disabled={!classe} className={champ(erreurs.matiere)} {...aria('matiere', 'devoir-matiere')}
            >
              <option value="">{classe ? 'Choisir une matière' : "Choisissez d'abord une classe"}</option>
              {matieres.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
            </select>
            {erreurChamp('matiere', 'devoir-matiere')}
          </div>
        </div>

        <div>
          <label htmlFor="devoir-type" className={etiquette}>Type</label>
          <select id="devoir-type" value={type} onChange={e => setType(e.target.value)} className={champ(false)}>
            {TYPES_DEVOIR.map(t => <option key={t.valeur} value={t.valeur}>{t.libelle}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="devoir-titre" className={etiquette}>Titre *</label>
          <input
            id="devoir-titre" type="text" required maxLength={TITRE_MAX} value={titre} onChange={e => saisir(setTitre, 'titre')(e.target.value)}
            placeholder="Ex. : Exercices 12 à 15" className={champ(erreurs.titre)} {...aria('titre', 'devoir-titre')}
          />
          {erreurChamp('titre', 'devoir-titre')}
        </div>

        <div>
          <label htmlFor="devoir-consigne" className={etiquette}>Consigne</label>
          <textarea
            id="devoir-consigne" rows={4} maxLength={DESCRIPTION_MAX} value={description} onChange={e => saisir(setDescription, 'description')(e.target.value)}
            placeholder="Ce que les élèves doivent faire…" className={`${champ(erreurs.description)} resize-y`} {...aria('description', 'devoir-consigne')}
          />
          {erreurChamp('description', 'devoir-consigne')}
        </div>

        <fieldset className="min-w-0">
          <legend className={etiquette}>Échéance *</legend>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="devoir-jour" className="sr-only">Date d'échéance</label>
              <input
                id="devoir-jour" type="date" required min={aujourdhui} value={jour} onChange={e => saisir(setJour, 'echeance')(e.target.value)}
                className={champ(erreurs.echeance)} {...aria('echeance', 'devoir-echeance')}
              />
            </div>
            <div>
              <label htmlFor="devoir-heure" className="sr-only">Heure d'échéance</label>
              <input
                id="devoir-heure" type="time" required value={heure} onChange={e => saisir(setHeure, 'echeance')(e.target.value)}
                className={champ(erreurs.echeance)} {...aria('echeance', 'devoir-echeance')}
              />
            </div>
          </div>
          {erreurChamp('echeance', 'devoir-echeance')}
        </fieldset>

        <label className="flex items-start gap-2 text-xs text-[#1A1D2E]">
          <input type="checkbox" checked={renduEnLigne} onChange={e => setRenduEnLigne(e.target.checked)} className="mt-0.5" />
          <span>Les élèves rendent ce devoir en ligne</span>
        </label>

        <div>
          <label htmlFor="devoir-fichiers" className={etiquette}>Pièces jointes (facultatif)</label>
          <input
            id="devoir-fichiers" type="file" multiple accept={EXTENSIONS_FICHIER.map(e => `.${e}`).join(',')} onChange={choisirFichiers}
            aria-describedby="devoir-fichiers-aide"
            className={`${champ(false)} file:mr-3 file:rounded-md file:border-0 file:bg-[#EEF1F7] file:px-3 file:py-1 file:text-xs file:font-semibold file:text-[#001257]`}
          />
          <p id="devoir-fichiers-aide" className="mt-1 text-xs text-[#6B7185]">
            PDF, Word, Excel, PowerPoint, images, zip… — 10 Mo maximum par fichier. Vous pouvez en ajouter plusieurs.
          </p>
          {refuses.length > 0 && (
            <ul role="alert" className="mt-2 list-disc pl-5 text-xs text-[#B23A3A]">
              {refuses.map((r, i) => <li key={i} className="break-words">{r.nom} : {r.raison}</li>)}
            </ul>
          )}
          {fichiers.length > 0 && (
            <ul className="mt-2 divide-y divide-[#E1E5EE] rounded-lg border border-[#E1E5EE]">
              {fichiers.map((f, i) => (
                <li key={`${f.name}-${f.size}-${f.lastModified}`} className="flex items-center gap-2 px-3 py-2 text-xs">
                  <Icon name="paperclip" size={14} className="shrink-0 text-[#07A6A6]" />
                  <span className="min-w-0 flex-1 truncate font-medium text-[#1A1D2E]">{f.name}</span>
                  <span className="shrink-0 text-[#6B7185]">{taille(f.size)}</span>
                  <button
                    type="button" onClick={() => retirerFichier(i)} aria-label={`Retirer ${f.name}`}
                    className="shrink-0 rounded p-1 text-[#6B7185] hover:bg-[#FBE6E6] hover:text-[#B23A3A]"
                  >
                    <Icon name="x" size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {Object.values(erreurs).some(Boolean) && (
          <p role="alert" className="text-xs font-medium text-[#B23A3A]">Corrigez les champs signalés avant d'enregistrer.</p>
        )}
        {erreurServeur && (
          <p role="alert" className="rounded-lg bg-[#FBE6E6] px-3 py-2 text-xs font-medium text-[#B23A3A]">{erreurServeur}</p>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t border-[#E1E5EE]">
          <button type="button" onClick={onClose} className={btnSecondaire}>Annuler</button>
          <button type="submit" disabled={envoi || classes.data === undefined || pasDeClasse} className={btnPrincipal}>
            {envoi ? 'Enregistrement…' : 'Ajouter le devoir'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
