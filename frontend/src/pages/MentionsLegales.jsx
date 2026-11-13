import PageLegale, { Infos, Lien, Section } from '@/components/legal/PageLegale.jsx';
import { INFOS, MISES_A_JOUR } from '@/content/infosLegales.js';

// Mentions légales (obligatoires en France, loi n° 2004-575 du 21 juin 2004 « LCEN »).
// Les coordonnées à compléter sont dans content/infosLegales.js.
const SECTIONS = [
  { id: 'editeur', titre: 'Éditeur du site', icon: 'building' },
  { id: 'publication', titre: 'Directeur de la publication', icon: 'user-check' },
  { id: 'hebergement', titre: 'Hébergement', icon: 'server' },
  { id: 'propriete', titre: 'Propriété intellectuelle', icon: 'copyright' },
  { id: 'donnees', titre: 'Données personnelles', icon: 'shield-lock' },
  { id: 'responsabilite', titre: 'Responsabilité', icon: 'alert-triangle' },
  { id: 'liens', titre: 'Liens hypertextes', icon: 'link' },
  { id: 'droit', titre: 'Droit applicable', icon: 'scale' },
];
const s = id => SECTIONS.find(x => x.id === id);

export default function MentionsLegales() {
  const { editeur, hebergeur } = INFOS;

  return (
    <PageLegale titre="Mentions légales" miseAJour={MISES_A_JOUR.mentions} sections={SECTIONS}>
      <Section {...s('editeur')}>
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

      <Section {...s('publication')}>
        <Infos lignes={[['Directeur de la publication', INFOS.directeurPublication]]} />
      </Section>

      <Section {...s('hebergement')}>
        <p>Le site est hébergé par :</p>
        <Infos lignes={[
          ['Hébergeur', hebergeur.nom],
          ['Adresse', hebergeur.adresse],
          ['Téléphone', hebergeur.telephone],
          ['Site web', hebergeur.site],
        ]} />
      </Section>

      <Section {...s('propriete')}>
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

      <Section {...s('donnees')}>
        <p>
          Le site traite des données personnelles des élèves, des enseignants et du personnel afin de
          faire fonctionner l'espace numérique de l'école. Le détail de ces traitements, vos droits et
          la façon de les exercer sont décrits dans la{' '}
          <Lien to="/politique-de-confidentialite">politique de confidentialité</Lien>.
        </p>
      </Section>

      <Section {...s('responsabilite')}>
        <p>
          L'éditeur s'efforce de fournir des informations exactes et à jour, mais ne peut garantir
          l'absence d'erreurs ou d'omissions. Il ne saurait être tenu responsable des dommages
          résultant de l'utilisation du site ou de son indisponibilité temporaire.
        </p>
        <p>
          Les règles d'utilisation de l'espace numérique sont précisées dans les{' '}
          <Lien to="/cgu">conditions générales d'utilisation</Lien>.
        </p>
      </Section>

      <Section {...s('liens')}>
        <p>
          Le site peut contenir des liens vers d'autres sites (notamment{' '}
          <Lien href="https://mediaschool.eu/">mediaschool.eu</Lien>). L'éditeur n'exerce aucun
          contrôle sur ces sites et décline toute responsabilité quant à leur contenu.
        </p>
      </Section>

      <Section {...s('droit')}>
        <p>
          Les présentes mentions légales sont soumises au droit français. En cas de litige, et à
          défaut de résolution amiable, les tribunaux français seront seuls compétents.
        </p>
      </Section>
    </PageLegale>
  );
}
