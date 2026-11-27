import { api, USE_MOCKS } from './api.js';
import { EMPLOI_DU_JOUR } from '@/mocks/eleve.js';
import { estProf } from './utilisateur.js';

// Emploi du temps personnel de l'utilisateur connecté (élève ou professeur)

// Date locale → 'AAAA-MM-JJ' (toISOString() décalerait d'un jour autour de minuit)
const jourISO = d => [
  d.getFullYear(),
  String(d.getMonth() + 1).padStart(2, '0'),
  String(d.getDate()).padStart(2, '0'),
].join('-');

// Le back renvoie l'heure de Paris : '2026-10-21 09:30:00+02' → { jour: '2026-10-21', heure: '09h30' }
// (lue dans le texte, sans passer par Date, pour ne pas dépendre du fuseau du navigateur)
function decouper(horodatage) {
  const [, jour, h, min] = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})/.exec(horodatage);
  return { jour, heure: `${h}h${min}` };
}

// Cours du back → cours utilisé par les pages : { id, jour, start, end, subject, intervenant, room, annule }
//   élève : prof_nom, prof_prenom, matiere, salle    prof : classe, matiere, salle
function versCours(c, prof) {
  const debut = decouper(c.debut);
  const fin = decouper(c.fin);
  return {
    id: c.id,
    jour: debut.jour,
    start: debut.heure,
    end: fin.jour === debut.jour ? fin.heure : '24h00', // cours qui finit un autre jour : on coupe à minuit
    subject: c.matiere,
    intervenant: prof ? c.classe : `${c.prof_prenom} ${c.prof_nom}`, // le prof voit la classe, l'élève son intervenant
    room: c.salle ?? '',
    annule: c.annule,
  };
}

// Mocks : même journée type (EMPLOI_DU_JOUR) tous les jours de la plage, au format du back
function coursMock(du, au) {
  const cours = [];
  for (const d = new Date(du); jourISO(d) <= jourISO(au); d.setDate(d.getDate() + 1)) {
    const jour = jourISO(d);
    EMPLOI_DU_JOUR.filter(c => c.matiere).forEach(({ heure, matiere, salle }) => {
      const h = Number(heure.slice(0, 2));
      cours.push({
        id: `${jour}-${heure}`,
        debut: `${jour} ${String(h).padStart(2, '0')}:00:00+02`,
        fin: `${jour} ${String(h + 1).padStart(2, '0')}:00:00+02`,
        annule: false,
        matiere,
        salle,
        classe: 'Iris 1',
        prof_prenom: 'Prénom',
        prof_nom: 'NOM',
      });
    });
  }
  return cours;
}

// Cours de l'utilisateur entre les dates `du` et `au` incluses (objets Date), triés par début.
// Route selon le rôle : /prof/… pour un professeur, /eleve/… sinon (le back répond 403 aux autres rôles).
// → [{ id, jour: 'AAAA-MM-JJ', start: '09h00', end: '10h30', subject, intervenant, room, annule }]
export async function getEmploiDuTemps(user, du, au) {
  const prof = estProf(user);
  const { cours } = USE_MOCKS
    ? { cours: coursMock(du, au) }
    : await api.get(`/${prof ? 'prof' : 'eleve'}/emploi-du-temps?du=${jourISO(du)}&au=${jourISO(au)}`);
  return cours.map(c => versCours(c, prof));
}
