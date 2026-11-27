import { useState } from 'react';
import '@tabler/icons-webfont/dist/tabler-icons.min.css';
import Modal from '@/components/ui/Modal.jsx';
import DataState from '@/components/ui/DataState.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { useAsync } from '@/hooks/useAsync.js';
import { USE_MOCKS } from '@/services/api.js';
import {
  APPRECIATION_MAX, COMMENTAIRE_MAX, DESCRIPTION_MAX, EXTENSIONS_FICHIER, NOTE_MAX,
  STATUTS_DEVOIR, TAILLE_MAX_FICHIER, TITRE_MAX, TYPES_DEVOIR,
  aFichierMock, corrigerDevoirEleve, creerDevoir, getClassesMatieresProf, getDevoirsEleve,
  getDevoirsProf, getFichierDevoirDownloadUrl, getRenduDownloadUrl, getSuiviDevoir,
  lireDate, marquerDevoirFait, rendreDevoir, telechargerFichierMock, trierDevoirs,
} from '@/services/devoirs.js';

// ─────────────────────────────────────────────────────────────────────────────
// Page Devoirs, la même pour tous : ce qui s'affiche dépend des droits.
//   - droit `devoirs_gerer` (professeur) : donner un devoir (avec pièces jointes facultatives),
//     consulter ses devoirs, suivre les rendus des élèves et corriger (note + appréciation)
//   - sinon (élève) : filtrer par statut, marquer « fait » / « à faire », télécharger les
//     pièces jointes, rendre en ligne avec fichiers et voir sa note et son appréciation.
//
// Masquer les boutons n'est pas une sécurité : le back vérifie les droits et la propriété.
// ─────────────────────────────────────────────────────────────────────────────
export default function Devoirs() {
  const { can } = useAuth();
  return can('devoirs_gerer') ? <DevoirsProf /> : <DevoirsEleve />;
}

const btnPrincipal = 'inline-flex items-center gap-2 rounded-lg bg-[#EC6F6F] px-4 py-2.5 text-sm font-bold text-[#001257] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition';
const btnSecondaire = 'inline-flex items-center gap-1.5 rounded-lg border border-[#E1E5EE] bg-white px-4 py-2 text-sm font-semibold text-[#001257] hover:bg-[#EEF1F7] disabled:opacity-50 disabled:cursor-not-allowed transition';
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

const STATUTS_BADGES = {
  a_faire: { libelle: 'À faire', classe: 'bg-[#EEF1F7] text-[#6B7185]' },
  fait:    { libelle: 'Fait',    classe: 'bg-[#E3F6F6] text-[#056D6D]' },
  rendu:   { libelle: 'Rendu',   classe: 'bg-[#FFF3D6] text-[#8A5A00]' },
  corrige: { libelle: 'Corrigé', classe: 'bg-[#E3F5EC] text-[#1E7F55]' },
};

const HEURE_PAR_DEFAUT = '23:59'; // échéance « dans la journée »
const deuxChiffres = n => String(n).padStart(2, '0');
const jourLocal = date => `${date.getFullYear()}-${deuxChiffres(date.getMonth() + 1)}-${deuxChiffres(date.getDate())}`;
const dateLongue = date => date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const heureCourte = date => `${deuxChiffres(date.getHours())}h${deuxChiffres(date.getMinutes())}`;
const dateHeureCourte = valeur => {
  const d = lireDate(valeur);
  return d ? `${d.toLocaleDateString('fr-FR')} à ${heureCourte(d)}` : '';
};
const taille = o => (o < 1024 * 1024 ? `${Math.max(1, Math.round(o / 1024))} Ko` : `${(o / 1024 / 1024).toFixed(1)} Mo`);
const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;
const formaterNote = n => Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 2 });

function extension(nom) {
  return nom.includes('.') ? nom.split('.').pop().toLowerCase() : '';
}

function verifierFichier(fichier) {
  if (!EXTENSIONS_FICHIER.includes(extension(fichier.name))) {
    return `format non accepté (${EXTENSIONS_FICHIER.join(', ')})`;
  }
  if (fichier.size === 0) return 'le fichier est vide';
  if (fichier.size > TAILLE_MAX_FICHIER) return `fichier trop lourd (${taille(fichier.size)}, 10 Mo maximum)`;
  return '';
}

function SelecteurFichiers({ id, label, aide, fichiers, onChange, disabled = false }) {
  const [refuses, setRefuses] = useState([]);

  const choisir = e => {
    const choisis = Array.from(e.target.files ?? []);
    e.target.value = '';
    const ecartes = [];
    const acceptes = [];
    for (const f of choisis) {
      const raison = verifierFichier(f);
      const doublon = [...fichiers, ...acceptes].some(
        g => g.name === f.name && g.size === f.size && g.lastModified === f.lastModified,
      );
      if (raison) ecartes.push({ nom: f.name, raison });
      else if (!doublon) acceptes.push(f);
    }
    setRefuses(ecartes);
    if (acceptes.length) onChange([...fichiers, ...acceptes]);
  };

  const retirer = index => onChange(fichiers.filter((_, i) => i !== index));

  return (
    <div>
      <label htmlFor={id} className={etiquette}>{label}</label>
      <input
        id={id}
        type="file"
        multiple
        disabled={disabled}
        accept={EXTENSIONS_FICHIER.map(e => `.${e}`).join(',')}
        onChange={choisir}
        aria-describedby={`${id}-aide`}
        className={`${champ(false)} file:mr-3 file:rounded-md file:border-0 file:bg-[#EEF1F7] file:px-3 file:py-1 file:text-xs file:font-semibold file:text-[#001257]`}
      />
      <p id={`${id}-aide`} className="mt-1 text-xs text-[#6B7185]">{aide}</p>
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
                type="button"
                disabled={disabled}
                onClick={() => retirer(i)}
                aria-label={`Retirer ${f.name}`}
                className="shrink-0 rounded p-1 text-[#6B7185] hover:bg-[#FBE6E6] hover:text-[#B23A3A] disabled:opacity-50"
              >
                <Icon name="x" size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ListePiecesJointes({ fichiers, type = 'devoir' }) {
  if (!fichiers?.length) return null;
  const getUrl = type === 'rendu' ? getRenduDownloadUrl : getFichierDevoirDownloadUrl;

  return (
    <ul className="flex flex-wrap gap-2">
      {fichiers.map(f => {
        const meta = f.taille_o != null
          ? ` (${taille(f.taille_o)})`
          : (f.depose_at ? ` · ${dateHeureCourte(f.depose_at)}` : '');

        if (!USE_MOCKS) {
          return (
            <li key={f.id ?? f.nom}>
              <a
                href={getUrl(f.id)}
                download
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#E1E5EE] bg-[#F7F8FB] px-2.5 py-1.5 text-xs font-medium text-[#001257] hover:bg-[#EEF1F7] transition"
              >
                <Icon name="download" size={14} className="text-[#07A6A6]" />
                <span className="max-w-[220px] truncate">{f.nom}</span>
                {meta && <span className="text-[#6B7185]">{meta}</span>}
              </a>
            </li>
          );
        }

        const telechargeable = f.id && aFichierMock(f.id);
        return (
          <li key={f.id ?? f.nom}>
            {telechargeable ? (
              <button
                type="button"
                onClick={() => telechargerFichierMock(f.id, f.nom)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#E1E5EE] bg-[#F7F8FB] px-2.5 py-1.5 text-xs font-medium text-[#001257] hover:bg-[#EEF1F7] transition"
              >
                <Icon name="download" size={14} className="text-[#07A6A6]" />
                <span className="max-w-[220px] truncate">{f.nom}</span>
                {meta && <span className="text-[#6B7185]">{meta}</span>}
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#E1E5EE] bg-[#F7F8FB] px-2.5 py-1.5 text-xs font-medium text-[#6B7185]">
                <Icon name="paperclip" size={14} className="text-[#07A6A6]" />
                <span className="max-w-[220px] truncate">{f.nom}</span>
                {meta && <span>{meta}</span>}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function BadgeStatut({ statut, enRetard = false }) {
  if (enRetard) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#FBE6E6] px-2.5 py-0.5 text-[11px] font-bold text-[#B23A3A]">
        <Icon name="alert-circle" size={12} /> En retard
      </span>
    );
  }
  const info = STATUTS_BADGES[statut] ?? STATUTS_BADGES.a_faire;
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${info.classe}`}>
      {info.libelle}
    </span>
  );
}

// ── Élève : travail à faire, marquer fait, rendre en ligne, notes ───────────
function DevoirsEleve() {
  const [filtre, setFiltre] = useState('');
  const devoirs = useAsync(() => getDevoirsEleve(filtre), [filtre]);
  const [devoirARendre, setDevoirARendre] = useState(null);
  const [actionId, setActionId] = useState(null);
  const [message, setMessage] = useState(null); // { erreur, texte }

  const basculerFait = async devoir => {
    const versFait = devoir.statut === 'a_faire';
    setActionId(devoir.id);
    setMessage(null);
    try {
      await marquerDevoirFait(devoir.id, versFait);
      devoirs.reload();
    } catch (err) {
      setMessage({ erreur: true, texte: err.message || 'Impossible de mettre à jour le statut.' });
    } finally {
      setActionId(null);
    }
  };

  const apresRendu = ({ echecs }) => {
    setDevoirARendre(null);
    setMessage(
      echecs?.length
        ? {
            erreur: true,
            texte: `Rendu enregistré, mais ${echecs.map(e => `${e.nom} (${e.message})`).join(', ')} n'a pas pu être envoyé.`,
          }
        : { erreur: false, texte: 'Votre rendu a bien été envoyé.' },
    );
    devoirs.reload();
  };

  return (
    <>
      <main className="flex-1 overflow-y-auto bg-[var(--color-page)]">
        <div className="mx-auto w-full max-w-[1000px] px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#001257]">Devoirs</h1>
            <p className="mt-1 text-sm text-[#6B7185]">
              Consultez votre travail à faire, suivez vos échéances et déposez vos rendus en ligne.
            </p>
          </div>

          <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer les devoirs par statut">
            {STATUTS_DEVOIR.map(s => {
              const actif = filtre === s.valeur;
              return (
                <button
                  key={s.valeur || 'tous'}
                  type="button"
                  aria-pressed={actif}
                  onClick={() => { setMessage(null); setFiltre(s.valeur); }}
                  className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
                    actif
                      ? 'bg-[#001257] border-[#001257] text-white'
                      : 'bg-white border-[#E1E5EE] text-[#001257] hover:bg-[#EEF1F7]'
                  }`}
                >
                  {s.libelle}
                </button>
              );
            })}
          </div>

          {message && (
            <div
              role={message.erreur ? 'alert' : 'status'}
              className={`flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm ${
                message.erreur ? 'bg-[#FBE6E6] text-[#B23A3A]' : 'bg-[#E3F5EC] text-[#1E7F55]'
              }`}
            >
              <span>{message.texte}</span>
              <button
                type="button"
                onClick={() => setMessage(null)}
                aria-label="Fermer le message"
                className="rounded p-1 hover:bg-black/5"
              >
                <Icon name="x" size={16} />
              </button>
            </div>
          )}

          <DataState state={devoirs}>
            {liste => (liste.length ? (
              <ul className="flex flex-col gap-3">
                {liste.map(devoir => (
                  <li key={devoir.id}>
                    <CarteDevoirEleve
                      devoir={devoir}
                      enCours={actionId === devoir.id}
                      onBasculerFait={() => basculerFait(devoir)}
                      onRendre={() => { setMessage(null); setDevoirARendre(devoir); }}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-12 text-center text-sm text-[#6B7185]">
                {filtre ? 'Aucun devoir avec ce statut.' : "Aucun devoir pour l'instant."}
              </p>
            ))}
          </DataState>
        </div>
      </main>

      {devoirARendre && (
        <ModalRendu
          devoir={devoirARendre}
          onRendu={apresRendu}
          onClose={() => setDevoirARendre(null)}
        />
      )}
    </>
  );
}

function CarteDevoirEleve({ devoir, enCours, onBasculerFait, onRendre }) {
  const echeance = lireDate(devoir.a_rendre_le);
  const donne = lireDate(devoir.donne_le);
  const aHeure = echeance && heureCourte(echeance) !== '23h59';
  const maintenant = new Date();
  const nonTermine = devoir.statut === 'a_faire' || (devoir.rendu_en_ligne && devoir.statut === 'fait');
  const enRetard = echeance !== null && echeance < maintenant && nonTermine;
  const peutMarquerFait = devoir.statut === 'a_faire' || devoir.statut === 'fait';
  const peutRendre = devoir.rendu_en_ligne && devoir.statut !== 'corrige';
  const aCorrection = devoir.statut === 'corrige' || devoir.note !== null || Boolean(devoir.appreciation);
  const aRendu = Boolean(devoir.rendu_at || devoir.commentaire_eleve || devoir.fichiers_rendus?.length);

  return (
    <article
      className={`rounded-2xl border bg-white p-5 flex flex-col gap-3 ${
        enRetard ? 'border-[#E6A0A0]' : 'border-[#E1E5EE]'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${COULEURS_TYPE[devoir.type] ?? COULEURS_TYPE.travail_a_faire}`}>
            {libelleType(devoir.type)}
          </span>
          <span className="text-xs font-bold uppercase tracking-wide text-[#07A6A6]">
            {devoir.matiere}
            {(devoir.prof_prenom || devoir.prof_nom) && ` · ${[devoir.prof_prenom, devoir.prof_nom].filter(Boolean).join(' ')}`}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {enRetard && <BadgeStatut statut={devoir.statut} enRetard />}
          {(!enRetard || devoir.statut !== 'a_faire') && <BadgeStatut statut={devoir.statut} />}
        </div>
      </div>

      <h2 className="text-base font-bold text-[#001257] leading-snug break-words">{devoir.titre}</h2>

      {devoir.description && (
        <p className="text-sm leading-relaxed text-[#1A1D2E] whitespace-pre-line break-words">{devoir.description}</p>
      )}

      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-[#6B7185]">
        <span className={`inline-flex items-center gap-1.5 ${enRetard ? 'font-semibold text-[#B23A3A]' : ''}`}>
          <Icon name="calendar-due" size={14} />
          {echeance
            ? `Pour le ${dateLongue(echeance)}${aHeure ? ` à ${heureCourte(echeance)}` : ''}`
            : 'Sans date limite'}
        </span>
        {donne && (
          <span className="inline-flex items-center gap-1.5">
            <Icon name="calendar" size={14} />Donné le {donne.toLocaleDateString('fr-FR')}
          </span>
        )}
        {devoir.rendu_en_ligne && (
          <span className="inline-flex items-center gap-1.5">
            <Icon name="upload" size={14} />À rendre en ligne
          </span>
        )}
      </div>

      {devoir.fichiers?.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-semibold text-[#6B7185]">Pièces jointes</p>
          <ListePiecesJointes fichiers={devoir.fichiers} type="devoir" />
        </div>
      )}

      {aRendu && (
        <div className="rounded-xl border border-[#E1E5EE] bg-[#F7F8FB] p-3 flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-[#001257]">Mon rendu</span>
            {devoir.rendu_at && <span className="text-[#6B7185]">Déposé le {dateHeureCourte(devoir.rendu_at)}</span>}
          </div>
          {devoir.commentaire_eleve && (
            <p className="text-xs text-[#1A1D2E] whitespace-pre-line break-words">{devoir.commentaire_eleve}</p>
          )}
          <ListePiecesJointes fichiers={devoir.fichiers_rendus} type="rendu" />
        </div>
      )}

      {aCorrection && (
        <div className="rounded-xl border border-[#BCE3CE] bg-[#F3FBF7] p-3 flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-[#1E7F55]">Correction du professeur</span>
            {devoir.note !== null && (
              <span className="rounded-full bg-[#1E7F55] px-2.5 py-0.5 text-xs font-bold text-white">
                Note : {formaterNote(devoir.note)}
              </span>
            )}
          </div>
          {devoir.appreciation && (
            <p className="text-sm text-[#1A1D2E] whitespace-pre-line break-words">{devoir.appreciation}</p>
          )}
          {devoir.corrige_at && (
            <p className="text-[11px] text-[#6B7185]">Corrigé le {dateHeureCourte(devoir.corrige_at)}</p>
          )}
        </div>
      )}

      {(peutMarquerFait || peutRendre) && (
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#EEF1F7]">
          {peutMarquerFait && (
            <button
              type="button"
              disabled={enCours}
              onClick={onBasculerFait}
              className={btnSecondaire}
            >
              <Icon name={devoir.statut === 'fait' ? 'arrow-back-up' : 'check'} size={15} />
              {devoir.statut === 'fait' ? 'Marquer à faire' : 'Marquer comme fait'}
            </button>
          )}
          {peutRendre && (
            <button type="button" onClick={onRendre} className={btnPrincipal}>
              <Icon name="upload" size={15} />
              {devoir.statut === 'rendu' ? 'Ajouter un fichier au rendu' : 'Rendre en ligne'}
            </button>
          )}
        </div>
      )}
    </article>
  );
}

function ModalRendu({ devoir, onRendu, onClose }) {
  const [fichiers, setFichiers] = useState([]);
  const [commentaire, setCommentaire] = useState(devoir.commentaire_eleve ?? '');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const envoyer = async e => {
    e.preventDefault();
    if (!fichiers.length) {
      setErreur('Sélectionnez au moins un fichier à déposer.');
      return;
    }
    if (commentaire.trim().length > COMMENTAIRE_MAX) {
      setErreur(`Le commentaire ne doit pas dépasser ${COMMENTAIRE_MAX} caractères.`);
      return;
    }
    setErreur('');
    setEnvoi(true);
    try {
      const res = await rendreDevoir(devoir.id, fichiers, commentaire);
      onRendu(res);
    } catch (err) {
      setErreur(err.message || "Le rendu n'a pas pu être envoyé.");
      setEnvoi(false);
    }
  };

  return (
    <Modal onClose={onClose} className="max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto" label={`Rendre : ${devoir.titre}`}>
      <form onSubmit={envoyer} noValidate className="p-6 flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#001257]">Rendre le devoir</h2>
          <p className="mt-1 text-xs font-semibold text-[#07A6A6]">{devoir.matiere} · {devoir.titre}</p>
        </div>

        <SelecteurFichiers
          id="rendu-fichiers"
          label="Fichier(s) à rendre *"
          aide="PDF, Word, Excel, PowerPoint, images, zip… — 10 Mo maximum par fichier."
          fichiers={fichiers}
          onChange={liste => { setErreur(''); setFichiers(liste); }}
          disabled={envoi}
        />

        <div>
          <label htmlFor="rendu-commentaire" className={etiquette}>Commentaire pour le professeur (facultatif)</label>
          <textarea
            id="rendu-commentaire"
            rows={3}
            maxLength={COMMENTAIRE_MAX}
            value={commentaire}
            disabled={envoi}
            onChange={e => setCommentaire(e.target.value)}
            placeholder="Précision, question ou remarque sur votre travail…"
            className={`${champ(false)} resize-y`}
          />
        </div>

        {erreur && (
          <p role="alert" className="rounded-lg bg-[#FBE6E6] px-3 py-2 text-xs font-medium text-[#B23A3A]">{erreur}</p>
        )}

        <div className="flex justify-end gap-2 pt-3 border-t border-[#E1E5EE]">
          <button type="button" onClick={onClose} disabled={envoi} className={btnSecondaire}>Annuler</button>
          <button type="submit" disabled={envoi} className={btnPrincipal}>
            {envoi ? 'Envoi…' : 'Envoyer mon rendu'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Professeur : donner un devoir, suivre les élèves et corriger ────────────
function DevoirsProf() {
  const devoirs = useAsync(getDevoirsProf);
  const classes = useAsync(getClassesMatieresProf); // menus du formulaire
  const [ouvert, setOuvert] = useState(false);
  const [devoirSuiviId, setDevoirSuiviId] = useState(null);
  const [notice, setNotice] = useState(null); // { titre, echecs } après une création

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
              <p className="mt-1 text-sm text-[#6B7185]">Donnez du travail à vos classes, suivez les rendus et corrigez les copies.</p>
            </div>
            <button type="button" onClick={() => { setNotice(null); setOuvert(true); }} className={btnPrincipal}>
              <Icon name="plus" /> Ajouter un devoir
            </button>
          </div>

          {notice && <Notice notice={notice} onClose={() => setNotice(null)} />}

          <DataState state={devoirs}>
            {liste => (liste.length ? (
              <ul className="flex flex-col gap-3">
                {liste.map(devoir => (
                  <li key={devoir.id}>
                    <CarteDevoir devoir={devoir} onSuivi={() => setDevoirSuiviId(devoir.id)} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-12 text-center text-sm text-[#6B7185]">Vous n'avez pas encore donné de devoir.</p>
            ))}
          </DataState>
        </div>
      </main>

      {ouvert && <Formulaire classes={classes} onCree={apresCreation} onClose={() => setOuvert(false)} />}
      {devoirSuiviId && (
        <ModalSuiviDevoir
          devoirId={devoirSuiviId}
          onCorrige={() => devoirs.reload()}
          onClose={() => setDevoirSuiviId(null)}
        />
      )}
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

// ── Un devoir de la liste prof ──────────────────────────────────────────────
function CarteDevoir({ devoir, onSuivi }) {
  const echeance = lireDate(devoir.a_rendre_le);
  const donne = lireDate(devoir.donne_le);
  const nbFichiers = devoir.fichiers?.length ?? 0;
  const aHeure = echeance && heureCourte(echeance) !== '23h59'; // 23h59 = « dans la journée », inutile à afficher

  return (
    <article className="rounded-2xl border border-[#E1E5EE] bg-white p-5 flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${COULEURS_TYPE[devoir.type] ?? COULEURS_TYPE.travail_a_faire}`}>
            {libelleType(devoir.type)}
          </span>
          <span className="text-xs font-bold uppercase tracking-wide text-[#07A6A6]">{devoir.classe} · {devoir.matiere}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B7185]">
          <span className="rounded-full bg-[#EEF1F7] px-2.5 py-0.5 font-semibold text-[#001257]">
            {Number(devoir.faits ?? 0)}/{Number(devoir.eleves ?? 0)} faits
          </span>
          {devoir.rendu_en_ligne && (
            <span className="rounded-full bg-[#E3F6F6] px-2.5 py-0.5 font-semibold text-[#056D6D]">
              {pluriel(Number(devoir.rendus ?? 0), 'rendu')}
            </span>
          )}
        </div>
      </div>

      <h2 className="text-base font-bold text-[#001257] leading-snug break-words">{devoir.titre}</h2>
      {devoir.description && (
        <p className="text-sm leading-relaxed text-[#1A1D2E] whitespace-pre-line break-words">{devoir.description}</p>
      )}

      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-[#6B7185]">
        <span className="inline-flex items-center gap-1.5">
          <Icon name="calendar-due" size={14} />
          {echeance ? `Pour le ${dateLongue(echeance)}${aHeure ? ` à ${heureCourte(echeance)}` : ''}` : 'Sans date limite'}
        </span>
        {donne && <span className="inline-flex items-center gap-1.5"><Icon name="calendar" size={14} />Donné le {donne.toLocaleDateString('fr-FR')}</span>}
        {devoir.rendu_en_ligne && <span className="inline-flex items-center gap-1.5"><Icon name="upload" size={14} />À rendre en ligne</span>}
        <span className="inline-flex items-center gap-1.5">
          <Icon name="paperclip" size={14} />
          {nbFichiers ? pluriel(nbFichiers, 'pièce jointe') : 'Aucune pièce jointe'}
        </span>
      </div>

      <ListePiecesJointes fichiers={devoir.fichiers} type="devoir" />

      <div className="flex justify-end pt-1 border-t border-[#EEF1F7]">
        <button type="button" onClick={onSuivi} className={btnSecondaire}>
          <Icon name="users" size={15} /> Suivi et correction
        </button>
      </div>
    </article>
  );
}

// ── Modale de suivi et correction d'un devoir (prof) ────────────────────────
function ModalSuiviDevoir({ devoirId, onCorrige, onClose }) {
  const suivi = useAsync(() => getSuiviDevoir(devoirId), [devoirId]);
  const [editionEleveId, setEditionEleveId] = useState(null);

  const apresCorrection = eleveMaj => {
    suivi.setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        eleves: prev.eleves.map(el => (el.eleve_id === eleveMaj.eleve_id ? { ...el, ...eleveMaj } : el)),
      };
    });
    setEditionEleveId(null);
    onCorrige();
  };

  return (
    <Modal onClose={onClose} className="max-w-3xl rounded-2xl max-h-[90vh] overflow-y-auto" label="Suivi du devoir">
      <div className="p-6 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[#001257]">
              {suivi.data?.devoir?.titre ?? 'Suivi du devoir'}
            </h2>
            {suivi.data?.devoir && (
              <p className="mt-1 text-xs font-semibold text-[#07A6A6]">
                {suivi.data.devoir.classe} · {suivi.data.devoir.matiere}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le suivi"
            className="rounded-lg p-1.5 text-[#6B7185] hover:bg-[#EEF1F7] hover:text-[#001257]"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        <DataState state={suivi}>
          {({ devoir, eleves }) => {
            const nbCorriges = eleves.filter(e => e.statut === 'corrige').length;
            const nbRendus = eleves.filter(e => ['rendu', 'corrige'].includes(e.statut)).length;
            const nbFaits = eleves.filter(e => ['fait', 'rendu', 'corrige'].includes(e.statut)).length;

            return (
              <>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-[#EEF1F7] px-3 py-1 font-semibold text-[#001257]">
                    {pluriel(eleves.length, 'élève')}
                  </span>
                  <span className="rounded-full bg-[#E3F6F6] px-3 py-1 font-semibold text-[#056D6D]">
                    {pluriel(nbFaits, 'fait')}
                  </span>
                  {devoir.rendu_en_ligne && (
                    <span className="rounded-full bg-[#FFF3D6] px-3 py-1 font-semibold text-[#8A5A00]">
                      {pluriel(nbRendus, 'rendu')}
                    </span>
                  )}
                  <span className="rounded-full bg-[#E3F5EC] px-3 py-1 font-semibold text-[#1E7F55]">
                    {pluriel(nbCorriges, 'corrigé')}
                  </span>
                </div>

                {devoir.fichiers?.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <p className="text-xs font-semibold text-[#6B7185]">Pièces jointes du sujet</p>
                    <ListePiecesJointes fichiers={devoir.fichiers} type="devoir" />
                  </div>
                )}

                {eleves.length === 0 ? (
                  <p className="py-8 text-center text-sm text-[#6B7185]">Aucun élève rattaché à ce devoir.</p>
                ) : (
                  <ul className="divide-y divide-[#E1E5EE] rounded-xl border border-[#E1E5EE]">
                    {eleves.map(eleve => (
                      <LigneSuiviEleve
                        key={eleve.eleve_id}
                        devoirId={devoirId}
                        eleve={eleve}
                        enEdition={editionEleveId === eleve.eleve_id}
                        onEditer={() => setEditionEleveId(eleve.eleve_id)}
                        onAnnuler={() => setEditionEleveId(null)}
                        onEnregistre={apresCorrection}
                      />
                    ))}
                  </ul>
                )}
              </>
            );
          }}
        </DataState>

        <div className="flex justify-end pt-2 border-t border-[#E1E5EE]">
          <button type="button" onClick={onClose} className={btnSecondaire}>Fermer</button>
        </div>
      </div>
    </Modal>
  );
}

function LigneSuiviEleve({ devoirId, eleve, enEdition, onEditer, onAnnuler, onEnregistre }) {
  const [note, setNote] = useState(eleve.note ?? '');
  const [appreciation, setAppreciation] = useState(eleve.appreciation ?? '');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const ouvrirEdition = () => {
    setNote(eleve.note ?? '');
    setAppreciation(eleve.appreciation ?? '');
    setErreur('');
    onEditer();
  };

  const sauvegarder = async e => {
    e.preventDefault();
    const noteTexte = String(note).trim().replace(',', '.');
    const noteNum = noteTexte === '' ? null : Number(noteTexte);
    const appTexte = appreciation.trim();

    if (noteNum !== null && (Number.isNaN(noteNum) || noteNum < 0 || noteNum > NOTE_MAX)) {
      setErreur(`La note doit être comprise entre 0 et ${NOTE_MAX}.`);
      return;
    }
    if (noteNum === null && appTexte === '') {
      setErreur('Renseignez au moins une note ou une appréciation.');
      return;
    }

    setErreur('');
    setEnvoi(true);
    try {
      const maj = await corrigerDevoirEleve(devoirId, eleve.eleve_id, {
        note: noteNum,
        appreciation: appTexte === '' ? null : appTexte,
      });
      onEnregistre(maj);
    } catch (err) {
      setErreur(err.message || 'Impossible d’enregistrer la correction.');
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <li className="p-4 flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-[#001257]">{eleve.prenom} {eleve.nom}</span>
          <BadgeStatut statut={eleve.statut} />
          {eleve.rendu_at && (
            <span className="text-xs text-[#6B7185]">Rendu le {dateHeureCourte(eleve.rendu_at)}</span>
          )}
          {!eleve.rendu_at && eleve.fait_at && (
            <span className="text-xs text-[#6B7185]">Fait le {dateHeureCourte(eleve.fait_at)}</span>
          )}
        </div>
        {!enEdition && (
          <button type="button" onClick={ouvrirEdition} className={btnSecondaire}>
            <Icon name="edit" size={14} />
            {eleve.statut === 'corrige' ? 'Modifier la correction' : 'Corriger'}
          </button>
        )}
      </div>

      {eleve.commentaire_eleve && (
        <p className="rounded-lg bg-[#F7F8FB] px-3 py-2 text-xs text-[#1A1D2E] whitespace-pre-line break-words">
          <span className="font-semibold text-[#6B7185]">Commentaire élève : </span>
          {eleve.commentaire_eleve}
        </p>
      )}

      <ListePiecesJointes fichiers={eleve.fichiers} type="rendu" />

      {!enEdition && (eleve.note !== null || eleve.appreciation) && (
        <div className="flex flex-wrap items-baseline gap-3 rounded-lg bg-[#F3FBF7] px-3 py-2 text-xs">
          {eleve.note !== null && (
            <span className="font-bold text-[#1E7F55]">Note : {formaterNote(eleve.note)}</span>
          )}
          {eleve.appreciation && (
            <span className="text-[#1A1D2E] whitespace-pre-line break-words">{eleve.appreciation}</span>
          )}
        </div>
      )}

      {enEdition && (
        <form onSubmit={sauvegarder} className="mt-1 rounded-xl border border-[#E1E5EE] bg-[#F7F8FB] p-3 flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor={`note-${eleve.eleve_id}`} className={etiquette}>Note</label>
              <input
                id={`note-${eleve.eleve_id}`}
                type="number"
                step="0.25"
                min="0"
                max={NOTE_MAX}
                value={note}
                disabled={envoi}
                onChange={e => setNote(e.target.value)}
                placeholder="Ex. : 15.5"
                className={champ(false)}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor={`appreciation-${eleve.eleve_id}`} className={etiquette}>Appréciation</label>
              <textarea
                id={`appreciation-${eleve.eleve_id}`}
                rows={2}
                maxLength={APPRECIATION_MAX}
                value={appreciation}
                disabled={envoi}
                onChange={e => setAppreciation(e.target.value)}
                placeholder="Remarques pour l'élève…"
                className={`${champ(false)} resize-y`}
              />
            </div>
          </div>

          {erreur && (
            <p role="alert" className="text-xs font-medium text-[#B23A3A]">{erreur}</p>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onAnnuler} disabled={envoi} className={btnSecondaire}>Annuler</button>
            <button type="submit" disabled={envoi} className={btnPrincipal}>
              {envoi ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      )}
    </li>
  );
}

// ── Formulaire « Ajouter un devoir » ────────────────────────────────────────
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

        <SelecteurFichiers
          id="devoir-fichiers"
          label="Pièces jointes (facultatif)"
          aide="PDF, Word, Excel, PowerPoint, images, zip… — 10 Mo maximum par fichier. Vous pouvez en ajouter plusieurs."
          fichiers={fichiers}
          onChange={setFichiers}
          disabled={envoi}
        />

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
