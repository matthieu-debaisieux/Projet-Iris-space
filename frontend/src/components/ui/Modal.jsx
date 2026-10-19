import { useEscape } from '@/hooks/useEscape.js';

// ── Modale générique : fond sombre + boîte blanche ──────────────────────────
// Se ferme avec Échap ou un clic sur le fond. `className` : taille / padding
// / arrondi de la boîte (ex. "max-w-sm p-6 rounded-lg").
export default function Modal({ onClose, className = 'max-w-lg rounded-2xl', label, children }) {
  useEscape(onClose);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`relative w-full bg-white shadow-2xl ${className}`}>
        {children}
      </div>
    </div>
  );
}
