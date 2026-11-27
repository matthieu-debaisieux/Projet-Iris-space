import { api, USE_MOCKS } from './api.js';
import { lireDate } from './devoirs.js';
import { RACCOURCIS, RACCOURCIS_PROF } from '@/mocks/eleve.js';

// ── Blocs de la colonne de droite de l'accueil (tâche ACC-01) ───────────────
// Le back n'a pas de route « raccourcis » : chaque bloc se construit à partir d'une route existante
// (backend/ROUTES.md) et se charge seul. Si une route échoue, les autres blocs restent affichés.
//
//   élève (/eleve/…)   « Travail à faire »        GET /eleve/devoirs?statut=a_faire
//                      « Dernières ressources »   GET /eleve/ressources?limit=3
//                      « Vie Scolaire »           GET /eleve/absences (le résumé)
//                      « Dernières notes »        GET /eleve/notes?limit=3
//   prof   (/prof/…)   « Mes prochains devoirs »  GET /prof/devoirs
//                      « Mes évaluations »        GET /prof/evaluations
//
// Un bloc : { titre, lignes: [{ label?, texte, badge?: { ton: 'ok' | 'attente' | 'alerte', texte } }] }
// Mode mocks : les blocs de mocks/eleve.js (RACCOURCIS pour l'élève, RACCOURCIS_PROF pour le prof).

const NB_LIGNES = 3;

const nombre = n => Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 2 });
const pluriel = (n, singulier, plur = `${singulier}s`) => `${n} ${n > 1 ? plur : singulier}`;
const jourCourt = date => date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }); // '10/12'

const mock = (titre, source = RACCOURCIS) => async () => structuredClone(source.find(b => b.titre === titre));

// ── Élève ───────────────────────────────────────────────────────────────────
// Les devoirs sont déjà triés par le back : échéance la plus proche d'abord, sans échéance à la fin
export function blocTravailAFaire(devoirs, maintenant = new Date()) {
  return {
    titre: 'Travail à faire',
    lignes: devoirs.slice(0, NB_LIGNES).map(d => {
      const echeance = lireDate(d.a_rendre_le);
      const enRetard = echeance !== null && echeance < maintenant;
      return {
        label: d.matiere,
        texte: d.titre,
        badge: echeance
          ? { ton: enRetard ? 'alerte' : 'attente', texte: enRetard ? 'En retard' : `Pour le ${jourCourt(echeance)}` }
          : undefined,
      };
    }),
  };
}

const ICONE_RESSOURCE = { fichier: '📄', lien: '🔗', texte: '📝' };

export function blocDernieresRessources(ressources) {
  return {
    titre: 'Dernières ressources',
    lignes: ressources.slice(0, NB_LIGNES).map(r => ({
      label: r.matiere,
      texte: `${ICONE_RESSOURCE[r.type] ?? '📄'} ${r.titre}`,
    })),
  };
}

// `resume` : { absences, absences_non_justifiees, heures_absence, retards, ponctualite } (null si aucun cours passé)
export function blocVieScolaire(resume) {
  const nonJustifiees = Number(resume.absences_non_justifiees);
  const heures = Number(resume.heures_absence);
  return {
    titre: 'Vie Scolaire',
    lignes: [
      {
        texte: `Absences : ${resume.absences}${heures ? ` (${nombre(heures)} h)` : ''}`,
        badge: nonJustifiees > 0
          ? { ton: 'alerte', texte: pluriel(nonJustifiees, 'non justifiée') }
          : undefined,
      },
      { texte: `Retards : ${resume.retards}` },
      { texte: resume.ponctualite == null ? 'Ponctualité : pas encore de cours' : `Ponctualité : ${resume.ponctualite}%` },
    ],
  };
}

// Note du back → '16/20' ; `valeur` vaut null si l'élève était absent à l'évaluation
const noteTexte = n => (n.absent ? 'Absent' : n.valeur == null ? 'Non noté' : `${nombre(n.valeur)}/${nombre(n.bareme)}`);

// Notes les plus récentes d'abord (le back trie par date d'évaluation décroissante)
export function blocDernieresNotes(notes) {
  return {
    titre: 'Dernières notes',
    lignes: notes.slice(0, NB_LIGNES).map(n => ({
      label: n.matiere,
      texte: n.titre ? `${noteTexte(n)} · ${n.titre}` : noteTexte(n),
    })),
  };
}

// ── Professeur ──────────────────────────────────────────────────────────────
// Devoirs dont l'échéance n'est pas passée, du plus proche au plus lointain (le back les trie dans l'autre sens)
export function blocProchainsDevoirs(devoirs, maintenant = new Date()) {
  const avenir = devoirs
    .map(d => ({ d, echeance: lireDate(d.a_rendre_le) }))
    .filter(({ echeance }) => echeance !== null && echeance >= maintenant)
    .sort((a, b) => a.echeance - b.echeance);

  return {
    titre: 'Mes prochains devoirs',
    lignes: avenir.slice(0, NB_LIGNES).map(({ d, echeance }) => ({
      label: `${d.matiere} · ${d.classe}`,
      texte: `${d.titre} · ${Number(d.faits)}/${Number(d.eleves)} faits`,
      badge: { ton: 'attente', texte: `Pour le ${jourCourt(echeance)}` },
    })),
  };
}

// Évaluations les plus récentes d'abord (le back trie par date décroissante) ; `moyenne` null tant qu'aucune note n'est saisie
export function blocEvaluations(evaluations) {
  return {
    titre: 'Mes évaluations',
    lignes: evaluations.slice(0, NB_LIGNES).map(e => ({
      label: `${e.matiere} · ${e.classe}`,
      texte: `${e.titre} · ${Number(e.notes) > 0 ? pluriel(Number(e.notes), 'note saisie', 'notes saisies') : 'aucune note saisie'}`,
      badge: e.moyenne == null
        ? { ton: 'alerte', texte: 'À noter' }
        : { ton: 'ok', texte: `Moy. ${nombre(e.moyenne)}/${nombre(e.bareme)}` },
    })),
  };
}

// ── Définition des blocs ────────────────────────────────────────────────────
// visible(can) : selon les droits, jamais selon le rôle. `devoirs_gerer` distingue la vue professeur de la
// vue élève : un prof a aussi les droits `devoirs`, `notes` et `documents`, mais n'a pas de route /eleve/*.
// vide : texte affiché quand le bloc n'a aucune ligne (base sans données : ce n'est pas une erreur) ; le bloc « Vie Scolaire » a toujours ses lignes de résumé
const enseigne = can => can('devoirs_gerer');

const BLOCS = [
  {
    titre: 'Travail à faire',
    vide: 'Aucun devoir à faire.',
    visible: can => !enseigne(can) && can('devoirs'),
    charger: USE_MOCKS
      ? mock('Travail à faire')
      : async () => blocTravailAFaire((await api.get('/eleve/devoirs?statut=a_faire')).devoirs),
  },
  {
    titre: 'Dernières ressources',
    vide: 'Aucune ressource pour le moment.',
    visible: can => !enseigne(can) && can('documents'),
    charger: USE_MOCKS
      ? mock('Dernières ressources')
      : async () => blocDernieresRessources((await api.get('/eleve/ressources?limit=3')).ressources),
  },
  {
    titre: 'Vie Scolaire',
    visible: can => !enseigne(can) && can('absences'),
    charger: USE_MOCKS
      ? mock('Vie Scolaire')
      : async () => blocVieScolaire((await api.get('/eleve/absences')).resume),
  },
  {
    titre: 'Dernières notes',
    vide: 'Aucune note pour le moment.',
    visible: can => !enseigne(can) && can('notes'),
    charger: USE_MOCKS
      ? mock('Dernières notes')
      : async () => blocDernieresNotes((await api.get('/eleve/notes?limit=3')).notes),
  },
  {
    titre: 'Mes prochains devoirs',
    vide: 'Aucun devoir à venir.',
    visible: enseigne,
    charger: USE_MOCKS
      ? mock('Mes prochains devoirs', RACCOURCIS_PROF)
      : async () => blocProchainsDevoirs((await api.get('/prof/devoirs')).devoirs),
  },
  {
    titre: 'Mes évaluations',
    vide: 'Aucune évaluation pour le moment.',
    visible: can => enseigne(can) && can('notes'),
    charger: USE_MOCKS
      ? mock('Mes évaluations', RACCOURCIS_PROF)
      : async () => blocEvaluations((await api.get('/prof/evaluations')).evaluations),
  },
];

// Blocs à afficher pour cet utilisateur : [{ titre, vide, charger: () => Promise<{ titre, lignes }> }]
export const blocsAccueil = can => BLOCS.filter(b => b.visible(can));
