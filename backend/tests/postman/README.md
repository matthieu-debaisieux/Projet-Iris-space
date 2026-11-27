# Tests API — Collection Postman (`QUA-01`)

Collection Postman v2.1 versionnée pour vérifier le contrat d'API décrit dans [`backend/ROUTES.md`](../../ROUTES.md).

## Prérequis

1. Démarrer l'API et PostgreSQL (`docker compose up -d --build` ou `php -S localhost:3000 -t public`).
2. Avoir chargé les données de démo (`SOC-01`, `seed_demo.sql`).
3. Ajuster si besoin `adminLogin` / `adminPassword`, `profLogin` / `profPassword`, `eleveLogin` / `elevePassword` dans `iris-space.local.postman_environment.json`.

## Utilisation dans Postman

1. Importer `iris-space.postman_collection.json` et `iris-space.local.postman_environment.json`.
2. Sélectionner l'environnement **IRIS-SPACE — Local (Docker / PHP)**.
3. Lancer le **Collection Runner** sur l'ensemble de la collection (les dossiers enchaînent connexion, tests de droits, uploads et nettoyage).

## Utilisation en ligne de commande (Newman)

Depuis la racine du dépôt :

```bash
npx newman run backend/tests/postman/iris-space.postman_collection.json \
  -e backend/tests/postman/iris-space.local.postman_environment.json
```

## Ajouter les lots suivants

Chaque nouveau lot fonctionnel (`ACT`, `MSG`, `EDT`, `DEV`, `NOT`, `CPT`, `NTF`, `SEC`) ajoute un dossier numéroté dans cette collection avec ses assertions de statut HTTP, de contrôle de rôle (401/403) et de format JSON.
