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
├── App.jsx             toutes les routes, imbriquées par espace
├── routes/             RequireRole : protège un espace selon le rôle connecté
├── layouts/            navbar + footer de chaque espace, pages rendues dans <Outlet />
├── pages/              une page par route (admin/, prof/, eleve/, visiteur/, mediaschool/)
├── components/
│   ├── layout/         Footer, MobileMenu, MessageBadge, DevPanel
│   ├── ui/             Modal, DataState (chargement / erreur)
│   └── …               composants partagés (Messagerie, ActualitesPubliees)
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
- Une nouvelle page = un fichier dans `pages/<espace>/` + une ligne dans `App.jsx`.
- Le panel DEV est affiché par les layouts admin et prof ; une page y ajoute ses boutons
  avec `<DevTools>…</DevTools>` (voir `components/Messagerie.jsx`).

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
`POST /api/auth/login` renvoie `{ id, identifiant, role, nom }` avec `role` ∈ `admin | prof | eleve`.
