-- =====================================================================
--  Migration du 27/11/2026 (SEC-02, SEC-03) : à lancer UNE fois sur une base
--  créée avant cette date, si on ne veut pas la remettre à zéro.
--  Une base créée avec le nouvel init_database.sql a déjà ces changements.
--  Le script peut être relancé sans erreur.
-- =====================================================================

CREATE TABLE IF NOT EXISTS tentative_connexion (
  id             bigserial PRIMARY KEY,
  type           varchar(20) NOT NULL DEFAULT 'mot_de_passe'
                 CHECK (type IN ('mot_de_passe', 'double_auth')),
  identifiant    citext NOT NULL,
  utilisateur_id uuid REFERENCES utilisateur(id) ON DELETE SET NULL,
  ip             inet,
  reussie        boolean NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tentative_identifiant ON tentative_connexion(type, identifiant, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tentative_ip          ON tentative_connexion(type, ip, created_at DESC);

ALTER TABLE utilisateur
  ADD COLUMN IF NOT EXISTS totp_secret      text,
  ADD COLUMN IF NOT EXISTS totp_active_at   timestamptz,
  ADD COLUMN IF NOT EXISTS totp_dernier_pas bigint;
