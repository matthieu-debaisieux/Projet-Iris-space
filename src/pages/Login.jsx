import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../assets/img/Logo_IRIS_SPACE.svg';
import Footer from '../components/Footer.jsx';

// ── Page de connexion ───────────────────────────────────────────────────────
export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  function handleLogin() {
    const login = email.trim();
    if (login === 'admin' && password === 'admin') navigate('/admin');
    else if (login === 'eleve' && password === 'eleve') navigate('/eleve');
    else setError(true);
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* navbar */}
      <header className="flex justify-between items-center bg-[var(--color-principal)] sticky top-0 z-50 shrink-0">
        <div className="flex items-center gap-5">
          <div className="logo">
            <Link to="/"><img src={logo} alt="Logo" className="h-auto w-40 p-0 m-0" /></Link>
          </div>
          <div className="title text-2xl text-white">Admin</div>
        </div>
        <div className="flex items-center" />
      </header>

      {/* contenu principal */}
      <main className="flex flex-1 flex-col items-center justify-center gap-8 overflow-y-auto p-6 bg-[var(--color-page)]">
        <div className="title text-center">
          <h1 className="text-2xl font-bold text-[var(--color-titre)]">Bienvenue sur la page de connexion</h1>
        </div>

        <div>
          <fieldset className="fieldset bg-base-200 border-base-300 rounded-box w-xs border p-4">
            <legend className="fieldset-legend">Login</legend>

            <label className="label">Email</label>
            <input type="text" className="input" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />

            <label className="label">Password</label>
            <input
              type="password"
              className="input"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleLogin(); }}
            />

            {error && <p className="text-error text-sm mt-2">Identifiants incorrects</p>}
            <a href="#" className="underline"> mot de passe oublié?</a>
            <button type="button" onClick={handleLogin} className="btn bg-[var(--color-button)] mt-4">
              Login
            </button>
          </fieldset>
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[var(--color-titre)]">Vous n'avez pas de compte ?</h1>
          <Link to="/visiteur" className="btn bg-[var(--color-button)] mt-4">Visitez les actualitées</Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
