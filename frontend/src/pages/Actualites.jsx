import { useEffect, useState } from 'react';
import '@tabler/icons-webfont/dist/tabler-icons.min.css';
import Modal from '@/components/ui/Modal.jsx';
import { useAuth } from '@/context/AuthContext.jsx';

// ─────────────────────────────────────────────────────────────────────────────
// Version SANS base de données : les actualités vivent en mémoire (elles
// reviennent à l'état initial au rechargement). Quand la base sera prête :
//   1. remplacer DONNEES_TEST par la liste venant de ton service
//   2. dans creer / modifier / supprimer, appeler l'API avant de mettre à jour la liste
// ─────────────────────────────────────────────────────────────────────────────
const DONNEES_TEST = [
  { id: 0, titre: 'Actualité #0', date: '24 juin 2026', statut: 'Publié',    image: '', contenu: "Contenu complet de l'actualité #0.", auteur: 'Admin' },
  { id: 1, titre: 'Actualité #1', date: '20 juin 2026', statut: 'Brouillon', image: '', contenu: "Contenu complet de l'actualité #1.", auteur: 'Admin' },
  { id: 2, titre: 'Actualité #2', date: '15 juin 2026', statut: 'Archivé',   image: '', contenu: "Contenu complet de l'actualité #2.", auteur: 'Admin' },
  { id: 3, titre: 'Actualité #3', date: '10 juin 2026', statut: 'Publié',    image: '', contenu: "Contenu complet de l'actualité #3.", auteur: 'Admin' },
];
const STATUTS = ['Publié', 'Brouillon', 'Archivé'];
const TAILLE_MAX_IMAGE = 2 * 1024 * 1024; // 2 Mo

const STATUT_CLASSES = {
  'Publié':    'bg-[#E3F5EC] text-[#1E7F55]',
  'Brouillon': 'bg-[#FFF3D6] text-[#8A5A00]',
  'Archivé':   'bg-[#EEF1F7] text-[#6B7185]',
};

const Icon = ({ name, size = 16, className = '' }) => (
  <i className={`ti ti-${name} ${className}`} style={{ fontSize: size }} aria-hidden="true" />
);

const lireImage = file => new Promise(resolve => {
  if (!file) return resolve(null);
  const reader = new FileReader();
  reader.onload = e => resolve(e.target.result);
  reader.readAsDataURL(file);
});
const dateLongue = iso => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// ── Page ────────────────────────────────────────────────────────────────────
// Tout le monde voit les actualités publiées ; avec le droit `actualites_gerer`
// on voit aussi les brouillons / archives et on peut créer, modifier, supprimer.
export default function Actualites() {
  const { can } = useAuth();
  const gerer = can('actualites_gerer');

  const [liste, setListe] = useState(DONNEES_TEST);
  const [recherche, setRecherche] = useState('');
  const [modal, setModal] = useState(null); // { type: 'detail' | 'modifier' | 'creer', id? }
  const fermer = () => setModal(null);

  const q = norm(recherche.trim());
  const visibles = liste
    .filter(a => gerer || a.statut === 'Publié')
    .filter(a => !q || [a.titre, a.contenu, a.auteur].some(v => norm(v).includes(q)));
  const courante = liste.find(a => a.id === modal?.id);

  const creer = data => { setListe(l => [{ id: Date.now(), ...data }, ...l]); fermer(); };
  const modifier = data => { setListe(l => l.map(a => (a.id === modal.id ? { ...a, ...data } : a))); fermer(); };
  const supprimer = () => { setListe(l => l.filter(a => a.id !== modal.id)); fermer(); };

  return (
    <>
      <div className="flex-1 overflow-y-auto bg-[var(--color-page)]">
        <div className="mx-auto w-full max-w-[1200px] px-6 py-8 flex flex-col gap-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-[#001257]">Actualités</h1>
              <p className="mt-1 text-sm text-[#6B7185]">Les dernières nouvelles de l'école IRIS Nice.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <label htmlFor="recherche-actus" className="sr-only">Rechercher une actualité</label>
                <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7185]" />
                <input
                  id="recherche-actus"
                  type="search"
                  value={recherche}
                  onChange={e => setRecherche(e.target.value)}
                  placeholder="Rechercher une actualité…"
                  className="w-64 rounded-lg border border-[#E1E5EE] bg-white py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:border-[#001257]"
                />
              </div>
              {gerer && (
                <button
                  onClick={() => setModal({ type: 'creer' })}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#EC6F6F] px-4 py-2.5 text-sm font-bold text-[#001257] hover:opacity-90 transition"
                >
                  <Icon name="plus" /> Créer un article
                </button>
              )}
            </div>
          </div>

          {visibles.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibles.map(actu => (
                <Carte key={actu.id} actu={actu} afficherStatut={gerer} onOuvrir={() => setModal({ type: 'detail', id: actu.id })} />
              ))}
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-[#6B7185]">Aucune actualité à afficher.</p>
          )}
        </div>
      </div>

      {modal?.type === 'creer' && <Formulaire onSubmit={creer} onClose={fermer} />}
      {modal?.type === 'modifier' && courante && <Formulaire actu={courante} onSubmit={modifier} onClose={fermer} />}
      {modal?.type === 'detail' && courante && (
        <Detail
          actu={courante}
          gerer={gerer}
          onClose={fermer}
          onDelete={supprimer}
          onEdit={() => setModal({ type: 'modifier', id: courante.id })}
        />
      )}
    </>
  );
}

// ── Carte d'actualité ───────────────────────────────────────────────────────
function Carte({ actu, afficherStatut, onOuvrir }) {
  return (
    <article className="bg-white rounded-2xl border border-[#E1E5EE] overflow-hidden flex flex-col hover:-translate-y-0.5 transition-transform duration-200">
      <div className="h-40 bg-[#EEF1F7]">
        {actu.image && <img src={actu.image} alt="" className="h-full w-full object-cover" />}
      </div>
      <div className="p-5 flex flex-col gap-2 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wide text-[#07A6A6]">{actu.date}</p>
          {afficherStatut && actu.statut !== 'Publié' && (
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUT_CLASSES[actu.statut]}`}>{actu.statut}</span>
          )}
        </div>
        <h2 className="text-base font-bold text-[#001257] leading-snug">{actu.titre}</h2>
        <p className="text-sm text-[#6B7185] line-clamp-2">{actu.contenu}</p>
        <button
          onClick={onOuvrir}
          className="mt-auto pt-1 self-start text-xs font-bold text-[#001257] hover:underline"
        >
          Lire la suite
        </button>
      </div>
    </article>
  );
}

// ── Détail ──────────────────────────────────────────────────────────────────
function Detail({ actu, gerer, onClose, onDelete, onEdit }) {
  return (
    <Modal onClose={onClose} className="max-w-lg rounded-2xl overflow-hidden" label={actu.titre}>
      <div className="h-44 bg-[#EEF1F7]">
        {actu.image && <img src={actu.image} alt="" className="h-full w-full object-cover" />}
      </div>
      <div className="p-6 flex flex-col gap-4">
        <div className="flex items-center gap-3 flex-wrap text-xs text-[#6B7185]">
          <span className="font-bold uppercase tracking-wide text-[#07A6A6]">{actu.date}</span>
          <span>Par <span className="font-semibold text-[#1A1D2E]">{actu.auteur}</span></span>
          {gerer && <span className={`rounded-full px-2.5 py-0.5 font-semibold ${STATUT_CLASSES[actu.statut]}`}>{actu.statut}</span>}
        </div>
        <h3 className="text-xl font-bold text-[#001257]">{actu.titre}</h3>
        <p className="text-sm leading-relaxed text-[#1A1D2E]">{actu.contenu}</p>

        <div className={`flex ${gerer ? 'justify-between' : 'justify-end'} gap-2 pt-4 border-t border-[#E1E5EE]`}>
          {gerer && (
            <button onClick={onDelete} className="inline-flex items-center gap-1.5 rounded-lg bg-[#FBE6E6] px-4 py-2 text-xs font-bold text-[#B23A3A] hover:opacity-80 transition">
              <Icon name="trash" size={14} /> Supprimer
            </button>
          )}
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg border border-[#E1E5EE] px-4 py-2 text-xs font-semibold text-[#001257] hover:bg-[#EEF1F7] transition">
              Fermer
            </button>
            {gerer && (
              <button onClick={onEdit} className="inline-flex items-center gap-1.5 rounded-lg bg-[#001257] px-4 py-2 text-xs font-bold text-white hover:opacity-90 transition">
                <Icon name="edit" size={14} /> Modifier
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ── Formulaire article (création / modification) ────────────────────────────
// `actu` absent → création (date et photo obligatoires)
const champ = invalide => `w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:border-[#001257] ${invalide ? 'border-[#B23A3A] bg-[#FBE6E6]' : 'border-[#E1E5EE] bg-white'}`;
const etiquette = 'block mb-1.5 text-xs font-semibold text-[#1A1D2E]';

function Formulaire({ actu, onSubmit, onClose }) {
  const creation = !actu;
  const [titre, setTitre] = useState(actu?.titre ?? '');
  const [date, setDate] = useState('');
  const [statut, setStatut] = useState(actu?.statut ?? 'Publié');
  const [contenu, setContenu] = useState(actu?.contenu ?? '');
  const [auteur, setAuteur] = useState(actu?.auteur ?? '');
  const [photo, setPhoto] = useState(null);
  const [apercu, setApercu] = useState(actu?.image || '');
  const [erreurs, setErreurs] = useState({});

  // Libère l'URL temporaire de l'aperçu
  useEffect(() => () => { if (apercu.startsWith('blob:')) URL.revokeObjectURL(apercu); }, [apercu]);

  const choisirPhoto = e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > TAILLE_MAX_IMAGE) return setErreurs(er => ({ ...er, photo: 'Image trop lourde (2 Mo max).' }));
    setPhoto(file);
    setApercu(URL.createObjectURL(file));
    setErreurs(er => ({ ...er, photo: false }));
  };

  const valider = async () => {
    const errs = {
      titre: !titre.trim(),
      contenu: !contenu.trim(),
      auteur: !auteur.trim(),
      ...(creation && { date: !date, photo: !photo }),
    };
    setErreurs(errs);
    if (Object.values(errs).some(Boolean)) return;

    const image = await lireImage(photo);
    onSubmit({
      titre: titre.trim(),
      statut,
      contenu: contenu.trim(),
      auteur: auteur.trim(),
      ...(image && { image }),
      ...(creation && { date: dateLongue(date) }),
    });
  };

  return (
    <Modal onClose={onClose} className="max-w-lg rounded-2xl overflow-hidden" label={creation ? 'Créer un article' : "Modifier l'article"}>
      <div className="p-6 flex flex-col gap-4">
        <h3 className="text-xl font-bold text-[#001257]">{creation ? 'Créer un article' : "Modifier l'article"}</h3>

        <div>
          <label className={etiquette}>Titre *</label>
          <input type="text" value={titre} onChange={e => setTitre(e.target.value)} placeholder="Titre de l'actualité" className={champ(erreurs.titre)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {creation && (
            <div>
              <label className={etiquette}>Date *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className={champ(erreurs.date)} />
            </div>
          )}
          <div className={creation ? '' : 'col-span-2'}>
            <label className={etiquette}>Statut</label>
            <select value={statut} onChange={e => setStatut(e.target.value)} className={champ(false)}>
              {STATUTS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className={etiquette}>Contenu *</label>
          <textarea rows={4} value={contenu} onChange={e => setContenu(e.target.value)} placeholder="Contenu de l'article…" className={`${champ(erreurs.contenu)} resize-none`} />
        </div>

        <div>
          <label className={etiquette}>Auteur *</label>
          <input type="text" value={auteur} onChange={e => setAuteur(e.target.value)} placeholder="Nom de l'auteur" className={champ(erreurs.auteur)} />
        </div>

        <div>
          <label className={etiquette}>Photo {creation && '*'}</label>
          <label className={`relative flex h-28 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed transition hover:bg-[#EEF1F7] ${erreurs.photo ? 'border-[#B23A3A] bg-[#FBE6E6]' : 'border-[#E1E5EE]'}`}>
            {apercu ? (
              <img src={apercu} alt="Aperçu" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <span className="flex flex-col items-center gap-1 text-[#6B7185]">
                <Icon name="photo-up" size={26} />
                <span className="text-xs font-medium">Cliquer pour choisir une image</span>
                <span className="text-[11px]">JPG, PNG, WEBP — 2 Mo max</span>
              </span>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={choisirPhoto} />
          </label>
          {typeof erreurs.photo === 'string' && <p className="mt-1 text-xs text-[#B23A3A]">{erreurs.photo}</p>}
        </div>

        {Object.values(erreurs).some(Boolean) && (
          <p role="alert" className="text-xs font-medium text-[#B23A3A]">Veuillez remplir tous les champs obligatoires.</p>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t border-[#E1E5EE]">
          <button onClick={onClose} className="rounded-lg border border-[#E1E5EE] px-4 py-2 text-xs font-semibold text-[#001257] hover:bg-[#EEF1F7] transition">
            Annuler
          </button>
          <button onClick={valider} className="rounded-lg bg-[#EC6F6F] px-4 py-2 text-xs font-bold text-[#001257] hover:opacity-90 transition">
            {creation ? "Publier l'article" : 'Enregistrer'}
          </button>
        </div>
      </div>
    </Modal>
  );
}