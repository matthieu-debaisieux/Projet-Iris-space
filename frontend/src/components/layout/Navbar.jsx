import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext.jsx';
import { useProfilPhoto } from '@/hooks/useProfilPhoto.js';
import { nomComplet } from '@/services/utilisateur.js';
import logo from '@/assets/img/Logo_IRIS_SPACE.svg';
import msLogo from '@/assets/img/ms_logo_cmjn_blanc_1.png';
import { BurgerButton, MobileMenu } from '@/components/layout/MobileMenu.jsx';
import MessageBadge from '@/components/layout/MessageBadge.jsx';
import NotificationBell from '@/components/layout/NotificationBell.jsx';

const navLinkBase = 'text-base font-medium hover:-translate-y-0.5 transition-transform duration-200';
// Page courante : lien en jaune pour se repérer
const navLinkClass = ({ isActive }) =>
  `${navLinkBase} ${isActive ? 'text-[#F8B005] font-semibold' : 'text-white'}`;

// "John Doe" → "JD"
const initiales = nom => (nom ?? '').split(' ').filter(Boolean).slice(0, 2).map(m => m[0]).join('').toUpperCase();

// Barre du haut, la même partout.
//   links     : liens affichés dans la barre (desktop)
//   menuLinks : liens du menu burger (mobile)
//   mediaschool : couleurs + logo MediaSchool
export default function Navbar({ links, menuLinks, mediaschool = false }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, can } = useAuth();
  const { photo } = useProfilPhoto();
  const bg = mediaschool ? 'bg-[var(--color-mediaschool)]' : 'bg-[var(--color-principal)]';

  return (
    <>
      <header className={`flex justify-between items-center ${bg} sticky top-0 z-50 shrink-0 px-4 py-2 gap-4`}>
        {/* logo (retour à l'accueil) + nom + photo de profil */}
        <div className="flex items-center gap-4">
          <Link
            to={user ? '/accueil' : '/'}
            className="logo hover:opacity-80 transition"
            aria-label="Retour à l'accueil"
          >
            <img src={mediaschool ? msLogo : logo} alt="Iris Space" className="h-auto w-32 p-0 m-0" />
          </Link>

          <span className="text-white/30 text-xl font-light hidden md:inline">|</span>
          <div className="title text-lg text-white tracking-wide font-medium hidden md:block">{nomComplet(user) || 'VISITEUR'}</div>

          {user && (
            <NavLink
              to="/profil"
              aria-label="Mon profil"
              className={({ isActive }) =>
                `w-9 h-9 rounded-full shrink-0 overflow-hidden flex items-center justify-center bg-[#F8B005] text-[#001257] text-xs font-bold hover:opacity-80 transition ring-2 ${isActive ? 'ring-[#F8B005]' : 'ring-white/30'}`
              }
            >
              {photo
                ? <img src={photo} alt="" className="h-full w-full object-cover" />
                : initiales(nomComplet(user)) || '?'}
            </NavLink>
          )}
        </div>

        {/* navigation desktop */}
        <nav className="hidden md:flex items-center gap-8">
          {links.map(link => (
            <NavLink key={link.label} to={link.to} className={navLinkClass}>{link.label}</NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {/* notifications */}
          {can('notifications') && <NotificationBell />}

          {/* messagerie */}
          {can('messagerie') && (
            <NavLink
              to="/messages"
              aria-label="Messagerie"
              className={({ isActive }) =>
                `relative w-10 h-10 rounded-full flex items-center justify-center hover:-translate-y-0.5 transition-transform duration-200 ${isActive ? 'text-[#F8B005]' : 'text-white'}`
              }
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <MessageBadge />
            </NavLink>
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