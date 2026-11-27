# Iris Space

Projet commun SLAM et SISR : refonte de l'espace numérique de l'école (élèves, professeurs, administration, visiteurs).

```
Projet-Iris-space/
├── frontend/          application React (Vite, React Router, Tailwind CSS, daisyUI)
├── backend/           API PHP (Slim 4) et base PostgreSQL
│   ├── ROUTES.md      contrat de l'API : toutes les routes, leurs entrées et leurs réponses
│   └── database/      schéma, données de démo, remise à zéro
├── docker-compose.yml front + API + base + Adminer
└── .env.example       modèle du fichier .env (identifiants de la base)
```

## Lancer le projet avec Docker (recommandé)

Prérequis : Docker Desktop.

```bash
cp .env.example .env          # sous Windows : copy .env.example .env
# ouvrir .env et remplacer le mot de passe de la base
docker compose up -d --build
```

| Service | Adresse |
|---|---|
| Front (nginx) | http://localhost:8080 |
| API | http://localhost:3000/api/health (et http://localhost:8080/api/… via le front) |
| Adminer (base de données) | http://localhost:8081 : système PostgreSQL, serveur `db`, utilisateur et mot de passe de `.env`, base `iris_space` |
| Mailpit (e-mails envoyés en dev) | http://localhost:8025 |

Au premier lancement, la base est créée avec `backend/database/init_database.sql`, puis remplie avec les données de démo `backend/database/seed_demo.sql`. Si le volume `db_data` existait déjà, ces scripts ne sont **pas** relancés : voir « Remettre la base à zéro ».

Arrêter : `docker compose down` (les données sont gardées).

## Lancer le projet sans Docker

Prérequis : Node.js 22, PHP 8.2 ou plus avec l'extension `pdo_pgsql`, Composer, PostgreSQL 17.

**1. La base**

```bash
createdb iris_space
psql -d iris_space -f backend/database/init_database.sql
psql -d iris_space -f backend/database/seed_demo.sql
```

**2. L'API**, sur http://localhost:3000

```bash
cd backend
composer install
# Linux / macOS
DB_HOST=localhost DB_PORT=5432 DB_NAME=iris_space DB_USER=iris DB_PASSWORD=motdepasse php -S localhost:3000 -t public
```

```powershell
# Windows (PowerShell)
$env:DB_HOST="localhost"; $env:DB_PORT="5432"; $env:DB_NAME="iris_space"; $env:DB_USER="iris"; $env:DB_PASSWORD="motdepasse"
php -S localhost:3000 -t public
```

**3. Le front**, sur http://localhost:5173

```bash
cd frontend
npm install
npm run dev     # serveur de développement
npm run build   # build de production dans dist/
```

Par défaut, le front tourne sur ses données fictives (`frontend/src/mocks/`). Pour utiliser la vraie API, créer `frontend/.env.local` :

```
VITE_USE_MOCKS=false
VITE_BACKEND_URL=http://localhost:3000
```

En dev, Vite redirige `/api/*` vers `VITE_BACKEND_URL` (pas de problème de CORS). Les requêtes envoient le cookie de session.

## Variables d'environnement de l'API

Avec Docker, elles sont dans `docker-compose.yml`, avec des valeurs de dev par défaut ; on peut les changer dans `.env`.

| Variable | Rôle | Dev (Docker) | Production |
|---|---|---|---|
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | connexion à PostgreSQL | `db`, `5432`, `iris_space`, `.env` | celles du serveur |
| `APP_ENV` | `dev` : détail des erreurs, double authentification facultative, lien de réinitialisation renvoyé par l'API | `dev` | **ne pas la définir** |
| `APP_URL` | adresse du front, pour les liens des e-mails | `http://localhost:8080` | `https://iris-space.fr` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` | serveur d'envoi des e-mails ; `SMTP_SECURE` : `tls` (port 587), `ssl` (465) ou `none` | `mailpit`, `1025`, `none` | ceux de l'école, `tls` |
| `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | compte d'envoi et adresse de l'expéditeur | vides, `no-reply@iris-space.fr` | ceux de l'école |
| `DOUBLE_AUTH_OBLIGATOIRE` | force la double authentification (`true`) ou la rend facultative (`false`) | non définie | non définie (obligatoire) |
| `DOUBLE_AUTH_ROLES` | rôles concernés par la double authentification | vide : `administrateur,direction,professeur` | idem ; `administrateur,direction,professeur,eleve` après la bêta (SEC-07) |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | notifications push (vides = désactivées) | vides | générées une fois, voir « Notifications push » |
| `PUSH_HOTES_AUTORISES` | services push acceptés (par défaut ceux de Chrome, Firefox, Safari, Edge) | non définie | non définie |

## Comptes de démo

Les mêmes identifiants marchent avec les mocks du front et avec la vraie API (données de `seed_demo.sql`).

| Identifiant | Mot de passe | Rôle |
|---|---|---|
| `admin` | `admin` | administrateur |
| `direction` | `direction` | direction |
| `prof` | `prof` | professeure de Développement et de Mathématiques (Claire Martin) |
| `prof2` | `prof` | professeur d'Anglais, CEJM et Culture générale (Karim Benali) |
| `eleve` | `eleve` | élève de BTS SIO 1 (John Doe) |
| `eleve2` à `eleve4` | `eleve` | élèves de BTS SIO 1 |
| `eleve5`, `eleve6` | `eleve` | élèves de BTS SIO 2 SLAM |

Les données de démo contiennent aussi une année scolaire, deux classes, cinq matières, l'emploi du temps de la semaine dernière à dans deux semaines (calculé d'après le jour du chargement), des devoirs, des notes, des ressources, des actualités, deux conversations, des notifications et des absences.

**Ces comptes ne doivent jamais exister sur la bêta ou en production** : `seed_demo.sql` est réservé au développement et à la démo.

## Remettre la base à zéro

Toutes les données de la base sont effacées.

Avec Docker :

```bash
docker compose down -v      # supprime le volume db_data
docker compose up -d        # recrée la base et recharge les données de démo
```

Sans Docker, ou depuis Adminer (onglet « Requête SQL » ou « Importer »), dans cet ordre :

1. `backend/database/reset_dev.sql` : efface tout le schéma ;
2. `backend/database/init_database.sql` : recrée les tables ;
3. `backend/database/seed_demo.sql` : recharge les données de démo.

`init_database.sql` n'efface plus rien : il échoue si les tables existent déjà, ce qui protège une vraie base contre un import par erreur.

Pour mettre à jour une base existante **sans** l'effacer, lancer les scripts de `backend/database/migrations/` qu'elle n'a pas encore eus, dans l'ordre des dates. Chacun peut être relancé sans erreur.

## Double authentification et notifications push

**Double authentification** (SEC-03). Elle est obligatoire pour l'administration, la direction et les profs dès que `APP_ENV` n'est pas `dev`. Un compte qui ne l'a pas encore configurée est envoyé sur la page `/double-authentification` après sa connexion. Si quelqu'un perd son téléphone, un admin la réinitialise (`DELETE /api/admin/utilisateurs/{id}/double-authentification`).

Pour l'étendre aux élèves (SEC-07, prévu après la bêta, décision D4), il suffit de cette ligne dans `.env`, puis `docker compose up -d` :

```
DOUBLE_AUTH_ROLES=administrateur,direction,professeur,eleve
```

**Notifications push** (PWA-04, prévu après la bêta, décision D5). Chaque notification de la cloche part aussi sur les téléphones et navigateurs abonnés, une fois les clés générées :

```bash
docker compose exec api php bin/generer-cles-vapid.php   # copier les 3 lignes affichées dans .env
docker compose up -d                                      # relance l'API avec les clés
```

- Il faut générer les clés **une seule fois par serveur** : en changer désabonne tout le monde. La clé privée est un secret : elle reste dans `.env`, hors de Git.
- Les navigateurs n'acceptent le push qu'en HTTPS (ou sur `localhost`).
- Le côté navigateur est la tâche PWA-05 : le service worker s'abonne et affiche les messages. Les routes sont décrites dans `backend/ROUTES.md`, section « Notifications push ».

## Tester

- **L'API, à la main** : se connecter, puis appeler une route en gardant le cookie de session.

  ```bash
  curl -c cookies.txt -H 'Content-Type: application/json' -d '{"identifiant":"eleve","mot_de_passe":"eleve"}' http://localhost:3000/api/auth/login
  curl -b cookies.txt http://localhost:3000/api/eleve/notes
  ```

- **Collection de tests** : à venir dans le dépôt (QUA-01). Chaque nouvelle route y ajoute ses cas.
- **Le front avec la vraie API** : `VITE_USE_MOCKS=false` dans `frontend/.env.local`, puis `npm run dev`. Se connecter avec les comptes de démo.
- **Les e-mails** : ils arrivent dans Mailpit (http://localhost:8025). En dev, l'API renvoie aussi le lien de réinitialisation dans `lien_dev`.
- **Une tâche est terminée** quand elle marche avec la vraie API dans `docker compose up`, avec les comptes de démo, et que ses routes sont décrites dans `ROUTES.md` (voir `docs/gestion-projet/`).

## En cas de problème

| Symptôme | Cause probable | Solution |
|---|---|---|
| La connexion répond toujours « Identifiant ou mot de passe incorrect » | Base créée avant les données de démo | `docker compose down -v` puis `docker compose up -d` |
| « Trop de tentatives. Réessayez dans … minutes. » | 5 échecs en 15 minutes sur le compte (SEC-02) | Attendre, ou en dev : `TRUNCATE tentative_connexion;` dans Adminer |
| Erreur SQL sur une table ou une colonne qui n'existe pas (`tentative_connexion`, `totp_secret`, `push_abonnement`…) | Base plus ancienne que le code | Lancer les scripts de `backend/database/migrations/`, ou remettre la base à zéro |
| « Double authentification à configurer avant de continuer » (403) | `APP_ENV` n'est pas `dev` et le compte n'a pas de double authentification | La configurer sur `/double-authentification`, ou mettre `APP_ENV=dev` en local |
| `Class "…" not found` ou `vendor/autoload.php` introuvable | Dépendances PHP absentes | `docker compose up -d --build -V` (Docker) ou `composer install` (sans Docker) |
| Le front affiche toujours les données fictives | `VITE_USE_MOCKS` vaut `true` | `VITE_USE_MOCKS=false` dans `frontend/.env.local`, puis relancer `npm run dev` |
| Git : `index.lock': File exists` | Une commande Git interrompue a laissé un verrou | Vérifier qu'aucun Git ne tourne, puis supprimer `.git/index.lock` |

## Architecture du front

```
frontend/src/
├── main.jsx            point d'entrée (Router + providers)
├── App.jsx             toutes les routes
├── Layout.jsx          cadre de toutes les pages : Navbar + (menu latéral) + page + Footer
├── routes/             navigation.js (pages du menu + droit requis), RequireDroit (garde de route)
├── pages/              un fichier par page, le même pour tous les utilisateurs (+ mediaschool/)
├── components/
│   ├── layout/         Navbar, Footer, MobileMenu, MessageBadge, DevPanel
│   └── ui/             Modal, DataState (chargement / erreur)
├── context/            AuthContext (session), MessageCountContext
├── hooks/              useAsync (charger des données), useEscape
├── services/           SEUL endroit qui accède aux données (API ou mocks)
├── mocks/              données de démonstration
└── assets/             fonts, images, style.css
```

Règles :

- **Une page n'accède jamais directement à `localStorage` ni à `fetch`** : elle appelle une fonction de `services/` via `useAsync`. Chaque service contient les deux versions, mock et API, choisies par `VITE_USE_MOCKS`.
- Imports avec l'alias `@/` (= `src/`), par exemple `import Modal from '@/components/ui/Modal.jsx'`.
- **Pas de page par type d'utilisateur** : une URL par fonctionnalité, et ce qui s'affiche dépend des droits de l'utilisateur (`user.droits`, renvoyés par le back). On ne teste jamais `user.role` : dans la page, `const { can } = useAuth();` puis `{can('documents_gerer') && <button>…</button>}`. Liste des droits : `mocks/users.js`.
- Une nouvelle page du menu = un fichier dans `pages/` + une ligne dans `routes/navigation.js`.
- Le panel DEV est affiché si l'utilisateur a le droit `outils_dev` ; une page y ajoute ses boutons avec `<DevTools>…</DevTools>`.

## Architecture du back

```
backend/
├── public/index.php    point d'entrée : groupes /api, /api/admin, /api/eleve, /api/prof
├── routes/             un fichier de routes par espace ; helpers.php (lecture des champs, erreurs JSON, fichiers),
│                       securite.php (tentatives, double authentification), notifier.php (notifications),
│                       push.php (notifications push), email.php (SMTP)
├── database/
│   ├── init_database.sql   schéma : tables, vues, contraintes
│   ├── seed_demo.sql       données de démo (développement uniquement)
│   ├── reset_dev.sql       efface tout le schéma (développement uniquement)
│   └── migrations/         mises à jour d'une base existante, une par date
├── bin/                scripts en ligne de commande (generer-cles-vapid.php)
├── uploads/            fichiers envoyés par les utilisateurs (hors de public/, ignoré par Git)
├── ROUTES.md           contrat de l'API
└── Dockerfile          PHP + Apache
```

Règles :

- **`backend/ROUTES.md` fait foi** pour le front comme pour le back. Toute nouvelle route y est décrite avant d'être codée.
- Toutes les réponses sont en JSON ; une erreur renvoie `{ "error": "message lisible" }` avec le bon code HTTP (400, 401, 403, 404, 409…).
- Chaque groupe de routes vérifie le rôle (`requireRole`) : 401 si personne n'est connecté, 403 si le rôle ne correspond pas.
- Requêtes SQL toujours préparées ; l'id de l'utilisateur connecté est lu dans la session, jamais dans l'URL.

## Travailler à plusieurs

La gestion de projet (état des lieux, backlog, roadmap, répartition) est dans `docs/gestion-projet/`.

- Une branche par tâche, créée depuis `develop`, avec l'identifiant de la tâche : `feat/MSG-01-conversations`.
- Une PR par tâche vers `develop`, relue par une autre personne, avec une section « Comment tester ».
- On ne pousse jamais directement sur `main` ni sur `develop`.
