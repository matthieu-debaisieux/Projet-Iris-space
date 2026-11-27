import { useState } from 'react';
import DataState from '@/components/ui/DataState.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { useAsync } from '@/hooks/useAsync.js';
import { getPlanning } from '@/services/planning.js';
import { card, Chip, DetailCours, getMonday, NavigationSemaine, Stat, statsSemaine, TimetableGrid } from './commun.jsx';

// Vue « lecture seule » (élève, prof…) : on consulte le planning, sans rien modifier.
// Si l'utilisateur a une `classe` (élève), seule celle-ci est affichée ;
// sinon il peut choisir parmi toutes les classes.
export default function Consultation() {
  const planning = useAsync(getPlanning);

  return (
    <div className="flex-1 overflow-y-auto bg-[var(--color-page)]">
      <div className="mx-auto w-full max-w-[1200px] px-6 py-8">
        <DataState state={planning}>{data => <Contenu classes={data.classes} />}</DataState>
      </div>
    </div>
  );
}

function Contenu({ classes }) {
  const { user } = useAuth();
  const noms = Object.keys(classes);
  const classeFixe = user?.classe && classes[user.classe] ? user.classe : null;
  const [choix, setChoix] = useState(noms[0] ?? '');
  const classe = classeFixe ?? choix;
  const classData = classes[classe] ?? {};
  const stats = statsSemaine(classData);

  const [monday, setMonday] = useState(() => getMonday(new Date()));
  const [detail, setDetail] = useState(null); // { day, index }
  const coursDetail = detail && classData[detail.day]?.[detail.index];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#001257]">{classeFixe ? 'Mon emploi du temps' : 'Emplois du temps'}</h1>
          <p className="mt-1 text-sm text-[#6B7185]">
            {classe ? <>Classe <span className="font-semibold text-[#001257]">{classe}</span></> : 'Aucune classe disponible.'}
          </p>
        </div>
        <div className="flex gap-3">
          <Stat nom="Cours" valeur={stats.cours} />
          <Stat nom="Heures" valeur={stats.heures} />
          <Stat nom="Matières" valeur={stats.matieres} />
        </div>
      </div>

      <section className={`${card} p-6 flex flex-col gap-5`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <NavigationSemaine monday={monday} setMonday={setMonday} />
          {!classeFixe && noms.length > 1 && (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Choisir une classe">
              {noms.map(n => <Chip key={n} active={n === classe} onClick={() => setChoix(n)}>{n}</Chip>)}
            </div>
          )}
        </div>

        <TimetableGrid classData={classData} monday={monday} onCourseClick={(day, index) => setDetail({ day, index })} />

        {!stats.cours && <p className="text-center text-sm text-[#6B7185]">Aucun cours prévu pour cette classe.</p>}
      </section>

      {coursDetail && (
        <DetailCours cours={coursDetail} jour={detail.day} classe={classe} onClose={() => setDetail(null)} />
      )}
    </div>
  );
}
