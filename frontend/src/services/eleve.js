import { api, USE_MOCKS } from './api.js';
import { LS_PROFIL, loadJSON, saveJSON } from './storage.js';
import { NOTES, PROFIL } from '@/mocks/eleve.js';

// Données de l'élève connecté

export async function getNotes() {
  if (!USE_MOCKS) return api.get('/eleve/notes');
  return NOTES;
}

export async function getProfil() {
  if (!USE_MOCKS) return api.get('/eleve/profil');
  return loadJSON(LS_PROFIL, PROFIL);
}

// Seules les coordonnées se modifient ; nom, prénom, naissance, classe… restent à l'administration.
// Mêmes règles et mêmes messages que le back (PATCH /eleve/profil), pour le mode mock.
const REGLES_PROFIL = {
  email:     { max: 254, requis: true, motif: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, invalide: "L'email n'est pas valide" },
  telephone: { max: 30, motif: /^\+?[\d\s.()-]{6,30}$/, invalide: "Le numéro de téléphone n'est pas valide" },
  adresse:   { max: 500 },
};

// champs : { email?, telephone?, adresse? } — seuls les champs envoyés changent.
// Renvoie le profil à jour ; lève une Error dont le message (en français) peut s'afficher tel quel.
export async function updateProfil(champs) {
  const envoi = Object.fromEntries(Object.entries(champs).filter(([cle]) => cle in REGLES_PROFIL));
  if (!USE_MOCKS) return (await api.patch('/eleve/profil', envoi)).profil;

  for (const [cle, valeur] of Object.entries(envoi)) {
    const { max, requis, motif, invalide } = REGLES_PROFIL[cle];
    const texte = (valeur ?? '').trim();
    if (!texte && requis) throw new Error(`Le champ « ${cle} » est requis`);
    if (texte.length > max) throw new Error(`Le champ « ${cle} » dépasse ${max} caractères`);
    if (texte && motif && !motif.test(texte)) throw new Error(invalide);
    envoi[cle] = texte;
  }
  const profil = { ...loadJSON(LS_PROFIL, PROFIL), ...envoi };
  saveJSON(LS_PROFIL, profil);
  return profil;
}
