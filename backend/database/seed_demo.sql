-- ─────────────────────────────────────────────────────────────────────────────
-- Données de démo (SOC-01) — DÉVELOPPEMENT ET DÉMONSTRATION UNIQUEMENT.
-- Chargé automatiquement par docker compose à la création du volume de la base,
-- après init_database.sql. Ne JAMAIS charger en production : mots de passe connus.
--   admin / admin1234 · prof / prof1234 · eleve / eleve1234 · dev / dev12345
--   mmartin, jdupont (profs) · lbernard, crobert, tpetit, emoreau (élèves) : demo1234
-- Pour repartir de zéro : docker compose down -v puis docker compose up -d --build
-- (ou, sur une base existante : backend/database/reset_dev.sql, puis init + seed).
-- ─────────────────────────────────────────────────────────────────────────────
BEGIN;

INSERT INTO annee_scolaire (libelle, debut, fin, courante) VALUES ('2026-2027', '2026-09-01', '2027-07-04', true);
INSERT INTO campus (nom, adresse) VALUES ('Campus Iris', '12 rue de l''École');
INSERT INTO classe (annee_scolaire_id, campus_id, nom)
  SELECT a.id, c.id, n FROM annee_scolaire a, campus c, (VALUES ('BTS SIO 1'), ('BTS SIO 2')) v(n);
INSERT INTO salle (campus_id, nom, capacite) SELECT id, n, 30 FROM campus, (VALUES ('A101'), ('B204'), ('Labo 1')) v(n);
INSERT INTO matiere (code, nom) VALUES
  ('DEV', 'Développement'), ('CYB', 'Cybersécurité'), ('MATH', 'Mathématiques'), ('CEJM', 'CEJM'), ('ANG', 'Anglais');

-- Comptes
INSERT INTO utilisateur (identifiant, email, mot_de_passe_hash, role, nom, prenom) VALUES
  ('admin',    'admin@iris-space.local',     '$2y$12$/8ueikZVgVmMGQzomRMGK.ATYyvMAh/7GnQgEHCneMnD6AyR9hQaq', 'administrateur', 'Admin', 'Iris'),
  ('dev',      'dev@iris-space.local',       '$2y$12$cnwg41/1ItT7QhCcb1LWoesY.t2i.KwwVyFtAe.D.eRwimmURXHlO', 'dev', 'Développeur', 'Équipe'),
  ('prof',     'prof@iris-space.local',      '$2y$12$DgL29ygTCp2mI7BojiNQNeY0wZKm9Eirvcpp/RRY08LvNxsvxgaFm', 'professeur', 'Leroy', 'Paul'),
  ('eleve',    'eleve@iris-space.local',     '$2y$12$MI.PzC5DfFgrzhTBeBeKQu9MnPduTexl5NCwge8j35LdifWMdrQdW', 'eleve', 'Durand', 'Lucas'),
  ('mmartin',  'm.martin@iris-space.local',  '$2y$12$IWqZFVxHZ3uT90Qiullkm.USM3CTn4HYSYgQItUKRZfkgUrIOQIMm', 'professeur', 'Martin',  'Marie'),
  ('jdupont',  'j.dupont@iris-space.local',  '$2y$12$IWqZFVxHZ3uT90Qiullkm.USM3CTn4HYSYgQItUKRZfkgUrIOQIMm', 'professeur', 'Dupont',  'Julien'),
  ('lbernard', 'l.bernard@iris-space.local', '$2y$12$IWqZFVxHZ3uT90Qiullkm.USM3CTn4HYSYgQItUKRZfkgUrIOQIMm', 'eleve',      'Bernard', 'Léa'),
  ('crobert',  'c.robert@iris-space.local',  '$2y$12$IWqZFVxHZ3uT90Qiullkm.USM3CTn4HYSYgQItUKRZfkgUrIOQIMm', 'eleve',      'Robert',  'Camille'),
  ('tpetit',   't.petit@iris-space.local',   '$2y$12$IWqZFVxHZ3uT90Qiullkm.USM3CTn4HYSYgQItUKRZfkgUrIOQIMm', 'eleve',      'Petit',   'Tom'),
  ('emoreau',  'e.moreau@iris-space.local',  '$2y$12$IWqZFVxHZ3uT90Qiullkm.USM3CTn4HYSYgQItUKRZfkgUrIOQIMm', 'eleve',      'Moreau',  'Emma');
INSERT INTO professeur (utilisateur_id) SELECT id FROM utilisateur WHERE identifiant IN ('prof', 'mmartin', 'jdupont');
INSERT INTO eleve (utilisateur_id, numero_etudiant) SELECT id, 'E2026-' || identifiant FROM utilisateur WHERE identifiant IN ('eleve', 'lbernard', 'crobert', 'tpetit', 'emoreau');
UPDATE eleve e SET classe_id = (SELECT id FROM classe WHERE nom = 'BTS SIO 1')
  FROM utilisateur u WHERE u.id = e.utilisateur_id AND u.identifiant IN ('eleve', 'lbernard', 'crobert');
UPDATE eleve e SET classe_id = (SELECT id FROM classe WHERE nom = 'BTS SIO 2')
  FROM utilisateur u WHERE u.id = e.utilisateur_id AND u.identifiant IN ('tpetit', 'emoreau');

-- Qui enseigne quoi, et le programme des classes
CREATE TEMP TABLE p AS SELECT identifiant, id FROM utilisateur WHERE identifiant IN ('prof', 'mmartin', 'jdupont');
INSERT INTO professeur_matiere (professeur_id, matiere_id)
  SELECT p.id, m.id FROM p JOIN matiere m ON (p.identifiant, m.code) IN
    (('prof','DEV'), ('prof','CYB'), ('mmartin','MATH'), ('mmartin','CEJM'), ('jdupont','ANG'));
INSERT INTO classe_matiere (classe_id, matiere_id, coefficient)
  SELECT c.id, m.id, CASE m.code WHEN 'DEV' THEN 4 WHEN 'CYB' THEN 3 ELSE 2 END FROM classe c, matiere m;

-- Cours : aujourd'hui et les deux semaines suivantes, du lundi au vendredi
INSERT INTO cours (classe_id, matiere_id, professeur_id, salle_id, debut, fin)
SELECT c.id, m.id, p.id, s.id,
       (d + t.h_debut)::timestamp AT TIME ZONE 'Europe/Paris',
       (d + t.h_fin)::timestamp AT TIME ZONE 'Europe/Paris'
FROM generate_series(DATE '2026-11-27', DATE '2026-12-11', INTERVAL '1 day') AS g(d0)
CROSS JOIN LATERAL (SELECT g.d0::date AS d) dd
JOIN (VALUES
  ('BTS SIO 1', 'DEV',  'prof',    'A101', TIME '09:00', TIME '11:00'),
  ('BTS SIO 1', 'MATH', 'mmartin', 'A101', TIME '11:00', TIME '12:00'),
  ('BTS SIO 1', 'CYB',  'prof',    'Labo 1', TIME '14:00', TIME '16:00'),
  ('BTS SIO 1', 'ANG',  'jdupont', 'A101', TIME '16:00', TIME '17:00'),
  ('BTS SIO 2', 'MATH', 'mmartin', 'B204', TIME '09:00', TIME '11:00'),
  ('BTS SIO 2', 'DEV',  'prof',    'Labo 1', TIME '11:00', TIME '12:00'),
  ('BTS SIO 2', 'ANG',  'jdupont', 'B204', TIME '14:00', TIME '16:00'),
  ('BTS SIO 2', 'CEJM', 'mmartin', 'B204', TIME '16:00', TIME '17:00')
) AS t(classe, code, prof, salle, h_debut, h_fin) ON true
JOIN classe c ON c.nom = t.classe
JOIN matiere m ON m.code = t.code
JOIN p ON p.identifiant = t.prof
JOIN salle s ON s.nom = t.salle
WHERE extract(isodow FROM dd.d) < 6;
UPDATE cours SET annule = true, commentaire = 'Professeur absent'
  WHERE id = (SELECT co.id FROM cours co JOIN matiere m ON m.id = co.matiere_id
              WHERE m.code = 'ANG' AND co.debut::date = DATE '2026-12-01' ORDER BY co.debut LIMIT 1);

-- Devoirs
INSERT INTO devoir (classe_id, matiere_id, professeur_id, type, titre, description, donne_le, a_rendre_le, rendu_en_ligne)
SELECT c.id, m.id, p.id, t.type::type_devoir, t.titre, t.descr, DATE '2026-11-23', (t.echeance::timestamp AT TIME ZONE 'Europe/Paris'), t.en_ligne
FROM (VALUES
  ('BTS SIO 1', 'DEV',  'prof',    'projet',          'Mini-site PHP', 'Réaliser un formulaire de contact avec validation côté serveur.', '2026-12-04 23:59', true),
  ('BTS SIO 1', 'CYB',  'prof',    'travail_a_faire', 'QCM chiffrement', 'Réviser le chapitre 3 et répondre au QCM.', '2026-12-01 08:00', false),
  ('BTS SIO 1', 'MATH', 'mmartin', 'controle',        'Contrôle suites numériques', 'Contrôle d''une heure, calculatrice autorisée.', '2026-12-07 11:00', false),
  ('BTS SIO 1', 'ANG',  'jdupont', 'lecture',         'Article sur l''IA', 'Lire l''article et préparer trois questions.', '2026-11-30 16:00', false),
  ('BTS SIO 2', 'DEV',  'prof',    'projet',          'API REST', 'Documenter les routes de votre API.', '2026-12-10 23:59', true)
) AS t(classe, code, prof, type, titre, descr, echeance, en_ligne)
JOIN classe c ON c.nom = t.classe JOIN matiere m ON m.code = t.code JOIN p ON p.identifiant = t.prof;
INSERT INTO devoir_eleve (devoir_id, eleve_id)
  SELECT d.id, e.utilisateur_id FROM devoir d JOIN eleve e ON e.classe_id = d.classe_id
  ON CONFLICT DO NOTHING;
UPDATE devoir_eleve de SET statut = 'fait', fait_at = now()
  FROM devoir d, utilisateur u WHERE d.id = de.devoir_id AND u.id = de.eleve_id AND u.identifiant = 'eleve' AND d.titre = 'Article sur l''IA';

-- Évaluations et notes
INSERT INTO evaluation (classe_id, matiere_id, professeur_id, titre, date_eval, coefficient, bareme, periode)
SELECT c.id, m.id, p.id, t.titre, t.d::date, t.coef, 20, 'S1'
FROM (VALUES
  ('BTS SIO 1', 'DEV',  'prof',    'TP base de données', '2026-11-10', 2),
  ('BTS SIO 1', 'CYB',  'prof',    'Contrôle réseaux',   '2026-11-17', 1),
  ('BTS SIO 1', 'MATH', 'mmartin', 'Interrogation logique', '2026-11-19', 1),
  ('BTS SIO 1', 'ANG',  'jdupont', 'Oral présentation', '2026-11-20', 1),
  ('BTS SIO 1', 'CEJM', 'mmartin', 'Étude de cas',       '2026-11-24', 2),
  ('BTS SIO 2', 'DEV',  'prof',    'Projet Symfony',     '2026-11-18', 3)
) AS t(classe, code, prof, titre, d, coef)
JOIN classe c ON c.nom = t.classe JOIN matiere m ON m.code = t.code JOIN p ON p.identifiant = t.prof;
INSERT INTO note (evaluation_id, eleve_id, valeur, commentaire)
SELECT ev.id, e.utilisateur_id,
       round((8 + (abs(hashtext(ev.id::text || e.utilisateur_id::text)) % 120) / 10.0)::numeric, 1),
       CASE WHEN abs(hashtext(e.utilisateur_id::text || ev.titre)) % 3 = 0 THEN 'Bon travail, continuez.' END
FROM evaluation ev JOIN eleve e ON e.classe_id = ev.classe_id;

-- Absences et retards de l'élève de test
INSERT INTO absence (eleve_id, type, date_absence, duree_heures, minutes_retard, libelle, justifie, motif)
SELECT u.id, t.type::type_absence, t.d::date, t.h, t.mn, t.lib, t.j, t.motif
FROM utilisateur u, (VALUES
  ('absence', '2026-11-12', 2.0, NULL::int, 'Développement', true,  'Rendez-vous médical'),
  ('retard',  '2026-11-18', NULL, 15,       'Mathématiques', false, NULL),
  ('absence', '2026-11-25', 1.0, NULL,      'Anglais',       false, NULL)
) AS t(type, d, h, mn, lib, j, motif)
WHERE u.identifiant = 'eleve';

-- Ressources de cours
INSERT INTO ressource (classe_id, matiere_id, professeur_id, type, titre, contenu, url)
SELECT c.id, m.id, p.id, t.type::type_ressource, t.titre, t.contenu, t.url
FROM (VALUES
  ('BTS SIO 1', 'DEV', 'prof',    'lien',  'Documentation PHP', NULL, 'https://www.php.net/manual/fr/'),
  ('BTS SIO 1', 'CYB', 'prof',    'texte', 'Résumé chapitre 3 : chiffrement', 'Chiffrement symétrique : une seule clé. Asymétrique : clé publique et clé privée.', NULL),
  ('BTS SIO 1', 'MATH','mmartin', 'lien',  'Exercices sur les suites', NULL, 'https://fr.khanacademy.org/math'),
  ('BTS SIO 2', 'DEV', 'prof',    'lien',  'Guide Symfony', NULL, 'https://symfony.com/doc/current/index.html')
) AS t(classe, code, prof, type, titre, contenu, url)
JOIN classe c ON c.nom = t.classe JOIN matiere m ON m.code = t.code JOIN p ON p.identifiant = t.prof;

-- Actualités publiées par l'administration
INSERT INTO actualite (titre, contenu, auteur_id, publique, publie_at)
SELECT t.titre, t.contenu, u.id, t.pub, t.d::timestamptz
FROM utilisateur u, (VALUES
  ('Portes ouvertes le 12 décembre', 'Venez découvrir l''école et rencontrer les équipes pédagogiques de 9h à 17h.', true, '2026-11-20 10:00+01'),
  ('Conseil de classe du premier semestre', 'Les conseils de classe auront lieu la semaine du 18 janvier.', false, '2026-11-25 09:00+01'),
  ('Vacances de Noël', 'Les cours s''arrêtent le vendredi 18 décembre au soir et reprennent le lundi 4 janvier.', true, '2026-11-26 14:00+01')
) AS t(titre, contenu, pub, d)
WHERE u.identifiant = 'admin';

COMMIT;
