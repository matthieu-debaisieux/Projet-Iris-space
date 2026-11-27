import { useState } from 'react';
import DataState from '@/components/ui/DataState.jsx';
import Modal from '@/components/ui/Modal.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { useAsync } from '@/hooks/useAsync.js';
import { TYPES_RESSOURCE, creerRessource, getClassesProf, getRessources, supprimerRessource } from '@/services/ressources.js';
import {
  ACCEPT, Dialogue, ICONES, Svg, btnPrincipal, btnSecondaire, champ, formaterDate, libelle,
  nettoyerNom, taille, telechargerFichier, verifierFichier,
} from './commun.jsx';

// ─────────────────────────────────────────────────────────────────────────────
// « Mes ressources de cours » : bloc de la page Documents affiché avec le droit `documents_deposer`.
// Le professeur dépose des fichiers, liens ou textes pour une de SES classes et matières, et ne voit,
// ne télécharge et ne supprime que SES ressources. Il ne touche jamais aux documents de
// l'administration (espaces, droit `documents_gerer`) qui restent en lecture seule pour lui.
//
// ⚠ Masquer les boutons n'est PAS une sécurité : le back (routes/prof.php) ne renvoie que les
//   ressources du prof connecté, répond 404 pour celles des autres et 400 pour un couple
//   classe / matière qu'il n'enseigne pas. Données : services/ressources.js.
// ─────────────────────────────────────────────────────────────────────────────

const lienSur = url => /^https?:\/\//i.test(url ?? '');

// Une carte par couple (classe, matière) : ceux du prof (même vides) + ceux où il a déjà déposé
function grouper(classes, ressources) {
  const groupes = new Map();
  const groupe = (classe_id, classe, matiere_id, matiere) => {
    const cle = `${classe_id}-${matiere_id}`;
    if (!groupes.has(cle)) groupes.set(cle, { cle, classe_id, classe, matiere_id, matiere, actif: false, ressources: [] });
    return groupes.get(cle);
  };
  classes.forEach(c => c.matieres.forEach(m => { groupe(c.id, c.nom, m.id, m.nom).actif = true; }));
  ressources.forEach(r => groupe(r.classe_id, r.classe, r.matiere_id, r.matiere).ressources.push(r));
  return [...groupes.values()].sort((a, b) => a.classe.localeCompare(b.classe, 'fr') || a.matiere.localeCompare(b.matiere, 'fr'));
}

export default function RessourcesProf() {
  const { user } = useAuth();
  const donnees = useAsync(() => Promise.all([getClassesProf(), getRessources(user)]), [user?.id]);
  const [fermes, setFermes] = useState(() => new Set()); // cartes repliées (toutes ouvertes au départ)
  const [modal, setModal] = useState(null); // { type: 'deposer' | 'supprimer' | 'lire', … }
  const [message, setMessage] = useState(null); // { erreur: bool, texte }
  const fermer = () => setModal(null);

  const basculer = cle => setFermes(prev => { const n = new Set(prev); n.has(cle) ? n.delete(cle) : n.add(cle); return n; });

  const supprimer = async r => {
    fermer();
    try {
      await supprimerRessource(user, r.id);
      setMessage({ erreur: false, texte: `« ${r.titre} » a été supprimée.` });
    } catch (e) {
      setMessage({ erreur: true, texte: e.message || 'Suppression impossible.' });
    }
    donnees.reload();
  };

  const [classes, ressources] = donnees.data ?? [];

  return (
    <section aria-labelledby="titre-ressources" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="titre-ressources" className="text-lg font-bold text-[#001257]">Mes ressources de cours</h2>
          <p className="mt-0.5 text-sm text-[#6B7185]">
            Fichiers, liens et textes que vous déposez pour une classe et une matière. Ils sont visibles par les élèves de la classe.
          </p>
        </div>
        <button onClick={() => setModal({ type: 'deposer' })} disabled={!classes?.length} className={btnPrincipal}>
          <Svg d={ICONES.plus} /> Déposer une ressource
        </button>
      </div>

      {message && (
        <p role={message.erreur ? 'alert' : 'status'}
          className={`rounded-xl px-4 py-3 text-sm ${message.erreur ? 'bg-[#FBE6E6] text-[#B23A3A]' : 'bg-[#E3F6F6] text-[#056D6D]'}`}>
          {message.texte}
        </p>
      )}

      <DataState state={donnees}>
        {() => {
          const groupes = grouper(classes, ressources);
          if (!groupes.length) {
            return (
              <p className="rounded-2xl border border-[#E1E5EE] bg-white px-4 py-8 text-center text-sm text-[#6B7185]">
                Aucune classe ne vous est rattachée pour le moment. L'administration doit d'abord renseigner vos matières et vos classes.
              </p>
            );
          }
          return (
            <div className="flex flex-col gap-3">
              {groupes.map(g => {
                const ouvert = !fermes.has(g.cle);
                const nom = `${g.classe} · ${g.matiere}`;
                return (
                  <section key={g.cle} className="bg-white rounded-2xl border border-[#E1E5EE] overflow-hidden">
                    <button onClick={() => basculer(g.cle)} aria-expanded={ouvert} className="flex w-full min-w-0 items-center gap-2 px-4 py-3 text-left">
                      <Svg d={ICONES.chevron} className={`shrink-0 text-[#6B7185] transition-transform ${ouvert ? 'rotate-180' : ''}`} />
                      <span className="truncate font-semibold text-[#001257]">{nom}</span>
                      <span className="shrink-0 rounded-full bg-[#EEF1F7] px-2 py-0.5 text-xs text-[#6B7185]">{g.ressources.length}</span>
                    </button>

                    {ouvert && (
                      <div className="border-t border-[#E1E5EE] px-4 py-3">
                        {g.ressources.length ? (
                          <ul className="divide-y divide-[#E1E5EE]">
                            {g.ressources.map(r => (
                              <Ressource key={r.id} r={r}
                                onLire={() => setModal({ type: 'lire', ressource: r })}
                                onSupprimer={() => setModal({ type: 'supprimer', ressource: r })} />
                            ))}
                          </ul>
                        ) : (
                          <p className="py-2 text-xs italic text-[#6B7185]">Aucune ressource pour cette classe et cette matière.</p>
                        )}
                        {g.actif && (
                          <button onClick={() => setModal({ type: 'deposer', classeId: g.classe_id, matiereId: g.matiere_id })}
                            aria-label={`Déposer une ressource pour ${nom}`} className={`${btnSecondaire} mt-3`}>
                            <Svg d={ICONES.deposer} size={15} /> Déposer une ressource
                          </button>
                        )}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          );
        }}
      </DataState>

      {modal?.type === 'deposer' && (
        <DepotRessourceModal classes={classes} classeId={modal.classeId} matiereId={modal.matiereId} onClose={fermer}
          onDeposee={r => { fermer(); setMessage({ erreur: false, texte: `« ${r.titre} » a été déposée.` }); donnees.reload(); }} />
      )}
      {modal?.type === 'supprimer' && (
        <Dialogue titre="Supprimer la ressource" confirmer="Supprimer" danger onClose={fermer} onConfirm={() => supprimer(modal.ressource)}>
          <p className="text-sm text-[#6B7185]">
            Supprimer <strong>{modal.ressource.titre}</strong> ({modal.ressource.classe} · {modal.ressource.matiere}) ?
            Les élèves ne la verront plus. Cette action est irréversible.
          </p>
        </Dialogue>
      )}
      {modal?.type === 'lire' && (
        <Modal onClose={fermer} className="max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto" label={modal.ressource.titre}>
          <h3 className="text-lg font-bold text-[#001257]">{modal.ressource.titre}</h3>
          <p className="mt-0.5 text-xs text-[#6B7185]">{modal.ressource.classe} · {modal.ressource.matiere} · {formaterDate(modal.ressource.created_at)}</p>
          <p className="mt-4 whitespace-pre-wrap break-words text-sm text-[#1A1D2E]">{modal.ressource.contenu}</p>
          <div className="mt-5 flex justify-end">
            <button autoFocus onClick={fermer} className={btnSecondaire}>Fermer</button>
          </div>
        </Modal>
      )}
    </section>
  );
}

// ── Une ressource dans la liste ─────────────────────────────────────────────
function Ressource({ r, onLire, onSupprimer }) {
  const meta = [TYPES_RESSOURCE[r.type], r.fichier && taille(r.fichier.size), formaterDate(r.created_at)].filter(Boolean).join(' · ');

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
      <Svg d={ICONES[r.type]} className="shrink-0 text-[#07A6A6]" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[#1A1D2E]">{r.titre}</p>
        <p className="text-xs text-[#6B7185]">{meta}</p>
      </div>

      {r.type === 'fichier' && (r.fichier ? (
        <button onClick={() => telechargerFichier(r.fichier, nettoyerNom(r.fichier.name))} className={btnSecondaire}>
          <Svg d={ICONES.telecharger} size={15} /> Télécharger
        </button>
      ) : (
        // Le back n'a pas encore de route pour télécharger un fichier déposé (ROUTES.md, section Fichiers)
        <span className="text-xs italic text-[#6B7185]">Téléchargement bientôt disponible</span>
      ))}
      {r.type === 'lien' && lienSur(r.url) && (
        <a href={r.url} target="_blank" rel="noopener noreferrer" className={btnSecondaire}>
          <Svg d={ICONES.lien} size={15} /> Ouvrir le lien <span className="sr-only">(nouvel onglet)</span>
        </a>
      )}
      {r.type === 'texte' && (
        <button onClick={onLire} className={btnSecondaire}>
          <Svg d={ICONES.texte} size={15} /> Lire
        </button>
      )}

      <button onClick={onSupprimer} aria-label={`Supprimer ${r.titre}`} className="rounded p-1.5 text-[#6B7185] hover:bg-[#FBE6E6] hover:text-[#B23A3A]">
        <Svg d={ICONES.corbeille} size={15} />
      </button>
    </li>
  );
}

// ── Modale de dépôt ─────────────────────────────────────────────────────────
function DepotRessourceModal({ classes, classeId: classeInitiale, matiereId: matiereInitiale, onDeposee, onClose }) {
  const { user } = useAuth();
  const matieresDe = id => classes.find(c => String(c.id) === String(id))?.matieres ?? [];
  const uneSeule = liste => (liste.length === 1 ? String(liste[0].id) : '');

  const [classeId, setClasseId] = useState(() => String(classeInitiale ?? uneSeule(classes)));
  const [matiereId, setMatiereId] = useState(() => String(matiereInitiale ?? uneSeule(matieresDe(classeInitiale ?? uneSeule(classes)))));
  const [type, setType] = useState('fichier');
  const [titre, setTitre] = useState('');
  const [fichier, setFichier] = useState(null);
  const [url, setUrl] = useState('');
  const [contenu, setContenu] = useState('');
  const [confirme, setConfirme] = useState(false);
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const changerClasse = e => {
    setClasseId(e.target.value);
    setMatiereId(uneSeule(matieresDe(e.target.value))); // la matière doit appartenir à la classe choisie
  };

  const choisirFichier = e => {
    const f = e.target.files?.[0] ?? null;
    const err = f ? verifierFichier(f) : '';
    setErreur(err);
    setFichier(err ? null : f);
    if (err) e.target.value = '';
    else if (f && !titre.trim()) setTitre(nettoyerNom(f.name).replace(/\.[^.]+$/, '')); // le titre se propose tout seul
  };

  const verifier = () => {
    if (!classeId || !matiereId) return 'Choisissez la classe et la matière.';
    if (!titre.trim()) return 'Donnez un titre à la ressource.';
    if (type === 'fichier') return verifierFichier(fichier);
    if (type === 'lien') {
      if (!lienSur(url.trim())) return 'Le lien doit commencer par http:// ou https://';
      try { new URL(url.trim()); } catch { return "Ce lien n'est pas valide."; }
    }
    if (type === 'texte' && !contenu.trim()) return 'Écrivez le texte de la ressource.';
    if (!confirme) return 'Confirmez la conformité RGPD avant de déposer.';
    return '';
  };

  const valider = async e => {
    e.preventDefault();
    const err = verifier();
    if (err) return setErreur(err);

    setErreur('');
    setEnvoi(true);
    try {
      const r = await creerRessource(user, {
        classe_id: Number(classeId), matiere_id: Number(matiereId), type, titre: titre.trim(),
        url: url.trim(), contenu: contenu.trim(), fichier,
      });
      onDeposee(r);
    } catch (e2) {
      setErreur(e2.message || 'Le dépôt a échoué. Réessayez.'); // message lisible renvoyé par le back
      setEnvoi(false);
    }
  };

  const matieres = matieresDe(classeId);

  return (
    <Modal onClose={onClose} className="max-w-md rounded-2xl p-6 max-h-[90vh] overflow-y-auto" label="Déposer une ressource de cours">
      <form onSubmit={valider} noValidate className="flex flex-col gap-4">
        <h3 className="text-lg font-bold text-[#001257]">Déposer une ressource de cours</h3>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="res-classe" className={libelle}>Classe</label>
            <select id="res-classe" required autoFocus value={classeId} onChange={changerClasse} className={champ}>
              <option value="">Choisir…</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="res-matiere" className={libelle}>Matière</label>
            <select id="res-matiere" required value={matiereId} onChange={e => setMatiereId(e.target.value)} disabled={!classeId} className={champ}>
              <option value="">Choisir…</option>
              {matieres.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
            </select>
          </div>
        </div>

        <fieldset>
          <legend className={libelle}>Type de ressource</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            {Object.entries(TYPES_RESSOURCE).map(([valeur, nom]) => (
              <label key={valeur} className="inline-flex items-center gap-1.5 text-sm text-[#1A1D2E]">
                <input type="radio" name="res-type" value={valeur} checked={type === valeur} onChange={() => { setType(valeur); setErreur(''); }} className="accent-[#001257]" />
                {nom}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="res-titre" className={libelle}>Titre</label>
          <input id="res-titre" type="text" required maxLength={200} value={titre} onChange={e => setTitre(e.target.value)} className={champ} />
        </div>

        {type === 'fichier' && (
          <div>
            <label htmlFor="res-fichier" className={libelle}>Fichier</label>
            <input id="res-fichier" type="file" required accept={ACCEPT} onChange={choisirFichier}
              className={`${champ} file:mr-3 file:rounded-md file:border-0 file:bg-[#EEF1F7] file:px-3 file:py-1 file:text-xs file:font-semibold file:text-[#001257]`} />
            <p className="mt-1 text-xs text-[#6B7185]">PDF, Word, Excel, PowerPoint, PNG ou JPG — 10 Mo maximum.</p>
          </div>
        )}
        {type === 'lien' && (
          <div>
            <label htmlFor="res-url" className={libelle}>Adresse du lien</label>
            <input id="res-url" type="url" required maxLength={2000} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" className={champ} />
          </div>
        )}
        {type === 'texte' && (
          <div>
            <label htmlFor="res-contenu" className={libelle}>Texte</label>
            <textarea id="res-contenu" required rows={6} maxLength={20000} value={contenu} onChange={e => setContenu(e.target.value)} className={champ} />
          </div>
        )}

        <div className="rounded-xl bg-[#FFF3D6] px-4 py-3 text-xs text-[#8A5A00]">
          <p className="font-semibold">Avant de déposer (RGPD)</p>
          <p className="mt-1">Cette ressource sera visible par tous les élèves de la classe choisie. Ne déposez ni notes individuelles, ni certificats médicaux, ni pièces d'identité, ni coordonnées personnelles.</p>
        </div>

        <label className="flex items-start gap-2 text-xs text-[#1A1D2E]">
          <input type="checkbox" checked={confirme} onChange={e => setConfirme(e.target.checked)} className="mt-0.5" />
          <span>Je confirme que cette ressource ne contient aucune donnée personnelle non nécessaire et que je suis autorisé(e) à la diffuser.</span>
        </label>

        {erreur && <p role="alert" className="text-xs text-[#B23A3A]">{erreur}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btnSecondaire}>Annuler</button>
          <button type="submit" disabled={envoi} className={btnPrincipal}>{envoi ? 'Dépôt en cours…' : 'Déposer'}</button>
        </div>
      </form>
    </Modal>
  );
}
