import { useEffect, useRef, useState } from 'react';
import '@tabler/icons-webfont/dist/tabler-icons.min.css';
import DataState from '@/components/ui/DataState.jsx';
import Modal from '@/components/ui/Modal.jsx';
import { useAsync } from '@/hooks/useAsync.js';
import {
  createActualite, deleteActualite, getActualites, STATUTS_ACTUALITE, updateActualite,
} from '@/services/actualites.js';

const STATUT_CLASSES = {
  'Publié':    'text-teal-700 bg-teal-50 border border-teal-200',
  'Brouillon': 'text-amber-700 bg-amber-50 border border-amber-200',
  'Archivé':   'text-gray-500 bg-gray-100 border border-gray-300',
};

const Icon = ({ name, size, className = '' }) => (
  <i className={`ti ti-${name} ${className}`} style={size ? { fontSize: size } : undefined} aria-hidden="true" />
);

// ── Helper : lire un fichier image en base64 ────────────────────────────────
function lireImageBase64(file) {
  return new Promise(resolve => {
    if (!file) { resolve(null); return; }
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.readAsDataURL(file);
  });
}

// ── Coque de modale (fond + boîte) ──────────────────────────────────────────
function ModalShell({ onClose, maxWidth = 'max-w-lg', children }) {
  return (
    <Modal onClose={onClose} className={`${maxWidth} rounded-2xl overflow-hidden`}>
      {children}
    </Modal>
  );
}

function ModalHeader({ icon, title, color = 'text-teal-700', onClose }) {
  return (
    <div className="flex items-center justify-between">
      <h3 className={`text-xl font-semibold ${color} flex items-center gap-2`}>
        <Icon name={icon} size={20} />
        {title}
      </h3>
      <button onClick={onClose} className="inline-flex items-center justify-center text-gray-400 hover:text-gray-700 text-2xl font-bold leading-none">
        <i className="ti ti-x" aria-label="Fermer" />
      </button>
    </div>
  );
}

const inputBase = 'w-full border rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-teal-500 transition-colors';
const fieldClass = invalide => `${inputBase} ${invalide ? 'border-red-400 bg-red-50' : 'border-gray-300'}`;
const labelClass = 'text-xs font-medium text-gray-500 uppercase tracking-wider';
const Requis = () => <span className="text-red-500">*</span>;

// ── Formulaire article (création / modification) ────────────────────────────
// `actu` absent → création (date + photo obligatoires)
function ArticleForm({ actu, onSubmit, onClose }) {
  const creation = !actu;
  const [titre, setTitre] = useState(actu?.titre ?? '');
  const [date, setDate] = useState('');
  const [statut, setStatut] = useState(actu?.statut ?? 'Publié');
  const [contenu, setContenu] = useState(actu?.contenu ?? '');
  const [auteur, setAuteur] = useState(actu?.auteur ?? '');
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(actu?.image || '');
  const [erreurs, setErreurs] = useState({});

  // Libère l'URL temporaire de l'aperçu
  useEffect(() => () => { if (preview.startsWith('blob:')) URL.revokeObjectURL(preview); }, [preview]);

  function choisirPhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  }

  async function valider() {
    const errs = {
      titre:   !titre.trim(),
      contenu: !contenu.trim(),
      auteur:  !auteur.trim(),
      ...(creation && { date: !date, photo: !photo }),
    };
    setErreurs(errs);
    if (Object.values(errs).some(Boolean)) return;

    const image = await lireImageBase64(photo);
    onSubmit({
      titre: titre.trim(),
      statut,
      contenu: contenu.trim(),
      auteur: auteur.trim(),
      ...(image && { image }),
      ...(creation && { date: new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) }),
    });
  }

  return (
    <ModalShell onClose={onClose}>
      <div className="p-6 flex flex-col gap-5">
        <ModalHeader icon={creation ? 'news' : 'edit'} title={creation ? 'Créer un article' : "Modifier l'article"} onClose={onClose} />

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Titre <Requis /></label>
            <input type="text" placeholder={creation ? "Titre de l'actualité" : undefined} value={titre} onChange={e => setTitre(e.target.value)} className={fieldClass(erreurs.titre)} />
          </div>
          {creation && (
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Date <Requis /></label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className={fieldClass(erreurs.date)} />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Statut</label>
            <select value={statut} onChange={e => setStatut(e.target.value)} className={fieldClass(false)}>
              {STATUTS_ACTUALITE.map(st => <option key={st} value={st}>{st}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Contenu <Requis /></label>
            <textarea rows={4} placeholder={creation ? "Contenu de l'article..." : undefined} value={contenu} onChange={e => setContenu(e.target.value)} className={`${fieldClass(erreurs.contenu)} resize-none`} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Auteur <Requis /></label>
            <input type="text" placeholder={creation ? "Nom de l'auteur" : undefined} value={auteur} onChange={e => setAuteur(e.target.value)} className={fieldClass(erreurs.auteur)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Photo de l'article {creation && <Requis />}</label>
            <label
              className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-xl cursor-pointer hover:border-teal-400 hover:bg-teal-50 transition-colors group relative overflow-hidden ${erreurs.photo ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
            >
              {preview ? (
                <img src={preview} alt="Aperçu" className="absolute inset-0 w-full h-full object-cover rounded-xl" />
              ) : (
                <div className="flex flex-col items-center gap-1 text-gray-400 group-hover:text-teal-500 transition-colors">
                  <Icon name="photo-up" size={28} />
                  <span className="text-xs font-medium">{creation ? 'Cliquer pour choisir une image' : 'Changer la photo'}</span>
                  <span className="text-[11px] text-gray-300">JPG, PNG, WEBP — max 2 Mo</span>
                </div>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={choisirPhoto} />
            </label>
          </div>
        </div>

        {Object.values(erreurs).some(Boolean) && (
          <div className="text-xs text-red-500 font-medium flex items-center gap-1">
            <Icon name="alert-circle" size={14} />
            Veuillez remplir tous les champs.
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-black/10">
          <button onClick={onClose} className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 border border-gray-300 rounded-full px-4 py-1.5 hover:bg-gray-100 transition-colors">
            <Icon name="x" size={14} />
            Annuler
          </button>
          {creation ? (
            <button onClick={valider} className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-[#E8735A] rounded-full px-4 py-1.5 hover:brightness-90 transition-colors">
              <Icon name="send" size={14} />
              Publier l'article
            </button>
          ) : (
            <button onClick={valider} className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-teal-600 rounded-full px-4 py-1.5 hover:bg-teal-700 transition-colors">
              <Icon name="check" size={14} />
              Enregistrer
            </button>
          )}
        </div>
      </div>
    </ModalShell>
  );
}

// ── Modale détail ───────────────────────────────────────────────────────────
function DetailModal({ actu, onClose, onDelete, onEdit }) {
  return (
    <ModalShell onClose={onClose}>
      <div className="w-full h-48 bg-gray-300 overflow-hidden">
        <img src={actu.image || undefined} alt="Image actualité" className="w-full h-full object-cover" />
      </div>
      <div className="p-6 flex flex-col gap-4">
        <h3 className="text-xl font-semibold text-teal-700">{actu.titre}</h3>
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`text-[11px] font-medium px-3 py-0.5 rounded-full ${STATUT_CLASSES[actu.statut] ?? ''}`}>{actu.statut}</span>
          <span className="text-xs text-gray-400">•</span>
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Icon name="calendar" size={13} />
            {actu.date}
          </span>
          <span className="text-xs text-gray-400">•</span>
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Icon name="user" size={13} />
            Par <span className="font-medium ml-1">{actu.auteur}</span>
          </span>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed">{actu.contenu}</p>
        <div className="flex justify-between gap-2 pt-2 border-t border-black/10">
          <button onClick={onDelete} className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-red-500 rounded-full px-4 py-1.5 hover:bg-red-600 transition-colors">
            <Icon name="trash" size={14} />
            Supprimer
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 border border-gray-300 rounded-full px-4 py-1.5 hover:bg-gray-100 transition-colors">
              <Icon name="x" size={14} />
              Fermer
            </button>
            <button onClick={onEdit} className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-teal-600 rounded-full px-4 py-1.5 hover:bg-teal-700 transition-colors">
              <Icon name="edit" size={14} />
              Modifier
            </button>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

// ── Modale recherche ────────────────────────────────────────────────────────
function SearchModal({ actualites, onClose, onSelect }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  useEffect(() => { const t = setTimeout(() => inputRef.current?.focus(), 100); return () => clearTimeout(t); }, []);

  const q = query.toLowerCase();
  const found = actualites.filter(a =>
    a.titre.toLowerCase().includes(q) || a.contenu.toLowerCase().includes(q) || a.auteur.toLowerCase().includes(q),
  );

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-md">
      <div className="p-6 flex flex-col gap-5">
        <ModalHeader icon="search" title="Rechercher" color="text-[#F0B429]" onClose={onClose} />
        <div className="relative">
          <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher une actualité..."
            className="w-full border border-gray-300 rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-[#F0B429] transition-colors"
          />
        </div>
        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
          {!query ? (
            <p className="text-sm text-gray-400">Tapez pour rechercher...</p>
          ) : found.length === 0 ? (
            <p className="text-sm text-gray-400">Aucun résultat trouvé.</p>
          ) : (
            found.map(a => (
              <div
                key={a.id}
                onClick={() => onSelect(a.id)}
                className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-teal-700">{a.titre}</p>
                  <p className="text-xs text-gray-400">{a.date} · {a.auteur}</p>
                </div>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUT_CLASSES[a.statut] ?? ''}`}>{a.statut}</span>
              </div>
            ))
          )}
        </div>
        <div className="flex justify-end pt-2 border-t border-black/10">
          <button onClick={onClose} className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 border border-gray-300 rounded-full px-4 py-1.5 hover:bg-gray-100 transition-colors">
            <Icon name="x" size={14} />
            Fermer
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function Actualites() {
  const actualites = useAsync(getActualites);
  const liste = actualites.data ?? [];
  // modale courante : { type: 'detail' | 'modifier' | 'creer' | 'rechercher', id? }
  const [modal, setModal] = useState(null);
  const closeModal = () => setModal(null);

  const courante = liste.find(a => a.id === modal?.id);

  async function creer(data) {
    const actu = await createActualite(data);
    actualites.setData(prev => [...prev, actu]);
    closeModal();
  }

  async function modifier(data) {
    const actu = await updateActualite(modal.id, data);
    actualites.setData(prev => prev.map(a => (a.id === actu.id ? actu : a)));
    closeModal();
  }

  async function supprimer() {
    await deleteActualite(modal.id);
    actualites.setData(prev => prev.filter(a => a.id !== modal.id));
    closeModal();
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto p-6 bg-[var(--color-page)]">
        {/* Barre d'actions */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setModal({ type: 'creer' })}
            className="inline-flex items-center gap-2 bg-[#E8735A] text-white font-semibold text-base px-5 py-2.5 rounded-full hover:brightness-90 transition"
          >
            <Icon name="news" size={18} />
            Créer un article
            <Icon name="plus" size={18} />
          </button>
          <button
            onClick={() => setModal({ type: 'rechercher' })}
            className="inline-flex items-center gap-2 bg-[#F0B429] text-white font-semibold text-base px-5 py-2.5 rounded-full hover:brightness-90 transition"
          >
            <Icon name="search" size={18} />
            Rechercher
          </button>
        </div>

        {/* Grille */}
        <DataState state={actualites}>{() => (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {liste.map(actu => (
              <div
                key={actu.id}
                className="bg-gray-200 rounded-3xl p-5 border border-black/[0.08] flex flex-col gap-4 hover:-translate-y-1 transition-transform duration-200"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 bg-teal-600 text-white text-[11px] font-medium px-3 py-1 rounded-full uppercase tracking-wide">
                    <Icon name="news" size={12} />
                    Actualité
                  </span>
                  <span className="text-xs text-gray-500">{actu.date}</span>
                </div>
                <h2 className="text-lg font-semibold text-teal-700 leading-snug">{actu.titre}</h2>
                <div className="flex gap-3 items-start">
                  <p className="flex-1 text-sm text-gray-600 leading-relaxed line-clamp-3">{actu.contenu}</p>
                  <div className="w-[100px] h-[80px] rounded-xl overflow-hidden flex-shrink-0 bg-gray-400">
                    <img src={actu.image || undefined} alt="Actualité" className="w-full h-full object-cover" />
                  </div>
                </div>
                <div className="border-t border-black/10 pt-3 flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${STATUT_CLASSES[actu.statut] ?? ''}`}>{actu.statut}</span>
                    <span className="text-[11px] text-gray-400">Par {actu.auteur}</span>
                  </div>
                  <button
                    onClick={() => setModal({ type: 'detail', id: actu.id })}
                    className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 border border-teal-700 rounded-full px-3 py-1 hover:bg-teal-50 transition-colors"
                  >
                    + d'informations
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}</DataState>
      </div>

      {modal?.type === 'creer' && <ArticleForm onSubmit={creer} onClose={closeModal} />}
      {modal?.type === 'modifier' && courante && <ArticleForm actu={courante} onSubmit={modifier} onClose={closeModal} />}
      {modal?.type === 'detail' && courante && (
        <DetailModal
          actu={courante}
          onClose={closeModal}
          onDelete={supprimer}
          onEdit={() => setModal({ type: 'modifier', id: courante.id })}
        />
      )}
      {modal?.type === 'rechercher' && (
        <SearchModal actualites={liste} onClose={closeModal} onSelect={id => setModal({ type: 'detail', id })} />
      )}
    </>
  );
}
