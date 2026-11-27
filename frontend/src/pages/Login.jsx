import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext.jsx';

// ── Page de connexion ───────────────────────────────────────────────────────
// Deux étapes quand la double authentification est activée (SEC-03) :
// identifiant + mot de passe, puis le code à 6 chiffres de l'application.
export default function Login() {
  const navigate = useNavigate();
  const { login, verifierCode } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [etapeCode, setEtapeCode] = useState(false);
  const [error, setError] = useState(null);
  const [envoi, setEnvoi] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setEnvoi(true);
    setError(null);
    try {
      const resultat = await login(email.trim(), password);
      if (resultat.doubleAuthentification) {
        setEtapeCode(true);
        setPassword('');
      } else {
        navigate(resultat.doubleAuthAConfigurer ? '/double-authentification' : '/accueil');
      }
    } catch (err) {
      setError(err.message || 'Identifiant ou mot de passe incorrect');
    } finally {
      setEnvoi(false);
    }
  }

  async function handleCode(e) {
    e.preventDefault();
    setEnvoi(true);
    setError(null);
    try {
      await verifierCode(code.trim());
      navigate('/accueil');
    } catch (err) {
      // 401 « Session expirée » : retour à la première étape
      if (err.status === 401 && err.message.startsWith('Session expirée')) setEtapeCode(false);
      setError(err.message);
      setCode('');
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <main className="flex h-screen flex-col items-center justify-center gap-8 overflow-y-auto p-6 bg-[var(--color-page)]">
      <div className="title text-center">
        <h1 className="text-2xl font-bold text-[var(--color-titre)]">Bienvenue sur la page de connexion</h1>
      </div>

      {etapeCode ? (
        <form onSubmit={handleCode}>
          <fieldset className="fieldset bg-base-200 border-base-300 rounded-box w-xs border p-4">
            <legend className="fieldset-legend">Double authentification</legend>
            <p className="text-sm">Saisissez le code à 6 chiffres affiché par votre application d’authentification.</p>

            <label className="label" htmlFor="login-code">Code</label>
            <input
              id="login-code" type="text" inputMode="numeric" pattern="[0-9 ]*" maxLength={7} autoComplete="one-time-code" autoFocus
              className="input tracking-widest" placeholder="123456" value={code} onChange={e => setCode(e.target.value)}
            />

            {error && <p role="alert" className="text-error text-sm mt-2">{error}</p>}
            <button type="submit" disabled={envoi || code.trim().length < 6} className="btn bg-[var(--color-button)] mt-4">Valider</button>
            <button type="button" onClick={() => { setEtapeCode(false); setError(null); }} className="link text-sm mt-2">Retour</button>
          </fieldset>
        </form>
      ) : (
        <form onSubmit={handleLogin}>
          <fieldset className="fieldset bg-base-200 border-base-300 rounded-box w-xs border p-4">
            <legend className="fieldset-legend">Connexion</legend>

            <label className="label" htmlFor="login-email">Identifiant ou e-mail</label>
            <input id="login-email" type="text" className="input" placeholder="Identifiant" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} />

            <label className="label" htmlFor="login-password">Mot de passe</label>
            <input id="login-password" type="password" className="input" placeholder="Mot de passe" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} />

            {error && <p role="alert" className="text-error text-sm mt-2">{error}</p>}
            <Link to="/mot-de-passe-oublie" className="underline">Mot de passe oublié ?</Link>
            <button type="submit" disabled={envoi} className="btn bg-[var(--color-button)] mt-4">
              Se connecter
            </button>
          </fieldset>
        </form>
      )}

      <div className="text-center">
        <h2 className="text-2xl font-bold text-[var(--color-titre)]">Vous n'avez pas de compte ?</h2>
        <Link to="/visiteur" className="btn bg-[var(--color-button)] mt-4">Visitez les actualités</Link>
      </div>
    </main>
  );
}
