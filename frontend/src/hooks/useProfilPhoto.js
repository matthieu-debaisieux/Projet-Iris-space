import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext.jsx';
import { USE_MOCKS } from '@/services/api.js';
import { deletePhotoProfil, uploadPhotoProfil } from '@/services/profil.js';

// ─────────────────────────────────────────────────────────────────────────────
// Photo de profil, à placer dans src/hooks/useProfilPhoto.js
//
// Mode API (USE_MOCKS === false) : envoi vers POST /api/profil/photo (JPG/PNG/WebP, ≤ 2 Mo),
// suppression via DELETE /api/profil/photo, lecture depuis user.photo_url.
// Mode mocks (USE_MOCKS === true) : enregistrée dans le navigateur (localStorage),
// une par utilisateur, sous forme d'une petite image carrée 256 px.
//
//   const { photo, enregistrer, supprimer } = useProfilPhoto();
//   photo        : URL serveur (/api/uploads/avatars/...), data URL en mocks, ou null
//   enregistrer  : async (file) → lève une Error (message en français) si le fichier est refusé
//   supprimer    : async () → retire la photo
// ─────────────────────────────────────────────────────────────────────────────

const FORMATS = ['image/png', 'image/jpeg', 'image/webp']; // volontairement sans SVG
const TAILLE_MAX_MOCK = 5 * 1024 * 1024; // 5 Mo avant réduction (mode mocks)
const TAILLE_MAX_API = 2 * 1024 * 1024;  // 2 Mo max côté serveur (POST /api/profil/photo)
const COTE = 256;                        // px, image finale carrée (mode mocks)
const EVENEMENT = 'iris-photo-change';

const cleDe = user => `iris-photo:${user?.id ?? user?.nom ?? 'anonyme'}`;

const lire = cle => { try { return localStorage.getItem(cle); } catch { return null; } };
const ecrire = (cle, valeur) => { localStorage.setItem(cle, valeur); window.dispatchEvent(new Event(EVENEMENT)); };
const effacer = cle => { try { localStorage.removeItem(cle); } catch { /* ignoré */ } window.dispatchEvent(new Event(EVENEMENT)); };

function validerImage(file, tailleMax) {
  if (!FORMATS.includes(file.type)) {
    throw new Error('Format non accepté : utilisez une image PNG, JPG ou WebP.');
  }
  if (file.size > tailleMax) {
    const mo = Math.round(tailleMax / (1024 * 1024));
    throw new Error(`Image trop lourde (${mo} Mo maximum).`);
  }
}

// Recadre au centre en carré, réduit à 256 px et ré-encode en JPEG (mode mocks).
// Le ré-encodage retire aussi les métadonnées (position GPS, appareil photo…) de l'image d'origine.
async function reduire(file) {
  validerImage(file, TAILLE_MAX_MOCK);

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
  const { user, updateUser } = useAuth();
  const cle = cleDe(user);
  const [photoMock, setPhotoMock] = useState(() => (USE_MOCKS ? lire(cle) : null));

  // Resynchronise en mode mocks : changement d'utilisateur, autre composant, autre onglet
  useEffect(() => {
    if (!USE_MOCKS) return undefined;
    const maj = () => setPhotoMock(lire(cle));
    maj();
    window.addEventListener(EVENEMENT, maj);
    window.addEventListener('storage', maj);
    return () => {
      window.removeEventListener(EVENEMENT, maj);
      window.removeEventListener('storage', maj);
    };
  }, [cle]);

  const enregistrer = useCallback(async file => {
    if (!USE_MOCKS) {
      validerImage(file, TAILLE_MAX_API);
      const photoUrl = await uploadPhotoProfil(file);
      updateUser({ photo_url: photoUrl });
      return;
    }
    const data = await reduire(file);
    try { ecrire(cle, data); } catch { throw new Error("Impossible d'enregistrer la photo (stockage du navigateur plein ou bloqué)."); }
  }, [cle, updateUser]);

  const supprimer = useCallback(async () => {
    if (!USE_MOCKS) {
      await deletePhotoProfil();
      updateUser({ photo_url: null });
      return;
    }
    effacer(cle);
  }, [cle, updateUser]);

  const photo = USE_MOCKS ? photoMock : (user?.photo_url ?? null);

  return { photo, enregistrer, supprimer };
}
