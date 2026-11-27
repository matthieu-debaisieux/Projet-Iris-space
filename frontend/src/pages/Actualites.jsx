import { useEffect, useState } from 'react';
import '@tabler/icons-webfont/dist/tabler-icons.min.css';
import DataState from '@/components/ui/DataState.jsx';
import Modal from '@/components/ui/Modal.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { useAsync } from '@/hooks/useAsync.js';
import {
  STATUTS_ACTUALITE, createActualite, dateActualite, deleteActualite, getActualites,
  getActualitesPubliques, nomAuteur, updateActualite,
} from '@/services/actualites.js';

const TAILLE_MAX_IMAGE = 2 * 1024 * 1024; // 2 Mo

const STATUT_CLASSES = {
  publie:    'bg-[#E3F5EC] text-[#1E7F55]',
  brouillon: 'bg-[#FFF3D6] text-[#8A5A00]',
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
const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// ── Page ────────────────────────────────────────────────────────────────────
// Sans connexion (page visiteur) : les articles publiés et publics. Connecté : tous les articles
// publiés. Avec le droit `actualites_gerer` on voit aussi ses brouillons et on peut créer des
// articles ; on ne modifie et ne supprime que les siens, sauf avec `actualites_gerer_tout`.
// Un article est publié ou en brouillon (pas d'archive) et son auteur est le compte connecté.
export default function Actualites() {
  const { can, user } = useAuth();
  const gerer = can('actualites_gerer');
  const gererTout = can('actualites_gerer_tout');
  const peutModifier = actu => gerer && (gererTout || String(actu.auteur_id) === String(user.id));

  const liste = useAsync(
    () => (user ? getActualites({ brouillons: gerer }) : getActualitesPubliques()),
    [user?.id, gerer],
  );
  const [recherche, setRecherche] = useState('');
  const [modal, setModal] = useState(null); // { type: 'detail' | 'modifier' | 'creer', id? }
  const fermer = () => setModal(null);

  const q = norm(recherche.trim());
  const courante = liste.data?.find(a => a.id === modal?.id);

  // En cas d'erreur du back, la fenêtre reste ouverte et affiche le message (voir Formulaire et Detail)
  const apresEnvoi = () => { fermer(); liste.reload(); };
  const creer = async data => { await createActualite(data); apresEnvoi(); };
  const modifier = async data => { await updateActualite(modal.id, data); apresEnvoi(); };
  const supprimer = async () => { await deleteActualite(modal.id); apresEnvoi(); };

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

          <DataState state={liste}>{actus => {
            const visibles = actus.filter(a => !q || [a.titre, a.contenu, nomAuteur(a)].some(v => norm(v).includes(q)));
            return visibles.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {visibles.map(actu => (
                  <Carte key={actu.id} actu={actu} afficherStatut={gerer} onOuvrir={() => setModal({ type: 'detail', id: actu.id })} />
                ))}
              </div>
            ) : (
              <p className="py-12 text-center text-sm text-[#6B7185]">Aucune actualité à afficher.</p>
            );
          }}</DataState>
        </div>
      </div>

      {modal?.type === 'creer' && gerer && <Formulaire onSubmit={creer} onClose={fermer} />}
      {modal?.type === 'modifier' && courante && peutModifier(courante) && (
        <Formulaire actu={courante} onSubmit={modifier} onClose={fermer} />
      )}
      {modal?.type === 'detail' && courante && (
        <Detail
          actu={courante}
          gerer={gerer}
          modifiable={peutModifier(courante)}
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
        {actu.image_url && <img src={actu.image_url} alt="" className="h-full w-full object-cover" />}
      </div>
      <div className="p-5 flex flex-col gap-2 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wide text-[#07A6A6]">{dateActualite(actu)}</p>
          {afficherStatut && actu.statut === 'brouillon' && (
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUT_CLASSES.brouillon}`}>{STATUTS_ACTUALITE.brouillon}</span>
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
// `gerer` : affiche le statut ; `modifiable` : cet article peut être modifié / supprimé par l'utilisateur
function Detail({ actu, gerer, modifiable, onClose, onDelete, onEdit }) {
  const [erreur, setErreur] = useState('');
  const supprimer = async () => {
    setErreur('');
    try { await onDelete(); } catch (e) { setErreur(e.message); }
  };

  return (
    <Modal onClose={onClose} className="max-w-lg rounded-2xl overflow-hidden" label={actu.titre}>
      <div className="h-44 bg-[#EEF1F7]">
        {actu.image_url && <img src={actu.image_url} alt="" className="h-full w-full object-cover" />}
      </div>
      <div className="p-6 flex flex-col gap-4">
        <div className="flex items-center gap-3 flex-wrap text-xs text-[#6B7185]">
          <span className="font-bold uppercase tracking-wide text-[#07A6A6]">{dateActualite(actu)}</span>
          <span>Par <span className="font-semibold text-[#1A1D2E]">{nomAuteur(actu)}</span></span>
          {gerer && (
            <>
              <span className={`rounded-full px-2.5 py-0.5 font-semibold ${STATUT_CLASSES[actu.statut]}`}>{STATUTS_ACTUALITE[actu.statut]}</span>
              <span className="rounded-full bg-[#EEF1F7] px-2.5 py-0.5 font-semibold text-[#6B7185]">
                {actu.publique ? 'Public' : 'Comptes connectés'}
              </span>
            </>
          )}
        </div>
        <h3 className="text-xl font-bold text-[#001257]">{actu.titre}</h3>
        <p className="text-sm leading-relaxed text-[#1A1D2E]">{actu.contenu}</p>

        {erreur && <p role="alert" className="text-xs font-medium text-[#B23A3A]">{erreur}</p>}

        <div className={`flex ${modifiable ? 'justify-between' : 'justify-end'} gap-2 pt-4 border-t border-[#E1E5EE]`}>
          {modifiable && (
            <button onClick={supprimer} className="inline-flex items-center gap-1.5 rounded-lg bg-[#FBE6E6] px-4 py-2 text-xs font-bold text-[#B23A3A] hover:opacity-80 transition">
              <Icon name="trash" size={14} /> Supprimer
            </button>
          )}
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg border border-[#E1E5EE] px-4 py-2 text-xs font-semibold text-[#001257] hover:bg-[#EEF1F7] transition">
              Fermer
            </button>
            {modifiable && (
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
// `actu` absent → création. L'auteur est le compte connecté et la date de publication est fixée
// par le back : ni l'un ni l'autre ne se saisit.
const champ = invalide => `w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:border-[#001257] ${invalide ? 'border-[#B23A3A] bg-[#FBE6E6]' : 'border-[#E1E5EE] bg-white'}`;
const etiquette = 'block mb-1.5 text-xs font-semibold text-[#1A1D2E]';

function Formulaire({ actu, onSubmit, onClose }) {
  const creation = !actu;
  const [titre, setTitre] = useState(actu?.titre ?? '');
  const [statut, setStatut] = useState(actu?.statut ?? 'publie');
  const [publique, setPublique] = useState(actu?.publique ?? true);
  const [contenu, setContenu] = useState(actu?.contenu ?? '');
  const [photo, setPhoto] = useState(null);
  const [apercu, setApercu] = useState(actu?.image_url || '');
  const [erreurs, setErreurs] = useState({});
  const [erreurServeur, setErreurServeur] = useState('');
  const [envoi, setEnvoi] = useState(false);

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
    const manquants = { titre: !titre.trim(), contenu: !contenu.trim() };
    setErreurs(er => ({ ...er, ...manquants }));
    if (manquants.titre || manquants.contenu) return;

    setErreurServeur('');
    setEnvoi(true);
    try {
      await onSubmit({
        titre: titre.trim(),
        contenu: contenu.trim(),
        statut,
        publique,
        image_url: actu?.image_url ?? null,
        image: await lireImage(photo),
      });
    } catch (e) {
      setErreurServeur(e.message);
      setEnvoi(false);
    }
  };

  return (
    <Modal onClose={onClose} className="max-w-lg rounded-2xl overflow-hidden" label={creation ? 'Créer un article' : "Modifier l'article"}>
      <div className="p-6 flex flex-col gap-4">
        <h3 className="text-xl font-bold text-[#001257]">{creation ? 'Créer un article' : "Modifier l'article"}</h3>

        <div>
          <label className={etiquette}>Titre *</label>
          <input type="text" value={titre} onChange={e => setTitre(e.target.value)} placeholder="Titre de l'actualité" className={champ(erreurs.titre)} />
        </div>

        <div>
          <label className={etiquette}>Statut</label>
          <select value={statut} onChange={e => setStatut(e.target.value)} className={champ(false)}>
            {Object.entries(STATUTS_ACTUALITE).map(([valeur, libelle]) => <option key={valeur} value={valeur}>{libelle}</option>)}
          </select>
          <label className="mt-2 flex items-center gap-2 text-xs font-medium text-[#1A1D2E]">
            <input type="checkbox" checked={publique} onChange={e => setPublique(e.target.checked)} className="h-4 w-4 accent-[#001257]" />
            Visible aussi par les visiteurs (sans connexion)
          </label>
        </div>

        <div>
          <label className={etiquette}>Contenu *</label>
          <textarea rows={4} value={contenu} onChange={e => setContenu(e.target.value)} placeholder="Contenu de l'article…" className={`${champ(erreurs.contenu)} resize-none`} />
        </div>

        <div>
          <label className={etiquette}>Photo</label>
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

        {(erreurs.titre || erreurs.contenu) && (
          <p role="alert" className="text-xs font-medium text-[#B23A3A]">Veuillez remplir tous les champs obligatoires.</p>
        )}
        {erreurServeur && <p role="alert" className="text-xs font-medium text-[#B23A3A]">{erreurServeur}</p>}

        <div className="flex justify-end gap-2 pt-4 border-t border-[#E1E5EE]">
          <button onClick={onClose} className="rounded-lg border border-[#E1E5EE] px-4 py-2 text-xs font-semibold text-[#001257] hover:bg-[#EEF1F7] transition">
            Annuler
          </button>
          <button onClick={valider} disabled={envoi} className="rounded-lg bg-[#EC6F6F] px-4 py-2 text-xs font-bold text-[#001257] hover:opacity-90 transition disabled:opacity-60">
            {creation ? "Publier l'article" : 'Enregistrer'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
