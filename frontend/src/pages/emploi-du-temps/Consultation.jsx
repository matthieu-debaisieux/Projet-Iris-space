import { useState } from 'react';
import DataState from '@/components/ui/DataState.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { useAsync } from '@/hooks/useAsync.js';
import { getEmploiDuTemps } from '@/services/emploiDuTemps.js';
import { addDays, card, coursParJour, DetailCours, getMonday, NavigationSemaine, Stat, statsSemaine, TimetableGrid } from './commun.jsx';

// Vue « lecture seule » (élève, prof…) : emploi du temps personnel de la semaine,
// demandé d'un coup (lundi → vendredi) via services/emploiDuTemps.js.
export default function Consultation() {
  const { user } = useAuth();
  const [monday, setMonday] = useState(() => getMonday(new Date()));
  const [detail, setDetail] = useState(null); // { day, index }
  const emploi = useAsync(() => getEmploiDuTemps(user, monday, addDays(monday, 4)), [user, monday]);

  return (
    <div className="flex-1 overflow-y-auto bg-[var(--color-page)]">
      <div className="mx-auto w-full max-w-[1200px] px-6 py-8">
        <DataState state={emploi}>{cours => {
          const classData = coursParJour(cours);
          const stats = statsSemaine(classData);
          const coursDetail = detail && classData[detail.day]?.[detail.index];

          return (
            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-[#001257]">Mon emploi du temps</h1>
                  <p className="mt-1 text-sm text-[#6B7185]">
                    {user?.classe
                      ? <>Classe <span className="font-semibold text-[#001257]">{user.classe}</span></>
                      : 'Votre planning de la semaine.'}
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
                  <NavigationSemaine monday={monday} setMonday={m => { setDetail(null); setMonday(m); }} />
                </div>

                <TimetableGrid classData={classData} monday={monday} onCourseClick={(day, index) => setDetail({ day, index })} />

                {!stats.cours && <p className="text-center text-sm text-[#6B7185]">Aucun cours prévu cette semaine.</p>}
              </section>

              {coursDetail && (
                <DetailCours
                  cours={coursDetail}
                  jour={detail.day}
                  classe={user?.classe ?? coursDetail.intervenant}
                  onClose={() => setDetail(null)}
                />
              )}
            </div>
          );
        }}</DataState>
      </div>
    </div>
  );
}
