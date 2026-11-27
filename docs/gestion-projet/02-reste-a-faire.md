# 02 — Ce qui reste à faire

Le backlog complet jusqu'à la bêta, découpé en lots. Chaque tâche a un identifiant, une priorité, une charge estimée, ses dépendances, un responsable proposé et un sprint (voir [03](03-roadmap.md) et [04](04-repartition-des-taches.md)).

- **Priorité** : M = Must, S = Should, C = Could, d'après le tableau MoSCoW du cahier des charges. Une tâche technique sans fonctionnalité visible (fusion, sécurité, déploiement) est classée M quand la bêta ne peut pas sortir sans elle.
- **Charge** : heures de travail pour une personne. C'est un ordre de grandeur, à réestimer au début de chaque sprint.
- **Dépend de** : tâches ou décisions (D1 à D11, en bas de page) à régler avant.
- Chaque lot touche le front et le back à la fois. La personne qui écrit une route ajoute aussi ses cas à la collection de tests (QUA-01) et la décrit dans `ROUTES.md`.

## D'abord : trois blocages

1. **Le code est éparpillé.** Le back est sur `backend`, les pages récentes sur `front-eleve+navbar/louis` et `2Front-VieScolaire/Louis`, et `main` n'a pas bougé depuis le 21/10. Tant que tout n'est pas réuni, personne ne peut tester une fonctionnalité de bout en bout. → lot INT.
2. **Le front et le back ne suivent pas le même contrat.** Le README de `main` liste les routes « attendues par le front », `backend/ROUTES.md` liste celles du back, et elles diffèrent (tableau ci-dessous). Même la connexion échouerait. → lot SOC.
3. **La base est vide.** Sans compte de démo, `POST /auth/login` répond toujours 401. → SOC-01.

## Écarts entre les appels du front et les routes du back

| Le front appelle (`frontend/src/services/`) | Le back propose | Tâche |
|---|---|---|
| `POST /auth/login` avec `{ identifiant, motDePasse }`, attend `{ id, identifiant, role, nom, droits }` | `POST /auth/login` avec `{ identifiant, mot_de_passe }`, renvoie `{ user: {…} }` sans `droits` | SOC-02, SOC-03 |
| rôles `admin`, `prof`, `eleve` (mocks) | rôles `administrateur`, `direction`, `professeur`, `eleve` | SOC-05 |
| `GET /actualites`, `GET /actualites?statut=Publié`, `POST /actualites`, `PUT`/`DELETE /actualites/:id` | rien ; `ROUTES.md` prévoit `/actualites/publiques`, `/actualites` et `/admin/actualites` | ACT-01, ACT-03 |
| `GET /conversations`, `POST /conversations/:id/messages` | rien ; prévu dans `ROUTES.md` | MSG-01, MSG-03 |
| `GET /planning`, `GET /planning/aujourdhui` | rien ; `ROUTES.md` prévoit `/admin/cours` | EDT-01, EDT-02, ACC-02 |
| `GET /eleve/emploi-du-temps?date=…` | `GET /eleve/emploi-du-temps?du=…&au=…` | EDT-03 |
| `GET /eleve/raccourcis` | n'existe pas : les blocs de l'accueil élève correspondent à `/eleve/devoirs`, `/eleve/ressources` et `/eleve/notes` | ACC-01 |
| pour un prof ou un admin, l'accueil et le Profil appellent aussi `/eleve/emploi-du-temps`, `/eleve/raccourcis` et `/eleve/profil` | `/eleve/*` répond 403 à tout autre rôle qu'élève | ACC-01, EDT-03, CPT-07 |
| `GET /espaces` | `GET /admin/espaces` | DOC-02 |
| `GET /absences?date=today` | rien ; `ROUTES.md` prévoit `/admin/absences?date=` | VSC-01, en bonus après J3 (D3) |
| `GET /eleve/notes`, `GET /eleve/profil` | mêmes adresses | vérifier le format des réponses (NOT-01) |
| erreurs : `Error("GET /x → 404")`, le message du back est perdu | `{ "error": "message lisible" }` | SOC-04 |
| ni `PATCH`, ni envoi de fichier | routes `PATCH` et formulaires multipart (champ `fichier`) | SOC-04 |

## Backlog par lot

### INT — Remise en ordre du dépôt

| ID | Tâche | Prio | Charge | Dépend de | Qui | Sprint |
|---|---|:---:|---:|---|---|---|
| **INT-01** | Fusionner `backend` dans `main` : 4 fichiers en conflit (`.gitignore`, `README.md`, `docker-compose.yml`, `frontend/nginx.conf`) | M | 3 h | — | Thomas | S1 |
| **INT-02** | Fusionner `front-eleve+navbar/louis` dans `main` en gardant une seule page Notes (décision D8) | M | 2 h | D8 | Louis | S1 |
| **INT-03** | Intégrer `2Front-VieScolaire/Louis` telle quelle (vie scolaire gardée en bonus, décision D3) : elle se fusionne sans conflit après INT-02 | M | 1 h | INT-02 | Louis | S1 |
| **INT-04** | README : retirer les marqueurs de conflit (`<<<<<<<`), une seule procédure de lancement, avec et sans Docker | M | 2 h | INT-01 | Maïlys | S1 |
| **INT-05** | Un seul contrat d'API : `backend/ROUTES.md` fait foi ; y reporter la table « Routes attendues par le front » du README | M | 2 h | INT-01 | Thomas | S1 |
| **INT-06** | Sortir `backend/vendor/` de Git, supprimer les branches déjà fusionnées, créer `develop`, protéger `main` et `develop` (PR et une relecture obligatoires) | M | 2 h | INT-01, INT-02 | Matthieu | S1 |
| **INT-07** | Appui au déploiement de la bêta avec l'équipe SISR : variables d'environnement de production, build du front, création de la base, essai complet sur le serveur | M | 4 h | INF-03 | Thomas | S5 |
| **INT-08** | Fusionner `develop` dans `main` et étiqueter la version `v1.0.0-beta` (jalon J5) | M | 1 h | QUA-03 | Thomas | S6 |

### SOC — Socle d'intégration front ↔ back

| ID | Tâche | Prio | Charge | Dépend de | Qui | Sprint |
|---|---|:---:|---:|---|---|---|
| **SOC-01** | Données de démo `backend/database/seed_demo.sql` : comptes admin, prof et élève (mots de passe hachés), année scolaire courante, campus, classes, matières, liens prof ↔ matière et classe ↔ matière, quelques cours, devoirs, notes et actualités. Sortir le `DROP SCHEMA` de `init_database.sql` dans un script de remise à zéro réservé au dev | M | 6 h | — | Maïlys | S1 |
| **SOC-02** | Le back renvoie `droits` (déduits du rôle, mêmes codes que `mocks/users.js`) dans `/auth/login` et `/auth/me` | M | 2 h | — | Thomas | S1 |
| **SOC-03** | Connexion côté front : envoyer `mot_de_passe`, lire la réponse `{ user }`, restaurer la session avec `GET /auth/me` au chargement, revenir à la connexion sur une réponse 401 | M | 3 h | SOC-02 | Thomas | S1 |
| **SOC-04** | `services/api.js` : afficher le message `{ error }` du back, ajouter `patch` et l'envoi de fichiers (`FormData`) | M | 2 h | — | Teva | S1 |
| **SOC-05** | Aligner les mocks sur le back : rôles `administrateur`, `direction`, `professeur`, `eleve` et format des réponses | M | 1 h | INT-05 | Teva | S1 |
| **SOC-06** | Activer le relais `/api` de `frontend/nginx.conf` vers `api:80` (le port 3000 n'existe qu'à l'extérieur de Docker) et vérifier `docker compose up` de bout en bout | M | 1 h | INT-01 | Maïlys | S1 |
| **SOC-07** | Vérifier le socle : admin, prof et élève se connectent avec `VITE_USE_MOCKS=false` et voient leur menu | M | 1 h | SOC-01 à SOC-06 | Thomas | S1 |

### ACC — Pages d'accueil

| ID | Tâche | Prio | Charge | Dépend de | Qui | Sprint |
|---|---|:---:|---:|---|---|---|
| **ACC-01** | Accueil : remplacer `/eleve/raccourcis`, qui n'existe pas, par les routes existantes ; élève : devoirs à faire, dernières ressources, dernières notes ; prof : ses prochains devoirs et évaluations (aujourd'hui l'accueil du prof lit les données élève) | M | 3 h | SOC-07 | Teva | S2 |
| **ACC-02** | Tableau de bord admin : « Cours aujourd'hui » via `/admin/cours` ; le bloc « Absences aujourd'hui » reste sur les mocks jusqu'à VSC-01 (vie scolaire en bonus, décision D3) | M | 2 h | EDT-01 | Teva | S3 |

### ACT — Actualités

| ID | Tâche | Prio | Charge | Dépend de | Qui | Sprint |
|---|---|:---:|---:|---|---|---|
| **ACT-01** | Back : `GET /actualites/publiques`, `GET /actualites?limit=`, création, modification et suppression (admin et direction ; un prof pour ses propres articles) | M | 6 h | SOC-07, ACT-02 | Matthieu | S2 |
| **ACT-02** | Trancher les écarts avec la base (décision D9) : statut « Archivé », auteur en texte libre au lieu de `auteur_id` | M | 1 h | — | Matthieu | S1 |
| **ACT-03** | Front : brancher `services/actualites.js` (page Actualité, accueil, page visiteur) et donner le droit `actualites_gerer` aux profs | M | 3 h | ACT-01 | Matthieu | S3 |
| **ACT-04** | Envoyer l'image d'une actualité par `POST /uploads` au lieu de la garder en base64 dans le localStorage | M | 2 h | DOC-01, ACT-03 | Matthieu | S3 |
| **ACT-05** | Brancher le formulaire Contact (visiteur) sur `POST /contact` | M | 1 h | SOC-07 | Matthieu | S3 |

### MSG — Messagerie

| ID | Tâche | Prio | Charge | Dépend de | Qui | Sprint |
|---|---|:---:|---:|---|---|---|
| **MSG-01** | Back : conversations (liste avec dernier message et non-lus, création), messages (fil, envoi), marquer comme lu, `GET /messages/non-lus`, `GET /utilisateurs?recherche=` | M | 8 h | SOC-07, MSG-02 | Maïlys | S2 |
| **MSG-02** | Écrire qui peut écrire à qui (décision D10) et le faire valider | M | 1 h | — | Maïlys | S2 |
| **MSG-03** | Front : brancher `Messages.jsx`, nouvelle conversation avec recherche, pastille des non-lus, rafraîchissement toutes les 30 s | M | 5 h | MSG-01 | Maïlys | S3 |
| **MSG-04** | Pièces jointes dans les messages (table `message_piece_jointe` déjà prête) | C | 3 h | MSG-03, DOC-01 | Maïlys | S6 |

### EDT — Emploi du temps

| ID | Tâche | Prio | Charge | Dépend de | Qui | Sprint |
|---|---|:---:|---:|---|---|---|
| **EDT-01** | Back admin : classes, salles, matières et profs (pour les menus), cours d'une semaine, création, modification, suppression ; un chevauchement renvoie 409 au lieu de 500 (erreur `23P01`) | M | 8 h | SOC-07 | Teva | S2 |
| **EDT-02** | Front Gestion : matière et intervenant en menus (id), création de classe et de salle avec année et campus, message clair en cas de chevauchement | M | 6 h | EDT-01 | Teva | S3 |
| **EDT-03** | Front Consultation (élève, prof) et bloc « Ma journée » : appeler `?du=&au=` au lieu de `?date=`, et `/prof/emploi-du-temps` quand c'est un prof | M | 4 h | — | Teva | S1 |

### DEV — Devoirs

| ID | Tâche | Prio | Charge | Dépend de | Qui | Sprint |
|---|---|:---:|---:|---|---|---|
| **DEV-01** | Service front `services/devoirs.js` (mocks et API, élève et prof) et vérification des routes déjà codées | M | 2 h | — | Louis | S1 |
| **DEV-02** | Page Devoirs élève : à faire, fait, rendu, corrigé ; marquer comme fait ; rendre en ligne avec fichiers | M | 6 h | DEV-01 | Louis | S1 |
| **DEV-03** | Page Devoirs prof : liste, création (classe, matière, type, échéance, consigne), modification, suppression, suivi des rendus | M | 8 h | DEV-01 | Louis | S2 |
| **DEV-04** | Correction d'un devoir rendu : note et appréciation (route déjà codée dans `prof_bonus.php`) | C | 2 h | DEV-03 | Louis | S6 |
| **DEV-05** | Pièces jointes du prof sur un devoir : route `POST /prof/devoirs/{id}/fichiers` à ajouter (la table `devoir_fichier` existe déjà) et envoi depuis la page Devoirs prof | S | 3 h | DEV-03, DOC-01 | Louis | S5 |

### NOT — Notes

| ID | Tâche | Prio | Charge | Dépend de | Qui | Sprint |
|---|---|:---:|---:|---|---|---|
| **NOT-01** | Notes élève branchées sur `/eleve/notes`, moyennes par matière sur `/eleve/moyennes` | M | 3 h | INT-02, SOC-07 | Louis | S2 |
| **NOT-02** | Notes côté prof : créer une évaluation (classe, matière, barème, coefficient, date) et saisir les notes de la classe dans une grille | M | 8 h | DEV-01 | Louis | S3 |

### DOC — Documents

| ID | Tâche | Prio | Charge | Dépend de | Qui | Sprint |
|---|---|:---:|---:|---|---|---|
| **DOC-01** | Back : `POST /uploads` (renvoie l'adresse du fichier) et `GET /documents/{id}/telecharger` avec vérification des droits | M | 5 h | SOC-07 | Thomas | S2 |
| **DOC-02** | Front admin : page Documents branchée sur `/admin/espaces` (le front appelle aujourd'hui `/espaces`) | M | 3 h | DOC-01 | Thomas | S3 |
| **DOC-03** | Front prof : déposer et lister ses ressources de cours (`/prof/ressources`, routes déjà codées) | M | 4 h | DOC-01 | Louis | S4 |
| **DOC-04** | Élève : voir ses documents (`/eleve/documents`) et un espace « Mes documents » pour en déposer et en supprimer (routes `POST` et `DELETE /eleve/documents` à ajouter) ; les rendus de devoirs passent par DEV-02 (décision D7) | M | 5 h | DOC-01 | Thomas | S3 |

### CPT — Comptes, profil, classe

| ID | Tâche | Prio | Charge | Dépend de | Qui | Sprint |
|---|---|:---:|---:|---|---|---|
| **CPT-01** | Page admin « Comptes » : liste par rôle, création, modification (dont la classe d'un élève), désactivation (routes déjà codées) | M | 8 h | EDT-01 | Teva | S4 |
| **CPT-02** | Page admin « Programme » : matières, matières d'un prof, matières et coefficients d'une classe (routes déjà codées) | S | 5 h | CPT-01 | Teva | S5 |
| **CPT-03** | « Voir la classe » : liste des élèves d'une classe pour l'élève (route à créer), le prof (route codée) et l'admin | M | 5 h | SOC-07 | Louis | S4 |
| **CPT-04** | L'élève modifie ses informations : `PATCH /eleve/profil` et formulaire dans la page Profil | S | 4 h | SOC-07 | Matthieu | S5 |
| **CPT-05** | Photo de profil enregistrée par le back (aujourd'hui en base64 dans le localStorage) | S | 2 h | DOC-01 | Louis | S5 |
| **CPT-06** | Mot de passe : le changer depuis le profil, pages « mot de passe oublié » (routes codées), envoi de l'e-mail par SMTP (aujourd'hui `mail()` sans serveur d'envoi) | M | 3 h | SOC-07 | Maïlys | S4 |
| **CPT-07** | Page Profil selon le rôle : le prof et l'admin voient leurs propres informations (aujourd'hui la page affiche le profil d'un élève pour tout le monde) | M | 2 h | SOC-03 | Thomas | S3 |

### NTF — Notifications dans l'application

Pour la bêta, les notifications restent dans l'application (une cloche dans la navbar). Le push sur téléphone vient après la bêta (décision D5).

| ID | Tâche | Prio | Charge | Dépend de | Qui | Sprint |
|---|---|:---:|---:|---|---|---|
| **NTF-01** | Notifications dans l'application, côté back : créer une notification en base à chaque nouveau message, nouvelle note, nouveau devoir et cours annulé ou déplacé, avec une fonction commune ; les routes de lecture existent déjà (décision D5) | M | 4 h | MSG-01, EDT-01 | Maïlys | S4 |
| **NTF-02** | Notifications dans l'application, côté front : cloche dans la navbar avec le nombre de non-lues, liste, marquer comme lue, tout marquer comme lu | M | 3 h | SOC-07 | Teva | S4 |

### PWA — Application installable et hors ligne

| ID | Tâche | Prio | Charge | Dépend de | Qui | Sprint |
|---|---|:---:|---:|---|---|---|
| **PWA-01** | Manifest (nom, icônes, couleurs de la charte) : l'application devient installable | M | 2 h | — | Thomas | S4 |
| **PWA-02** | Service worker : l'application s'ouvre hors ligne ; actualités et devoirs restent consultables hors ligne (cahier des charges) | M | 6 h | ACT-03, DEV-02 | Thomas | S4 |
| **PWA-03** | Bandeau « hors ligne » et invitation à installer l'application | M | 2 h | PWA-01 | Thomas | S4 |
| **PWA-04** | Notifications push, côté back : abonnements en base, envoi sur nouveau message, nouvelle note, nouveau devoir, cours modifié (après la bêta, décision D5) | S | 7 h | PWA-02, NTF-01 | Maïlys | après J5 |
| **PWA-05** | Notifications push, côté front : demande d'autorisation, réception dans le service worker (après la bêta, décision D5) | S | 5 h | PWA-04 | Thomas | après J5 |
| **PWA-06** | Essais sur Android, iPhone (Safari) et ordinateur, en HTTPS | M | 2 h | PWA-02, INF-02 | Thomas | S5 |

### SEC — Sécurité et RGPD

| ID | Tâche | Prio | Charge | Dépend de | Qui | Sprint |
|---|---|:---:|---:|---|---|---|
| **SEC-01** | Cookie de session `HttpOnly` et `SameSite=Lax` (`Secure` en production) ; détail des erreurs affiché seulement en dev (`APP_ENV`) | M | 1 h | — | Thomas | S1 |
| **SEC-02** | Limiter les tentatives de connexion (par exemple 5 échecs → 15 minutes de blocage) | M | 4 h | SOC-07 | Maïlys | S3 |
| **SEC-03** | Double authentification pour les comptes admin, direction et prof : code à 6 chiffres donné par une application ; les élèves après la bêta (SEC-07, décision D4) | M | 8 h | SEC-02 | Maïlys | S5 |
| **SEC-04** | RGPD : journal des connexions gardé 12 mois puis purgé ; export et suppression des données d'un compte sur demande | M | 5 h | SOC-07 | Matthieu | S4 |
| **SEC-05** | Revue de sécurité avant la bêta : un élève ne peut pas lire les données d'un autre, fichiers, injections, réponses 401, 403 et 404 | M | 4 h | J3 | Teva | S5 |
| **SEC-06** | Bandeau cookies (décision D11) et politique de confidentialité à jour | S | 1 h | — | Matthieu | S5 |
| **SEC-07** | Étendre la double authentification aux comptes élèves (décision D4) | S | 2 h | SEC-03 | Maïlys | après J5 |

### QUA — Qualité, recette, livrables

| ID | Tâche | Prio | Charge | Dépend de | Qui | Sprint |
|---|---|:---:|---:|---|---|---|
| **QUA-01** | Tests de l'API : collection versionnée dans le dépôt (Bruno ou Postman) avec les cas connexion et droits ; chaque lot y ajoute ensuite ses routes | M | 3 h | SOC-07 | Thomas | S2 |
| **QUA-02** | Intégration continue (GitHub Actions) : build du front et `php -l` sur chaque PR | M | 3 h | INT-06 | Teva | S3 |
| **QUA-03** | Cahier de recette tiré des actions utilisateur du cahier des charges, puis séance de recette avec Mme Hamidat et M. Khedaiji | M | 4 h | J3 | Matthieu | S5 |
| **QUA-04** | Accessibilité : libellés des champs, contrastes de la charte, navigation au clavier, textes en français sur la page de connexion | S | 4 h | — | Teva | S6 |
| **QUA-05** | Support de présentation et scénario de démonstration (chaque poste fournit sa partie) | M | 6 h | J4 | Matthieu | S6 |
| **QUA-06** | README final, partie développement | M | 2 h | J4 | Maïlys | S6 |

### VSC — Vie scolaire (bonus)

Hors périmètre de la bêta, mais déjà construite : on la garde, sans y retravailler avant J3 (décision D3).

| ID | Tâche | Prio | Charge | Dépend de | Qui | Sprint |
|---|---|:---:|---:|---|---|---|
| **VSC-01** | Vie scolaire, en bonus après J3 (décision D3) : routes admin des absences (`GET /admin/absences?date=`, saisie, justification) et pages Vie scolaire élève et admin branchées sur l'API, à partir de la version de `2Front-VieScolaire/Louis` | C | 6 h | J3, INT-03 | Louis | S6 |

### PM — Gestion de projet

| ID | Tâche | Prio | Charge | Dépend de | Qui | Sprint |
|---|---|:---:|---:|---|---|---|
| **PM-01** | Points hebdomadaires, revues et planifications de sprint, tableau de suivi à jour, comptes rendus, lien avec l'équipe SISR et la commanditaire | M | 12 h | — | Matthieu | S1–S6 |

### INF — Infrastructure (équipe SISR)

Ces tâches reviennent à l'équipe SISR. Elles figurent ici parce que la bêta en dépend (jalon J4). Elles ne sont pas comptées dans la charge de l'équipe SLAM.

| ID | Tâche | Prio | Charge | Dépend de | Qui | Sprint |
|---|---|:---:|---:|---|---|---|
| **INF-01** | Compose de production : ni port 5432 ni Adminer ouverts, healthcheck avec `DB_USER`, secrets dans `.env` | M | 3 h | INT-01 | SISR | S2 |
| **INF-02** | Nginx en reverse proxy HTTPS, domaine Iris-Space.fr, redirection HTTP → HTTPS, en-têtes de sécurité | M | 6 h | INF-01 | SISR | S3 |
| **INF-03** | Déploiement sur le serveur interne de l'école et procédure écrite | M | 8 h | INF-02 | SISR | S4 |
| **INF-04** | Sauvegardes automatiques de la base (quotidiennes, gardées 30 jours) et essai de restauration | M | 4 h | INF-03 | SISR | S4 |
| **INF-05** | Pare-feu, mises à jour, accès administrateur restreints | M | 2 h | INF-03 | SISR | S5 |
| **INF-06** | Partie infrastructure du README | M | 3 h | INF-03 | SISR | S5 |
| **INF-07** | Passage chez un hébergeur externe si les tests sur le serveur de l'école sont concluants | C | — | J5 | SISR | après J5 |

## Charge totale par lot

| Lot | Must (h) | Should (h) | Could (h) | Total (h) |
|---|---:|---:|---:|---:|
| INT — Remise en ordre du dépôt | 17 | — | — | 17 |
| SOC — Socle d'intégration front ↔ back | 16 | — | — | 16 |
| ACC — Pages d'accueil | 5 | — | — | 5 |
| ACT — Actualités | 13 | — | — | 13 |
| MSG — Messagerie | 14 | — | 3 | 17 |
| EDT — Emploi du temps | 18 | — | — | 18 |
| DEV — Devoirs | 16 | 3 | 2 | 21 |
| NOT — Notes | 11 | — | — | 11 |
| DOC — Documents | 17 | — | — | 17 |
| CPT — Comptes, profil, classe | 18 | 11 | — | 29 |
| NTF — Notifications dans l'application | 7 | — | — | 7 |
| PWA — Application installable et hors ligne | 12 | — | — | 12 |
| SEC — Sécurité et RGPD | 22 | 1 | — | 23 |
| QUA — Qualité, recette, livrables | 18 | 4 | — | 22 |
| VSC — Vie scolaire (bonus) | — | — | 6 | 6 |
| PM — Gestion de projet | 12 | — | — | 12 |
| **Équipe SLAM, d'ici J5** | **216** | **19** | **11** | **246** |
| INF — équipe SISR (hors INF-07) | 26 | — | — | 26 |

Prévu après la bêta, hors de ce total : PWA-04, PWA-05, SEC-07 (14 h), et INF-07 pour l'équipe SISR.

## Décisions prises

Tranchées le 27/11/2026 par Thomas, chef d'équipe SLAM.

| # | Sujet | Décision | Effet sur le plan |
|---|---|---|---|
| D1 | Composition de l'équipe | Les 5 développeurs SLAM du cahier des charges : Matthieu, Maïlys, Louis, Thomas, Teva. L'équipe SISR garde l'infrastructure. | Cinq postes ([04](04-repartition-des-taches.md)) |
| — | Temps disponible | Environ 6 h par personne et par semaine, soit 12 h par sprint | Aucun sprint ne dépasse 12 h par personne |
| D3 | Vie scolaire (absences, retards) | Gardée en bonus ; on n'y retravaille pas avant la fin des Must (J3) | INT-03 intègre la branche telle quelle ; VSC-01 en Could au sprint 6 |
| D4 | Double authentification | Admin, direction et profs dans la bêta ; élèves ensuite | SEC-03 au sprint 5 ; SEC-07 après la bêta |
| D5 | Notifications | Dans l'application pour la bêta ; push sur téléphone ensuite | Lot NTF au sprint 4 ; PWA-04 et PWA-05 après la bêta |
| D7 | Dépôt de documents par l'élève | En rendant un devoir, plus un espace « Mes documents » | DOC-04 passe de 3 à 5 h |

D4 et D5 s'écartent du cahier des charges, qui prévoit la double authentification pour tous et le push dans la bêta. À présenter à Mme Hamidat et M. Khedaiji au prochain point, avec la raison : tenir la date de la bêta.

## Décisions à prendre

| # | Décision | Pourquoi c'est à trancher | Proposition | Qui décide | Avant |
|---|---|---|---|---|---|
| D2 | Date de l'oral ou de la livraison | Le cahier des charges dit « l'oral de juillet », une phrase qui date de mai 2026 | Bêta prête le 05/03/2027, puis marge jusqu'à l'oral | Matthieu avec M. Khedaiji | S1 |
| D6 | Mini-site MediaSchool | Absent du cahier des charges | Le laisser tel quel, sans y travailler | Mme Hamidat | J4 |
| D8 | Page Notes : version de Mehdi ou de Louis | Deux pages faites en parallèle | Garder la plus complète (celle de Louis, déjà sur `services/`) et y reprendre les bonnes idées de l'autre | Louis et Mehdi | S1 |
| D9 | Actualités : statut « Archivé » et auteur | Le front a un statut « Archivé » et un auteur en texte libre ; la base a `publique`, `publie_at` et `auteur_id` | Auteur = compte connecté. « Archivé » retiré pour la bêta : un article est soit en brouillon, soit publié. | Matthieu | S1 |
| D10 | Messagerie : qui peut écrire à qui | Change les contrôles côté back | Élève ↔ profs et administration ; prof et administration ↔ tout le monde ; pas d'élève ↔ élève dans la bêta (le cahier des charges reproche à Discord son manque de contrôle) | Mme Hamidat | S2 |
| D11 | Bandeau cookies | Le cahier des charges le prévoit, mais le site n'utilise qu'un cookie de session, qui n'a pas besoin de consentement | Pas de bandeau ; l'expliquer dans la politique de confidentialité | Matthieu | S5 |

## Après la bêta

- Notifications push (PWA-04, PWA-05) et double authentification des élèves (SEC-07), d'après les décisions D4 et D5.
- Hors périmètre du cahier des charges : trombinoscope, FAQ, commentaires sur les articles, import automatique de données, connexion unique (SSO) avec l'annuaire de l'école.
- Passage chez un hébergeur externe si les tests sur le serveur de l'école sont concluants (INF-07).
- Tâches Should et Could non terminées à J5.
