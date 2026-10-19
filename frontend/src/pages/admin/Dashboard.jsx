import { useState } from 'react';
import DataState from '@/components/ui/DataState.jsx';
import Modal from '@/components/ui/Modal.jsx';
import { useAsync } from '@/hooks/useAsync.js';
import { getAbsences, STATUT_ABSENCE_LABEL } from '@/services/absences.js';
import { getCoursDuJour } from '@/services/planning.js';

const th = 'border border-gray-400 px-3 py-3 text-center font-semibold bg-[var(--color-background)]';
const td = 'border border-gray-400 px-3 py-2 text-center';

export default function Dashboard() {
  const absences = useAsync(getAbsences);
  const cours = useAsync(getCoursDuJour);
  const [contact, setContact] = useState(null);

  return (
    <>
      <div className="flex-1 overflow-y-auto p-6 bg-[var(--color-page)]">
        <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
          <h1 className="text-2xl font-bold text-[var(--color-titre)]">Page DashBoard</h1>
        </div>

        <div className="flex flex-col 2xl:flex-row gap-8">
          {/* Absences aujourd'hui */}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-[var(--color-titre)] text-center mb-3">Absences aujourd'hui</h2>
            <div className="bg-[var(--color-background)] overflow-hidden">
              <DataState state={absences}>{rows => (
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
                    {rows.map(row => (
                      <tr key={row.id} className="hover:bg-gray-100">
                        <td className={td}>{row.eleve}</td>
                        <td className={td}>{row.classe}</td>
                        <td className={td}>{row.heureDebut} – {row.heureFin}</td>
                        <td className={td}>{STATUT_ABSENCE_LABEL[row.statut] ?? row.statut}</td>
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
              )}</DataState>
            </div>
          </div>

          {/* Cours aujourd'hui */}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-[var(--color-titre)] text-center mb-3">Cours Aujourd'hui</h2>
            <div className="bg-[var(--color-background)] overflow-hidden">
              <DataState state={cours}>{rows => (
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
                    {rows.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-100">
                        <td className="border border-gray-400 px-2 py-2 text-center text-xs font-semibold">{row.heureDebut}</td>
                        <td className={td}>{row.salle1 ?? ''}</td>
                        <td className={td}>{row.salle2 ?? ''}</td>
                        <td className={td}>{row.salle3 ?? ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}</DataState>
            </div>
          </div>
        </div>
      </div>

      {/* Modale coordonnées contact */}
      {contact && (
        <Modal onClose={() => setContact(null)} className="max-w-sm rounded-lg p-8" label="Coordonnées du contact">
          <button onClick={() => setContact(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold leading-none">
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
        </Modal>
      )}
    </>
  );
}
