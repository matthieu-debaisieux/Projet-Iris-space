import { api, USE_MOCKS } from './api.js';
import { LS_UTILISATEURS, loadJSON, saveJSON } from './storage.js';
import { CLASSES_MOCK, UTILISATEURS_MOCK } from '@/mocks/utilisateurs.js';

export const ROLES_COMPTE = [
  { value: 'eleve', label: 'Élève', badgeClass: 'bg-sky-100 text-sky-800 border-sky-200' },
  { value: 'professeur', label: 'Professeur', badgeClass: 'bg-amber-100 text-amber-800 border-amber-200' },
  { value: 'administrateur', label: 'Administrateur', badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { value: 'direction', label: 'Direction', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { value: 'dev', label: 'Développeur (Dev)', badgeClass: 'bg-purple-100 text-purple-800 border-purple-200' },
];

export const ROLE_COMPTE_BY_VALUE = Object.fromEntries(ROLES_COMPTE.map(r => [r.value, r]));

function publicUtilisateur(u) {
  const { motDePasse: _, ...rest } = u;
  return {
    ...rest,
    actif: rest.actif !== false,
  };
}

const lireMocks = () => loadJSON(LS_UTILISATEURS, UTILISATEURS_MOCK);

function validerChampsMock(payload, { creation, exclureId = null }, existants) {
  const identifiant = (payload.identifiant ?? '').trim();
  const email = (payload.email ?? '').trim();
  const nom = (payload.nom ?? '').trim();
  const prenom = (payload.prenom ?? '').trim();

  if (!identifiant || !email || !nom || !prenom) {
    throw new Error('Identifiant, email, nom et prénom sont requis.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("L'email n'est pas valide");
  }
  if (creation && (!payload.mot_de_passe || payload.mot_de_passe.length < 8)) {
    throw new Error('Le mot de passe doit faire au moins 8 caractères');
  }
  if (!creation && payload.mot_de_passe && payload.mot_de_passe.length < 8) {
    throw new Error('Le mot de passe doit faire au moins 8 caractères');
  }

  const numeroEtudiant = payload.numero_etudiant ? payload.numero_etudiant.trim() : null;
  const doublon = existants.some(u => {
    if (exclureId && u.id === exclureId) return false;
    if (u.identifiant.toLowerCase() === identifiant.toLowerCase()) return true;
    if (u.email.toLowerCase() === email.toLowerCase()) return true;
    if (numeroEtudiant && u.numero_etudiant && u.numero_etudiant.toLowerCase() === numeroEtudiant.toLowerCase()) {
      return true;
    }
    return false;
  });
  if (doublon) {
    throw new Error('Identifiant, email ou numéro étudiant déjà utilisé');
  }
}

export async function getUtilisateurs(role = '') {
  if (!USE_MOCKS) {
    const query = role ? `?role=${encodeURIComponent(role)}` : '';
    const data = await api.get(`/admin/utilisateurs${query}`);
    return data?.utilisateurs ?? [];
  }
  const all = lireMocks().map(publicUtilisateur);
  return (role ? all.filter(u => u.role === role) : all).sort((a, b) =>
    `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, 'fr'),
  );
}

export async function getClasses() {
  if (!USE_MOCKS) {
    const data = await api.get('/admin/classes');
    return data?.classes ?? [];
  }
  return structuredClone(CLASSES_MOCK);
}

export async function createUtilisateur(payload) {
  if (!USE_MOCKS) {
    const data = await api.post('/admin/utilisateurs', payload);
    return data.utilisateur;
  }

  const all = lireMocks();
  validerChampsMock(payload, { creation: true }, all);
  if (!ROLE_COMPTE_BY_VALUE[payload.role]) {
    throw new Error('Rôle invalide');
  }

  const classeId = payload.role === 'eleve' && payload.classe_id ? Number(payload.classe_id) : null;
  const classeObj = classeId ? CLASSES_MOCK.find(c => c.id === classeId) : null;

  const created = {
    id: crypto.randomUUID ? crypto.randomUUID() : `mock-user-${Date.now()}`,
    identifiant: payload.identifiant.trim(),
    email: payload.email.trim(),
    motDePasse: payload.mot_de_passe,
    role: payload.role,
    nom: payload.nom.trim(),
    prenom: payload.prenom.trim(),
    date_naissance: payload.date_naissance || null,
    lieu_naissance: payload.lieu_naissance?.trim() || null,
    pays_naissance: payload.pays_naissance?.trim() || null,
    nationalite: payload.nationalite?.trim() || null,
    telephone: payload.telephone?.trim() || null,
    adresse: payload.adresse?.trim() || null,
    actif: true,
    derniere_connexion: null,
    classe_id: classeObj?.id ?? null,
    classe: classeObj?.nom ?? null,
    numero_etudiant: payload.role === 'eleve' ? (payload.numero_etudiant?.trim() || null) : null,
  };

  saveJSON(LS_UTILISATEURS, [...all, created]);
  return publicUtilisateur(created);
}

export async function updateUtilisateur(id, payload) {
  if (!USE_MOCKS) {
    const data = await api.put(`/admin/utilisateurs/${id}`, payload);
    return data.utilisateur;
  }

  const all = lireMocks();
  const existant = all.find(u => u.id === id);
  if (!existant) throw new Error('Utilisateur introuvable');
  validerChampsMock(payload, { creation: false, exclureId: id }, all);

  const classeId = existant.role === 'eleve' && payload.classe_id ? Number(payload.classe_id) : null;
  const classeObj = classeId ? CLASSES_MOCK.find(c => c.id === classeId) : null;

  const updated = {
    ...existant,
    identifiant: payload.identifiant.trim(),
    email: payload.email.trim(),
    motDePasse: payload.mot_de_passe ? payload.mot_de_passe : existant.motDePasse,
    nom: payload.nom.trim(),
    prenom: payload.prenom.trim(),
    date_naissance: payload.date_naissance || null,
    lieu_naissance: payload.lieu_naissance?.trim() || null,
    pays_naissance: payload.pays_naissance?.trim() || null,
    nationalite: payload.nationalite?.trim() || null,
    telephone: payload.telephone?.trim() || null,
    adresse: payload.adresse?.trim() || null,
    classe_id: existant.role === 'eleve' ? (classeObj?.id ?? null) : null,
    classe: existant.role === 'eleve' ? (classeObj?.nom ?? null) : null,
    numero_etudiant: existant.role === 'eleve' ? (payload.numero_etudiant?.trim() || null) : null,
  };

  saveJSON(LS_UTILISATEURS, all.map(u => (u.id === id ? updated : u)));
  return publicUtilisateur(updated);
}

export async function setUtilisateurActif(id, actif) {
  if (!USE_MOCKS) {
    const data = await api.patch(`/admin/utilisateurs/${id}/actif`, { actif });
    return data.utilisateur;
  }

  const all = lireMocks();
  const target = all.find(u => u.id === id);
  if (!target) throw new Error('Utilisateur introuvable');
  const updated = { ...target, actif: Boolean(actif) };
  saveJSON(LS_UTILISATEURS, all.map(u => (u.id === id ? updated : u)));
  return publicUtilisateur(updated);
}

export async function deleteUtilisateur(id) {
  if (!USE_MOCKS) {
    await api.delete(`/admin/utilisateurs/${id}`);
    return;
  }

  const all = lireMocks();
  if (!all.some(u => u.id === id)) {
    throw new Error('Utilisateur introuvable');
  }
  saveJSON(LS_UTILISATEURS, all.filter(u => u.id !== id));
}
