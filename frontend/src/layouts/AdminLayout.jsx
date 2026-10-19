import { useState } from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/img/Logo_IRIS_SPACE.svg';
import messagesIcon from '../assets/img/messages.svg';
import { BurgerButton, MobileMenu } from '../components/MobileMenu.jsx';
import MessageBadge from '../components/MessageBadge.jsx';
import Footer from '../components/Footer.jsx';
import DevPanel from '../components/DevPanel.jsx';

const ADMIN_LINKS = [
  { to: '/admin', label: 'DashBoard' },
  { to: '/admin/absences', label: 'Absences' },
  { to: '/admin/emploi-du-temps', label: 'Emplois du temps' },
  { to: '/admin/messages', label: 'Messages' },
  { to: '/admin/documents', label: 'Documents' },
  { to: '/admin/actualites', label: 'Actualité' },
];

const linkClass = 'text-white text-xl font-medium hover:translate-x-2 transition-transform duration-200';

// Navbar + sidebar + footer + panel DEV de l'espace administration.
// La page fournit son propre conteneur principal en `children`.
export default function AdminLayout({ children, devTools, onResetData }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* navbar */}
      <header className="flex justify-between items-center bg-[var(--color-principal)] sticky top-0 z-50 shrink-0 px-4 py-2">
        <div className="flex items-center gap-5">
          <div className="logo">
            <Link to="/"><img src={logo} alt="Logo" className="h-auto w-40 p-0 m-0" /></Link>
          </div>
          <div className="title text-2xl text-white">Admin</div>
        </div>
        <div className="flex items-center">
          {/* icône messages avec badge notification */}
          <div className="relative hidden md:block pr-4">
            <Link to="/admin/messages">
              <img src={messagesIcon} alt="Messages" className="h-auto w-15 p-0 m-0" />
            </Link>
            <MessageBadge />
          </div>

          {/* menu burger */}
          <div className="md:hidden pr-4">
            <BurgerButton open={menuOpen} onToggle={() => setMenuOpen(o => !o)} />
          </div>
        </div>
      </header>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} links={ADMIN_LINKS} />

      {/* layout principal */}
      <div className="flex flex-1 overflow-hidden">
        {/* sidebar */}
        <div className="hidden md:flex flex-col w-64 bg-[var(--color-principal)] overflow-y-auto p-6 shrink-0">
          <nav className="flex flex-col gap-5 flex-1">
            {ADMIN_LINKS.map(link => (
              <Link key={link.to} to={link.to} className={linkClass}>{link.label}</Link>
            ))}
          </nav>
        </div>

        {children}
      </div>

      <Footer />

      <DevPanel onResetData={onResetData}>{devTools}</DevPanel>
    </div>
  );
}
