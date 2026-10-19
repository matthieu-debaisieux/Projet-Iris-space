import EleveLayout from '../../layouts/EleveLayout.jsx';

const NOTES = [
  { note: '16/20',   matiere: 'Mathématiques',   prof: 'M. Martin',   date: '28/06/2028' },
  { note: '13/20',   matiere: 'Français',        prof: 'Mme. Dupont', date: '25/06/2028' },
  { note: '15,5/20', matiere: 'SVT',             prof: 'M. Bernard',  date: '20/06/2028' },
  { note: '11/20',   matiere: 'Histoire-Géo',    prof: 'Mme. Robert', date: '17/06/2028' },
  { note: '18/20',   matiere: 'Anglais',         prof: 'M. Jackson',  date: '12/06/2028' },
  { note: '14/20',   matiere: 'Physique-Chimie', prof: 'Mme. Richard', date: '05/06/2028' },
];

const th = 'border border-gray-500 px-4 py-4 text-center font-semibold bg-[var(--color-background)] text-[var(--color-titre)] text-base';
const td = 'border border-gray-500 px-4 py-4 text-center text-base';

export default function Notes() {
  return (
    <EleveLayout>
      <div className="flex-1 overflow-y-auto p-6 bg-[var(--color-page)] flex flex-col items-center">
        <div className="w-full max-w-5xl flex flex-col items-center">
          <h1 className="text-2xl font-bold text-[var(--color-titre)] mb-6 text-center w-full">Mes notes</h1>

          <div className="border border-gray-300 rounded-md overflow-hidden w-full">
            <table className="w-full border-collapse text-sm table-fixed">
              <colgroup>
                <col className="w-1/4" />
                <col className="w-1/4" />
                <col className="w-1/4" />
                <col className="w-1/4" />
              </colgroup>
              <thead>
                <tr>
                  <th className={th}>Note</th>
                  <th className={th}>Matière</th>
                  <th className={th}>Professeur</th>
                  <th className={th}>Date</th>
                </tr>
              </thead>
              <tbody>
                {NOTES.map(n => (
                  <tr key={n.matiere}>
                    <td className={`${td} font-semibold`}>{n.note}</td>
                    <td className={td}>{n.matiere}</td>
                    <td className={`${td} text-gray-700`}>{n.prof}</td>
                    <td className={`${td} text-gray-600`}>{n.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </EleveLayout>
  );
}
