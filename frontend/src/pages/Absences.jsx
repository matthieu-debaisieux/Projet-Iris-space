import { useEffect, useMemo, useState } from 'react';
import DataState from '@/components/ui/DataState.jsx';
import Modal from '@/components/ui/Modal.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { useAsync } from '@/hooks/useAsync.js';
import {
  EXTENSIONS_FICHIER,
  MOTIF_MAX,
  STATUT_ABSENCE_LABEL,
  TAILLE_MAX_FICHIER,
  createAbsenceAdmin,
  deleteAbsenceAdmin,
  envoyerJustificatifEleve,
  getAbsencesAdmin,
  getAbsencesEleve,
  getCoursElevePourAbsence,
  getJustificatifAbsenceUrl,
  updateAbsenceAdmin,
  uploadJustificatifAdmin,
} from '@/services/absences.js';
import { getClasses, getUtilisateurs } from '@/services/utilisateurs.js';
import { USE_MOCKS, messageLisible } from '@/services/api.js';

// Page « Vie scolaire », une seule URL pour tous : ce qui s'affiche dépend des droits.
//   - droit `tableau_de_bord` (administration) : gestion des absences et retards de l'établissement
//     (liste filtrable par date/statut, saisie, appel par classe, justification et suppression)
//   - sinon (élève) : ses absences et retards via getAbsencesEleve() (GET /eleve/absences en mode API), et le
//     formulaire d'envoi d'un justificatif pour l'une d'elles (POST /eleve/absences/{id}/justificatif).

const MOTIFS = ['Arrêt maladie', 'Rendez-vous médical', 'Problème de transport', 'Raison familiale', 'Autre'];

const BADGE = {
  non_justifie: 'bg-[#FBE6E6] text-[#B23A3A]',
  justifie: 'bg-[#E3F5EC] text-[#1E7F55]',
  en_attente: 'bg-[#FFF3D6] text-[#8A5A00]',
};

const card = 'bg-white rounded-2xl border border-[#E1E5EE] p-6';
const th = 'bg-[#EEF1F7] px-4 py-3 text-left text-xs font-medium text-[#6B7185] first:rounded-l-lg last:rounded-r-lg';
const td = 'px-4 py-4 border-b border-[#E1E5EE]';
const champ = 'w-full rounded-lg border border-[#E1E5EE] bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-[#001257]';
const label = 'block mb-1.5 text-xs font-semibold text-[#1A1D2E]';
const btnPrincipal = 'inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#EC6F6F] px-4 py-2.5 text-sm font-bold text-[#001257] hover:opacity-90 disabled:opacity-50 transition';
const btnSecondaire = 'inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#E1E5EE] bg-white px-4 py-2 text-sm font-semibold text-[#001257] hover:bg-[#EEF1F7] disabled:opacity-50 transition';
const btnDanger = 'inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#FBE6E6] px-4 py-2 text-sm font-bold text-[#B23A3A] hover:opacity-85 disabled:opacity-50 transition';

const aujourdhui = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const formatFr = iso => iso.split('-').reverse().join('/');
const norm = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const heureTexte = horodatage => horodatage.replace(/^\d{4}-\d{2}-\d{2}[T ](\d{2}):(\d{2}).*$/, '$1h$2');

const texteErreur = (err, fallback) => messageLisible(err) || err?.message || fallback;

// Une absence du service → une ligne du tableau (vue élève)
const versLigne = a => ({
  id: a.id,
  date: a.date ?? formatFr(aujourdhui()),
  duree: a.duree ?? `${a.heureDebut} – ${a.heureFin}`,
  type: a.type ?? 'Absence',
  motif: a.motif ?? a.notes ?? '',
  statut: a.statut,
});

export default function VieScolaire() {
  const { can } = useAuth();
  return can('tableau_de_bord') ? <VieScolaireEtablissement /> : <VieScolaireEleve />;
}

// ═══════════════════════════ Vue ADMINISTRATION ════════════════════════════════

const FILTRES_STATUT = [
  ['tous', 'Toutes'],
  ['non_justifie', 'Non justifiées'],
  ['en_attente', 'À traiter'],
  ['justifie', 'Justifiées'],
];

function VieScolaireEtablissement() {
  const [onglet, setOnglet] = useState('absences'); // 'absences' | 'appel'
  const [date, setDate] = useState(aujourdhui);
  const [statut, setStatut] = useState('tous');
  const [recherche, setRecherche] = useState('');
  const [saisieOuverte, setSaisieOuverte] = useState(false);
  const [detailAbsence, setDetailAbsence] = useState(null);
  const [actionErreur, setActionErreur] = useState('');
  const [busyId, setBusyId] = useState(null);

  const donnees = useAsync(() => getAbsencesAdmin({ date, statut }), [date, statut]);
  const eleves = useAsync(() => getUtilisateurs('eleve'), []);
  const classes = useAsync(getClasses, []);

  const absences = donnees.data?.absences ?? [];
  const resume = donnees.data?.resume ?? {
    absences: 0,
    retards: 0,
    non_justifiees: 0,
    en_attente: 0,
    justifiees: 0,
  };

  const visibles = useMemo(() => {
    const q = norm(recherche.trim());
    if (!q) return absences;
    return absences.filter(a =>
      [a.eleve, a.classe, a.motif, a.libelle, a.matiere].some(v => norm(v).includes(q)),
    );
  }, [absences, recherche]);

  const choisirStatut = nouveau => {
    setStatut(nouveau);
    setActionErreur('');
    if (nouveau === 'en_attente') {
      // « À traiter » affiche tous les justificatifs en attente tous jours confondus par défaut
      setDate('');
    } else if (!date) {
      setDate(aujourdhui());
    }
  };

  const choisirDate = nouvelleDate => {
    setDate(nouvelleDate);
    setActionErreur('');
    if (!nouvelleDate && statut === 'tous') {
      setStatut('en_attente');
    }
  };

  const rafraichir = () => {
    donnees.reload();
  };

  const justifierRapide = async absence => {
    setActionErreur('');
    setBusyId(absence.id);
    try {
      const maj = await updateAbsenceAdmin(absence.id, { justifie: true });
      if (detailAbsence?.id === absence.id) setDetailAbsence(maj);
      rafraichir();
    } catch (err) {
      setActionErreur(texteErreur(err, "Impossible de justifier l'absence."));
    } finally {
      setBusyId(null);
    }
  };

  const supprimerAbsence = async absence => {
    setActionErreur('');
    setBusyId(absence.id);
    try {
      await deleteAbsenceAdmin(absence.id);
      if (detailAbsence?.id === absence.id) setDetailAbsence(null);
      rafraichir();
    } catch (err) {
      setActionErreur(texteErreur(err, "Impossible de supprimer l'absence."));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[var(--color-page)]">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#001257]">Vie scolaire</h1>
            <p className="mt-1 text-sm text-[#6B7185]">
              Absences, retards et justificatifs de l&apos;établissement.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Compteur nom="Absences" valeur={resume.absences} />
            <Compteur nom="Retards" valeur={resume.retards} />
            <Compteur nom="Non justifiées" valeur={resume.non_justifiees} />
            <Compteur nom="À traiter" valeur={resume.en_attente} />
            <Compteur nom="Justifiées" valeur={resume.justifiees} />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2" role="tablist" aria-label="Vie scolaire">
            {[
              ['absences', 'Absences et retards'],
              ['appel', "Faire l'appel"],
            ].map(([cle, texte]) => (
              <button
                key={cle}
                role="tab"
                aria-selected={onglet === cle}
                onClick={() => setOnglet(cle)}
                className={`rounded-full border px-5 py-2 text-sm font-semibold transition ${
                  onglet === cle
                    ? 'bg-[#001257] border-[#001257] text-white'
                    : 'bg-white border-[#E1E5EE] text-[#001257] hover:bg-[#EEF1F7]'
                }`}
              >
                {texte}
              </button>
            ))}
          </div>

          <button type="button" onClick={() => setSaisieOuverte(true)} className={btnPrincipal}>
            + Saisir une absence
          </button>
        </div>

        {actionErreur && (
          <p role="alert" className="rounded-xl border border-[#F5C2C2] bg-[#FBE6E6] px-4 py-3 text-sm text-[#B23A3A]">
            {actionErreur}
          </p>
        )}

        {onglet === 'absences' ? (
          <section className={card}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer par statut">
                {FILTRES_STATUT.map(([cle, texte]) => (
                  <button
                    key={cle}
                    type="button"
                    aria-pressed={statut === cle}
                    onClick={() => choisirStatut(cle)}
                    className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
                      statut === cle
                        ? 'bg-[#001257] border-[#001257] text-white'
                        : 'bg-white border-[#E1E5EE] text-[#001257] hover:bg-[#EEF1F7]'
                    }`}
                  >
                    {texte}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="filtre-date" className="sr-only">Date</label>
                <input
                  id="filtre-date"
                  type="date"
                  value={date}
                  max={aujourdhui()}
                  onChange={e => choisirDate(e.target.value)}
                  className="rounded-lg border border-[#E1E5EE] bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#001257]"
                />
                {date !== aujourdhui() && (
                  <button
                    type="button"
                    onClick={() => setDate(aujourdhui())}
                    className="rounded-lg border border-[#E1E5EE] px-3 py-2 text-xs font-semibold text-[#001257] hover:bg-[#EEF1F7]"
                  >
                    Aujourd&apos;hui
                  </button>
                )}
                {statut !== 'tous' && date && (
                  <button
                    type="button"
                    onClick={() => setDate('')}
                    className="rounded-lg border border-[#E1E5EE] px-3 py-2 text-xs font-semibold text-[#001257] hover:bg-[#EEF1F7]"
                  >
                    Toutes les dates
                  </button>
                )}
                <label htmlFor="recherche-absence" className="sr-only">Rechercher un élève</label>
                <input
                  id="recherche-absence"
                  type="search"
                  value={recherche}
                  onChange={e => setRecherche(e.target.value)}
                  placeholder="Rechercher un élève, classe…"
                  className="w-56 rounded-lg border border-[#E1E5EE] bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#001257]"
                />
              </div>
            </div>

            <DataState state={donnees}>
              {() => (visibles.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[740px] border-separate border-spacing-0 text-sm">
                    <thead>
                      <tr>
                        <th scope="col" className={th}>Élève</th>
                        <th scope="col" className={th}>Date</th>
                        <th scope="col" className={th}>Cours / Durée</th>
                        <th scope="col" className={th}>Motif</th>
                        <th scope="col" className={th}>Statut</th>
                        <th scope="col" className={th}><span className="sr-only">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibles.map(row => {
                        const enCours = busyId === row.id;
                        const detailCours = [row.matiere || row.libelle, row.duree !== '—' ? row.duree : null].filter(Boolean).join(' · ');
                        return (
                          <tr key={row.id} className="hover:bg-[#F7F8FB]">
                            <td className={td}>
                              <p className="font-bold text-[#001257]">{row.eleve}</p>
                              <p className="text-xs text-[#6B7185]">{row.classe}</p>
                            </td>
                            <td className={`${td} text-[#1A1D2E] whitespace-nowrap`}>{row.date}</td>
                            <td className={`${td} text-[#6B7185]`}>
                              <span className="font-medium text-[#1A1D2E]">{row.typeLabel}</span>
                              {detailCours && ` · ${detailCours}`}
                            </td>
                            <td className={`${td} text-[#6B7185]`}>
                              {row.motif || '—'}
                              {row.justificatif_envoye && (
                                <span title="Justificatif joint" className="ml-1.5">📎</span>
                              )}
                            </td>
                            <td className={td}>
                              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${BADGE[row.statut] ?? BADGE.en_attente}`}>
                                {STATUT_ABSENCE_LABEL[row.statut] ?? row.statut}
                              </span>
                            </td>
                            <td className={`${td} whitespace-nowrap`}>
                              <div className="flex justify-end gap-2">
                                {!row.justifie && (
                                  <button
                                    type="button"
                                    disabled={enCours}
                                    onClick={() => justifierRapide(row)}
                                    className="rounded-lg bg-[#E3F5EC] px-3 py-1.5 text-xs font-bold text-[#1E7F55] hover:opacity-80 disabled:opacity-50 transition"
                                  >
                                    Justifier
                                  </button>
                                )}
                                <button
                                  type="button"
                                  disabled={enCours}
                                  onClick={() => setDetailAbsence(row)}
                                  className="rounded-lg border border-[#E1E5EE] px-3 py-1.5 text-xs font-semibold text-[#001257] hover:bg-[#EEF1F7] disabled:opacity-50 transition"
                                >
                                  Détail
                                </button>
                                <button
                                  type="button"
                                  disabled={enCours}
                                  onClick={() => supprimerAbsence(row)}
                                  className="rounded-lg bg-[#FBE6E6] px-3 py-1.5 text-xs font-bold text-[#B23A3A] hover:opacity-80 disabled:opacity-50 transition"
                                >
                                  Supprimer
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-[#6B7185]">
                  {absences.length
                    ? 'Aucun résultat pour cette recherche.'
                    : (date ? `Aucune absence le ${formatFr(date)}.` : 'Aucune absence dans cette catégorie.')}
                </p>
              ))}
            </DataState>
          </section>
        ) : (
          <AppelClasses
            elevesState={eleves}
            classesState={classes}
            onEnregistre={jour => {
              setDate(jour);
              setStatut('tous');
              setOnglet('absences');
              rafraichir();
            }}
          />
        )}
      </div>

      {saisieOuverte && (
        <SaisieAbsenceModal
          eleves={eleves.data ?? []}
          classes={classes.data ?? []}
          dateInitiale={date || aujourdhui()}
          onClose={() => setSaisieOuverte(false)}
          onCreated={creee => {
            setSaisieOuverte(false);
            if (creee?.date_absence) setDate(creee.date_absence);
            setStatut('tous');
            setOnglet('absences');
            rafraichir();
          }}
        />
      )}

      {detailAbsence && (
        <DetailAbsenceModal
          absence={detailAbsence}
          onClose={() => setDetailAbsence(null)}
          onUpdated={maj => {
            setDetailAbsence(maj);
            rafraichir();
          }}
          onDeleted={() => {
            setDetailAbsence(null);
            rafraichir();
          }}
        />
      )}
    </div>
  );
}

// ── Modale : saisir une absence ou un retard ────────────────────────────────
function SaisieAbsenceModal({ eleves, classes, dateInitiale, onClose, onCreated }) {
  const [classeFiltre, setClasseFiltre] = useState('');
  const [eleveId, setEleveId] = useState('');
  const [dateAbsence, setDateAbsence] = useState(dateInitiale);
  const [coursListe, setCoursListe] = useState([]);
  const [coursId, setCoursId] = useState('');
  const [type, setType] = useState('absence');
  const [dureeHeures, setDureeHeures] = useState('');
  const [minutesRetard, setMinutesRetard] = useState('10');
  const [libelle, setLibelle] = useState('');
  const [motif, setMotif] = useState('');
  const [justifie, setJustifie] = useState(false);
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState('');

  const elevesFiltres = useMemo(() => {
    if (!classeFiltre) return eleves;
    return eleves.filter(e => String(e.classe_id ?? '') === classeFiltre || e.classe === classeFiltre);
  }, [eleves, classeFiltre]);

  useEffect(() => {
    let actif = true;
    setCoursId('');
    if (!eleveId || !dateAbsence || USE_MOCKS) {
      setCoursListe([]);
      return undefined;
    }
    getCoursElevePourAbsence(eleveId, dateAbsence)
      .then(liste => { if (actif) setCoursListe(liste); })
      .catch(() => { if (actif) setCoursListe([]); });
    return () => { actif = false; };
  }, [eleveId, dateAbsence]);

  const choisirCours = id => {
    setCoursId(id);
    const cours = coursListe.find(c => c.id === id);
    if (!cours) return;
    if (!libelle.trim() && cours.matiere) setLibelle(cours.matiere);
    if (type === 'absence' && !dureeHeures && cours.debut && cours.fin) {
      const h = (Date.parse(cours.fin) - Date.parse(cours.debut)) / 3600000;
      if (Number.isFinite(h) && h > 0) {
        setDureeHeures(String(Math.round(h * 100) / 100));
      }
    }
  };

  const envoyer = async e => {
    e.preventDefault();
    setErreur('');
    if (!eleveId) {
      setErreur('Veuillez sélectionner un élève.');
      return;
    }

    const payload = {
      eleve_id: eleveId,
      type,
      date_absence: dateAbsence || aujourdhui(),
      justifie,
    };
    if (coursId) payload.cours_id = coursId;
    if (libelle.trim()) payload.libelle = libelle.trim();
    if (motif.trim()) payload.motif = motif.trim();

    if (type === 'retard') {
      const min = Number(minutesRetard);
      if (!Number.isInteger(min) || min < 1 || min > 480) {
        setErreur('Le retard doit être compris entre 1 et 480 minutes.');
        return;
      }
      payload.minutes_retard = min;
    } else if (dureeHeures !== '') {
      const h = Number(dureeHeures);
      if (!Number.isFinite(h) || h <= 0 || h > 24) {
        setErreur('La durée doit être comprise entre 0 et 24 heures.');
        return;
      }
      payload.duree_heures = h;
    }

    setBusy(true);
    try {
      const creee = await createAbsenceAdmin(payload);
      onCreated(creee);
    } catch (err) {
      setErreur(texteErreur(err, "Impossible d'enregistrer l'absence."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal onClose={() => { if (!busy) onClose(); }} className="max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto" label="Saisir une absence ou un retard">
      <form onSubmit={envoyer} className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-bold text-[#001257]">Saisir une absence ou un retard</h3>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Fermer"
            className="text-[#6B7185] hover:text-[#1A1D2E] text-xl font-bold leading-none"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="saisie-classe" className={label}>Filtrer par classe</label>
            <select
              id="saisie-classe"
              value={classeFiltre}
              onChange={e => { setClasseFiltre(e.target.value); setEleveId(''); }}
              className={champ}
              disabled={busy}
            >
              <option value="">Toutes les classes</option>
              {classes.map(c => (
                <option key={c.id} value={String(c.id)}>{c.nom}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="saisie-date" className={label}>Date *</label>
            <input
              id="saisie-date"
              type="date"
              value={dateAbsence}
              max={aujourdhui()}
              onChange={e => setDateAbsence(e.target.value)}
              className={champ}
              disabled={busy}
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="saisie-eleve" className={label}>Élève *</label>
          <select
            id="saisie-eleve"
            value={eleveId}
            onChange={e => setEleveId(e.target.value)}
            className={champ}
            disabled={busy}
            required
          >
            <option value="">Sélectionner un élève…</option>
            {elevesFiltres.map(el => (
              <option key={el.id} value={el.id}>
                {el.nom} {el.prenom}{el.classe ? ` (${el.classe})` : ''}
              </option>
            ))}
          </select>
        </div>

        {coursListe.length > 0 && (
          <div>
            <label htmlFor="saisie-cours" className={label}>Cours concerné (facultatif)</label>
            <select
              id="saisie-cours"
              value={coursId}
              onChange={e => choisirCours(e.target.value)}
              className={champ}
              disabled={busy}
            >
              <option value="">Hors cours / saisie libre</option>
              {coursListe.map(c => {
                const plage = `${heureTexte(c.debut)} – ${heureTexte(c.fin)}`;
                const info = c.annule ? ' (annulé)' : (c.deja_saisie ? ' (déjà saisi)' : '');
                return (
                  <option key={c.id} value={c.id} disabled={Boolean(c.annule || c.deja_saisie)}>
                    {plage} · {c.matiere}{info}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="saisie-type" className={label}>Type</label>
            <select
              id="saisie-type"
              value={type}
              onChange={e => setType(e.target.value)}
              className={champ}
              disabled={busy}
            >
              <option value="absence">Absence</option>
              <option value="retard">Retard</option>
            </select>
          </div>

          {type === 'retard' ? (
            <div>
              <label htmlFor="saisie-minutes" className={label}>Minutes de retard *</label>
              <input
                id="saisie-minutes"
                type="number"
                min={1}
                max={480}
                value={minutesRetard}
                onChange={e => setMinutesRetard(e.target.value)}
                className={champ}
                disabled={busy}
                required
              />
            </div>
          ) : (
            <div>
              <label htmlFor="saisie-duree" className={label}>Durée (heures)</label>
              <input
                id="saisie-duree"
                type="number"
                min="0.25"
                max="24"
                step="0.25"
                placeholder="ex : 2"
                value={dureeHeures}
                onChange={e => setDureeHeures(e.target.value)}
                className={champ}
                disabled={busy}
              />
            </div>
          )}
        </div>

        <div>
          <label htmlFor="saisie-libelle" className={label}>Libellé / Matière (facultatif)</label>
          <input
            id="saisie-libelle"
            type="text"
            maxLength={200}
            placeholder="ex : Développement web, Matinée…"
            value={libelle}
            onChange={e => setLibelle(e.target.value)}
            className={champ}
            disabled={busy}
          />
        </div>

        <div>
          <label htmlFor="saisie-motif" className={label}>Motif (facultatif)</label>
          <input
            id="saisie-motif"
            type="text"
            list="motifs-absence-connus"
            maxLength={2000}
            placeholder="Précision ou motif"
            value={motif}
            onChange={e => setMotif(e.target.value)}
            className={champ}
            disabled={busy}
          />
          <datalist id="motifs-absence-connus">
            {MOTIFS.map(m => <option key={m} value={m} />)}
          </datalist>
        </div>

        <label className="flex items-center gap-2 text-sm text-[#1A1D2E] cursor-pointer">
          <input
            type="checkbox"
            checked={justifie}
            onChange={e => setJustifie(e.target.checked)}
            disabled={busy}
            className="rounded border-[#E1E5EE]"
          />
          Marquer directement comme justifiée
        </label>

        {erreur && <p role="alert" className="text-xs text-[#B23A3A]">{erreur}</p>}

        <div className="flex justify-end gap-2 pt-3 border-t border-[#E1E5EE]">
          <button type="button" onClick={onClose} disabled={busy} className={btnSecondaire}>
            Annuler
          </button>
          <button type="submit" disabled={busy} className={btnPrincipal}>
            {busy ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Modale : détail, justification, justificatif et suppression ─────────────
function DetailAbsenceModal({ absence: a, onClose, onUpdated, onDeleted }) {
  const [motif, setMotif] = useState(a.motif ?? '');
  const [fichier, setFichier] = useState(null);
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState('');

  const Ligne = ({ nom, children }) => (
    <div className="flex justify-between gap-4 text-sm">
      <dt className="text-[#6B7185]">{nom}</dt>
      <dd className="text-right font-medium text-[#1A1D2E] break-words">{children}</dd>
    </div>
  );

  const sauvegarder = async patch => {
    setErreur('');
    setBusy(true);
    try {
      const maj = await updateAbsenceAdmin(a.id, patch);
      onUpdated(maj);
    } catch (err) {
      setErreur(texteErreur(err, 'Impossible de modifier cette absence.'));
    } finally {
      setBusy(false);
    }
  };

  const envoyerJustificatif = async e => {
    e.preventDefault();
    if (!fichier) {
      setErreur('Sélectionnez un fichier justificatif.');
      return;
    }
    setErreur('');
    setBusy(true);
    try {
      const maj = await uploadJustificatifAdmin(a.id, { fichier, motif });
      setFichier(null);
      onUpdated(maj);
    } catch (err) {
      setErreur(texteErreur(err, "Impossible d'envoyer le justificatif."));
    } finally {
      setBusy(false);
    }
  };

  const supprimer = async () => {
    setErreur('');
    setBusy(true);
    try {
      await deleteAbsenceAdmin(a.id);
      onDeleted();
    } catch (err) {
      setErreur(texteErreur(err, "Impossible de supprimer l'absence."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal onClose={() => { if (!busy) onClose(); }} className="max-w-md rounded-2xl p-6 max-h-[90vh] overflow-y-auto" label={`Absence de ${a.eleve}`}>
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-[#001257]">{a.eleve}</h3>
            <p className="text-xs text-[#6B7185]">{a.classe}</p>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${BADGE[a.statut] ?? BADGE.en_attente}`}>
            {STATUT_ABSENCE_LABEL[a.statut] ?? a.statut}
          </span>
        </div>

        <dl className="flex flex-col gap-2">
          <Ligne nom="Date">{a.date}</Ligne>
          <Ligne nom="Type">{a.typeLabel}</Ligne>
          <Ligne nom="Durée">{a.duree}</Ligne>
          {(a.matiere || a.libelle) && <Ligne nom="Cours / Libellé">{a.matiere || a.libelle}</Ligne>}
          <Ligne nom="Téléphone">{a.tel || 'Non renseigné'}</Ligne>
          <Ligne nom="Email">{a.email || 'Non renseigné'}</Ligne>
        </dl>

        <div>
          <label htmlFor="detail-motif" className={label}>Motif</label>
          <div className="flex gap-2">
            <input
              id="detail-motif"
              type="text"
              list="motifs-detail-absence"
              value={motif}
              onChange={e => setMotif(e.target.value)}
              placeholder="Motif de l'absence…"
              className={champ}
              disabled={busy}
            />
            <datalist id="motifs-detail-absence">
              {MOTIFS.map(m => <option key={m} value={m} />)}
            </datalist>
            <button
              type="button"
              disabled={busy}
              onClick={() => sauvegarder({ motif })}
              className={btnSecondaire}
            >
              Enregistrer
            </button>
          </div>
        </div>

        {a.justificatif_envoye && !USE_MOCKS && (
          <a
            href={getJustificatifAbsenceUrl(a.id)}
            target="_blank"
            rel="noopener noreferrer"
            className={btnSecondaire}
          >
            Consulter le justificatif
          </a>
        )}

        <form onSubmit={envoyerJustificatif} className="flex flex-col gap-2 rounded-xl bg-[#F7F8FB] p-3 border border-[#E1E5EE]">
          <label htmlFor="admin-justificatif" className="text-xs font-semibold text-[#1A1D2E]">
            {a.justificatif_envoye ? 'Remplacer le justificatif' : 'Joindre un justificatif'}
          </label>
          <div className="flex items-center gap-2">
            <input
              id="admin-justificatif"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={e => setFichier(e.target.files?.[0] ?? null)}
              className="min-w-0 flex-1 text-xs"
              disabled={busy}
            />
            <button type="submit" disabled={busy || !fichier} className={btnSecondaire}>
              Envoyer
            </button>
          </div>
        </form>

        {erreur && <p role="alert" className="text-xs text-[#B23A3A]">{erreur}</p>}

        <div className="flex flex-wrap justify-between gap-2 pt-3 border-t border-[#E1E5EE]">
          <button type="button" onClick={supprimer} disabled={busy} className={btnDanger}>
            Supprimer
          </button>

          <div className="flex flex-wrap gap-2">
            {a.justificatif_envoye && (
              <button
                type="button"
                disabled={busy}
                onClick={() => sauvegarder({ justifie: false, supprimer_justificatif: true, motif })}
                className={btnDanger}
              >
                Refuser le justificatif
              </button>
            )}
            {a.justifie ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => sauvegarder({ justifie: false, motif })}
                className={btnSecondaire}
              >
                Retirer la justification
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => sauvegarder({ justifie: true, motif })}
                className={btnPrincipal}
              >
                Justifier
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ── Onglet « Faire l'appel » (repris de INT-03, branché sur l'API) ──────────
function AppelClasses({ elevesState, classesState, onEnregistre }) {
  const classes = classesState.data ?? [];
  const tousEleves = elevesState.data ?? [];

  const [classeId, setClasseId] = useState('');
  const [jour, setJour] = useState(aujourdhui);
  const [libelle, setLibelle] = useState('Matin');
  const [dureeDefaut, setDureeDefaut] = useState('2');
  const [marques, setMarques] = useState({}); // { [eleveId]: { etat: 'present'|'absent'|'retard', minutes } }
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const classeParDefaut = useMemo(() => {
    const avecEleve = classes.find(c => tousEleves.some(e => String(e.classe_id ?? '') === String(c.id)));
    return avecEleve ? String(avecEleve.id) : (classes[0] ? String(classes[0].id) : '');
  }, [classes, tousEleves]);

  const classeActive = classes.some(c => String(c.id) === classeId)
    ? classeId
    : classeParDefaut;

  const liste = useMemo(
    () => tousEleves.filter(e => String(e.classe_id ?? '') === classeActive),
    [tousEleves, classeActive],
  );

  const etat = id => marques[id]?.etat ?? 'present';
  const minutes = id => marques[id]?.minutes ?? 10;

  const marquer = (id, patch) => {
    setMarques(m => ({ ...m, [id]: { etat: etat(id), minutes: minutes(id), ...patch } }));
    setMessage(null);
  };

  const enregistrer = async e => {
    e.preventDefault();
    const cibles = liste.filter(el => etat(el.id) !== 'present');
    if (!cibles.length) {
      setMessage({ ok: true, texte: 'Tous les élèves sont marqués présents.' });
      return;
    }

    setBusy(true);
    setMessage(null);
    let crees = 0;
    try {
      for (const el of cibles) {
        const m = marques[el.id];
        const estRetard = m.etat === 'retard';
        await createAbsenceAdmin({
          eleve_id: el.id,
          type: estRetard ? 'retard' : 'absence',
          date_absence: jour,
          minutes_retard: estRetard ? Number(m.minutes || 10) : undefined,
          duree_heures: !estRetard && dureeDefaut ? Number(dureeDefaut) : undefined,
          libelle: libelle.trim() || undefined,
        });
        crees++;
      }
      setMarques({});
      onEnregistre(jour);
    } catch (err) {
      setMessage({
        ok: false,
        texte: `${crees ? `${crees} enregistré(s). ` : ''}${texteErreur(err, "Erreur lors de l'enregistrement de l'appel.")}`,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <DataState state={elevesState}>
      {() => (
        <form onSubmit={enregistrer} className={`${card} flex flex-col gap-5`}>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label htmlFor="appel-classe" className={label}>Classe</label>
              <select
                id="appel-classe"
                value={classeActive}
                onChange={e => { setClasseId(e.target.value); setMarques({}); setMessage(null); }}
                className={champ}
                disabled={!classes.length || busy}
              >
                {!classes.length && <option value="">—</option>}
                {classes.map(c => (
                  <option key={c.id} value={String(c.id)}>{c.nom}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="appel-date" className={label}>Date</label>
              <input
                id="appel-date"
                type="date"
                value={jour}
                max={aujourdhui()}
                onChange={e => { setJour(e.target.value); setMessage(null); }}
                className={champ}
                disabled={busy}
              />
            </div>
            <div>
              <label htmlFor="appel-libelle" className={label}>Créneau / Cours</label>
              <input
                id="appel-libelle"
                type="text"
                maxLength={200}
                value={libelle}
                onChange={e => setLibelle(e.target.value)}
                placeholder="ex : Matin, Développement…"
                className={champ}
                disabled={busy}
              />
            </div>
            <div>
              <label htmlFor="appel-duree" className={label}>Durée absence (h)</label>
              <input
                id="appel-duree"
                type="number"
                min="0.5"
                max="12"
                step="0.5"
                value={dureeDefaut}
                onChange={e => setDureeDefaut(e.target.value)}
                className={champ}
                disabled={busy}
              />
            </div>
          </div>

          {liste.length ? (
            <ul className="divide-y divide-[#E1E5EE]">
              {liste.map(el => (
                <li key={el.id} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#001257]">
                    {el.nom} {el.prenom}
                  </span>
                  <div className="flex gap-1.5" role="radiogroup" aria-label={`Présence de ${el.nom} ${el.prenom}`}>
                    {[
                      ['present', 'Présent', 'bg-[#E3F5EC] text-[#1E7F55] border-[#1E7F55]'],
                      ['absent', 'Absent', 'bg-[#FBE6E6] text-[#B23A3A] border-[#B23A3A]'],
                      ['retard', 'En retard', 'bg-[#FFF3D6] text-[#8A5A00] border-[#8A5A00]'],
                    ].map(([val, texte, actif]) => (
                      <button
                        key={val}
                        type="button"
                        role="radio"
                        disabled={busy}
                        aria-checked={etat(el.id) === val}
                        onClick={() => marquer(el.id, { etat: val })}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                          etat(el.id) === val
                            ? actif
                            : 'border-[#E1E5EE] bg-white text-[#6B7185] hover:bg-[#EEF1F7]'
                        }`}
                      >
                        {texte}
                      </button>
                    ))}
                  </div>
                  {etat(el.id) === 'retard' && (
                    <label className="flex items-center gap-1 text-xs text-[#6B7185]">
                      <input
                        type="number"
                        min={1}
                        max={480}
                        value={minutes(el.id)}
                        onChange={e => marquer(el.id, { minutes: Math.min(480, Math.max(1, Number(e.target.value) || 1)) })}
                        aria-label={`Minutes de retard de ${el.nom} ${el.prenom}`}
                        className="w-16 rounded-lg border border-[#E1E5EE] px-2 py-1 text-sm"
                        disabled={busy}
                      />
                      min
                    </label>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-[#6B7185]">
              Aucun élève dans cette classe.
            </p>
          )}

          {liste.length > 0 && (
            <div className="flex items-center justify-between gap-3">
              <button type="submit" disabled={busy} className={btnPrincipal}>
                {busy ? 'Enregistrement…' : "Enregistrer l'appel"}
              </button>
              {message && (
                <p role={message.ok ? 'status' : 'alert'} className={`text-xs ${message.ok ? 'text-[#1E7F55]' : 'text-[#B23A3A]'}`}>
                  {message.texte}
                </p>
              )}
            </div>
          )}
        </form>
      )}
    </DataState>
  );
}

// ═══════════════════════════ Vue ÉLÈVE ═════════════════════════════════════════
function VieScolaireEleve() {
  const { user } = useAuth();
  const absences = useAsync(() => getAbsencesEleve(user), [user?.id, user?.nom]);

  // Après l'envoi d'un justificatif : la ligne passe « en attente » sans recharger la liste
  const justificatifEnvoye = (id, { statut, motif }) => {
    absences.setData(liste => liste.map(a => (String(a.id) === String(id) ? { ...a, statut, motif } : a)));
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[var(--color-page)]">
      <div className="mx-auto w-full max-w-[1200px] px-6 py-8">
        <DataState state={absences}>
          {liste => <Contenu liste={liste} onJustificatifEnvoye={justificatifEnvoye} />}
        </DataState>
      </div>
    </div>
  );
}

function Contenu({ liste, onJustificatifEnvoye }) {
  const lignes = liste.map(versLigne);
  const aJustifier = lignes.filter(l => l.statut === 'non_justifie');

  const nb = {
    absences: lignes.filter(l => l.type === 'Absence').length,
    retards: lignes.filter(l => l.type === 'Retard').length,
    aJustifier: aJustifier.length,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-bold text-[#001257]">Vie scolaire</h1>
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
                <tr>
                  <th scope="col" className={th}>Date</th>
                  <th scope="col" className={th}>Durée</th>
                  <th scope="col" className={th}>Type</th>
                  <th scope="col" className={th}>Motif</th>
                  <th scope="col" className={th}>Statut</th>
                </tr>
              </thead>
              <tbody>
                {lignes.map(l => (
                  <tr key={l.id}>
                    <td className={`${td} font-bold text-[#001257]`}>{l.date}</td>
                    <td className={`${td} text-[#6B7185]`}>{l.duree}</td>
                    <td className={td}>{l.type}</td>
                    <td className={`${td} text-[#6B7185]`}>{l.motif || '—'}</td>
                    <td className={td}>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${BADGE[l.statut] ?? BADGE.en_attente}`}>
                        {STATUT_ABSENCE_LABEL[l.statut] ?? l.statut}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!lignes.length && <p className="py-8 text-center text-sm text-[#6B7185]">Aucune absence ni retard.</p>}
          </div>
        </section>

        <Formulaire absences={aJustifier} onEnvoye={onJustificatifEnvoye} />
      </div>
    </div>
  );
}

const Compteur = ({ nom, valeur }) => (
  <div className="bg-white rounded-2xl border border-[#E1E5EE] px-5 py-3 min-w-28">
    <p className="text-xs text-[#6B7185]">{nom}</p>
    <p className="text-2xl font-bold text-[#001257]">{valeur}</p>
  </div>
);

// ── Formulaire de justification : une absence ou un retard + un fichier justificatif ───────────────
// En mode API, envoie le fichier à POST /eleve/absences/{id}/justificatif ; l'absence passe « en attente »
// jusqu'à sa validation par l'administration. Seules les absences « non justifiées » sont proposées.
const EXTENSIONS_ACCEPTEES = EXTENSIONS_FICHIER.map(e => `.${e}`).join(',');

function Formulaire({ absences, onEnvoye }) {
  const [absenceId, setAbsenceId] = useState('');
  const [raison, setRaison] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [fichier, setFichier] = useState(null);
  const [cleFichier, setCleFichier] = useState(0); // change pour vider le champ fichier
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState(null); // { ok, texte }

  // L'absence choisie disparaît de la liste une fois justifiée
  const choix = absences.some(a => String(a.id) === absenceId) ? absenceId : '';

  const choisirFichier = e => {
    setFichier(e.target.files[0] ?? null);
    setMessage(null);
  };

  const envoyer = async e => {
    e.preventDefault();
    if (envoi) return;
    const absence = absences.find(a => String(a.id) === choix);
    if (!absence) return setMessage({ ok: false, texte: "Choisissez l'absence ou le retard à justifier." });
    if (!fichier) return setMessage({ ok: false, texte: 'Joignez le justificatif.' });
    const extension = fichier.name.includes('.') ? fichier.name.split('.').pop().toLowerCase() : '';
    if (!EXTENSIONS_FICHIER.includes(extension)) return setMessage({ ok: false, texte: 'Type de fichier non autorisé.' });
    if (fichier.size > TAILLE_MAX_FICHIER) return setMessage({ ok: false, texte: 'Fichier trop volumineux (10 Mo maximum).' });
    const motif = [raison, commentaire.trim()].filter(Boolean).join(' – ');
    if (motif.length > MOTIF_MAX) return setMessage({ ok: false, texte: 'Le commentaire est trop long.' });

    setEnvoi(true);
    setMessage(null);
    try {
      const resultat = await envoyerJustificatifEleve(absence.id, { fichier, motif });
      onEnvoye(absence.id, resultat);
      setAbsenceId('');
      setRaison('');
      setCommentaire('');
      setFichier(null);
      setCleFichier(c => c + 1);
      setMessage({ ok: true, texte: 'Justification envoyée. Elle est en attente de validation.' });
    } catch (err) {
      setMessage({ ok: false, texte: messageLisible(err) || err?.message || "Impossible d'envoyer la justification." });
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <section className={card}>
      <h2 className="text-base font-bold text-[#001257] mb-5">Justifier une absence</h2>

      {absences.length === 0 && (
        <p className="mb-4 text-xs text-[#6B7185]">Aucune absence ni aucun retard à justifier pour le moment.</p>
      )}

      <form onSubmit={envoyer} className="flex flex-col gap-4">
        <div>
          <label htmlFor="absence-a-justifier" className={label}>Absence ou retard</label>
          <select
            id="absence-a-justifier"
            value={choix}
            onChange={e => setAbsenceId(e.target.value)}
            disabled={absences.length === 0 || envoi}
            className={champ}
          >
            <option value="" disabled>Choisir l&apos;absence à justifier</option>
            {absences.map(a => (
              <option key={a.id} value={String(a.id)}>{a.date} · {a.type} · {a.duree}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="raison" className={label}>Raison (facultatif)</label>
          <select id="raison" value={raison} onChange={e => setRaison(e.target.value)} disabled={envoi} className={champ}>
            <option value="">Aucune raison précisée</option>
            {MOTIFS.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="fichier" className={label}>Justificatif (PDF ou image, 10 Mo maximum)</label>
          <input
            key={cleFichier}
            id="fichier"
            type="file"
            accept={EXTENSIONS_ACCEPTEES}
            onChange={choisirFichier}
            disabled={envoi}
            className={champ}
          />
        </div>

        <div>
          <label htmlFor="commentaire" className={label}>Commentaire (facultatif)</label>
          <input
            id="commentaire"
            type="text"
            maxLength={500}
            value={commentaire}
            onChange={e => setCommentaire(e.target.value)}
            disabled={envoi}
            placeholder="Précisions éventuelles"
            className={champ}
          />
        </div>

        <button
          type="submit"
          disabled={envoi || absences.length === 0}
          className="rounded-lg bg-[#EC6F6F] px-4 py-3 text-sm font-bold text-[#001257] hover:opacity-90 disabled:opacity-50 transition"
        >
          {envoi ? 'Envoi en cours…' : 'Envoyer la justification'}
        </button>

        {message && (
          <p role={message.ok ? 'status' : 'alert'} className={`text-xs ${message.ok ? 'text-[#1E7F55]' : 'text-[#B23A3A]'}`}>{message.texte}</p>
        )}
      </form>
    </section>
  );
}
