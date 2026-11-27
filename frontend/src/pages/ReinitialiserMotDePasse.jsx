import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { reinitialiserMotDePasse } from '@/services/auth.js';

// ── Nouveau mot de passe depuis le lien de l'e-mail (CPT-06) ────────────────
// Adresse : /reinitialiser-mot-de-passe?token=… (APP_URL côté back)
export default function ReinitialiserMotDePasse() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [motDePasse, setMotDePasse] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [envoi, setEnvoi] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (motDePasse !== confirmation) {
      setErreur('Les deux mots de passe ne sont pas identiques');
      return;
    }
    setEnvoi(true);
    setErreur(null);
    try {
      setMessage((await reinitialiserMotDePasse(token, motDePasse)).message);
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <main className="flex h-screen flex-col items-center justify-center gap-8 overflow-y-auto p-6 bg-[var(--color-page)]">
      <h1 className="text-2xl font-bold text-[var(--color-titre)] text-center">Nouveau mot de passe</h1>

      {!token ? (
        <div className="w-xs flex flex-col gap-4 text-center">
          <p role="alert">Ce lien est incomplet. Demandez un nouveau lien.</p>
          <Link to="/mot-de-passe-oublie" className="btn bg-[var(--color-button)]">Mot de passe oublié</Link>
        </div>
      ) : message ? (
        <div className="w-xs flex flex-col gap-4 text-center">
          <p role="status">{message}</p>
          <Link to="/" className="btn bg-[var(--color-button)]">Se connecter</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <fieldset className="fieldset bg-base-200 border-base-300 rounded-box w-xs border p-4">
            <legend className="fieldset-legend">Choisir un mot de passe</legend>
            <p className="text-sm">8 caractères minimum.</p>

            <label className="label" htmlFor="reinit-mdp">Nouveau mot de passe</label>
            <input id="reinit-mdp" type="password" className="input" autoComplete="new-password" minLength={8} maxLength={72} required value={motDePasse} onChange={e => setMotDePasse(e.target.value)} />

            <label className="label" htmlFor="reinit-confirmation">Confirmer le mot de passe</label>
            <input id="reinit-confirmation" type="password" className="input" autoComplete="new-password" minLength={8} maxLength={72} required value={confirmation} onChange={e => setConfirmation(e.target.value)} />

            {erreur && <p role="alert" className="text-error text-sm mt-2">{erreur}</p>}
            {erreur?.includes('expiré') && <Link to="/mot-de-passe-oublie" className="underline text-sm">Demander un nouveau lien</Link>}
            <button type="submit" disabled={envoi} className="btn bg-[var(--color-button)] mt-4">Enregistrer</button>
          </fieldset>
        </form>
      )}
    </main>
  );
}
