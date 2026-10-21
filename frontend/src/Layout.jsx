import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext.jsx';
import Navbar from '@/components/layout/Navbar.jsx';
import Footer from '@/components/layout/Footer.jsx';
import { WithDevPanel } from '@/components/layout/DevPanel.jsx';
import { MEDIASCHOOL_LINKS, NAV_LINKS, PUBLIC_LINKS } from '@/routes/navigation.js';

const sideLinkClass = 'text-white text-xl font-medium hover:translate-x-2 transition-transform duration-200';

// Cadre de toutes les pages : navbar + (menu latéral) + page + footer.
// Les liens dépendent de l'utilisateur connecté et de ses droits.
export default function Layout({ mediaschool = false }) {
  const { user, can } = useAuth();

  let links;
  let menuLinks;
  if (mediaschool) {
    links = menuLinks = MEDIASCHOOL_LINKS;
  } else if (!user) {
    links = menuLinks = PUBLIC_LINKS;
  } else {
    links = NAV_LINKS
      .filter(link => can(link.droit))
      .map(link => ({ to: `/${link.path}`, label: link.label }));
    menuLinks = [
      { to: '/accueil', label: 'Accueil' },
      ...links,
      ...(can('messagerie') ? [{ to: '/messages', label: 'Messages' }] : []),
      { to: '/profil', label: 'Profil' },
    ];
  }

  // Droit `menu_lateral` : les liens passent de la navbar à une barre sur le côté
  const lateral = can('menu_lateral') && !mediaschool;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Navbar links={lateral ? [] : links} menuLinks={menuLinks} mediaschool={mediaschool} />

      <div className="flex flex-1 overflow-hidden">
        {lateral && (
          <div className="hidden md:flex flex-col w-64 bg-[var(--color-principal)] overflow-y-auto p-6 shrink-0">
            <nav className="flex flex-col gap-5 flex-1">
              {menuLinks.map(link => (
                <Link key={link.to} to={link.to} className={sideLinkClass}>{link.label}</Link>
              ))}
            </nav>
          </div>
        )}

        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {can('outils_dev') ? <WithDevPanel><Outlet /></WithDevPanel> : <Outlet />}
        </div>
      </div>

      <Footer withMediaschoolLink={!user || mediaschool} />
    </div>
  );
}
