import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DataState from '@/components/ui/DataState.jsx';
import Modal from '@/components/ui/Modal.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { useAsync } from '@/hooks/useAsync.js';
import { useProfilPhoto } from '@/hooks/useProfilPhoto.js';
import { getMonProfil } from '@/services/profil.js';

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

// Champ en lecture seule
function Champ({ id, label, value, type = 'text', placeholder = 'Non renseigné' }) {
  return (
    <div>
      <label htmlFor={id} className="block mb-1.5 text-xs font-semibold text-[#6B7185]">{label}</label>
      <input
        id={id}
        name={id}
        type={type}
        readOnly
        value={value ?? ''}
        placeholder={placeholder}
        className="w-full rounded-lg border border-[#E1E5EE] bg-[#F7F8FB] px-3 py-2.5 text-sm text-[#1A1D2E] focus:outline-none"
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
  corbeille: 'M3 6h18 M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2 M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6',
};

export default function Profil() {
  const { user, logout } = useAuth();
  const profil = useAsync(() => getMonProfil(user), [user?.id, user?.role]);
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

                {/* ── Colonne droite : informations adaptées au rôle (lecture seule) ── */}
                <form className={card} onSubmit={e => e.preventDefault()}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h2 className="text-base font-bold text-[#001257]">Informations personnelles</h2>
                      <p className="mt-1 mb-5 text-xs text-[#6B7185]">
                        Ces informations ne sont pas modifiables ici. Pour une correction, contactez le service scolarité.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                    {p.civilite && <Champ id="civilite" label="Civilité" value={p.civilite} />}
                    <Champ id="nom" label="Nom" value={p.nom} />
                    <Champ id="prenom" label="Prénom" value={p.prenom} />
                    <Champ id="identifiant" label="Identifiant" value={p.identifiant} />
                    <Champ id="email" label="Email" value={p.email} type="email" />
                    <Champ id="telephone" label="Téléphone" value={p.telephone} />
                    <Champ id="age" label="Âge" value={age} placeholder="—" />
                    <Champ id="naissance" label="Date de naissance" value={dateFormatee} />
                    <Champ id="lieu-naissance" label="Lieu de naissance" value={p.lieu_naissance ?? p.lieuNaissance} />
                    <Champ id="pays-naissance" label="Pays de naissance" value={p.pays_naissance ?? p.paysNaissance} />
                    <Champ id="nationalite" label="Nationalité" value={p.nationalite} />
                    {p.adresse && <Champ id="adresse" label="Adresse" value={p.adresse} />}

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
                </form>
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
