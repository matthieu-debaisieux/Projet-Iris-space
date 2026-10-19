import msLogo from '@/assets/img/ms_logo_cmjn_blanc_1.png';

// `withMediaschoolLink` : variante des espaces visiteur / élève / MediaSchool
// (libellé court + bouton "Page de MédiaSchool" à droite).
export default function Footer({ withMediaschoolLink = false }) {
  const btn = 'text-white text-xl font-medium hover:-translate-y-1 transition-transform duration-200';

  return (
    <footer className={`flex ${withMediaschoolLink ? 'justify-between items-center px-4' : 'justify-start'} p-2 bg-[#5D5C60] shrink-0`}>
      <div className="text-white text-sm flex items-center">
        <button className={btn}>Mentions légales</button>
        <span className="self-stretch w-px bg-white mx-3" />
        <button className={btn}>{withMediaschoolLink ? 'Confidentialité' : 'Politique de confidentialité'}</button>
        <span className="self-stretch w-px bg-white mx-3" />
        <a href="https://mediaschool.eu/" target="_blank" rel="noreferrer">
          <img src={msLogo} alt="Logo MediaSchool" className="h-12" />
        </a>
      </div>
      {withMediaschoolLink && (
        <a
          href="https://mediaschool.eu/"
          target="_blank"
          rel="noreferrer"
          className="hidden sm:inline-block text-white text-base font-medium border border-white rounded-full px-5 py-2 hover:bg-white hover:text-[#5D5C60] transition-colors duration-200"
        >
          Page de MédiaSchool
        </a>
      )}
    </footer>
  );
}
