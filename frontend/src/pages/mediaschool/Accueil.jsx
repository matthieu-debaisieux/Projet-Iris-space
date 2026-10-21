import { Link } from 'react-router-dom';

const CATEGORIES = [
  { to: '/mediaschool/plages', label: 'Les plages', placeholder: 'Exemple' },
  { to: '/mediaschool/events', label: 'Events', placeholder: 'Exemple' },
  { to: '#', label: 'TITRE', placeholder: '', uppercase: true },
];

export default function Accueil() {
  return (
    <main className="flex-1 overflow-y-auto p-6 md:p-10 bg-[var(--color-page)]">
      <h1 className="text-center text-2xl font-bold tracking-wide uppercase mb-4 text-[var(--color-principal)]">
        Les Bons Plans de MediaSchool
      </h1>

      {/* Edito */}
      <p className="text-sm text-center mb-2 leading-relaxed">
        <span className="font-semibold text-[var(--color-principal)]">Edito : </span>
        <span className="text-gray-600">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam ac sapien turpis.
          Morbi at venenatis libero. Curabitur sed volutpat enim. Nulla a felis mauris.
          Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae;
          Aenean ac bibendum massa.
        </span>
      </p>

      {/* Grille des catégories */}
      <div className="grid grid-cols-3 gap-4 md:gap-6 max-w-2xl mx-auto mt-8">
        {CATEGORIES.map(cat => (
          <Link key={cat.label} to={cat.to} className="flex flex-col items-center gap-2 group cursor-pointer">
            <div className="w-full aspect-square bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center group-hover:shadow-md transition-shadow">
              <span className="text-gray-400 text-xs">{cat.placeholder}</span>
            </div>
            <span className={`text-sm text-gray-700 font-medium ${cat.uppercase ? 'uppercase tracking-wide' : ''}`}>{cat.label}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
