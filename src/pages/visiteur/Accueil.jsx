import VisiteurLayout from '../../layouts/VisiteurLayout.jsx';
import ActualitesPubliees from '../../components/ActualitesPubliees.jsx';

export default function Accueil() {
  return (
    <VisiteurLayout>
      <div className="flex-1 overflow-y-auto p-6 bg-[var(--color-page)]">
        <ActualitesPubliees />
      </div>
    </VisiteurLayout>
  );
}
