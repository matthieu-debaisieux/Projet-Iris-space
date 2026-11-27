import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DataState from '@/components/ui/DataState.jsx';
import Modal from '@/components/ui/Modal.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { useAsync } from '@/hooks/useAsync.js';
import { getMonProfil } from '@/services/profil.js';

const inputClass = 'rounded-md border border-gray-300 bg-white py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-principal)]';
const labelClass = 'text-[var(--color-principal)] font-semibold text-sm';

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
function Champ({ id, label, value, type = 'text', width = 'w-full px-3', placeholder = 'Non renseigné' }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className={labelClass}>{label}</label>
      <input
        type={type}
        id={id}
        name={id}
        className={`${width} ${inputClass}`}
        value={value ?? ''}
        placeholder={placeholder}
        readOnly
      />
    </div>
  );
}

export default function Profil() {
  const [contactOpen, setContactOpen] = useState(false);
  const closeContact = () => setContactOpen(false);
  const { user, logout } = useAuth();
  const profil = useAsync(() => getMonProfil(user), [user?.id, user?.role]);
  const navigate = useNavigate();

  async function deconnexion() {
    await logout();
    navigate('/');
  }

  return (
    <>
      {/* corps de page : sidebar + contenu */}
      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden md:flex flex-col justify-between w-56 shrink-0 bg-white border-r border-gray-200 py-6 px-5">
          <nav className="flex flex-col gap-5">
            <button
              type="button"
              onClick={() => setContactOpen(true)}
              className="flex items-center gap-3 text-[var(--color-principal)] font-medium hover:-translate-y-0.5 transition-transform duration-200 text-left"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              Nous contacter
            </button>
          </nav>

          <nav className="flex flex-col gap-1">
            <Link to="/profil" className="flex items-center gap-3 text-[var(--color-principal)] font-semibold border-l-4 border-[var(--color-principal)] bg-gray-100 -ml-5 pl-4 py-2 rounded-r-md">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Informations
            </Link>
            <button type="button" onClick={deconnexion} className="flex items-center gap-3 text-[var(--color-principal)] font-medium hover:-translate-y-0.5 transition-transform duration-200 pl-0 pt-3 text-left">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                <line x1="12" y1="2" x2="12" y2="12" />
              </svg>
              Déconnexion
            </button>
          </nav>
        </aside>

        <main className="flex-1 overflow-auto p-6 md:p-10">
          {/* Actions mobiles (sidebar masquée sous md) */}
          <div className="flex md:hidden items-center justify-between gap-3 max-w-4xl mx-auto mb-4">
            <button
              type="button"
              onClick={() => setContactOpen(true)}
              className="btn btn-sm btn-outline text-[var(--color-principal)]"
            >
              Nous contacter
            </button>
            <button
              type="button"
              onClick={deconnexion}
              className="btn btn-sm bg-[var(--color-button)] text-white border-0"
            >
              Déconnexion
            </button>
          </div>

          <DataState state={profil}>{p => {
            const role = p.role ?? user?.role ?? 'eleve';
            const dateBrute = p.date_naissance ?? p.dateNaissance;
            const [jour, mois, annee] = decomposerDate(dateBrute);
            const age = p.age != null ? String(p.age) : calculerAge(dateBrute);
            const estEleve = role === 'eleve';
            const estProf = role === 'professeur' || role === 'prof';
            const estAdmin = role === 'administrateur' || role === 'direction' || role === 'admin' || role === 'dev';

            return (
              <form className="bg-gray-200/70 rounded-2xl p-6 md:p-8 max-w-4xl mx-auto">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-6 mb-6 border-b border-gray-300">
                  <div>
                    <h1 className="text-xl font-bold text-[var(--color-principal)]">
                      {[p.prenom, p.nom].filter(Boolean).join(' ') || p.identifiant}
                    </h1>
                    {p.identifiant && (
                      <p className="text-xs text-gray-500 mt-0.5">Identifiant : {p.identifiant}</p>
                    )}
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[var(--color-principal)] text-white">
                    {ROLE_LABELS[role] ?? 'Utilisateur'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-10 gap-y-6">
                  <Champ id="nom" label="Nom" value={p.nom} />
                  <Champ id="prenom" label="Prénom" value={p.prenom} />
                  <Champ id="identifiant" label="Identifiant" value={p.identifiant} />

                  <Champ id="email" label="Email" value={p.email} type="email" />
                  <Champ id="telephone" label="Téléphone" value={p.telephone} />
                  <Champ id="age" label="Âge" value={age} width="w-24 px-3" placeholder="—" />

                  <div className="flex flex-col gap-1">
                    <label className={labelClass}>Date de naissance</label>
                    <div className="flex gap-2">
                      <input type="text" name="jour" placeholder="JJ" maxLength={2} className={`w-14 px-2 text-center ${inputClass}`} value={jour} readOnly />
                      <input type="text" name="mois" placeholder="MM" maxLength={2} className={`w-14 px-2 text-center ${inputClass}`} value={mois} readOnly />
                      <input type="text" name="annee" placeholder="AAAA" maxLength={4} className={`w-16 px-2 text-center ${inputClass}`} value={annee} readOnly />
                    </div>
                  </div>
                  <Champ id="lieu-naissance" label="Lieu de naissance" value={p.lieu_naissance ?? p.lieuNaissance} />
                  <Champ id="pays-naissance" label="Pays de naissance" value={p.pays_naissance ?? p.paysNaissance} />

                  <Champ id="nationalite" label="Nationalité" value={p.nationalite} />
                  {p.adresse && <Champ id="adresse" label="Adresse" value={p.adresse} />}

                  {estEleve && (
                    <>
                      <Champ id="classe" label="Classe" value={p.classe} />
                      <Champ id="annee-scolaire" label="Année scolaire" value={p.annee_scolaire ?? p.anneeScolaire} />
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-gray-300">
                    <div>
                      <p className={`${labelClass} mb-2`}>Matières enseignées</p>
                      {Array.isArray(p.matieres) && p.matieres.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {p.matieres.map(m => (
                            <span key={m.id ?? m.nom} className="px-3 py-1 rounded-full text-xs font-medium bg-white border border-gray-300 text-gray-700">
                              {m.nom}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500">Aucune matière rattachée.</p>
                      )}
                    </div>
                    <div>
                      <p className={`${labelClass} mb-2`}>Classes</p>
                      {Array.isArray(p.classes) && p.classes.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {p.classes.map(c => (
                            <span key={c.id ?? c.nom} className="px-3 py-1 rounded-full text-xs font-medium bg-white border border-gray-300 text-gray-700">
                              {c.nom}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500">Aucun cours planifié pour le moment.</p>
                      )}
                    </div>
                  </div>
                )}
              </form>
            );
          }}</DataState>
        </main>
      </div>

      {/* Modale "Nous contacter" */}
      {contactOpen && (
        <Modal onClose={closeContact} className="max-w-md rounded-2xl p-6 shadow-xl" label="Nous contacter">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-[var(--color-principal)]">Nous contacter</h2>
              <p className="mt-2 text-sm text-gray-600">Vous pouvez joindre l’équipe pédagogique ou le service scolarité pour toute modification.</p>
            </div>
            <button type="button" onClick={closeContact} className="text-2xl leading-none text-gray-400 hover:text-gray-600" aria-label="Fermer la fenêtre">×</button>
          </div>

          <div className="mt-5 space-y-3 text-sm text-gray-700">
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="font-semibold text-[var(--color-principal)]">Email</p>
              <p>contact@mediaschool.eu</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="font-semibold text-[var(--color-principal)]">Téléphone</p>
              <p>01 23 45 67 89</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="font-semibold text-[var(--color-principal)]">Bureau</p>
              <p>Service scolarité – Bâtiment A, salle 12</p>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button type="button" onClick={closeContact} className="rounded-full bg-[var(--color-principal)] px-4 py-2 text-sm font-medium text-white hover:opacity-90">Fermer</button>
          </div>
        </Modal>
      )}
    </>
  );
}
