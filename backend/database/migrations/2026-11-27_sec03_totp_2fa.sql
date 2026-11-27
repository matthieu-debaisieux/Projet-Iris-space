-- =====================================================================
--  SEC-03 : double authentification TOTP (colonnes sur utilisateur)
--  et motif code_2fa_incorrect dans journal_connexion.
--  Idempotent : sans danger si relancé.
-- =====================================================================

ALTER TABLE utilisateur
  ADD COLUMN IF NOT EXISTS totp_actif       boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS totp_secret      text,
  ADD COLUMN IF NOT EXISTS totp_dernier_pas bigint;

ALTER TABLE journal_connexion
  DROP CONSTRAINT IF EXISTS journal_connexion_motif_check;

ALTER TABLE journal_connexion
  ADD CONSTRAINT journal_connexion_motif_check
  CHECK (motif IN ('identifiant_inconnu', 'mot_de_passe_incorrect', 'compte_desactive', 'code_2fa_incorrect'));
