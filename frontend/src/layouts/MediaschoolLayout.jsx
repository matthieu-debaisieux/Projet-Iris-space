import { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import msLogo from '@/assets/img/ms_logo_cmjn_blanc_1.png';
import { BurgerButton, MobileMenu } from '@/components/layout/MobileMenu.jsx';
import Footer from '@/components/layout/Footer.jsx';

const MENU_LINKS = [{ to: '/mediaschool', label: 'Accueil' }];

// Navbar + footer des pages "Bons plans" MediaSchool.
export default function MediaschoolLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* navbar */}
      <header className="flex justify-between items-center bg-[var(--color-mediaschool)] sticky top-0 z-50 shrink-0 pr-4 px-4 py-2">
        <div className="flex items-center gap-5">
          <div className="logo">
            <Link to="/"><img src={msLogo} alt="Logo MediaSchool" className="h-auto w-40 p-0 m-0" /></Link>
          </div>
        </div>
        <div className="title text-2xl text-white tracking-wide">
          <p>Nom Prenom</p>
        </div>

        {/* navigation desktop */}
        <nav className="hidden md:flex items-center gap-8 text-white">
          <Link to="/mediaschool" aria-label="Accueil" className="hover:scale-110 transition-transform duration-200">
            <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3 2 12h3v8h6v-5h2v5h6v-8h3L12 3z" />
            </svg>
          </Link>
        </nav>

        {/* menu burger (mobile) */}
        <div className="md:hidden">
          <BurgerButton open={menuOpen} onToggle={() => setMenuOpen(o => !o)} bg="bg-[var(--color-mediaschool)]" />
        </div>
      </header>

      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        links={MENU_LINKS}
        panelBg="bg-[var(--color-mediaschool-secondaire)]"
      />

      <main className="flex-1 overflow-y-auto p-6 md:p-10 bg-[var(--color-page)]">
        <Outlet />
      </main>

      <Footer withMediaschoolLink />
    </div>
  );
}
