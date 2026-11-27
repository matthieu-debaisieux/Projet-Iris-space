import PageLegale, { Lien, LienReglement, Liste, Section, V } from '@/components/legal/PageLegale.jsx';
import { INFOS, MISES_A_JOUR } from '@/content/infosLegales.js';

// Conditions générales d'utilisation de l'espace numérique.
// Les coordonnées à compléter sont dans content/infosLegales.js.
const SECTIONS = [
  { id: 'objet', titre: 'Objet', icon: 'file-description' },
  { id: 'acces', titre: 'Accès au service', icon: 'login' },
  { id: 'compte', titre: 'Compte et identifiants', icon: 'key' },
  { id: 'services', titre: 'Services proposés', icon: 'layout-grid' },
  { id: 'regles', titre: "Règles d'utilisation", icon: 'list-check' },
  { id: 'contenus', titre: 'Contenus publiés', icon: 'message' },
  { id: 'responsabilite', titre: 'Responsabilité', icon: 'alert-triangle' },
  { id: 'sanctions', titre: 'Suspension du compte', icon: 'ban' },
  { id: 'evolution', titre: 'Évolution des CGU', icon: 'refresh' },
  { id: 'droit', titre: 'Droit applicable', icon: 'scale' },
];
const s = id => SECTIONS.find(x => x.id === id);

export default function CGU() {
  return (
    <PageLegale
      titre="Conditions générales d'utilisation"
      miseAJour={MISES_A_JOUR.cgu}
      sections={SECTIONS}
      intro={`En vous connectant à ${INFOS.site}, vous acceptez les présentes conditions générales d'utilisation (CGU). Si vous ne les acceptez pas, vous ne devez pas utiliser l'espace numérique.`}
    >
      <Section {...s('objet')}>
        <p>
          Les présentes CGU définissent les conditions dans lesquelles les élèves, les enseignants et le
          personnel de l'école peuvent utiliser {INFOS.site}, l'espace numérique de l'école édité par{' '}
          <V>{INFOS.editeur.raisonSociale}</V>.
        </p>
      </Section>

      <Section {...s('acces')}>
        <p>
          Les pages publiques (actualités, à propos, informations légales) sont accessibles à tous.
          L'espace connecté est réservé aux personnes à qui l'école a créé un compte : élèves inscrits,
          enseignants et personnel administratif.
        </p>
        <p>
          Le site est accessible en continu, sauf interruption pour maintenance ou en cas de panne.
          L'école ne garantit pas une disponibilité sans interruption.
        </p>
      </Section>

      <Section {...s('compte')}>
        <p>Vos identifiants de connexion sont personnels et confidentiels. Vous vous engagez à :</p>
        <Liste items={[
          'ne pas communiquer votre mot de passe, ni utiliser le compte de quelqu\'un d\'autre ;',
          'vous déconnecter après utilisation sur un ordinateur partagé ;',
          "prévenir l'administration sans délai en cas de perte ou d'utilisation frauduleuse de vos identifiants.",
        ]} />
        <p>Toute action effectuée avec votre compte est réputée faite par vous.</p>
      </Section>

      <Section {...s('services')}>
        <p>Selon votre profil, l'espace numérique permet notamment de :</p>
        <Liste items={[
          "consulter l'emploi du temps de sa classe (et le gérer pour l'administration) ;",
          'consulter ses notes et ses devoirs ;',
          'suivre ses absences et retards, et transmettre des justificatifs ;',
          'échanger via la messagerie interne ;',
          "consulter les documents et les actualités de l'école.",
        ]} />
        <p>Chaque utilisateur n'a accès qu'aux fonctionnalités correspondant à son profil.</p>
      </Section>

      <Section {...s('regles')}>
        <p>
          L'utilisation du site doit rester conforme à la loi et au{' '}
          <LienReglement url={INFOS.reglementInterieur}>règlement intérieur de l'école</LienReglement>. Il est interdit :
        </p>
        <Liste items={[
          'de publier ou d\'envoyer des propos injurieux, diffamatoires, discriminatoires, harcelants ou violents ;',
          "de transmettre de faux justificatifs ou de fausses informations ;",
          'de diffuser des données personnelles d\'autres utilisateurs (notes, messages, photos…) sans leur accord ;',
          'de partager des contenus protégés par le droit d\'auteur sans autorisation ;',
          "de tenter d'accéder à des données ou des pages qui ne vous sont pas destinées, ou de perturber le fonctionnement du site.",
        ]} />
      </Section>

      <Section {...s('contenus')}>
        <p>
          Vous restez responsable des messages, documents et justificatifs que vous envoyez. L'école peut
          retirer tout contenu contraire aux présentes CGU, à la loi ou au règlement intérieur.
        </p>
        <p>
          Les contenus mis à disposition par l'école (cours, documents, actualités) sont réservés à un
          usage personnel et pédagogique. Leur diffusion en dehors de l'école est interdite sans
          autorisation.
        </p>
      </Section>

      <Section {...s('responsabilite')}>
        <p>
          Les informations affichées (emploi du temps, notes, absences) sont fournies à titre indicatif
          et peuvent évoluer. En cas de doute, l'information communiquée directement par l'école prévaut.
        </p>
        <p>
          L'école ne saurait être tenue responsable d'une indisponibilité du site, d'une perte de
          données due à une mauvaise utilisation, ou des dommages résultant du non-respect des CGU.
        </p>
      </Section>

      <Section {...s('sanctions')}>
        <p>
          En cas de non-respect des présentes CGU, l'école peut suspendre ou supprimer l'accès au compte
          concerné, sans préjudice des sanctions prévues par le règlement intérieur ou de poursuites
          judiciaires.
        </p>
        <p>Le compte d'un élève est désactivé à la fin de sa scolarité dans l'école.</p>
      </Section>

      <Section {...s('evolution')}>
        <p>
          L'école peut modifier les présentes CGU à tout moment, notamment pour tenir compte de
          nouvelles fonctionnalités. La version applicable est celle en ligne au moment de votre
          connexion.
        </p>
        <p>
          Le traitement de vos données personnelles est décrit dans la{' '}
          <Lien to="/politique-de-confidentialite">politique de confidentialité</Lien>.
        </p>
      </Section>

      <Section {...s('droit')}>
        <p>
          Les présentes CGU sont soumises au droit français. En cas de litige, et à défaut de résolution
          amiable, les tribunaux français seront seuls compétents. Pour toute question :{' '}
          <V>{INFOS.editeur.email}</V>.
        </p>
      </Section>
    </PageLegale>
  );
}
