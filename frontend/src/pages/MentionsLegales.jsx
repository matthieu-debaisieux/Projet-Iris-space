import '@tabler/icons-webfont/dist/tabler-icons.min.css';

// ─────────────────────────────────────────────────────────────────────────────
// Mentions légales (obligatoires en France, loi n° 2004-575 du 21 juin 2004 « LCEN »).
// Toutes les informations à fournir sont regroupées ici : remplacer chaque `null`
// par la vraie valeur. Tant qu'un champ vaut `null`, la page affiche « À compléter ».
// ─────────────────────────────────────────────────────────────────────────────
const INFOS = {
  miseAJour: '13 novembre 2026',
  site: 'Iris Space',
  editeur: {
    raisonSociale: null,      // ex : nom de la société qui exploite l'école
    formeJuridique: null,     // ex : SAS au capital de … €
    adresse: null,
    rcs: null,                // ex : RCS Nice 123 456 789
    siret: null,
    tva: null,                // n° de TVA intracommunautaire
    telephone: null,
    email: null,
  },
  directeurPublication: null, // nom et fonction
  hebergeur: {
    nom: null,
    adresse: null,
    telephone: null,
    site: null,
  },
  contactDonnees: null,       // e-mail du référent / DPO pour les demandes RGPD
};

const SECTIONS = [
  { id: 'editeur', titre: 'Éditeur du site', icon: 'building' },
  { id: 'publication', titre: 'Directeur de la publication', icon: 'user-check' },
  { id: 'hebergement', titre: 'Hébergement', icon: 'server' },
  { id: 'propriete', titre: 'Propriété intellectuelle', icon: 'copyright' },
  { id: 'donnees', titre: 'Données personnelles', icon: 'shield-lock' },
  { id: 'cookies', titre: 'Cookies et stockage local', icon: 'cookie' },
  { id: 'responsabilite', titre: 'Responsabilité', icon: 'alert-triangle' },
  { id: 'liens', titre: 'Liens hypertextes', icon: 'link' },
  { id: 'droit', titre: 'Droit applicable', icon: 'scale' },
];

const card = 'bg-white rounded-2xl border border-[#E1E5EE] shadow-[0_1px_2px_rgba(0,18,87,0.04)]';

const Icon = ({ name, size = 16, className = '' }) => (
  <i className={`ti ti-${name} ${className}`} style={{ fontSize: size }} aria-hidden="true" />
);

// Valeur fournie, ou badge « À compléter »
const V = ({ children }) => children ?? (
  <span className="rounded-md bg-[#FFF3D6] px-1.5 py-0.5 text-xs font-semibold text-[#8A5A00]">À compléter</span>
);

// Tableau « libellé : valeur »
const Infos = ({ lignes }) => (
  <dl className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-x-6 gap-y-3 text-sm">
    {lignes.map(([nom, valeur]) => (
      <div key={nom} className="contents">
        <dt className="text-[#6B7185]">{nom}</dt>
        <dd className="font-medium text-[#1A1D2E] break-words"><V>{valeur}</V></dd>
      </div>
    ))}
  </dl>
);

function Section({ id, children }) {
  const { titre, icon } = SECTIONS.find(s => s.id === id);
  return (
    <section id={id} className={`${card} p-6 scroll-mt-6`}>
      <h2 className="flex items-center gap-3 text-base font-bold text-[#001257] mb-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EEF1F7]"><Icon name={icon} size={18} /></span>
        {titre}
      </h2>
      <div className="flex flex-col gap-3 text-sm leading-relaxed text-[#1A1D2E]">{children}</div>
    </section>
  );
}

export default function MentionsLegales() {
  const { editeur, hebergeur } = INFOS;
  const aller = id => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <main className="flex-1 overflow-y-auto bg-[var(--color-page)]">
      <div className="mx-auto w-full max-w-[1200px] px-6 py-8 flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold text-[#001257]">Mentions légales</h1>
          <p className="mt-1 text-sm text-[#6B7185]">Dernière mise à jour : {INFOS.miseAJour}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 items-start">
          {/* Sommaire */}
          <nav aria-label="Sommaire" className={`${card} p-4 lg:sticky lg:top-0`}>
            <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-[#6B7185]">Sommaire</p>
            <ul className="flex flex-col">
              {SECTIONS.map(s => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => aller(s.id)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-[#001257] hover:bg-[#EEF1F7] transition"
                  >
                    <Icon name={s.icon} className="text-[#6B7185]" /> {s.titre}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex flex-col gap-6">
            <Section id="editeur">
              <p>Le site {INFOS.site} est édité par :</p>
              <Infos lignes={[
                ['Raison sociale', editeur.raisonSociale],
                ['Forme juridique', editeur.formeJuridique],
                ['Siège social', editeur.adresse],
                ['RCS', editeur.rcs],
                ['SIRET', editeur.siret],
                ['N° TVA intracommunautaire', editeur.tva],
                ['Téléphone', editeur.telephone],
                ['E-mail', editeur.email],
              ]} />
            </Section>

            <Section id="publication">
              <Infos lignes={[['Directeur de la publication', INFOS.directeurPublication]]} />
            </Section>

            <Section id="hebergement">
              <p>Le site est hébergé par :</p>
              <Infos lignes={[
                ['Hébergeur', hebergeur.nom],
                ['Adresse', hebergeur.adresse],
                ['Téléphone', hebergeur.telephone],
                ['Site web', hebergeur.site],
              ]} />
            </Section>

            <Section id="propriete">
              <p>
                L'ensemble des contenus présents sur le site {INFOS.site} (textes, images, logos, icônes,
                mise en page, code) est protégé par le droit de la propriété intellectuelle. Ils sont la
                propriété exclusive de l'éditeur ou de ses partenaires, sauf mention contraire.
              </p>
              <p>
                Toute reproduction, représentation, modification ou diffusion, totale ou partielle, sans
                autorisation écrite préalable de l'éditeur est interdite et constitue une contrefaçon
                (articles L.335-2 et suivants du Code de la propriété intellectuelle).
              </p>
              <p>Les logos MediaSchool et IRIS restent la propriété de leurs titulaires respectifs.</p>
            </Section>

            <Section id="donnees">
              <p>
                Le site traite des données personnelles des élèves, des enseignants et du personnel
                (identité, classe, emploi du temps, notes, absences, messages) dans le seul but de faire
                fonctionner l'espace numérique de l'école.
              </p>
              <p>
                Conformément au Règlement général sur la protection des données (RGPD) et à la loi
                « Informatique et Libertés » du 6 janvier 1978 modifiée, vous disposez d'un droit d'accès,
                de rectification, d'effacement, de limitation et d'opposition au traitement de vos données,
                ainsi que d'un droit à la portabilité.
              </p>
              <Infos lignes={[['Pour exercer vos droits', INFOS.contactDonnees]]} />
              <p>
                Si vous estimez que vos droits ne sont pas respectés, vous pouvez adresser une réclamation à
                la CNIL (<a href="https://www.cnil.fr" target="_blank" rel="noreferrer" className="font-semibold text-[#07A6A6] hover:underline">www.cnil.fr</a>).
              </p>
            </Section>

            <Section id="cookies">
              <p>
                Le site n'utilise pas de cookies publicitaires ni de traceurs de mesure d'audience. Il
                utilise uniquement un cookie de session et le stockage local de votre navigateur, strictement
                nécessaires à son fonctionnement (maintien de votre connexion). Ils ne nécessitent pas de
                consentement et sont supprimés à la déconnexion ou en vidant les données du navigateur.
              </p>
            </Section>

            <Section id="responsabilite">
              <p>
                L'éditeur s'efforce de fournir des informations exactes et à jour, mais ne peut garantir
                l'absence d'erreurs ou d'omissions. Il ne saurait être tenu responsable des dommages
                résultant de l'utilisation du site ou de son indisponibilité temporaire.
              </p>
              <p>
                Chaque utilisateur est responsable de la confidentialité de ses identifiants de connexion.
              </p>
            </Section>

            <Section id="liens">
              <p>
                Le site peut contenir des liens vers d'autres sites (notamment{' '}
                <a href="https://mediaschool.eu/" target="_blank" rel="noreferrer" className="font-semibold text-[#07A6A6] hover:underline">mediaschool.eu</a>).
                L'éditeur n'exerce aucun contrôle sur ces sites et décline toute responsabilité quant à
                leur contenu.
              </p>
            </Section>

            <Section id="droit">
              <p>
                Les présentes mentions légales sont soumises au droit français. En cas de litige, et à
                défaut de résolution amiable, les tribunaux français seront seuls compétents.
              </p>
            </Section>
          </div>
        </div>
      </div>
    </main>
  );
}
