# Projet-commun-Site-Iris
Projet de classe sur la création/refonte du Site Iris

```
Projet-Iris-space/
├── frontend/   application React (Vite + React Router + Tailwind/daisyUI)
└── backend/    API (à venir)
```

## Lancer le front

```bash
cd frontend
npm install
npm run dev     # serveur de développement
npm run build   # build de production dans dist/
```

Comptes de test (mode mock) : `admin` / `admin`, `prof` / `prof`, `eleve` / `eleve`.
Les espaces `/visiteur` et `/mediaschool` sont publics.

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

- **Une page n'accède jamais directement à `localStorage` ni à `fetch`** : elle appelle une
  fonction de `services/` via `useAsync`.
- Imports avec l'alias `@/` (= `src/`), par ex. `import Modal from '@/components/ui/Modal.jsx'`.
- **Pas de page par type d'utilisateur** : une URL unique par fonctionnalité, et ce qui s'affiche
  dépend des droits de l'utilisateur (`user.droits`, renvoyés par le back depuis la base).
  On ne teste jamais `user.role` : dans la page, `const { can } = useAuth();` puis
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

Routes attendues par le front :

| Méthode | Route                              | Service                  |
|---------|------------------------------------|--------------------------|
| POST    | `/api/auth/login`                  | `auth.login`             |
| POST    | `/api/auth/logout`                 | `auth.logout`            |
| GET     | `/api/actualites[?statut=Publié]`  | `actualites.get…`        |
| POST    | `/api/actualites`                  | `createActualite`        |
| PUT     | `/api/actualites/:id`              | `updateActualite`        |
| DELETE  | `/api/actualites/:id`              | `deleteActualite`        |
| GET     | `/api/absences?date=today`         | `getAbsences`            |
| GET     | `/api/planning`                    | `getPlanning`            |
| GET     | `/api/planning/aujourdhui`         | `getCoursDuJour`         |
| GET     | `/api/espaces`                     | `getEspaces`             |
| GET     | `/api/conversations`               | `getConversations`       |
| POST    | `/api/conversations/:id/messages`  | `sendMessage`            |
| GET     | `/api/eleve/emploi-du-temps?date=` | `getEmploiDuJour`        |
| GET     | `/api/eleve/raccourcis`            | `getRaccourcis`          |
| GET     | `/api/eleve/notes`                 | `getNotes`               |
| GET     | `/api/eleve/profil`                | `getProfil`              |

Le format des données renvoyées est celui des fichiers de `frontend/src/mocks/`.
`POST /api/auth/login` renvoie `{ id, identifiant, role, nom, droits }` où `droits` est la liste
des codes de droits de l'utilisateur (voir `frontend/src/mocks/users.js` pour la liste utilisée).
