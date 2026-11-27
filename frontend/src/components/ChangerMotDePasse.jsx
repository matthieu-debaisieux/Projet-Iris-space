import { useState } from 'react';
import Modal from '@/components/ui/Modal.jsx';
import { changerMotDePasse } from '@/services/auth.js';

// ── Fenêtre « Changer mon mot de passe » (CPT-06) ───────────────────────────
export default function ChangerMotDePasse({ onClose }) {
  const [ancien, setAncien] = useState('');
  const [nouveau, setNouveau] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [erreur, setErreur] = useState(null);
  const [message, setMessage] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  const champ = 'rounded-md border border-gray-300 px-3 py-2 text-sm';
  const etiquette = 'text-sm font-semibold text-[var(--color-principal)]';

  async function handleSubmit(e) {
    e.preventDefault();
    if (nouveau !== confirmation) {
      setErreur('Les deux nouveaux mots de passe ne sont pas identiques');
      return;
    }
    setEnvoi(true);
    setErreur(null);
    try {
      setMessage((await changerMotDePasse(ancien, nouveau)).message);
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Modal onClose={onClose} className="max-w-md rounded-2xl p-6" label="Changer mon mot de passe">
      <div className="flex items-start justify-between">
        <h2 className="text-lg font-semibold text-[var(--color-principal)]">Changer mon mot de passe</h2>
        <button type="button" onClick={onClose} className="text-2xl leading-none text-gray-400 hover:text-gray-600" aria-label="Fermer">×</button>
      </div>

      {message ? (
        <div className="mt-4 flex flex-col gap-4">
          <p role="status" className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">{message}</p>
          <button type="button" onClick={onClose} className="self-end rounded-full bg-[var(--color-principal)] px-4 py-2 text-sm font-medium text-white">Fermer</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <label htmlFor="mdp-ancien" className={etiquette}>Mot de passe actuel</label>
          <input id="mdp-ancien" type="password" autoComplete="current-password" required className={champ} value={ancien} onChange={e => setAncien(e.target.value)} />

          <label htmlFor="mdp-nouveau" className={etiquette}>Nouveau mot de passe (8 caractères minimum)</label>
          <input id="mdp-nouveau" type="password" autoComplete="new-password" minLength={8} maxLength={72} required className={champ} value={nouveau} onChange={e => setNouveau(e.target.value)} />

          <label htmlFor="mdp-confirmation" className={etiquette}>Confirmer le nouveau mot de passe</label>
          <input id="mdp-confirmation" type="password" autoComplete="new-password" minLength={8} maxLength={72} required className={champ} value={confirmation} onChange={e => setConfirmation(e.target.value)} />

          {erreur && <p role="alert" className="text-sm text-red-600">{erreur}</p>}
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">Annuler</button>
            <button type="submit" disabled={envoi} className="rounded-full bg-[var(--color-principal)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">Enregistrer</button>
          </div>
        </form>
      )}
    </Modal>
  );
}
