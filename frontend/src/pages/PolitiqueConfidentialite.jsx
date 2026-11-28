import PageLegale, { Infos, Lien, Liste, Section, V } from '@/components/legal/PageLegale.jsx';
import { INFOS, MISES_A_JOUR } from '@/content/infosLegales.js';

// Politique de confidentialité (RGPD, articles 12 à 14 : information des personnes).
// Les données décrites correspondent à ce que l'application traite réellement
// (comptes, emploi du temps, notes, absences, messages, documents).
// Les coordonnées et durées à compléter sont dans content/infosLegales.js.
const SECTIONS = [
  { id: 'responsable', titre: 'Responsable du traitement', icon: 'building' },
  { id: 'donnees', titre: 'Données collectées', icon: 'database' },
  { id: 'finalites', titre: 'Finalités et bases légales', icon: 'target' },
  { id: 'destinataires', titre: 'Destinataires', icon: 'users' },
  { id: 'conservation', titre: 'Durées de conservation', icon: 'clock' },
  { id: 'securite', titre: 'Sécurité et hébergement', icon: 'lock' },
  { id: 'cookies', titre: 'Cookies et stockage local', icon: 'cookie' },
  { id: 'droits', titre: 'Vos droits', icon: 'shield-check' },
  { id: 'modifications', titre: 'Modifications', icon: 'refresh' },
];
const s = id => SECTIONS.find(x => x.id === id);

const th = 'bg-[#EEF1F7] px-4 py-3 text-left text-xs font-medium text-[#6B7185] first:rounded-l-lg last:rounded-r-lg';
const td = 'px-4 py-3 border-b border-[#E1E5EE] align-top';

const FINALITES = [
  ['Gérer les comptes et l\'accès à l\'espace numérique', 'Exécution du contrat de formation'],
  ['Organiser les cours (emplois du temps, classes, salles)', 'Exécution du contrat de formation'],
  ['Suivre la scolarité (notes, devoirs, absences et retards)', 'Exécution du contrat de formation et obligations légales liées au suivi de l\'assiduité'],
  ['Permettre les échanges entre élèves, enseignants et administration (messagerie)', 'Intérêt légitime de l\'école à assurer la communication pédagogique'],
  ['Partager des documents et publier des actualités', 'Intérêt légitime de l\'école'],
  ['Répondre aux demandes envoyées via le formulaire de contact', 'Intérêt légitime de l\'école'],
  ['Assurer la sécurité du site', 'Intérêt légitime de l\'école'],
];

export default function PolitiqueConfidentialite() {
  const { editeur, conservation } = INFOS;

  return (
    <PageLegale
      titre="Politique de confidentialité"
      miseAJour={MISES_A_JOUR.confidentialite}
      sections={SECTIONS}
      intro={`Cette page explique quelles données personnelles le site ${INFOS.site} traite, pourquoi, pendant combien de temps, et comment exercer vos droits, conformément au Règlement général sur la protection des données (RGPD) et à la loi « Informatique et Libertés ».`}
    >
      <Section {...s('responsable')}>
        <p>Le responsable du traitement des données est :</p>
        <Infos lignes={[
          ['Organisme', editeur.raisonSociale],
          ['Adresse', editeur.adresse],
          ['Contact données personnelles', INFOS.contactDonnees],
        ]} />
      </Section>

      <Section {...s('donnees')}>
        <p>Selon votre profil (élève, enseignant, administration), le site traite :</p>
        <Liste items={[
          <><strong>Identification</strong> : nom, prénom, identifiant, rôle, classe, numéro étudiant, photo.</>,
          <><strong>État civil et coordonnées</strong> : date, lieu et pays de naissance, nationalité, adresse, téléphone, e-mail.</>,
          <><strong>Connexion</strong> : mot de passe (jamais stocké en clair, seulement sous forme hachée), session, date de dernière connexion, demandes de réinitialisation du mot de passe, et journal des connexions (date, réussite ou échec, adresse IP, navigateur utilisé).</>,
          <><strong>Scolarité</strong> : emploi du temps, notes, appréciations, devoirs et fichiers rendus.</>,
          <><strong>Vie scolaire</strong> : absences, retards, motifs et justificatifs transmis.</>,
          <><strong>Communication</strong> : messages et pièces jointes, notifications, documents partagés.</>,
        ]} />
        <p>
          Les visiteurs qui utilisent le formulaire de contact transmettent leur nom, leur e-mail et
          leur message, utilisés uniquement pour leur répondre.
        </p>
        <p>
          Les justificatifs d'absence peuvent révéler des informations sur votre santé (par exemple un
          arrêt maladie). Ne transmettez que le strict nécessaire : un justificatif n'a pas à indiquer
          la nature d'une maladie ou d'un traitement.
        </p>
      </Section>

      <Section {...s('finalites')}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr><th scope="col" className={th}>Pourquoi</th><th scope="col" className={th}>Base légale</th></tr>
            </thead>
            <tbody>
              {FINALITES.map(([but, base]) => (
                <tr key={but}>
                  <td className={`${td} font-medium text-[#001257]`}>{but}</td>
                  <td className={`${td} text-[#6B7185]`}>{base}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>Vos données ne sont jamais vendues, ni utilisées à des fins publicitaires.</p>
      </Section>

      <Section {...s('destinataires')}>
        <p>Seules les personnes qui en ont besoin accèdent à vos données :</p>
        <Liste items={[
          "le personnel administratif habilité de l'école ;",
          'les enseignants, pour les classes et matières qui les concernent ;',
          "l'élève lui-même, pour ses propres données ;",
          "l'hébergeur du site, en tant que sous-traitant technique, sans droit d'utiliser les données pour son compte.",
        ]} />
        <p>Les données peuvent aussi être communiquées aux autorités lorsque la loi l'exige.</p>
      </Section>

      <Section {...s('conservation')}>
        <Infos lignes={[
          ['Compte utilisateur', conservation.compte],
          ['Notes, absences, emploi du temps', conservation.scolarite],
          ['Messages', conservation.messages],
          ["Justificatifs d'absence", conservation.justificatifs],
          ['Demandes de contact', conservation.contact],
          ['Journal des connexions', conservation.connexions],
        ]} />
        <p>À l'issue de ces durées, les données sont supprimées ou anonymisées.</p>
      </Section>

      <Section {...s('securite')}>
        <p>
          L'accès à l'espace numérique est protégé par un identifiant et un mot de passe personnels.
          Chaque utilisateur ne voit que les pages et les données autorisées par son profil.
          Les tentatives de connexion, réussies ou non, sont enregistrées dans un journal afin de
          détecter les accès frauduleux ; ce journal est supprimé automatiquement après 12 mois.
        </p>
        <Infos lignes={[
          ['Hébergeur', INFOS.hebergeur.nom],
          ['Lieu de stockage des données', INFOS.hebergeur.localisation],
        ]} />
      </Section>

      <Section {...s('cookies')}>
        <p>
          Le site n'utilise pas de cookies publicitaires ni de traceurs de mesure d'audience. Il utilise
          uniquement :
        </p>
        <Liste items={[
          <><strong>un cookie de session</strong>, déposé quand vous vous connectez, qui permet de vous
            reconnaître d'une page à l'autre. Il n'est pas lisible par les scripts du site et n'est
            jamais transmis à un tiers ;</>,
          <><strong>le stockage local de votre navigateur</strong>, pour garder les informations
            nécessaires à l'affichage (votre session, votre photo de profil, certaines données mises en
            cache).</>,
        ]} />
        <p>
          Ces éléments sont strictement nécessaires au fonctionnement du site : comme le prévoient les
          recommandations de la CNIL, ils ne demandent pas votre consentement. C'est pourquoi le site
          n'affiche pas de bandeau cookies. Ils sont supprimés à la déconnexion ou en vidant les données
          de votre navigateur. Si un jour le site utilise d'autres cookies (mesure d'audience, par
          exemple), cette page sera mise à jour et votre accord vous sera demandé.
        </p>
      </Section>

      <Section {...s('droits')}>
        <p>Vous disposez des droits suivants sur vos données :</p>
        <Liste items={[
          <><strong>Accès</strong> : savoir quelles données vous concernant sont traitées et en obtenir une copie.</>,
          <><strong>Rectification</strong> : faire corriger des données inexactes.</>,
          <><strong>Effacement</strong> : demander la suppression de vos données, sauf si l'école doit les conserver.</>,
          <><strong>Limitation</strong> et <strong>opposition</strong> : restreindre ou refuser certains traitements.</>,
          <><strong>Portabilité</strong> : recevoir vos données dans un format lisible.</>,
          <><strong>Directives post-mortem</strong> : définir le sort de vos données après votre décès.</>,
        ]} />
        <p>
          Pour exercer ces droits, écrivez à <V>{INFOS.contactDonnees}</V>. Une réponse vous sera apportée
          dans un délai d'un mois.
        </p>
        <p>
          Si vous estimez que vos droits ne sont pas respectés, vous pouvez adresser une réclamation à la
          CNIL (<Lien href="https://www.cnil.fr">www.cnil.fr</Lien>).
        </p>
      </Section>

      <Section {...s('modifications')}>
        <p>
          Cette politique peut évoluer, notamment lors de l'ajout de nouvelles fonctionnalités. La date
          de dernière mise à jour figure en haut de la page.
        </p>
      </Section>
    </PageLegale>
  );
}
