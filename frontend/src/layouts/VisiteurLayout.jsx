import { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import logo from '@/assets/img/Logo_IRIS_SPACE.svg';
import { BurgerButton, MobileMenu } from '@/components/layout/MobileMenu.jsx';
import Footer from '@/components/layout/Footer.jsx';

const MENU_LINKS = [
  { to: '/visiteur', label: 'Accueil' },
  { to: '/visiteur/a-propos', label: 'À propos' },
  { to: '#', label: 'Contact' },
  { to: '/visiteur', label: 'Actualité' },
];

const navLinkClass = 'text-xl font-medium hover:-translate-y-0.5 transition-transform duration-200';

// Navbar + footer de l'espace visiteur. Les pages s'affichent dans <Outlet />.
export default function VisiteurLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* navbar */}
      <header className="flex justify-between items-center bg-[var(--color-principal)] sticky top-0 z-50 shrink-0 pr-4 px-4 py-2">
        <div className="flex items-center gap-5">
          <div className="logo">
            <Link to="/"><img src={logo} alt="Logo IRIS SPACE" className="h-auto w-40 p-0 m-0" /></Link>
          </div>
          <div className="title text-2xl text-white tracking-wide">VISITEUR</div>
        </div>

        {/* navigation desktop */}
        <nav className="hidden md:flex items-center gap-8 text-white">
          <Link to="/visiteur/a-propos" className={navLinkClass}>à propos</Link>
          <a href="#" className={navLinkClass}>Contact</a>
          <Link to="/visiteur" className={navLinkClass}>Actualité</Link>
          <Link to="/" className={navLinkClass}>Se connecter</Link>
        </nav>

        {/* menu burger (mobile) */}
        <div className="md:hidden">
          <BurgerButton open={menuOpen} onToggle={() => setMenuOpen(o => !o)} />
        </div>
      </header>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} links={MENU_LINKS} />

      <Outlet />

      <Footer withMediaschoolLink />
    </div>
  );
}
