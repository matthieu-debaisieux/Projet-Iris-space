import { Navigate, Route, Routes } from 'react-router-dom';

import Login from './pages/Login.jsx';

import Dashboard from './pages/admin/Dashboard.jsx';
import Absences from './pages/admin/Absences.jsx';
import EmploiDuTemps from './pages/admin/EmploiDuTemps.jsx';
import AdminMessages from './pages/admin/Messages.jsx';
import Documents from './pages/admin/Documents.jsx';
import Actualites from './pages/admin/Actualites.jsx';

import ProfPage from './pages/prof/ProfPage.jsx';
import ProfMessages from './pages/prof/Messages.jsx';
import WorkInProgress from './pages/prof/WorkInProgress.jsx';

import EleveAccueil from './pages/eleve/Accueil.jsx';
import EleveActualite from './pages/eleve/Actualite.jsx';
import EleveNotes from './pages/eleve/Notes.jsx';
import EleveProfil from './pages/eleve/Profil.jsx';
import ElevePage from './pages/eleve/ElevePage.jsx';

import VisiteurAccueil from './pages/visiteur/Accueil.jsx';
import APropos from './pages/visiteur/APropos.jsx';

import MediaschoolAccueil from './pages/mediaschool/Accueil.jsx';
import Plages from './pages/mediaschool/Plages.jsx';
import Events from './pages/mediaschool/Events.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />

      {/* Administration */}
      <Route path="/admin" element={<Dashboard />} />
      <Route path="/admin/absences" element={<Absences />} />
      <Route path="/admin/emploi-du-temps" element={<EmploiDuTemps />} />
      <Route path="/admin/messages" element={<AdminMessages />} />
      <Route path="/admin/documents" element={<Documents />} />
      <Route path="/admin/actualites" element={<Actualites />} />

      {/* Professeur */}
      <Route path="/prof" element={<ProfPage title="Bienvenue" />} />
      <Route path="/prof/devoirs" element={<ProfPage title="Devoirs" />} />
      <Route path="/prof/notes" element={<ProfPage title="Notes" />} />
      <Route path="/prof/actualite" element={<ProfPage title="Actualité" />} />
      <Route path="/prof/emploi-du-temps" element={<ProfPage title="Emploi du temps" />} />
      <Route path="/prof/arborescence" element={<ProfPage title="Arborescence" />} />
      <Route path="/prof/profil" element={<ProfPage title="Profil" />} />
      <Route path="/prof/messages" element={<ProfMessages />} />
      <Route path="/prof/en-construction" element={<WorkInProgress />} />

      {/* Élève */}
      <Route path="/eleve" element={<EleveAccueil />} />
      <Route path="/eleve/actualite" element={<EleveActualite />} />
      <Route path="/eleve/notes" element={<EleveNotes />} />
      <Route path="/eleve/profil" element={<EleveProfil />} />
      <Route path="/eleve/devoirs" element={<ElevePage title="Devoirs" />} />
      <Route path="/eleve/absences" element={<ElevePage title="Vie scolaire" />} />
      <Route path="/eleve/cours" element={<ElevePage title="Emploi du temps" />} />
      <Route path="/eleve/documents" element={<ElevePage title="Documents" />} />
      <Route path="/eleve/messages" element={<ElevePage title="Messages" />} />

      {/* Visiteur */}
      <Route path="/visiteur" element={<VisiteurAccueil />} />
      <Route path="/visiteur/a-propos" element={<APropos />} />

      {/* MediaSchool */}
      <Route path="/mediaschool" element={<MediaschoolAccueil />} />
      <Route path="/mediaschool/plages" element={<Plages />} />
      <Route path="/mediaschool/events" element={<Events />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
