import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext.jsx';
import logo from '@/assets/img/Logo_IRIS_SPACE.svg';
import msLogo from '@/assets/img/ms_logo_cmjn_blanc_1.png';
import { BurgerButton, MobileMenu } from '@/components/layout/MobileMenu.jsx';
import MessageBadge from '@/components/layout/MessageBadge.jsx';

const navLinkClass = 'text-base font-medium hover:-translate-y-0.5 transition-transform duration-200';

// Barre du haut, la même partout.
//   links     : liens affichés dans la barre (desktop)
//   menuLinks : liens du menu burger (mobile)
//   mediaschool : couleurs + logo MediaSchool
export default function Navbar({ links, menuLinks, mediaschool = false }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, can } = useAuth();
  const bg = mediaschool ? 'bg-[var(--color-mediaschool)]' : 'bg-[var(--color-principal)]';

  return (
    <>
      <header className={`flex justify-between items-center ${bg} sticky top-0 z-50 shrink-0 px-4 py-2 gap-4`}>
        {/* logo + nom + avatar + accueil */}
        <div className="flex items-center gap-4">
          <Link to="/" className="logo">
            <img src={mediaschool ? msLogo : logo} alt="Logo" className="h-auto w-32 p-0 m-0" />
          </Link>

          <span className="text-white/30 text-xl font-light hidden md:inline">|</span>
          <div className="title text-lg text-white tracking-wide font-medium hidden md:block">{user?.nom ?? 'VISITEUR'}</div>

          {user && (
            <>
              <Link to="/profil" aria-label="Profil" className="w-9 h-9 rounded-full bg-gray-200 shrink-0 hover:opacity-80 transition" />
              <Link to="/accueil" className="text-white hover:-translate-y-0.5 transition-transform duration-200" aria-label="Accueil">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9.5 12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V9.5Z" />
                </svg>
              </Link>
            </>
          )}
        </div>

        {/* navigation desktop */}
        <nav className="hidden md:flex items-center gap-8 text-white">
          {links.map(link => (
            <Link key={link.label} to={link.to} className={navLinkClass}>{link.label}</Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {/* messagerie */}
          {can('messagerie') && (
            <Link
              to="/messages"
              className="relative w-10 h-10 rounded-full flex items-center justify-center hover:-translate-y-0.5 transition-transform duration-200"
              aria-label="Messagerie"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <MessageBadge />
            </Link>
          )}

          {/* menu burger (mobile) */}
          <div className="md:hidden">
            <BurgerButton open={menuOpen} onToggle={() => setMenuOpen(o => !o)} bg={bg} />
          </div>
        </div>
      </header>

      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        links={menuLinks}
        panelBg={mediaschool ? 'bg-[var(--color-mediaschool-secondaire)]' : undefined}
      />
    </>
  );
}
