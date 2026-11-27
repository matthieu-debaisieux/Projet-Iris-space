import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DataState from '@/components/ui/DataState.jsx';
import Modal from '@/components/ui/Modal.jsx';
import SelonDroit from '@/components/auth/SelonDroit.jsx';
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

// ── Règles de dépôt (alignées sur backend/routes/helpers.php) ───────────────
const TAILLE_MAX = 10 * 1024 * 1024; // 10 Mo
const EXTENSIONS_AUTORISEES = [
  'pdf', 'txt', 'csv', 'zip',
  'doc', 'docx', 'odt', 'xls', 'xlsx', 'ods', 'ppt', 'pptx', 'odp',
  'jpg', 'jpeg', 'png', 'gif', 'webp',
];
const ACCEPT = EXTENSIONS_AUTORISEES.map(e => `.${e}`).join(',');

const extension = nom => (nom.includes('.') ? nom.split('.').pop().toLowerCase() : '');
const formaterTaille = o => (o < 1024 * 1024 ? `${Math.max(1, Math.round(o / 1024))} Ko` : `${(o / 1024 / 1024).toFixed(1)} Mo`);

function verifierFichier(file) {
  if (!file) return 'Sélectionnez un fichier à envoyer.';
  const ext = extension(file.name);
  if (!EXTENSIONS_AUTORISEES.includes(ext)) {
    return `Format non autorisé (.${ext || '?'}). Formats acceptés : PDF, bureautique, images, texte, zip.`;
  }
  if (file.size === 0) return 'Le fichier est vide.';
  if (file.size > TAILLE_MAX) return `Fichier trop lourd (${formaterTaille(file.size)}). Maximum : 10 Mo.`;
  return '';
}

function formaterDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('fr-FR');
}

// ── Icônes et styles partagés ───────────────────────────────────────────────
const Svg = ({ d, size = 16, className = '' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d={d} /></svg>
);
const ICONES = {
  fichier: 'M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z M14 2v6h6',
  telecharger: 'M12 3v12 M7 10l5 5 5-5 M5 21h14',
  deposer: 'M12 15V3 M7 8l5-5 5 5 M5 21h14',
  corbeille: 'M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2',
  chevron: 'M19 9l-7 7-7-7',
  plus: 'M12 5v14 M5 12h14',
  bouclier: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
};

const btnPrincipal = 'inline-flex items-center gap-1.5 rounded-lg bg-[#EC6F6F] px-4 py-2 text-sm font-bold text-[#001257] hover:opacity-90 disabled:opacity-50 transition';
const btnSecondaire = 'inline-flex items-center gap-1.5 rounded-lg border border-[#E1E5EE] bg-white px-4 py-2 text-sm font-semibold text-[#001257] hover:bg-[#EEF1F7] disabled:opacity-50 transition';
const btnDanger = 'inline-flex items-center gap-1.5 rounded-lg bg-[#B23A3A] px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 transition';
const champ = 'w-full rounded-lg border border-[#E1E5EE] bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-[#001257]';

// ── Modale de saisie / confirmation ─────────────────────────────────────────
function Dialogue({ title, children, inputLabel, initialValue = '', confirmLabel, danger = false, onConfirm, onClose }) {
  const [value, setValue] = useState(initialValue);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function confirm(e) {
    e?.preventDefault();
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
    <Modal onClose={() => { if (!busy) onClose(); }} className="max-w-sm rounded-2xl p-6" label={title}>
      <form onSubmit={confirm} className="flex flex-col gap-4">
        <h3 className="text-lg font-bold text-[#001257]">{title}</h3>
        {children}
        {inputLabel && (
          <input
            autoFocus
            type="text"
            placeholder={inputLabel}
            aria-label={inputLabel}
            value={value}
            maxLength={100}
            onChange={e => setValue(e.target.value)}
            className={champ}
            disabled={busy}
          />
        )}
        {error && <p role="alert" className="text-xs text-[#B23A3A]">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className={btnSecondaire}>Annuler</button>
          <button type="submit" disabled={busy} className={danger ? btnDanger : btnPrincipal}>
            {busy ? 'En cours…' : confirmLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Modale d'envoi de document (fichier + titre facultatif + RGPD admin) ────
function UploadDocumentModal({ title, spaceName, requireRgpd = false, onUpload, onClose }) {
  const [fichier, setFichier] = useState(null);
  const [titre, setTitre] = useState('');
  const [confirmeRgpd, setConfirmeRgpd] = useState(!requireRgpd);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function choisirFichier(e) {
    const f = e.target.files?.[0] ?? null;
    if (!f) {
      setFichier(null);
      setError('');
      return;
    }
    const err = verifierFichier(f);
    setError(err);
    setFichier(err ? null : f);
    if (err) e.target.value = '';
  }

  async function submit(e) {
    e.preventDefault();
    if (!fichier && (!USE_MOCKS || !titre.trim())) {
      setError('Sélectionnez un fichier à envoyer.');
      return;
    }
    if (fichier) {
      const err = verifierFichier(fichier);
      if (err) {
        setError(err);
        return;
      }
    }
    if (requireRgpd && !confirmeRgpd) {
      setError('Confirmez la conformité RGPD avant de déposer.');
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
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-bold text-[#001257]">{title}</h3>
          {spaceName && <p className="mt-0.5 text-xs text-[#6B7185]">Espace : {spaceName}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-[#1A1D2E]" htmlFor="doc-file-input">
            Fichier
          </label>
          <input
            id="doc-file-input"
            type="file"
            accept={ACCEPT}
            onChange={choisirFichier}
            className={`${champ} file:mr-3 file:rounded-md file:border-0 file:bg-[#EEF1F7] file:px-3 file:py-1 file:text-xs file:font-semibold file:text-[#001257]`}
            disabled={busy}
          />
          <p className="mt-1 text-xs text-[#6B7185]">10 Mo max — PDF, bureautique, images, texte, zip.</p>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-[#1A1D2E]" htmlFor="doc-title-input">
            Titre affiché (facultatif)
          </label>
          <input
            id="doc-title-input"
            type="text"
            placeholder="Par défaut : le nom du fichier"
            value={titre}
            onChange={e => setTitre(e.target.value)}
            maxLength={200}
            className={champ}
            disabled={busy}
          />
        </div>

        {requireRgpd && (
          <>
            <div className="rounded-xl bg-[#FFF3D6] px-4 py-3 text-xs text-[#8A5A00]">
              <p className="font-semibold">Avant de déposer (RGPD)</p>
              <p className="mt-1">
                Ce document sera téléchargeable par les élèves concernés. Ne déposez ni notes individuelles,
                ni certificats médicaux, ni pièces d&apos;identité, ni coordonnées personnelles inutiles.
              </p>
            </div>
            <label className="flex items-start gap-2 text-xs text-[#1A1D2E]">
              <input
                type="checkbox"
                checked={confirmeRgpd}
                onChange={e => setConfirmeRgpd(e.target.checked)}
                className="mt-0.5"
                disabled={busy}
              />
              <span>Je confirme que ce document respecte les règles de confidentialité et que je suis autorisé(e) à le diffuser.</span>
            </label>
          </>
        )}

        {error && <p role="alert" className="text-xs text-[#B23A3A]">{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className={btnSecondaire}>Annuler</button>
          <button type="submit" disabled={busy || (requireRgpd && !confirmeRgpd)} className={btnPrincipal}>
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
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
      <Svg d={ICONES.fichier} className="shrink-0 text-[#07A6A6]" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <p className="truncate text-sm font-medium text-[#1A1D2E]">{doc.titre}</p>
          {badge && (
            <span className="shrink-0 rounded-full bg-[#07A6A6]/10 px-2 py-0.5 text-[11px] font-medium text-[#07A6A6]">
              {badge}
            </span>
          )}
        </div>
        {dateTexte && <p className="text-xs text-[#6B7185]">{dateTexte}</p>}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {!USE_MOCKS && (
          <a
            href={getDocumentDownloadUrl(doc.id)}
            download
            title="Télécharger ce document"
            className={btnSecondaire}
          >
            <Svg d={ICONES.telecharger} size={15} /> Télécharger
          </a>
        )}
        {onDelete && (
          <button
            type="button"
            aria-label={`Supprimer ${doc.titre}`}
            title="Supprimer ce document"
            onClick={onDelete}
            className="rounded p-1.5 text-[#6B7185] hover:bg-[#FBE6E6] hover:text-[#B23A3A] transition"
          >
            <Svg d={ICONES.corbeille} size={15} />
          </button>
        )}
      </div>
    </li>
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
    setSpaces(prev => (prev ?? []).map(s => (s.id === id ? fn(s) : s)));
  }

  return (
    <>
      <main className="flex-1 overflow-y-auto bg-[var(--color-page)]">
        <div className="mx-auto w-full max-w-[1000px] px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#001257]">Documents</h1>
              <p className="mt-1 text-sm text-[#6B7185]">
                Déposez et organisez les documents de l&apos;établissement.
              </p>
            </div>
            <button type="button" onClick={() => setModal({ type: 'space' })} className={btnPrincipal}>
              <Svg d={ICONES.plus} /> Ajouter un espace
            </button>
          </div>

          <DataState state={espaces}>{() => (
            spaces.length === 0 ? (
              <p className="py-12 text-center text-sm text-[#6B7185]">Aucun espace documentaire pour le moment.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {spaces.map(space => {
                  const isOpen = openIds.has(space.id);
                  return (
                    <section key={space.id} className="bg-white rounded-2xl border border-[#E1E5EE] overflow-hidden">
                      <div className="flex items-center gap-2 px-4 py-3">
                        <button
                          type="button"
                          onClick={() => toggle(space.id)}
                          aria-expanded={isOpen}
                          className="flex flex-1 min-w-0 items-center gap-2 text-left"
                        >
                          <Svg d={ICONES.chevron} className={`shrink-0 text-[#6B7185] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                          <span className="truncate font-semibold text-[#001257]">{space.nom}</span>
                          <span className="shrink-0 rounded-full bg-[#EEF1F7] px-2 py-0.5 text-xs text-[#6B7185]">{space.documents.length}</span>
                        </button>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setModal({ type: 'rename', spaceId: space.id })}
                            className="rounded px-2 py-1 text-xs font-semibold text-[#001257] hover:bg-[#EEF1F7] transition"
                          >
                            Renommer
                          </button>
                          <button
                            type="button"
                            aria-label={`Supprimer l'espace ${space.nom}`}
                            title="Supprimer cet espace"
                            onClick={() => setModal({ type: 'delete-space', spaceId: space.id })}
                            className="rounded p-1.5 text-[#6B7185] hover:bg-[#FBE6E6] hover:text-[#B23A3A] transition"
                          >
                            <Svg d={ICONES.corbeille} size={15} />
                          </button>
                        </div>
                      </div>

                      {isOpen && (
                        <div className="border-t border-[#E1E5EE] px-4 py-3">
                          {space.documents.length > 0 ? (
                            <ul className="divide-y divide-[#E1E5EE]">
                              {space.documents.map(doc => (
                                <DocumentRow
                                  key={doc.id}
                                  doc={doc}
                                  badge={doc.utilisateur_id ? 'Privé' : null}
                                  onDelete={() => setModal({ type: 'delete-doc', spaceId: space.id, doc })}
                                />
                              ))}
                            </ul>
                          ) : (
                            <p className="py-2 text-xs italic text-[#6B7185]">Aucun document dans cet espace.</p>
                          )}
                          <button
                            type="button"
                            onClick={() => setModal({ type: 'doc', spaceId: space.id })}
                            className={`${btnSecondaire} mt-3`}
                          >
                            <Svg d={ICONES.deposer} size={15} /> Déposer un document
                          </button>
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            )
          )}</DataState>
        </div>
      </main>

      {modal?.type === 'space' && (
        <Dialogue
          title="Nouvel espace"
          inputLabel="Nom de l'espace"
          confirmLabel="Créer"
          onClose={closeModal}
          onConfirm={async nom => {
            const created = await createEspace(nom);
            setSpaces(prev => [...(prev ?? []), created].sort((a, b) => a.nom.localeCompare(b.nom, 'fr')));
            closeModal();
          }}
        />
      )}

      {modal?.type === 'doc' && modalSpace && (
        <UploadDocumentModal
          title="Déposer un document"
          spaceName={modalSpace.nom}
          requireRgpd
          onClose={closeModal}
          onUpload={async ({ fichier, titre }) => {
            const doc = await uploadDocumentAdmin(modal.spaceId, { fichier, titre });
            updateSpace(modal.spaceId, s => ({ ...s, documents: [...s.documents, doc] }));
            closeModal();
          }}
        />
      )}

      {modal?.type === 'rename' && modalSpace && (
        <Dialogue
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
        <Dialogue
          title="Supprimer l'espace"
          confirmLabel="Supprimer"
          danger
          onClose={closeModal}
          onConfirm={async () => {
            await deleteEspace(modal.spaceId);
            setSpaces(prev => (prev ?? []).filter(s => s.id !== modal.spaceId));
            closeModal();
          }}
        >
          <p className="text-sm text-[#6B7185]">
            Supprimer <strong>{modalSpace.nom}</strong> et tous ses documents ? Cette action est irréversible.
          </p>
        </Dialogue>
      )}

      {modal?.type === 'delete-doc' && (
        <Dialogue
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
          <p className="text-sm text-[#6B7185]">
            Supprimer <strong>{modal.doc.titre}</strong> ?
          </p>
        </Dialogue>
      )}
    </>
  );
}

// ── Vue Élève : « Mes documents » + documents de l'établissement ────────────
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
      <main className="flex-1 overflow-y-auto bg-[var(--color-page)]">
        <div className="mx-auto w-full max-w-[1000px] px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#001257]">Documents</h1>
            <p className="mt-1 text-sm text-[#6B7185]">
              Retrouvez vos documents personnels et téléchargez les documents de l&apos;établissement.
            </p>
          </div>

          {/* Espace personnel « Mes documents » */}
          <section className="bg-white rounded-2xl border border-[#E1E5EE] p-5 flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[#001257]">Mes documents</h2>
                <p className="text-xs text-[#6B7185] mt-0.5">
                  Espace personnel pour déposer vos documents. Pour rendre un devoir en ligne, utilisez la page{' '}
                  <Link to="/devoirs" className="text-[#07A6A6] font-semibold hover:underline">Devoirs</Link>.
                </p>
              </div>
              <button type="button" onClick={() => setModal({ type: 'upload' })} className={btnPrincipal}>
                <Svg d={ICONES.deposer} size={15} /> Déposer un document
              </button>
            </div>

            <DataState state={documents}>{() => (
              mesDocs.length === 0 ? (
                <p className="py-2 text-xs italic text-[#6B7185]">Vous n&apos;avez encore déposé aucun document personnel.</p>
              ) : (
                <ul className="divide-y divide-[#E1E5EE]">
                  {mesDocs.map(doc => (
                    <DocumentRow
                      key={doc.id}
                      doc={doc}
                      onDelete={() => setModal({ type: 'delete', doc })}
                    />
                  ))}
                </ul>
              )
            )}</DataState>
          </section>

          {/* Documents de l'établissement */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <h2 className="text-lg font-bold text-[#001257]">Documents de l&apos;établissement</h2>
              <p className="flex items-start gap-2 rounded-xl bg-[#EEF1F7] px-4 py-3 text-xs text-[#1A1D2E]">
                <Svg d={ICONES.bouclier} size={16} className="mt-0.5 shrink-0 text-[#001257]" />
                Les documents de l&apos;établissement sont en lecture et téléchargement uniquement. Seule l&apos;administration peut en déposer.
              </p>
            </div>

            <DataState state={documents}>{() => (
              espacesEcole.length === 0 ? (
                <p className="py-8 text-center text-sm text-[#6B7185]">Aucun document disponible pour le moment.</p>
              ) : (
                espacesEcole.map(space => {
                  const isOpen = openSpaces.has(space.nom);
                  return (
                    <section key={space.nom} className="bg-white rounded-2xl border border-[#E1E5EE] overflow-hidden">
                      <div className="flex items-center gap-2 px-4 py-3">
                        <button
                          type="button"
                          onClick={() => toggleSpace(space.nom)}
                          aria-expanded={isOpen}
                          className="flex flex-1 min-w-0 items-center gap-2 text-left"
                        >
                          <Svg d={ICONES.chevron} className={`shrink-0 text-[#6B7185] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                          <span className="truncate font-semibold text-[#001257]">{space.nom}</span>
                          <span className="shrink-0 rounded-full bg-[#EEF1F7] px-2 py-0.5 text-xs text-[#6B7185]">{space.docs.length}</span>
                        </button>
                      </div>

                      {isOpen && (
                        <div className="border-t border-[#E1E5EE] px-4 py-3">
                          <ul className="divide-y divide-[#E1E5EE]">
                            {space.docs.map(doc => (
                              <DocumentRow
                                key={doc.id}
                                doc={doc}
                                badge={doc.personnel ? 'Personnel' : null}
                              />
                            ))}
                          </ul>
                        </div>
                      )}
                    </section>
                  );
                })
              )
            )}</DataState>
          </div>
        </div>
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
        <Dialogue
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
          <p className="text-sm text-[#6B7185]">
            Supprimer <strong>{modal.doc.titre}</strong> de vos documents ?
          </p>
        </Dialogue>
      )}
    </>
  );
}

// Consultation / espace « Mes documents » pour l'élève ; gestion complète avec `documents_gerer`
export default function Documents() {
  return (
    <SelonDroit
      vues={[{ droit: 'documents_gerer', Vue: DocumentsAdmin }]}
      defaut={DocumentsEleve}
    />
  );
}
