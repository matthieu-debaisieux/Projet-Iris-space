-- ─────────────────────────────────────────────────────────────────────────────
-- Remise à zéro de la base — DÉVELOPPEMENT UNIQUEMENT (SOC-01).
-- ATTENTION : efface toutes les tables et toutes les données du schéma public.
-- Ensuite, rejouer init_database.sql puis seed_demo.sql :
--   docker compose exec -T db psql -U iris -d iris_space < backend/database/reset_dev.sql
--   docker compose exec -T db psql -U iris -d iris_space < backend/database/init_database.sql
--   docker compose exec -T db psql -U iris -d iris_space < backend/database/seed_demo.sql
-- Plus simple, si on peut perdre le volume : docker compose down -v && docker compose up -d --build
-- ─────────────────────────────────────────────────────────────────────────────
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
