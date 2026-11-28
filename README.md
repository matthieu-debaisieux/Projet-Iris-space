# Iris Space

Projet de classe : création et refonte du site Iris, un espace numérique pour un établissement
(élèves, professeurs, administration, direction, visiteurs).

- **frontend/** : application React (Vite, React Router, Tailwind et daisyUI).
- **backend/** : API PHP (Slim 4) et base PostgreSQL.
- Le contrat d'API entre les deux est décrit dans [`backend/ROUTES.md`](backend/ROUTES.md).

## Sommaire

1. [Prérequis](#prérequis)
2. [Lancer avec Docker](#lancer-avec-docker-front--api--base)
3. [Lancer sans Docker](#lancer-sans-docker)
4. [Variables d'environnement](#variables-denvironnement)
5. [Migrations sur une base existante](#migrations-sur-une-base-existante)
6. [Tests et intégration continue](#tests-et-intégration-continue)
7. [Organisation du code](#organisation-du-code)
8. [Règles de travail](#règles-de-travail)
9. [Contrat d'API](#contrat-dapi-unique-source-de-vérité)

## Prérequis

| Outil | Version | Pour quoi faire |
|---|---|---|
| Git | récent | récupérer le dépôt |
| Docker Desktop (avec `docker compose`) | récent | lancer front, API, base et Adminer en une commande (méthode conseillée) |
| Node.js et npm | 22 (version du `frontend/Dockerfile` et de la CI) | lancer le front sans Docker, Newman |
| PHP | 8.2 minimum (`backend/composer.json`) ; 8.5 dans Docker et la CI | lancer l'API sans Docker, avec l'extension `pdo_pgsql` |
| Composer | 2 | installer les dépendances PHP sans Docker |
| PostgreSQL | 17 (image `postgres:17-alpine`) | seulement si la base ne tourne pas dans Docker |

## Lancer avec Docker (front + API + base)

Copier `.env.example` en `.env` (le fichier `.env` n'est jamais versionné), puis, à la racine du dépôt :

```bash
docker compose up -d --build
```

| Service compose | Adresse | Rôle |
|---|---|---|
| `frontend` | http://localhost:8080 | front React servi par nginx (redirige `/api/` vers `api`) |
| `api` | http://localhost:3000/api/health | API PHP Slim sous Apache ; le dossier `backend/` est monté dans le conteneur |
| `db` | `localhost:5432` | PostgreSQL 17, base `iris_space` |
| `adminer` | http://localhost:8081 | administration de la base : système PostgreSQL, serveur `db`, utilisateur et mot de passe du `.env`, base `iris_space` |

Le front Docker utilise l'API et la base, pas les mocks : on s'y connecte avec un compte de la base
(les comptes de test du mode mock n'y marchent pas).

### Comptes de démo

À la création du volume de la base, elle reçoit le schéma (`init_database.sql`) puis les **données de démo**
(`backend/database/seed_demo.sql`, développement uniquement, jamais en production : mots de passe connus) :
2 classes, 5 matières, des cours sur deux semaines, des devoirs, des notes, des absences, des ressources
et des actualités.

| Compte | Mot de passe | Rôle |
|---|---|---|
| `admin` | `admin1234` | administration |
| `prof` | `prof1234` | professeur (Développement, Cybersécurité) |
| `eleve` | `eleve1234` | élève (BTS SIO 1) |
| `mmartin`, `jdupont` | `demo1234` | professeurs |
| `lbernard`, `crobert`, `tpetit`, `emoreau` | `demo1234` | élèves |

Il n'y a pas de compte `dev` dans les données de démo : voir [Créer le premier compte `dev`](#créer-le-premier-compte-dev).

### Repartir de zéro

- Si on peut perdre les données : `docker compose down -v` (supprime le volume `db_data`), puis
  `docker compose up -d --build`. Le schéma et les données de démo sont rechargés.
- Sans supprimer le volume (développement uniquement, efface tout le schéma `public`), depuis la racine :

```bash
docker compose exec -T db psql -U iris -d iris_space < backend/database/reset_dev.sql
docker compose exec -T db psql -U iris -d iris_space < backend/database/init_database.sql
docker compose exec -T db psql -U iris -d iris_space < backend/database/seed_demo.sql
```

Les scripts montés dans `db` (`init_database.sql`, `seed_demo.sql`) ne sont exécutés qu'à la **création du
volume** : les modifier ne change pas une base déjà créée (voir [Migrations](#migrations-sur-une-base-existante)).

> Sous PowerShell, l'opérateur `<` ne sert pas à rediriger un fichier. Lancer ces commandes dans
> Git Bash, ou les entourer de `cmd /c "…"`, par exemple :
> `cmd /c "docker compose exec -T db psql -U iris -d iris_space < backend\database\reset_dev.sql"`.

Si l'API répond 500 « password authentication failed » : PostgreSQL ne relit le mot de passe qu'à la
création du volume. Remettre dans `.env` le mot de passe du volume, ou recréer le volume
(`docker compose down -v`, efface la base locale).

### Créer le premier compte `dev`

Seul un compte `dev` peut créer un compte `dev` : le premier se crée en SQL. Générer le hash du
mot de passe, puis lancer la requête dans Adminer (onglet « Requête SQL ») :

```bash
docker compose exec api php -r "echo password_hash('MotDePasseDev', PASSWORD_DEFAULT), PHP_EOL;"
```

```sql
INSERT INTO utilisateur (identifiant, email, mot_de_passe_hash, role, nom, prenom)
VALUES ('dev', 'dev@iris-space.fr', '<hash affiché ci-dessus>', 'dev', 'Développeur', 'Équipe');
```

Ce compte crée ensuite tous les autres depuis la page `/comptes`.

## Lancer sans Docker

Le front et le back se lancent séparément. Pour le front seul, les mocks suffisent : pas besoin de back ni de base.

### Lancer le front sans Docker

```bash
cd frontend
npm install
npm run dev       # serveur de développement (adresse affichée par Vite)
npm run build     # build de production dans dist/
npm run preview   # sert le build de production
```

**Mode mocks ou mode API.** Chaque service de `frontend/src/services/` contient les deux versions :
mock (données de `src/mocks/`, gardées dans le `localStorage`) et appel API. Le choix se fait avec les
variables `VITE_*`. Copier `frontend/.env.example` en `frontend/.env.local` (ignoré par git), puis :

| Mode | `frontend/.env.local` | Comptes |
|---|---|---|
| Mocks (par défaut) | `VITE_USE_MOCKS=true` | `admin` / `admin`, `direction` / `direction`, `prof` / `prof`, `eleve` / `eleve`, `dev` / `dev` |
| API | `VITE_USE_MOCKS=false` et `VITE_BACKEND_URL=http://localhost:3000` | comptes de la base (voir [Comptes de démo](#comptes-de-démo)) |

En dev, Vite redirige `/api/*` vers `VITE_BACKEND_URL` (pas de souci CORS). Les requêtes envoient le
cookie de session (`credentials: 'include'`). Redémarrer `npm run dev` après avoir changé le fichier.
Les espaces `/visiteur` et `/mediaschool` sont publics.

### Lancer le back sans Docker

> **À compléter** : la commande PHP exacte pour lancer l'API sous Windows (activation de l'extension
> `pdo_pgsql`) est décrite dans un autre document et sera reportée ici.

1. Avoir une base PostgreSQL accessible avec le schéma et les données de démo chargés. Le plus simple :
   `docker compose up -d db` (le port `5432` est publié sur `localhost`). Avec un PostgreSQL installé à la main :
   créer la base `iris_space`, puis jouer `backend/database/init_database.sql` et `backend/database/seed_demo.sql`
   avec `psql`.
2. Définir les variables de connexion dans le terminal qui lance PHP. L'API les lit dans l'environnement
   et n'a **pas de valeur par défaut** pour `DB_*` (voir [Variables d'environnement](#variables-denvironnement)) :
   `DB_HOST=localhost`, `DB_PORT=5432`, `DB_NAME=iris_space`, `DB_USER`, `DB_PASSWORD`, et `APP_ENV=dev`.
   Bash : `export DB_HOST=localhost` ; PowerShell : `$env:DB_HOST = 'localhost'`.
3. Installer les dépendances et lancer le serveur (PHP 8.2 minimum, extension `pdo_pgsql` activée) :

```bash
cd backend
composer install
php -S localhost:3000 -t public
```

L'API répond alors sur http://localhost:3000/api/health. Pour que le front l'utilise, le passer en mode API
(voir ci-dessus).

## Variables d'environnement

Côté back, elles se définissent dans `.env` (modèle : `.env.example`), lu par `docker compose` et transmis
au conteneur `api`. Hors Docker, il faut les définir soi-même dans le terminal. **Ne jamais mettre de secret
dans le dépôt** : `.env` et `.env.*` (sauf `.env.example`) sont ignorés par git.

| Variable | Où | Rôle | Valeur par défaut / exemple |
|---|---|---|---|
| `APP_ENV` | back | `dev` : détail des erreurs, cookie HTTP local, lien de réinitialisation écrit dans `error_log` si `SMTP_HOST` est vide. `production` : cookie `Secure`, erreurs masquées | `dev` |
| `APP_URL` | back | URL publique du front, pour construire le lien de réinitialisation du mot de passe | `http://localhost:8080` |
| `DB_HOST` | back | hôte de PostgreSQL | `db` dans Docker (fixé par `docker-compose.yml`) ; `localhost` hors Docker |
| `DB_PORT` | back | port de PostgreSQL | `5432` |
| `DB_NAME` | back | nom de la base | `iris_space` |
| `DB_USER` | `.env` | utilisateur PostgreSQL, créé par le conteneur `db` (les commandes `psql -U iris` de ce fichier supposent `iris`) | `iris` (voir `.env.example`) |
| `DB_PASSWORD` | `.env` | mot de passe PostgreSQL ; PostgreSQL ne le relit qu'à la création du volume | valeur de développement dans `.env.example` ; en production, un vrai mot de passe |
| `SMTP_HOST` | back | serveur SMTP. Vide en dev : le lien est écrit dans `error_log` PHP ; vide hors dev : repli sur `mail()` | vide |
| `SMTP_PORT` | back | port SMTP : `587` avec STARTTLS, `465` en TLS direct, `25` ou `1025` en local | `587` |
| `SMTP_USER` | back | identifiant SMTP (facultatif) | vide |
| `SMTP_PASSWORD` | back | mot de passe SMTP (facultatif, jamais dans le dépôt) | vide |
| `SMTP_FROM` | back | adresse d'expéditeur | `SMTP_USER` s'il contient `@`, sinon `noreply@iris-space.local` |
| `VITE_USE_MOCKS` | front (`frontend/.env.local`) | `true` : données simulées ; `false` : appels à l'API. Dans Docker, fixé à `false` à la construction par `docker-compose.yml` (les fichiers `.env.*` ne sont pas copiés dans l'image) | `true` |
| `VITE_API_URL` | front | préfixe des appels API côté navigateur | `/api` |
| `VITE_BACKEND_URL` | front | adresse du back utilisée par le proxy du serveur de dev Vite | `http://localhost:3000` |

L'envoi d'e-mails (lien de réinitialisation du mot de passe, valable 1 h) utilise un client SMTP intégré
configuré par les variables `SMTP_*`.

## Migrations sur une base existante

`init_database.sql` et `seed_demo.sql` ne sont exécutés qu'à la création du volume de la base : ne pas
les rejouer sur une base qui contient des données. Quand le schéma évolue, un script de
`backend/database/migrations/` met à jour une base déjà créée (repartir de zéro avec
`docker compose down -v` efface les données). Une base neuve, créée par `init_database.sql`, n'en a pas besoin.

| Fichier | Contenu | À jouer si la base a été créée avant |
|---|---|---|
| `2026-11-27_sec04_journal_connexion.sql` | table `journal_connexion` (RGPD, SEC-04) | SEC-04 |
| `2026-11-27_sec03_totp_2fa.sql` | colonnes TOTP de `utilisateur` et motif `code_2fa_incorrect` dans `journal_connexion` (SEC-03) | SEC-03 |

Ces deux scripts sont idempotents (sans danger si on les relance). Ordre : **SEC-04 avant SEC-03**, car SEC-03
modifie la table `journal_connexion` créée par SEC-04. Depuis la racine du dépôt :

```bash
docker compose exec -T db psql -U iris -d iris_space < backend/database/migrations/2026-11-27_sec04_journal_connexion.sql
docker compose exec -T db psql -U iris -d iris_space < backend/database/migrations/2026-11-27_sec03_totp_2fa.sql
```

Sur une base créée avant l'ajout du rôle `dev`, l'ajouter à la main :

```bash
docker compose exec db psql -U iris -d iris_space -c "ALTER TYPE role_utilisateur ADD VALUE IF NOT EXISTS 'dev';"
```

Une nouvelle évolution du schéma s'ajoute à la fois dans `init_database.sql` et dans un nouveau fichier de
`backend/database/migrations/`, nommé `AAAA-MM-JJ_<tâche>_<sujet>.sql` et de préférence idempotent.
Sous PowerShell, voir la remarque sur `<` dans [Repartir de zéro](#repartir-de-zéro).

## Tests et intégration continue

### Tests de l'API (Postman / Newman)

La collection Postman `backend/tests/postman/iris-space.postman_collection.json` vérifie le contrat d'API
(statuts HTTP, contrôle des droits 401/403, format JSON). Il faut l'API démarrée (http://localhost:3000)
et les données de démo chargées. Depuis la racine du dépôt :

```bash
npx newman run backend/tests/postman/iris-space.postman_collection.json \
  -e backend/tests/postman/iris-space.local.postman_environment.json
```

Utilisation dans Postman, ajustement des comptes de test et ajout d'un lot de tests :
[`backend/tests/postman/README.md`](backend/tests/postman/README.md). Il n'y a pas encore de tests
automatisés du front.

### Intégration continue (GitHub Actions)

Le workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) tourne sur chaque pull request et sur
chaque push vers `main` et `develop`. Il doit être vert avant la fusion.

| Job | Ce qu'il vérifie | Équivalent en local |
|---|---|---|
| `front` | Node 22 : `npm ci` puis `npm run build` | `cd frontend && npm ci && npm run build` |
| `back` | PHP 8.5 avec `pdo_pgsql` : syntaxe de tous les fichiers `.php` hors `backend/vendor/` | `find backend -path backend/vendor -prune -o -name '*.php' -print0 \| xargs -0 -n1 php -l` |

La CI ne lance pas encore la collection Postman : à compléter si elle y est ajoutée.

## Organisation du code

```
Iris_space/
├── frontend/              application React (Vite)
├── backend/               API PHP (Slim 4) + base PostgreSQL
├── docs/gestion-projet/   état des lieux, reste à faire, roadmap, répartition des tâches
├── .github/workflows/     intégration continue (ci.yml)
├── docker-compose.yml     frontend, api, db, adminer
└── .env.example           modèle du .env lu par docker compose
```

### Front

```
frontend/src/
├── main.jsx            point d'entrée (Router + providers)
├── App.jsx             toutes les routes
├── Layout.jsx          cadre de toutes les pages : Navbar + (menu latéral) + page + Footer
├── routes/             navigation.js (pages du menu + droit requis), RequireDroit (garde de route)
├── pages/              un fichier par page, le même pour tous les utilisateurs (+ mediaschool/)
├── components/         layout/ (Navbar, Footer, MobileMenu, DevPanel…), ui/ (Modal, DataState), auth/, legal/
├── context/            AuthContext (session), MessageCountContext
├── hooks/              useAsync (charger des données), useEscape, useNotifications…
├── services/           SEUL endroit qui accède aux données (API ou mocks)
├── mocks/              données de démonstration
├── content/, lib/      textes légaux, PWA
└── assets/             fonts, images, style.css
```

### Back

```
backend/
├── database/
│   ├── init_database.sql    schéma PostgreSQL (exécuté à la création du volume)
│   ├── seed_demo.sql        données de démo (développement uniquement)
│   ├── reset_dev.sql        remise à zéro (développement uniquement)
│   └── migrations/          scripts à jouer sur une base existante
├── public/index.php         point d'entrée Slim : branche les fichiers de routes dans le groupe /api
├── routes/                  un fichier par domaine (auth, eleve, prof, visiteur, messagerie…), admin/ pour l'administration
├── src/                     classes PHP (namespace `App\`)
├── scripts/                 tâches en ligne de commande, ex. purger_journal_connexions.php (cron, RGPD)
├── tests/postman/           collection Postman / Newman
├── ROUTES.md                contrat d'API
├── vendor/                  dépendances Composer
└── Dockerfile               API PHP Slim servie par Apache
```

### Règles de code du front

- **Une page n'accède jamais directement à `localStorage` ni à `fetch`** : elle appelle une
  fonction de `services/` via `useAsync`.
- Imports avec l'alias `@/` (= `src/`), par ex. `import Modal from '@/components/ui/Modal.jsx'`.
- **Pas de page par type d'utilisateur** : une URL unique par fonctionnalité, et ce qui s'affiche
  dépend des droits de l'utilisateur (`user.droits`, renvoyés par le back depuis la base).
  On ne teste jamais `user.role` dans une page (si le rôle compte vraiment : `estAdmin`, `estProf`, `estEleve`
  de `services/utilisateur.js`) : dans la page, `const { can } = useAuth();` puis
  `{can('documents_gerer') && <button>…</button>}`. Liste des droits : `mocks/users.js`.
- Une nouvelle page du menu = un fichier dans `pages/` + une ligne dans `routes/navigation.js`.
- Le panel DEV est affiché si l'utilisateur a le droit `outils_dev` ; une page y ajoute ses boutons
  avec `<DevTools>…</DevTools>` (voir `pages/Messages.jsx`).

## Règles de travail

- **Branches.** `main` contient la version de démonstration ; `develop` est la branche d'intégration (sa
  création est la tâche INT-06 : tant qu'elle n'existe pas, partir de `main`). Personne ne pousse
  directement sur `main` ni sur `develop`. Une branche par tâche, nommée avec son identifiant :
  `feat/MSG-01-conversations`, `fix/EDT-02-chevauchement`.
- **Commits.** L'identifiant de la tâche, puis la description : `NTF-01 : notification des nouveaux messages`.
- **Pull requests.** Une PR par tâche, avec l'identifiant dans le titre et une section « Comment tester ».
  Elle est relue par une autre personne ; les PR qui touchent au socle (connexion, droits, `services/api.js`,
  `routes/helpers.php`) sont relues par Thomas. Détail :
  [`docs/gestion-projet/04-repartition-des-taches.md`](docs/gestion-projet/04-repartition-des-taches.md).
- **Une tâche est terminée quand** la PR est relue et fusionnée, la fonctionnalité marche avec la vraie API
  (`VITE_USE_MOCKS=false`) dans `docker compose up` avec les comptes de démo, les nouvelles routes sont
  décrites dans `ROUTES.md` et ont leurs cas dans la collection Postman, et la CI est verte.
- **Les pages décident avec les droits, pas avec le rôle** : voir les règles de code du front ci-dessus.
- **`backend/ROUTES.md` fait foi** : toute nouvelle route ou modification de format y est d'abord documentée,
  puis implémentée côté back et côté front.
- **Pas de secret dans le dépôt** (`.env`, mots de passe, clés SMTP) ; les données de démo ne servent jamais en production.

## Contrat d'API (unique source de vérité)

Le contrat officiel entre le front-end et le back-end est décrit dans [`backend/ROUTES.md`](backend/ROUTES.md).
Toute nouvelle route ou modification de format doit d'abord y être documentée avant d'être implémentée.

Points essentiels :
- `POST /api/auth/login` attend `{ identifiant, mot_de_passe }` et renvoie `{ user }` (`{ id, identifiant, email, role, nom, prenom, photo_url, droits }`), où `role` vaut `administrateur`, `direction`, `professeur`, `eleve` ou `dev` et `droits` est déduit du rôle (voir [`frontend/src/mocks/users.js`](frontend/src/mocks/users.js)). Si la double authentification TOTP est activée, la réponse est `{ double_authentification_requise: true }` et la session s'ouvre après `POST /api/auth/2fa/verifier`.
- `GET /api/auth/me` restaure la session courante (ou répond `401`).
- Les formulaires d'envoi de fichiers utilisent `FormData` (champ `fichier`).
