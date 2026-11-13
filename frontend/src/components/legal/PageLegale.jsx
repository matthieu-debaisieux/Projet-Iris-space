import '@tabler/icons-webfont/dist/tabler-icons.min.css';
import { Link } from 'react-router-dom';

// Mise en page commune aux pages légales (mentions, confidentialité, CGU) :
// titre, sommaire cliquable à gauche, une carte par section.
//   <PageLegale titre="…" miseAJour="…" sections={[{ id, titre, icon }]}>
//     <Section id="…">…</Section>
//   </PageLegale>

const card = 'bg-white rounded-2xl border border-[#E1E5EE] shadow-[0_1px_2px_rgba(0,18,87,0.04)]';
const lien = 'font-semibold text-[#07A6A6] hover:underline';

// Les trois pages légales, pour les liens croisés en bas de page
export const PAGES_LEGALES = [
  { to: '/mentions-legales', label: 'Mentions légales' },
  { to: '/politique-de-confidentialite', label: 'Politique de confidentialité' },
  { to: '/cgu', label: "Conditions générales d'utilisation" },
];

export const Icon = ({ name, size = 16, className = '' }) => (
  <i className={`ti ti-${name} ${className}`} style={{ fontSize: size }} aria-hidden="true" />
);

// Valeur fournie, ou badge « À compléter »
export const V = ({ children }) => children ?? (
  <span className="rounded-md bg-[#FFF3D6] px-1.5 py-0.5 text-xs font-semibold text-[#8A5A00]">À compléter</span>
);

// Tableau « libellé : valeur »
export const Infos = ({ lignes }) => (
  <dl className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-x-6 gap-y-3 text-sm">
    {lignes.map(([nom, valeur]) => (
      <div key={nom} className="contents">
        <dt className="text-[#6B7185]">{nom}</dt>
        <dd className="font-medium text-[#1A1D2E] break-words"><V>{valeur}</V></dd>
      </div>
    ))}
  </dl>
);

// Liste à puces
export const Liste = ({ items }) => (
  <ul className="flex flex-col gap-1.5 pl-1">
    {items.map((item, i) => (
      <li key={i} className="flex gap-2">
        <Icon name="point-filled" size={12} className="mt-1 text-[#07A6A6] shrink-0" />
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

// Lien externe ou interne avec le style des pages légales
export const Lien = ({ to, href, children }) => (
  href
    ? <a href={href} target="_blank" rel="noreferrer" className={lien}>{children}</a>
    : <Link to={to} className={lien}>{children}</Link>
);

export function Section({ id, titre, icon, children }) {
  return (
    <section id={id} className={`${card} p-6 scroll-mt-6`}>
      <h2 className="flex items-center gap-3 text-base font-bold text-[#001257] mb-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EEF1F7]"><Icon name={icon} size={18} /></span>
        {titre}
      </h2>
      <div className="flex flex-col gap-3 text-sm leading-relaxed text-[#1A1D2E]">{children}</div>
    </section>
  );
}

export default function PageLegale({ titre, intro, miseAJour, sections, children }) {
  const aller = id => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <main className="flex-1 overflow-y-auto bg-[var(--color-page)]">
      <div className="mx-auto w-full max-w-[1200px] px-6 py-8 flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold text-[#001257]">{titre}</h1>
          <p className="mt-1 text-sm text-[#6B7185]">Dernière mise à jour : {miseAJour}</p>
          {intro && <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[#1A1D2E]">{intro}</p>}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 items-start">
          <nav aria-label="Sommaire" className={`${card} p-4 lg:sticky lg:top-0`}>
            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-[#6B7185]">Sommaire</p>
            <ul className="flex flex-col">
              {sections.map(s => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => aller(s.id)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-[#001257] hover:bg-[#EEF1F7] transition"
                  >
                    <Icon name={s.icon} className="text-[#6B7185]" /> {s.titre}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex flex-col gap-6">
            {children}

            <p className="flex flex-wrap justify-center gap-x-4 gap-y-1 pt-2 text-xs text-[#6B7185]">
              Voir aussi :
              {PAGES_LEGALES.filter(p => p.label !== titre).map(p => <Lien key={p.to} to={p.to}>{p.label}</Lien>)}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
