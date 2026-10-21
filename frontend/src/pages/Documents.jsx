import { useState } from 'react';
import DataState from '@/components/ui/DataState.jsx';
import Modal from '@/components/ui/Modal.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { useAsync } from '@/hooks/useAsync.js';
import { getEspaces } from '@/services/documents.js';

let nextId = 1000;
const newId = () => nextId++;

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

const ChevronIcon = ({ open }) => (
  <svg
    className="transition-transform duration-200"
    style={{ transform: open ? 'rotate(180deg)' : undefined }}
    xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

// ── Modale de saisie / confirmation ────────────────────────────────────────────────
// Si `inputLabel` est fourni, la modale contient un champ texte et `onConfirm`
// reçoit sa valeur (validation aussi avec Entrée).
function DaisyModal({ title, children, inputLabel, initialValue = '', confirmLabel, danger = false, onConfirm, onClose }) {
  const [value, setValue] = useState(initialValue);
  const confirm = () => onConfirm(value.trim());

  return (
    <Modal onClose={onClose} className="max-w-sm rounded-2xl p-6">
      <h3 className={`font-semibold text-lg ${inputLabel ? 'mb-4' : 'mb-2'}`}>{title}</h3>
      {children}
      {inputLabel && (
        <input
          autoFocus
          type="text"
          placeholder={inputLabel}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') confirm(); }}
          className="input input-bordered w-full mb-4"
        />
      )}
      <div className="modal-action">
        <button onClick={onClose} className="btn btn-ghost">Annuler</button>
        <button
          onClick={confirm}
          className={`btn text-white ${danger ? 'bg-[#EC6F6F] hover:bg-[#EC6F6F]/90' : 'bg-[#07A6A6] hover:bg-[#07A6A6]/90'}`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

// Consultation pour tous ; ajout / renommage / suppression avec le droit `documents_gerer`
export default function Documents() {
  const { can } = useAuth();
  const gerer = can('documents_gerer');
  const espaces = useAsync(getEspaces);
  const spaces = espaces.data ?? [];
  const setSpaces = espaces.setData;
  const [openIds, setOpenIds] = useState(() => new Set());
  // modale courante : { type, spaceId?, doc? }
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

        {gerer && <div className="flex gap-5 flex-wrap mb-4">
          <button
            onClick={() => setModal({ type: 'space' })}
            className="inline-flex items-center gap-2 bg-[#E8735A] text-white font-semibold text-base px-5 py-2.5 rounded-full hover:brightness-90 transition"
          >
            Ajouter un espace
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>}

        <section className="flex flex-col gap-4 bg-white p-6 rounded-lg shadow-md">
          <DataState state={espaces}>{() => spaces.map(space => {
            const isOpen = openIds.has(space.id);
            return (
              <div key={space.id} className="border border-base-300 rounded-lg overflow-hidden bg-base-100">
                {/* en-tête cliquable */}
                <div
                  onClick={() => toggle(space.id)}
                  className="flex items-center justify-between gap-2 px-4 py-3 cursor-pointer select-none hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="shrink-0 text-gray-400"><ChevronIcon open={isOpen} /></span>
                    <span className="font-semibold truncate">{space.name}</span>
                  </div>
                  {gerer && <div className="flex items-center gap-1 shrink-0">
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
                  </div>}
                </div>

                {/* corps */}
                {isOpen && (
                  <div className="border-t border-base-300 px-4 pb-4 pt-3 flex flex-col gap-1">
                    <div className="flex flex-col divide-y divide-gray-100">
                      {space.docs.map(doc => (
                        <div key={doc.id} className="flex items-center justify-between gap-2 py-1">
                          <span className="flex items-center gap-2 text-sm text-gray-700">
                            <FolderIcon />
                            <span>{doc.name}</span>
                          </span>
                          {gerer && <button
                            type="button"
                            title="Supprimer ce document"
                            onClick={() => setModal({ type: 'delete-doc', spaceId: space.id, doc })}
                            className="text-gray-400 hover:text-[#EC6F6F] transition-colors"
                          >
                            <TrashIcon />
                          </button>}
                        </div>
                      ))}
                    </div>
                    {space.docs.length === 0 && (
                      <p className="text-gray-400 italic text-xs py-1">Aucun document dans cet espace.</p>
                    )}
                    {gerer && <button
                      type="button"
                      onClick={() => setModal({ type: 'doc', spaceId: space.id })}
                      className="btn btn-xs bg-[#07A6A6] hover:bg-[#07A6A6]/90 text-white font-bold self-start mt-3"
                    >
                      + Ajouter un document
                    </button>}
                  </div>
                )}
              </div>
            );
          })}</DataState>
        </section>
      </main>

      {/* ═══════════════ MODALES ═══════════════ */}
      {modal?.type === 'space' && (
        <DaisyModal
          title="Nouvel espace"
          inputLabel="Nom de l'espace"
          confirmLabel="Créer"
          onClose={closeModal}
          onConfirm={name => {
            if (!name) return;
            setSpaces(prev => [...prev, { id: newId(), name, docs: [] }]);
            closeModal();
          }}
        />
      )}

      {modal?.type === 'doc' && (
        <DaisyModal
          title="Ajouter un document"
          inputLabel="Nom du document"
          confirmLabel="Ajouter"
          onClose={closeModal}
          onConfirm={name => {
            if (!name) return;
            updateSpace(modal.spaceId, s => ({ ...s, docs: [...s.docs, { id: newId(), name }] }));
            closeModal();
          }}
        />
      )}

      {modal?.type === 'rename' && modalSpace && (
        <DaisyModal
          title="Renommer l'espace"
          inputLabel="Nouveau nom"
          initialValue={modalSpace.name}
          confirmLabel="Renommer"
          onClose={closeModal}
          onConfirm={name => {
            if (name) updateSpace(modal.spaceId, s => ({ ...s, name }));
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
          onConfirm={() => {
            setSpaces(prev => prev.filter(s => s.id !== modal.spaceId));
            closeModal();
          }}
        >
          <p className="text-sm text-gray-500 mb-4">
            Supprimer <strong>{modalSpace.name}</strong> et tous ses documents ? Cette action est irréversible.
          </p>
        </DaisyModal>
      )}

      {modal?.type === 'delete-doc' && (
        <DaisyModal
          title="Supprimer le document"
          confirmLabel="Supprimer"
          danger
          onClose={closeModal}
          onConfirm={() => {
            updateSpace(modal.spaceId, s => ({ ...s, docs: s.docs.filter(d => d.id !== modal.doc.id) }));
            closeModal();
          }}
        >
          <p className="text-sm text-gray-500 mb-4">
            Supprimer <strong>{modal.doc.name}</strong> ?
          </p>
        </DaisyModal>
      )}
    </>
  );
}
