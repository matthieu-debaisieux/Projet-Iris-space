import { Fragment, useState } from 'react';
import AdminLayout from '../../layouts/AdminLayout.jsx';

const STATUT_CLASS = {
  'En attente':   'text-orange-500',
  'Justifié':     'text-green-600',
  'Non justifié': 'text-red-500',
};

const ELEVES = [
  { nom: 'Jean Dupond',     initiales: 'JD', classe: 'BTS 1er Année', heure: '9h à 13h',  responsable: 'M. Pierre Dupond',    tel: '06 12 34 56 78', email: 'pierre.dupond@email.fr',   statut: 'En attente' },
  { nom: 'Jaque Dujardin',  initiales: 'JD', classe: 'BTS 3e Année',  heure: '14h à 18h', responsable: 'Mme Hélène Dujardin', tel: '06 98 76 54 32', email: 'helene.dujardin@email.fr', statut: 'Justifié' },
  { nom: 'Marie Lefèvre',   initiales: 'ML', classe: 'BTS 2e Année',  heure: '8h à 12h',  responsable: 'M. Antoine Lefèvre',  tel: '07 11 22 33 44', email: 'antoine.lefevre@email.fr', statut: 'Non justifié' },
  { nom: 'Karim Benali',    initiales: 'KB', classe: 'BTS 1er Année', heure: '13h à 17h', responsable: 'Mme Nadia Benali',    tel: '06 55 44 33 22', email: 'nadia.benali@email.fr',    statut: 'En attente' },
  { nom: 'Sophie Marchand', initiales: 'SM', classe: 'BTS 3e Année',  heure: '9h à 18h',  responsable: 'M. Julien Marchand',  tel: '07 88 99 00 11', email: 'julien.marchand@email.fr', statut: 'Justifié' },
];

export default function Absences() {
  // index de l'élève dont la fiche contact est dépliée
  const [activeIndex, setActiveIndex] = useState(null);

  const toggle = i => setActiveIndex(prev => (prev === i ? null : i));

  return (
    <AdminLayout>
      <main className="flex-1 overflow-y-auto p-6">
        <div className="w-full border border-gray-300 rounded-lg p-4">
          <h1 className="text-center text-orange-500 font-semibold text-lg mb-4">Absences aujourd'hui</h1>

          <div className="overflow-hidden rounded-md border border-gray-200">
            <table className="w-full text-sm text-gray-700">
              <thead>
                <tr className="bg-gray-50 text-gray-600 font-medium">
                  <th className="text-left px-4 py-2 border-b border-gray-200">Élèves</th>
                  <th className="text-left px-4 py-2 border-b border-gray-200 border-l">Heure</th>
                </tr>
              </thead>
              <tbody>
                {ELEVES.map((eleve, i) => (
                  <Fragment key={eleve.nom}>
                    <tr className={i < ELEVES.length - 1 || activeIndex === i ? 'border-b border-gray-200' : ''}>
                      <td
                        onClick={() => toggle(i)}
                        className="px-4 py-3 font-medium text-gray-900 underline decoration-dotted decoration-orange-400 cursor-pointer hover:text-orange-500"
                      >
                        {eleve.nom}
                      </td>
                      <td className="px-4 py-3 border-l border-gray-200">{eleve.heure}</td>
                    </tr>

                    {activeIndex === i && (
                      <tr>
                        <td colSpan={2} className="p-0 bg-gray-50">
                          <div className="p-4">
                            <ContactCard eleve={eleve} onClose={() => setActiveIndex(null)} />
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </AdminLayout>
  );
}

function ContactCard({ eleve, onClose }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center font-semibold">
          {eleve.initiales}
        </div>
        <div>
          <p className="font-semibold text-gray-900">{eleve.nom}</p>
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
          <dd className={`${STATUT_CLASS[eleve.statut]} font-medium`}>{eleve.statut}</dd>
        </div>
      </dl>
      <button onClick={onClose} className="mt-4 w-full text-center text-sm text-gray-500 hover:text-gray-700 py-1">
        Fermer
      </button>
    </div>
  );
}
