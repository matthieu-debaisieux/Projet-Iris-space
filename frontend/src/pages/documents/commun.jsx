import { useState } from 'react';
import Modal from '@/components/ui/Modal.jsx';

// Éléments partagés par la page Documents (espaces de l'établissement) et par le bloc
// « Mes ressources de cours » du professeur (RessourcesProf.jsx).

// ── Règles de dépôt ─────────────────────────────────────────────────────────
// (sous-ensemble de ce que le back accepte : routes/helpers.php, EXTENSIONS_AUTORISEES)
const TAILLE_MAX = 10 * 1024 * 1024; // 10 Mo
const TYPES = {
  pdf: ['application/pdf'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  png: ['image/png'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
};
export const ACCEPT = Object.keys(TYPES).map(e => `.${e}`).join(',');

const extension = nom => (nom.includes('.') ? nom.split('.').pop().toLowerCase() : '');
// Retire chemins, caractères de contrôle et caractères interdits dans un nom de fichier
export const nettoyerNom = nom => nom
  .replace(/[\u0000-\u001f\u007f]/g, '')
  .replace(/[\\/:*?"<>|]/g, '_')
  .replace(/^\.+/, '')
  .trim()
  .slice(0, 100);
export const taille = o => (o < 1024 * 1024 ? `${Math.max(1, Math.round(o / 1024))} Ko` : `${(o / 1024 / 1024).toFixed(1)} Mo`);

// Renvoie un message d'erreur, ou '' si le fichier est acceptable
export function verifierFichier(file) {
  if (!file) return 'Choisissez un fichier.';
  const ext = extension(file.name);
  if (!TYPES[ext]) return `Format non autorisé. Formats acceptés : ${Object.keys(TYPES).join(', ')}.`;
  if (file.type && !TYPES[ext].includes(file.type)) return "Le contenu du fichier ne correspond pas à son extension.";
  if (file.size === 0) return 'Le fichier est vide.';
  if (file.size > TAILLE_MAX) return `Fichier trop lourd (${taille(file.size)}). Maximum : 10 Mo.`;
  return '';
}

// Téléchargement : toujours en pièce jointe (jamais ouvert dans la page)
export function telechargerFichier(file, nom) {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Date renvoyée par le back (« 2026-10-30 18:00:00+01 ») ou ISO → « 30/10/2026 ».
// Le back donne un décalage court (+01) que tous les navigateurs ne lisent pas : on le complète.
export function formaterDate(valeur) {
  if (!valeur) return '';
  const d = new Date(String(valeur).replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00'));
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('fr-FR');
}

// ── Icônes ──────────────────────────────────────────────────────────────────
export const Svg = ({ d, size = 16, className = '' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d={d} /></svg>
);
export const ICONES = {
  fichier: 'M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z M14 2v6h6',
  lien: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71 M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
  texte: 'M17 6H3 M21 12H3 M15 18H3',
  telecharger: 'M12 3v12 M7 10l5 5 5-5 M5 21h14',
  deposer: 'M12 15V3 M7 8l5-5 5 5 M5 21h14',
  corbeille: 'M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2',
  chevron: 'M19 9l-7 7-7-7',
  plus: 'M12 5v14 M5 12h14',
  bouclier: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
};

// ── Styles ──────────────────────────────────────────────────────────────────
export const btnPrincipal = 'inline-flex items-center gap-1.5 rounded-lg bg-[#EC6F6F] px-4 py-2 text-sm font-bold text-[#001257] hover:opacity-90 disabled:opacity-50 transition';
export const btnSecondaire = 'inline-flex items-center gap-1.5 rounded-lg border border-[#E1E5EE] bg-white px-4 py-2 text-sm font-semibold text-[#001257] hover:bg-[#EEF1F7] transition';
export const champ = 'w-full rounded-lg border border-[#E1E5EE] bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-[#001257]';
export const libelle = 'mb-1.5 block text-xs font-semibold text-[#1A1D2E]';

// ── Modale de saisie / confirmation ─────────────────────────────────────────
export function Dialogue({ titre, champLabel, valeur = '', confirmer, danger = false, onConfirm, onClose, children }) {
  const [texte, setTexte] = useState(valeur);
  const valider = e => { e.preventDefault(); onConfirm(texte.trim().slice(0, 100)); };

  return (
    <Modal onClose={onClose} className="max-w-sm rounded-2xl p-6" label={titre}>
      <form onSubmit={valider} className="flex flex-col gap-4">
        <h3 className="text-lg font-bold text-[#001257]">{titre}</h3>
        {children}
        {champLabel && (
          <input autoFocus type="text" value={texte} maxLength={100} onChange={e => setTexte(e.target.value)} placeholder={champLabel} aria-label={champLabel} className={champ} />
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btnSecondaire}>Annuler</button>
          <button type="submit" className={danger ? 'rounded-lg bg-[#B23A3A] px-4 py-2 text-sm font-bold text-white hover:opacity-90 transition' : btnPrincipal}>{confirmer}</button>
        </div>
      </form>
    </Modal>
  );
}
