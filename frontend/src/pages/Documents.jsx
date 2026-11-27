import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DataState from '@/components/ui/DataState.jsx';
import Modal from '@/components/ui/Modal.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { useAsync } from '@/hooks/useAsync.js';
import { USE_MOCKS } from '@/services/api.js';
import {
  createEspace,
  deleteDocumentAdmin,
  deleteDocumentEleve,
  deleteEspace,
  getDocumentDownloadUrl,
  getDocumentsEleve,
  getEspaces,
  renameEspace,
  uploadDocumentAdmin,
  uploadDocumentEleve,
} from '@/services/documents.js';

// ── Icônes ──────────────────────────────────────────────────────────────────
const FolderIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
    <path d="M0 1H6L9 4H16V14H0V1Z" fill="#07A6A6" />
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V5a1 1 0 011-1h6a1 1 0 011 1v2" />
  </svg>
);

const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3" />
  </svg>
);

const ChevronIcon = ({ open }) => (
  <svg
    className="transition-transform duration-200"
    style={{ transform: open ? 'rotate(180deg)' : undefined }}
    xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

function formaterDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('fr-FR');
}

// ── Modale de saisie / confirmation ─────────────────────────────────────────
function DaisyModal({ title, children, inputLabel, initialValue = '', confirmLabel, danger = false, onConfirm, onClose }) {
  const [value, setValue] = useState(initialValue);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function confirm() {
    const trimmed = value.trim();
    if (inputLabel && !trimmed) {
      setError('Ce champ est requis.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await onConfirm(trimmed);
    } catch (err) {
      setError(err?.message || "Une erreur s'est produite.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal onClose={() => { if (!busy) onClose(); }} className="max-w-sm rounded-2xl p-6">
      <h3 className={`font-semibold text-lg ${inputLabel ? 'mb-4' : 'mb-2'}`}>{title}</h3>
      {children}
      {inputLabel && (
        <input
          autoFocus
          type="text"
          placeholder={inputLabel}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !busy) confirm(); }}
          className="input input-bordered w-full mb-3"
          disabled={busy}
        />
      )}
      {error && <p className="text-error text-xs mb-3">{error}</p>}
      <div className="modal-action">
        <button type="button" onClick={onClose} disabled={busy} className="btn btn-ghost">Annuler</button>
        <button
          type="button"
          onClick={confirm}
          disabled={busy}
          className={`btn text-white ${danger ? 'bg-[#EC6F6F] hover:bg-[#EC6F6F]/90' : 'bg-[#07A6A6] hover:bg-[#07A6A6]/90'}`}
        >
          {busy ? 'En cours…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

// ── Modale d'envoi de document (fichier + titre facultatif) ─────────────────
function UploadDocumentModal({ title, spaceName, onUpload, onClose }) {
  const [fichier, setFichier] = useState(null);
  const [titre, setTitre] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!fichier && (!USE_MOCKS || !titre.trim())) {
      setError('Sélectionnez un fichier à envoyer.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await onUpload({ fichier, titre });
    } catch (err) {
      setError(err?.message || "Échec de l'envoi du document.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal onClose={() => { if (!busy) onClose(); }} className="max-w-md rounded-2xl p-6" label={title}>
      <h3 className="font-semibold text-lg mb-1">{title}</h3>
      {spaceName && <p className="text-xs text-gray-500 mb-4">Espace : {spaceName}</p>}
      <form onSubmit={submit} className="flex flex-col gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1" htmlFor="doc-file-input">
            Fichier (10 Mo max — PDF, bureautique, images, zip)
          </label>
          <input
            id="doc-file-input"
            type="file"
            onChange={e => setFichier(e.target.files?.[0] ?? null)}
            className="file-input file-input-bordered file-input-sm w-full"
            disabled={busy}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1" htmlFor="doc-title-input">
            Titre affiché (facultatif)
          </label>
          <input
            id="doc-title-input"
            type="text"
            placeholder="Par défaut : le nom du fichier"
            value={titre}
            onChange={e => setTitre(e.target.value)}
            maxLength={200}
            className="input input-bordered input-sm w-full"
            disabled={busy}
          />
        </div>
        {error && <p className="text-error text-xs">{error}</p>}
        <div className="modal-action mt-2">
          <button type="button" onClick={onClose} disabled={busy} className="btn btn-ghost btn-sm">Annuler</button>
          <button
            type="submit"
            disabled={busy}
            className="btn btn-sm bg-[#07A6A6] hover:bg-[#07A6A6]/90 text-white"
          >
            {busy ? 'Envoi…' : 'Déposer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Ligne de document réutilisable ──────────────────────────────────────────
function DocumentRow({ doc, badge, onDelete }) {
  const dateTexte = formaterDate(doc.created_at);
  return (
    <div className="flex items-center justify-between gap-2 py-2">
      <div className="flex items-center gap-2 min-w-0">
        <FolderIcon />
        <span className="text-sm text-gray-700 truncate">{doc.titre}</span>
        {badge && (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#07A6A6]/10 text-[#07A6A6] shrink-0">
            {badge}
          </span>
        )}
        {dateTexte && <span className="text-xs text-gray-400 shrink-0 hidden sm:inline">· {dateTexte}</span>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {!USE_MOCKS && (
          <a
            href={getDocumentDownloadUrl(doc.id)}
            download
            title="Télécharger ce document"
            className="inline-flex items-center gap-1 text-xs font-medium text-[#07A6A6] hover:underline px-2 py-1 rounded hover:bg-[#07A6A6]/10"
          >
            <DownloadIcon />
            Télécharger
          </a>
        )}
        {onDelete && (
          <button
            type="button"
            title="Supprimer ce document"
            onClick={onDelete}
            className="text-gray-400 hover:text-[#EC6F6F] transition-colors p-1"
          >
            <TrashIcon />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Vue Administration (`documents_gerer`) ──────────────────────────────────
function DocumentsAdmin() {
  const espaces = useAsync(getEspaces);
  const spaces = espaces.data ?? [];
  const setSpaces = espaces.setData;
  const [openIds, setOpenIds] = useState(() => new Set());
  const [modal, setModal] = useState(null);
  const closeModal = () => setModal(null);

  const modalSpace = spaces.find(s => s.id === modal?.spaceId);

  function toggle(id) {
    setOpenIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function updateSpace(id, fn) {
    setSpaces(prev => prev.map(s => (s.id === id ? fn(s) : s)));
  }

  return (
    <>
      <main className="flex-1 overflow-y-auto p-6 bg-[#F5F5F5]">
        <h1 className="text-3xl font-bold mb-6 text-[#07A6A6]">Page Documents</h1>

        <div className="flex gap-5 flex-wrap mb-4">
          <button
            type="button"
            onClick={() => setModal({ type: 'space' })}
            className="inline-flex items-center gap-2 bg-[#E8735A] text-white font-semibold text-base px-5 py-2.5 rounded-full hover:brightness-90 transition"
          >
            Ajouter un espace
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        <section className="flex flex-col gap-4 bg-white p-6 rounded-lg shadow-md">
          <DataState state={espaces}>{() => (
            spaces.length === 0
              ? <p className="text-sm text-gray-500 text-center py-4">Aucun espace documentaire pour le moment.</p>
              : spaces.map(space => {
                  const isOpen = openIds.has(space.id);
                  return (
                    <div key={space.id} className="border border-base-300 rounded-lg overflow-hidden bg-base-100">
                      <div
                        onClick={() => toggle(space.id)}
                        className="flex items-center justify-between gap-2 px-4 py-3 cursor-pointer select-none hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="shrink-0 text-gray-400"><ChevronIcon open={isOpen} /></span>
                          <span className="font-semibold truncate">{space.nom}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={e => { e.stopPropagation(); setModal({ type: 'rename', spaceId: space.id }); }}
                            className="text-xs text-[#07A6A6] font-semibold hover:text-[#0b7d7d] transition px-2 py-1 rounded hover:bg-[#07A6A6]/10"
                          >
                            Renommer
                          </button>
                          <button
                            type="button"
                            title="Supprimer cet espace"
                            onClick={e => { e.stopPropagation(); setModal({ type: 'delete-space', spaceId: space.id }); }}
                            className="text-gray-400 hover:text-[#EC6F6F] transition-colors p-1 rounded"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </div>

                      {isOpen && (
                        <div className="border-t border-base-300 px-4 pb-4 pt-3 flex flex-col gap-1">
                          <div className="flex flex-col divide-y divide-gray-100">
                            {space.documents.map(doc => (
                              <DocumentRow
                                key={doc.id}
                                doc={doc}
                                badge={doc.utilisateur_id ? 'Privé' : null}
                                onDelete={() => setModal({ type: 'delete-doc', spaceId: space.id, doc })}
                              />
                            ))}
                          </div>
                          {space.documents.length === 0 && (
                            <p className="text-gray-400 italic text-xs py-1">Aucun document dans cet espace.</p>
                          )}
                          <button
                            type="button"
                            onClick={() => setModal({ type: 'doc', spaceId: space.id })}
                            className="btn btn-xs bg-[#07A6A6] hover:bg-[#07A6A6]/90 text-white font-bold self-start mt-3"
                          >
                            + Ajouter un document
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
          )}</DataState>
        </section>
      </main>

      {modal?.type === 'space' && (
        <DaisyModal
          title="Nouvel espace"
          inputLabel="Nom de l'espace"
          confirmLabel="Créer"
          onClose={closeModal}
          onConfirm={async nom => {
            const created = await createEspace(nom);
            setSpaces(prev => [...prev, created].sort((a, b) => a.nom.localeCompare(b.nom, 'fr')));
            closeModal();
          }}
        />
      )}

      {modal?.type === 'doc' && modalSpace && (
        <UploadDocumentModal
          title="Ajouter un document"
          spaceName={modalSpace.nom}
          onClose={closeModal}
          onUpload={async ({ fichier, titre }) => {
            const doc = await uploadDocumentAdmin(modal.spaceId, { fichier, titre });
            updateSpace(modal.spaceId, s => ({ ...s, documents: [...s.documents, doc] }));
            closeModal();
          }}
        />
      )}

      {modal?.type === 'rename' && modalSpace && (
        <DaisyModal
          title="Renommer l'espace"
          inputLabel="Nouveau nom"
          initialValue={modalSpace.nom}
          confirmLabel="Renommer"
          onClose={closeModal}
          onConfirm={async nom => {
            const updated = await renameEspace(modal.spaceId, nom);
            updateSpace(modal.spaceId, s => ({ ...s, nom: updated.nom }));
            closeModal();
          }}
        />
      )}

      {modal?.type === 'delete-space' && modalSpace && (
        <DaisyModal
          title="Supprimer l'espace"
          confirmLabel="Supprimer"
          danger
          onClose={closeModal}
          onConfirm={async () => {
            await deleteEspace(modal.spaceId);
            setSpaces(prev => prev.filter(s => s.id !== modal.spaceId));
            closeModal();
          }}
        >
          <p className="text-sm text-gray-500 mb-4">
            Supprimer <strong>{modalSpace.nom}</strong> et tous ses documents ? Cette action est irréversible.
          </p>
        </DaisyModal>
      )}

      {modal?.type === 'delete-doc' && (
        <DaisyModal
          title="Supprimer le document"
          confirmLabel="Supprimer"
          danger
          onClose={closeModal}
          onConfirm={async () => {
            await deleteDocumentAdmin(modal.doc.id);
            updateSpace(modal.spaceId, s => ({
              ...s,
              documents: s.documents.filter(d => d.id !== modal.doc.id),
            }));
            closeModal();
          }}
        >
          <p className="text-sm text-gray-500 mb-4">
            Supprimer <strong>{modal.doc.titre}</strong> ?
          </p>
        </DaisyModal>
      )}
    </>
  );
}

// ── Vue Élève : « Mes documents » + documents de l'école ────────────────────
function DocumentsEleve() {
  const documents = useAsync(getDocumentsEleve);
  const liste = documents.data ?? [];
  const setDocuments = documents.setData;
  const [openSpaces, setOpenSpaces] = useState(() => new Set());
  const [modal, setModal] = useState(null);
  const closeModal = () => setModal(null);

  const mesDocs = useMemo(() => liste.filter(d => d.depose_par_moi), [liste]);
  const espacesEcole = useMemo(() => {
    const map = new Map();
    for (const doc of liste) {
      if (doc.depose_par_moi) continue;
      const key = doc.espace || 'Général';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(doc);
    }
    return [...map.entries()].map(([nom, docs]) => ({ nom, docs }));
  }, [liste]);

  function toggleSpace(nom) {
    setOpenSpaces(prev => {
      const next = new Set(prev);
      if (next.has(nom)) next.delete(nom); else next.add(nom);
      return next;
    });
  }

  return (
    <>
      <main className="flex-1 overflow-y-auto p-6 bg-[#F5F5F5]">
        <h1 className="text-3xl font-bold mb-6 text-[#07A6A6]">Page Documents</h1>

        {/* Espace personnel « Mes documents » */}
        <section className="bg-white p-6 rounded-lg shadow-md mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <div>
              <h2 className="text-xl font-bold text-[var(--color-principal)]">Mes documents</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Espace personnel pour déposer vos documents. Pour rendre un devoir en ligne, utilisez la page{' '}
                <Link to="/devoirs" className="text-[#07A6A6] font-semibold hover:underline">Devoirs</Link>.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setModal({ type: 'upload' })}
              className="inline-flex items-center gap-2 bg-[#E8735A] text-white font-semibold text-sm px-4 py-2 rounded-full hover:brightness-90 transition"
            >
              Déposer un document
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          <DataState state={documents}>{() => (
            mesDocs.length === 0
              ? <p className="text-gray-400 italic text-sm py-3">Vous n&apos;avez encore déposé aucun document personnel.</p>
              : (
                <div className="flex flex-col divide-y divide-gray-100 mt-3">
                  {mesDocs.map(doc => (
                    <DocumentRow
                      key={doc.id}
                      doc={doc}
                      onDelete={() => setModal({ type: 'delete', doc })}
                    />
                  ))}
                </div>
              )
          )}</DataState>
        </section>

        {/* Espaces de l'école (généraux ou attribués à l'élève par l'administration) */}
        <section className="flex flex-col gap-4 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-[var(--color-principal)]">Documents de l&apos;école</h2>
          <DataState state={documents}>{() => (
            espacesEcole.length === 0
              ? <p className="text-sm text-gray-500 py-2">Aucun document disponible pour le moment.</p>
              : espacesEcole.map(space => {
                  const isOpen = openSpaces.has(space.nom);
                  return (
                    <div key={space.nom} className="border border-base-300 rounded-lg overflow-hidden bg-base-100">
                      <div
                        onClick={() => toggleSpace(space.nom)}
                        className="flex items-center justify-between gap-2 px-4 py-3 cursor-pointer select-none hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="shrink-0 text-gray-400"><ChevronIcon open={isOpen} /></span>
                          <span className="font-semibold truncate">{space.nom}</span>
                        </div>
                        <span className="text-xs text-gray-400 shrink-0">{space.docs.length}</span>
                      </div>

                      {isOpen && (
                        <div className="border-t border-base-300 px-4 pb-3 pt-2 flex flex-col divide-y divide-gray-100">
                          {space.docs.map(doc => (
                            <DocumentRow
                              key={doc.id}
                              doc={doc}
                              badge={doc.personnel ? 'Personnel' : null}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
          )}</DataState>
        </section>
      </main>

      {modal?.type === 'upload' && (
        <UploadDocumentModal
          title="Déposer un document personnel"
          spaceName="Mes documents"
          onClose={closeModal}
          onUpload={async ({ fichier, titre }) => {
            const doc = await uploadDocumentEleve({ fichier, titre });
            setDocuments(prev => [doc, ...(prev ?? [])]);
            closeModal();
          }}
        />
      )}

      {modal?.type === 'delete' && (
        <DaisyModal
          title="Supprimer le document"
          confirmLabel="Supprimer"
          danger
          onClose={closeModal}
          onConfirm={async () => {
            await deleteDocumentEleve(modal.doc.id);
            setDocuments(prev => (prev ?? []).filter(d => d.id !== modal.doc.id));
            closeModal();
          }}
        >
          <p className="text-sm text-gray-500 mb-4">
            Supprimer <strong>{modal.doc.titre}</strong> de vos documents ?
          </p>
        </DaisyModal>
      )}
    </>
  );
}

// Consultation / espace « Mes documents » pour l'élève ; gestion complète avec `documents_gerer`
export default function Documents() {
  const { can } = useAuth();
  return can('documents_gerer') ? <DocumentsAdmin /> : <DocumentsEleve />;
}
