import { useState } from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/img/Logo_IRIS_SPACE.svg';
import messagesIcon from '../assets/img/messages.svg';
import { BurgerButton, MobileMenu } from '../components/MobileMenu.jsx';
import MessageBadge from '../components/MessageBadge.jsx';
import Footer from '../components/Footer.jsx';

const NAV_LINKS = [
  { to: '/prof/devoirs', label: 'Devoir' },
  { to: '/prof/notes', label: 'Notes' },
  { to: '/prof/actualite', label: 'Actualité' },
  { to: '/prof/emploi-du-temps', label: 'Emploi du temps' },
];

const MENU_LINKS = [
  { to: '/prof', label: 'Accueil' },
  { to: '/prof/devoirs', label: 'Devoirs' },
  { to: '/prof/notes', label: 'Notes' },
  { to: '/prof/emploi-du-temps', label: 'Emploi du temps' },
  { to: '/prof/messages', label: 'Messages' },
  { to: '/prof/actualite', label: 'Actualité' },
  { to: '/prof/profil', label: 'Profil' },
];

// Navbar + footer de l'espace professeur. `children` = contenu entre les deux.
export default function ProfLayout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* navbar */}
      <header className="flex justify-between items-center bg-[var(--color-principal)] sticky top-0 z-50 shrink-0 px-4 gap-4">
        {/* partie gauche : logo + nom + avatar + accueil */}
        <div className="flex items-center gap-4">
          <div className="logo">
            <Link to="/"><img src={logo} alt="Logo" className="h-auto w-40 p-0 m-0" /></Link>
          </div>
          <span className="text-white text-lg font-medium hidden sm:inline">NOM PRENOM</span>
          <Link to="/prof/profil" className="shrink-0" aria-label="Profil">
            <div className="w-10 h-10 rounded-full bg-gray-300 hover:opacity-80 transition" />
          </Link>
          <Link to="/prof" className="shrink-0" aria-label="Accueil">
            <svg className="w-7 h-7 fill-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path d="M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3l9-8z" />
            </svg>
          </Link>
        </div>

        {/* liens de navigation (desktop) */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map(link => (
            <Link key={link.to} to={link.to} className="text-white text-lg font-medium hover:-translate-y-0.5 transition-transform duration-200">
              {link.label}
            </Link>
          ))}
        </div>

        {/* partie droite : messages + burger */}
        <div className="flex items-center">
          <div className="relative pr-2">
            <Link to="/prof/messages">
              <img src={messagesIcon} alt="Messages" className="h-auto w-15 p-0 m-0" />
            </Link>
            <MessageBadge className="right-0" />
          </div>
          <div className="md:hidden pl-2">
            <BurgerButton open={menuOpen} onToggle={() => setMenuOpen(o => !o)} />
          </div>
        </div>
      </header>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} links={MENU_LINKS} />

      {children}

      <Footer />
    </div>
  );
}
