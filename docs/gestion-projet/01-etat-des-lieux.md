# 01 — Ce qui est fait

État au 27/11/2026. Sources : le cahier des charges v1 (Google Doc « PROJET COMMUN - IRIS-SPACE », 19/10/2026), les branches `origin/main`, `origin/backend`, `origin/front-eleve+navbar/louis` et `origin/2Front-VieScolaire/Louis`, et `backend/ROUTES.md`.

## En résumé

| Domaine | Où on en est | Ce qui manque surtout |
|---|---|---|
| Écrans du front (MVP du cahier des charges) | 18 écrans sur 28, avec des données fictives (détail par profil plus bas) | espace prof (devoirs, saisie des notes, ressources), Devoirs côté élève, Comptes côté admin, « Voir la classe » |
| API du back | 57 routes codées ; 29 routes prévues dans `ROUTES.md` restent à faire | actualités, messagerie, emploi du temps côté admin, envoi et téléchargement de fichiers |
| Liaison front ↔ back | aucune page branchée sur l'API | même contrat d'API des deux côtés, droits renvoyés par le back, données de démo |
| PWA | rien | manifest, service worker, mode hors ligne |
| Infrastructure | Docker Compose en local | HTTPS, serveur de l'école, nom de domaine, sauvegardes |
| Sécurité | mots de passe hachés (bcrypt), requêtes préparées, rôle vérifié sur chaque route | limite des tentatives de connexion, double authentification, réglages du cookie de session |
| Gestion du code | trois branches de travail | rien n'est entré dans `main` depuis le 21/10/2026 |

> Ces chiffres comptent des écrans et des routes, pas des heures de travail. Certains écrans qui manquent sont longs à faire (saisie des notes, devoirs côté prof) et certaines routes manquantes sont complexes (messagerie).

## Par fonctionnalité du cahier des charges

✅ fait · 🟡 en partie · ❌ à faire · — sans objet. « Branché » veut dire que l'écran utilise la vraie API au lieu des mocks.

| Fonctionnalité | Priorité (cahier des charges) | Écrans (front, données fictives) | API (back) | Branché | Remarques |
|---|---|---|---|---|---|
| Se connecter | Must | ✅ page de connexion | ✅ `login`, `logout`, `me` | ❌ | Le front envoie `motDePasse`, le back attend `mot_de_passe`. Le back ne renvoie pas les `droits` dont le front se sert pour ses menus. |
| Voir les articles (actualités) | Must pour les 4 profils | ✅ page Actualité, bloc de l'accueil, page visiteur | ❌ | ❌ | La table `actualite` est prête en base. |
| Créer et modifier des articles | Must admin et prof, Should élève | 🟡 admin seulement | ❌ | ❌ | Le prof n'a pas le droit `actualites_gerer`, alors que le cahier des charges lui donne cette action. |
| Communiquer (messagerie) | Must admin, prof, élève | ✅ page Messages, pastille des non-lus | ❌ | ❌ | Tables `conversation`, `message`… prêtes en base. |
| Voir l'emploi du temps | Must admin, prof, élève | ✅ vue Consultation, bloc « Ma journée » | 🟡 élève et prof ✅, admin ❌ | ❌ | Le front envoie `?date=`, le back attend `?du=&au=`. |
| Modifier l'emploi du temps | Must admin, Could prof | ✅ vue Gestion (enregistrée dans le localStorage) | ❌ | ❌ | Matière et intervenant sont du texte libre côté front, des id côté base. |
| Devoirs maison | dans le périmètre bêta | ❌ page vide pour l'élève et le prof | ✅ prof (créer, modifier, supprimer, suivi) et élève (liste, « fait », rendu avec fichiers) | ❌ | Le prof ne peut pas encore joindre de fichier à un devoir : la table `devoir_fichier` existe, pas la route. |
| Notes | dans le périmètre bêta | 🟡 élève ✅ (en deux versions), prof ❌ | ✅ prof (évaluations, saisie de la classe) et élève (notes, moyennes) | ❌ | Deux pages Notes faites en parallèle : Mehdi (sur `main`) et Louis (sur sa branche). |
| Accéder aux documents | Must prof et élève, Should admin | ✅ page Documents (fichiers de démonstration) | ✅ admin (espaces), élève (`/eleve/documents`), prof (ressources) | ❌ | Aucune route ne permet encore de télécharger un fichier. |
| Déposer des documents | Must admin, prof, élève | 🟡 admin ✅, prof et élève ❌ | 🟡 admin ✅, prof (ressources) ✅, élève (rendu de devoir) ✅, envoi de fichier générique ❌ | ❌ | |
| Profil | dans le périmètre bêta | 🟡 élève ✅ avec photo (gardée dans le localStorage) ; le prof et l'admin voient le profil d'un élève | 🟡 lecture côté élève ✅, modification ❌ | ❌ | La page lit `getProfil` du service élève pour tout le monde. |
| Voir la classe | Must admin, prof, élève | ❌ | 🟡 prof ✅ (`/prof/classes/{id}/eleves`) | ❌ | |
| Modifier les informations d'un élève | Must admin, Should élève | ❌ pas de page Comptes | ✅ admin (`/admin/utilisateurs`) | ❌ | |
| PWA (installable, hors ligne) | dans le périmètre bêta | ❌ | — | — | Ni manifest, ni service worker, ni dossier `public/`. |
| Notifications | push prévu par le cahier des charges | ❌ | 🟡 routes de lecture (bonus), mais rien ne crée encore de notification | ❌ | Pour la bêta : notifications dans l'application ; le push vient après ([décision D5](02-reste-a-faire.md#décisions-prises)). |
| Visiteur : à propos, contact, pages légales | — | ✅ + mentions légales, CGU, politique de confidentialité | ✅ `POST /contact` | ❌ | Le formulaire Contact affiche une confirmation sans rien envoyer. |
| Vie scolaire (absences, retards) | **hors périmètre de la bêta** | ✅ admin et élève (deux versions de la page élève) | 🟡 élève ✅ (+ justificatif en bonus), admin ❌ | ❌ | Gardée en bonus : on n'y retravaille pas avant la fin des Must ([décision D3](02-reste-a-faire.md#décisions-prises)). |
| Mini-site MediaSchool | absent du cahier des charges | ✅ 3 pages statiques | — | — | À trancher : [décision D6](02-reste-a-faire.md#décisions-à-prendre). |

## Par branche

| Branche | Dernier commit | Contenu | Par rapport à `main` |
|---|---|---|---|
| `main` | 21/10/2026 | Front React réorganisé autour des droits (Aymeric), page Notes (Mehdi), schéma SQL, Docker du front, README | — |
| `backend` | 20/11/2026 | API Slim : connexion, routes élève, prof, admin, visiteur et `ROUTES.md` (Thomas) ; routes bonus, remise à zéro de la base, Adminer (Maïlys) | 8 commits d'avance et 8 de retard ; 4 fichiers en conflit (`.gitignore`, `README.md`, `docker-compose.yml`, `frontend/nginx.conf`) |
| `front-eleve+navbar/louis` | 20/11/2026 | Accueil, navbar, Notes, Vie scolaire, Actualités, Documents, photo de profil (Louis) ; emploi du temps Gestion/Consultation et pages légales (Teva) ; Contact et À propos (Matthieu) | 11 commits d'avance ; 2 fichiers en conflit (`pages/Notes.jsx`, `mocks/eleve.js`) |
| `2Front-VieScolaire/Louis` | 13/11/2026 | Les mêmes bases, plus une page Vie scolaire complète (justification des retards) | 8 commits d'avance, dont 6 en commun avec la branche précédente ; se fusionne sans conflit par-dessus elle |
| Anciennes branches | juin–juillet 2026 | Version HTML/JS d'avant React | `Prof` (4 commits) et `Documents-eleve` (1 commit) jamais fusionnées et sans doute obsolètes ; `Aymeric`, `page-notes`, `conversion-react`, `Elève`, `Profil-élève`, `Pages-EmploisDuTemps` déjà fusionnées |

Les conflits ont été vérifiés en simulant chaque fusion dans `main` avec `git merge-tree`, sans rien modifier. Le back ne touche pas au code du front et les branches front ne touchent pas au back : les fusions sont faisables avec peu de conflits (lot INT dans [02](02-reste-a-faire.md)).

## Back-end

**Technique** : PHP 8 avec Slim 4, PostgreSQL 17, sessions PHP, conteneur `php:8.5-apache`.

**Organisation** : `public/index.php` déclare les groupes `/api`, `/api/admin`, `/api/eleve` et `/api/prof`, chacun protégé par `requireRole()` (401 si personne n'est connecté, 403 si le rôle ne correspond pas). Un fichier de routes par espace dans `routes/`. `routes/helpers.php` regroupe la lecture et la validation des champs, les erreurs JSON et l'enregistrement des fichiers. `ROUTES.md` décrit les conventions (JSON, codes d'erreur, dates, nombres décimaux) et la liste des routes.

**Routes codées (57)**

| Domaine | Routes |
|---|---|
| Santé | `GET /api/health` |
| Connexion | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` |
| Mot de passe (bonus) | `PUT /auth/mot-de-passe`, `POST /auth/mot-de-passe-oublie`, `POST /auth/reinitialiser-mot-de-passe` |
| Admin : documents | `GET`/`POST /admin/espaces`, `PATCH`/`DELETE /admin/espaces/{id}`, `POST /admin/espaces/{id}/documents`, `DELETE /admin/documents/{id}` |
| Admin : comptes et programme | `GET`/`POST /admin/utilisateurs`, `PUT /admin/utilisateurs/{id}`, `PATCH /admin/utilisateurs/{id}/actif`, `POST /admin/matieres`, `PUT /admin/professeurs/{id}/matieres`, `PUT /admin/classes/{id}/matieres` |
| Admin : contacts et pages publiques (bonus) | `GET /admin/contacts`, `PATCH /admin/contacts/{id}`, `GET /pages/{slug}`, `PUT /admin/pages/{slug}` |
| Élève | `GET /eleve/profil`, `/eleve/emploi-du-temps`, `/eleve/notes`, `/eleve/devoirs`, `/eleve/ressources`, `/eleve/absences`, `/eleve/documents` ; `PATCH /eleve/devoirs/{id}` ; `POST /eleve/devoirs/{id}/rendu` |
| Élève (bonus) | `GET /eleve/moyennes`, `POST /eleve/absences/{id}/justificatif` |
| Prof | `GET /prof/emploi-du-temps`, `/prof/classes`, `/prof/classes/{id}/eleves` ; devoirs (`GET`, `POST`, `PUT`, `DELETE`, `GET …/suivi`) ; évaluations (`GET`, `POST`, `PUT`, `DELETE`) et leurs notes (`GET`, `PUT`) ; ressources (`GET`, `POST`, `DELETE`) |
| Prof (bonus) | `PATCH /prof/devoirs/{id}/eleves/{eleveId}` (correction d'un devoir) |
| Notifications (bonus) | `GET /notifications`, `POST /notifications/tout-lire`, `PATCH /notifications/{id}/lue` |
| Visiteur | `POST /contact` |

**Base de données** (`backend/database/init_database.sql`) : 30 tables, 5 vues, 6 types énumérés. Elle couvre aussi ce que l'API ne gère pas encore (actualités, conversations, notifications, absences, pages publiques, demandes de contact). La base refuse d'elle-même deux cours qui se chevauchent (contraintes `EXCLUDE`). Deux points à connaître :
- le script ne crée aucune donnée, donc aucun compte : la connexion répond toujours 401 tant qu'il n'y a pas de jeu de démo ;
- depuis le 20/11, il commence par `DROP SCHEMA public CASCADE`. C'est pratique pour réimporter en dev, mais il efface tout s'il est lancé sur une vraie base.

**Ce qui est déjà solide** : requêtes préparées partout, mots de passe hachés (`password_hash`, bcrypt), nouvel identifiant de session à chaque connexion, rôle contrôlé sur chaque groupe de routes, id de l'élève lu dans la session et jamais dans l'URL, fichiers rangés hors de `public/` (10 Mo maximum, extensions filtrées), erreurs toujours au même format JSON.

**Tests** : d'après `ROUTES.md`, les routes ont été testées à la main. Il n'y a ni test automatisé ni intégration continue dans le dépôt.

## Front-end

**Technique** : React 19, Vite 8, React Router 7, Tailwind CSS 4 et daisyUI 5, icônes Tabler. La charte du cahier des charges (couleurs, police Alan Sans) est appliquée.

**Organisation** (réorganisée par Aymeric le 21/10, décrite dans le README de `main`) :
- une URL par fonctionnalité, la même pour tout le monde ; ce qui s'affiche dépend des droits de la personne connectée (`can('documents_gerer')`) ;
- `SelonDroit` affiche deux vues d'une même page selon les droits, par exemple Gestion ou Consultation de l'emploi du temps (Teva) ;
- les pages ne lisent jamais les données elles-mêmes : elles passent par `services/`, qui renvoient les mocks ou appellent l'API selon `VITE_USE_MOCKS` ;
- le proxy `/api` du serveur de développement Vite est déjà en place.

**Écrans par profil** (écrans attendus par le MVP du cahier des charges : tableau de bord, messagerie, actualités, devoirs, notes, emploi du temps, profil, documents, plus comptes et classe)

| Profil | Écrans faits | Fait | Manque |
|---|---|---|---|
| Admin | 5 sur 7 | tableau de bord (cours et absences du jour), actualités avec gestion, emploi du temps (Gestion), documents avec gestion, messages | Comptes (créer, modifier, désactiver), Programme (matières, coefficients), Voir la classe ; Profil et Vie scolaire affichent pour l'instant la vue élève |
| Prof | 3 sur 9 | actualités (lecture), emploi du temps (Consultation), messages | Devoirs (page vide), saisie des notes (la page Notes affiche la vue élève), ressources et documents, créer un article, Voir la classe ; l'accueil et le Profil affichent pour l'instant des données d'élève |
| Élève | 7 sur 9 | accueil, notes, vie scolaire, actualités, emploi du temps, documents, messages, profil avec photo | Devoirs (page vide), Voir la classe, modifier ses informations |
| Visiteur | 3 sur 3 | actualités publiques, à propos, contact, mentions légales, CGU, politique de confidentialité | — |

Comptes de démonstration en mode mocks : `admin`/`admin`, `prof`/`prof`, `eleve`/`eleve`.

## Infrastructure

Sur la branche `backend`, `docker-compose.yml` lance quatre conteneurs : le front servi par nginx (port 8080), l'API PHP sous Apache (port 3000), PostgreSQL (port 5432) et Adminer (port 8081). Les données sont gardées dans le volume `db_data`, les identifiants de la base dans `.env` (modèle : `.env.example`).

Écarts avec l'architecture du cahier des charges (trois conteneurs Nginx, PHP, PostgreSQL ; base joignable seulement depuis PHP ; HTTPS) :
- le port 5432 de la base et Adminer sont ouverts vers l'extérieur ;
- le relais `/api` est encore commenté dans `frontend/nginx.conf`, et il vise le port 3000 alors que l'API écoute sur le port 80 dans le réseau Docker ;
- pas de HTTPS, pas de nom de domaine, pas de sauvegarde automatique ;
- le healthcheck de la base utilise l'utilisateur `iris` écrit en dur au lieu de `DB_USER`.

## Documents du projet

| Document | État |
|---|---|
| Cahier des charges v1 (Google Doc, 19/10/2026, modifié le 13/11) | Complet, sauf le planning qui renvoie à un Gantt sous Notion. Validation par Mme Hamidat et M. Khedaiji à confirmer. |
| `backend/ROUTES.md` (21/10) | Contrat de l'API vu du back, à jour pour le back. Écrit avant la réorganisation du front : certains points « bloquants » sont réglés sur `main` (proxy Vite). |
| README | Deux versions qui se contredisent (`main` et `backend`), dont une avec des marqueurs de conflit `<<<<<<<`. Le cahier des charges demande une partie développement et une partie infrastructure. |
| Support de présentation | Pas commencé. |

## Qui a fait quoi (d'après Git)

| Personne | Contributions principales |
|---|---|
| Thomas | Passage à React (19/10) ; API Slim : connexion à la base, routes élève, prof, admin et visiteur, `ROUTES.md` |
| Maïlys | Intégration du back (19/10), routes bonus (mot de passe, notifications, pages publiques, contacts, élève, prof), remise à zéro de la base, Adminer |
| Louis | Navbar et accueil élève, Notes, Vie scolaire, Actualités, Documents, photo de profil |
| Teva | Emploi du temps (Gestion, Consultation, droits par profil), mentions légales, CGU, politique de confidentialité |
| Matthieu | Pages de la version HTML (juin–juillet), mise en place des fichiers React, Contact et À propos ; chef de projet |
| Aymeric | Docker, réorganisation du front (droits, services, mocks) |
| Mehdi | Page Notes élève (d'après la maquette Figma) |
| Lucas | Architecture du back dans le README |
