import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motDePasseOublie } from '@/services/auth.js';

// ── « Mot de passe oublié » (CPT-06) ────────────────────────────────────────
// Le back envoie un lien par e-mail. La réponse est la même que le compte existe ou non.
export default function MotDePasseOublie() {
  const [identifiant, setIdentifiant] = useState('');
  const [message, setMessage] = useState(null);
  const [lienDev, setLienDev] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [envoi, setEnvoi] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setEnvoi(true);
    setErreur(null);
    try {
      const reponse = await motDePasseOublie(identifiant.trim());
      setMessage(reponse.message);
      setLienDev(reponse.lien_dev ?? null); // APP_ENV=dev seulement
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <main className="flex h-screen flex-col items-center justify-center gap-8 overflow-y-auto p-6 bg-[var(--color-page)]">
      <h1 className="text-2xl font-bold text-[var(--color-titre)] text-center">Mot de passe oublié</h1>

      {message ? (
        <div className="w-xs flex flex-col gap-4 text-center">
          <p role="status">{message}</p>
          {lienDev && (
            <p className="text-sm text-gray-500">
              (Dev) <a href={lienDev} className="underline break-all">ouvrir le lien de réinitialisation</a>
            </p>
          )}
          <Link to="/" className="btn bg-[var(--color-button)]">Retour à la connexion</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <fieldset className="fieldset bg-base-200 border-base-300 rounded-box w-xs border p-4">
            <legend className="fieldset-legend">Recevoir un lien</legend>
            <p className="text-sm">Saisissez votre identifiant ou votre e-mail : vous recevrez un lien pour choisir un nouveau mot de passe.</p>

            <label className="label" htmlFor="oubli-identifiant">Identifiant ou e-mail</label>
            <input id="oubli-identifiant" type="text" className="input" autoComplete="username" required value={identifiant} onChange={e => setIdentifiant(e.target.value)} />

            {erreur && <p role="alert" className="text-error text-sm mt-2">{erreur}</p>}
            <button type="submit" disabled={envoi || !identifiant.trim()} className="btn bg-[var(--color-button)] mt-4">Envoyer le lien</button>
            <Link to="/" className="underline text-sm mt-2">Retour à la connexion</Link>
          </fieldset>
        </form>
      )}
    </main>
  );
}
