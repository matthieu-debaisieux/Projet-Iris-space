# Projet-commun-Site-Iris
Projet de classe sur la création/refonte du Site Iris

## Lancer le projet

```bash
npm install
npm run dev     # serveur de développement
npm run build   # build de production dans dist/
```

Application React (Vite + React Router + Tailwind/daisyUI).

- `src/pages/` : une page par route (`admin/`, `prof/`, `eleve/`, `visiteur/`, `mediaschool/`)
- `src/layouts/` : navbar, menu mobile et footer de chaque espace
- `src/components/` : éléments partagés (messagerie, panel DEV, actualités publiées…)
- `src/lib/` : clés localStorage et compteur de messages

Comptes de test : `admin` / `admin` → `/admin`, `eleve` / `eleve` → `/eleve`.
