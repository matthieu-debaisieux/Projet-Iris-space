-- =====================================================================
--  IRIS SPACE - remise à zéro de la base (DÉVELOPPEMENT UNIQUEMENT)
-- =====================================================================
--  ATTENTION : efface TOUTES les tables et TOUTES les données du schéma public.
--  Ne jamais lancer sur la base de la bêta ou de production.
--
--  Ordre pour repartir de zéro (Adminer ou psql) :
--    1. reset_dev.sql       (ce fichier)
--    2. init_database.sql   (crée les tables)
--    3. seed_demo.sql       (comptes et données de démo)
--  Avec Docker, le plus simple est : docker compose down -v puis docker compose up -d
--  (voir le README, « Remettre la base à zéro »).
-- =====================================================================

DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
