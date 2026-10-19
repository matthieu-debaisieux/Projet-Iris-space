import { useCallback, useState } from 'react';
import AdminLayout from '../../layouts/AdminLayout.jsx';
import { LS_ABSENCES, LS_COURS, loadJSON } from '../../lib/storage.js';
import { useEscape } from '../../lib/useEscape.js';

// ── Données initiales ───────────────────────────────────────────────────────
const DEFAULT_ABSENCES = [
  { eleve: 'Jean Dupond',    classe: 'BTS 1ère Année', heureDebut: '09:00', heureFin: '13:00', statut: 'en_attente',   notes: 'Parents non joignables.',    tel: '06 12 34 56 78', email: 'dupond.famille@email.fr' },
  { eleve: 'Marie Lambert',  classe: 'BTS 2ème Année', heureDebut: '10:00', heureFin: '12:00', statut: 'justifie',     notes: 'Certificat médical fourni.', tel: '07 23 45 67 89', email: 'lambert.contact@email.fr' },
  { eleve: 'Lucas Martin',   classe: 'BTS 1ère Année', heureDebut: '14:00', heureFin: '18:00', statut: 'non_justifie', notes: '',                           tel: '06 34 56 78 90', email: 'martin.lucas@email.fr' },
  { eleve: 'Sophie Bernard', classe: 'BTS 3ème Année', heureDebut: '08:00', heureFin: '10:00', statut: 'en_attente',   notes: 'Convocation reçue.',         tel: '07 45 67 89 01', email: 'bernard.sophie@email.fr' },
];

const DEFAULT_COURS = [];

const STATUT_LABEL = { en_attente: 'En attente', justifie: 'Justifié', non_justifie: 'Non justifié' };

const th = 'border border-gray-400 px-3 py-3 text-center font-semibold bg-[var(--color-background)]';
const td = 'border border-gray-400 px-3 py-2 text-center';

export default function Dashboard() {
  const [absences, setAbsences] = useState(() => loadJSON(LS_ABSENCES, DEFAULT_ABSENCES));
  const [cours, setCours] = useState(() => loadJSON(LS_COURS, DEFAULT_COURS));
  const [contact, setContact] = useState(null);

  const closeContact = useCallback(() => setContact(null), []);
  useEscape(closeContact, contact !== null);

  function reloadData() {
    setAbsences(loadJSON(LS_ABSENCES, DEFAULT_ABSENCES));
    setCours(loadJSON(LS_COURS, DEFAULT_COURS));
  }

  return (
    <AdminLayout onResetData={reloadData}>
      <div className="flex-1 overflow-y-auto p-6 bg-[var(--color-page)]">
        <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
          <h1 className="text-2xl font-bold text-[var(--color-titre)]">Page DashBoard</h1>
        </div>

        <div className="flex flex-col 2xl:flex-row gap-8">
          {/* Absences aujourd'hui */}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-[var(--color-titre)] text-center mb-3">Absences aujourd'hui</h2>
            <div className="bg-[var(--color-background)] overflow-hidden">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className={th}>Elèves</th>
                    <th className={th}>Classes</th>
                    <th className={th}>Heure</th>
                    <th className={th}>Justifié?</th>
                    <th className={th}>Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {absences.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-100">
                      <td className={td}>{row.eleve}</td>
                      <td className={td}>{row.classe}</td>
                      <td className={td}>{row.heureDebut} – {row.heureFin}</td>
                      <td className={td}>{STATUT_LABEL[row.statut] ?? row.statut}</td>
                      <td className={td}>
                        <button
                          onClick={() => setContact(row)}
                          className="bg-(--color-secondaire) btn btn-sm text-white text-xs px-3 py-1 rounded-lg hover:opacity-80 transition"
                        >
                          Contact
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cours aujourd'hui */}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-[var(--color-titre)] text-center mb-3">Cours Aujourd'hui</h2>
            <div className="bg-[var(--color-background)] overflow-hidden">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className={`${th} px-2 w-14`}>Heure</th>
                    <th className={th}>Salle/Classe</th>
                    <th className={th}>Salle/Classe</th>
                    <th className={th}>Salle/Classe</th>
                  </tr>
                </thead>
                <tbody>
                  {cours.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-100">
                      <td className="border border-gray-400 px-2 py-2 text-center text-xs font-semibold">{row.heureDebut}</td>
                      <td className={td}>{row.salle1 ?? ''}</td>
                      <td className={td}>{row.salle2 ?? ''}</td>
                      <td className={td}>{row.salle3 ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modale coordonnées contact */}
      {contact && (
        <div className="flex fixed inset-0 z-[300] items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={closeContact} />
          <div className="relative bg-white rounded-lg shadow-2xl p-8 w-full max-w-sm mx-4 z-10">
            <button onClick={closeContact} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold leading-none">
              ✕
            </button>
            <h3 className="text-lg font-bold text-[var(--color-titre)] mb-6">Coordonnées du contact</h3>
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Élève</p>
                <p className="font-semibold text-gray-800 text-base">{contact.eleve}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Téléphone</p>
                <a
                  href={contact.tel ? `tel:${contact.tel.replace(/\s/g, '')}` : '#'}
                  className="font-medium text-[var(--color-secondaire)] hover:underline text-base"
                >
                  {contact.tel ?? 'Non renseigné'}
                </a>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Email</p>
                <a
                  href={contact.email ? `mailto:${contact.email}` : '#'}
                  className="font-medium text-[var(--color-secondaire)] hover:underline text-base break-all"
                >
                  {contact.email ?? 'Non renseigné'}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
