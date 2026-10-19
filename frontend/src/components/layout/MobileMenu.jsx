import { Link } from 'react-router-dom';

// ── Bouton burger (icône qui pivote entre ☰ et ✕) ───────────────────────────
export function BurgerButton({ open, onToggle, bg = 'bg-[var(--color-principal)]' }) {
  return (
    <label className={`btn border-0 ${bg} swap swap-rotate active:scale-100 active:translate-y-0 shadow-none active:shadow-none`}>
      <input type="checkbox" checked={open} onChange={onToggle} />
      <svg className="swap-off fill-current filter invert" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 512 512">
        <path d="M64,384H448V341.33H64Zm0-106.67H448V234.67H64ZM64,128v42.67H448V128Z" />
      </svg>
      <svg className="swap-on fill-current filter invert" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 512 512">
        <polygon points="400 145.49 366.51 112 256 222.51 145.49 112 112 145.49 222.51 256 112 366.51 145.49 400 256 289.49 366.51 400 400 366.51 289.49 256 400 145.49" />
      </svg>
    </label>
  );
}

// ── Panneau latéral (mobile) ────────────────────────────────────────────────
// links : [{ to, label }]
export function MobileMenu({
  open,
  onClose,
  links,
  panelBg = 'bg-[var(--color-secondaire)]',
  linkClassName = 'text-white text-xl font-medium hover:translate-x-2 transition-transform duration-200',
  navClassName = 'flex flex-col gap-5',
}) {
  return (
    <div className={`fixed inset-0 z-50 transition-[visibility] duration-300 ${open ? 'visible' : 'invisible'}`}>
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <div
        className={`absolute top-0 right-0 h-full w-72 ${panelBg} rounded-l-3xl shadow-2xl flex flex-col p-6 transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex justify-end mb-8">
          <button
            onClick={onClose}
            className="text-white text-3xl font-bold leading-none hover:scale-125 transition-transform duration-200"
            aria-label="Fermer le menu"
          >
            →
          </button>
        </div>
        <nav className={navClassName}>
          {links.map(link => (
            <Link key={link.label} to={link.to} className={linkClassName} onClick={onClose}>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
