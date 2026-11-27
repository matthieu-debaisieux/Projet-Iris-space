-- =====================================================================
--  IRIS SPACE - données de démonstration (SOC-01)
-- =====================================================================
--  RÉSERVÉ AU DÉVELOPPEMENT ET À LA DÉMO : ne jamais charger en production
--  (mots de passe triviaux, comptes connus de tous).
--
--  À lancer APRÈS init_database.sql, sur une base vide.
--  Avec Docker, il est exécuté tout seul à la création du volume db_data
--  (voir docker-compose.yml). Pour repartir de zéro : voir le README,
--  « Remettre la base à zéro ».
--
--  Comptes (identifiant / mot de passe) :
--    admin     / admin      administrateur
--    direction / direction  direction
--    prof      / prof       professeur : Développement, Mathématiques
--    prof2     / prof       professeur : Anglais, CEJM, Culture générale
--    eleve     / eleve      élève de BTS SIO 1 (John Doe)
--    eleve2 à eleve4 / eleve   élèves de BTS SIO 1
--    eleve5, eleve6  / eleve   élèves de BTS SIO 2
--  Les mêmes identifiants que les mocks du front (frontend/src/mocks/users.js).
--
--  Les dates (cours, devoirs, notes…) sont calculées à partir du jour où le
--  script est lancé : l'emploi du temps couvre la semaine dernière, la semaine
--  en cours et les deux suivantes.
-- =====================================================================

BEGIN;

SET TIME ZONE 'Europe/Paris';

-- ---------------------------------------------------------------------
-- UTILISATEURS
-- Hachages bcrypt générés par password_hash() de PHP (vérifiés par password_verify).
-- Les id sont fixes pour pouvoir s'y référer dans ce script et dans les tests.
-- ---------------------------------------------------------------------
INSERT INTO utilisateur (id, identifiant, email, mot_de_passe_hash, role, nom, prenom, telephone, date_naissance) VALUES
  ('00000000-0000-4000-8000-000000000001', 'admin',     'admin@iris-space.fr',     '$2y$10$5sZGr/fgeAP/GrtnomuQ3O.YYqBVZ.3yWtgcsXNwLqKZP2mHqROVC', 'administrateur', 'Administration', 'Iris',   '01 00 00 00 01', NULL),
  ('00000000-0000-4000-8000-000000000002', 'direction', 'direction@iris-space.fr', '$2y$10$/dUJBnB6BfyJtPYfLjGgk.pUatHkeN7//8S6qTlJrxRFm/dxIyTIe', 'direction',      'Durand',         'Hélène', '01 00 00 00 02', NULL),
  ('00000000-0000-4000-8000-000000000011', 'prof',      'prof@iris-space.fr',      '$2y$10$Nf5/zAGG8PSoNR5KGKMSNeip6gxLmGWJiIe5AhrWmhx9UHoUjVQLi', 'professeur',     'Martin',         'Claire', '06 00 00 00 11', NULL),
  ('00000000-0000-4000-8000-000000000012', 'prof2',     'prof2@iris-space.fr',     '$2y$10$Nf5/zAGG8PSoNR5KGKMSNeip6gxLmGWJiIe5AhrWmhx9UHoUjVQLi', 'professeur',     'Benali',         'Karim',  '06 00 00 00 12', NULL),
  ('00000000-0000-4000-8000-000000000101', 'eleve',     'eleve@iris-space.fr',     '$2y$10$Guw48/HUJ5BLmqfsxYMdy.fViTQvcoJtUA7ri4bdoyj02RIe9mD8i', 'eleve',          'Doe',            'John',   '07 00 00 01 01', '2007-03-14'),
  ('00000000-0000-4000-8000-000000000102', 'eleve2',    'eleve2@iris-space.fr',    '$2y$10$Guw48/HUJ5BLmqfsxYMdy.fViTQvcoJtUA7ri4bdoyj02RIe9mD8i', 'eleve',          'Moreau',         'Lina',   '07 00 00 01 02', '2007-06-02'),
  ('00000000-0000-4000-8000-000000000103', 'eleve3',    'eleve3@iris-space.fr',    '$2y$10$Guw48/HUJ5BLmqfsxYMdy.fViTQvcoJtUA7ri4bdoyj02RIe9mD8i', 'eleve',          'Lefebvre',       'Hugo',   '07 00 00 01 03', '2006-11-21'),
  ('00000000-0000-4000-8000-000000000104', 'eleve4',    'eleve4@iris-space.fr',    '$2y$10$Guw48/HUJ5BLmqfsxYMdy.fViTQvcoJtUA7ri4bdoyj02RIe9mD8i', 'eleve',          'Garcia',         'Inès',   '07 00 00 01 04', '2007-01-09'),
  ('00000000-0000-4000-8000-000000000105', 'eleve5',    'eleve5@iris-space.fr',    '$2y$10$Guw48/HUJ5BLmqfsxYMdy.fViTQvcoJtUA7ri4bdoyj02RIe9mD8i', 'eleve',          'Roux',           'Nathan', '07 00 00 01 05', '2006-04-30'),
  ('00000000-0000-4000-8000-000000000106', 'eleve6',    'eleve6@iris-space.fr',    '$2y$10$Guw48/HUJ5BLmqfsxYMdy.fViTQvcoJtUA7ri4bdoyj02RIe9mD8i', 'eleve',          'Fontaine',       'Chloé',  '07 00 00 01 06', '2006-09-17');

-- ---------------------------------------------------------------------
-- STRUCTURE DE L'ÉCOLE
-- ---------------------------------------------------------------------
INSERT INTO campus (id, nom, adresse) VALUES
  (1, 'Campus principal', '1 rue de l''École, 75000 Paris');

INSERT INTO salle (id, campus_id, nom, capacite) VALUES
  (1, 1, 'A101', 30),
  (2, 1, 'A102', 30),
  (3, 1, 'B201 (labo info)', 20);

-- Année scolaire courante : de septembre à juillet, calculée d'après la date du jour
INSERT INTO annee_scolaire (id, libelle, debut, fin, courante)
SELECT 1,
       y || '-' || (y + 1),
       make_date(y, 9, 1),
       make_date(y + 1, 7, 4),
       true
FROM (SELECT CASE WHEN extract(month FROM current_date) >= 8
                  THEN extract(year FROM current_date)::int
                  ELSE extract(year FROM current_date)::int - 1 END AS y) a;

INSERT INTO classe (id, annee_scolaire_id, campus_id, nom) VALUES
  (1, 1, 1, 'BTS SIO 1'),
  (2, 1, 1, 'BTS SIO 2 SLAM');

INSERT INTO matiere (id, code, nom) VALUES
  (1, 'DEV',  'Développement'),
  (2, 'MATH', 'Mathématiques'),
  (3, 'ANG',  'Anglais'),
  (4, 'CEJM', 'Culture économique, juridique et managériale'),
  (5, 'CG',   'Culture générale');

-- Les séquences serial ne savent pas qu'on a donné les id à la main
SELECT setval('campus_id_seq',         (SELECT max(id) FROM campus)),
       setval('salle_id_seq',          (SELECT max(id) FROM salle)),
       setval('annee_scolaire_id_seq', (SELECT max(id) FROM annee_scolaire)),
       setval('classe_id_seq',         (SELECT max(id) FROM classe)),
       setval('matiere_id_seq',        (SELECT max(id) FROM matiere));

INSERT INTO professeur (utilisateur_id) VALUES
  ('00000000-0000-4000-8000-000000000011'),
  ('00000000-0000-4000-8000-000000000012');

INSERT INTO professeur_matiere (professeur_id, matiere_id) VALUES
  ('00000000-0000-4000-8000-000000000011', 1),
  ('00000000-0000-4000-8000-000000000011', 2),
  ('00000000-0000-4000-8000-000000000012', 3),
  ('00000000-0000-4000-8000-000000000012', 4),
  ('00000000-0000-4000-8000-000000000012', 5);

INSERT INTO classe_matiere (classe_id, matiere_id, coefficient) VALUES
  (1, 1, 4), (1, 2, 2), (1, 3, 2), (1, 4, 3), (1, 5, 2),
  (2, 1, 5), (2, 2, 2), (2, 3, 2), (2, 4, 3), (2, 5, 2);

INSERT INTO eleve (utilisateur_id, numero_etudiant, classe_id) VALUES
  ('00000000-0000-4000-8000-000000000101', 'E2026001', 1),
  ('00000000-0000-4000-8000-000000000102', 'E2026002', 1),
  ('00000000-0000-4000-8000-000000000103', 'E2026003', 1),
  ('00000000-0000-4000-8000-000000000104', 'E2026004', 1),
  ('00000000-0000-4000-8000-000000000105', 'E2025011', 2),
  ('00000000-0000-4000-8000-000000000106', 'E2025012', 2);

-- ---------------------------------------------------------------------
-- EMPLOI DU TEMPS
-- Une semaine type, répétée de la semaine dernière à dans deux semaines.
-- jour : 0 = lundi … 4 = vendredi ; créneau : 1 = 8h30, 2 = 10h45, 3 = 13h45 (2 h chacun).
-- Grille vérifiée : aucun prof, aucune classe ni aucune salle en double sur un créneau.
-- ---------------------------------------------------------------------
WITH semaine_type (jour, creneau, classe_id, matiere_id, professeur_id, salle_id) AS (
  VALUES
  -- BTS SIO 1
  (0, 1, 1, 1, '00000000-0000-4000-8000-000000000011'::uuid, 1),
  (0, 2, 1, 2, '00000000-0000-4000-8000-000000000011'::uuid, 1),
  (0, 3, 1, 3, '00000000-0000-4000-8000-000000000012'::uuid, 2),
  (1, 1, 1, 4, '00000000-0000-4000-8000-000000000012'::uuid, 2),
  (1, 2, 1, 1, '00000000-0000-4000-8000-000000000011'::uuid, 1),
  (1, 3, 1, 5, '00000000-0000-4000-8000-000000000012'::uuid, 2),
  (2, 1, 1, 1, '00000000-0000-4000-8000-000000000011'::uuid, 3),
  (3, 1, 1, 3, '00000000-0000-4000-8000-000000000012'::uuid, 2),
  (3, 2, 1, 2, '00000000-0000-4000-8000-000000000011'::uuid, 1),
  (3, 3, 1, 1, '00000000-0000-4000-8000-000000000011'::uuid, 3),
  (4, 1, 1, 4, '00000000-0000-4000-8000-000000000012'::uuid, 2),
  (4, 2, 1, 1, '00000000-0000-4000-8000-000000000011'::uuid, 1),
  -- BTS SIO 2 SLAM
  (0, 1, 2, 3, '00000000-0000-4000-8000-000000000012'::uuid, 2),
  (0, 2, 2, 4, '00000000-0000-4000-8000-000000000012'::uuid, 2),
  (0, 3, 2, 1, '00000000-0000-4000-8000-000000000011'::uuid, 1),
  (1, 1, 2, 1, '00000000-0000-4000-8000-000000000011'::uuid, 1),
  (1, 2, 2, 3, '00000000-0000-4000-8000-000000000012'::uuid, 2),
  (1, 3, 2, 2, '00000000-0000-4000-8000-000000000011'::uuid, 1),
  (2, 2, 2, 1, '00000000-0000-4000-8000-000000000011'::uuid, 3),
  (3, 1, 2, 1, '00000000-0000-4000-8000-000000000011'::uuid, 1),
  (3, 2, 2, 5, '00000000-0000-4000-8000-000000000012'::uuid, 2),
  (4, 1, 2, 2, '00000000-0000-4000-8000-000000000011'::uuid, 1),
  (4, 2, 2, 4, '00000000-0000-4000-8000-000000000012'::uuid, 2)
),
creneaux (creneau, heure) AS (
  VALUES (1, time '08:30'), (2, time '10:45'), (3, time '13:45')
),
semaines (decalage) AS (
  SELECT generate_series(-1, 2)
)
INSERT INTO cours (classe_id, matiere_id, professeur_id, salle_id, debut, fin)
SELECT st.classe_id, st.matiere_id, st.professeur_id, st.salle_id,
       (date_trunc('week', current_date)::date + s.decalage * 7 + st.jour + c.heure)::timestamp AT TIME ZONE 'Europe/Paris',
       (date_trunc('week', current_date)::date + s.decalage * 7 + st.jour + c.heure + interval '2 hours')::timestamp AT TIME ZONE 'Europe/Paris'
FROM semaine_type st
JOIN creneaux c USING (creneau)
CROSS JOIN semaines s;

-- Un cours annulé la semaine prochaine (pour voir l'affichage d'un cours annulé)
UPDATE cours SET annule = true, commentaire = 'Professeure absente'
WHERE classe_id = 1 AND matiere_id = 2
  AND debut = (date_trunc('week', current_date)::date + 7 + time '10:45')::timestamp AT TIME ZONE 'Europe/Paris';

-- ---------------------------------------------------------------------
-- DEVOIRS
-- Le trigger trg_devoir_suivi crée une ligne devoir_eleve par élève de la classe.
-- ---------------------------------------------------------------------
INSERT INTO devoir (id, classe_id, matiere_id, professeur_id, type, titre, description, donne_le, a_rendre_le, rendu_en_ligne) VALUES
  ('00000000-0000-4000-8000-000000000301', 1, 1, '00000000-0000-4000-8000-000000000011', 'projet',
   'API REST avec Slim', 'Créer une API qui liste et ajoute des livres (GET et POST), avec une base PostgreSQL. Rendre une archive .zip du projet.',
   current_date - 3, (current_date + 7 + time '18:00')::timestamp AT TIME ZONE 'Europe/Paris', true),
  ('00000000-0000-4000-8000-000000000302', 1, 1, '00000000-0000-4000-8000-000000000011', 'travail_a_faire',
   'Exercices SQL : jointures', 'Exercices 1 à 5 de la fiche « Jointures » vue en cours.',
   current_date - 1, (current_date + 3 + time '08:30')::timestamp AT TIME ZONE 'Europe/Paris', false),
  ('00000000-0000-4000-8000-000000000303', 1, 2, '00000000-0000-4000-8000-000000000011', 'travail_a_faire',
   'Probabilités conditionnelles', 'Exercices 12 à 15 page 84.',
   current_date - 10, (current_date - 2 + time '08:30')::timestamp AT TIME ZONE 'Europe/Paris', true),
  ('00000000-0000-4000-8000-000000000304', 1, 3, '00000000-0000-4000-8000-000000000012', 'controle',
   'Oral : présenter son projet en anglais', 'Préparer une présentation de 5 minutes de votre projet personnel.',
   current_date - 2, (current_date + 14 + time '13:45')::timestamp AT TIME ZONE 'Europe/Paris', false),
  ('00000000-0000-4000-8000-000000000305', 1, 4, '00000000-0000-4000-8000-000000000012', 'lecture',
   'Lire le chapitre 3 : le contrat de travail', NULL,
   current_date - 4, (current_date + 5 + time '08:30')::timestamp AT TIME ZONE 'Europe/Paris', false),
  ('00000000-0000-4000-8000-000000000306', 2, 1, '00000000-0000-4000-8000-000000000011', 'projet',
   'Application React : page de connexion', 'Formulaire de connexion branché sur une API, avec gestion des erreurs.',
   current_date - 5, (current_date + 10 + time '18:00')::timestamp AT TIME ZONE 'Europe/Paris', true);

-- Avancement des élèves de BTS SIO 1
UPDATE devoir_eleve SET statut = 'fait', fait_at = now() - interval '1 day'
WHERE devoir_id = '00000000-0000-4000-8000-000000000302'
  AND eleve_id IN ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000102');

UPDATE devoir_eleve SET statut = 'corrige', fait_at = now() - interval '4 days', rendu_at = now() - interval '3 days',
       corrige_at = now() - interval '1 day', note = 15, appreciation = 'Bon travail, attention aux arbres de probabilités.'
WHERE devoir_id = '00000000-0000-4000-8000-000000000303' AND eleve_id = '00000000-0000-4000-8000-000000000101';

UPDATE devoir_eleve SET statut = 'rendu', fait_at = now() - interval '4 days', rendu_at = now() - interval '3 days',
       commentaire_eleve = 'Je n''ai pas réussi l''exercice 15.'
WHERE devoir_id = '00000000-0000-4000-8000-000000000303'
  AND eleve_id IN ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000103');

-- ---------------------------------------------------------------------
-- RESSOURCES DE COURS
-- ---------------------------------------------------------------------
INSERT INTO ressource (classe_id, matiere_id, professeur_id, type, titre, contenu, url, created_at) VALUES
  (1, 1, '00000000-0000-4000-8000-000000000011', 'lien',  'Documentation de Slim 4', NULL, 'https://www.slimframework.com/docs/v4/', now() - interval '6 days'),
  (1, 1, '00000000-0000-4000-8000-000000000011', 'lien',  'Manuel PHP : PDO', NULL, 'https://www.php.net/manual/fr/book.pdo.php', now() - interval '3 days'),
  (1, 2, '00000000-0000-4000-8000-000000000011', 'texte', 'Rappel : formule des probabilités totales', 'P(B) = P(A) × P_A(B) + P(non A) × P_nonA(B)', NULL, now() - interval '9 days'),
  (2, 1, '00000000-0000-4000-8000-000000000011', 'lien',  'Documentation de React', NULL, 'https://react.dev/learn', now() - interval '5 days');

-- ---------------------------------------------------------------------
-- NOTES
-- ---------------------------------------------------------------------
INSERT INTO evaluation (id, classe_id, matiere_id, professeur_id, titre, date_eval, coefficient, bareme, periode) VALUES
  ('00000000-0000-4000-8000-000000000401', 1, 1, '00000000-0000-4000-8000-000000000011', 'Contrôle PHP : bases',          current_date - 20, 2, 20, 'Semestre 1'),
  ('00000000-0000-4000-8000-000000000402', 1, 2, '00000000-0000-4000-8000-000000000011', 'Interrogation : probabilités',  current_date - 12, 1, 10, 'Semestre 1'),
  ('00000000-0000-4000-8000-000000000403', 1, 3, '00000000-0000-4000-8000-000000000012', 'Compréhension orale',           current_date - 15, 1, 20, 'Semestre 1'),
  ('00000000-0000-4000-8000-000000000404', 1, 4, '00000000-0000-4000-8000-000000000012', 'Étude de cas : l''entreprise', current_date - 8,  2, 20, 'Semestre 1'),
  ('00000000-0000-4000-8000-000000000405', 2, 1, '00000000-0000-4000-8000-000000000011', 'Contrôle React : composants',  current_date - 9,  2, 20, 'Semestre 1');

INSERT INTO note (evaluation_id, eleve_id, valeur, absent, commentaire) VALUES
  ('00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000000101', 14.5, false, 'Bonne maîtrise des tableaux.'),
  ('00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000000102', 17,   false, NULL),
  ('00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000000103', 9.5,  false, 'Revoir les boucles.'),
  ('00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000000104', 12,   false, NULL),
  ('00000000-0000-4000-8000-000000000402', '00000000-0000-4000-8000-000000000101', 7,    false, NULL),
  ('00000000-0000-4000-8000-000000000402', '00000000-0000-4000-8000-000000000102', 8.5,  false, NULL),
  ('00000000-0000-4000-8000-000000000402', '00000000-0000-4000-8000-000000000103', NULL, true,  'Absent'),
  ('00000000-0000-4000-8000-000000000402', '00000000-0000-4000-8000-000000000104', 6,    false, NULL),
  ('00000000-0000-4000-8000-000000000403', '00000000-0000-4000-8000-000000000101', 13,   false, NULL),
  ('00000000-0000-4000-8000-000000000403', '00000000-0000-4000-8000-000000000102', 15,   false, NULL),
  ('00000000-0000-4000-8000-000000000403', '00000000-0000-4000-8000-000000000103', 11,   false, NULL),
  ('00000000-0000-4000-8000-000000000403', '00000000-0000-4000-8000-000000000104', 16.5, false, 'Très bonne prononciation.'),
  ('00000000-0000-4000-8000-000000000404', '00000000-0000-4000-8000-000000000101', 11,   false, NULL),
  ('00000000-0000-4000-8000-000000000404', '00000000-0000-4000-8000-000000000102', 14,   false, NULL),
  ('00000000-0000-4000-8000-000000000404', '00000000-0000-4000-8000-000000000103', 10,   false, NULL),
  ('00000000-0000-4000-8000-000000000404', '00000000-0000-4000-8000-000000000104', 13.5, false, NULL),
  ('00000000-0000-4000-8000-000000000405', '00000000-0000-4000-8000-000000000105', 15,   false, NULL),
  ('00000000-0000-4000-8000-000000000405', '00000000-0000-4000-8000-000000000106', 18,   false, 'Excellent.');

-- ---------------------------------------------------------------------
-- VIE SCOLAIRE (bonus, décision D3)
-- ---------------------------------------------------------------------
INSERT INTO absence (eleve_id, type, date_absence, duree_heures, minutes_retard, libelle, justifie, motif, saisi_par) VALUES
  ('00000000-0000-4000-8000-000000000101', 'absence', current_date - 6, 2,    NULL, 'Mathématiques', true,  'Rendez-vous médical', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000101', 'retard',  current_date - 2, NULL, 10,   'Développement', false, NULL,                  '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000103', 'absence', current_date,     4,    NULL, 'Matinée',       false, NULL,                  '00000000-0000-4000-8000-000000000001');

-- ---------------------------------------------------------------------
-- ACTUALITÉS
-- publique = visible par les visiteurs ; publie_at NULL = brouillon
-- ---------------------------------------------------------------------
INSERT INTO actualite (auteur_id, titre, contenu, publique, publie_at) VALUES
  ('00000000-0000-4000-8000-000000000001', 'Portes ouvertes du campus',
   'Venez découvrir nos formations BTS SIO le samedi de 10 h à 17 h : visite des salles, rencontre avec les professeurs et les étudiants.',
   true,  now() - interval '2 days'),
  ('00000000-0000-4000-8000-000000000002', 'Bienvenue sur Iris Space',
   'Iris Space remplace les anciens outils de l''école : emploi du temps, devoirs, notes, documents et messagerie au même endroit.',
   true,  now() - interval '20 days'),
  ('00000000-0000-4000-8000-000000000011', 'Hackathon de la classe de SIO 2',
   'Les étudiants de BTS SIO 2 organisent un hackathon de 24 h le mois prochain. Inscriptions auprès de Mme Martin.',
   false, now() - interval '5 days'),
  ('00000000-0000-4000-8000-000000000001', 'Calendrier des examens blancs',
   'Brouillon : dates à confirmer avec la direction.',
   false, NULL);

-- ---------------------------------------------------------------------
-- MESSAGERIE
-- ---------------------------------------------------------------------
INSERT INTO conversation (id, titre, est_groupe, created_by, created_at) VALUES
  ('00000000-0000-4000-8000-000000000501', NULL, false, '00000000-0000-4000-8000-000000000101', now() - interval '2 days'),
  ('00000000-0000-4000-8000-000000000502', NULL, false, '00000000-0000-4000-8000-000000000001', now() - interval '6 days');

INSERT INTO message (conversation_id, expediteur_id, contenu, envoye_at) VALUES
  ('00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000101', 'Bonjour Madame, pour le projet Slim, faut-il aussi la route DELETE ?', now() - interval '2 days'),
  ('00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000011', 'Bonjour John, non : GET et POST suffisent. DELETE est un bonus.',     now() - interval '1 day'),
  ('00000000-0000-4000-8000-000000000502', '00000000-0000-4000-8000-000000000001', 'Bonjour, pouvez-vous me confirmer vos disponibilités pour le conseil de classe ?', now() - interval '6 days'),
  ('00000000-0000-4000-8000-000000000502', '00000000-0000-4000-8000-000000000011', 'Bonjour, je suis disponible le jeudi après-midi.', now() - interval '5 days');

-- dernier_lu_at : John n'a pas encore lu la réponse de sa professeure (1 non-lu)
INSERT INTO conversation_participant (conversation_id, utilisateur_id, dernier_lu_at) VALUES
  ('00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000101', now() - interval '2 days'),
  ('00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000011', now() - interval '1 day'),
  ('00000000-0000-4000-8000-000000000502', '00000000-0000-4000-8000-000000000001', now() - interval '5 days'),
  ('00000000-0000-4000-8000-000000000502', '00000000-0000-4000-8000-000000000011', now() - interval '5 days');

-- ---------------------------------------------------------------------
-- NOTIFICATIONS
-- ---------------------------------------------------------------------
INSERT INTO notification (utilisateur_id, type, titre, lien, lue_at, created_at) VALUES
  ('00000000-0000-4000-8000-000000000101', 'message', 'Nouveau message de Claire Martin',      '/messages?conversation=00000000-0000-4000-8000-000000000501', NULL,                        now() - interval '1 day'),
  ('00000000-0000-4000-8000-000000000101', 'note',    'Nouvelle note en Culture économique, juridique et managériale', '/notes', NULL, now() - interval '8 days'),
  ('00000000-0000-4000-8000-000000000101', 'devoir',  'Nouveau devoir : API REST avec Slim',   '/devoirs',  now() - interval '2 days', now() - interval '3 days');

-- ---------------------------------------------------------------------
-- DOCUMENTS ADMINISTRATIFS
-- Seulement les espaces : aucun fichier n'est fourni avec la démo
-- (le téléchargement arrive avec DOC-01).
-- ---------------------------------------------------------------------
INSERT INTO type_document (nom) VALUES
  ('Certificats de scolarité'),
  ('Règlement intérieur'),
  ('Bulletins');

-- ---------------------------------------------------------------------
-- ESPACE VISITEUR
-- ---------------------------------------------------------------------
INSERT INTO page_publique (slug, titre, contenu) VALUES
  ('a-propos', 'À propos', 'Iris Space est l''espace numérique de l''école : actualités, emploi du temps, devoirs, notes, documents et messagerie.');

INSERT INTO demande_contact (nom, prenom, email, telephone, sujet, message, created_at) VALUES
  ('Petit', 'Sarah', 'sarah.petit@example.com', '06 12 34 56 78', 'Inscription en BTS SIO',
   'Bonjour, je voudrais savoir s''il reste des places pour la rentrée prochaine.', now() - interval '1 day');

COMMIT;
