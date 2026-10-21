import Devoirs from '@/pages/Devoirs.jsx';
import Notes from '@/pages/Notes.jsx';
import Absences from '@/pages/Absences.jsx';
import Actualites from '@/pages/Actualites.jsx';
import EmploiDuTemps from '@/pages/EmploiDuTemps.jsx';
import Documents from '@/pages/Documents.jsx';

// Pages du menu de l'espace connecté. Un lien n'est affiché (et la page
// accessible) que si l'utilisateur possède le `droit` correspondant.
export const NAV_LINKS = [
  { path: 'devoirs',         label: 'Devoirs',         droit: 'devoirs',         Page: Devoirs },
  { path: 'notes',           label: 'Notes',           droit: 'notes',           Page: Notes },
  { path: 'absences',        label: 'Vie scolaire',    droit: 'absences',        Page: Absences },
  { path: 'actualites',      label: 'Actualité',       droit: 'actualites',      Page: Actualites },
  { path: 'emploi-du-temps', label: 'Emploi du temps', droit: 'emploi_du_temps', Page: EmploiDuTemps },
  { path: 'documents',       label: 'Documents',       droit: 'documents',       Page: Documents },
];

// Liens quand personne n'est connecté
export const PUBLIC_LINKS = [
  { to: '/visiteur/a-propos', label: 'À propos' },
  { to: '#', label: 'Contact' },
  { to: '/visiteur', label: 'Actualité' },
  { to: '/', label: 'Se connecter' },
];

// Liens du mini-site MediaSchool
export const MEDIASCHOOL_LINKS = [{ to: '/mediaschool', label: 'Accueil' }];
