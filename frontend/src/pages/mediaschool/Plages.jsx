import { useRef } from 'react';

const arrowClass = 'shrink-0 w-8 h-8 rounded-full bg-white border border-gray-300 shadow flex items-center justify-center text-gray-600 hover:bg-[var(--color-principal)] hover:text-white hover:border-[var(--color-principal)] transition-colors duration-200';

export default function Plages() {
  const galleryRef = useRef(null);
  const scroll = left => galleryRef.current?.scrollBy({ left, behavior: 'smooth' });

  return (
    <>
      <h1 className="text-center text-2xl font-bold tracking-wide uppercase mb-6 text-[var(--color-principal)]">Les Plages</h1>

      {/* Mobile : empilé | Desktop (md+) : 2 colonnes */}
      <div className="flex flex-col md:flex-row md:gap-10 md:items-start">
        {/* Description */}
        <div className="w-full md:w-2/5 mb-6 md:mb-0">
          <p className="text-sm leading-relaxed">
            <span className="font-semibold text-[var(--color-principal)]">Description : </span>
            <span className="text-gray-600">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam ac sapien turpis.
              Morbi at venenatis libero. Curabitur sed volutpat enim. Nulla a felis mauris.
              Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae;
              Aenean ac bibendum massa. Nullam semper lectus tellus, vitae sollicitudin metus
              consectetur nec. Nullam ut nunc nisl. Quisque fringilla lectus nisl,
              ut blandit diam rutrum ut.
            </span>
          </p>
        </div>

        {/* Photos */}
        <div className="w-full md:w-3/5">
          <p className="text-sm font-semibold text-[var(--color-principal)] mb-3">Photos :</p>

          {/* MOBILE : galerie scroll horizontal avec flèches */}
          <div className="md:hidden relative flex items-center gap-2">
            <button onClick={() => scroll(-148)} className={arrowClass} aria-label="Précédent">‹</button>
            <div ref={galleryRef} className="flex gap-3 overflow-x-auto" style={{ scrollbarWidth: 'none', scrollSnapType: 'x mandatory' }}>
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="shrink-0 w-36 h-24 bg-gray-200 rounded-lg" style={{ scrollSnapAlign: 'start' }} />
              ))}
            </div>
            <button onClick={() => scroll(148)} className={arrowClass} aria-label="Suivant">›</button>
          </div>

          {/* DESKTOP : grille 2x2 de photos */}
          <div className="hidden md:grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="w-full aspect-video bg-gray-200 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
