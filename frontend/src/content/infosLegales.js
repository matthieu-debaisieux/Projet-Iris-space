// ─────────────────────────────────────────────────────────────────────────────
// Informations légales partagées par les pages Mentions légales,
// Politique de confidentialité et CGU. Remplacer chaque `null` par la vraie
// valeur : tant qu'un champ vaut `null`, les pages affichent « À compléter ».
// ─────────────────────────────────────────────────────────────────────────────
export const INFOS = {
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
    localisation: null,       // pays où sont stockées les données, ex : France
  },
  contactDonnees: null,       // e-mail du référent / DPO pour les demandes RGPD
  conservation: {
    compte: null,             // ex : durée de la scolarité + 1 an
    scolarite: null,          // notes, absences, emploi du temps
    messages: null,
    justificatifs: null,      // justificatifs d'absence
    contact: null,            // demandes envoyées via le formulaire de contact
  },
};

// Date de dernière mise à jour de chaque page
export const MISES_A_JOUR = {
  mentions: '13 novembre 2026',
  confidentialite: '13 novembre 2026',
  cgu: '13 novembre 2026',
};
