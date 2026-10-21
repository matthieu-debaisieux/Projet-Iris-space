# Routes de l'API à faire

État au 21/10/2026, branche `backend`.

Le frontend n'appelle encore aucune route : toutes les données sont écrites en dur dans les pages ou stockées dans le localStorage, et même [Login.jsx](../frontend/src/pages/Login.jsx) compare en dur `admin/admin` et `eleve/eleve`. Le schéma SQL, lui, est complet : la liste part de ce que chaque page React affiche et des tables qui existent déjà.

## Déjà fait

| Méthode | Route | Remarque |
|---|---|---|
| GET | `/api/health` | Test de vie de l'API |
| POST | `/api/auth/login` | Existe, mais le front ne l'appelle pas encore |
| POST | `/api/auth/logout` | Vide et détruit la session, supprime le cookie, répond 204 |
| GET | `/api/auth/me` | Renvoie `{ user }` (même format que le login), ou 401 si pas de session ou compte désactivé |

Les sections marquées **(fait)** plus bas sont aussi codées et testées :
- admin documents ;
- admin comptes et programme ;
- élève ;
- professeur ;
- visiteur.

## Organisation

- Les routes communes n'ont pas de préfixe : auth, actualités, messagerie.
- Les routes propres à un espace vont sous `/api/admin`, `/api/prof` et `/api/eleve`. Chaque groupe est protégé par le middleware `requireRole()` de [helpers.php](routes/helpers.php) : 401 si personne n'est connecté, 403 si le rôle ne correspond pas.
- Côté élève, l'id vient de la session et jamais de l'URL, pour qu'un élève ne puisse pas lire les notes d'un autre.
- Un fichier de routes par espace : [admin/documents.php](routes/admin/documents.php), [admin/utilisateurs.php](routes/admin/utilisateurs.php), [eleve.php](routes/eleve.php), [prof.php](routes/prof.php), [visiteur.php](routes/visiteur.php). Ils sont branchés dans [index.php](public/index.php).

## Conventions de l'API (pour le front)

- **Corps :** en JSON (`Content-Type: application/json`), sauf pour les routes qui reçoivent un fichier. Celles-ci prennent un formulaire multipart (`FormData`) dont le fichier va dans le champ `fichier` : 10 Mo maximum, PDF, bureautique, images ou zip.
- **Erreurs :** `{ "error": "message lisible" }` avec le bon code :
  - 400 : champ manquant ou invalide ;
  - 401 : pas connecté ;
  - 403 : mauvais rôle ;
  - 404 : introuvable, ou pas à vous ;
  - 409 : doublon, ou élément encore utilisé.

  Le message peut s'afficher tel quel.
- **Dates :** `AAAA-MM-JJ` pour un jour, ISO `AAAA-MM-JJTHH:MM` pour une date et heure. Une heure sans fuseau compte en heure de Paris. Les dates renvoyées incluent le décalage (`2026-10-30 18:00:00+01`) et se lisent avec `new Date()`.
- **Nombres décimaux** (notes, coefficients, barèmes) : renvoyés en texte (`"16.00"`), il faut les convertir avec `Number()`.
- **`PUT` remplace tout :** un champ facultatif absent est remis à vide. Il faut renvoyer l'objet complet, pas seulement le champ modifié. Pour un changement partiel, utiliser les routes `PATCH`.
- **Fichiers :** ils sont rangés dans `backend/uploads/` (ignoré par git, hors de `public/`). La colonne `url` contient leur chemin dans ce dossier. On ne peut pas encore les télécharger : il manque la route `GET /api/documents/{id}/telecharger` (voir Fichiers).

**P1** : nécessaire pour les pages déjà construites. **P2** : pages encore vides, ou saisie de données qui n'a pas encore de page.

## Actualités

| Méthode | Route | Sert à | P |
|---|---|---|---|
| GET | `/api/actualites/publiques` | Accueil visiteur, sans connexion | P1 |
| GET | `/api/actualites?limit=` | Élève et prof : page Actualité et bloc de l'accueil | P1 |
| GET · POST | `/api/admin/actualites` | Toutes les actualités, brouillons compris / créer un article | P1 |
| PUT · DELETE | `/api/admin/actualites/{id}` | Modifier / supprimer | P1 |

## Fichiers

| Méthode | Route | Sert à | P |
|---|---|---|---|
| POST | `/api/uploads` | Envoyer un fichier et récupérer son URL : image d'actualité (aujourd'hui en base64 dans le localStorage), documents, devoirs rendus | P1 |
| GET | `/api/documents/{id}/telecharger` | Télécharger un document privé après vérification des droits | P2 |

## Messagerie (admin, prof, élève)

| Méthode | Route | Sert à | P |
|---|---|---|---|
| GET · POST | `/api/conversations` | Liste avec dernier message et non-lus / nouvelle conversation | P1 |
| GET · POST | `/api/conversations/{id}/messages` | Fil de discussion / envoyer un message | P1 |
| POST | `/api/conversations/{id}/lu` | Marquer comme lu (`dernier_lu_at`) | P1 |
| GET | `/api/messages/non-lus` | Pastille rouge des navbars (aujourd'hui un compteur en localStorage) | P1 |
| GET | `/api/utilisateurs?recherche=` | Trouver à qui écrire | P1 |

## Admin : tableau de bord et absences

| Méthode | Route | Sert à | P |
|---|---|---|---|
| GET | `/api/admin/absences?date=` | « Absences aujourd'hui » du Dashboard et de la page Absences (vue `v_absences_du_jour`) | P1 |
| POST | `/api/admin/absences` | Saisir une absence ou un retard (pas encore de formulaire) | P2 |
| PATCH · DELETE | `/api/admin/absences/{id}` | Justifier (`justifie`, `motif`) / supprimer | P2 |

## Admin : emploi du temps

| Méthode | Route | Sert à | P |
|---|---|---|---|
| GET · POST | `/api/admin/classes` | Sélecteur de classe / « Ajouter une classe » | P1 |
| GET · POST | `/api/admin/salles` | Liste des salles / « Ajouter une salle » | P1 |
| GET | `/api/admin/matieres` | Menu « Matière » du cours (texte libre aujourd'hui) | P1 |
| GET | `/api/admin/professeurs?matiere_id=` | Menu « Intervenant » (texte libre aujourd'hui) | P1 |
| GET · POST | `/api/admin/cours` | Semaine affichée (`?classe_id=&du=&au=`), sert aussi pour « Cours aujourd'hui » du Dashboard / ajouter un cours | P1 |
| PUT · DELETE | `/api/admin/cours/{id}` | Modifier / supprimer | P1 |

## Admin : documents (fait)

Un « espace » de la page correspond à une ligne de la table `type_document`. Comportement :
- L'ajout d'un document est un formulaire multipart avec `fichier`, `titre` (facultatif, par défaut le nom du fichier) et `utilisateur_id` (facultatif).
- Un document sans `utilisateur_id` est visible par tous les élèves. Avec un `utilisateur_id`, il n'est visible que par cet utilisateur.
- Supprimer un espace supprime aussi ses documents et leurs fichiers.

| Méthode | Route | Sert à | P |
|---|---|---|---|
| GET · POST | `/api/admin/espaces` | Espaces avec leurs documents / ajouter un espace | P1 |
| PATCH · DELETE | `/api/admin/espaces/{id}` | Renommer / supprimer | P1 |
| POST | `/api/admin/espaces/{id}/documents` | Ajouter un document | P1 |
| DELETE | `/api/admin/documents/{id}` | Supprimer un document | P1 |

## Admin : comptes et programme (fait)

Il n'y a pas encore de page front pour ça, mais sans ces routes tout se crée à la main en SQL. Et tant que `professeur_matiere` et `classe_matiere` sont vides, les clés étrangères font refuser à la base tout cours, devoir, évaluation ou ressource.

Comportement :
- Le mot de passe fait au moins 8 caractères.
- Le rôle ne se modifie pas après la création.
- Un admin ne peut pas désactiver son propre compte.
- Les deux routes `PUT …/matieres` remplacent toute la liste :
  - `{ "matiere_ids": [1, 4] }` pour un prof ;
  - `{ "matieres": [{ "matiere_id": 1, "coefficient": 2 }] }` pour une classe.

  Retirer une matière encore utilisée par des cours, devoirs ou évaluations répond 409.

| Méthode | Route | Sert à | P |
|---|---|---|---|
| GET · POST | `/api/admin/utilisateurs` | Lister (`?role=`) / créer un compte : utilisateur + ligne `eleve` ou `professeur`, mot de passe hashé | P2 |
| PUT | `/api/admin/utilisateurs/{id}` | Modifier, dont la classe d'un élève | P2 |
| PATCH | `/api/admin/utilisateurs/{id}/actif` | Désactiver / réactiver un compte | P2 |
| POST | `/api/admin/matieres` | Créer une matière | P2 |
| PUT | `/api/admin/professeurs/{id}/matieres` | Matières qu'un prof enseigne | P2 |
| PUT | `/api/admin/classes/{id}/matieres` | Programme d'une classe et coefficients | P2 |

## Élève (fait)

Comportement :
- `emploi-du-temps` sans paramètre renvoie le jour même.
- `absences` renvoie aussi un `resume` : nombre d'absences, d'absences non justifiées et de retards, heures d'absence, et `ponctualite`. La ponctualité est le pourcentage des cours passés de la classe sans absence ni retard.
- Un devoir déjà rendu ne peut plus être marqué « à faire ». On peut déposer plusieurs fichiers tant qu'il n'est pas corrigé.

| Méthode | Route | Sert à | P |
|---|---|---|---|
| GET | `/api/eleve/profil` | Page Profil (classe, année scolaire, naissance…) | P1 |
| GET | `/api/eleve/emploi-du-temps?du=&au=` | Accueil (jour affiché, flèches ← →) et page Emploi du temps | P1 |
| GET | `/api/eleve/notes?limit=` | Page Notes et bloc « Dernières notes » | P1 |
| GET | `/api/eleve/devoirs?statut=` | Bloc « Travail à faire » et page Devoirs | P1 |
| GET | `/api/eleve/ressources?limit=` | Bloc « Dernières ressources » | P1 |
| GET | `/api/eleve/absences` | Bloc « Vie scolaire » (avec la ponctualité) et page Vie scolaire | P1 |
| PATCH | `/api/eleve/devoirs/{id}` | Marquer un devoir comme fait | P2 |
| POST | `/api/eleve/devoirs/{id}/rendu` | Rendre un devoir en ligne | P2 |
| GET | `/api/eleve/documents` | Page Documents | P2 |

## Professeur (fait)

Toutes les pages front sont encore vides, sauf Messages. Comportement des routes :
- `classes` renvoie les classes de l'année scolaire courante dont le programme contient une matière enseignée par le prof.
- Un prof ne voit et ne modifie que ses propres devoirs, évaluations et ressources. Pour ceux des autres, la réponse est 404.
- La classe et la matière d'un devoir ou d'une évaluation ne se modifient pas après la création.
- `PUT …/notes` reçoit `{ "notes": [{ "eleve_id", "valeur", "absent", "commentaire" }] }`. Seuls les élèves envoyés sont modifiés, et une ligne vide efface la note.
- Une ressource `fichier` est un formulaire multipart, une ressource `lien` demande une `url` en http(s), une ressource `texte` demande un `contenu`.

| Méthode | Route | Sert à | P |
|---|---|---|---|
| GET | `/api/prof/emploi-du-temps?du=&au=` | Accueil et page Emploi du temps | P2 |
| GET | `/api/prof/classes` | Ses classes et matières, pour les menus | P2 |
| GET | `/api/prof/classes/{id}/eleves` | Élèves d'une classe, pour la saisie des notes | P2 |
| GET · POST | `/api/prof/devoirs` | Lister / donner un devoir | P2 |
| PUT · DELETE | `/api/prof/devoirs/{id}` | Modifier / supprimer | P2 |
| GET | `/api/prof/devoirs/{id}/suivi` | Qui a fait ou rendu le devoir, avec les fichiers | P2 |
| GET · POST | `/api/prof/evaluations` | Lister / créer une évaluation | P2 |
| PUT · DELETE | `/api/prof/evaluations/{id}` | Modifier / supprimer | P2 |
| GET · PUT | `/api/prof/evaluations/{id}/notes` | Notes de toute la classe, saisies en une fois | P2 |
| GET · POST | `/api/prof/ressources` | Ressources de cours (fichiers, liens, textes), sans doute la page « Arborescence » | P2 |
| DELETE | `/api/prof/ressources/{id}` | Supprimer une ressource | P2 |

## Visiteur (fait)

| Méthode | Route | Sert à | P |
|---|---|---|---|
| POST | `/api/contact` | Formulaire de contact : le lien « Contact » du menu visiteur ne mène encore nulle part, alors que la table `demande_contact` est prête | P2 |

Les actualités publiques sont dans la section Actualités.

## Bonus (P3)

Ces routes ne sont pas nécessaires pour que le site tourne :

- **Mot de passe :** `PUT /api/auth/mot-de-passe`, `POST /api/auth/mot-de-passe-oublie`, `POST /api/auth/reinitialiser-mot-de-passe` (table `reinitialisation_mdp`)
- **Élève :** `GET /api/eleve/moyennes` (la vue `v_moyenne_matiere` est déjà prête), `POST /api/eleve/absences/{id}/justificatif`
- **Prof :** `PATCH /api/prof/devoirs/{id}/eleves/{eleveId}` pour corriger un devoir (note, appréciation)
- **Textes publics** (« À propos », mentions légales) : `GET /api/pages/{slug}`, `PUT /api/admin/pages/{slug}` (table `page_publique`)
- **Demandes de contact côté admin :** `GET /api/admin/contacts`, `PATCH /api/admin/contacts/{id}`
- **Notifications** (table prête, aucune interface) : `GET /api/notifications`, `PATCH /api/notifications/{id}/lue`, `POST /api/notifications/tout-lire`

Les pages MediaSchool n'ont aucune table en base : leur contenu reste statique tant qu'on n'en crée pas.

## Hors routes, mais bloquant

1. **La base est vide.** [init_database.sql](database/init_database.sql) ne crée aucun compte, donc le login répond toujours 401. Il faut un script de seed avec :
   - des comptes de test admin, prof et élève (hash avec `password_hash`) ;
   - une année scolaire courante et un campus ;
   - des classes et des matières ;
   - les liens prof ↔ matière et classe ↔ matière.
2. **Proxy Vite.** Seul nginx relaie `/api`, donc ça ne marche que sous Docker. Pour `npm run dev`, il faut ajouter `server.proxy: { '/api': 'http://localhost:3000' }` dans [vite.config.js](../frontend/vite.config.js).
3. **Côté front.** [Login.jsx](../frontend/src/pages/Login.jsx) doit appeler `POST /api/auth/login` avec `identifiant` et `mot_de_passe`, puis rediriger selon le rôle :
   - `eleve` vers `/eleve` ;
   - `professeur` vers `/prof` ;
   - `administrateur` ou `direction` vers `/admin`.

   Ensuite, il faut remplacer par des appels à l'API toutes les données en dur ainsi que [storage.js](../frontend/src/lib/storage.js).
4. **Écarts entre les pages et le schéma**, à trancher avant d'écrire les routes concernées :
   - **Actualités :** le statut « Archivé » n'existe pas en base (seulement `publique` et `publie_at`). L'auteur est saisi en texte libre alors que la base attend `auteur_id`.
   - **Absences :**
     - pas de statut « En attente », car `justifie` est un booléen ;
     - pas de table pour le « contact responsable » (le parent) ;
     - pas d'heures de début et de fin, seulement `cours_id` et `duree_heures`.
   - **Emploi du temps :**
     - la matière et l'intervenant doivent devenir des menus, car la base attend des id ;
     - créer une classe exige une année scolaire et un campus, et créer une salle exige un campus ;
     - le « Enregistrer quand même ? » en cas de chevauchement ne pourra plus marcher, car la base refuse ces cours (contraintes `EXCLUDE`, erreur `23P01`). Il faudra renvoyer un code 409 au lieu d'une erreur 500.
   - **Profil :** il n'y a pas de colonne « civilité ».
5. **README.** [README.md](../README.md) contient encore des marqueurs de conflit (`<<<<<<< Updated upstream`), restes d'un `git stash pop`.
