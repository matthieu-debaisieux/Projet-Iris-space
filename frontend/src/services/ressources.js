import { api, USE_MOCKS } from './api.js';
import { ecrireDemo, lireDemo } from './demoStore.js';
import { CLASSES_PROF, RESSOURCES } from '@/mocks/ressources.js';

// Ressources de cours du professeur connecté : fichiers, liens et textes qu'il dépose pour une
// classe et une matière. Contrat du back : backend/routes/prof.php (branche origin/backend),
// section « RESSOURCES » :
//   GET    /prof/classes        → { classes: [{ id, nom, matieres: [{ id, nom, coefficient }] }] }
//   GET    /prof/ressources     → { ressources: [{ id, classe_id, classe, matiere_id, matiere, cours_id,
//                                                  type, titre, contenu, url, created_at }] }  (les siennes seulement)
//   POST   /prof/ressources     → { ressource } (201) ; type = 'fichier' : formulaire multipart avec `fichier`,
//                                  'lien' : `url` en http(s), 'texte' : `contenu`. Toujours : classe_id, matiere_id, titre.
//   DELETE /prof/ressources/{id} → 204 (404 si la ressource n'est pas la sienne)
// Le back refuse (400) un couple classe / matière que le prof n'enseigne pas ; le message d'erreur est lisible tel quel.
// Pas de route pour renommer une ressource, ni pour télécharger un fichier déposé : en mode API,
// la page affiche « Téléchargement bientôt disponible » (le fichier n'est téléchargeable qu'en mode mock).

export const TYPES_RESSOURCE = { fichier: 'Fichier', lien: 'Lien', texte: 'Texte' };

// ── Mocks : IndexedDB (les fichiers y sont gardés tels quels), repli en mémoire si indisponible ──
let memoire = null;

async function lireMock() {
  try {
    const stocke = await lireDemo('ressources');
    if (stocke) return stocke;
  } catch { /* stockage indisponible (navigation privée…) */ }
  return memoire ?? structuredClone(RESSOURCES);
}

async function ecrireMock(liste) {
  memoire = liste;
  try { await ecrireDemo('ressources', liste); } catch { /* idem : on reste en mémoire */ }
}

// Classes de l'année où le prof enseigne, avec ses matières (pour les menus)
export async function getClassesProf() {
  if (!USE_MOCKS) return (await api.get('/prof/classes')).classes;
  return structuredClone(CLASSES_PROF);
}

// Ressources de `user` seulement : le back ne renvoie que celles du prof connecté,
// le mock imite cette règle en comparant l'auteur à `user.id`.
export async function getRessources(user) {
  if (!USE_MOCKS) return (await api.get('/prof/ressources')).ressources;
  return (await lireMock()).filter(r => r.professeur_id === user?.id);
}

// `data` : { classe_id, matiere_id, type, titre, url?, contenu?, fichier? } (fichier = objet File)
export async function creerRessource(user, { classe_id, matiere_id, type, titre, url, contenu, fichier }) {
  if (!USE_MOCKS) {
    if (type === 'fichier') {
      const form = new FormData();
      form.append('type', type);
      form.append('classe_id', classe_id);
      form.append('matiere_id', matiere_id);
      form.append('titre', titre);
      form.append('fichier', fichier);
      return (await api.upload('/prof/ressources', form)).ressource;
    }
    const corps = { type, classe_id, matiere_id, titre, ...(type === 'lien' ? { url } : { contenu }) };
    return (await api.post('/prof/ressources', corps)).ressource;
  }

  const classe = CLASSES_PROF.find(c => c.id === Number(classe_id));
  const matiere = classe?.matieres.find(m => m.id === Number(matiere_id));
  if (!classe || !matiere) throw new Error("Classe ou matière invalide : vous n'enseignez pas cette matière dans cette classe");

  const ressource = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    classe_id: classe.id, classe: classe.nom, matiere_id: matiere.id, matiere: matiere.nom, cours_id: null,
    type, titre,
    contenu: type === 'texte' ? contenu : null,
    url: type === 'lien' ? url : null,
    created_at: new Date().toISOString(),
    professeur_id: user?.id,
    ...(type === 'fichier' ? { fichier } : {}),
  };
  await ecrireMock([ressource, ...(await lireMock())]);
  return ressource;
}

export async function supprimerRessource(user, id) {
  if (!USE_MOCKS) return api.delete(`/prof/ressources/${id}`);

  const liste = await lireMock();
  if (!liste.some(r => r.id === id && r.professeur_id === user?.id)) throw new Error('Ressource introuvable');
  await ecrireMock(liste.filter(r => r.id !== id));
}
