import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import PwaBanner from '@/components/layout/PwaBanner.jsx';
import { useAuth } from '@/context/AuthContext.jsx';

// ── Page de connexion (1 étape, ou 2 étapes si double authentification TOTP) ──
export default function Login() {
  const navigate = useNavigate();
  const { user, loading, login, verifierDoubleAuthentification } = useAuth();
  const [identifiant, setIdentifiant] = useState('');
  const [password, setPassword] = useState('');
  const [etape2fa, setEtape2fa] = useState(false);
  const [code2fa, setCode2fa] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <main className="flex h-screen items-center justify-center p-6 bg-[var(--color-page)] text-sm text-gray-500">
        Vérification de la session…
      </main>
    );
  }

  if (user) {
    return <Navigate to="/accueil" replace />;
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await login(identifiant.trim(), password);
      if (res?.doubleAuthentificationRequise) {
        setEtape2fa(true);
        setCode2fa('');
      } else {
        navigate('/accueil');
      }
    } catch (err) {
      setError(err?.message || 'Identifiant ou mot de passe incorrect');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifier2fa(e) {
    e.preventDefault();
    setError('');
    const propre = code2fa.replace(/\s+/g, '');
    if (!/^\d{6}$/.test(propre)) {
      setError('Saisissez le code à 6 chiffres de votre application.');
      return;
    }
    setSubmitting(true);
    try {
      await verifierDoubleAuthentification(propre);
      navigate('/accueil');
    } catch (err) {
      setError(err?.message || 'Code de vérification incorrect');
    } finally {
      setSubmitting(false);
    }
  }

  function retourConnexion() {
    setEtape2fa(false);
    setCode2fa('');
    setError('');
  }

  return (
    <div className="flex flex-col h-screen bg-[var(--color-page)]">
      <PwaBanner />
      <main className="flex flex-1 flex-col items-center justify-center gap-8 overflow-y-auto p-6">
        <div className="title text-center">
          <h1 className="text-2xl font-bold text-[var(--color-titre)]">
            {etape2fa ? 'Vérification en deux étapes' : 'Bienvenue sur la page de connexion'}
          </h1>
        </div>

        {!etape2fa ? (
          <form onSubmit={handleLogin}>
            <fieldset className="fieldset bg-base-200 border-base-300 rounded-box w-xs border p-4">
              <legend className="fieldset-legend">Connexion</legend>

              <label className="label" htmlFor="login-email">Identifiant ou e-mail</label>
              <input
                id="login-email"
                type="text"
                className="input"
                placeholder="Identifiant ou e-mail"
                autoComplete="username"
                value={identifiant}
                onChange={e => setIdentifiant(e.target.value)}
              />

              <label className="label" htmlFor="login-password">Mot de passe</label>
              <input
                id="login-password"
                type="password"
                className="input"
                placeholder="Mot de passe"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />

              {error && <p role="alert" className="text-error text-sm mt-2">{error}</p>}
              <Link to="/mot-de-passe-oublie" className="underline text-sm mt-2 inline-block">
                Mot de passe oublié ?
              </Link>
              <button type="submit" disabled={submitting} className="btn bg-[var(--color-button)] mt-4">
                {submitting ? 'Connexion…' : 'Se connecter'}
              </button>
            </fieldset>
          </form>
        ) : (
          <form onSubmit={handleVerifier2fa}>
            <fieldset className="fieldset bg-base-200 border-base-300 rounded-box w-xs border p-4">
              <legend className="fieldset-legend">Double authentification</legend>

              <p className="text-xs text-gray-600 mb-2">
                Saisissez le code à 6 chiffres généré par votre application d&apos;authentification.
              </p>

              <label className="label" htmlFor="login-2fa-code">Code de vérification</label>
              <input
                id="login-2fa-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={10}
                className="input tracking-widest text-center text-lg"
                placeholder="000000"
                autoFocus
                value={code2fa}
                onChange={e => setCode2fa(e.target.value)}
              />

              {error && <p role="alert" className="text-error text-sm mt-2">{error}</p>}

              <button type="submit" disabled={submitting} className="btn bg-[var(--color-button)] mt-4">
                {submitting ? 'Vérification…' : 'Valider le code'}
              </button>
              <button type="button" onClick={retourConnexion} disabled={submitting} className="btn btn-ghost mt-1">
                Retour à la connexion
              </button>
            </fieldset>
          </form>
        )}

        <div className="text-center">
          <h2 className="text-2xl font-bold text-[var(--color-titre)]">Vous n&apos;avez pas de compte ?</h2>
          <Link to="/visiteur" className="btn bg-[var(--color-button)] mt-4">Visitez les actualités</Link>
        </div>
      </main>
    </div>
  );
}
