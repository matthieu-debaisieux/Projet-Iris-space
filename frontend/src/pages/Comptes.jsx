import { useMemo, useState } from 'react';
import DataState from '@/components/ui/DataState.jsx';
import Modal from '@/components/ui/Modal.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { useAsync } from '@/hooks/useAsync.js';
import {
  ROLES_COMPTE,
  ROLE_COMPTE_BY_VALUE,
  createUtilisateur,
  deleteUtilisateur,
  getClasses,
  getUtilisateurs,
  setUtilisateurActif,
  updateUtilisateur,
} from '@/services/utilisateurs.js';

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#07A6A6]';
const labelClass = 'block text-xs font-semibold text-[var(--color-principal)] mb-1';

function genererMotDePasse(longueur = 12) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const arr = new Uint32Array(longueur);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < longueur; i++) arr[i] = Math.floor(Math.random() * chars.length);
  }
  return Array.from(arr, n => chars[n % chars.length]).join('');
}

function formaterDateHeure(valeur) {
  if (!valeur) return 'Jamais';
  const date = new Date(valeur);
  if (Number.isNaN(date.getTime())) return 'Jamais';
  return date.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

function normaliserDateInput(valeur) {
  if (!valeur || typeof valeur !== 'string') return '';
  const match = valeur.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : '';
}

function RoleBadge({ role }) {
  const info = ROLE_COMPTE_BY_VALUE[role];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
        info?.badgeClass ?? 'bg-gray-100 text-gray-700 border-gray-200'
      }`}
    >
      {info?.label ?? role}
    </span>
  );
}

function StatCard({ label, count, accentClass = 'border-gray-200 text-[var(--color-principal)]' }) {
  return (
    <div className={`bg-white rounded-xl border p-4 shadow-sm ${accentClass}`}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold mt-1">{count}</p>
    </div>
  );
}

function ChampFormulaire({ id, label, required = false, children }) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label} {required && <><span aria-hidden="true" className="text-[#B23A3A]">*</span><span className="sr-only">(obligatoire)</span></>}
      </label>
      {children}
    </div>
  );
}

function CompteFormModal({ initialUser, classes, onSaved, onClose }) {
  const edition = Boolean(initialUser);
  const [form, setForm] = useState(() => ({
    role: initialUser?.role ?? 'eleve',
    identifiant: initialUser?.identifiant ?? '',
    email: initialUser?.email ?? '',
    mot_de_passe: '',
    prenom: initialUser?.prenom ?? '',
    nom: initialUser?.nom ?? '',
    telephone: initialUser?.telephone ?? '',
    date_naissance: normaliserDateInput(initialUser?.date_naissance),
    lieu_naissance: initialUser?.lieu_naissance ?? '',
    pays_naissance: initialUser?.pays_naissance ?? '',
    nationalite: initialUser?.nationalite ?? '',
    adresse: initialUser?.adresse ?? '',
    classe_id: initialUser?.classe_id ? String(initialUser.classe_id) : '',
    numero_etudiant: initialUser?.numero_etudiant ?? '',
  }));
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const setField = (champ, valeur) => setForm(prev => ({ ...prev, [champ]: valeur }));

  async function submit(e) {
    e.preventDefault();
    setError('');

    if (!form.identifiant.trim() || !form.email.trim() || !form.prenom.trim() || !form.nom.trim()) {
      setError('Veuillez renseigner identifiant, email, prénom et nom.');
      return;
    }
    if (!edition && form.mot_de_passe.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (edition && form.mot_de_passe !== '' && form.mot_de_passe.length < 8) {
      setError('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    const payload = {
      identifiant: form.identifiant.trim(),
      email: form.email.trim(),
      nom: form.nom.trim(),
      prenom: form.prenom.trim(),
      date_naissance: form.date_naissance || null,
      lieu_naissance: form.lieu_naissance.trim() || null,
      pays_naissance: form.pays_naissance.trim() || null,
      nationalite: form.nationalite.trim() || null,
      telephone: form.telephone.trim() || null,
      adresse: form.adresse.trim() || null,
      ...(edition ? {} : { role: form.role }),
      ...(form.mot_de_passe !== '' ? { mot_de_passe: form.mot_de_passe } : {}),
      ...(form.role === 'eleve'
        ? {
            classe_id: form.classe_id ? Number(form.classe_id) : null,
            numero_etudiant: form.numero_etudiant.trim() || null,
          }
        : {}),
    };

    setBusy(true);
    try {
      const saved = edition
        ? await updateUtilisateur(initialUser.id, payload)
        : await createUtilisateur(payload);
      onSaved(saved, edition);
    } catch (err) {
      setError(err?.message || "Impossible d'enregistrer le compte.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      onClose={() => { if (!busy) onClose(); }}
      className="max-w-2xl rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
      label={edition ? 'Modifier le compte' : 'Créer un compte'}
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--color-principal)]">
            {edition ? 'Modifier le compte' : 'Créer un nouveau compte'}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {edition
              ? `Compte ${initialUser.identifiant} — le rôle ne peut pas être modifié après création.`
              : 'Renseignez les informations de connexion et le profil de l’utilisateur.'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="text-2xl leading-none text-gray-500 hover:text-gray-600"
          aria-label="Fermer"
        >
          ×
        </button>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ChampFormulaire id="compte-role" label="Rôle" required={!edition}>
            {edition ? (
              <div className="py-1.5">
                <RoleBadge role={form.role} />
              </div>
            ) : (
              <select
                id="compte-role"
                value={form.role}
                onChange={e => setField('role', e.target.value)}
                className={inputClass}
                disabled={busy}
              >
                {ROLES_COMPTE.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            )}
          </ChampFormulaire>

          <ChampFormulaire id="compte-identifiant" label="Identifiant" required>
            <input
              id="compte-identifiant"
              type="text"
              maxLength={50}
              value={form.identifiant}
              onChange={e => setField('identifiant', e.target.value)}
              placeholder="ex. p.nom"
              className={inputClass}
              disabled={busy}
            />
          </ChampFormulaire>

          <ChampFormulaire id="compte-prenom" label="Prénom" required>
            <input
              id="compte-prenom"
              type="text"
              maxLength={100}
              value={form.prenom}
              onChange={e => setField('prenom', e.target.value)}
              className={inputClass}
              disabled={busy}
            />
          </ChampFormulaire>

          <ChampFormulaire id="compte-nom" label="Nom" required>
            <input
              id="compte-nom"
              type="text"
              maxLength={100}
              value={form.nom}
              onChange={e => setField('nom', e.target.value)}
              className={inputClass}
              disabled={busy}
            />
          </ChampFormulaire>

          <ChampFormulaire id="compte-email" label="Email" required>
            <input
              id="compte-email"
              type="email"
              maxLength={254}
              value={form.email}
              onChange={e => setField('email', e.target.value)}
              placeholder="utilisateur@mediaschool.fr"
              className={inputClass}
              disabled={busy}
            />
          </ChampFormulaire>

          <ChampFormulaire
            id="compte-mdp"
            label={edition ? 'Nouveau mot de passe (facultatif)' : 'Mot de passe (8 car. min)'}
            required={!edition}
          >
            <div className="flex gap-1.5">
              <input
                id="compte-mdp"
                type={showPassword ? 'text' : 'password'}
                maxLength={72}
                value={form.mot_de_passe}
                onChange={e => setField('mot_de_passe', e.target.value)}
                placeholder={edition ? 'Laisser vide pour conserver' : 'Minimum 8 caractères'}
                className={inputClass}
                disabled={busy}
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                className="btn btn-sm btn-outline border-gray-300 shrink-0"
                title={showPassword ? 'Masquer' : 'Afficher'}
              >
                {showPassword ? 'Masquer' : 'Voir'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setField('mot_de_passe', genererMotDePasse());
                  setShowPassword(true);
                }}
                className="btn btn-sm bg-[var(--color-principal)] text-white border-0 shrink-0"
                disabled={busy}
              >
                Générer
              </button>
            </div>
          </ChampFormulaire>
        </div>

        {form.role === 'eleve' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl bg-sky-50/70 border border-sky-200 p-4">
            <ChampFormulaire id="compte-classe" label="Classe">
              <select
                id="compte-classe"
                value={form.classe_id}
                onChange={e => setField('classe_id', e.target.value)}
                className={inputClass}
                disabled={busy}
              >
                <option value="">Aucune classe assignée</option>
                {classes.map(c => (
                  <option key={c.id} value={String(c.id)}>
                    {c.nom}{c.annee_scolaire ? ` (${c.annee_scolaire})` : ''}
                  </option>
                ))}
              </select>
            </ChampFormulaire>

            <ChampFormulaire id="compte-numero" label="Numéro étudiant">
              <input
                id="compte-numero"
                type="text"
                maxLength={30}
                value={form.numero_etudiant}
                onChange={e => setField('numero_etudiant', e.target.value)}
                placeholder="ex. IRIS-2026-0100"
                className={inputClass}
                disabled={busy}
              />
            </ChampFormulaire>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-gray-200">
          <ChampFormulaire id="compte-tel" label="Téléphone">
            <input
              id="compte-tel"
              type="text"
              maxLength={30}
              value={form.telephone}
              onChange={e => setField('telephone', e.target.value)}
              className={inputClass}
              disabled={busy}
            />
          </ChampFormulaire>

          <ChampFormulaire id="compte-naissance" label="Date de naissance">
            <input
              id="compte-naissance"
              type="date"
              value={form.date_naissance}
              onChange={e => setField('date_naissance', e.target.value)}
              className={inputClass}
              disabled={busy}
            />
          </ChampFormulaire>

          <ChampFormulaire id="compte-nationalite" label="Nationalité">
            <input
              id="compte-nationalite"
              type="text"
              maxLength={100}
              value={form.nationalite}
              onChange={e => setField('nationalite', e.target.value)}
              className={inputClass}
              disabled={busy}
            />
          </ChampFormulaire>

          <ChampFormulaire id="compte-lieu" label="Lieu de naissance">
            <input
              id="compte-lieu"
              type="text"
              maxLength={100}
              value={form.lieu_naissance}
              onChange={e => setField('lieu_naissance', e.target.value)}
              className={inputClass}
              disabled={busy}
            />
          </ChampFormulaire>

          <ChampFormulaire id="compte-pays" label="Pays de naissance">
            <input
              id="compte-pays"
              type="text"
              maxLength={100}
              value={form.pays_naissance}
              onChange={e => setField('pays_naissance', e.target.value)}
              className={inputClass}
              disabled={busy}
            />
          </ChampFormulaire>

          <ChampFormulaire id="compte-adresse" label="Adresse">
            <input
              id="compte-adresse"
              type="text"
              maxLength={500}
              value={form.adresse}
              onChange={e => setField('adresse', e.target.value)}
              className={inputClass}
              disabled={busy}
            />
          </ChampFormulaire>
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
            {busy ? 'Enregistrement…' : (edition ? 'Enregistrer' : 'Créer le compte')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ConfirmDeleteModal({ target, onDeleted, onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function confirm() {
    setError('');
    setBusy(true);
    try {
      await deleteUtilisateur(target.id);
      onDeleted(target);
    } catch (err) {
      setError(err?.message || 'Impossible de supprimer ce compte.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal onClose={() => { if (!busy) onClose(); }} className="max-w-md rounded-2xl p-6" label="Supprimer le compte">
      <h3 className="text-lg font-bold text-[var(--color-principal)] mb-2">Supprimer le compte</h3>
      <p className="text-sm text-gray-600 mb-3">
        Supprimer définitivement le compte de{' '}
        <strong>{[target.prenom, target.nom].filter(Boolean).join(' ')}</strong> ({target.identifiant}) ?
      </p>
      <p className="text-xs text-gray-500 mb-4">
        Impossible si des notes, absences, devoirs rendus, documents, messages ou cours y sont déjà
        rattachés : utilisez plutôt « Désactiver ».
      </p>
      {error && (
        <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 font-medium mb-3">
          {error}
        </div>
      )}
      <div className="modal-action">
        <button type="button" onClick={onClose} disabled={busy} className="btn btn-ghost">Annuler</button>
        <button
          type="button"
          onClick={confirm}
          disabled={busy}
          className="btn bg-[#EC6F6F] hover:bg-[#EC6F6F]/90 text-white border-0"
        >
          {busy ? 'Suppression…' : 'Supprimer'}
        </button>
      </div>
    </Modal>
  );
}

export default function Comptes() {
  const { user } = useAuth();
  const utilisateursState = useAsync(() => getUtilisateurs());
  const classesState = useAsync(getClasses);

  const utilisateurs = utilisateursState.data ?? [];
  const classes = classesState.data ?? [];

  const [recherche, setRecherche] = useState('');
  const [filtreRole, setFiltreRole] = useState('');
  const [filtreStatut, setFiltreStatut] = useState('all');
  const [modal, setModal] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [actionError, setActionError] = useState('');
  const [togglingId, setTogglingId] = useState(null);

  const stats = useMemo(() => {
    const counts = { total: utilisateurs.length, actifs: 0, eleve: 0, professeur: 0, staff: 0, dev: 0 };
    for (const u of utilisateurs) {
      if (u.actif !== false) counts.actifs++;
      if (u.role === 'eleve') counts.eleve++;
      else if (u.role === 'professeur') counts.professeur++;
      else if (u.role === 'dev') counts.dev++;
      else counts.staff++;
    }
    return counts;
  }, [utilisateurs]);

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return utilisateurs.filter(u => {
      if (filtreRole && u.role !== filtreRole) return false;
      if (filtreStatut === 'active' && u.actif === false) return false;
      if (filtreStatut === 'inactive' && u.actif !== false) return false;
      if (!q) return true;
      const cible = `${u.prenom ?? ''} ${u.nom ?? ''} ${u.identifiant ?? ''} ${u.email ?? ''} ${u.classe ?? ''}`.toLowerCase();
      return cible.includes(q);
    });
  }, [utilisateurs, recherche, filtreRole, filtreStatut]);

  async function toggleActif(target) {
    setActionError('');
    setTogglingId(target.id);
    try {
      const updated = await setUtilisateurActif(target.id, target.actif === false);
      utilisateursState.setData(prev => (prev ?? []).map(u => (u.id === updated.id ? updated : u)));
      setFeedback(
        `Le compte ${updated.identifiant} a été ${updated.actif !== false ? 'réactivé' : 'désactivé'}.`,
      );
    } catch (err) {
      setActionError(err?.message || 'Impossible de modifier le statut du compte.');
    } finally {
      setTogglingId(null);
    }
  }

  function handleSaved(saved, edition) {
    utilisateursState.setData(prev => {
      const liste = prev ?? [];
      const next = edition
        ? liste.map(u => (u.id === saved.id ? saved : u))
        : [...liste, saved];
      return next.sort((a, b) => `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, 'fr'));
    });
    setModal(null);
    setActionError('');
    setFeedback(
      edition
        ? `Compte ${saved.identifiant} mis à jour.`
        : `Compte ${saved.identifiant} (${ROLE_COMPTE_BY_VALUE[saved.role]?.label ?? saved.role}) créé.`,
    );
  }

  function handleDeleted(target) {
    utilisateursState.setData(prev => (prev ?? []).filter(u => u.id !== target.id));
    setModal(null);
    setActionError('');
    setFeedback(`Compte ${target.identifiant} supprimé.`);
  }

  return (
    <>
      <main className="flex-1 overflow-y-auto p-6 bg-[#F5F5F5]">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-[#07A6A6]">Gestion des comptes</h1>
            <p className="text-sm text-gray-600 mt-1">
              Création, modification, activation et suppression des comptes utilisateurs (espace Dev).
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModal({ type: 'create' })}
            className="inline-flex items-center gap-2 bg-[#E8735A] text-white font-semibold text-sm sm:text-base px-5 py-2.5 rounded-full hover:brightness-90 transition shadow-sm"
          >
            Créer un compte
            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* Compteurs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <StatCard label="Total" count={stats.total} />
          <StatCard label="Actifs" count={stats.actifs} accentClass="border-emerald-200 text-emerald-700" />
          <StatCard label="Élèves" count={stats.eleve} accentClass="border-sky-200 text-sky-700" />
          <StatCard label="Professeurs" count={stats.professeur} accentClass="border-amber-200 text-amber-700" />
          <StatCard label="Admin / Dir." count={stats.staff} accentClass="border-indigo-200 text-indigo-700" />
          <StatCard label="Dev" count={stats.dev} accentClass="border-purple-200 text-purple-700" />
        </div>

        {feedback && (
          <div role="status" className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
            <span>{feedback}</span>
            <button type="button" onClick={() => setFeedback('')} className="font-bold text-emerald-700 hover:underline text-xs">
              Fermer
            </button>
          </div>
        )}

        {actionError && (
          <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            <span>{actionError}</span>
            <button type="button" onClick={() => setActionError('')} className="font-bold text-red-700 hover:underline text-xs">
              Fermer
            </button>
          </div>
        )}

        {/* Filtres + tableau */}
        <section className="bg-white rounded-xl shadow-md p-5">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <input
              type="search"
              aria-label="Rechercher un compte"
              value={recherche}
              onChange={e => setRecherche(e.target.value)}
              placeholder="Rechercher par nom, identifiant, email, classe…"
              className="input input-bordered input-sm flex-1 min-w-[220px]"
            />
            <select
              aria-label="Filtrer par rôle"
              value={filtreRole}
              onChange={e => setFiltreRole(e.target.value)}
              className="select select-bordered select-sm"
            >
              <option value="">Tous les rôles</option>
              {ROLES_COMPTE.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <select
              aria-label="Filtrer par statut"
              value={filtreStatut}
              onChange={e => setFiltreStatut(e.target.value)}
              className="select select-bordered select-sm"
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actifs uniquement</option>
              <option value="inactive">Désactivés uniquement</option>
            </select>
            <button
              type="button"
              onClick={utilisateursState.reload}
              className="btn btn-sm btn-ghost text-[#07A6A6]"
            >
              Actualiser
            </button>
            <span className="text-xs text-gray-500 ml-auto">
              {filtres.length} compte{filtres.length > 1 ? 's' : ''}
            </span>
          </div>

          <DataState state={utilisateursState}>{() => (
            filtres.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">Aucun compte ne correspond aux filtres.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-sm w-full">
                  <thead>
                    <tr className="text-xs uppercase text-gray-500 border-b border-gray-200">
                      <th scope="col">Utilisateur</th>
                      <th scope="col">Contact</th>
                      <th scope="col">Rôle</th>
                      <th scope="col">Détails</th>
                      <th scope="col">Statut</th>
                      <th scope="col">Dernière connexion</th>
                      <th scope="col" className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtres.map(u => {
                      const estMoi = u.id === user?.id || u.identifiant === user?.identifiant;
                      const estActif = u.actif !== false;
                      return (
                        <tr key={u.id} className="hover:bg-gray-50 border-b border-gray-100">
                          <td>
                            <div className="font-semibold text-[var(--color-principal)]">
                              {[u.prenom, u.nom].filter(Boolean).join(' ') || u.identifiant}
                              {estMoi && (
                                <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[var(--color-principal)] text-white">
                                  Vous
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">@{u.identifiant}</div>
                          </td>
                          <td>
                            <div className="text-xs text-gray-700">{u.email}</div>
                            {u.telephone && <div className="text-xs text-gray-500">{u.telephone}</div>}
                          </td>
                          <td><RoleBadge role={u.role} /></td>
                          <td className="text-xs text-gray-600">
                            {u.role === 'eleve' ? (
                              <div>
                                <div>{u.classe || <span className="italic text-gray-500">Sans classe</span>}</div>
                                {u.numero_etudiant && <div className="text-gray-500">N° {u.numero_etudiant}</div>}
                              </div>
                            ) : (
                              <span className="text-gray-500">—</span>
                            )}
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
                          <td className="text-xs text-gray-500 whitespace-nowrap">
                            {formaterDateHeure(u.derniere_connexion)}
                          </td>
                          <td className="text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setModal({ type: 'edit', user: u })}
                                className="btn btn-xs btn-ghost text-[#07A6A6]"
                              >
                                Modifier
                              </button>
                              <button
                                type="button"
                                disabled={estMoi || togglingId === u.id}
                                onClick={() => toggleActif(u)}
                                title={estMoi ? 'Impossible de désactiver votre propre compte' : undefined}
                                className="btn btn-xs btn-ghost text-gray-600 disabled:opacity-40"
                              >
                                {togglingId === u.id ? '…' : (estActif ? 'Désactiver' : 'Réactiver')}
                              </button>
                              <button
                                type="button"
                                disabled={estMoi}
                                onClick={() => setModal({ type: 'delete', user: u })}
                                title={estMoi ? 'Impossible de supprimer votre propre compte' : undefined}
                                className="btn btn-xs btn-ghost text-[#B23A3A] disabled:opacity-40"
                              >
                                Supprimer
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}</DataState>
        </section>
      </main>

      {(modal?.type === 'create' || modal?.type === 'edit') && (
        <CompteFormModal
          initialUser={modal.type === 'edit' ? modal.user : null}
          classes={classes}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}

      {modal?.type === 'delete' && (
        <ConfirmDeleteModal
          target={modal.user}
          onClose={() => setModal(null)}
          onDeleted={handleDeleted}
        />
      )}
    </>
  );
}
