
const MOIS = ['Septembre', 'Novembre', 'Décembre', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin'];

export default function Events() {
  return (
    <>
      <h1 className="text-center text-2xl font-bold tracking-wide uppercase mb-8 text-[var(--color-mediaschool)]">Les Events</h1>

      {/* Grille 3x3 des mois */}
      <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
        {MOIS.map(mois => (
          <a key={mois} href="#" className="flex flex-col items-center gap-2 group">
            <div className="w-full aspect-square bg-gray-200 rounded-lg flex items-center justify-center group-hover:bg-[var(--color-mediaschool)] transition-colors duration-200">
              <span className="text-3xl font-bold text-gray-500 group-hover:text-white transition-colors duration-200">{mois[0]}</span>
            </div>
            <span className="text-xs text-gray-600 font-medium">{mois}</span>
          </a>
        ))}
      </div>
    </>
  );
}
