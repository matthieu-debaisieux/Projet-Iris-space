import EleveLayout from '../../layouts/EleveLayout.jsx';

// Page élève pas encore réalisée : un encadré avec le titre
export default function ElevePage({ title }) {
  return (
    <EleveLayout>
      <main className="flex-1 overflow-y-auto p-6 bg-[var(--color-page)]">
        <div className="w-full border border-gray-300 rounded-lg p-4">
          <h1 className="text-center text-orange-500 font-semibold text-lg mb-4">{title}</h1>
        </div>
      </main>
    </EleveLayout>
  );
}
