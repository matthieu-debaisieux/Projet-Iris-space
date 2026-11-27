import { useAuth } from '@/context/AuthContext.jsx';

// Affiche une vue différente d'une même page selon les droits de l'utilisateur.
// Les `vues` sont testées dans l'ordre : la première dont l'utilisateur possède
// le `droit` est affichée, sinon `defaut`. Les props restantes sont transmises.
//   <SelonDroit
//     vues={[{ droit: 'emploi_du_temps_gerer', Vue: Gestion }]}
//     defaut={Consultation}
//   />
export default function SelonDroit({ vues = [], defaut: Defaut = null, ...props }) {
  const { can } = useAuth();
  const Vue = vues.find(v => can(v.droit))?.Vue ?? Defaut;
  return Vue ? <Vue {...props} /> : null;
}
