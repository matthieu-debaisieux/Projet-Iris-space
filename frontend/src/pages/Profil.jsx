import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DataState from '@/components/ui/DataState.jsx';
import Modal from '@/components/ui/Modal.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { useAsync } from '@/hooks/useAsync.js';
import { useProfilPhoto } from '@/hooks/useProfilPhoto.js';
import { USE_MOCKS } from '@/services/api.js';
import { updateProfil } from '@/services/eleve.js';
import { getMonProfil } from '@/services/profil.js';
import {
  changerMotDePasse,
  confirmerDoubleAuthentification,
  desactiverDoubleAuthentification,
  preparerDoubleAuthentification,
} from '@/services/auth.js';

const card = 'bg-white rounded-2xl border border-[#E1E5EE] p-6';
const btnPrincipal = 'inline-flex items-center justify-center gap-2 rounded-lg bg-[#EC6F6F] px-4 py-2.5 text-sm font-bold text-[#001257] hover:opacity-90 transition';
const btnSecondaire = 'inline-flex items-center justify-center gap-2 rounded-lg border border-[#E1E5EE] bg-white px-4 py-2.5 text-sm font-semibold text-[#001257] hover:bg-[#EEF1F7] transition';

// "John Doe" → "JD"
const initiales = (...parties) => parties.join(' ').split(' ').filter(Boolean).slice(0, 2).map(m => m[0]).join('').toUpperCase();

const ROLE_LABELS = {
  eleve: 'Élève',
  prof: 'Professeur',
  professeur: 'Professeur',
  admin: 'Administrateur',
  administrateur: 'Administrateur',
  direction: 'Direction',
  dev: 'Développeur',
};

function decomposerDate(valeur) {
  if (!valeur || typeof valeur !== 'string') return ['', '', ''];
  const iso = valeur.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return [iso[3], iso[2], iso[1]];
  const fr = valeur.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (fr) return [fr[1], fr[2], fr[3]];
  return ['', '', ''];
}

function calculerAge(valeur) {
  const [jj, mm, aaaa] = decomposerDate(valeur);
  if (!jj || !mm || !aaaa) return '';
  const naissance = new Date(Number(aaaa), Number(mm) - 1, Number(jj));
  if (Number.isNaN(naissance.getTime())) return '';
  const today = new Date();
  let age = today.getFullYear() - naissance.getFullYear();
  const diffMois = today.getMonth() - naissance.getMonth();
  if (diffMois < 0 || (diffMois === 0 && today.getDate() < naissance.getDate())) {
    age--;
  }
  return age >= 0 ? String(age) : '';
}

function formaterDateHeure(valeur) {
  if (!valeur) return '';
  const date = new Date(valeur);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
}

// Champ en lecture seule, ou modifiable quand `onChange` est fourni
function Champ({ id, label, value, type = 'text', placeholder = 'Non renseigné', onChange, multiligne = false, className = '', ...autres }) {
  const Balise = multiligne ? 'textarea' : 'input';
  const style = onChange
    ? 'border-[#001257]/40 bg-white focus:border-[#001257]'
    : 'border-[#E1E5EE] bg-[#F7F8FB]';
  return (
    <div className={className}>
      <label htmlFor={id} className="block mb-1.5 text-xs font-semibold text-[#6B7185]">{label}</label>
      <Balise
        id={id}
        name={id}
        {...(!multiligne && { type })}
        readOnly={!onChange}
        value={value ?? ''}
        onChange={onChange}
        placeholder={placeholder}
        {...(multiligne && { rows: 2 })}
        {...autres}
        className={`w-full rounded-lg border px-3 py-2.5 text-sm text-[#1A1D2E] focus:outline-none transition ${style} ${multiligne ? 'resize-none' : ''}`}
      />
    </div>
  );
}

const Icone = ({ d, size = 18 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);
const ICONES = {
  camera: 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  aide: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3 M12 17h.01',
  sortie: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9',
  crayon: 'M12 20h9 M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z',
  corbeille: 'M3 6h18 M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2 M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6',
};

export default function Profil() {
  const { user, logout, can } = useAuth();
  const profil = useAsync(() => getMonProfil(user), [user?.id, user?.role]);
  const coordonnees = useCoordonnees(profil);
  const modifiable = can('profil_modifier'); // élève : email, téléphone, adresse (PATCH /eleve/profil)
  const navigate = useNavigate();
  const [contactOuvert, setContactOuvert] = useState(false);

  async function deconnexion() {
    await logout();
    navigate('/');
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto bg-[var(--color-page)]">
        <div className="mx-auto w-full max-w-[1100px] px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#001257]">Mon profil</h1>
            <p className="mt-1 text-sm text-[#6B7185]">Vos informations et votre photo.</p>
          </div>

          <DataState state={profil}>{p => {
            const role = p.role ?? user?.role ?? 'eleve';
            const dateBrute = p.date_naissance ?? p.dateNaissance;
            const [jour, mois, annee] = decomposerDate(dateBrute);
            const dateFormatee = jour && mois && annee ? `${jour}/${mois}/${annee}` : '';
            const age = p.age != null ? String(p.age) : calculerAge(dateBrute);
            const anneeScolaire = p.annee_scolaire ?? p.anneeScolaire;
            const estEleve = role === 'eleve';
            const estProf = role === 'professeur' || role === 'prof';
            const estAdmin = role === 'administrateur' || role === 'direction' || role === 'admin' || role === 'dev';

            return (
              <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
                {/* ── Colonne gauche : photo + identité + actions ── */}
                <aside className={`${card} flex flex-col items-center gap-5 text-center`}>
                  <PhotoProfil prenom={p.prenom} nom={p.nom} />
                  <div className="flex flex-col items-center gap-1.5">
                    <p className="text-lg font-bold text-[#001257]">
                      {[p.prenom, p.nom].filter(Boolean).join(' ') || p.identifiant}
                    </p>
                    <span className="rounded-full bg-[#001257] px-3 py-0.5 text-xs font-semibold text-white">
                      {ROLE_LABELS[role] ?? 'Utilisateur'}
                    </span>
                    {estEleve && (p.classe || anneeScolaire) && (
                      <p className="text-sm text-[#6B7185]">
                        {[p.classe, anneeScolaire].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    {!estEleve && p.identifiant && (
                      <p className="text-xs text-[#6B7185]">@{p.identifiant}</p>
                    )}
                  </div>
                  <div className="flex w-full flex-col gap-2 border-t border-[#E1E5EE] pt-5">
                    <button type="button" onClick={() => setContactOuvert(true)} className={btnSecondaire}>
                      <Icone d={ICONES.aide} /> Nous contacter
                    </button>
                    <button type="button" onClick={deconnexion} className={btnSecondaire}>
                      <Icone d={ICONES.sortie} /> Déconnexion
                    </button>
                  </div>
                </aside>

                {/* ── Colonne droite : informations + sécurité du compte ── */}
                <div className="flex flex-col gap-6">
                  <form className={card} onSubmit={e => coordonnees.enregistrer(e, p)} noValidate>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h2 className="text-base font-bold text-[#001257]">Informations personnelles</h2>
                        <p className="mt-1 mb-5 text-xs text-[#6B7185]">
                          {modifiable
                            ? 'Vous pouvez modifier votre email, votre téléphone et votre adresse. Pour toute autre correction, contactez le service scolarité.'
                            : 'Ces informations ne sont pas modifiables ici. Pour une correction, contactez le service scolarité.'}
                        </p>
                      </div>
                      {modifiable && !coordonnees.edition && (
                        <button type="button" onClick={() => coordonnees.modifier(p)} className={btnSecondaire}>
                          <Icone d={ICONES.crayon} size={16} /> Modifier mes informations
                        </button>
                      )}
                    </div>

                    {coordonnees.succes && !coordonnees.edition && (
                      <p role="status" className="mb-5 rounded-lg bg-[#E3F5EC] px-4 py-3 text-sm font-semibold text-[#1E7F55]">
                        Vos informations ont bien été enregistrées.
                      </p>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                      {p.civilite && <Champ id="civilite" label="Civilité" value={p.civilite} />}
                      <Champ id="nom" label="Nom" value={p.nom} />
                      <Champ id="prenom" label="Prénom" value={p.prenom} />
                      <Champ id="identifiant" label="Identifiant" value={p.identifiant} />
                      <Champ id="email" label="Email" type="email" autoComplete="email" maxLength={254}
                        value={coordonnees.edition ? coordonnees.form.email : p.email}
                        onChange={coordonnees.edition ? coordonnees.saisir('email') : undefined} />
                      <Champ id="telephone" label="Téléphone" type="tel" autoComplete="tel" maxLength={30}
                        value={coordonnees.edition ? coordonnees.form.telephone : p.telephone}
                        onChange={coordonnees.edition ? coordonnees.saisir('telephone') : undefined} />
                      <Champ id="age" label="Âge" value={age} placeholder="—" />
                      <Champ id="naissance" label="Date de naissance" value={dateFormatee} />
                      <Champ id="lieu-naissance" label="Lieu de naissance" value={p.lieu_naissance ?? p.lieuNaissance} />
                      <Champ id="pays-naissance" label="Pays de naissance" value={p.pays_naissance ?? p.paysNaissance} />
                      <Champ id="nationalite" label="Nationalité" value={p.nationalite} />
                      {(p.adresse || modifiable) && (
                        <Champ id="adresse" label="Adresse" multiligne className="sm:col-span-2" autoComplete="street-address" maxLength={500}
                          value={coordonnees.edition ? coordonnees.form.adresse : p.adresse}
                          onChange={coordonnees.edition ? coordonnees.saisir('adresse') : undefined} />
                      )}

                      {estEleve && (
                        <>
                          <Champ id="classe" label="Classe" value={p.classe} />
                          <Champ id="annee-scolaire" label="Année scolaire" value={anneeScolaire} />
                          {p.numero_etudiant && (
                            <Champ id="numero-etudiant" label="Numéro étudiant" value={p.numero_etudiant} />
                          )}
                        </>
                      )}

                      {estAdmin && (
                        <>
                          <Champ id="role-label" label="Fonction" value={ROLE_LABELS[role] ?? role} />
                          <Champ
                            id="derniere-connexion"
                            label="Dernière connexion"
                            value={formaterDateHeure(p.derniere_connexion)}
                            placeholder="Première connexion"
                          />
                        </>
                      )}
                    </div>

                    {estProf && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6 pt-6 border-t border-[#E1E5EE]">
                        <div>
                          <p className="mb-2 text-xs font-semibold text-[#6B7185]">Matières enseignées</p>
                          {Array.isArray(p.matieres) && p.matieres.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {p.matieres.map(m => (
                                <span key={m.id ?? m.nom} className="rounded-full bg-[#EEF1F7] px-3 py-1 text-xs font-medium text-[#001257]">
                                  {m.nom}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-[#6B7185]">Aucune matière rattachée.</p>
                          )}
                        </div>
                        <div>
                          <p className="mb-2 text-xs font-semibold text-[#6B7185]">Classes</p>
                          {Array.isArray(p.classes) && p.classes.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {p.classes.map(c => (
                                <span key={c.id ?? c.nom} className="rounded-full bg-[#EEF1F7] px-3 py-1 text-xs font-medium text-[#001257]">
                                  {c.nom}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-[#6B7185]">Aucun cours planifié pour le moment.</p>
                          )}
                        </div>
                      </div>
                    )}

                    {coordonnees.edition && (
                      <div className="mt-6 flex flex-col gap-3 border-t border-[#E1E5EE] pt-5">
                        {coordonnees.erreur && <p role="alert" className="text-xs font-medium text-[#B23A3A]">{coordonnees.erreur}</p>}
                        <div className="flex flex-wrap justify-end gap-2">
                          <button type="button" onClick={coordonnees.annuler} disabled={coordonnees.enCours} className={`${btnSecondaire} disabled:opacity-60`}>Annuler</button>
                          <button type="submit" disabled={coordonnees.enCours} className={`${btnPrincipal} disabled:opacity-60`}>
                            {coordonnees.enCours ? 'Enregistrement…' : 'Enregistrer'}
                          </button>
                        </div>
                      </div>
                    )}
                  </form>

                  <SecuriteMotDePasse />

                  {can('double_authentification') && (
                    <DoubleAuthentification
                      actif={Boolean(p.totp_actif)}
                      onChange={actif => profil.setData(ancien => ({ ...ancien, totp_actif: actif }))}
                    />
                  )}
                </div>
              </div>
            );
          }}</DataState>
        </div>
      </div>

      {contactOuvert && (
        <Modal onClose={() => setContactOuvert(false)} className="max-w-md rounded-2xl p-6" label="Nous contacter">
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-bold text-[#001257]">Nous contacter</h2>
              <p className="mt-1 text-sm text-[#6B7185]">Vous pouvez joindre l'équipe pédagogique ou le service scolarité pour toute modification.</p>
            </div>
            {[['Email', 'contact@mediaschool.eu'], ['Téléphone', '01 23 45 67 89'], ['Bureau', 'Service scolarité – Bâtiment A, salle 12']].map(([titre, valeur]) => (
              <div key={titre} className="rounded-xl bg-[#EEF1F7] px-4 py-3">
                <p className="text-xs font-semibold text-[#6B7185]">{titre}</p>
                <p className="text-sm font-medium text-[#1A1D2E]">{valeur}</p>
              </div>
            ))}
            <div className="flex justify-end pt-2">
              <button type="button" onClick={() => setContactOuvert(false)} className={btnPrincipal}>Fermer</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

// ── Modification des coordonnées (droit `profil_modifier`) ──────────────────
// Seuls l'email, le téléphone et l'adresse se modifient ; le reste (nom, naissance, classe…)
// est corrigé par le service scolarité.
function useCoordonnees(profil) {
  const [edition, setEdition] = useState(false);
  const [form, setForm] = useState({ email: '', telephone: '', adresse: '' });
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState(false);
  const [enCours, setEnCours] = useState(false);

  const saisir = cle => e => setForm(f => ({ ...f, [cle]: e.target.value }));

  function modifier(p) {
    setForm({ email: p.email ?? '', telephone: p.telephone ?? '', adresse: p.adresse ?? '' });
    setErreur('');
    setSucces(false);
    setEdition(true);
  }

  function annuler() {
    setEdition(false);
    setErreur('');
  }

  async function enregistrer(e, p) {
    e.preventDefault();
    if (!edition || enCours) return;

    // PATCH : on n'envoie que les champs réellement modifiés
    const champs = Object.fromEntries(Object.entries(form).filter(([cle, valeur]) => valeur.trim() !== (p[cle] ?? '')));
    if (Object.keys(champs).length === 0) {
      setEdition(false);
      return;
    }

    setErreur('');
    setEnCours(true);
    try {
      const maj = await updateProfil(champs);
      // On garde à l'écran les coordonnées renvoyées par le service
      profil.setData(ancien => ({ ...ancien, email: maj.email, telephone: maj.telephone, adresse: maj.adresse }));
      setEdition(false);
      setSucces(true);
    } catch (err) {
      // Message du back (« Cet email est déjà utilisé »…) ; TypeError = serveur injoignable
      setErreur(err instanceof TypeError ? 'Impossible de joindre le serveur. Réessayez dans un instant.' : err.message);
    } finally {
      setEnCours(false);
    }
  }

  return { edition, form, erreur, succes, enCours, saisir, modifier, annuler, enregistrer };
}

// ── Photo de profil : aperçu + envoi d'une image depuis l'ordinateur ────────
function PhotoProfil({ prenom, nom }) {
  const { photo, enregistrer, supprimer } = useProfilPhoto();
  const entree = useRef(null);
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);

  async function choisir(e) {
    const fichier = e.target.files?.[0];
    e.target.value = ''; // permet de rechoisir le même fichier
    if (!fichier) return;
    setErreur('');
    setEnCours(true);
    try {
      await enregistrer(fichier);
    } catch (err) {
      setErreur(err instanceof TypeError ? 'Impossible de joindre le serveur. Réessayez dans un instant.' : err.message);
    } finally {
      setEnCours(false);
    }
  }

  async function retirer() {
    if (enCours) return;
    setErreur('');
    setEnCours(true);
    try {
      await supprimer();
    } catch (err) {
      setErreur(err instanceof TypeError ? 'Impossible de joindre le serveur. Réessayez dans un instant.' : err.message);
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => entree.current?.click()}
        disabled={enCours}
        aria-label="Changer la photo de profil"
        className="group relative h-32 w-32 overflow-hidden rounded-full bg-[#F8B005] ring-4 ring-[#EEF1F7] focus:outline-none focus-visible:ring-[#001257] disabled:opacity-75"
      >
        {photo
          ? <img src={photo} alt="Ma photo de profil" className="h-full w-full object-cover" />
          : <span className="flex h-full w-full items-center justify-center text-4xl font-bold text-[#001257]">{initiales(prenom, nom) || '?'}</span>}
        <span className="absolute inset-0 flex items-center justify-center bg-[#001257]/55 text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
          <Icone d={ICONES.camera} size={26} />
        </span>
      </button>

      <input ref={entree} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={choisir} />

      <div className="flex gap-2">
        <button type="button" onClick={() => entree.current?.click()} disabled={enCours}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#EC6F6F] px-3 py-2 text-xs font-bold text-[#001257] hover:opacity-90 disabled:opacity-60 transition">
          <Icone d={ICONES.camera} size={15} /> {enCours ? 'Envoi…' : photo ? 'Changer la photo' : 'Ajouter une photo'}
        </button>
        {photo && (
          <button type="button" onClick={retirer} disabled={enCours}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E1E5EE] px-3 py-2 text-xs font-semibold text-[#B23A3A] hover:bg-[#FBE6E6] disabled:opacity-60 transition">
            <Icone d={ICONES.corbeille} size={15} /> Retirer
          </button>
        )}
      </div>

      <p className="text-xs text-[#6B7185]">PNG, JPG ou WebP · {USE_MOCKS ? '5' : '2'} Mo maximum</p>
      {erreur && <p role="alert" className="text-xs font-medium text-[#B23A3A]">{erreur}</p>}
    </div>
  );
}

// ── Changement de mot de passe (CPT-06) ─────────────────────────────────────
function SecuriteMotDePasse() {
  const [ancien, setAncien] = useState('');
  const [nouveau, setNouveau] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');
  const [enCours, setEnCours] = useState(false);

  async function enregistrer(e) {
    e.preventDefault();
    setErreur('');
    setSucces('');

    if (!ancien) {
      setErreur("L'ancien mot de passe est obligatoire.");
      return;
    }
    if (nouveau.length < 8 || !/\p{L}/u.test(nouveau) || !/\d/.test(nouveau)) {
      setErreur('Le nouveau mot de passe doit contenir au moins 8 caractères, une lettre et un chiffre.');
      return;
    }
    if (nouveau === ancien) {
      setErreur("Le nouveau mot de passe doit être différent de l'ancien.");
      return;
    }
    if (nouveau !== confirmation) {
      setErreur('La confirmation ne correspond pas au nouveau mot de passe.');
      return;
    }

    setEnCours(true);
    try {
      const res = await changerMotDePasse(ancien, nouveau);
      setSucces(res?.message || 'Mot de passe modifié.');
      setAncien('');
      setNouveau('');
      setConfirmation('');
    } catch (err) {
      setErreur(err?.message || 'Impossible de modifier le mot de passe.');
    } finally {
      setEnCours(false);
    }
  }

  return (
    <form className={card} onSubmit={enregistrer} noValidate>
      <h2 className="text-base font-bold text-[#001257]">Mot de passe</h2>
      <p className="mt-1 mb-5 text-xs text-[#6B7185]">
        Au moins 8 caractères, dont une lettre et un chiffre.
      </p>

      {succes && (
        <p role="status" className="mb-4 rounded-lg bg-[#E3F5EC] px-4 py-3 text-sm font-semibold text-[#1E7F55]">
          {succes}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
        <Champ
          id="mdp-ancien"
          label="Ancien mot de passe"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          className="sm:col-span-2"
          value={ancien}
          onChange={e => setAncien(e.target.value)}
        />
        <Champ
          id="mdp-nouveau"
          label="Nouveau mot de passe"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={nouveau}
          onChange={e => setNouveau(e.target.value)}
        />
        <Champ
          id="mdp-confirmation"
          label="Confirmer le nouveau mot de passe"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={confirmation}
          onChange={e => setConfirmation(e.target.value)}
        />
      </div>

      {erreur && <p role="alert" className="mt-4 text-xs font-medium text-[#B23A3A]">{erreur}</p>}

      <div className="mt-5 flex justify-end">
        <button type="submit" disabled={enCours} className={`${btnPrincipal} disabled:opacity-60`}>
          {enCours ? 'Modification…' : 'Changer le mot de passe'}
        </button>
      </div>
    </form>
  );
}

// ── Double authentification TOTP (SEC-03) ───────────────────────────────────
function DoubleAuthentification({ actif, onChange }) {
  const [config, setConfig] = useState(null); // { secret, otpauth_url }
  const [code, setCode] = useState('');
  const [desactivationOuverte, setDesactivationOuverte] = useState(false);
  const [motDePasse, setMotDePasse] = useState('');
  const [copie, setCopie] = useState('');
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');
  const [enCours, setEnCours] = useState(false);

  async function demarrerActivation() {
    setErreur('');
    setSucces('');
    setEnCours(true);
    try {
      const data = await preparerDoubleAuthentification();
      setConfig(data);
      setCode('');
    } catch (err) {
      setErreur(err?.message || 'Impossible de préparer la double authentification.');
    } finally {
      setEnCours(false);
    }
  }

  async function confirmerActivation(e) {
    e.preventDefault();
    setErreur('');
    setSucces('');
    const propre = code.replace(/\s+/g, '');
    if (!/^\d{6}$/.test(propre)) {
      setErreur('Saisissez le code à 6 chiffres généré par votre application.');
      return;
    }

    setEnCours(true);
    try {
      const res = await confirmerDoubleAuthentification(propre);
      setConfig(null);
      setCode('');
      setSucces(res?.message || 'Double authentification activée.');
      onChange(true);
    } catch (err) {
      setErreur(err?.message || 'Code incorrect.');
    } finally {
      setEnCours(false);
    }
  }

  async function confirmerDesactivation(e) {
    e.preventDefault();
    setErreur('');
    setSucces('');
    if (!motDePasse) {
      setErreur('Saisissez votre mot de passe pour désactiver la double authentification.');
      return;
    }

    setEnCours(true);
    try {
      const res = await desactiverDoubleAuthentification(motDePasse);
      setDesactivationOuverte(false);
      setMotDePasse('');
      setSucces(res?.message || 'Double authentification désactivée.');
      onChange(false);
    } catch (err) {
      setErreur(err?.message || 'Impossible de désactiver la double authentification.');
    } finally {
      setEnCours(false);
    }
  }

  function copierTexte(cle, valeur) {
    if (!navigator.clipboard?.writeText) return;
    navigator.clipboard.writeText(valeur).then(() => {
      setCopie(cle);
      setTimeout(() => setCopie(c => (c === cle ? '' : c)), 2000);
    }).catch(() => {});
  }

  const cleFormatee = config?.secret ? config.secret.replace(/(.{4})/g, '$1 ').trim() : '';

  return (
    <section className={card}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-[#001257]">Double authentification (2FA)</h2>
          <p className="mt-1 text-xs text-[#6B7185]">
            Protégez votre compte avec un code temporaire (Google Authenticator, FreeOTP…).
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${actif ? 'bg-[#E3F5EC] text-[#1E7F55]' : 'bg-[#EEF1F7] text-[#6B7185]'}`}>
          {actif ? 'Activée' : 'Désactivée'}
        </span>
      </div>

      {succes && (
        <p role="status" className="mt-4 rounded-lg bg-[#E3F5EC] px-4 py-3 text-sm font-semibold text-[#1E7F55]">
          {succes}
        </p>
      )}
      {erreur && <p role="alert" className="mt-4 text-xs font-medium text-[#B23A3A]">{erreur}</p>}

      {!actif && !config && (
        <div className="mt-5 flex justify-end">
          <button type="button" onClick={demarrerActivation} disabled={enCours} className={`${btnPrincipal} disabled:opacity-60`}>
            {enCours ? 'Préparation…' : 'Activer la double authentification'}
          </button>
        </div>
      )}

      {!actif && config && (
        <form onSubmit={confirmerActivation} noValidate className="mt-5 flex flex-col gap-4 border-t border-[#E1E5EE] pt-5">
          <p className="text-xs text-[#1A1D2E]">
            Ajoutez ce compte dans votre application d&apos;authentification avec la clé secrète ou le lien ci-dessous, puis saisissez le code à 6 chiffres pour confirmer.
          </p>

          <div className="rounded-xl bg-[#F7F8FB] border border-[#E1E5EE] p-3 flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#6B7185]">Clé secrète (Base32)</span>
              <button type="button" onClick={() => copierTexte('secret', config.secret)} className="text-xs font-semibold text-[#001257] underline">
                {copie === 'secret' ? 'Copié' : 'Copier la clé'}
              </button>
            </div>
            <code className="break-all font-mono text-sm font-semibold text-[#001257]">{cleFormatee}</code>
          </div>

          <div className="rounded-xl bg-[#F7F8FB] border border-[#E1E5EE] p-3 flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#6B7185]">URL otpauth://</span>
              <button type="button" onClick={() => copierTexte('url', config.otpauth_url)} className="text-xs font-semibold text-[#001257] underline">
                {copie === 'url' ? 'Copié' : 'Copier le lien'}
              </button>
            </div>
            <code className="break-all font-mono text-xs text-[#1A1D2E]">{config.otpauth_url}</code>
          </div>

          <Champ
            id="totp-confirmation"
            label="Code de confirmation à 6 chiffres"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={10}
            placeholder="000000"
            value={code}
            onChange={e => setCode(e.target.value)}
          />

          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => { setConfig(null); setErreur(''); }} disabled={enCours} className={`${btnSecondaire} disabled:opacity-60`}>
              Annuler
            </button>
            <button type="submit" disabled={enCours} className={`${btnPrincipal} disabled:opacity-60`}>
              {enCours ? 'Activation…' : "Confirmer l'activation"}
            </button>
          </div>
        </form>
      )}

      {actif && !desactivationOuverte && (
        <div className="mt-5 flex justify-end">
          <button type="button" onClick={() => { setDesactivationOuverte(true); setErreur(''); setSucces(''); }} className={btnSecondaire}>
            Désactiver la double authentification
          </button>
        </div>
      )}

      {actif && desactivationOuverte && (
        <form onSubmit={confirmerDesactivation} noValidate className="mt-5 flex flex-col gap-4 border-t border-[#E1E5EE] pt-5">
          <Champ
            id="totp-desactiver-mdp"
            label="Mot de passe actuel"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={motDePasse}
            onChange={e => setMotDePasse(e.target.value)}
          />
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => { setDesactivationOuverte(false); setMotDePasse(''); setErreur(''); }} disabled={enCours} className={`${btnSecondaire} disabled:opacity-60`}>
              Annuler
            </button>
            <button type="submit" disabled={enCours} className={`${btnPrincipal} disabled:opacity-60`}>
              {enCours ? 'Désactivation…' : 'Confirmer la désactivation'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
