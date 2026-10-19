import { Fragment, useState } from 'react';
import DataState from '@/components/ui/DataState.jsx';
import { useAsync } from '@/hooks/useAsync.js';
import { getAbsences, STATUT_ABSENCE_LABEL } from '@/services/absences.js';

const STATUT_CLASS = {
  en_attente:   'text-orange-500',
  justifie:     'text-green-600',
  non_justifie: 'text-red-500',
};

// "Jean Dupond" → "JD"
const initiales = nom => nom.split(' ').map(mot => mot[0]).join('').toUpperCase();

export default function Absences() {
  const absences = useAsync(getAbsences);
  // id de l'absence dont la fiche contact est dépliée
  const [activeId, setActiveId] = useState(null);

  const toggle = id => setActiveId(prev => (prev === id ? null : id));

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="w-full border border-gray-300 rounded-lg p-4">
        <h1 className="text-center text-orange-500 font-semibold text-lg mb-4">Absences aujourd'hui</h1>

        <div className="overflow-hidden rounded-md border border-gray-200">
          <DataState state={absences}>{eleves => (
            <table className="w-full text-sm text-gray-700">
              <thead>
                <tr className="bg-gray-50 text-gray-600 font-medium">
                  <th className="text-left px-4 py-2 border-b border-gray-200">Élèves</th>
                  <th className="text-left px-4 py-2 border-b border-gray-200 border-l">Heure</th>
                </tr>
              </thead>
              <tbody>
                {eleves.map((eleve, i) => (
                  <Fragment key={eleve.id}>
                    <tr className={i < eleves.length - 1 || activeId === eleve.id ? 'border-b border-gray-200' : ''}>
                      <td
                        onClick={() => toggle(eleve.id)}
                        className="px-4 py-3 font-medium text-gray-900 underline decoration-dotted decoration-orange-400 cursor-pointer hover:text-orange-500"
                      >
                        {eleve.eleve}
                      </td>
                      <td className="px-4 py-3 border-l border-gray-200">{eleve.heureDebut} à {eleve.heureFin}</td>
                    </tr>

                    {activeId === eleve.id && (
                      <tr>
                        <td colSpan={2} className="p-0 bg-gray-50">
                          <div className="p-4">
                            <ContactCard eleve={eleve} onClose={() => setActiveId(null)} />
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}</DataState>
        </div>
      </div>
    </main>
  );
}

function ContactCard({ eleve, onClose }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center font-semibold">
          {initiales(eleve.eleve)}
        </div>
        <div>
          <p className="font-semibold text-gray-900">{eleve.eleve}</p>
          <p className="text-xs text-gray-500">{eleve.classe}</p>
        </div>
      </div>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-gray-500">Contact responsable</dt>
          <dd className="text-gray-900 font-medium">{eleve.responsable}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">Téléphone</dt>
          <dd className="text-gray-900 font-medium">{eleve.tel}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">Email</dt>
          <dd className="text-gray-900 font-medium">{eleve.email}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">Statut justification</dt>
          <dd className={`${STATUT_CLASS[eleve.statut]} font-medium`}>{STATUT_ABSENCE_LABEL[eleve.statut]}</dd>
        </div>
      </dl>
      <button onClick={onClose} className="mt-4 w-full text-center text-sm text-gray-500 hover:text-gray-700 py-1">
        Fermer
      </button>
    </div>
  );
}
