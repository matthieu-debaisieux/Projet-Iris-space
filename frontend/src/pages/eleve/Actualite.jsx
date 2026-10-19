import ActualitesPubliees from '@/components/ActualitesPubliees.jsx';

export default function Actualite() {
  return (
    <div className="flex-1 overflow-y-auto p-6 bg-[var(--color-page)]">
      <ActualitesPubliees className="justify-items-center" />
    </div>
  );
}
