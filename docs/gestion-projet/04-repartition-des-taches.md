# 04 — Répartition des tâches

## Le principe : une fonctionnalité, une personne, de la route à la page

Jusqu'ici, le front et le back ont été écrits par des personnes différentes, chacune avec sa propre liste de routes. Résultat : rien ne s'emboîte, pas même la connexion ([02](02-reste-a-faire.md#écarts-entre-les-appels-du-front-et-les-routes-du-back)). C'est exactement le piège décrit dans le cours 2 : une personne fait l'interface, une autre la logique, et à l'intégration les données ne correspondent pas.

Ici, chaque poste porte donc des fonctionnalités entières : la route PHP, le service front, la page, les tests. Le contrat commun reste `backend/ROUTES.md` : toute nouvelle route y est décrite avant d'être codée.

L'équipe de cinq est confirmée (décision D1). Chaque poste a été attribué d'après ce que la personne a déjà fait dans le dépôt ([01](01-etat-des-lieux.md#qui-a-fait-quoi-daprès-git)) : à valider avec chacun au premier point hebdomadaire.

## Les postes

| Poste | Personne | Périmètre | Déjà fait dans le dépôt | Must | Should / Could | Total d'ici J5 | Après la bêta |
|---|---|---|---|---:|---:|---:|---:|
| P1 | Thomas | Socle, intégration, documents, PWA | Passage à React ; toute l'API Slim de la branche `backend` et `ROUTES.md` | 47 h | — | 47 h | 5 h |
| P2 | Maïlys | Messagerie, authentification, données de démo | Intégration du back, routes bonus (mot de passe, notifications…), remise à zéro de la base, Adminer | 44 h | 3 h | 47 h | 9 h |
| P3 | Louis | Pédagogie : devoirs, notes, ressources, classe | Accueil et navbar élève, Notes, Vie scolaire, Actualités, Documents, photo de profil | 39 h | 13 h | 52 h | — |
| P4 | Teva | Organisation : emploi du temps, accueil, comptes | Emploi du temps (Gestion, Consultation, droits par profil), pages légales | 44 h | 9 h | 53 h | — |
| P5 | Matthieu | Chef de projet, actualités, visiteur, RGPD, recette | Chef de projet ; pages de la version HTML, Contact et À propos | 42 h | 5 h | 47 h | — |

Les heures de relecture des PR, de réunion (hors chef de projet) et de correction de bugs ne sont pas comptées : c'est pour elles que chaque sprint garde de la marge.

## Charge par sprint

En heures, toutes priorités confondues, sans les tâches prévues après la bêta. Repère : environ 12 h disponibles par personne et par sprint (6 h par semaine).

| Personne | S1 (30/11) | S2 (14/12) | S3 (11/01) | S4 (25/01) | S5 (08/02) | S6 (22/02) | Total |
|---|---:|---:|---:|---:|---:|---:|---:|
| P1 — Thomas | 12 | 8 | 10 | 10 | 6 | 1 | 47 |
| P2 — Maïlys | 9 | 9 | 9 | 7 | 8 | 5 | 47 |
| P3 — Louis | 11 | 11 | 8 | 9 | 5 | 8 | 52 |
| P4 — Teva | 7 | 11 | 11 | 11 | 9 | 4 | 53 |
| P5 — Matthieu | 5 | 8 | 8 | 7 | 11 | 8 | 47 |
| **Équipe SLAM** | **44** | **47** | **46** | **44** | **39** | **26** | **246** |
| Équipe SISR (pour info) | — | 3 | 6 | 12 | 5 | — | 26 |

## Fiches individuelles

### P1 — Thomas : socle, intégration, documents, PWA

Chef d'équipe SLAM. Garde le contrat d'API (`ROUTES.md`), relit les PR qui touchent au socle (connexion, droits, `services/api.js`, `routes/helpers.php`), fusionne `develop` dans `main` à chaque jalon et accompagne le déploiement avec l'équipe SISR.

| Sprint | ID | Tâche | Prio | Charge | Dépend de |
|---|---|---|:---:|---:|---|
| S1 | **INT-01** | Fusionner `backend` dans `main` : 4 fichiers en conflit (`.gitignore`, `README.md`, `docker-compose.yml`, `frontend/nginx.conf`) | M | 3 h | — |
| S1 | **INT-05** | Un seul contrat d'API : `backend/ROUTES.md` fait foi ; y reporter la table « Routes attendues par le front » du README | M | 2 h | INT-01 |
| S1 | **SOC-02** | Le back renvoie `droits` (déduits du rôle, mêmes codes que `mocks/users.js`) dans `/auth/login` et `/auth/me` | M | 2 h | — |
| S1 | **SOC-03** | Connexion côté front : envoyer `mot_de_passe`, lire la réponse `{ user }`, restaurer la session avec `GET /auth/me` au chargement, revenir à la connexion sur une réponse 401 | M | 3 h | SOC-02 |
| S1 | **SOC-07** | Vérifier le socle : admin, prof et élève se connectent avec `VITE_USE_MOCKS=false` et voient leur menu | M | 1 h | SOC-01 à SOC-06 |
| S1 | **SEC-01** | Cookie de session `HttpOnly` et `SameSite=Lax` (`Secure` en production) ; détail des erreurs affiché seulement en dev (`APP_ENV`) | M | 1 h | — |
| S2 | **DOC-01** | Back : `POST /uploads` (renvoie l'adresse du fichier) et `GET /documents/{id}/telecharger` avec vérification des droits | M | 5 h | SOC-07 |
| S2 | **QUA-01** | Tests de l'API : collection versionnée dans le dépôt (Bruno ou Postman) avec les cas connexion et droits ; chaque lot y ajoute ensuite ses routes | M | 3 h | SOC-07 |
| S3 | **DOC-02** | Front admin : page Documents branchée sur `/admin/espaces` (le front appelle aujourd'hui `/espaces`) | M | 3 h | DOC-01 |
| S3 | **DOC-04** | Élève : voir ses documents (`/eleve/documents`) et un espace « Mes documents » pour en déposer et en supprimer (routes `POST` et `DELETE /eleve/documents` à ajouter) ; les rendus de devoirs passent par DEV-02 (décision D7) | M | 5 h | DOC-01 |
| S3 | **CPT-07** | Page Profil selon le rôle : le prof et l'admin voient leurs propres informations (aujourd'hui la page affiche le profil d'un élève pour tout le monde) | M | 2 h | SOC-03 |
| S4 | **PWA-01** | Manifest (nom, icônes, couleurs de la charte) : l'application devient installable | M | 2 h | — |
| S4 | **PWA-02** | Service worker : l'application s'ouvre hors ligne ; actualités et devoirs restent consultables hors ligne (cahier des charges) | M | 6 h | ACT-03, DEV-02 |
| S4 | **PWA-03** | Bandeau « hors ligne » et invitation à installer l'application | M | 2 h | PWA-01 |
| S5 | **INT-07** | Appui au déploiement de la bêta avec l'équipe SISR : variables d'environnement de production, build du front, création de la base, essai complet sur le serveur | M | 4 h | INF-03 |
| S5 | **PWA-06** | Essais sur Android, iPhone (Safari) et ordinateur, en HTTPS | M | 2 h | PWA-02, INF-02 |
| S6 | **INT-08** | Fusionner `develop` dans `main` et étiqueter la version `v1.0.0-beta` (jalon J5) | M | 1 h | QUA-03 |
| après J5 | **PWA-05** | Notifications push, côté front : demande d'autorisation, réception dans le service worker (après la bêta, décision D5) | S | 5 h | PWA-04 |

Total d'ici J5 : **47 h** de Must ; après la bêta : 5 h.

### P2 — Maïlys : messagerie, authentification, données de démo

Point de contact pour la base de données (schéma, données de démo, Adminer) et pour tout ce qui touche à l'authentification.

| Sprint | ID | Tâche | Prio | Charge | Dépend de |
|---|---|---|:---:|---:|---|
| S1 | **INT-04** | README : retirer les marqueurs de conflit (`<<<<<<<`), une seule procédure de lancement, avec et sans Docker | M | 2 h | INT-01 |
| S1 | **SOC-01** | Données de démo `backend/database/seed_demo.sql` : comptes admin, prof et élève (mots de passe hachés), année scolaire courante, campus, classes, matières, liens prof ↔ matière et classe ↔ matière, quelques cours, devoirs, notes et actualités. Sortir le `DROP SCHEMA` de `init_database.sql` dans un script de remise à zéro réservé au dev | M | 6 h | — |
| S1 | **SOC-06** | Activer le relais `/api` de `frontend/nginx.conf` vers `api:80` (le port 3000 n'existe qu'à l'extérieur de Docker) et vérifier `docker compose up` de bout en bout | M | 1 h | INT-01 |
| S2 | **MSG-01** | Back : conversations (liste avec dernier message et non-lus, création), messages (fil, envoi), marquer comme lu, `GET /messages/non-lus`, `GET /utilisateurs?recherche=` | M | 8 h | SOC-07, MSG-02 |
| S2 | **MSG-02** | Écrire qui peut écrire à qui (décision D10) et le faire valider | M | 1 h | — |
| S3 | **MSG-03** | Front : brancher `Messages.jsx`, nouvelle conversation avec recherche, pastille des non-lus, rafraîchissement toutes les 30 s | M | 5 h | MSG-01 |
| S3 | **SEC-02** | Limiter les tentatives de connexion (par exemple 5 échecs → 15 minutes de blocage) | M | 4 h | SOC-07 |
| S4 | **CPT-06** | Mot de passe : le changer depuis le profil, pages « mot de passe oublié » (routes codées), envoi de l'e-mail par SMTP (aujourd'hui `mail()` sans serveur d'envoi) | M | 3 h | SOC-07 |
| S4 | **NTF-01** | Notifications dans l'application, côté back : créer une notification en base à chaque nouveau message, nouvelle note, nouveau devoir et cours annulé ou déplacé, avec une fonction commune ; les routes de lecture existent déjà (décision D5) | M | 4 h | MSG-01, EDT-01 |
| S5 | **SEC-03** | Double authentification pour les comptes admin, direction et prof : code à 6 chiffres donné par une application ; les élèves après la bêta (SEC-07, décision D4) | M | 8 h | SEC-02 |
| S6 | **MSG-04** | Pièces jointes dans les messages (table `message_piece_jointe` déjà prête) | C | 3 h | MSG-03, DOC-01 |
| S6 | **QUA-06** | README final, partie développement | M | 2 h | J4 |
| après J5 | **PWA-04** | Notifications push, côté back : abonnements en base, envoi sur nouveau message, nouvelle note, nouveau devoir, cours modifié (après la bêta, décision D5) | S | 7 h | PWA-02, NTF-01 |
| après J5 | **SEC-07** | Étendre la double authentification aux comptes élèves (décision D4) | S | 2 h | SEC-03 |

Total d'ici J5 : **44 h** de Must, plus 3 h de Should et Could ; après la bêta : 9 h.

### P3 — Louis : pédagogie (devoirs, notes, ressources, classe)

Porte tout l'espace prof, qui est aujourd'hui le plus en retard, et les pages élève qui y répondent.

| Sprint | ID | Tâche | Prio | Charge | Dépend de |
|---|---|---|:---:|---:|---|
| S1 | **INT-02** | Fusionner `front-eleve+navbar/louis` dans `main` en gardant une seule page Notes (décision D8) | M | 2 h | D8 |
| S1 | **INT-03** | Intégrer `2Front-VieScolaire/Louis` telle quelle (vie scolaire gardée en bonus, décision D3) : elle se fusionne sans conflit après INT-02 | M | 1 h | INT-02 |
| S1 | **DEV-01** | Service front `services/devoirs.js` (mocks et API, élève et prof) et vérification des routes déjà codées | M | 2 h | — |
| S1 | **DEV-02** | Page Devoirs élève : à faire, fait, rendu, corrigé ; marquer comme fait ; rendre en ligne avec fichiers | M | 6 h | DEV-01 |
| S2 | **DEV-03** | Page Devoirs prof : liste, création (classe, matière, type, échéance, consigne), modification, suppression, suivi des rendus | M | 8 h | DEV-01 |
| S2 | **NOT-01** | Notes élève branchées sur `/eleve/notes`, moyennes par matière sur `/eleve/moyennes` | M | 3 h | INT-02, SOC-07 |
| S3 | **NOT-02** | Notes côté prof : créer une évaluation (classe, matière, barème, coefficient, date) et saisir les notes de la classe dans une grille | M | 8 h | DEV-01 |
| S4 | **DOC-03** | Front prof : déposer et lister ses ressources de cours (`/prof/ressources`, routes déjà codées) | M | 4 h | DOC-01 |
| S4 | **CPT-03** | « Voir la classe » : liste des élèves d'une classe pour l'élève (route à créer), le prof (route codée) et l'admin | M | 5 h | SOC-07 |
| S5 | **DEV-05** | Pièces jointes du prof sur un devoir : route `POST /prof/devoirs/{id}/fichiers` à ajouter (la table `devoir_fichier` existe déjà) et envoi depuis la page Devoirs prof | S | 3 h | DEV-03, DOC-01 |
| S5 | **CPT-05** | Photo de profil enregistrée par le back (aujourd'hui en base64 dans le localStorage) | S | 2 h | DOC-01 |
| S6 | **DEV-04** | Correction d'un devoir rendu : note et appréciation (route déjà codée dans `prof_bonus.php`) | C | 2 h | DEV-03 |
| S6 | **VSC-01** | Vie scolaire, en bonus après J3 (décision D3) : routes admin des absences (`GET /admin/absences?date=`, saisie, justification) et pages Vie scolaire élève et admin branchées sur l'API, à partir de la version de `2Front-VieScolaire/Louis` | C | 6 h | J3, INT-03 |

Total d'ici J5 : **39 h** de Must, plus 13 h de Should et Could.

### P4 — Teva : organisation (emploi du temps, accueil, comptes)

Point de contact pour l'emploi du temps et les comptes. Met en place l'intégration continue, fait la revue de sécurité avec un regard extérieur au code du socle, et la passe d'accessibilité.

| Sprint | ID | Tâche | Prio | Charge | Dépend de |
|---|---|---|:---:|---:|---|
| S1 | **SOC-04** | `services/api.js` : afficher le message `{ error }` du back, ajouter `patch` et l'envoi de fichiers (`FormData`) | M | 2 h | — |
| S1 | **SOC-05** | Aligner les mocks sur le back : rôles `administrateur`, `direction`, `professeur`, `eleve` et format des réponses | M | 1 h | INT-05 |
| S1 | **EDT-03** | Front Consultation (élève, prof) et bloc « Ma journée » : appeler `?du=&au=` au lieu de `?date=`, et `/prof/emploi-du-temps` quand c'est un prof | M | 4 h | — |
| S2 | **ACC-01** | Accueil : remplacer `/eleve/raccourcis`, qui n'existe pas, par les routes existantes ; élève : devoirs à faire, dernières ressources, dernières notes ; prof : ses prochains devoirs et évaluations (aujourd'hui l'accueil du prof lit les données élève) | M | 3 h | SOC-07 |
| S2 | **EDT-01** | Back admin : classes, salles, matières et profs (pour les menus), cours d'une semaine, création, modification, suppression ; un chevauchement renvoie 409 au lieu de 500 (erreur `23P01`) | M | 8 h | SOC-07 |
| S3 | **ACC-02** | Tableau de bord admin : « Cours aujourd'hui » via `/admin/cours` ; le bloc « Absences aujourd'hui » reste sur les mocks jusqu'à VSC-01 (vie scolaire en bonus, décision D3) | M | 2 h | EDT-01 |
| S3 | **EDT-02** | Front Gestion : matière et intervenant en menus (id), création de classe et de salle avec année et campus, message clair en cas de chevauchement | M | 6 h | EDT-01 |
| S3 | **QUA-02** | Intégration continue (GitHub Actions) : build du front et `php -l` sur chaque PR | M | 3 h | INT-06 |
| S4 | **CPT-01** | Page admin « Comptes » : liste par rôle, création, modification (dont la classe d'un élève), désactivation (routes déjà codées) | M | 8 h | EDT-01 |
| S4 | **NTF-02** | Notifications dans l'application, côté front : cloche dans la navbar avec le nombre de non-lues, liste, marquer comme lue, tout marquer comme lu | M | 3 h | SOC-07 |
| S5 | **CPT-02** | Page admin « Programme » : matières, matières d'un prof, matières et coefficients d'une classe (routes déjà codées) | S | 5 h | CPT-01 |
| S5 | **SEC-05** | Revue de sécurité avant la bêta : un élève ne peut pas lire les données d'un autre, fichiers, injections, réponses 401, 403 et 404 | M | 4 h | J3 |
| S6 | **QUA-04** | Accessibilité : libellés des champs, contrastes de la charte, navigation au clavier, textes en français sur la page de connexion | S | 4 h | — |

Total d'ici J5 : **44 h** de Must, plus 9 h de Should et Could.

### P5 — Matthieu : chef de projet, actualités, visiteur, RGPD, recette

Anime les points et les revues, tient le tableau de suivi, fait le lien avec l'équipe SISR, Mme Hamidat et M. Khedaiji. Garde une part de code plus petite que les autres postes.

| Sprint | ID | Tâche | Prio | Charge | Dépend de |
|---|---|---|:---:|---:|---|
| S1 | **INT-06** | Sortir `backend/vendor/` de Git, supprimer les branches déjà fusionnées, créer `develop`, protéger `main` et `develop` (PR et une relecture obligatoires) | M | 2 h | INT-01, INT-02 |
| S1 | **ACT-02** | Trancher les écarts avec la base (décision D9) : statut « Archivé », auteur en texte libre au lieu de `auteur_id` | M | 1 h | — |
| S2 | **ACT-01** | Back : `GET /actualites/publiques`, `GET /actualites?limit=`, création, modification et suppression (admin et direction ; un prof pour ses propres articles) | M | 6 h | SOC-07, ACT-02 |
| S3 | **ACT-03** | Front : brancher `services/actualites.js` (page Actualité, accueil, page visiteur) et donner le droit `actualites_gerer` aux profs | M | 3 h | ACT-01 |
| S3 | **ACT-04** | Envoyer l'image d'une actualité par `POST /uploads` au lieu de la garder en base64 dans le localStorage | M | 2 h | DOC-01, ACT-03 |
| S3 | **ACT-05** | Brancher le formulaire Contact (visiteur) sur `POST /contact` | M | 1 h | SOC-07 |
| S4 | **SEC-04** | RGPD : journal des connexions gardé 12 mois puis purgé ; export et suppression des données d'un compte sur demande | M | 5 h | SOC-07 |
| S5 | **CPT-04** | L'élève modifie ses informations : `PATCH /eleve/profil` et formulaire dans la page Profil | S | 4 h | SOC-07 |
| S5 | **SEC-06** | Bandeau cookies (décision D11) et politique de confidentialité à jour | S | 1 h | — |
| S5 | **QUA-03** | Cahier de recette tiré des actions utilisateur du cahier des charges, puis séance de recette avec Mme Hamidat et M. Khedaiji | M | 4 h | J3 |
| S6 | **QUA-05** | Support de présentation et scénario de démonstration (chaque poste fournit sa partie) | M | 6 h | J4 |
| S1–S6 | **PM-01** | Points hebdomadaires, revues et planifications de sprint, tableau de suivi à jour, comptes rendus, lien avec l'équipe SISR et la commanditaire | M | 12 h | — |

Total d'ici J5 : **42 h** de Must, plus 5 h de Should et Could.

## Équipe SISR

Chef d'équipe : Mehdi Ennar, avec Mehdi Seghier et Safwen Lachhab. Côté SLAM, le contact technique est Thomas (P1) ; le contact planning est Matthieu (P5).

| Sprint | ID | Tâche | Prio | Charge | Dépend de |
|---|---|---|:---:|---:|---|
| S2 | **INF-01** | Compose de production : ni port 5432 ni Adminer ouverts, healthcheck avec `DB_USER`, secrets dans `.env` | M | 3 h | INT-01 |
| S3 | **INF-02** | Nginx en reverse proxy HTTPS, domaine Iris-Space.fr, redirection HTTP → HTTPS, en-têtes de sécurité | M | 6 h | INF-01 |
| S4 | **INF-03** | Déploiement sur le serveur interne de l'école et procédure écrite | M | 8 h | INF-02 |
| S4 | **INF-04** | Sauvegardes automatiques de la base (quotidiennes, gardées 30 jours) et essai de restauration | M | 4 h | INF-03 |
| S5 | **INF-05** | Pare-feu, mises à jour, accès administrateur restreints | M | 2 h | INF-03 |
| S5 | **INF-06** | Partie infrastructure du README | M | 3 h | INF-03 |
| après J5 | **INF-07** | Passage chez un hébergeur externe si les tests sur le serveur de l'école sont concluants | C | — | J5 |

Total d'ici J5 : **26 h** de Must.

## Matrice RACI

R = réalise · A = valide (une seule personne par ligne) · C = consulté avant · I = informé après.

| Lot | Thomas | Maïlys | Louis | Teva | Matthieu | Équipe SISR | Mme Hamidat, M. Khedaiji |
|---|---|---|---|---|---|---|---|
| INT — Remise en ordre | R/A | R | R | I | R | C | — |
| SOC — Socle | R/A | R | I | R | I | C | — |
| ACC — Accueil | A | I | C | R | I | — | — |
| ACT — Actualités | A | I | I | I | R | — | C |
| MSG — Messagerie | A | R | I | I | C | — | C |
| EDT — Emploi du temps | A | I | C | R | I | — | I |
| DEV — Devoirs | A | I | R | I | I | — | C |
| NOT — Notes | A | I | R | I | I | — | C |
| DOC — Documents | R | I | R | I | A | — | C |
| CPT — Comptes, profil, classe | A | R | R | R | R | — | I |
| NTF — Notifications | A | R | I | R | I | — | I |
| PWA | R | R | I | I | A | C | I |
| SEC — Sécurité et RGPD | R | R | I | R | A | C | C |
| QUA — Qualité, recette, livrables | R | R | I | R | R/A | C | C |
| VSC — Vie scolaire (bonus) | A | I | R | I | C | — | C |
| PM — Gestion de projet | I | I | I | I | R/A | I | I |
| INF — Infrastructure | C | C | — | — | I | R/A | — |

## Variante à 4 personnes

L'équipe compte cinq personnes (D1). Cette variante sert si l'une d'elles doit s'arrêter longtemps. Exemple : Matthieu se consacre entièrement à la gestion de projet. Il garde l'animation, la recette, le support de présentation et les décisions, et ses tâches de code passent aux autres postes :

| ID | Tâche | Prio | Charge | Passe à |
|---|---|:---:|---:|---|
| **ACT-01** | Routes actualités | M | 6 h | Maïlys |
| **ACT-03** | Actualités branchées | M | 3 h | Teva |
| **ACT-04** | Image d'actualité | M | 2 h | Louis |
| **ACT-05** | Formulaire Contact | M | 1 h | Teva |
| **SEC-04** | RGPD | M | 5 h | Thomas |
| **CPT-04** | Profil modifiable | S | 4 h | reportée après la bêta |

Charge Must par personne :

| Personne | Must à 5 | Must à 4 |
|---|---:|---:|
| P1 — Thomas | 47 h | 52 h |
| P2 — Maïlys | 44 h | 50 h |
| P3 — Louis | 39 h | 41 h |
| P4 — Teva | 44 h | 48 h |
| P5 — Matthieu | 42 h | 25 h |

Les sprints sont déjà proches des 12 h disponibles : ces heures en plus ne tiennent pas dans le calendrier. Il faut ajouter un sprint S7 (08/03 → 19/03/2027) : J3, J4 et J5 glissent de deux semaines, et les actualités arrivent après J2.

Si c'est une autre personne qui manque, même règle : ses tâches Must vont aux postes les moins chargés du sprint concerné, ses tâches Should et Could passent après la bêta, et on ajoute un sprint.

## Règles de travail

### Branches et PR

- `main` contient la version de démonstration ; on y fusionne `develop` à chaque jalon. `develop` est la branche d'intégration. Les deux sont protégées : personne ne pousse dessus directement (règle déjà écrite dans l'analyse des risques du cahier des charges).
- Une branche par tâche, créée depuis `develop` : `feat/MSG-01-conversations`, `fix/EDT-02-chevauchement`.
- Une PR par tâche vers `develop`, avec l'identifiant dans le titre et une section « Comment tester ». Elle est relue par une autre personne. Les PR qui touchent au socle sont relues par Thomas.

### Définition de « terminé »

Une tâche passe en « Terminé » seulement quand :
1. la PR est relue et fusionnée dans `develop` ;
2. la fonctionnalité marche avec la vraie API (`VITE_USE_MOCKS=false`) dans `docker compose up`, avec les comptes de démo ;
3. les nouvelles routes sont décrites dans `ROUTES.md` et ont leurs cas dans la collection de tests (QUA-01) ;
4. l'intégration continue est verte (à partir de QUA-02).

Pour les livrables, le cahier des charges ajoute : testé par un chef d'équipe et par le chef de projet ou le professeur référent, sans bug bloquant, conforme au périmètre de la bêta.

### Tableau de suivi

Quatre colonnes (cours 2) : À faire → En cours → À valider (PR ouverte, en relecture ou en test) → Terminé. Une carte par tâche, avec son identifiant, son responsable et sa charge ; un blocage se signale sur la carte avec sa cause. [taches.csv](taches.csv) contient toutes les tâches, prêtes à importer dans Notion, GitHub Projects ou un tableur.
