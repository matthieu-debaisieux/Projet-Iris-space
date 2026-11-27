import { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal.jsx';
import { useAuth } from '@/context/AuthContext.jsx';

// ─────────────────────────────────────────────────────────────────────────────
// Droits :
//   - tout utilisateur autorisé à voir la page : consulter + TÉLÉCHARGER
//   - droit `documents_gerer` (administration) : déposer, renommer, supprimer
//
// ⚠ Masquer les boutons n'est PAS une sécurité. Le serveur doit refuser lui-même
//   tout dépôt / suppression sans le droit `documents_gerer` (voir la liste en bas).
//
// Version SANS base de données : les fichiers restent en mémoire du navigateur
// (ils disparaissent au rechargement). Plus tard : envoyer le fichier à l'API
// dans `deposer`, et télécharger via une URL protégée dans `telecharger`.
// ─────────────────────────────────────────────────────────────────────────────

// PDF de démonstration valide (ASCII uniquement) : permet de tester le téléchargement sans serveur.
// À supprimer quand les vrais fichiers viendront de la base de données.
function pdfDemo(titre) {
  const texte = titre.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7E]/g, '').replace(/[()\\]/g, '');
  const flux = `BT /F1 20 Tf 60 780 Td (${texte}) Tj 0 -30 Td /F1 12 Tf (Document de demonstration - Iris Space) Tj ET`;
  const objets = [
    '<</Type/Catalog/Pages 2 0 R>>',
    '<</Type/Pages/Kids[3 0 R]/Count 1>>',
    '<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>',
    `<</Length ${flux.length}>>\nstream\n${flux}\nendstream`,
    '<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objets.forEach((o, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objets.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map(o => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<</Size ${objets.length + 1}/Root 1 0 R>>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: 'application/pdf' });
}

const docDemo = (id, name) => {
  const file = new File([pdfDemo(name.replace(/\.pdf$/, ''))], name, { type: 'application/pdf' });
  return { id, name, size: file.size, date: '01/09/2026', auteur: 'Administration', file };
};

const creerDonneesTest = () => [
  { id: 1, name: 'Administratif', docs: [docDemo(11, 'Règlement intérieur.pdf'), docDemo(12, 'Calendrier de la rentrée.pdf')] },
  { id: 2, name: 'Cours – BTS SIO 1', docs: [docDemo(21, 'Programme de la formation.pdf')] },
];

// ── Règles de dépôt ─────────────────────────────────────────────────────────
const TAILLE_MAX = 10 * 1024 * 1024; // 10 Mo
const TYPES = {
  pdf: ['application/pdf'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  png: ['image/png'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
};
const ACCEPT = Object.keys(TYPES).map(e => `.${e}`).join(',');

const extension = nom => (nom.includes('.') ? nom.split('.').pop().toLowerCase() : '');
// Retire chemins, caractères de contrôle et caractères interdits dans un nom de fichier
const nettoyerNom = nom => nom
  .replace(/[\u0000-\u001f\u007f]/g, '')
  .replace(/[\\/:*?"<>|]/g, '_')
  .replace(/^\.+/, '')
  .trim()
  .slice(0, 100);
const taille = o => (o < 1024 * 1024 ? `${Math.max(1, Math.round(o / 1024))} Ko` : `${(o / 1024 / 1024).toFixed(1)} Mo`);

// Renvoie un message d'erreur, ou '' si le fichier est acceptable
function verifierFichier(file) {
  if (!file) return 'Choisissez un fichier.';
  const ext = extension(file.name);
  if (!TYPES[ext]) return `Format non autorisé. Formats acceptés : ${Object.keys(TYPES).join(', ')}.`;
  if (file.type && !TYPES[ext].includes(file.type)) return "Le contenu du fichier ne correspond pas à son extension.";
  if (file.size === 0) return 'Le fichier est vide.';
  if (file.size > TAILLE_MAX) return `Fichier trop lourd (${taille(file.size)}). Maximum : 10 Mo.`;
  return '';
}

const nouvelId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// ── Stockage de démonstration (IndexedDB) ───────────────────────────────────
// Garde les espaces ET les fichiers dans le navigateur : ils survivent au rechargement et sont
// partagés entre les onglets / comptes utilisés sur CE navigateur (admin puis élève, par exemple).
// Ce n'est pas partagé entre deux ordinateurs : pour ça, il faut la vraie base de données.
// À supprimer (avec les deux useEffect plus bas) quand l'API sera branchée.
const ouvrirDb = () => new Promise((ok, ko) => {
  const r = indexedDB.open('iris-demo', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('kv');
  r.onsuccess = () => ok(r.result);
  r.onerror = () => ko(r.error);
});
const lireDemo = async cle => {
  const db = await ouvrirDb();
  return new Promise((ok, ko) => {
    const q = db.transaction('kv').objectStore('kv').get(cle);
    q.onsuccess = () => ok(q.result);
    q.onerror = () => ko(q.error);
  });
};
const ecrireDemo = async (cle, valeur) => {
  const db = await ouvrirDb();
  return new Promise((ok, ko) => {
    const t = db.transaction('kv', 'readwrite');
    t.objectStore('kv').put(valeur, cle);
    t.oncomplete = () => ok();
    t.onerror = () => ko(t.error);
  });
};

// ── Icônes ──────────────────────────────────────────────────────────────────
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
const btnSecondaire = 'inline-flex items-center gap-1.5 rounded-lg border border-[#E1E5EE] bg-white px-4 py-2 text-sm font-semibold text-[#001257] hover:bg-[#EEF1F7] transition';
const champ = 'w-full rounded-lg border border-[#E1E5EE] bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-[#001257]';

// ── Page ────────────────────────────────────────────────────────────────────
export default function Documents() {
  const { can, user } = useAuth();
  const gerer = can('documents_gerer');

  const [espaces, setEspaces] = useState(creerDonneesTest);
  const [ouverts, setOuverts] = useState(() => new Set([1, 2])); // tous les espaces ouverts au départ
  const [pret, setPret] = useState(false); // vrai une fois la lecture du stockage terminée

  // Lecture au chargement et quand l'onglet redevient visible (pour voir le dépôt fait dans un autre onglet)
  useEffect(() => {
    let actif = true;
    const charger = async () => {
      try {
        const stocke = await lireDemo('espaces');
        if (actif && stocke) setEspaces(stocke);
      } catch { /* stockage indisponible (navigation privée…) : on reste en mémoire */ }
      if (actif) setPret(true);
    };
    const auRetour = () => { if (document.visibilityState === 'visible') charger(); };
    charger();
    document.addEventListener('visibilitychange', auRetour);
    window.addEventListener('focus', charger);
    return () => {
      actif = false;
      document.removeEventListener('visibilitychange', auRetour);
      window.removeEventListener('focus', charger);
    };
  }, []);

  // Écriture à chaque modification (jamais avant la première lecture, pour ne pas écraser les données)
  useEffect(() => {
    if (pret) ecrireDemo('espaces', espaces).catch(() => {});
  }, [espaces, pret]);
  const [modal, setModal] = useState(null); // { type, spaceId?, doc? }
  const fermer = () => setModal(null);
  const espaceModal = espaces.find(s => s.id === modal?.spaceId);

  const basculer = id => setOuverts(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const majEspace = (id, fn) => setEspaces(prev => prev.map(s => (s.id === id ? fn(s) : s)));

  // Téléchargement : disponible pour tout le monde. Toujours en pièce jointe (jamais ouvert dans la page).
  const telecharger = doc => {
    if (!doc.file) return;
    const url = URL.createObjectURL(doc.file);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.name;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Dépôt : réservé à l'administration. Plus tard : envoyer `file` à l'API.
  const deposer = (spaceId, file) => {
    if (!gerer) return;
    majEspace(spaceId, s => ({
      ...s,
      docs: [...s.docs, {
        id: nouvelId(),
        name: nettoyerNom(file.name),
        size: file.size,
        file,
        date: new Date().toLocaleDateString('fr-FR'),
        auteur: user?.nom ?? 'Administration',
      }],
    }));
    fermer();
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto bg-[var(--color-page)]">
        <div className="mx-auto w-full max-w-[1000px] px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#001257]">Documents</h1>
              <p className="mt-1 text-sm text-[#6B7185]">
                {gerer ? 'Déposez et organisez les documents de l’établissement.' : 'Retrouvez et téléchargez les documents de l’établissement.'}
              </p>
            </div>
            {gerer && (
              <button onClick={() => setModal({ type: 'espace' })} className={btnPrincipal}>
                <Svg d={ICONES.plus} /> Ajouter un espace
              </button>
            )}
          </div>

          {!gerer && (
            <p className="flex items-start gap-2 rounded-xl bg-[#EEF1F7] px-4 py-3 text-xs text-[#1A1D2E]">
              <Svg d={ICONES.bouclier} size={16} className="mt-0.5 shrink-0 text-[#001257]" />
              Les documents sont en lecture et téléchargement uniquement. Seule l'administration peut en déposer.
            </p>
          )}

          <div className="flex flex-col gap-3">
            {espaces.map(espace => {
              const ouvert = ouverts.has(espace.id);
              return (
                <section key={espace.id} className="bg-white rounded-2xl border border-[#E1E5EE] overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3">
                    <button
                      onClick={() => basculer(espace.id)}
                      aria-expanded={ouvert}
                      className="flex flex-1 min-w-0 items-center gap-2 text-left"
                    >
                      <Svg d={ICONES.chevron} className={`shrink-0 text-[#6B7185] transition-transform ${ouvert ? 'rotate-180' : ''}`} />
                      <span className="truncate font-semibold text-[#001257]">{espace.name}</span>
                      <span className="shrink-0 rounded-full bg-[#EEF1F7] px-2 py-0.5 text-xs text-[#6B7185]">{espace.docs.length}</span>
                    </button>
                    {gerer && (
                      <div className="flex shrink-0 items-center gap-1">
                        <button onClick={() => setModal({ type: 'renommer', spaceId: espace.id })} className="rounded px-2 py-1 text-xs font-semibold text-[#001257] hover:bg-[#EEF1F7]">Renommer</button>
                        <button onClick={() => setModal({ type: 'supprimer-espace', spaceId: espace.id })} aria-label={`Supprimer l'espace ${espace.name}`} className="rounded p-1.5 text-[#6B7185] hover:bg-[#FBE6E6] hover:text-[#B23A3A]"><Svg d={ICONES.corbeille} size={15} /></button>
                      </div>
                    )}
                  </div>

                  {ouvert && (
                    <div className="border-t border-[#E1E5EE] px-4 py-3">
                      {espace.docs.length ? (
                        <ul className="divide-y divide-[#E1E5EE]">
                          {espace.docs.map(doc => (
                            <li key={doc.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                              <Svg d={ICONES.fichier} className="shrink-0 text-[#07A6A6]" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-[#1A1D2E]">{doc.name}</p>
                                <p className="text-xs text-[#6B7185]">
                                  {[doc.size && taille(doc.size), doc.date, doc.auteur && `par ${doc.auteur}`].filter(Boolean).join(' · ')}
                                </p>
                              </div>
                              {doc.file ? (
                                <button onClick={() => telecharger(doc)} className={btnSecondaire}>
                                  <Svg d={ICONES.telecharger} size={15} /> Télécharger
                                </button>
                              ) : (
                                <span className="text-xs italic text-[#6B7185]">Fichier non disponible (démo)</span>
                              )}
                              {gerer && (
                                <button onClick={() => setModal({ type: 'supprimer-doc', spaceId: espace.id, doc })} aria-label={`Supprimer ${doc.name}`} className="rounded p-1.5 text-[#6B7185] hover:bg-[#FBE6E6] hover:text-[#B23A3A]"><Svg d={ICONES.corbeille} size={15} /></button>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="py-2 text-xs italic text-[#6B7185]">Aucun document dans cet espace.</p>
                      )}
                      {gerer && (
                        <button onClick={() => setModal({ type: 'deposer', spaceId: espace.id })} className={`${btnSecondaire} mt-3`}>
                          <Svg d={ICONES.deposer} size={15} /> Déposer un document
                        </button>
                      )}
                    </div>
                  )}
                </section>
              );
            })}
            {!espaces.length && <p className="py-12 text-center text-sm text-[#6B7185]">Aucun espace pour le moment.</p>}
          </div>
        </div>
      </div>

      {/* Les modales de gestion n'existent que pour l'administration */}
      {gerer && modal?.type === 'espace' && (
        <Dialogue titre="Nouvel espace" champLabel="Nom de l'espace" confirmer="Créer" onClose={fermer}
          onConfirm={nom => { if (!nom) return; setEspaces(p => [...p, { id: nouvelId(), name: nom, docs: [] }]); fermer(); }} />
      )}
      {gerer && modal?.type === 'renommer' && espaceModal && (
        <Dialogue titre="Renommer l'espace" champLabel="Nouveau nom" valeur={espaceModal.name} confirmer="Renommer" onClose={fermer}
          onConfirm={nom => { if (nom) majEspace(modal.spaceId, s => ({ ...s, name: nom })); fermer(); }} />
      )}
      {gerer && modal?.type === 'supprimer-espace' && espaceModal && (
        <Dialogue titre="Supprimer l'espace" confirmer="Supprimer" danger onClose={fermer}
          onConfirm={() => { setEspaces(p => p.filter(s => s.id !== modal.spaceId)); fermer(); }}>
          <p className="text-sm text-[#6B7185]">Supprimer <strong>{espaceModal.name}</strong> et tous ses documents ? Cette action est irréversible.</p>
        </Dialogue>
      )}
      {gerer && modal?.type === 'supprimer-doc' && (
        <Dialogue titre="Supprimer le document" confirmer="Supprimer" danger onClose={fermer}
          onConfirm={() => { majEspace(modal.spaceId, s => ({ ...s, docs: s.docs.filter(d => d.id !== modal.doc.id) })); fermer(); }}>
          <p className="text-sm text-[#6B7185]">Supprimer <strong>{modal.doc.name}</strong> ?</p>
        </Dialogue>
      )}
      {gerer && modal?.type === 'deposer' && espaceModal && (
        <DepotModal noms={espaceModal.docs.map(d => d.name.toLowerCase())} onDeposer={f => deposer(modal.spaceId, f)} onClose={fermer} />
      )}
    </>
  );
}

// ── Modale de saisie / confirmation ─────────────────────────────────────────
function Dialogue({ titre, champLabel, valeur = '', confirmer, danger = false, onConfirm, onClose, children }) {
  const [texte, setTexte] = useState(valeur);
  const valider = e => { e.preventDefault(); onConfirm(texte.trim().slice(0, 100)); };

  return (
    <Modal onClose={onClose} className="max-w-sm rounded-2xl p-6" label={titre}>
      <form onSubmit={valider} className="flex flex-col gap-4">
        <h3 className="text-lg font-bold text-[#001257]">{titre}</h3>
        {children}
        {champLabel && (
          <input autoFocus type="text" value={texte} maxLength={100} onChange={e => setTexte(e.target.value)} placeholder={champLabel} aria-label={champLabel} className={champ} />
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btnSecondaire}>Annuler</button>
          <button type="submit" className={danger ? 'rounded-lg bg-[#B23A3A] px-4 py-2 text-sm font-bold text-white hover:opacity-90 transition' : btnPrincipal}>{confirmer}</button>
        </div>
      </form>
    </Modal>
  );
}

// ── Modale de dépôt (administration) ────────────────────────────────────────
function DepotModal({ noms, onDeposer, onClose }) {
  const [fichier, setFichier] = useState(null);
  const [confirme, setConfirme] = useState(false);
  const [erreur, setErreur] = useState('');

  const choisir = e => {
    const f = e.target.files?.[0] ?? null;
    const err = f ? verifierFichier(f) : '';
    setErreur(err);
    setFichier(err ? null : f);
    if (err) e.target.value = '';
  };

  const valider = e => {
    e.preventDefault();
    const err = verifierFichier(fichier);
    if (err) return setErreur(err);
    if (noms.includes(nettoyerNom(fichier.name).toLowerCase())) return setErreur('Un document porte déjà ce nom dans cet espace.');
    if (!confirme) return setErreur('Confirmez la conformité RGPD avant de déposer.');
    onDeposer(fichier);
  };

  return (
    <Modal onClose={onClose} className="max-w-md rounded-2xl p-6" label="Déposer un document">
      <form onSubmit={valider} className="flex flex-col gap-4">
        <h3 className="text-lg font-bold text-[#001257]">Déposer un document</h3>

        <div>
          <label htmlFor="fichier" className="mb-1.5 block text-xs font-semibold text-[#1A1D2E]">Fichier</label>
          <input id="fichier" type="file" accept={ACCEPT} onChange={choisir}
            className={`${champ} file:mr-3 file:rounded-md file:border-0 file:bg-[#EEF1F7] file:px-3 file:py-1 file:text-xs file:font-semibold file:text-[#001257]`} />
          <p className="mt-1 text-xs text-[#6B7185]">PDF, Word, Excel, PowerPoint, PNG ou JPG — 10 Mo maximum.</p>
        </div>

        <div className="rounded-xl bg-[#FFF3D6] px-4 py-3 text-xs text-[#8A5A00]">
          <p className="font-semibold">Avant de déposer (RGPD)</p>
          <p className="mt-1">Ce document sera téléchargeable par tous les élèves. Ne déposez ni notes individuelles, ni certificats médicaux, ni pièces d'identité, ni coordonnées personnelles.</p>
        </div>

        <label className="flex items-start gap-2 text-xs text-[#1A1D2E]">
          <input type="checkbox" checked={confirme} onChange={e => setConfirme(e.target.checked)} className="mt-0.5" />
          <span>Je confirme que ce document ne contient aucune donnée personnelle non nécessaire et que je suis autorisé(e) à le diffuser.</span>
        </label>

        {erreur && <p role="alert" className="text-xs text-[#B23A3A]">{erreur}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btnSecondaire}>Annuler</button>
          <button type="submit" disabled={!fichier || !confirme} className={btnPrincipal}>Déposer</button>
        </div>
      </form>
    </Modal>
  );
}