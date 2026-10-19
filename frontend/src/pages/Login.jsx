import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '@/assets/img/Logo_IRIS_SPACE.svg';
import Footer from '@/components/layout/Footer.jsx';
import { HOME_BY_ROLE, useAuth } from '@/context/AuthContext.jsx';

// ── Page de connexion ───────────────────────────────────────────────────────
export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    try {
      const user = await login(email.trim(), password);
      navigate(HOME_BY_ROLE[user.role] ?? '/');
    } catch {
      setError(true);
    }
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* navbar */}
      <header className="flex justify-between items-center bg-[var(--color-principal)] sticky top-0 z-50 shrink-0">
        <div className="flex items-center gap-5">
          <div className="logo">
            <Link to="/"><img src={logo} alt="Logo" className="h-auto w-40 p-0 m-0" /></Link>
          </div>
          <div className="title text-2xl text-white">Connexion</div>
        </div>
        <div className="flex items-center" />
      </header>

      {/* contenu principal */}
      <main className="flex flex-1 flex-col items-center justify-center gap-8 overflow-y-auto p-6 bg-[var(--color-page)]">
        <div className="title text-center">
          <h1 className="text-2xl font-bold text-[var(--color-titre)]">Bienvenue sur la page de connexion</h1>
        </div>

        <form onSubmit={handleLogin}>
          <fieldset className="fieldset bg-base-200 border-base-300 rounded-box w-xs border p-4">
            <legend className="fieldset-legend">Login</legend>

            <label className="label" htmlFor="login-email">Email</label>
            <input id="login-email" type="text" className="input" placeholder="Email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} />

            <label className="label" htmlFor="login-password">Password</label>
            <input id="login-password" type="password" className="input" placeholder="Password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} />

            {error && <p className="text-error text-sm mt-2">Identifiants incorrects</p>}
            <a href="#" className="underline"> mot de passe oublié?</a>
            <button type="submit" className="btn bg-[var(--color-button)] mt-4">
              Login
            </button>
          </fieldset>
        </form>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[var(--color-titre)]">Vous n'avez pas de compte ?</h2>
          <Link to="/visiteur" className="btn bg-[var(--color-button)] mt-4">Visitez les actualités</Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
