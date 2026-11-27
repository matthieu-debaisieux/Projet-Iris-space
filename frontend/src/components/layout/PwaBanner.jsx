import { useEffect, useState } from 'react';

const DISMISS_KEY = 'iris_pwa_install_dismissed';

function estEnModeStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)')?.matches === true ||
    window.navigator.standalone === true
  );
}

function estIosSafari() {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent || '';
  const estIos = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  const estSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return estIos && estSafari;
}

function lireDismiss() {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

export default function PwaBanner() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [justReconnected, setJustReconnected] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(lireDismiss);
  const [standalone, setStandalone] = useState(estEnModeStandalone);

  useEffect(() => {
    let reconnectTimer = null;

    function onOffline() {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      setJustReconnected(false);
      setOnline(false);
    }

    function onOnline() {
      setOnline(true);
      setJustReconnected(true);
      reconnectTimer = setTimeout(() => setJustReconnected(false), 3000);
    }

    function onBeforeInstallPrompt(e) {
      e.preventDefault();
      setInstallPrompt(e);
    }

    function onAppInstalled() {
      setInstallPrompt(null);
      setStandalone(true);
    }

    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  function ignorerInstallation() {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // sessionStorage indisponible : l'état local suffit
    }
  }

  async function installer() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    if (choice?.outcome === 'accepted') {
      setStandalone(true);
    }
  }

  const afficherAideIos = !standalone && !dismissed && !installPrompt && estIosSafari();
  const afficherInstall = !standalone && !dismissed && Boolean(installPrompt);

  if (online && !justReconnected && !afficherInstall && !afficherAideIos) {
    return null;
  }

  return (
    <div className="shrink-0 z-40">
      {!online && (
        <div
          role="status"
          aria-live="polite"
          className="bg-amber-500 text-amber-950 text-xs sm:text-sm font-medium px-4 py-2 text-center"
        >
          Vous êtes hors ligne — les actualités et devoirs déjà consultés restent disponibles.
        </div>
      )}

      {online && justReconnected && (
        <div
          role="status"
          aria-live="polite"
          className="bg-emerald-600 text-white text-xs sm:text-sm font-medium px-4 py-1.5 text-center"
        >
          Connexion rétablie.
        </div>
      )}

      {afficherInstall && (
        <div className="bg-[var(--color-principal)] text-white border-t border-white/15 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
          <span>Installez IRIS-SPACE pour un accès rapide et une consultation hors ligne.</span>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={ignorerInstallation}
              className="px-2.5 py-1 rounded text-white/80 hover:text-white hover:bg-white/10 transition"
            >
              Plus tard
            </button>
            <button
              type="button"
              onClick={installer}
              className="px-3 py-1 rounded-full bg-[var(--color-titre)] text-white font-semibold hover:brightness-95 transition"
            >
              Installer
            </button>
          </div>
        </div>
      )}

      {afficherAideIos && (
        <div className="bg-[var(--color-principal)] text-white border-t border-white/15 px-4 py-2 flex items-center justify-between gap-3 text-xs">
          <span>
            Pour installer IRIS-SPACE sur iPhone/iPad : touchez <strong>Partager</strong> puis{' '}
            <strong>« Sur l&apos;écran d&apos;accueil »</strong>.
          </span>
          <button
            type="button"
            onClick={ignorerInstallation}
            className="text-white/80 hover:text-white font-semibold shrink-0 px-2 py-0.5 rounded hover:bg-white/10"
            aria-label="Fermer l'aide d'installation"
          >
            Fermer
          </button>
        </div>
      )}
    </div>
  );
}
