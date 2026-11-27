import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PwaBanner from '@/components/layout/PwaBanner.jsx';
import { reinitialiserMotDePasse } from '@/services/auth.js';

function validerMotDePasse(valeur) {
  if (!valeur || valeur.length < 8) {
    return 'Le mot de passe doit contenir au moins 8 caractères.';
  }
  if (!/\p{L}/u.test(valeur) || !/\d/.test(valeur)) {
    return 'Le mot de passe doit contenir au moins une lettre et un chiffre.';
  }
  return '';
}

export default function ReinitialiserMotDePasse() {
  const [searchParams] = useSearchParams();
  const token = (searchParams.get('token') ?? '').trim();

  const [nouveau, setNouveau] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');
  const [envoi, setEnvoi] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErreur('');
    setSucces('');

    if (!token) {
      setErreur('Lien de réinitialisation incomplet ou invalide.');
      return;
    }

    const erreurMdp = validerMotDePasse(nouveau);
    if (erreurMdp) {
      setErreur(erreurMdp);
      return;
    }
    if (nouveau !== confirmation) {
      setErreur('La confirmation ne correspond pas au nouveau mot de passe.');
      return;
    }

    setEnvoi(true);
    try {
      const res = await reinitialiserMotDePasse(token, nouveau);
      setSucces(res?.message || 'Mot de passe modifié. Vous pouvez vous connecter.');
      setNouveau('');
      setConfirmation('');
    } catch (err) {
      setErreur(err?.message || 'Lien invalide ou expiré.');
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="flex flex-col h-screen bg-[var(--color-page)]">
      <PwaBanner />
      <main className="flex flex-1 flex-col items-center justify-center gap-6 overflow-y-auto p-6">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-[var(--color-titre)]">Nouveau mot de passe</h1>
          <p className="mt-2 text-sm text-[#6B7185]">
            Choisissez un mot de passe d&apos;au moins 8 caractères contenant une lettre et un chiffre.
          </p>
        </div>

        {!token ? (
          <div className="rounded-box border border-base-300 bg-base-200 p-5 text-center max-w-sm">
            <p role="alert" className="text-error text-sm">
              Lien invalide : aucun jeton de réinitialisation fourni.
            </p>
            <Link to="/mot-de-passe-oublie" className="btn bg-[var(--color-button)] mt-4">
              Demander un nouveau lien
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <fieldset className="fieldset bg-base-200 border-base-300 rounded-box w-xs sm:w-sm border p-5">
              <legend className="fieldset-legend">Réinitialiser le mot de passe</legend>

              <label className="label" htmlFor="reset-nouveau">Nouveau mot de passe</label>
              <input
                id="reset-nouveau"
                type="password"
                className="input w-full"
                autoComplete="new-password"
                value={nouveau}
                onChange={e => setNouveau(e.target.value)}
              />

              <label className="label" htmlFor="reset-confirmation">Confirmer le mot de passe</label>
              <input
                id="reset-confirmation"
                type="password"
                className="input w-full"
                autoComplete="new-password"
                value={confirmation}
                onChange={e => setConfirmation(e.target.value)}
              />

              {erreur && <p role="alert" className="text-error text-sm mt-2">{erreur}</p>}
              {succes && (
                <p role="status" className="mt-3 rounded-lg bg-[#E3F5EC] px-3 py-2 text-sm font-medium text-[#1E7F55]">
                  {succes}
                </p>
              )}

              <button type="submit" disabled={envoi || Boolean(succes)} className="btn bg-[var(--color-button)] mt-4">
                {envoi ? 'Enregistrement…' : 'Enregistrer le mot de passe'}
              </button>
            </fieldset>
          </form>
        )}

        <Link to="/" className="underline text-sm text-[var(--color-titre)]">
          Retour à la connexion
        </Link>
      </main>
    </div>
  );
}
