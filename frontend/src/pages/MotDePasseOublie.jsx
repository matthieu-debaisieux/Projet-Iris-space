import { useState } from 'react';
import { Link } from 'react-router-dom';
import PwaBanner from '@/components/layout/PwaBanner.jsx';
import { demanderReinitialisationMotDePasse } from '@/services/auth.js';

export default function MotDePasseOublie() {
  const [identifiant, setIdentifiant] = useState('');
  const [erreur, setErreur] = useState('');
  const [message, setMessage] = useState('');
  const [envoi, setEnvoi] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErreur('');
    setMessage('');

    const valeur = identifiant.trim();
    if (!valeur) {
      setErreur('Saisissez votre identifiant ou votre adresse e-mail.');
      return;
    }

    setEnvoi(true);
    try {
      const res = await demanderReinitialisationMotDePasse(valeur);
      setMessage(res?.message || 'Si ce compte existe, un lien de réinitialisation vient de lui être envoyé.');
      setIdentifiant('');
    } catch (err) {
      setErreur(err?.message || "Impossible d'envoyer la demande.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="flex flex-col h-screen bg-[var(--color-page)]">
      <PwaBanner />
      <main className="flex flex-1 flex-col items-center justify-center gap-6 overflow-y-auto p-6">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-[var(--color-titre)]">Mot de passe oublié</h1>
          <p className="mt-2 text-sm text-[#6B7185]">
            Entrez votre identifiant ou votre adresse e-mail pour recevoir un lien de réinitialisation.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <fieldset className="fieldset bg-base-200 border-base-300 rounded-box w-xs sm:w-sm border p-5">
            <legend className="fieldset-legend">Réinitialisation</legend>

            <label className="label" htmlFor="forgot-identifiant">Identifiant ou e-mail</label>
            <input
              id="forgot-identifiant"
              type="text"
              className="input w-full"
              placeholder="Identifiant ou e-mail"
              autoComplete="username"
              value={identifiant}
              onChange={e => setIdentifiant(e.target.value)}
            />

            {erreur && <p role="alert" className="text-error text-sm mt-2">{erreur}</p>}
            {message && (
              <p role="status" className="mt-3 rounded-lg bg-[#E3F5EC] px-3 py-2 text-sm font-medium text-[#1E7F55]">
                {message}
              </p>
            )}

            <button type="submit" disabled={envoi} className="btn bg-[var(--color-button)] mt-4">
              {envoi ? 'Envoi…' : 'Envoyer le lien'}
            </button>
          </fieldset>
        </form>

        <Link to="/" className="underline text-sm text-[var(--color-titre)]">
          Retour à la connexion
        </Link>
      </main>
    </div>
  );
}
