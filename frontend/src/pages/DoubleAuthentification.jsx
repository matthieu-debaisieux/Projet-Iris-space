import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import DataState from '@/components/ui/DataState.jsx';
import { useAsync } from '@/hooks/useAsync.js';
import { USE_MOCKS } from '@/services/api.js';
import { activerDoubleAuth, configurerDoubleAuth, desactiverDoubleAuth, getDoubleAuth } from '@/services/auth.js';

// ── Double authentification (SEC-03) ────────────────────────────────────────
// Obligatoire pour l'administration et les profs : après la connexion, ils arrivent ici
// tant qu'elle n'est pas configurée. Elle marche avec Google Authenticator,
// Microsoft Authenticator, FreeOTP…
const carte = 'bg-white rounded-2xl shadow p-6 md:p-8 max-w-xl w-full mx-auto flex flex-col gap-4';
const bouton = 'self-start rounded-full bg-[var(--color-principal)] px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50';
const champ = 'rounded-md border border-gray-300 px-3 py-2 text-sm';

// Secret affiché par groupes de 4 pour la saisie à la main
const grouper = secret => secret.match(/.{1,4}/g).join(' ');

function Configuration({ onActivee }) {
  const [config, setConfig] = useState(null);
  const [qr, setQr] = useState(null);
  const [code, setCode] = useState('');
  const [erreur, setErreur] = useState(null);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    if (config) QRCode.toDataURL(config.otpauth_url, { width: 220, margin: 1 }).then(setQr, () => setQr(null));
  }, [config]);

  async function commencer() {
    setErreur(null);
    try {
      setConfig(await configurerDoubleAuth());
    } catch (err) {
      setErreur(err.message);
    }
  }

  async function activer(e) {
    e.preventDefault();
    setEnvoi(true);
    setErreur(null);
    try {
      await activerDoubleAuth(code.trim());
      onActivee();
    } catch (err) {
      setErreur(err.message);
      setCode('');
    } finally {
      setEnvoi(false);
    }
  }

  if (!config) {
    return (
      <>
        <p className="text-sm text-gray-700">
          À chaque connexion, en plus du mot de passe, vous saisirez un code à 6 chiffres affiché par une application
          sur votre téléphone (Google Authenticator, Microsoft Authenticator, FreeOTP…). Installez-en une avant de commencer.
        </p>
        {erreur && <p role="alert" className="text-sm text-red-600">{erreur}</p>}
        <button type="button" onClick={commencer} className={bouton}>Configurer</button>
      </>
    );
  }

  return (
    <form onSubmit={activer} className="flex flex-col gap-4">
      <ol className="list-decimal pl-5 text-sm text-gray-700 flex flex-col gap-1">
        <li>Dans l’application, ajoutez un compte en scannant ce QR code.</li>
        <li>Saisissez ci-dessous le code à 6 chiffres qu’elle affiche.</li>
      </ol>
      {qr && <img src={qr} alt="QR code à scanner avec l’application d’authentification" width={220} height={220} className="self-center" />}
      <p className="text-sm text-gray-600">
        Impossible de scanner ? Saisissez cette clé dans l’application :
        <code className="mt-1 block rounded bg-gray-100 px-3 py-2 font-mono text-sm tracking-wider break-all select-all">{grouper(config.secret)}</code>
      </p>
      <label htmlFor="code-activation" className="text-sm font-semibold text-[var(--color-principal)]">Code à 6 chiffres</label>
      <input
        id="code-activation" type="text" inputMode="numeric" maxLength={7} autoComplete="one-time-code"
        className={`${champ} w-40 tracking-widest`} value={code} onChange={e => setCode(e.target.value)}
      />
      {erreur && <p role="alert" className="text-sm text-red-600">{erreur}</p>}
      <button type="submit" disabled={envoi || code.trim().length < 6} className={bouton}>Activer</button>
    </form>
  );
}

function Desactivation({ onDesactivee }) {
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState(null);

  async function desactiver(e) {
    e.preventDefault();
    setErreur(null);
    try {
      await desactiverDoubleAuth(motDePasse);
      onDesactivee();
    } catch (err) {
      setErreur(err.message);
    }
  }

  return (
    <form onSubmit={desactiver} className="flex flex-col gap-2 border-t border-gray-200 pt-4">
      <label htmlFor="mdp-desactivation" className="text-sm font-semibold text-[var(--color-principal)]">Désactiver (mot de passe requis)</label>
      <input id="mdp-desactivation" type="password" autoComplete="current-password" className={`${champ} max-w-xs`} value={motDePasse} onChange={e => setMotDePasse(e.target.value)} />
      {erreur && <p role="alert" className="text-sm text-red-600">{erreur}</p>}
      <button type="submit" disabled={!motDePasse} className="self-start rounded-full border border-red-600 px-5 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">
        Désactiver
      </button>
    </form>
  );
}

export default function DoubleAuthentification() {
  const etat = useAsync(getDoubleAuth);
  const [vientDEtreActivee, setVientDEtreActivee] = useState(false);

  return (
    <main className="flex-1 overflow-auto p-6 md:p-10 bg-[var(--color-page)]">
      <div className={carte}>
        <h1 className="text-2xl font-bold text-[var(--color-titre)]">Double authentification</h1>

        {USE_MOCKS ? (
          <p className="text-sm text-gray-700">La double authentification ne marche qu’avec la vraie API (<code>VITE_USE_MOCKS=false</code>).</p>
        ) : (
          <DataState state={etat}>{d => (
            d.active ? (
              <>
                <p role="status" className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">
                  ✓ Activée{d.active_le ? ` le ${new Date(d.active_le).toLocaleDateString('fr-FR')}` : ''}.
                  Un code vous sera demandé à chaque connexion. Un même code ne sert qu’une fois : attendez le suivant si besoin.
                </p>
                {vientDEtreActivee && <Link to="/accueil" className={bouton}>Continuer vers l’accueil</Link>}
                <p className="text-sm text-gray-600">Téléphone perdu ? Demandez à l’administration de réinitialiser votre double authentification.</p>
                {!d.obligatoire && <Desactivation onDesactivee={etat.reload} />}
              </>
            ) : (
              <>
                {d.obligatoire && (
                  <p role="alert" className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    Elle est obligatoire pour votre compte : configurez-la pour accéder à Iris Space.
                  </p>
                )}
                <Configuration onActivee={() => { setVientDEtreActivee(true); etat.reload(); }} />
              </>
            )
          )}</DataState>
        )}
      </div>
    </main>
  );
}
