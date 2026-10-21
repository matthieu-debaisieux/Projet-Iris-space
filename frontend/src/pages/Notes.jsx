import DataState from '@/components/ui/DataState.jsx';
import { useAsync } from '@/hooks/useAsync.js';
import { getNotes } from '@/services/eleve.js';

const th = 'border border-gray-500 px-4 py-4 text-center font-semibold bg-[var(--color-background)] text-[var(--color-titre)] text-base';
const td = 'border border-gray-500 px-4 py-4 text-center text-base';

export default function Notes() {
  const notes = useAsync(getNotes);

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-[var(--color-page)] flex flex-col items-center">
      <div className="w-full max-w-5xl flex flex-col items-center">
        <h1 className="text-2xl font-bold text-[var(--color-titre)] mb-6 text-center w-full">Mes notes</h1>

        <div className="border border-gray-300 rounded-md overflow-hidden w-full">
          <DataState state={notes}>{liste => (
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
                {liste.map(n => (
                  <tr key={n.id}>
                    <td className={`${td} font-semibold`}>{n.note}</td>
                    <td className={td}>{n.matiere}</td>
                    <td className={`${td} text-gray-700`}>{n.prof}</td>
                    <td className={`${td} text-gray-600`}>{n.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}</DataState>
        </div>
      </div>
    </div>
  );
}
