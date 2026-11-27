# Projet-commun-Site-Iris
Projet de classe sur la création/refonte du Site Iris

```
Projet-Iris-space/
├── frontend/   application React (Vite + React Router + Tailwind/daisyUI)
└── backend/    API PHP (Slim 4) + base PostgreSQL
```

## Lancer avec Docker (front + API + base)

Copier `.env.example` en `.env`, puis :

```bash
docker compose up -d --build
# front   : http://localhost:8080
# API     : http://localhost:3000/api/health
# Adminer : http://localhost:8081
```

Le front Docker utilise l'API et la base, pas les mocks : on s'y connecte avec un compte de la base
(les comptes de test du mode mock n'y marchent pas).

`init_database.sql` n'est exécuté qu'à la création du volume de la base. Sur une base créée avant
l'ajout du rôle `dev`, l'ajouter à la main (ou repartir de zéro avec `docker compose down -v`,
ce qui efface les données) :

```bash
docker compose exec db psql -U iris -d iris_space -c "ALTER TYPE role_utilisateur ADD VALUE IF NOT EXISTS 'dev';"
```

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

## Lancer le front sans Docker

```bash
cd frontend
npm install
npm run dev     # serveur de développement
npm run build   # build de production dans dist/
```

Comptes de test (mode mock) : `admin` / `admin`, `direction` / `direction`, `prof` / `prof`, `eleve` / `eleve`, `dev` / `dev`.
Les espaces `/visiteur` et `/mediaschool` sont publics.

## Lancer le back (API Slim) sans Docker

Avec PHP 8.2+ et Composer installés :

```bash
cd backend
composer install
php -S localhost:3000 -t public
```

Les routes sont déclarées dans `backend/public/index.php`, dans le groupe `/api`.
Les classes PHP vont dans `backend/src/` (namespace `App\`).

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

## Architecture du backend

```
backend/
├── database/    Iris_space -- PostgreSQL
│   └── init_database.sql
├── public/      point d'entrée Slim (`index.php`)
├── routes/      toutes les routes (database, auth, eleve, admin, prof, visiteur)
├── src/         classes PHP (namespace `App\`)
├── vendor/      dépendances Composer
└── Dockerfile   configuration API PHP Slim servie par Apache
```

Règles :

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

## Brancher le back

Chaque service contient les deux versions : mock (localStorage) et appel API.
Pour passer sur le back, copier `frontend/.env.example` en `frontend/.env.local` puis :

```
VITE_USE_MOCKS=false
VITE_BACKEND_URL=http://localhost:3000   # adresse du back en dev
```

En dev, Vite redirige `/api/*` vers `VITE_BACKEND_URL` (pas de souci CORS).
Les requêtes envoient le cookie de session (`credentials: 'include'`).

## Contrat d'API (unique source de vérité)

Le contrat officiel entre le front-end et le back-end est décrit dans [`backend/ROUTES.md`](backend/ROUTES.md).
Toute nouvelle route ou modification de format doit d'abord y être documentée avant d'être implémentée.

Points essentiels :
- `POST /api/auth/login` attend `{ identifiant, mot_de_passe }` et renvoie `{ user }` (`{ id, identifiant, email, role, nom, prenom, photo_url, droits }`), où `role` vaut `administrateur`, `direction`, `professeur`, `eleve` ou `dev` et `droits` est déduit du rôle (voir [`frontend/src/mocks/users.js`](frontend/src/mocks/users.js)).
- `GET /api/auth/me` restaure la session courante (ou répond `401`).
- Les formulaires d'envoi de fichiers utilisent `FormData` (champ `fichier`).
