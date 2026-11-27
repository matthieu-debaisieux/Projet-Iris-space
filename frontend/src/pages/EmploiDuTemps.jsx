import SelonDroit from '@/components/auth/SelonDroit.jsx';
import Consultation from '@/pages/emploi-du-temps/Consultation.jsx';
import Gestion from '@/pages/emploi-du-temps/Gestion.jsx';

// Une seule URL, deux vues selon les droits :
//   - `emploi_du_temps_gerer` (admin) → Gestion : classes, salles, cours modifiables
//   - sinon (élève, prof…)            → Consultation : emploi du temps personnel (lecture seule)
export default function EmploiDuTemps() {
  return (
    <SelonDroit
      vues={[{ droit: 'emploi_du_temps_gerer', Vue: Gestion }]}
      defaut={Consultation}
    />
  );
}
