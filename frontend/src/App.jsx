import { Navigate, Route, Routes } from 'react-router-dom';
import RequireRole from '@/routes/RequireRole.jsx';

import AdminLayout from '@/layouts/AdminLayout.jsx';
import ProfLayout from '@/layouts/ProfLayout.jsx';
import EleveLayout from '@/layouts/EleveLayout.jsx';
import VisiteurLayout from '@/layouts/VisiteurLayout.jsx';
import MediaschoolLayout from '@/layouts/MediaschoolLayout.jsx';

import Login from '@/pages/Login.jsx';

import Dashboard from '@/pages/admin/Dashboard.jsx';
import Absences from '@/pages/admin/Absences.jsx';
import EmploiDuTemps from '@/pages/admin/EmploiDuTemps.jsx';
import AdminMessages from '@/pages/admin/Messages.jsx';
import Documents from '@/pages/admin/Documents.jsx';
import Actualites from '@/pages/admin/Actualites.jsx';

import ProfPage from '@/pages/prof/ProfPage.jsx';
import ProfMessages from '@/pages/prof/Messages.jsx';
import WorkInProgress from '@/pages/prof/WorkInProgress.jsx';

import EleveAccueil from '@/pages/eleve/Accueil.jsx';
import EleveActualite from '@/pages/eleve/Actualite.jsx';
import EleveNotes from '@/pages/eleve/Notes.jsx';
import EleveProfil from '@/pages/eleve/Profil.jsx';
import ElevePage from '@/pages/eleve/ElevePage.jsx';

import VisiteurAccueil from '@/pages/visiteur/Accueil.jsx';
import APropos from '@/pages/visiteur/APropos.jsx';

import MediaschoolAccueil from '@/pages/mediaschool/Accueil.jsx';
import Plages from '@/pages/mediaschool/Plages.jsx';
import Events from '@/pages/mediaschool/Events.jsx';

// Chaque espace = un layout (navbar + footer) monté une seule fois,
// les pages s'affichent dans son <Outlet />.
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />

      {/* Administration */}
      <Route path="/admin" element={<RequireRole role="admin"><AdminLayout /></RequireRole>}>
        <Route index element={<Dashboard />} />
        <Route path="absences" element={<Absences />} />
        <Route path="emploi-du-temps" element={<EmploiDuTemps />} />
        <Route path="messages" element={<AdminMessages />} />
        <Route path="documents" element={<Documents />} />
        <Route path="actualites" element={<Actualites />} />
      </Route>

      {/* Professeur */}
      <Route path="/prof" element={<RequireRole role="prof"><ProfLayout /></RequireRole>}>
        <Route index element={<ProfPage title="Bienvenue" />} />
        <Route path="devoirs" element={<ProfPage title="Devoirs" />} />
        <Route path="notes" element={<ProfPage title="Notes" />} />
        <Route path="actualite" element={<ProfPage title="Actualité" />} />
        <Route path="emploi-du-temps" element={<ProfPage title="Emploi du temps" />} />
        <Route path="arborescence" element={<ProfPage title="Arborescence" />} />
        <Route path="profil" element={<ProfPage title="Profil" />} />
        <Route path="messages" element={<ProfMessages />} />
      </Route>
      <Route path="/prof/en-construction" element={<RequireRole role="prof"><WorkInProgress /></RequireRole>} />

      {/* Élève */}
      <Route path="/eleve" element={<RequireRole role="eleve"><EleveLayout /></RequireRole>}>
        <Route index element={<EleveAccueil />} />
        <Route path="actualite" element={<EleveActualite />} />
        <Route path="notes" element={<EleveNotes />} />
        <Route path="profil" element={<EleveProfil />} />
        <Route path="devoirs" element={<ElevePage title="Devoirs" />} />
        <Route path="absences" element={<ElevePage title="Vie scolaire" />} />
        <Route path="cours" element={<ElevePage title="Emploi du temps" />} />
        <Route path="documents" element={<ElevePage title="Documents" />} />
        <Route path="messages" element={<ElevePage title="Messages" />} />
      </Route>

      {/* Visiteur (public) */}
      <Route path="/visiteur" element={<VisiteurLayout />}>
        <Route index element={<VisiteurAccueil />} />
        <Route path="a-propos" element={<APropos />} />
      </Route>

      {/* MediaSchool (public) */}
      <Route path="/mediaschool" element={<MediaschoolLayout />}>
        <Route index element={<MediaschoolAccueil />} />
        <Route path="plages" element={<Plages />} />
        <Route path="events" element={<Events />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
