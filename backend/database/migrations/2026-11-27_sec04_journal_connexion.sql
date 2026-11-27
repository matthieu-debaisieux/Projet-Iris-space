-- =====================================================================
--  SEC-04 (RGPD) : journal des connexions
--  À jouer UNE fois sur une base déjà créée (init_database.sql efface tout, donc
--  ne pas le rejouer). Le script est sans danger si on le relance : IF NOT EXISTS.
--
--  Avec Docker, depuis la racine du dépôt :
--    docker compose exec -T db psql -U iris -d iris_space < backend/database/migrations/2026-11-27_sec04_journal_connexion.sql
-- =====================================================================

CREATE TABLE IF NOT EXISTS journal_connexion (
  id             bigserial PRIMARY KEY,
  utilisateur_id uuid REFERENCES utilisateur(id) ON DELETE CASCADE, -- null si l'identifiant saisi n'existe pas
  identifiant    varchar(254) NOT NULL,                              -- identifiant ou e-mail saisi
  reussie        boolean NOT NULL,
  motif          varchar(30) CHECK (motif IN ('identifiant_inconnu', 'mot_de_passe_incorrect', 'compte_desactive')),
  ip             inet,
  user_agent     varchar(200),                                       -- tronqué
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_journal_connexion_date ON journal_connexion(created_at);
CREATE INDEX IF NOT EXISTS idx_journal_connexion_user ON journal_connexion(utilisateur_id, created_at DESC);
