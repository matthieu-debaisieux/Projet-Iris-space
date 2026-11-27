-- =====================================================================
--  Migration du 27/11/2026 (PWA-04) : abonnements aux notifications push.
--  À lancer une fois sur une base créée avant ; peut être relancé sans erreur.
-- =====================================================================

CREATE TABLE IF NOT EXISTS push_abonnement (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  utilisateur_id   uuid NOT NULL REFERENCES utilisateur(id) ON DELETE CASCADE,
  endpoint         text NOT NULL UNIQUE,
  p256dh           text NOT NULL,
  auth             text NOT NULL,
  user_agent       text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  dernier_envoi_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_push_utilisateur ON push_abonnement(utilisateur_id);
