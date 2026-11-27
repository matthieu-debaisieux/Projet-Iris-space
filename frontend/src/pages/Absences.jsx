import { useState } from 'react';
import DataState from '@/components/ui/DataState.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { useAsync } from '@/hooks/useAsync.js';
import { getAbsences, STATUT_ABSENCE_LABEL } from '@/services/absences.js';

// Page élève « Vie scolaire ».
// Les données viennent de getAbsences() (aujourd'hui : données de test ; plus tard : base de données).
// Seules les absences de l'élève connecté sont affichées (comparaison sur user.nom).
//import { useMemo, useState } from 'react';
//import DataState from '@/components/ui/DataState.jsx';
//import { useAsync } from '@/hooks/useAsync.js';
//import { STATUT_ABSENCE_LABEL, justifierAbsence } from '@/services/absences.js'; 
//Les justifications envoyées restent en mémoire de la page : à brancher sur l'API plus tard.

const MOTIFS = ['Arrêt maladie', 'Rendez-vous médical', 'Problème de transport', 'Raison familiale', 'Autre'];

const BADGE = {
  non_justifie: 'bg-[#FBE6E6] text-[#B23A3A]',
  justifie: 'bg-[#E3F5EC] text-[#1E7F55]',
  en_attente: 'bg-[#FFF3D6] text-[#8A5A00]',
};

const card = 'bg-white rounded-2xl border border-[#E1E5EE] p-6';
const th = 'bg-[#EEF1F7] px-4 py-3 text-left text-xs font-medium text-[#6B7185] first:rounded-l-lg last:rounded-r-lg';
const td = 'px-4 py-4 border-b border-[#E1E5EE]';
const champ = 'w-full rounded-lg border border-[#E1E5EE] bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-[#001257]';
const label = 'block mb-1.5 text-xs font-semibold text-[#1A1D2E]';

const aujourdhui = () => new Date().toISOString().slice(0, 10);          // "2026-10-21"
const formatFr = iso => iso.split('-').reverse().join('/');               // "21/10/2026"
const nbJours = (debut, fin) => Math.round((Date.parse(fin) - Date.parse(debut)) / 86400000) + 1;

// Une absence du service → une ligne du tableau (les champs absents ont une valeur par défaut)
const versLigne = a => ({
  id: a.id,
  date: a.date ?? formatFr(aujourdhui()),
  duree: a.duree ?? `${a.heureDebut} – ${a.heureFin}`,
  type: a.type ?? 'Absence',
  motif: a.motif ?? a.notes ?? '',
  statut: a.statut,
});

export default function VieScolaire() {
  const { user } = useAuth();
  const absences = useAsync(getAbsences);

  return (
    <div className="flex-1 overflow-y-auto bg-[var(--color-page)]">
      <div className="mx-auto w-full max-w-[1200px] px-6 py-8">
        <DataState state={absences}>{liste => (
          <Contenu liste={user?.nom ? liste.filter(a => a.eleve === user.nom) : liste} />
        )}</DataState>
      </div>
    </div>
  );
}

function Contenu({ liste }) {
  const [envois, setEnvois] = useState([]); // justifications envoyées depuis le formulaire
  const lignes = [...envois, ...liste.map(versLigne)];

  const ajouter = ({ debut, fin, raison }) => {
    // Plus tard : envoyer à l'API, puis recharger la liste.
    const jours = nbJours(debut, fin);
    setEnvois(e => [{
      id: `envoi-${Date.now()}`,
      date: debut === fin ? formatFr(debut) : `${formatFr(debut)} → ${formatFr(fin)}`,
      duree: jours === 1 ? '1 jour' : `${jours} jours`,
      type: 'Absence',
      motif: raison,
      statut: 'en_attente',
    }, ...e]);
  };

  const nb = {
    absences: lignes.filter(l => l.type === 'Absence').length,
    retards: lignes.filter(l => l.type === 'Retard').length,
    aJustifier: lignes.filter(l => l.statut === 'non_justifie').length,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-bold text-[#001257]">Vie scolaire</h1>
        <div className="flex gap-3">
          <Compteur nom="Absences" valeur={nb.absences} />
          <Compteur nom="Retards" valeur={nb.retards} />
          <Compteur nom="À justifier" valeur={nb.aJustifier} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
        <section className={card}>
          <h2 className="text-base font-bold text-[#001257] mb-4">Mes absences et retards</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  <th className={th}>Date</th>
                  <th className={th}>Durée</th>
                  <th className={th}>Type</th>
                  <th className={th}>Motif</th>
                  <th className={th}>Statut</th>
                </tr>
              </thead>
              <tbody>
                {lignes.map(l => (
                  <tr key={l.id}>
                    <td className={`${td} font-bold text-[#001257]`}>{l.date}</td>
                    <td className={`${td} text-[#6B7185]`}>{l.duree}</td>
                    <td className={td}>{l.type}</td>
                    <td className={`${td} text-[#6B7185]`}>{l.motif || '—'}</td>
                    <td className={td}>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${BADGE[l.statut] ?? BADGE.en_attente}`}>
                        {STATUT_ABSENCE_LABEL[l.statut] ?? l.statut}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!lignes.length && <p className="py-8 text-center text-sm text-[#6B7185]">Aucune absence ni retard.</p>}
          </div>
        </section>

        <Formulaire onEnvoyer={ajouter} />
      </div>
    </div>
  );
}

const Compteur = ({ nom, valeur }) => (
  <div className="bg-white rounded-2xl border border-[#E1E5EE] px-5 py-3 min-w-28">
    <p className="text-xs text-[#6B7185]">{nom}</p>
    <p className="text-2xl font-bold text-[#001257]">{valeur}</p>
  </div>
);

// ── Formulaire de justification (date de début + date de fin) ───────────────
function Formulaire({ onEnvoyer }) {
  const [debut, setDebut] = useState(aujourdhui);
  const [fin, setFin] = useState(aujourdhui);
  const [raison, setRaison] = useState('');
  const [message, setMessage] = useState(null); // { ok, texte }

  const changerDebut = v => {
    setDebut(v);
    if (fin < v) setFin(v);
  };

  const envoyer = e => {
    e.preventDefault();
    if (!debut || !fin || fin < debut) return setMessage({ ok: false, texte: 'La date de fin doit être après la date de début.' });
    if (!raison) return setMessage({ ok: false, texte: 'Choisissez un motif.' });

    onEnvoyer({ debut, fin, raison });
    setRaison('');
    e.target.reset(); // vide le fichier et le commentaire
    setMessage({ ok: true, texte: 'Justification envoyée. Elle est en attente de validation.' });
  };

  return (
    <section className={card}>
      <h2 className="text-base font-bold text-[#001257] mb-5">Justifier une absence</h2>

      <form onSubmit={envoyer} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="debut" className={label}>Début</label>
            <input id="debut" type="date" value={debut} max={fin} onChange={e => changerDebut(e.target.value)} className={champ} />
          </div>
          <div>
            <label htmlFor="fin" className={label}>Fin</label>
            <input id="fin" type="date" value={fin} min={debut} onChange={e => setFin(e.target.value)} className={champ} />
          </div>
        </div>

        <div>
          <label htmlFor="raison" className={label}>Raison</label>
          <select id="raison" value={raison} onChange={e => setRaison(e.target.value)} className={champ}>
            <option value="" disabled>Choisir un motif</option>
            {MOTIFS.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="fichier" className={label}>Justificatif (PDF)</label>
          <input id="fichier" type="file" accept="application/pdf" className={champ} />
        </div>

        <div>
          <label htmlFor="commentaire" className={label}>Commentaire</label>
          <input id="commentaire" type="text" placeholder="Précisions éventuelles" className={champ} />
        </div>

        <button type="submit" className="rounded-lg bg-[#EC6F6F] px-4 py-3 text-sm font-bold text-[#001257] hover:opacity-90 transition">
          Envoyer la justification
        </button>

        {message && (
          <p role="status" className={`text-xs ${message.ok ? 'text-[#1E7F55]' : 'text-[#B23A3A]'}`}>{message.texte}</p>
        )}
      </form>
    </section>
  );
}