import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext.jsx';

// ─────────────────────────────────────────────────────────────────────────────
// Photo de profil, à placer dans src/hooks/useProfilPhoto.js
//
// Version SANS base de données : la photo est enregistrée dans le navigateur
// (localStorage), une par utilisateur, sous forme d'une petite image carrée 256 px.
// Elle est donc visible partout sur CET appareil (barre du haut + page Profil),
// mais pas sur un autre ordinateur. Quand l'API sera prête, remplacer
// `ecrire` / `lire` / `effacer` par l'envoi et la lecture côté serveur.
//
//   const { photo, enregistrer, supprimer } = useProfilPhoto();
//   photo        : "data:image/jpeg;base64,…" ou null
//   enregistrer  : async (file) → lève une Error (message en français) si le fichier est refusé
//   supprimer    : () → retire la photo
// ─────────────────────────────────────────────────────────────────────────────

const FORMATS = ['image/png', 'image/jpeg', 'image/webp']; // volontairement sans SVG
const TAILLE_MAX = 5 * 1024 * 1024; // 5 Mo avant réduction
const COTE = 256;                   // px, image finale carrée
const EVENEMENT = 'iris-photo-change';

const cleDe = user => `iris-photo:${user?.id ?? user?.nom ?? 'anonyme'}`;

const lire = cle => { try { return localStorage.getItem(cle); } catch { return null; } };
const ecrire = (cle, valeur) => { localStorage.setItem(cle, valeur); window.dispatchEvent(new Event(EVENEMENT)); };
const effacer = cle => { try { localStorage.removeItem(cle); } catch { /* ignoré */ } window.dispatchEvent(new Event(EVENEMENT)); };

// Recadre au centre en carré, réduit à 256 px et ré-encode en JPEG.
// Le ré-encodage retire aussi les métadonnées (position GPS, appareil photo…) de l'image d'origine.
async function reduire(file) {
  if (!FORMATS.includes(file.type)) throw new Error('Format non accepté : utilisez une image PNG, JPG ou WebP.');
  if (file.size > TAILLE_MAX) throw new Error('Image trop lourde (5 Mo maximum).');

  let image;
  try { image = await createImageBitmap(file); } catch { throw new Error("Cette image est illisible. Essayez-en une autre."); }

  const cote = Math.min(image.width, image.height);
  const canvas = document.createElement('canvas');
  canvas.width = COTE;
  canvas.height = COTE;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff'; // fond blanc pour les PNG transparents
  ctx.fillRect(0, 0, COTE, COTE);
  ctx.drawImage(image, (image.width - cote) / 2, (image.height - cote) / 2, cote, cote, 0, 0, COTE, COTE);
  image.close?.();
  return canvas.toDataURL('image/jpeg', 0.85);
}

export function useProfilPhoto() {
  const { user } = useAuth();
  const cle = cleDe(user);
  const [photo, setPhoto] = useState(() => lire(cle));

  // Resynchronise : changement d'utilisateur, autre composant, autre onglet
  useEffect(() => {
    const maj = () => setPhoto(lire(cle));
    maj();
    window.addEventListener(EVENEMENT, maj);
    window.addEventListener('storage', maj);
    return () => {
      window.removeEventListener(EVENEMENT, maj);
      window.removeEventListener('storage', maj);
    };
  }, [cle]);

  const enregistrer = useCallback(async file => {
    const data = await reduire(file);
    try { ecrire(cle, data); } catch { throw new Error("Impossible d'enregistrer la photo (stockage du navigateur plein ou bloqué)."); }
  }, [cle]);

  const supprimer = useCallback(() => effacer(cle), [cle]);

  return { photo, enregistrer, supprimer };
}
