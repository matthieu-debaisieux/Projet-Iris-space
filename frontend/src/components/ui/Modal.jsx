import { useEffect, useId, useRef, useState } from 'react';
import { useEscape } from '@/hooks/useEscape.js';

const FOCALISABLES = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// ── Modale générique : fond sombre + boîte blanche ──────────────────────────
// Se ferme avec Échap ou un clic sur le fond. `className` : taille / padding
// / arrondi de la boîte (ex. "max-w-sm p-6 rounded-lg").
// Accessibilité : la boîte est un `role="dialog"` nommé par son premier titre
// (h1 à h3), ou à défaut par `label` ; le focus entre dans la modale à
// l'ouverture (premier champ, sinon la boîte), reste piégé dans la modale avec
// Tab, et revient à l'élément qui l'avait ouverte à la fermeture.
export default function Modal({ onClose, className = 'max-w-lg rounded-2xl', label, children }) {
  useEscape(onClose);
  const boite = useRef(null);
  const idBase = useId();
  const [titreId, setTitreId] = useState(null);

  // À chaque rendu : le titre peut apparaître après le chargement des données.
  useEffect(() => {
    const titre = boite.current.querySelector('h1, h2, h3');
    if (!titre) return;
    if (!titre.id) titre.id = `${idBase}-titre`;
    setTitreId(actuel => (actuel === titre.id ? actuel : titre.id));
  });

  useEffect(() => {
    const el = boite.current;
    const precedent = document.activeElement;

    if (!el.contains(document.activeElement)) {
      const champ = el.querySelector('input:not([disabled]):not([type="hidden"]):not(.hidden), select:not([disabled]), textarea:not([disabled])');
      (champ || el).focus({ preventScroll: true });
    }

    return () => {
      if (precedent && precedent.isConnected && typeof precedent.focus === 'function') precedent.focus({ preventScroll: true });
    };
  }, [idBase]);

  // Piège à focus : Tab / Maj+Tab restent dans la modale.
  function surTouche(e) {
    if (e.key !== 'Tab') return;
    const el = boite.current;
    const actifs = [...el.querySelectorAll(FOCALISABLES)].filter(n => n.offsetParent !== null);
    if (actifs.length === 0) { e.preventDefault(); el.focus(); return; }
    const premier = actifs[0];
    const dernier = actifs[actifs.length - 1];
    const courant = document.activeElement;
    if (e.shiftKey && (courant === premier || courant === el)) { e.preventDefault(); dernier.focus(); }
    else if (!e.shiftKey && courant === dernier) { e.preventDefault(); premier.focus(); }
  }

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={surTouche}
    >
      <div
        ref={boite}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titreId || undefined}
        aria-label={titreId ? undefined : label}
        tabIndex={-1}
        className={`relative w-full bg-white shadow-2xl outline-none ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
