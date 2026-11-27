import { api, USE_MOCKS } from './api.js';
import { LS_ACTUALITES, LS_SESSION, loadJSON, saveJSON } from './storage.js';
import { ACTUALITES } from '@/mocks/actualites.js';

// Format d'un article : celui du back (backend/ROUTES.md, section Actualités).
// Pas de statut « archivé » dans la bêta : un article est publié ou en brouillon.
export const STATUTS_ACTUALITE = { publie: 'Publié', brouillon: 'Brouillon' };

// Les dates du back ressemblent à "2026-06-24 09:00:00+02" : on les met au format ISO pour que
// tous les navigateurs les lisent.
const lireDate = valeur => new Date(String(valeur).replace(' ', 'T').replace(/(T[\d:.]+)([+-]\d\d)$/, '$1$2:00'));

// Date affichée : celle de publication (celle de création pour un brouillon)
export const dateActualite = actu => lireDate(actu.publie_at ?? actu.created_at)
  .toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

export const nomAuteur = actu => [actu.auteur_prenom, actu.auteur_nom].filter(Boolean).join(' ');

const requete = (chemin, params) => {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
  return qs ? `${chemin}?${qs}` : chemin;
};

// Articles publiés ET publics, sans connexion (page visiteur)
export async function getActualitesPubliques({ limit } = {}) {
  if (!USE_MOCKS) return (await api.get(requete('/actualites/publiques', { limit }))).actualites;
  return trier(lire().filter(a => a.statut === 'publie' && a.publique)).slice(0, limit);
}

// Articles publiés pour un utilisateur connecté (page Actualité, accueil).
// Avec `brouillons`, ceux qui peuvent écrire reçoivent aussi des brouillons : tous pour
// `actualites_gerer_tout`, les leurs pour un prof.
export async function getActualites({ limit, brouillons = false } = {}) {
  if (!USE_MOCKS) return (await api.get(requete('/actualites', { limit, brouillons }))).actualites;
  return trier(lire().filter(a => a.statut === 'publie' || (brouillons && peutVoirBrouillon(a)))).slice(0, limit);
}

// data : { titre, contenu, statut, publique, image_url, image }
//   - `image_url` : image déjà enregistrée de l'article (URL ou chemin)
//   - `image` : nouvelle image choisie dans le formulaire, en base64. Le back n'accepte pas encore
//     de base64 : tant que l'envoi par `POST /uploads` n'existe pas (tâche ACT-04), elle n'est
//     gardée qu'en mode mocks.
const corps = ({ titre, contenu, statut, publique, image_url }) => ({
  titre, contenu, statut, publique: !!publique, image_url: image_url ?? null,
});

// Renvoie l'article créé (avec son id) ; l'auteur est le compte connecté
export async function createActualite(data) {
  if (!USE_MOCKS) return (await api.post('/actualites', corps(data))).actualite;

  const auteur = utilisateurMock();
  if (!aLeDroit(auteur, 'actualites_gerer')) throw erreur('Accès refusé', 403);
  const all = lire();
  const maintenant = new Date().toISOString();
  const actu = {
    id: all.length > 0 ? Math.max(...all.map(a => a.id)) + 1 : 0,
    ...champsMock(data, null),
    created_at: maintenant,
    updated_at: maintenant,
    auteur_id: auteur.id,
    auteur_nom: auteur.nom,
    auteur_prenom: auteur.prenom ?? '',
  };
  saveJSON(LS_ACTUALITES, [...all, actu]);
  return actu;
}

// Renvoie l'article modifié (l'auteur ne change pas)
export async function updateActualite(id, data) {
  if (!USE_MOCKS) return (await api.put(`/actualites/${id}`, corps(data))).actualite;

  const actu = trouverMock(id);
  const modifie = { ...actu, ...champsMock(data, actu), updated_at: new Date().toISOString() };
  saveJSON(LS_ACTUALITES, lire().map(a => (a.id === id ? modifie : a)));
  return modifie;
}

export async function deleteActualite(id) {
  if (!USE_MOCKS) return api.delete(`/actualites/${id}`);

  trouverMock(id);
  saveJSON(LS_ACTUALITES, lire().filter(a => a.id !== id));
}

// ── Mode mocks : reproduit les règles du back (backend/routes/actualites.php) ─────────────
const lire = () => loadJSON(LS_ACTUALITES, ACTUALITES);
const utilisateurMock = () => loadJSON(LS_SESSION, null, { seed: false });

const erreur = (message, status) => Object.assign(new Error(message), { status });

// Les plus récents d'abord (date de publication, ou de création pour un brouillon)
const trier = liste => [...liste].sort((a, b) => lireDate(b.publie_at ?? b.created_at) - lireDate(a.publie_at ?? a.created_at));

// Mêmes règles que le back, appliquées avec les droits du compte connecté (jamais avec son rôle) :
// `actualites_gerer_tout` touche à tous les articles, `actualites_gerer` seul à ses propres articles.
const aLeDroit = (moi, droit) => !!moi?.droits?.includes(droit);
const estAuteur = (actu, moi) => moi != null && String(actu.auteur_id) === String(moi.id);

function peutVoirBrouillon(actu) {
  const moi = utilisateurMock();
  return aLeDroit(moi, 'actualites_gerer_tout') || (aLeDroit(moi, 'actualites_gerer') && estAuteur(actu, moi));
}

// Un article inconnu : 404 ; un prof qui touche à l'article d'un autre : 403
function trouverMock(id) {
  const actu = lire().find(a => a.id === id);
  if (!actu) throw erreur('Article introuvable', 404);
  const moi = utilisateurMock();
  if (!aLeDroit(moi, 'actualites_gerer')) throw erreur('Accès refusé', 403);
  if (!aLeDroit(moi, 'actualites_gerer_tout') && !estAuteur(actu, moi)) throw erreur('Vous ne pouvez modifier que vos propres articles', 403);
  return actu;
}

// Un article déjà publié garde sa date de publication ; un brouillon n'en a pas
function champsMock({ titre, contenu, statut, publique, image_url, image }, actu) {
  return {
    titre, contenu, statut,
    publique: !!publique,
    image_url: image ?? image_url ?? null,
    publie_at: statut === 'publie' ? (actu?.publie_at ?? new Date().toISOString()) : null,
  };
}
