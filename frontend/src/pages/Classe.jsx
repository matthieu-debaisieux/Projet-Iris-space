import { useEffect, useMemo, useState } from 'react';
import DataState from '@/components/ui/DataState.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { useAsync } from '@/hooks/useAsync.js';
import {
  getElevesClasseAdmin,
  getElevesClasseProf,
  getMaClasse,
  getMesClassesProf,
  getToutesClassesAdmin,
} from '@/services/classe.js';

function initiales(prenom, nom) {
  const p = (prenom ?? '').trim()[0] ?? '';
  const n = (nom ?? '').trim()[0] ?? '';
  return `${p}${n}`.toUpperCase() || '?';
}

function AvatarEleve({ eleve }) {
  const [erreurImg, setErreurImg] = useState(false);

  if (eleve.photo_url && !erreurImg) {
    return (
      <img
        src={eleve.photo_url}
        alt={`${eleve.prenom ?? ''} ${eleve.nom ?? ''}`.trim()}
        onError={() => setErreurImg(true)}
        className="w-12 h-12 rounded-full object-cover border border-[#E1E5EE] shrink-0"
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className="w-12 h-12 rounded-full bg-[#001257] text-[#F8B005] flex items-center justify-center text-sm font-bold shrink-0"
    >
      {initiales(eleve.prenom, eleve.nom)}
    </div>
  );
}

function TrombinoscopeEleves({ eleves, monId = null, afficherNumero = false }) {
  const [recherche, setRecherche] = useState('');

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return eleves;
    return eleves.filter(e => {
      const cible = `${e.prenom ?? ''} ${e.nom ?? ''} ${afficherNumero ? (e.numero_etudiant ?? '') : ''}`.toLowerCase();
      return cible.includes(q);
    });
  }, [eleves, recherche, afficherNumero]);

  return (
    <section className="bg-white rounded-2xl border border-[#E1E5EE] p-6 shadow-[0_1px_2px_rgba(0,18,87,0.04)]">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h2 className="text-base font-bold text-[#001257]">
          Élèves ({eleves.length})
        </h2>
        {eleves.length > 0 && (
          <input
            type="search"
            aria-label="Rechercher un élève"
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
            placeholder="Rechercher un élève…"
            className="input input-bordered input-sm w-full sm:w-64"
          />
        )}
      </div>

      {eleves.length === 0 ? (
        <p className="text-sm text-[#6B7185] text-center py-8">Aucun élève actif dans cette classe.</p>
      ) : filtres.length === 0 ? (
        <p className="text-sm text-[#6B7185] text-center py-8">Aucun élève ne correspond à la recherche.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtres.map(eleve => {
            const estMoi = monId && eleve.id === monId;
            return (
              <article
                key={eleve.id}
                className={`flex items-center gap-3.5 rounded-xl border p-4 transition ${
                  estMoi ? 'border-[#07A6A6] bg-teal-50/40' : 'border-[#E1E5EE] bg-[#F7F8FB]/60'
                }`}
              >
                <AvatarEleve eleve={eleve} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-[#001257] truncate">
                      {[eleve.prenom, eleve.nom].filter(Boolean).join(' ')}
                    </p>
                    {estMoi && (
                      <span className="rounded-full bg-[#07A6A6] px-2 py-0.5 text-[10px] font-semibold text-white">
                        Vous
                      </span>
                    )}
                  </div>
                  {afficherNumero && eleve.numero_etudiant && (
                    <p className="text-xs text-[#6B7185] mt-0.5">N° {eleve.numero_etudiant}</p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function EnTeteClasse({ titre, sousTitre, classe }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#001257]">{titre}</h1>
        <p className="mt-1 text-sm text-[#6B7185]">{sousTitre}</p>
      </div>
      {classe && (
        <div className="rounded-xl bg-white border border-[#E1E5EE] px-4 py-2.5 text-right">
          <p className="text-sm font-bold text-[#001257]">{classe.nom}</p>
          {(classe.annee_scolaire || classe.campus) && (
            <p className="text-xs text-[#6B7185]">
              {[classe.annee_scolaire, classe.campus].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      )}
    </header>
  );
}

function VueClasseAdmin() {
  const classesState = useAsync(getToutesClassesAdmin);
  const classes = classesState.data ?? [];
  const [classeId, setClasseId] = useState(null);

  useEffect(() => {
    if (classes.length > 0 && (classeId === null || !classes.some(c => c.id === classeId))) {
      setClasseId(classes[0].id);
    }
  }, [classes, classeId]);

  const detailState = useAsync(
    () => (classeId !== null ? getElevesClasseAdmin(classeId) : Promise.resolve({ classe: null, eleves: [] })),
    [classeId],
  );

  const classeActive = detailState.data?.classe ?? classes.find(c => c.id === classeId) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <EnTeteClasse
        titre="Voir une classe"
        sousTitre="Liste des élèves inscrits dans chaque classe de l'établissement."
        classe={classeActive}
      />

      <DataState state={classesState}>{liste => (
        liste.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E1E5EE] p-6 text-sm text-[#6B7185]">
            Aucune classe n&apos;est configurée pour le moment.
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl border border-[#E1E5EE] p-4 flex flex-wrap items-center gap-3">
              <label htmlFor="select-classe-admin" className="text-sm font-semibold text-[#001257]">
                Classe :
              </label>
              <select
                id="select-classe-admin"
                value={classeId ?? ''}
                onChange={e => setClasseId(Number(e.target.value))}
                className="select select-bordered select-sm min-w-[240px]"
              >
                {liste.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nom}{c.annee_scolaire || c.campus ? ` (${[c.annee_scolaire, c.campus].filter(Boolean).join(' · ')})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <DataState state={detailState}>{data => (
              <TrombinoscopeEleves eleves={data.eleves} afficherNumero />
            )}</DataState>
          </>
        )
      )}</DataState>
    </div>
  );
}

function VueClassesProf({ userId }) {
  const classesState = useAsync(() => getMesClassesProf(userId), [userId]);
  const classes = classesState.data ?? [];
  const [classeId, setClasseId] = useState(null);

  useEffect(() => {
    if (classes.length > 0 && (classeId === null || !classes.some(c => c.id === classeId))) {
      setClasseId(classes[0].id);
    }
  }, [classes, classeId]);

  const elevesState = useAsync(
    () => (classeId !== null ? getElevesClasseProf(classeId) : Promise.resolve([])),
    [classeId],
  );

  const classeActive = classes.find(c => c.id === classeId) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <EnTeteClasse
        titre="Mes classes"
        sousTitre="Consultez la liste des élèves de vos classes."
        classe={classeActive}
      />

      <DataState state={classesState}>{liste => (
        liste.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E1E5EE] p-6 text-sm text-[#6B7185]">
            Aucune classe ne vous est rattachée pour l&apos;année scolaire en cours.
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl border border-[#E1E5EE] p-4 flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {liste.map(c => {
                  const active = c.id === classeId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setClasseId(c.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                        active
                          ? 'bg-[#001257] text-white'
                          : 'bg-[#EEF1F7] text-[#001257] hover:bg-[#E1E5EE]'
                      }`}
                    >
                      {c.nom}
                    </button>
                  );
                })}
              </div>
              {classeActive?.matieres?.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B7185]">
                  <span>Matières enseignées dans cette classe :</span>
                  {classeActive.matieres.map(m => (
                    <span key={m.id} className="rounded-full bg-[#EEF1F7] px-2.5 py-0.5 font-medium text-[#001257]">
                      {m.nom}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <DataState state={elevesState}>{eleves => (
              <TrombinoscopeEleves eleves={eleves} afficherNumero />
            )}</DataState>
          </>
        )
      )}</DataState>
    </div>
  );
}

function VueMaClasseEleve({ userId }) {
  const classeState = useAsync(getMaClasse);

  return (
    <DataState state={classeState}>{data => (
      <div className="flex flex-col gap-6">
        <EnTeteClasse
          titre="Ma classe"
          sousTitre="Les élèves de votre classe."
          classe={data.classe}
        />

        {!data.classe ? (
          <div className="bg-white rounded-2xl border border-[#E1E5EE] p-6 text-sm text-[#6B7185]">
            Vous n&apos;êtes rattaché à aucune classe pour le moment.
          </div>
        ) : (
          <TrombinoscopeEleves eleves={data.eleves} monId={userId} />
        )}
      </div>
    )}</DataState>
  );
}

export default function Classe() {
  const { user, can } = useAuth();
  const voirTout = can('classe_voir_tout');
  const voirSesClasses = can('classe_voir_ses_classes');

  return (
    <div className="flex-1 overflow-y-auto bg-[var(--color-page)]">
      <div className="mx-auto w-full max-w-[1200px] px-6 py-8">
        {voirTout ? (
          <VueClasseAdmin />
        ) : voirSesClasses ? (
          <VueClassesProf userId={user?.id} />
        ) : (
          <VueMaClasseEleve userId={user?.id} />
        )}
      </div>
    </div>
  );
}
