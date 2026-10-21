import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import RequireDroit from '@/routes/RequireDroit.jsx';
import { NAV_LINKS } from '@/routes/navigation.js';
import Layout from '@/Layout.jsx';

import Login from '@/pages/Login.jsx';
import Accueil from '@/pages/Accueil.jsx';
import Actualites from '@/pages/Actualites.jsx';
import Messages from '@/pages/Messages.jsx';
import Profil from '@/pages/Profil.jsx';
import APropos from '@/pages/APropos.jsx';

import MediaschoolAccueil from '@/pages/mediaschool/Accueil.jsx';
import Plages from '@/pages/mediaschool/Plages.jsx';
import Events from '@/pages/mediaschool/Events.jsx';

// Une page = une URL pour tout le monde. Ce qui s'affiche dedans
// dépend des droits de l'utilisateur (`useAuth().can('droit')`).
export default function App() {
  return (
    <Routes>
      {/* Connexion : page seule, sans navbar ni footer */}
      <Route path="/" element={<Login />} />

      <Route element={<Layout />}>
        {/* Public */}
        <Route path="/visiteur" element={<Actualites />} />
        <Route path="/visiteur/a-propos" element={<APropos />} />

        {/* Connecté */}
        <Route element={<RequireDroit><Outlet /></RequireDroit>}>
          <Route path="/accueil" element={<Accueil />} />
          {NAV_LINKS.map(({ path, droit, Page }) => (
            <Route key={path} path={`/${path}`} element={<RequireDroit droit={droit}><Page /></RequireDroit>} />
          ))}
          <Route path="/messages" element={<RequireDroit droit="messagerie"><Messages /></RequireDroit>} />
          <Route path="/profil" element={<Profil />} />
        </Route>
      </Route>

      {/* Mini-site MediaSchool (public) */}
      <Route path="/mediaschool" element={<Layout mediaschool />}>
        <Route index element={<MediaschoolAccueil />} />
        <Route path="plages" element={<Plages />} />
        <Route path="events" element={<Events />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
