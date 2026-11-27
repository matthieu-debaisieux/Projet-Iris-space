import { api, BASE_URL, USE_MOCKS } from './api.js';
import { LS_DOCUMENTS, loadJSON, saveJSON } from './storage.js';
import { ESPACES } from '@/mocks/documents.js';

function normaliserDocAdmin(doc) {
  return {
    id: doc.id,
    titre: doc.titre ?? doc.name ?? 'Document',
    utilisateur_id: doc.utilisateur_id ?? null,
    created_at: doc.created_at ?? null,
  };
}

function normaliserEspace(espace) {
  const docsBruts = Array.isArray(espace.documents)
    ? espace.documents
    : (Array.isArray(espace.docs) ? espace.docs : []);
  return {
    id: espace.id,
    nom: espace.nom ?? espace.name ?? '',
    documents: docsBruts.map(normaliserDocAdmin),
  };
}

const lireEspacesMocks = () => loadJSON(LS_DOCUMENTS, ESPACES).map(normaliserEspace);

function ecrireEspacesMocks(espaces) {
  saveJSON(LS_DOCUMENTS, espaces);
  return espaces;
}

export function getDocumentDownloadUrl(id) {
  return `${BASE_URL}/documents/${encodeURIComponent(id)}/telecharger`;
}

// Espaces documentaires (admin) : [{ id, nom, documents: [{ id, titre, utilisateur_id, created_at }] }]
export async function getEspaces() {
  if (!USE_MOCKS) {
    const data = await api.get('/admin/espaces');
    return (data?.espaces ?? []).map(normaliserEspace);
  }
  return lireEspacesMocks();
}

export async function createEspace(nom) {
  if (!USE_MOCKS) {
    const data = await api.post('/admin/espaces', { nom });
    return normaliserEspace(data.espace);
  }
  const all = lireEspacesMocks();
  if (all.some(e => e.nom.toLowerCase() === nom.trim().toLowerCase())) {
    throw new Error('Un espace porte déjà ce nom');
  }
  const nextId = all.length > 0 ? Math.max(...all.map(e => Number(e.id) || 0)) + 1 : 1;
  const espace = { id: nextId, nom: nom.trim(), documents: [] };
  ecrireEspacesMocks([...all, espace]);
  return espace;
}

export async function renameEspace(id, nom) {
  if (!USE_MOCKS) {
    const data = await api.patch(`/admin/espaces/${id}`, { nom });
    return normaliserEspace(data.espace);
  }
  const all = lireEspacesMocks();
  if (all.some(e => e.id !== id && e.nom.toLowerCase() === nom.trim().toLowerCase())) {
    throw new Error('Un espace porte déjà ce nom');
  }
  const updated = all.map(e => (e.id === id ? { ...e, nom: nom.trim() } : e));
  ecrireEspacesMocks(updated);
  return updated.find(e => e.id === id);
}

export async function deleteEspace(id) {
  if (!USE_MOCKS) {
    await api.delete(`/admin/espaces/${id}`);
    return;
  }
  const all = lireEspacesMocks();
  ecrireEspacesMocks(all.filter(e => e.id !== id));
}

export async function uploadDocumentAdmin(espaceId, { fichier, titre }) {
  if (!USE_MOCKS) {
    const formData = new FormData();
    formData.append('fichier', fichier);
    if (titre && titre.trim() !== '') {
      formData.append('titre', titre.trim());
    }
    const data = await api.post(`/admin/espaces/${espaceId}/documents`, formData);
    return normaliserDocAdmin(data.document);
  }
  const all = lireEspacesMocks();
  const doc = {
    id: crypto.randomUUID ? crypto.randomUUID() : `mock-${Date.now()}`,
    titre: (titre && titre.trim()) || fichier?.name || 'Document',
    utilisateur_id: null,
    created_at: new Date().toISOString(),
  };
  ecrireEspacesMocks(
    all.map(e => (e.id === espaceId ? { ...e, documents: [...e.documents, doc] } : e)),
  );
  return doc;
}

export async function deleteDocumentAdmin(docId) {
  if (!USE_MOCKS) {
    await api.delete(`/admin/documents/${docId}`);
    return;
  }
  const all = lireEspacesMocks();
  ecrireEspacesMocks(
    all.map(e => ({ ...e, documents: e.documents.filter(d => d.id !== docId) })),
  );
}
