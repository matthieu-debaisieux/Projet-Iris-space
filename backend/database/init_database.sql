-- =====================================================================
--  IRIS SPACE - postgreSQL
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TYPE role_utilisateur  AS ENUM ('eleve', 'professeur', 'administrateur', 'direction');
CREATE TYPE type_devoir       AS ENUM ('travail_a_faire', 'controle', 'projet', 'lecture');
CREATE TYPE statut_devoir     AS ENUM ('a_faire', 'fait', 'rendu', 'corrige');
CREATE TYPE type_absence      AS ENUM ('absence', 'retard');
CREATE TYPE type_ressource    AS ENUM ('fichier', 'lien', 'texte');
CREATE TYPE type_notification AS ENUM ('message', 'devoir', 'note', 'absence', 'actualite', 'systeme');

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- UTILISATEURS
-- ---------------------------------------------------------------------
CREATE TABLE utilisateur (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifiant        varchar(50)  NOT NULL UNIQUE,
  email              citext       NOT NULL UNIQUE,
  mot_de_passe_hash  text         NOT NULL,
  role               role_utilisateur NOT NULL,
  nom                varchar(100) NOT NULL,
  prenom             varchar(100) NOT NULL,
  date_naissance     date,
  lieu_naissance     varchar(100),
  pays_naissance     varchar(100),
  nationalite        varchar(100),
  telephone          varchar(30),
  adresse            text,
  photo_url          text,
  actif              boolean      NOT NULL DEFAULT true,
  derniere_connexion timestamptz,
  created_at         timestamptz  NOT NULL DEFAULT now(),
  updated_at         timestamptz  NOT NULL DEFAULT now(),
  UNIQUE (id, role)
);
CREATE TRIGGER trg_utilisateur_updated BEFORE UPDATE ON utilisateur
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE reinitialisation_mdp (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  utilisateur_id uuid NOT NULL REFERENCES utilisateur(id) ON DELETE CASCADE,
  token_hash     text NOT NULL UNIQUE,
  expire_at      timestamptz NOT NULL,
  utilise_at     timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- STRUCTURE DE L'ÉCOLE
-- ---------------------------------------------------------------------
CREATE TABLE campus (
  id serial PRIMARY KEY, nom varchar(100) NOT NULL UNIQUE, adresse text
);

CREATE TABLE salle (
  id        serial PRIMARY KEY,
  campus_id int NOT NULL REFERENCES campus(id),
  nom       varchar(50) NOT NULL,
  capacite  int CHECK (capacite > 0),
  UNIQUE (campus_id, nom)
);

CREATE TABLE annee_scolaire (
  id       serial PRIMARY KEY,
  libelle  varchar(20) NOT NULL UNIQUE,
  debut    date NOT NULL,
  fin      date NOT NULL,
  courante boolean NOT NULL DEFAULT false,
  CHECK (fin > debut)
);
CREATE UNIQUE INDEX uq_annee_courante ON annee_scolaire (courante) WHERE courante;

CREATE TABLE classe (
  id                serial PRIMARY KEY,
  annee_scolaire_id int NOT NULL REFERENCES annee_scolaire(id),
  campus_id         int NOT NULL REFERENCES campus(id),
  nom               varchar(50) NOT NULL,
  UNIQUE (annee_scolaire_id, campus_id, nom)
);

CREATE TABLE matiere (
  id serial PRIMARY KEY, code varchar(20) UNIQUE, nom varchar(100) NOT NULL UNIQUE
);

CREATE TABLE eleve (
  utilisateur_id  uuid PRIMARY KEY,
  role            role_utilisateur NOT NULL DEFAULT 'eleve' CHECK (role = 'eleve'),
  numero_etudiant varchar(30) UNIQUE,
  classe_id       int REFERENCES classe(id),
  FOREIGN KEY (utilisateur_id, role) REFERENCES utilisateur(id, role) ON DELETE CASCADE
);
CREATE INDEX idx_eleve_classe ON eleve(classe_id);

CREATE TABLE professeur (
  utilisateur_id uuid PRIMARY KEY,
  role           role_utilisateur NOT NULL DEFAULT 'professeur' CHECK (role = 'professeur'),
  FOREIGN KEY (utilisateur_id, role) REFERENCES utilisateur(id, role) ON DELETE CASCADE
);

-- Un prof peut enseigner PLUSIEURS matières
CREATE TABLE professeur_matiere (
  professeur_id uuid NOT NULL REFERENCES professeur(utilisateur_id) ON DELETE CASCADE,
  matiere_id    int  NOT NULL REFERENCES matiere(id) ON DELETE CASCADE,
  PRIMARY KEY (professeur_id, matiere_id)
);

-- Programme d'une classe : quelles matières, quel coefficient
CREATE TABLE classe_matiere (
  classe_id   int NOT NULL REFERENCES classe(id) ON DELETE CASCADE,
  matiere_id  int NOT NULL REFERENCES matiere(id) ON DELETE CASCADE,
  coefficient numeric(4,2) NOT NULL DEFAULT 1 CHECK (coefficient > 0),
  PRIMARY KEY (classe_id, matiere_id)
);

-- ---------------------------------------------------------------------
-- EMPLOI DU TEMPS
-- ---------------------------------------------------------------------
CREATE TABLE cours (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classe_id     int  NOT NULL,
  matiere_id    int  NOT NULL,
  professeur_id uuid NOT NULL,
  salle_id      int REFERENCES salle(id),
  debut         timestamptz NOT NULL,
  fin           timestamptz NOT NULL,
  annule        boolean NOT NULL DEFAULT false,
  commentaire   text,
  CHECK (fin > debut),

  -- le prof doit enseigner cette matière / la classe doit avoir cette matière
  FOREIGN KEY (professeur_id, matiere_id) REFERENCES professeur_matiere(professeur_id, matiere_id),
  FOREIGN KEY (classe_id, matiere_id)     REFERENCES classe_matiere(classe_id, matiere_id),

  -- un prof ne peut pas faire cours à 2 classes en même temps
  CONSTRAINT cours_prof_sans_chevauchement
    EXCLUDE USING gist (professeur_id WITH =, tstzrange(debut, fin) WITH &&) WHERE (NOT annule),
  -- une classe n'a pas 2 cours en même temps
  CONSTRAINT cours_classe_sans_chevauchement
    EXCLUDE USING gist (classe_id WITH =, tstzrange(debut, fin) WITH &&) WHERE (NOT annule),
  -- une salle n'est pas occupée 2 fois
  CONSTRAINT cours_salle_sans_chevauchement
    EXCLUDE USING gist (salle_id WITH =, tstzrange(debut, fin) WITH &&)
    WHERE (salle_id IS NOT NULL AND NOT annule)
);
CREATE INDEX idx_cours_debut  ON cours(debut);
CREATE INDEX idx_cours_classe ON cours(classe_id, debut);
CREATE INDEX idx_cours_prof   ON cours(professeur_id, debut);

-- ---------------------------------------------------------------------
-- DEVOIRS
-- ---------------------------------------------------------------------
CREATE TABLE devoir (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classe_id      int  NOT NULL,
  matiere_id     int  NOT NULL,
  professeur_id  uuid NOT NULL,
  cours_id       uuid REFERENCES cours(id) ON DELETE SET NULL,
  type           type_devoir NOT NULL DEFAULT 'travail_a_faire',
  titre          varchar(200) NOT NULL,
  description    text,
  donne_le       date NOT NULL DEFAULT current_date,
  a_rendre_le    timestamptz,
  rendu_en_ligne boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (professeur_id, matiere_id) REFERENCES professeur_matiere(professeur_id, matiere_id),
  FOREIGN KEY (classe_id, matiere_id)     REFERENCES classe_matiere(classe_id, matiere_id)
);
CREATE INDEX idx_devoir_classe   ON devoir(classe_id, a_rendre_le);
CREATE INDEX idx_devoir_prof     ON devoir(professeur_id);
CREATE TRIGGER trg_devoir_updated BEFORE UPDATE ON devoir
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE devoir_fichier (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  devoir_id uuid NOT NULL REFERENCES devoir(id) ON DELETE CASCADE,
  nom       varchar(255) NOT NULL,
  url       text NOT NULL,
  taille_o  bigint
);

CREATE TABLE devoir_eleve (
  devoir_id         uuid NOT NULL REFERENCES devoir(id) ON DELETE CASCADE,
  eleve_id          uuid NOT NULL REFERENCES eleve(utilisateur_id) ON DELETE CASCADE,
  statut            statut_devoir NOT NULL DEFAULT 'a_faire',
  fait_at           timestamptz,
  rendu_at          timestamptz,
  commentaire_eleve text,
  note              numeric(5,2),
  appreciation      text,
  corrige_at        timestamptz,
  PRIMARY KEY (devoir_id, eleve_id)
);
CREATE INDEX idx_devoir_eleve_eleve ON devoir_eleve(eleve_id, statut);

CREATE TABLE devoir_rendu_fichier (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  devoir_id uuid NOT NULL,
  eleve_id  uuid NOT NULL,
  nom       varchar(255) NOT NULL,
  url       text NOT NULL,
  depose_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (devoir_id, eleve_id) REFERENCES devoir_eleve(devoir_id, eleve_id) ON DELETE CASCADE
);

-- Création automatique du suivi pour chaque élève de la classe
CREATE OR REPLACE FUNCTION creer_suivi_devoir() RETURNS trigger AS $$
BEGIN
  INSERT INTO devoir_eleve (devoir_id, eleve_id)
  SELECT NEW.id, e.utilisateur_id FROM eleve e WHERE e.classe_id = NEW.classe_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_devoir_suivi AFTER INSERT ON devoir
  FOR EACH ROW EXECUTE FUNCTION creer_suivi_devoir();

-- ---------------------------------------------------------------------
-- RESSOURCES
-- ---------------------------------------------------------------------
CREATE TABLE ressource (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classe_id     int  NOT NULL,
  matiere_id    int  NOT NULL,
  professeur_id uuid NOT NULL,
  cours_id      uuid REFERENCES cours(id) ON DELETE SET NULL,
  type          type_ressource NOT NULL,
  titre         varchar(200) NOT NULL,
  contenu       text,
  url           text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CHECK (type = 'texte' OR url IS NOT NULL),
  FOREIGN KEY (professeur_id, matiere_id) REFERENCES professeur_matiere(professeur_id, matiere_id),
  FOREIGN KEY (classe_id, matiere_id)     REFERENCES classe_matiere(classe_id, matiere_id)
);
CREATE INDEX idx_ressource_classe ON ressource(classe_id, matiere_id);

-- ---------------------------------------------------------------------
-- NOTES
-- ---------------------------------------------------------------------
CREATE TABLE evaluation (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classe_id     int  NOT NULL,
  matiere_id    int  NOT NULL,
  professeur_id uuid NOT NULL,
  devoir_id     uuid REFERENCES devoir(id) ON DELETE SET NULL,
  titre         varchar(200) NOT NULL,
  date_eval     date NOT NULL,
  coefficient   numeric(4,2) NOT NULL DEFAULT 1 CHECK (coefficient > 0),
  bareme        numeric(5,2) NOT NULL DEFAULT 20 CHECK (bareme > 0),
  periode       varchar(30),
  FOREIGN KEY (professeur_id, matiere_id) REFERENCES professeur_matiere(professeur_id, matiere_id),
  FOREIGN KEY (classe_id, matiere_id)     REFERENCES classe_matiere(classe_id, matiere_id)
);
CREATE INDEX idx_evaluation_classe ON evaluation(classe_id, matiere_id);

CREATE TABLE note (
  evaluation_id uuid NOT NULL REFERENCES evaluation(id) ON DELETE CASCADE,
  eleve_id      uuid NOT NULL REFERENCES eleve(utilisateur_id) ON DELETE CASCADE,
  valeur        numeric(5,2) CHECK (valeur >= 0),
  absent        boolean NOT NULL DEFAULT false,
  commentaire   text,
  PRIMARY KEY (evaluation_id, eleve_id),
  CHECK (NOT absent OR valeur IS NULL)
);
CREATE INDEX idx_note_eleve ON note(eleve_id);

-- ---------------------------------------------------------------------
-- VIE SCOLAIRE
-- ---------------------------------------------------------------------
CREATE TABLE absence (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  eleve_id         uuid NOT NULL REFERENCES eleve(utilisateur_id) ON DELETE CASCADE,
  cours_id         uuid REFERENCES cours(id) ON DELETE SET NULL,
  type             type_absence NOT NULL DEFAULT 'absence',
  date_absence     date NOT NULL,
  duree_heures     numeric(4,2),
  minutes_retard   int CHECK (minutes_retard > 0),
  libelle          varchar(200),
  justifie         boolean NOT NULL DEFAULT false,
  motif            text,
  justificatif_url text,
  saisi_par        uuid REFERENCES utilisateur(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  CHECK (type = 'retard' OR minutes_retard IS NULL)
);
CREATE INDEX idx_absence_date  ON absence(date_absence);
CREATE INDEX idx_absence_eleve ON absence(eleve_id, date_absence DESC);

-- ---------------------------------------------------------------------
-- ACTUALITÉS
-- ---------------------------------------------------------------------
CREATE TABLE actualite (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auteur_id  uuid NOT NULL REFERENCES utilisateur(id),
  titre      varchar(200) NOT NULL,
  contenu    text NOT NULL,
  image_url  text,
  publique   boolean NOT NULL DEFAULT false,
  publie_at  timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_actualite_publie ON actualite(publie_at DESC) WHERE publie_at IS NOT NULL;
CREATE TRIGGER trg_actualite_updated BEFORE UPDATE ON actualite
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- MESSAGERIE
-- ---------------------------------------------------------------------
CREATE TABLE conversation (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titre      varchar(200),
  est_groupe boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES utilisateur(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE conversation_participant (
  conversation_id uuid NOT NULL REFERENCES conversation(id) ON DELETE CASCADE,
  utilisateur_id  uuid NOT NULL REFERENCES utilisateur(id) ON DELETE CASCADE,
  dernier_lu_at   timestamptz,
  PRIMARY KEY (conversation_id, utilisateur_id)
);
CREATE INDEX idx_conv_part_user ON conversation_participant(utilisateur_id);

CREATE TABLE message (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversation(id) ON DELETE CASCADE,
  expediteur_id   uuid NOT NULL REFERENCES utilisateur(id),
  contenu         text NOT NULL,
  envoye_at       timestamptz NOT NULL DEFAULT now(),
  modifie_at      timestamptz,
  supprime        boolean NOT NULL DEFAULT false
);
CREATE INDEX idx_message_conv ON message(conversation_id, envoye_at DESC);

CREATE TABLE message_piece_jointe (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES message(id) ON DELETE CASCADE,
  nom        varchar(255) NOT NULL,
  url        text NOT NULL
);

-- ---------------------------------------------------------------------
-- NOTIFICATIONS
-- ---------------------------------------------------------------------
CREATE TABLE notification (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  utilisateur_id uuid NOT NULL REFERENCES utilisateur(id) ON DELETE CASCADE,
  type           type_notification NOT NULL,
  titre          varchar(200) NOT NULL,
  lien           text,
  lue_at         timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notif_non_lues ON notification(utilisateur_id, created_at DESC) WHERE lue_at IS NULL;

-- ---------------------------------------------------------------------
-- DOCUMENTS ADMINISTRATIFS
-- ---------------------------------------------------------------------
CREATE TABLE type_document (
  id serial PRIMARY KEY, nom varchar(100) NOT NULL UNIQUE
);

CREATE TABLE document (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type_document_id int  NOT NULL REFERENCES type_document(id),
  utilisateur_id   uuid REFERENCES utilisateur(id) ON DELETE CASCADE,
  titre            varchar(200) NOT NULL,
  url              text NOT NULL,
  depose_par       uuid REFERENCES utilisateur(id),
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_document_user ON document(utilisateur_id);

-- ---------------------------------------------------------------------
-- ESPACE VISITEUR
-- ---------------------------------------------------------------------
CREATE TABLE page_publique (
  slug       varchar(50) PRIMARY KEY,
  titre      varchar(200) NOT NULL,
  contenu    text,
  image_url  text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE demande_contact (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom         varchar(100) NOT NULL,
  prenom      varchar(100),
  email       citext NOT NULL,
  telephone   varchar(30),
  sujet       varchar(200),
  message     text NOT NULL,
  traitee     boolean NOT NULL DEFAULT false,
  traitee_par uuid REFERENCES utilisateur(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- VUES
-- ---------------------------------------------------------------------
CREATE VIEW v_absences_du_jour AS
SELECT a.id, u.nom, u.prenom, c.nom AS classe, a.type, a.duree_heures,
       a.justifie, a.motif, u.telephone, u.email
FROM absence a
JOIN eleve e       ON e.utilisateur_id = a.eleve_id
JOIN utilisateur u ON u.id = e.utilisateur_id
LEFT JOIN classe c ON c.id = e.classe_id
WHERE a.date_absence = current_date;

CREATE VIEW v_cours_du_jour AS
SELECT co.id, co.debut, co.fin, co.annule, cl.nom AS classe, m.nom AS matiere,
       up.nom AS prof_nom, up.prenom AS prof_prenom, s.nom AS salle
FROM cours co
JOIN classe cl      ON cl.id = co.classe_id
JOIN matiere m      ON m.id = co.matiere_id
JOIN utilisateur up ON up.id = co.professeur_id
LEFT JOIN salle s   ON s.id = co.salle_id
WHERE co.debut::date = current_date;

-- Emploi du temps d'un élève
CREATE VIEW v_emploi_du_temps_eleve AS
SELECT e.utilisateur_id AS eleve_id, co.id AS cours_id, co.debut, co.fin, co.annule,
       m.nom AS matiere, up.nom AS prof_nom, up.prenom AS prof_prenom, s.nom AS salle
FROM eleve e
JOIN cours co       ON co.classe_id = e.classe_id
JOIN matiere m      ON m.id = co.matiere_id
JOIN utilisateur up ON up.id = co.professeur_id
LEFT JOIN salle s   ON s.id = co.salle_id;

CREATE VIEW v_devoirs_eleve AS
SELECT de.eleve_id, d.id AS devoir_id, m.nom AS matiere, d.titre, d.description,
       d.type, d.donne_le, d.a_rendre_le, de.statut, de.note
FROM devoir_eleve de
JOIN devoir d  ON d.id = de.devoir_id
JOIN matiere m ON m.id = d.matiere_id;

CREATE VIEW v_moyenne_matiere AS
SELECT n.eleve_id, ev.matiere_id,
       ROUND(SUM((n.valeur / ev.bareme * 20) * ev.coefficient) / NULLIF(SUM(ev.coefficient), 0), 2) AS moyenne_sur_20
FROM note n
JOIN evaluation ev ON ev.id = n.evaluation_id
WHERE n.valeur IS NOT NULL AND NOT n.absent
GROUP BY n.eleve_id, ev.matiere_id;