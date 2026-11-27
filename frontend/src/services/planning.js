import { api, ApiError, USE_MOCKS } from './api.js';
import { decouper, jourISO } from './emploiDuTemps.js';
import { CLASSES, JOURS } from '@/mocks/planning.js';

// Emplois du temps des classes (administration, droit `emploi_du_temps_gerer`) : routes /admin/… de
// backend/ROUTES.md, section « Admin : emploi du temps ». Un cours est un créneau daté, pas une semaine type.
// (L'emploi du temps personnel d'un élève ou d'un prof est dans services/emploiDuTemps.js.)
//
// Un cours renvoyé par ce service a le format de la grille (pages/emploi-du-temps/commun.jsx) :
//   { id, jour: 'AAAA-MM-JJ', start: '09h00', end: '11h00', subject, intervenant, room, classe, annule,
//     commentaire, classeId, matiereId, professeurId, salleId }
// Pour créer ou modifier un cours, on envoie les champs du back :
//   { classe_id, matiere_id, professeur_id, salle_id | null, debut: '2026-11-30T09:00', fin, annule, commentaire }
// Un refus du back (chevauchement : 409, matière hors programme : 400…) lève une ApiError dont le message
// est lisible tel quel (voir messageLisible dans api.js).
// Mode mocks : les mêmes fonctions sur la semaine type de mocks/planning.js, gardée en mémoire.

const nomComplet = (prenom, nom) => [prenom, nom].filter(Boolean).join(' ');

// Cours du back → cours de la grille. debut et fin sont en heure de Paris : on les lit dans le texte.
function versCours(c) {
  const debut = decouper(c.debut);
  const fin = decouper(c.fin);
  return {
    id: c.id,
    jour: debut.jour,
    start: debut.heure,
    end: fin.jour === debut.jour ? fin.heure : '24h00', // cours qui finit un autre jour : on coupe à minuit
    subject: c.matiere,
    intervenant: nomComplet(c.prof_prenom, c.prof_nom),
    room: c.salle ?? '',
    classe: c.classe,
    annule: c.annule,
    commentaire: c.commentaire ?? '',
    classeId: c.classe_id,
    matiereId: c.matiere_id,
    professeurId: c.professeur_id,
    salleId: c.salle_id,
  };
}

// ── Mocks : des cours datés tirés de la semaine type ────────────────────────
let mock = null;

// '2026-11-30' + '09h00' → '2026-11-30 09:00:00+01' (format du back)
const horodatage = (jour, heure) => `${jour} ${heure.replace('h', ':')}:00+01`;
const triAlpha = (a, b) => a.localeCompare(b, 'fr', { numeric: true });

function lireMock() {
  if (mock) return mock;

  const nomsClasses = Object.keys(CLASSES);
  const types = Object.values(CLASSES).flatMap(jours => Object.values(jours).flat());
  const liste = valeurs => [...new Set(valeurs)].sort(triAlpha);
  const classes = nomsClasses.map((nom, i) => ({ id: i + 1, nom }));
  const matieres = liste(types.map(c => c.subject)).map((nom, i) => ({ id: i + 1, nom }));
  const professeurs = liste(types.map(c => c.intervenant)).map((nom, i) => ({ id: `mock-prof-${i + 1}`, nom }));
  const salles = liste(types.map(c => c.room.trim()).filter(Boolean)).map((nom, i) => ({ id: i + 1, nom }));

  // La semaine type est répétée du lundi d'il y a 4 semaines à celui dans 12 semaines
  const lundi = new Date();
  lundi.setHours(0, 0, 0, 0);
  lundi.setDate(lundi.getDate() - ((lundi.getDay() + 6) % 7));

  const cours = [];
  for (let semaine = -4; semaine <= 12; semaine++) {
    classes.forEach(classe => {
      Object.entries(CLASSES[classe.nom]).forEach(([nomJour, duJour]) => {
        const date = new Date(lundi);
        date.setDate(date.getDate() + semaine * 7 + JOURS.indexOf(nomJour));
        duJour.forEach(c => {
          const salle = salles.find(s => s.nom === c.room.trim());
          cours.push({
            id: `mock-${cours.length + 1}`,
            classe_id: classe.id,
            classe: classe.nom,
            matiere_id: matieres.find(m => m.nom === c.subject).id,
            matiere: c.subject,
            professeur_id: professeurs.find(p => p.nom === c.intervenant).id,
            prof_prenom: '',
            prof_nom: c.intervenant,
            salle_id: salle?.id ?? null,
            salle: salle?.nom ?? null,
            debut: horodatage(jourISO(date), c.start),
            fin: horodatage(jourISO(date), c.end),
            annule: false,
            commentaire: null,
          });
        });
      });
    });
  }

  mock = { classes, matieres, professeurs, salles, cours };
  return mock;
}

const refusMock = (message, status) => new ApiError(message, status, { error: message });

// Cours du back (format ci-dessus) construit à partir des champs envoyés ; mêmes refus que le back pour les cas courants
function coursMock(champs, id) {
  const m = lireMock();
  const classe = m.classes.find(c => c.id === Number(champs.classe_id));
  const matiere = m.matieres.find(x => x.id === Number(champs.matiere_id));
  const prof = m.professeurs.find(p => p.id === champs.professeur_id);
  const salle = champs.salle_id ? m.salles.find(s => s.id === Number(champs.salle_id)) : null;
  if (!classe) throw refusMock('Classe introuvable', 400);
  if (!matiere) throw refusMock('Matière introuvable', 400);
  if (!prof) throw refusMock('Professeur introuvable', 400);

  const debut = horodatage(champs.debut.slice(0, 10), champs.debut.slice(11, 16).replace(':', 'h'));
  const fin = horodatage(champs.fin.slice(0, 10), champs.fin.slice(11, 16).replace(':', 'h'));
  if (fin <= debut) throw refusMock("L'heure de fin doit être après l'heure de début", 400);

  const annule = Boolean(champs.annule);
  const autre = annule ? null : m.cours.find(c =>
    c.id !== id && !c.annule && c.classe_id === classe.id && c.debut < fin && c.fin > debut);
  if (autre) {
    const d = decouper(autre.debut);
    const f = decouper(autre.fin);
    throw refusMock(
      `La classe ${classe.nom} a déjà cours le ${d.jour.slice(8)}/${d.jour.slice(5, 7)} de ${d.heure} à ${f.heure} (${autre.matiere}).`,
      409,
    );
  }

  return {
    id: id ?? `mock-${Date.now()}-${m.cours.length}`,
    classe_id: classe.id,
    classe: classe.nom,
    matiere_id: matiere.id,
    matiere: matiere.nom,
    professeur_id: prof.id,
    prof_prenom: '',
    prof_nom: prof.nom,
    salle_id: salle?.id ?? null,
    salle: salle?.nom ?? null,
    debut,
    fin,
    annule,
    commentaire: champs.commentaire?.trim() || null,
  };
}

const dansPeriode = (c, du, au) => c.debut.slice(0, 10) >= jourISO(du) && c.debut.slice(0, 10) <= jourISO(au);
const parDebut = (a, b) => a.debut.localeCompare(b.debut) || a.classe.localeCompare(b.classe);

// ── Menus ───────────────────────────────────────────────────────────────────
// Classes → [{ id, nom }]
export async function getClasses() {
  if (USE_MOCKS) return structuredClone(lireMock().classes);
  return (await api.get('/admin/classes')).classes;
}

// Salles → [{ id, nom }]
export async function getSalles() {
  if (USE_MOCKS) return structuredClone(lireMock().salles);
  return (await api.get('/admin/salles')).salles;
}

// Matières au programme de la classe → [{ id, nom }]
export async function getMatieres(classeId) {
  if (USE_MOCKS) return structuredClone(lireMock().matieres);
  return (await api.get(`/admin/matieres?classe_id=${classeId}`)).matieres;
}

// Professeurs qui enseignent la matière → [{ id, nom: 'Paul Leroy' }]
export async function getProfesseurs(matiereId) {
  if (USE_MOCKS) return structuredClone(lireMock().professeurs);
  const { professeurs } = await api.get(`/admin/professeurs?matiere_id=${matiereId}`);
  return professeurs.map(p => ({ id: p.id, nom: nomComplet(p.prenom, p.nom) }));
}

// Crée une classe (année courante, seul campus) → { id, nom }
export async function creerClasse(nom) {
  if (!USE_MOCKS) return (await api.post('/admin/classes', { nom })).classe;

  const { classes } = lireMock();
  if (classes.some(c => c.nom.toLowerCase() === nom.toLowerCase())) {
    throw refusMock('Une classe porte déjà ce nom pour cette année et ce campus', 409);
  }
  const classe = { id: Math.max(0, ...classes.map(c => c.id)) + 1, nom };
  classes.push(classe);
  return classe;
}

// Crée une salle (seul campus) → { id, nom }
export async function creerSalle(nom) {
  if (!USE_MOCKS) return (await api.post('/admin/salles', { nom })).salle;

  const { salles } = lireMock();
  if (salles.some(s => s.nom.toLowerCase() === nom.toLowerCase())) {
    throw refusMock('Une salle porte déjà ce nom dans ce campus', 409);
  }
  const salle = { id: Math.max(0, ...salles.map(s => s.id)) + 1, nom };
  salles.push(salle);
  return salle;
}

// ── Cours ───────────────────────────────────────────────────────────────────
// Cours d'une classe entre `du` et `au` inclus (objets Date), triés par début
export async function getCours(classeId, du, au) {
  if (USE_MOCKS) {
    return lireMock().cours
      .filter(c => c.classe_id === Number(classeId) && dansPeriode(c, du, au))
      .sort(parDebut)
      .map(versCours);
  }
  const { cours } = await api.get(`/admin/cours?classe_id=${classeId}&du=${jourISO(du)}&au=${jourISO(au)}`);
  return cours.map(versCours);
}

// Cours d'aujourd'hui, toutes classes confondues (bloc « Cours aujourd'hui » du tableau de bord)
export async function getCoursDuJour() {
  const aujourdhui = new Date();
  if (USE_MOCKS) {
    return lireMock().cours.filter(c => dansPeriode(c, aujourdhui, aujourdhui)).sort(parDebut).map(versCours);
  }
  const jour = jourISO(aujourdhui);
  const { cours } = await api.get(`/admin/cours?du=${jour}&au=${jour}`);
  return cours.map(versCours);
}

export async function creerCours(champs) {
  if (!USE_MOCKS) return versCours((await api.post('/admin/cours', champs)).cours);

  const cours = coursMock(champs);
  lireMock().cours.push(cours);
  return versCours(cours);
}

// Remplace tout le cours (la classe ne change pas)
export async function modifierCours(id, champs) {
  if (!USE_MOCKS) return versCours((await api.put(`/admin/cours/${id}`, champs)).cours);

  const { cours } = lireMock();
  const index = cours.findIndex(c => c.id === id);
  if (index === -1) throw refusMock('Cours introuvable', 404);
  if (Number(champs.classe_id) !== cours[index].classe_id) {
    throw refusMock("La classe d'un cours ne se modifie pas : supprimez le cours et créez-le dans l'autre classe", 400);
  }
  cours[index] = coursMock(champs, id);
  return versCours(cours[index]);
}

export async function supprimerCours(id) {
  if (!USE_MOCKS) return api.delete(`/admin/cours/${id}`);

  const m = lireMock();
  m.cours = m.cours.filter(c => c.id !== id);
}
