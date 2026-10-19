import ProfLayout from '../../layouts/ProfLayout.jsx';

// Page professeur simple (contenu à venir) : un encadré avec le titre
export default function ProfPage({ title }) {
  return (
    <ProfLayout>
      <main className="flex-1 overflow-y-auto p-6">
        <div className="w-full border border-gray-300 rounded-lg p-4">
          <h1 className="text-center text-orange-500 font-semibold text-lg mb-4">{title}</h1>
        </div>
      </main>
    </ProfLayout>
  );
}
