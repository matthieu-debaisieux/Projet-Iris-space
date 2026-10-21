# Projet-commun-Site-Iris
Projet de classe sur la création/refonte du Site Iris

<<<<<<< Updated upstream
## Lancer le projet
=======
```
Projet-Iris-space/
├── frontend/   application React (Vite + React Router + Tailwind/daisyUI)
└── backend/    API PHP (Slim 4) + base PostgreSQL
```

## Lancer le front
>>>>>>> Stashed changes

```bash
npm install
npm run dev     # serveur de développement
npm run build   # build de production dans dist/
```

Application React (Vite + React Router + Tailwind/daisyUI).

<<<<<<< Updated upstream
- `src/pages/` : une page par route (`admin/`, `prof/`, `eleve/`, `visiteur/`, `mediaschool/`)
- `src/layouts/` : navbar, menu mobile et footer de chaque espace
- `src/components/` : éléments partagés (messagerie, panel DEV, actualités publiées…)
- `src/lib/` : clés localStorage et compteur de messages
=======
## Lancer le back (API Slim)

Avec Docker (front + API + base) :

```bash
docker compose up -d --build
# front : http://localhost:8080
# API   : http://localhost:3000/api/health
```

Sans Docker (PHP 8.2+ et Composer installés) :

```bash
cd backend
composer install
php -S localhost:3000 -t public
```

Les routes sont déclarées dans `backend/public/index.php`, dans le groupe `/api`.
Les classes PHP vont dans `backend/src/` (namespace `App\`).

## Architecture du front
>>>>>>> Stashed changes

Comptes de test : `admin` / `admin` → `/admin`, `eleve` / `eleve` → `/eleve`.
