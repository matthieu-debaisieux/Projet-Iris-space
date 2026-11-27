import { api, USE_MOCKS } from './api.js';
import { LS_PROGRAMME, loadJSON } from './storage.js';
import { ELEVES_PAR_CLASSE_MOCK, PROGRAMME_MOCK_INITIAL } from '@/mocks/programme.js';

const lireProgrammeMock = () => loadJSON(LS_PROGRAMME, PROGRAMME_MOCK_INITIAL, { seed: false });

const trierEleves = liste =>
  [...liste].sort((a, b) => `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, 'fr'));

// Élève : sa propre classe et ses camarades (nom, prénom, photo uniquement)
export async function getMaClasse() {
  if (!USE_MOCKS) {
    const data = await api.get('/eleve/classe');
    return {
      classe: data?.classe ?? null,
      eleves: data?.eleves ?? [],
    };
  }

  const etat = lireProgrammeMock();
  const classe = etat.classes[0] ?? null;
  if (!classe) return { classe: null, eleves: [] };

  const eleves = (ELEVES_PAR_CLASSE_MOCK[classe.id] ?? []).map(({ id, nom, prenom, photo_url }) => ({
    id,
    nom,
    prenom,
    photo_url,
  }));

  return {
    classe: {
      id: classe.id,
      nom: classe.nom,
      annee_scolaire: classe.annee_scolaire,
      campus: classe.campus,
    },
    eleves: trierEleves(eleves),
  };
}

// Professeur : les classes où il enseigne (année scolaire en cours)
export async function getMesClassesProf(userId) {
  if (!USE_MOCKS) {
    const data = await api.get('/prof/classes');
    return data?.classes ?? [];
  }

  const etat = lireProgrammeMock();
  const prof = etat.professeurs.find(p => p.id === userId) ?? etat.professeurs[0];
  if (!prof) return [];

  const matieresParId = Object.fromEntries(etat.matieres.map(m => [m.id, m]));
  return etat.classes
    .filter(c => c.courante && c.matieres.some(cm => prof.matiere_ids.includes(cm.matiere_id)))
    .map(c => ({
      id: c.id,
      nom: c.nom,
      matieres: c.matieres
        .filter(cm => prof.matiere_ids.includes(cm.matiere_id))
        .map(cm => ({
          id: cm.matiere_id,
          nom: matieresParId[cm.matiere_id]?.nom ?? '',
          coefficient: cm.coefficient,
        }))
        .sort((a, b) => a.nom.localeCompare(b.nom, 'fr')),
    }))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
}

// Professeur : les élèves d'une de ses classes
export async function getElevesClasseProf(classeId) {
  if (!USE_MOCKS) {
    const data = await api.get(`/prof/classes/${classeId}/eleves`);
    return data?.eleves ?? [];
  }

  return trierEleves(ELEVES_PAR_CLASSE_MOCK[Number(classeId)] ?? []);
}

// Administration : toutes les classes
export async function getToutesClassesAdmin() {
  if (!USE_MOCKS) {
    const data = await api.get('/admin/classes');
    return data?.classes ?? [];
  }

  const etat = lireProgrammeMock();
  return etat.classes.map(({ id, nom, annee_scolaire, campus }) => ({
    id,
    nom,
    annee_scolaire,
    campus,
  }));
}

// Administration : élèves d'une classe donnée
export async function getElevesClasseAdmin(classeId) {
  if (!USE_MOCKS) {
    const data = await api.get(`/admin/classes/${classeId}/eleves`);
    return {
      classe: data?.classe ?? null,
      eleves: data?.eleves ?? [],
    };
  }

  const etat = lireProgrammeMock();
  const classe = etat.classes.find(c => c.id === Number(classeId)) ?? null;
  if (!classe) throw new Error('Classe introuvable');

  return {
    classe: {
      id: classe.id,
      nom: classe.nom,
      annee_scolaire: classe.annee_scolaire,
      campus: classe.campus,
    },
    eleves: trierEleves(ELEVES_PAR_CLASSE_MOCK[classe.id] ?? []),
  };
}
