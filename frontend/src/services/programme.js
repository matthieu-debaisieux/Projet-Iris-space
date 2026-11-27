import { api, USE_MOCKS } from './api.js';
import { LS_PROGRAMME, loadJSON, saveJSON } from './storage.js';
import { PROGRAMME_MOCK_INITIAL } from '@/mocks/programme.js';

const lireProgrammeMock = () => loadJSON(LS_PROGRAMME, PROGRAMME_MOCK_INITIAL);

function construireMatieresMock(etat) {
  return [...etat.matieres]
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
    .map(m => ({
      ...m,
      nb_professeurs: etat.professeurs.filter(p => p.matiere_ids.includes(m.id)).length,
      nb_classes: etat.classes.filter(c => c.matieres.some(cm => cm.matiere_id === m.id)).length,
    }));
}

function construireProfesseursMock(etat) {
  const parId = Object.fromEntries(etat.matieres.map(m => [m.id, m]));
  return [...etat.professeurs]
    .sort((a, b) => `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, 'fr'))
    .map(({ matiere_ids, ...prof }) => ({
      ...prof,
      matieres: matiere_ids
        .map(id => parId[id])
        .filter(Boolean)
        .sort((a, b) => a.nom.localeCompare(b.nom, 'fr')),
    }));
}

function construireClassesMock(etat) {
  const parId = Object.fromEntries(etat.matieres.map(m => [m.id, m]));
  return [...etat.classes]
    .sort((a, b) => Number(b.courante) - Number(a.courante) || a.nom.localeCompare(b.nom, 'fr'))
    .map(c => ({
      ...c,
      matieres: c.matieres
        .map(cm => {
          const m = parId[cm.matiere_id];
          if (!m) return null;
          return { ...m, coefficient: String(cm.coefficient) };
        })
        .filter(Boolean)
        .sort((a, b) => a.nom.localeCompare(b.nom, 'fr')),
    }));
}

export async function getProgrammeMatieres() {
  if (!USE_MOCKS) {
    const data = await api.get('/admin/programme/matieres');
    return data?.matieres ?? [];
  }
  return construireMatieresMock(lireProgrammeMock());
}

export async function createMatiere({ code, nom }) {
  const nomPropre = (nom ?? '').trim();
  const codePropre = code && code.trim() !== '' ? code.trim() : null;

  if (!USE_MOCKS) {
    const data = await api.post('/admin/matieres', { code: codePropre, nom: nomPropre });
    return data.matiere;
  }

  if (!nomPropre) {
    throw new Error('Le champ « nom » est requis');
  }
  const etat = lireProgrammeMock();
  const doublon = etat.matieres.some(
    m =>
      m.nom.toLowerCase() === nomPropre.toLowerCase() ||
      (codePropre && m.code && m.code.toLowerCase() === codePropre.toLowerCase()),
  );
  if (doublon) {
    throw new Error('Une matière porte déjà ce nom ou ce code');
  }

  const nextId = etat.matieres.reduce((max, m) => Math.max(max, m.id), 0) + 1;
  const created = { id: nextId, code: codePropre, nom: nomPropre };
  saveJSON(LS_PROGRAMME, { ...etat, matieres: [...etat.matieres, created] });
  return created;
}

export async function getProgrammeProfesseurs() {
  if (!USE_MOCKS) {
    const data = await api.get('/admin/programme/professeurs');
    return data?.professeurs ?? [];
  }
  return construireProfesseursMock(lireProgrammeMock());
}

export async function updateProfesseurMatieres(professeurId, matiereIds) {
  if (!USE_MOCKS) {
    const data = await api.put(`/admin/professeurs/${professeurId}/matieres`, {
      matiere_ids: matiereIds,
    });
    return data?.matieres ?? [];
  }

  const etat = lireProgrammeMock();
  if (!etat.professeurs.some(p => p.id === professeurId)) {
    throw new Error('Professeur introuvable');
  }
  const idsValides = [...new Set(matiereIds.map(Number))];
  const professeurs = etat.professeurs.map(p =>
    p.id === professeurId ? { ...p, matiere_ids: idsValides } : p,
  );
  saveJSON(LS_PROGRAMME, { ...etat, professeurs });

  const parId = Object.fromEntries(etat.matieres.map(m => [m.id, m]));
  return idsValides
    .map(id => parId[id])
    .filter(Boolean)
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
}

export async function getProgrammeClasses() {
  if (!USE_MOCKS) {
    const data = await api.get('/admin/programme/classes');
    return data?.classes ?? [];
  }
  return construireClassesMock(lireProgrammeMock());
}

export async function updateClasseMatieres(classeId, matieres) {
  if (!USE_MOCKS) {
    const data = await api.put(`/admin/classes/${classeId}/matieres`, { matieres });
    return data?.matieres ?? [];
  }

  const etat = lireProgrammeMock();
  if (!etat.classes.some(c => c.id === Number(classeId))) {
    throw new Error('Classe introuvable');
  }

  const lignes = matieres.map(m => ({
    matiere_id: Number(m.matiere_id),
    coefficient: Number(m.coefficient ?? 1).toFixed(2),
  }));
  const classes = etat.classes.map(c =>
    c.id === Number(classeId) ? { ...c, matieres: lignes } : c,
  );
  saveJSON(LS_PROGRAMME, { ...etat, classes });

  const parId = Object.fromEntries(etat.matieres.map(m => [m.id, m]));
  return lignes
    .map(l => {
      const mat = parId[l.matiere_id];
      return mat ? { ...mat, coefficient: l.coefficient } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
}
