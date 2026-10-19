import { useState } from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/img/Logo_IRIS_SPACE.svg';
import { BurgerButton, MobileMenu } from '../components/MobileMenu.jsx';
import MessageBadge from '../components/MessageBadge.jsx';
import Footer from '../components/Footer.jsx';

const NAV_LINKS = [
  { to: '/eleve/devoirs', label: 'Devoir' },
  { to: '/eleve/notes', label: 'Notes' },
  { to: '/eleve/absences', label: 'Vie scolaire' },
  { to: '/eleve/actualite', label: 'Actualité' },
  { to: '/eleve/cours', label: 'Emploi du temps' },
];

const MENU_LINKS = [...NAV_LINKS, { to: '/eleve/documents', label: 'Documents' }];

const navLinkClass = 'text-base font-medium hover:-translate-y-0.5 transition-transform duration-200';

// Navbar + footer de l'espace élève. `children` = contenu entre les deux.
// `simpleFooter` : footer sans le bouton "Page de MédiaSchool" (page Profil).
export default function EleveLayout({ children, simpleFooter = false }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* navbar */}
      <header className="flex justify-between items-center bg-[var(--color-principal)] sticky top-0 z-50 shrink-0 px-4 py-2">
        <div className="flex items-center gap-4">
          <div className="logo">
            <Link to="/"><img src={logo} alt="Logo IRIS SPACE" className="h-auto w-32 p-0 m-0" /></Link>
          </div>

          <span className="text-white/30 text-xl font-light hidden md:inline">|</span>

          <div className="title text-lg text-white tracking-wide font-medium hidden md:block">NOM PRENOM</div>

          {/* avatar */}
          <Link
            to="/eleve/profil"
            aria-label="Profil"
            className="w-9 h-9 rounded-full bg-gray-200 shrink-0 hover:opacity-80 transition"
          />

          {/* accueil */}
          <Link to="/eleve" className="text-white hover:-translate-y-0.5 transition-transform duration-200" aria-label="Accueil">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9.5 12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V9.5Z" />
            </svg>
          </Link>
        </div>

        {/* navigation desktop */}
        <nav className="hidden md:flex items-center gap-8 text-white">
          {NAV_LINKS.map(link => (
            <Link key={link.to} to={link.to} className={navLinkClass}>{link.label}</Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {/* messagerie */}
          <Link
            to="/eleve/messages"
            className="relative w-10 h-10 rounded-full flex items-center justify-center hover:-translate-y-0.5 transition-transform duration-200"
            aria-label="Messagerie"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <MessageBadge />
          </Link>

          {/* menu burger (mobile) */}
          <div className="md:hidden">
            <BurgerButton open={menuOpen} onToggle={() => setMenuOpen(o => !o)} />
          </div>
        </div>
      </header>

      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        links={MENU_LINKS}
        navClassName="flex flex-col gap-5 text-white text-lg"
        linkClassName={navLinkClass}
      />

      {children}

      <Footer withMediaschoolLink={!simpleFooter} />
    </div>
  );
}
