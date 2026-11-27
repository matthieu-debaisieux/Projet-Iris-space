import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DataState from '@/components/ui/DataState.jsx';
import Modal from '@/components/ui/Modal.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { useAsync } from '@/hooks/useAsync.js';
import { useProfilPhoto } from '@/hooks/useProfilPhoto.js';
import { getProfil, updateProfil } from '@/services/eleve.js';

const card = 'bg-white rounded-2xl border border-[#E1E5EE] p-6';
const btnPrincipal = 'inline-flex items-center justify-center gap-2 rounded-lg bg-[#EC6F6F] px-4 py-2.5 text-sm font-bold text-[#001257] hover:opacity-90 transition';
const btnSecondaire = 'inline-flex items-center justify-center gap-2 rounded-lg border border-[#E1E5EE] bg-white px-4 py-2.5 text-sm font-semibold text-[#001257] hover:bg-[#EEF1F7] transition';

// "John Doe" → "JD"
const initiales = (...parties) => parties.join(' ').split(' ').filter(Boolean).slice(0, 2).map(m => m[0]).join('').toUpperCase();

// Champ en lecture seule, ou modifiable quand `onChange` est fourni
function Champ({ id, label, value, onChange, multiligne = false, className = '', ...autres }) {
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
        readOnly={!onChange}
        value={value ?? ''}
        onChange={onChange}
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
  const profil = useAsync(getProfil);
  const { logout, can } = useAuth();
  const navigate = useNavigate();
  const [contactOuvert, setContactOuvert] = useState(false);

  // Après un enregistrement : on garde à l'écran les coordonnées renvoyées par le service
  const majCoordonnees = maj => profil.setData(p => ({ ...p, email: maj.email, telephone: maj.telephone, adresse: maj.adresse }));

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

          <DataState state={profil}>{p => (
              <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
                {/* ── Colonne gauche : photo + actions ── */}
                <aside className={`${card} flex flex-col items-center gap-5 text-center`}>
                  <PhotoProfil prenom={p.prenom} nom={p.nom} />
                  <div>
                    <p className="text-lg font-bold text-[#001257]">{[p.prenom, p.nom].filter(Boolean).join(' ')}</p>
                    <p className="text-sm text-[#6B7185]">{[p.classe, p.anneeScolaire].filter(Boolean).join(' · ')}</p>
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

                {/* ── Colonne droite : informations ── */}
                <InfosPersonnelles p={p} modifiable={can('profil_modifier')} onSaved={majCoordonnees} />
              </div>
          )}</DataState>
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

// ── Informations personnelles : lecture seule, ou coordonnées modifiables ───
// Seuls l'email, le téléphone et l'adresse se modifient (droit `profil_modifier`) ;
// le reste (nom, naissance, classe…) est corrigé par le service scolarité.
function InfosPersonnelles({ p, modifiable, onSaved }) {
  const [edition, setEdition] = useState(false);
  const [form, setForm] = useState({ email: '', telephone: '', adresse: '' });
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState(false);
  const [enCours, setEnCours] = useState(false);

  const [jour = '', mois = '', annee = ''] = (p.dateNaissance ?? '').split('/');
  const saisir = cle => e => setForm(f => ({ ...f, [cle]: e.target.value }));

  function modifier() {
    setForm({ email: p.email ?? '', telephone: p.telephone ?? '', adresse: p.adresse ?? '' });
    setErreur('');
    setSucces(false);
    setEdition(true);
  }

  function annuler() {
    setEdition(false);
    setErreur('');
  }

  async function enregistrer(e) {
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
      onSaved(await updateProfil(champs));
      setEdition(false);
      setSucces(true);
    } catch (err) {
      // Message du back (« Cet email est déjà utilisé »…) ; TypeError = serveur injoignable
      setErreur(err instanceof TypeError ? 'Impossible de joindre le serveur. Réessayez dans un instant.' : err.message);
    } finally {
      setEnCours(false);
    }
  }

  return (
    <form className={card} onSubmit={enregistrer} noValidate>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-base font-bold text-[#001257]">Informations personnelles</h2>
        {modifiable && !edition && (
          <button type="button" onClick={modifier} className={btnSecondaire}>
            <Icone d={ICONES.crayon} size={16} /> Modifier mes informations
          </button>
        )}
      </div>
      <p className="mt-1 mb-5 text-xs text-[#6B7185]">
        {modifiable
          ? 'Vous pouvez modifier votre email, votre téléphone et votre adresse. Pour toute autre correction, contactez le service scolarité.'
          : 'Ces informations ne sont pas modifiables ici. Pour une correction, contactez le service scolarité.'}
      </p>

      {succes && !edition && (
        <p role="status" className="mb-5 rounded-lg bg-[#E3F5EC] px-4 py-3 text-sm font-semibold text-[#1E7F55]">
          Vos informations ont bien été enregistrées.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
        <Champ id="civilite" label="Civilité" value={p.civilite} />
        <Champ id="age" label="Âge" value={p.age} />
        <Champ id="nom" label="Nom" value={p.nom} />
        <Champ id="prenom" label="Prénom" value={p.prenom} />
        <Champ id="email" label="Email" value={edition ? form.email : p.email}
          onChange={edition ? saisir('email') : undefined} type="email" autoComplete="email" maxLength={254} />
        {modifiable && (
          <>
            <Champ id="telephone" label="Téléphone" value={edition ? form.telephone : p.telephone}
              onChange={edition ? saisir('telephone') : undefined} type="tel" autoComplete="tel" maxLength={30} />
            <Champ id="adresse" label="Adresse" value={edition ? form.adresse : p.adresse} multiligne className="sm:col-span-2"
              onChange={edition ? saisir('adresse') : undefined} autoComplete="street-address" maxLength={500} />
          </>
        )}
        <Champ id="naissance" label="Date de naissance" value={jour && `${jour}/${mois}/${annee}`} />
        <Champ id="lieu-naissance" label="Lieu de naissance" value={p.lieuNaissance} />
        <Champ id="pays-naissance" label="Pays de naissance" value={p.paysNaissance} />
        <Champ id="nationalite" label="Nationalité" value={p.nationalite} />
        <Champ id="classe" label="Classe" value={p.classe} />
        <Champ id="annee-scolaire" label="Année scolaire" value={p.anneeScolaire} />
      </div>

      {edition && (
        <div className="mt-6 flex flex-col gap-3 border-t border-[#E1E5EE] pt-5">
          {erreur && <p role="alert" className="text-xs font-medium text-[#B23A3A]">{erreur}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={annuler} disabled={enCours} className={`${btnSecondaire} disabled:opacity-60`}>Annuler</button>
            <button type="submit" disabled={enCours} className={`${btnPrincipal} disabled:opacity-60`}>
              {enCours ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}
    </form>
  );
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
      setErreur(err.message);
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => entree.current?.click()}
        aria-label="Changer la photo de profil"
        className="group relative h-32 w-32 overflow-hidden rounded-full bg-[#F8B005] ring-4 ring-[#EEF1F7] focus:outline-none focus-visible:ring-[#001257]"
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
          <button type="button" onClick={() => { supprimer(); setErreur(''); }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E1E5EE] px-3 py-2 text-xs font-semibold text-[#B23A3A] hover:bg-[#FBE6E6] transition">
            <Icone d={ICONES.corbeille} size={15} /> Retirer
          </button>
        )}
      </div>

      <p className="text-xs text-[#6B7185]">PNG, JPG ou WebP · 5 Mo maximum</p>
      {erreur && <p role="alert" className="text-xs font-medium text-[#B23A3A]">{erreur}</p>}
    </div>
  );
}