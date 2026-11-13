import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Modal from '@/components/ui/Modal.jsx';
import { useAuth } from '@/context/AuthContext.jsx';

// ─────────────────────────────────────────────────────────────────────────────
// Page « Vie scolaire » — fichier autonome (le hook de stockage est inclus).
//
//   1. L'ADMINISTRATION fait l'appel (classe + date + créneau) : les élèves marqués
//      absents / en retard deviennent des absences « Non justifié ».
//   2. L'ÉLÈVE voit ses absences et les justifie (période + motif + PDF + commentaire) :
//      elles passent « En attente ».
//   3. L'ADMINISTRATION télécharge le justificatif, puis justifie ou refuse.
//
// Version SANS base de données : tout est stocké dans localStorage (même navigateur,
// même localhost). Le PDF est converti en base64 pour pouvoir être partagé.
// Le nom de l'élève ajouté par l'admin doit être identique au nom de connexion (ex. « John Doe »).
// Quand la base sera prête, remplacer useDemoStore par des appels API.
// ⚠ Côté serveur : seuls les droits d'administration peuvent faire l'appel et changer un statut.
// ─────────────────────────────────────────────────────────────────────────────

// ── Stockage local partagé (remplace un hook externe) ───────────────────────
function useDemoStore(key, init) {
  const k = `demo:${key}`;
  const lire = () => {
    try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : init(); }
    catch { return init(); }
  };
  const [valeur, setValeur] = useState(lire);
  const ref = useRef(valeur);
  ref.current = valeur;

  // Synchronise avec les autres onglets (un onglet élève, un onglet admin)
  useEffect(() => {
    const onStorage = e => {
      if (e.key === k) { const v = lire(); ref.current = v; setValeur(v); }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k]);

  const set = useCallback(next => {
    const n = typeof next === 'function' ? next(ref.current) : next;
    try { localStorage.setItem(k, JSON.stringify(n)); }
    catch { alert('Stockage local plein : le justificatif est probablement trop lourd.'); return; }
    ref.current = n;
    setValeur(n);
  }, [k]);

  return [valeur, set];
}

const MOTIFS = ['Arrêt maladie', 'Rendez-vous médical', 'Problème de transport', 'Raison familiale', 'Autre'];
const TAILLE_MAX = 1024 * 1024; // 1 Mo (limite de localStorage, le base64 pèse ~33 % de plus)

const CRENEAUX = [
  { cle: 'matin',      label: 'Matin (09h00 – 13h00)',       duree: '09:00 – 13:00' },
  { cle: 'apres-midi', label: 'Après-midi (14h00 – 18h00)',  duree: '14:00 – 18:00' },
  { cle: 'journee',    label: 'Journée entière',             duree: '09:00 – 18:00' },
];

// statut : 'non_justifie' | 'en_attente' | 'justifie' | 'refuse'
const STATUTS = {
  non_justifie: { texte: 'Non justifié', classe: 'bg-[#FBE6E6] text-[#B23A3A]' },
  en_attente:   { texte: 'En attente',   classe: 'bg-[#FFF3D6] text-[#8A5A00]' },
  justifie:     { texte: 'Justifiée',    classe: 'bg-[#E3F5EC] text-[#1E7F55]' },
  refuse:       { texte: 'Refusée',      classe: 'bg-[#FBE6E6] text-[#B23A3A]' },
};

const card = 'bg-white rounded-2xl border border-[#E1E5EE] p-6';
const th = 'bg-[#EEF1F7] px-4 py-3 text-left text-xs font-medium text-[#6B7185] first:rounded-l-lg last:rounded-r-lg';
const td = 'px-4 py-3.5 border-b border-[#E1E5EE] align-middle';
const champ = 'w-full rounded-lg border border-[#E1E5EE] bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-[#001257]';
const etiquette = 'block mb-1.5 text-xs font-semibold text-[#1A1D2E]';
const btnPrincipal = 'inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#EC6F6F] px-4 py-2.5 text-sm font-bold text-[#001257] hover:opacity-90 disabled:opacity-50 transition';
const btnSecondaire = 'inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#E1E5EE] bg-white px-4 py-2 text-sm font-semibold text-[#001257] hover:bg-[#EEF1F7] transition';

const aujourdhui = () => new Date().toISOString().slice(0, 10);
const formatFr = iso => iso.split('-').reverse().join('/');
const nbJours = (debut, fin) => Math.round((Date.parse(fin) - Date.parse(debut)) / 86400000) + 1;
const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const nouvelId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const Badge = ({ statut }) => {
  const s = STATUTS[statut] ?? STATUTS.en_attente;
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${s.classe}`}>{s.texte}</span>;
};
const Compteur = ({ nom, valeur }) => (
  <div className="bg-white rounded-2xl border border-[#E1E5EE] px-5 py-3 min-w-28">
    <p className="text-xs text-[#6B7185]">{nom}</p>
    <p className="text-2xl font-bold text-[#001257]">{valeur}</p>
  </div>
);

// Fichier → data URL base64 (sérialisable dans localStorage)
const lireFichier = f => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = reject;
  r.readAsDataURL(f);
});

function telecharger({ nom, data }) {
  const a = document.createElement('a');
  a.href = data;
  a.download = nom.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_');
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function VieScolaire() {
  const { can, user } = useAuth();
  // Vue administration : droit `absences_gerer` OU `tableau_de_bord` OU compte « Administration » (test local).
  const gerer = can('absences_gerer') || can('tableau_de_bord') || user?.nom === 'Administration';
  const nom = user?.nom ?? '';

  const [eleves, setEleves] = useDemoStore('vs-eleves', () => []);     // [{ id, nom, classe }]
  const [absences, setAbsences] = useDemoStore('vs-absences', () => []);

  // ── Administration : élèves ──
  const ajouterEleve = ({ nom: n, classe }) => setEleves(l => (
    l.some(e => norm(e.nom) === norm(n) && norm(e.classe) === norm(classe)) ? l : [...l, { id: nouvelId(), nom: n, classe }]
  ));
  const supprimerEleve = id => setEleves(l => l.filter(e => e.id !== id));

  // ── Administration : appel ──
  const enregistrerAppel = ({ jour, creneau, liste, marques }) => {
    const cle = `${jour}|${creneau}`;
    const cr = CRENEAUX.find(c => c.cle === creneau);
    setAbsences(l => {
      let suivant = [...l];
      for (const e of liste) {
        const m = marques[e.id];
        if (!m) continue;
        const exist = suivant.find(a => a.eleveId === e.id && a.appel === cle);
        const type = m.etat === 'retard' ? 'Retard' : 'Absence';
        if (m.etat === 'present') {
          if (exist && exist.statut === 'non_justifie') suivant = suivant.filter(a => a !== exist);
          continue;
        }
        const duree = type === 'Retard' ? `${m.minutes} min` : cr.duree;
        if (exist && exist.type === type) { suivant = suivant.map(a => (a === exist ? { ...a, duree } : a)); continue; }
        if (exist) suivant = suivant.filter(a => a !== exist);
        suivant.unshift({ id: nouvelId(), appel: cle, eleveId: e.id, eleve: e.nom, classe: e.classe, jour, date: formatFr(jour), duree, type, motif: '', commentaire: '', statut: 'non_justifie' });
      }
      return suivant;
    });
  };

  // ── Administration : décision ──
  const decider = (id, statut) => setAbsences(l => l.map(a => {
    if (a.id !== id) return a;
    const { decision, ...reste } = a;
    return statut === 'en_attente'
      ? { ...reste, statut }
      : { ...reste, statut, decision: { par: user?.nom ?? 'Administration', le: new Date().toLocaleDateString('fr-FR') } };
  }));

  // ── Élève : justification sur une période ──
  // `fichier` = { nom, data } (data = base64). Renvoie le nombre d'absences concernées (0 = nouvelle demande).
  const ajouterJustification = ({ debut, fin, raison, commentaire, fichier }) => {
    const cibles = absences.filter(a => a.eleve === nom && (a.statut === 'non_justifie' || a.statut === 'refuse') && a.jour >= debut && a.jour <= fin);
    const ids = new Set(cibles.map(a => a.id));
    if (ids.size) {
      setAbsences(l => l.map(a => {
        if (!ids.has(a.id)) return a;
        const { decision, ...reste } = a;
        return { ...reste, statut: 'en_attente', motif: raison, commentaire, ...(fichier && { justificatif: fichier }) };
      }));
    } else {
      const jours = nbJours(debut, fin);
      setAbsences(l => [{
        id: nouvelId(), eleve: nom || 'Élève', classe: user?.classe ?? '', jour: debut,
        date: debut === fin ? formatFr(debut) : `${formatFr(debut)} → ${formatFr(fin)}`,
        duree: jours === 1 ? '1 jour' : `${jours} jours`, type: 'Absence', motif: raison, commentaire,
        statut: 'en_attente', ...(fichier && { justificatif: fichier }),
      }, ...l]);
    }
    return ids.size;
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[var(--color-page)]">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 py-6 sm:py-8">
        {gerer ? (
          <VueAdmin eleves={eleves} absences={absences} onAjouterEleve={ajouterEleve} onSupprimerEleve={supprimerEleve}
            onEnregistrerAppel={enregistrerAppel} onDecider={decider} />
        ) : (
          <VueEleve absences={nom ? absences.filter(a => a.eleve === nom) : absences} onJustifier={ajouterJustification} />
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════ Vue ÉLÈVE ═════════════════════════════════════════
function VueEleve({ absences, onJustifier }) {
  const nb = {
    absences: absences.filter(a => a.type === 'Absence').length,
    retards: absences.filter(a => a.type === 'Retard').length,
    aJustifier: absences.filter(a => a.statut === 'non_justifie' || a.statut === 'refuse').length,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#001257]">Vie scolaire</h1>
        <div className="flex gap-3">
          <Compteur nom="Absences" valeur={nb.absences} />
          <Compteur nom="Retards" valeur={nb.retards} />
          <Compteur nom="À justifier" valeur={nb.aJustifier} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
        <section className={card}>
          <h2 className="text-base font-bold text-[#001257] mb-4">Mes absences et retards</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr><th className={th}>Date</th><th className={th}>Durée</th><th className={th}>Type</th><th className={th}>Motif</th><th className={th}>Statut</th></tr>
              </thead>
              <tbody>
                {absences.map(a => (
                  <tr key={a.id}>
                    <td className={`${td} font-bold text-[#001257]`}>{a.date}</td>
                    <td className={`${td} text-[#6B7185]`}>{a.duree}</td>
                    <td className={td}>{a.type}</td>
                    <td className={`${td} text-[#6B7185]`}>{a.motif || '—'}</td>
                    <td className={td}><Badge statut={a.statut} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!absences.length && <p className="py-8 text-center text-sm text-[#6B7185]">Aucune absence ni retard.</p>}
          </div>
        </section>

        <FormulaireJustification onEnvoyer={onJustifier} />
      </div>
    </div>
  );
}

function FormulaireJustification({ onEnvoyer }) {
  const [debut, setDebut] = useState(aujourdhui);
  const [fin, setFin] = useState(aujourdhui);
  const [raison, setRaison] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [fichier, setFichier] = useState(null);
  const [message, setMessage] = useState(null); // { ok, texte }

  const changerDebut = v => { setDebut(v); if (fin < v) setFin(v); };

  const choisirFichier = e => {
    const f = e.target.files?.[0] ?? null;
    if (f && f.type !== 'application/pdf') { setMessage({ ok: false, texte: 'Le justificatif doit être un PDF.' }); e.target.value = ''; return setFichier(null); }
    if (f && f.size > TAILLE_MAX) { setMessage({ ok: false, texte: 'Le fichier dépasse 1 Mo.' }); e.target.value = ''; return setFichier(null); }
    setMessage(null);
    setFichier(f);
  };

  const envoyer = async e => {
    e.preventDefault();
    const form = e.target;
    if (!debut || !fin || fin < debut) return setMessage({ ok: false, texte: 'La date de fin doit être après la date de début.' });
    if (!raison) return setMessage({ ok: false, texte: 'Choisissez un motif.' });

    let justificatif = null;
    if (fichier) {
      try { justificatif = { nom: fichier.name, data: await lireFichier(fichier) }; }
      catch { return setMessage({ ok: false, texte: 'Impossible de lire le fichier.' }); }
    }

    const n = onEnvoyer({ debut, fin, raison, commentaire: commentaire.trim(), fichier: justificatif });
    setRaison(''); setCommentaire(''); setFichier(null);
    form.reset();
    setMessage({
      ok: true,
      texte: n
        ? `${n} absence${n > 1 ? 's' : ''} envoyée${n > 1 ? 's' : ''} pour validation à la vie scolaire.`
        : 'Aucune absence à justifier sur cette période : votre demande a été enregistrée et sera examinée par la vie scolaire.',
    });
  };

  return (
    <section className={card}>
      <h2 className="text-base font-bold text-[#001257] mb-1">Justifier une absence</h2>
      <p className="mb-5 text-xs text-[#6B7185]">Indiquez la période : toutes vos absences non justifiées comprises entre ces deux dates sont envoyées.</p>
      <form onSubmit={envoyer} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="debut" className={etiquette}>Début</label>
            <input id="debut" type="date" value={debut} max={fin} onChange={e => changerDebut(e.target.value)} className={champ} />
          </div>
          <div>
            <label htmlFor="fin" className={etiquette}>Fin</label>
            <input id="fin" type="date" value={fin} min={debut} onChange={e => setFin(e.target.value)} className={champ} />
          </div>
        </div>
        <div>
          <label htmlFor="raison" className={etiquette}>Raison</label>
          <select id="raison" value={raison} onChange={e => setRaison(e.target.value)} className={champ}>
            <option value="" disabled>Choisir un motif</option>
            {MOTIFS.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="fichier" className={etiquette}>Justificatif (PDF, 1 Mo max)</label>
          <input id="fichier" type="file" accept="application/pdf" onChange={choisirFichier} className={champ} />
          <p className="mt-1 text-xs text-[#6B7185]">Un justificatif médical est une donnée sensible : ne joignez que le nécessaire. Seule la vie scolaire y a accès.</p>
        </div>
        <div>
          <label htmlFor="commentaire" className={etiquette}>Commentaire</label>
          <input id="commentaire" type="text" maxLength={300} value={commentaire} onChange={e => setCommentaire(e.target.value)} placeholder="Précisions éventuelles" className={champ} />
        </div>
        <button type="submit" className={btnPrincipal}>Envoyer la justification</button>
        {message && <p role="status" className={`text-xs ${message.ok ? 'text-[#1E7F55]' : 'text-[#B23A3A]'}`}>{message.texte}</p>}
      </form>
    </section>
  );
}

// ═══════════════════════════ Vue ADMINISTRATION ════════════════════════════════
function VueAdmin({ eleves, absences, onAjouterEleve, onSupprimerEleve, onEnregistrerAppel, onDecider }) {
  const [onglet, setOnglet] = useState('appel'); // 'appel' | 'absences'
  const aTraiter = absences.filter(a => a.statut === 'en_attente').length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#001257]">Vie scolaire</h1>
          <p className="mt-1 text-sm text-[#6B7185]">Appel des classes et justifications d'absence.</p>
        </div>
        <div className="flex gap-3">
          <Compteur nom="À traiter" valeur={aTraiter} />
          <Compteur nom="Non justifiées" valeur={absences.filter(a => a.statut === 'non_justifie').length} />
          <Compteur nom="Justifiées" valeur={absences.filter(a => a.statut === 'justifie').length} />
        </div>
      </div>

      <div className="flex gap-2" role="tablist" aria-label="Vie scolaire">
        {[['appel', "Faire l'appel"], ['absences', `Absences et justifications${aTraiter ? ` (${aTraiter})` : ''}`]].map(([cle, texte]) => (
          <button key={cle} role="tab" aria-selected={onglet === cle} onClick={() => setOnglet(cle)}
            className={`rounded-full border px-5 py-2 text-sm font-semibold transition ${onglet === cle ? 'bg-[#001257] border-[#001257] text-white' : 'bg-white border-[#E1E5EE] text-[#001257] hover:bg-[#EEF1F7]'}`}>
            {texte}
          </button>
        ))}
      </div>

      {onglet === 'appel'
        ? <Appel eleves={eleves} absences={absences} onEnregistrer={onEnregistrerAppel} onAjouterEleve={onAjouterEleve} onSupprimerEleve={onSupprimerEleve} />
        : <ListeAbsences absences={absences} onDecider={onDecider} />}
    </div>
  );
}

// ── Onglet « Faire l'appel » ────────────────────────────────────────────────
function Appel({ eleves, absences, onEnregistrer, onAjouterEleve, onSupprimerEleve }) {
  const classes = [...new Set(eleves.map(e => e.classe))].sort();
  const [classeChoisie, setClasseChoisie] = useState('');
  const classe = classes.includes(classeChoisie) ? classeChoisie : classes[0] ?? '';
  const [jour, setJour] = useState(aujourdhui);
  const [creneau, setCreneau] = useState('matin');
  const [marques, setMarques] = useState({}); // élèves touchés : { [id]: { etat, minutes } }
  const [message, setMessage] = useState(null);

  const liste = eleves.filter(e => e.classe === classe);
  const cle = `${jour}|${creneau}`;
  const existant = id => absences.find(a => a.eleveId === id && a.appel === cle);
  const etat = id => marques[id]?.etat ?? (existant(id) ? (existant(id).type === 'Retard' ? 'retard' : 'absent') : 'present');
  const minutes = id => marques[id]?.minutes ?? 10;

  const marquer = (id, patch) => { setMarques(m => ({ ...m, [id]: { etat: etat(id), minutes: minutes(id), ...patch } })); setMessage(null); };
  const changer = setter => v => { setter(v); setMarques({}); setMessage(null); };

  const enregistrer = e => {
    e.preventDefault();
    onEnregistrer({ jour, creneau, liste, marques });
    const nbAbs = liste.filter(x => etat(x.id) === 'absent').length;
    const nbRet = liste.filter(x => etat(x.id) === 'retard').length;
    setMessage({ ok: true, texte: `Appel enregistré : ${nbAbs} absent${nbAbs > 1 ? 's' : ''}, ${nbRet} retard${nbRet > 1 ? 's' : ''}.` });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
      <form onSubmit={enregistrer} className={`${card} flex flex-col gap-5`}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="classe" className={etiquette}>Classe</label>
            <select id="classe" value={classe} onChange={e => changer(setClasseChoisie)(e.target.value)} className={champ} disabled={!classes.length}>
              {!classes.length && <option>—</option>}
              {classes.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="jour" className={etiquette}>Date</label>
            <input id="jour" type="date" value={jour} max={aujourdhui()} onChange={e => changer(setJour)(e.target.value)} className={champ} />
          </div>
          <div>
            <label htmlFor="creneau" className={etiquette}>Créneau</label>
            <select id="creneau" value={creneau} onChange={e => changer(setCreneau)(e.target.value)} className={champ}>
              {CRENEAUX.map(c => <option key={c.cle} value={c.cle}>{c.label}</option>)}
            </select>
          </div>
        </div>

        {liste.length ? (
          <ul className="divide-y divide-[#E1E5EE]">
            {liste.map(el => (
              <li key={el.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#001257]">{el.nom}</span>
                <div className="flex gap-1.5" role="radiogroup" aria-label={`Présence de ${el.nom}`}>
                  {[['present', 'Présent', 'bg-[#E3F5EC] text-[#1E7F55] border-[#1E7F55]'], ['absent', 'Absent', 'bg-[#FBE6E6] text-[#B23A3A] border-[#B23A3A]'], ['retard', 'En retard', 'bg-[#FFF3D6] text-[#8A5A00] border-[#8A5A00]']].map(([val, texte, actif]) => (
                    <button key={val} type="button" role="radio" aria-checked={etat(el.id) === val} onClick={() => marquer(el.id, { etat: val })}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${etat(el.id) === val ? actif : 'border-[#E1E5EE] bg-white text-[#6B7185] hover:bg-[#EEF1F7]'}`}>
                      {texte}
                    </button>
                  ))}
                </div>
                {etat(el.id) === 'retard' && (
                  <label className="flex items-center gap-1 text-xs text-[#6B7185]">
                    <input type="number" min={1} max={240} value={minutes(el.id)} onChange={e => marquer(el.id, { minutes: Math.min(240, Math.max(1, Number(e.target.value) || 1)) })}
                      aria-label={`Minutes de retard de ${el.nom}`} className="w-16 rounded-lg border border-[#E1E5EE] px-2 py-1 text-sm" /> min
                  </label>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-6 text-center text-sm text-[#6B7185]">
            {classes.length ? 'Aucun élève dans cette classe.' : "Aucun élève pour le moment. Ajoutez d'abord les élèves de la classe (à droite)."}
          </p>
        )}

        {liste.length > 0 && <button type="submit" className={btnPrincipal}>Enregistrer l'appel</button>}
        {message && <p role="status" className="text-xs text-[#1E7F55]">{message.texte}</p>}
      </form>

      <GestionEleves eleves={eleves} classes={classes} onAjouter={onAjouterEleve} onSupprimer={onSupprimerEleve} />
    </div>
  );
}

function GestionEleves({ eleves, classes, onAjouter, onSupprimer }) {
  const [nom, setNom] = useState('');
  const [classe, setClasse] = useState('');

  const ajouter = e => {
    e.preventDefault();
    if (!nom.trim() || !classe.trim()) return;
    onAjouter({ nom: nom.trim().slice(0, 80), classe: classe.trim().slice(0, 40) });
    setNom('');
  };

  return (
    <section className={card}>
      <h2 className="text-base font-bold text-[#001257] mb-1">Élèves</h2>
      <p className="mb-4 text-xs text-[#6B7185]">Le nom doit être identique au nom de connexion de l'élève pour qu'il voie ses absences.</p>
      <form onSubmit={ajouter} className="flex flex-col gap-3">
        <div>
          <label htmlFor="nom-eleve" className={etiquette}>Nom</label>
          <input id="nom-eleve" type="text" value={nom} onChange={e => setNom(e.target.value)} placeholder="ex : John Doe" className={champ} />
        </div>
        <div>
          <label htmlFor="classe-eleve" className={etiquette}>Classe</label>
          <input id="classe-eleve" type="text" list="classes-connues" value={classe} onChange={e => setClasse(e.target.value)} placeholder="ex : BTS SIO 1" className={champ} />
          <datalist id="classes-connues">{classes.map(c => <option key={c} value={c} />)}</datalist>
        </div>
        <button type="submit" disabled={!nom.trim() || !classe.trim()} className={btnSecondaire}>+ Ajouter l'élève</button>
      </form>

      {eleves.length > 0 && (
        <ul className="mt-4 divide-y divide-[#E1E5EE] border-t border-[#E1E5EE]">
          {eleves.map(e => (
            <li key={e.id} className="flex items-center gap-2 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[#1A1D2E]">{e.nom}</p>
                <p className="text-xs text-[#6B7185]">{e.classe}</p>
              </div>
              <button onClick={() => onSupprimer(e.id)} aria-label={`Retirer ${e.nom}`} className="rounded px-2 py-1 text-xs font-semibold text-[#B23A3A] hover:bg-[#FBE6E6]">Retirer</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ── Onglet « Absences et justifications » ───────────────────────────────────
const FILTRES = [['tous', 'Toutes'], ['en_attente', 'À traiter'], ['non_justifie', 'Non justifiées'], ['justifie', 'Justifiées'], ['refuse', 'Refusées']];

function ListeAbsences({ absences, onDecider }) {
  const [filtre, setFiltre] = useState('en_attente');
  const [recherche, setRecherche] = useState('');
  const [detailId, setDetailId] = useState(null);

  const visibles = useMemo(() => {
    const q = norm(recherche.trim());
    return absences
      .filter(a => filtre === 'tous' || a.statut === filtre)
      .filter(a => !q || [a.eleve, a.classe, a.motif].some(v => norm(v).includes(q)));
  }, [absences, filtre, recherche]);
  const detail = absences.find(a => a.id === detailId);

  return (
    <section className={card}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer par statut">
          {FILTRES.map(([cle, texte]) => (
            <button key={cle} type="button" aria-pressed={filtre === cle} onClick={() => setFiltre(cle)}
              className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${filtre === cle ? 'bg-[#001257] border-[#001257] text-white' : 'bg-white border-[#E1E5EE] text-[#001257] hover:bg-[#EEF1F7]'}`}>
              {texte}
            </button>
          ))}
        </div>
        <div>
          <label htmlFor="recherche" className="sr-only">Rechercher un élève</label>
          <input id="recherche" type="search" value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Rechercher un élève…"
            className="w-60 rounded-lg border border-[#E1E5EE] bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#001257]" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr><th className={th}>Élève</th><th className={th}>Date</th><th className={th}>Durée</th><th className={th}>Motif</th><th className={th}>Statut</th><th className={th}><span className="sr-only">Actions</span></th></tr>
          </thead>
          <tbody>
            {visibles.map(a => (
              <tr key={a.id} className="hover:bg-[#F7F8FB]">
                <td className={td}>
                  <p className="font-semibold text-[#001257]">{a.eleve}</p>
                  <p className="text-xs text-[#6B7185]">{a.classe}</p>
                </td>
                <td className={`${td} text-[#1A1D2E]`}>{a.date}</td>
                <td className={`${td} text-[#6B7185]`}>{a.type === 'Retard' ? `Retard · ${a.duree}` : a.duree}</td>
                <td className={`${td} text-[#6B7185]`}>
                  {a.motif || '—'}{a.justificatif && <span title="Justificatif joint" className="ml-1.5">📎</span>}
                </td>
                <td className={td}><Badge statut={a.statut} /></td>
                <td className={`${td} whitespace-nowrap`}>
                  <div className="flex justify-end gap-2">
                    {a.statut !== 'justifie' && (
                      <button onClick={() => onDecider(a.id, 'justifie')} className="rounded-lg bg-[#E3F5EC] px-3 py-1.5 text-xs font-bold text-[#1E7F55] hover:opacity-80 transition">Justifier</button>
                    )}
                    <button onClick={() => setDetailId(a.id)} className="rounded-lg border border-[#E1E5EE] px-3 py-1.5 text-xs font-semibold text-[#001257] hover:bg-[#EEF1F7] transition">Détail</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visibles.length && (
          <p className="py-8 text-center text-sm text-[#6B7185]">
            {absences.length ? 'Aucune absence dans cette catégorie.' : "Aucune absence pour le moment. Faites l'appel pour en créer."}
          </p>
        )}
      </div>

      {detail && <DetailModal absence={detail} onDecider={onDecider} onClose={() => setDetailId(null)} />}
    </section>
  );
}

function DetailModal({ absence: a, onDecider, onClose }) {
  const Ligne = ({ nom, children }) => (
    <div className="flex justify-between gap-4 text-sm">
      <dt className="text-[#6B7185]">{nom}</dt>
      <dd className="text-right font-medium text-[#1A1D2E] break-words">{children}</dd>
    </div>
  );

  return (
    <Modal onClose={onClose} className="max-w-md rounded-2xl p-6" label={`Absence de ${a.eleve}`}>
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-[#001257]">{a.eleve}</h3>
            <p className="text-xs text-[#6B7185]">{a.classe}</p>
          </div>
          <Badge statut={a.statut} />
        </div>

        <dl className="flex flex-col gap-2">
          <Ligne nom="Date">{a.date}</Ligne>
          <Ligne nom="Durée">{a.duree}</Ligne>
          <Ligne nom="Type">{a.type}</Ligne>
          <Ligne nom="Motif">{a.motif || '—'}</Ligne>
          {a.commentaire && <Ligne nom="Commentaire de l'élève">{a.commentaire}</Ligne>}
          {a.justificatif && <Ligne nom="Justificatif">{a.justificatif.nom}</Ligne>}
          {a.decision && <Ligne nom="Traitée par">{a.decision.par}, le {a.decision.le}</Ligne>}
        </dl>

        {a.justificatif && <button onClick={() => telecharger(a.justificatif)} className={btnSecondaire}>Télécharger le justificatif (PDF)</button>}

        <div className="flex flex-wrap justify-end gap-2 pt-4 border-t border-[#E1E5EE]">
          {a.statut !== 'en_attente' && a.statut !== 'non_justifie' && <button onClick={() => onDecider(a.id, 'en_attente')} className={btnSecondaire}>Remettre en attente</button>}
          {a.statut !== 'refuse' && a.statut !== 'justifie' && <button onClick={() => onDecider(a.id, 'refuse')} className="rounded-lg bg-[#FBE6E6] px-4 py-2 text-sm font-bold text-[#B23A3A] hover:opacity-80 transition">Refuser</button>}
          {a.statut !== 'justifie' && <button onClick={() => onDecider(a.id, 'justifie')} className={btnPrincipal}>Justifier</button>}
          {a.statut === 'justifie' && <button onClick={onClose} className={btnSecondaire}>Fermer</button>}
        </div>
      </div>
    </Modal>
  );
}