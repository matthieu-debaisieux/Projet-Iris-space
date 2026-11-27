// Enregistrement du service worker en production uniquement (évite les interférences HMR en dev)
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) {
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Échec silencieux si le navigateur refuse le service worker (ex. navigation privée)
    });
  });
}

// Vide les données API hors ligne lors de la déconnexion
export function clearOfflineApiCache() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.controller?.postMessage({ type: 'CLEAR_API_CACHE' });
}
