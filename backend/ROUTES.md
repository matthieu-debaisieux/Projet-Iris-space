# Contrat d'API — IRIS-SPACE (`ROUTES.md`)

Ce document est l'**unique contrat d'API** entre le front-end et le back-end : toute nouvelle route y est décrite avant d'être codée.

## Authentification, session et socle (fait)

| Méthode | Route | Remarque |
|---|---|---|
| GET | `/api/health` | Test de vie de l'API |
| POST | `/api/auth/login` | Reçoit `{ identifiant, mot_de_passe }`, renvoie `{ user }` avec `droits` et pose le cookie de session (`HttpOnly`, `SameSite=Lax`, `Secure` hors dev) |
| POST | `/api/auth/logout` | Vide et détruit la session, supprime le cookie, répond 204 |
| GET | `/api/auth/me` | Renvoie `{ user }` avec `droits`, ou 401 si pas de session ou compte désactivé |
| GET | `/api/profil` | Profil complet de l'utilisateur connecté selon son rôle (élève, professeur, administrateur/direction) |
| POST | `/api/profil/photo` | Envoyer ou remplacer sa photo de profil (`fichier` multipart, JPG/PNG/WebP, 2 Mo max ; met à jour `utilisateur.photo_url` et renvoie `{ photo_url }`) |
| DELETE | `/api/profil/photo` | Retirer sa photo de profil (supprime le fichier et remet `utilisateur.photo_url` à `null`, 204) |

Les sections marquées **(fait)** plus bas sont aussi codées :
- fichiers (`/uploads`, `/documents/{id}/telecharger`) ;
- admin documents ;
- admin comptes et programme ;
- admin emploi du temps (classes, salles, menus, cours) ;
- élève (dont « Mes documents ») ;
- professeur ;
- visiteur ;
- actualités ;
- notifications ;
- RGPD (journal des connexions, export et suppression des données).

## Organisation

- Les routes communes n'ont pas de préfixe : auth, actualités, messagerie.
- Les routes propres à un espace vont sous `/api/admin`, `/api/prof` et `/api/eleve`. Chaque groupe est protégé par le middleware `requireRole()` de [helpers.php](routes/helpers.php) : 401 si personne n'est connecté, 403 si le rôle ne correspond pas.
- Côté élève, l'id vient de la session et jamais de l'URL, pour qu'un élève ne puisse pas lire les notes d'un autre.
- Un fichier de routes par espace : [admin/documents.php](routes/admin/documents.php), [admin/utilisateurs.php](routes/admin/utilisateurs.php), [admin/emploi_du_temps.php](routes/admin/emploi_du_temps.php), [admin/programme.php](routes/admin/programme.php), [eleve.php](routes/eleve.php), [prof.php](routes/prof.php), [visiteur.php](routes/visiteur.php), [rgpd.php](routes/rgpd.php) et [admin/rgpd.php](routes/admin/rgpd.php). Les actualités, partagées entre plusieurs rôles, ont leur propre fichier sans préfixe : [actualites.php](routes/actualites.php). Ils sont branchés dans [index.php](public/index.php).

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
- **Fichiers :** ils sont rangés dans `backend/uploads/` (ignoré par git, hors de `public/`). La colonne `url` contient leur chemin dans ce dossier. Ils sont envoyés via `POST /api/uploads` (ou les routes dédiées) et téléchargés via `GET /api/documents/{id}/telecharger` avec contrôle des droits.

**P1** : nécessaire pour les pages déjà construites. **P2** : pages encore vides, ou saisie de données qui n'a pas encore de page.

## Actualités (fait)

Toutes les routes sont sur `/api/actualites`, dans [actualites.php](routes/actualites.php), et non sous `/api/admin` : un professeur doit pouvoir écrire, alors que le groupe `/admin` est réservé à l'administration.

Décision D9 (proposition appliquée, à valider par Matthieu) :
- L'auteur d'un article est le compte connecté (`auteur_id`). Le front n'envoie jamais d'auteur : s'il en envoie un, il est ignoré. Les réponses donnent `auteur_id`, `auteur_nom` et `auteur_prenom`.
- Pas de statut « Archivé » dans la bêta : un article est soit un brouillon (`publie_at` vaut `NULL`), soit publié (`publie_at` renseigné). L'API l'expose avec `statut` : `"publie"` ou `"brouillon"`.
- `publique` est un champ à part : un article publié n'est lisible sans connexion que si `publique` vaut `true`. Un brouillon n'est jamais visible, même avec `publique: true`.

Comportement :
- Lecture : tout utilisateur connecté lit les articles publiés, publics ou non. Les brouillons n'apparaissent qu'avec `brouillons=true`, et seulement pour ceux qui peuvent écrire : admin et direction voient tous les brouillons, un prof les siens, un élève aucun (le paramètre est sans effet).
- Écriture (`POST`, `PUT`, `DELETE`) : admin, direction et dev sur tous les articles. Un prof seulement sur les siens : 403 pour l'article d'un autre, 404 si l'id n'existe pas. Un élève reçoit 403.
- Publier fixe `publie_at` à l'instant présent. Un article déjà publié garde sa date quand on le modifie ; le repasser en brouillon l'efface, et le republier la remet à maintenant. La date de publication ne se choisit pas.
- `PUT` remplace tout : `titre`, `contenu` et `statut` sont obligatoires, `image_url` absent est remis à vide et `publique` absent vaut `false`. L'auteur ne change jamais.
- `image_url` est une URL http(s) ou un chemin commençant par `/`. Une image en base64 est refusée (400) : son envoi passera par `POST /api/uploads`.
- Les listes sont triées de la plus récente à la plus ancienne (date de publication, ou de création pour un brouillon). `limit` vaut 100 par défaut et au maximum.

| Méthode | Route | Droits | Sert à | P |
|---|---|---|---|---|
| GET | `/api/actualites/publiques?limit=` | Aucune connexion | Accueil et page visiteur : articles publiés avec `publique` à `true` | P1 |
| GET | `/api/actualites?limit=&brouillons=` | Connecté | Page Actualité et bloc de l'accueil | P1 |
| POST | `/api/actualites` | Admin, direction, dev, prof | Créer un article (201) | P1 |
| PUT | `/api/actualites/{id}` | Admin, direction, dev, prof (les siens) | Modifier un article | P1 |
| DELETE | `/api/actualites/{id}` | Admin, direction, dev, prof (les siens) | Supprimer un article (204) | P1 |

Corps de `POST` et `PUT` :

```json
{
  "titre": "Rentrée 2026",
  "contenu": "Texte de l'article",
  "statut": "publie",
  "publique": true,
  "image_url": "/images/rentree.jpg"
}
```

`titre` (200 caractères maximum), `contenu` et `statut` (`"publie"` ou `"brouillon"`) sont obligatoires. `publique` et `image_url` sont facultatifs.

Réponse : `{ "actualite": {...} }` pour `POST` et `PUT`, `{ "actualites": [...] }` pour les deux `GET`. Un article :

```json
{
  "id": "uuid",
  "titre": "Rentrée 2026",
  "contenu": "Texte de l'article",
  "image_url": "/images/rentree.jpg",
  "publique": true,
  "statut": "publie",
  "publie_at": "2026-09-01 08:00:00+02",
  "created_at": "2026-08-30 15:12:00+02",
  "updated_at": "2026-08-30 15:12:00+02",
  "auteur_id": "uuid",
  "auteur_nom": "Dupont",
  "auteur_prenom": "Claire"
}
```

`publie_at` vaut `null` pour un brouillon.

## Fichiers (fait)

| Méthode | Route | Sert à | P |
|---|---|---|---|
| POST | `/api/uploads` | Envoyer un fichier (`fichier`, `categorie` facultative : `general`, `actualites`, `avatars`, `messages`) et récupérer `{ url, fichier }` (`actualites` réservé à admin, direction, dev, prof ; `actualites` et `avatars` limités aux images) | P1 |
| GET | `/api/uploads/{categorie}/{nom}` | Servir un fichier déposé via `/api/uploads` (public sans connexion pour `actualites`, tout utilisateur connecté pour `general`, `avatars`, `messages`) | P1 |
| GET | `/api/documents/{id}/telecharger` | Télécharger un document après vérification des droits (admin/direction : tout ; élève : généraux et les siens ; prof : généraux, les siens ou déposés par lui) | P2 |
| GET | `/api/devoirs/fichiers/{id}/telecharger` | Télécharger une pièce jointe d'un devoir (prof auteur, élèves du devoir, administration) | P2 |
| GET | `/api/devoirs/rendus/{id}/telecharger` | Télécharger un fichier rendu par un élève (élève auteur ou prof du devoir) | P2 |

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

## Admin : emploi du temps (fait)

Les routes sont dans [admin/emploi_du_temps.php](routes/admin/emploi_du_temps.php), sous `/api/admin` : admin, direction et dev y ont les mêmes droits (401 sans session, 403 pour un professeur ou un élève). Les listes renvoient une clé au pluriel (`{ "cours": [...] }`), un objet une clé au singulier (`{ "cours": {...} }`, `{ "salle": {...} }`).

| Méthode | Route | Sert à | P |
|---|---|---|---|
| GET | `/api/admin/classes` | Sélecteur de classe (route des comptes, voir plus haut) | P1 |
| POST | `/api/admin/classes` | « Ajouter une classe » (201) | P1 |
| GET · POST | `/api/admin/salles` | Menu des salles (`?campus_id=`) / « Ajouter une salle » (201) | P1 |
| GET | `/api/admin/matieres?classe_id=` | Menu « Matière » : toutes les matières, ou le programme de la classe avec son coefficient | P1 |
| GET | `/api/admin/professeurs?matiere_id=` | Menu « Intervenant » : profs actifs qui enseignent la matière | P1 |
| GET | `/api/admin/cours?classe_id=&du=&au=` | Semaine affichée ; sans `classe_id`, toutes les classes (bloc « Cours aujourd'hui » du tableau de bord) | P1 |
| POST | `/api/admin/cours` | Ajouter un cours (201) | P1 |
| PUT | `/api/admin/cours/{id}` | Modifier un cours | P1 |
| DELETE | `/api/admin/cours/{id}` | Supprimer un cours (204) | P1 |

Un cours est un créneau daté, pas une semaine type : pour répéter un cours chaque semaine, il faut le créer à chaque date. Un cours :

```json
{
  "id": "uuid",
  "classe_id": 2,
  "classe": "BTS SIO 2",
  "matiere_id": 1,
  "matiere": "Développement",
  "professeur_id": "uuid",
  "prof_nom": "Leroy",
  "prof_prenom": "Paul",
  "salle_id": 3,
  "salle": "Labo 1",
  "debut": "2026-11-30 11:00:00+01",
  "fin": "2026-11-30 12:00:00+01",
  "annule": false,
  "commentaire": null
}
```

`salle_id` et `salle` valent `null` sans salle. `debut` et `fin` sont au même format que dans `/eleve/emploi-du-temps` et `/prof/emploi-du-temps`.

Corps de `POST` et `PUT /api/admin/cours` :

```json
{
  "classe_id": 2,
  "matiere_id": 1,
  "professeur_id": "uuid",
  "salle_id": 3,
  "debut": "2026-11-30T11:00",
  "fin": "2026-11-30T12:00",
  "annule": false,
  "commentaire": "Apporter un PC"
}
```

`classe_id`, `matiere_id`, `professeur_id`, `debut` et `fin` sont obligatoires. `salle_id` et `commentaire` (500 caractères) sont facultatifs, `annule` vaut `false` par défaut. Un `PUT` remplace tout le cours (une salle absente retire la salle). Les heures sans fuseau sont en heure de Paris.

Comportement :
- `GET cours` : `du` et `au` sont des jours `AAAA-MM-JJ`, bornes incluses (par défaut : aujourd'hui). Il renvoie `{ "du", "au", "cours": [...] }`, triés par heure de début. Un `classe_id` inconnu répond 404.
- `GET matieres` sans `classe_id` renvoie `{ id, code, nom }` pour chaque matière. Avec `classe_id`, seulement le programme de cette classe, avec `coefficient` (en texte, `"4.00"`) ; classe inconnue : 404.
- `GET professeurs` ne renvoie que les comptes actifs, chacun avec toutes ses matières : `{ id, nom, prenom, matieres: [{ id, nom }] }`. `id` est l'identifiant à envoyer comme `professeur_id`. Sans `matiere_id`, tous les professeurs actifs.
- `POST classes` : `{ "nom": "BTS SIO 3" }` (50 caractères). L'année est l'année scolaire courante sauf `annee_scolaire_id`. Le campus est le seul campus s'il n'y en a qu'un, sinon `campus_id` est obligatoire (400 « Précisez le campus »). Réponse : `{ "classe": { id, nom, annee_scolaire, campus } }`.
- `POST salles` : `{ "nom": "B205", "capacite": 30 }` (`nom` 50 caractères, `capacite` facultative, entre 1 et 10000, même règle pour le campus). Réponse : `{ "salle": { id, nom, capacite, campus_id, campus } }`.
- Un cours doit finir après son début et le même jour (heure de Paris), sur une vraie date du calendrier.
- Les références sont contrôlées avant l'écriture : classe, matière, professeur et salle existent, la matière est au programme de la classe, et le professeur l'enseigne. Chaque cas répond 400 avec un message précis (« La matière Anglais n'est pas au programme de la classe … », « Paul Leroy n'enseigne pas la matière Anglais »).
- La classe d'un cours ne se modifie pas : `PUT` répond 400 si `classe_id` est différent (il est facultatif dans ce cas). Pour changer de classe, supprimer le cours et le recréer.
- Chevauchement : un professeur, une classe ou une salle ne peut pas avoir deux cours en même temps. Un cours annulé (`annule: true`) ne compte pas, et deux cours bout à bout (fin 11h, début 11h) ne se chevauchent pas. Le refus répond 409 avec un message qui nomme ce qui est déjà pris, par exemple « Le professeur Paul Leroy a déjà cours le 30/11 de 09h00 à 11h00 (BTS SIO 2, Développement). » ; plusieurs causes s'ajoutent dans le même message. Repasser un cours annulé à `annule: false` peut donc répondre 409.
- Supprimer un cours ne supprime pas les devoirs, ressources et absences qui s'y rapportaient : ils perdent seulement leur lien avec le cours.

Erreurs :
- 400 : champ manquant ou invalide, fin avant le début, cours sur plusieurs jours, référence inconnue, matière hors programme, professeur qui n'enseigne pas la matière, classe modifiée, campus à préciser, capacité invalide.
- 404 : cours ou classe introuvable.
- 409 : chevauchement ; nom de classe (même année et même campus) ou de salle (même campus) déjà pris.

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

Le rôle `dev` dispose du droit `comptes_gerer` (accès à la page `/comptes` de gestion et création des comptes) ainsi que de tous les droits d'administration (et des outils de développement quand `APP_ENV` vaut `dev`, comme les autres rôles).
Seul un compte `dev` peut créer, modifier, désactiver ou supprimer un compte `dev`, et supprimer un utilisateur.
La suppression est refusée (409) dès qu'une donnée est rattachée au compte : notes, absences, devoirs rendus ou corrigés, documents personnels, messages, actualités, cours ou évaluations d'un prof… Dans ce cas, désactiver le compte.
Tant que `professeur_matiere` et `classe_matiere` sont vides, les clés étrangères font refuser à la base tout cours, devoir, évaluation ou ressource.

Comportement :
- Le mot de passe fait au moins 8 caractères.
- Les rôles acceptés sont `eleve`, `professeur`, `administrateur`, `direction` et `dev`. Le rôle ne se modifie pas après la création.
- Un utilisateur ne peut pas désactiver ni supprimer son propre compte.
- Les deux routes `PUT …/matieres` remplacent toute la liste :
  - `{ "matiere_ids": [1, 4] }` pour un prof ;
  - `{ "matieres": [{ "matiere_id": 1, "coefficient": 2 }] }` pour une classe.

  Retirer une matière encore utilisée par des cours, devoirs ou évaluations répond 409.
- Page « Programme » (droit `programme_gerer`, accordé à `administrateur`, `direction` et `dev`) : elle lit les trois routes `GET /api/admin/programme/…` et écrit avec `POST /api/admin/matieres` et les deux `PUT …/matieres`. Les coefficients sont renvoyés en texte (`"4.00"`).
- « Voir la classe » (droit `classe_voir`, accordé à l'élève, au prof, à l'administration, à la direction et au dev) : l'élève lit sa classe avec `GET /api/eleve/classe`, le prof ses classes avec `GET /api/prof/classes` puis `GET /api/prof/classes/{id}/eleves`, l'administration toutes les classes avec `GET /api/admin/classes` puis `GET /api/admin/classes/{id}/eleves`. Seuls les élèves actifs sont listés, avec nom, prénom et photo : jamais d'e-mail, de téléphone ni d'adresse. Le numéro d'étudiant n'est donné qu'au prof et à l'administration, pas à l'élève.

| Méthode | Route | Sert à | P |
|---|---|---|---|
| GET · POST | `/api/admin/utilisateurs` | Lister (`?role=`) / créer un compte : utilisateur + ligne `eleve` ou `professeur`, mot de passe hashé | P2 |
| GET · PUT | `/api/admin/utilisateurs/{id}` | Lire un compte / modifier, dont la classe d'un élève | P2 |
| PATCH | `/api/admin/utilisateurs/{id}/actif` | Désactiver / réactiver un compte | P2 |
| DELETE | `/api/admin/utilisateurs/{id}` | Supprimer un compte (rôle `dev` uniquement ; répond 409 si des données y sont rattachées, voir plus haut) | P2 |
| GET | `/api/admin/classes` | Lister les classes existantes (pour le menu « Classe » lors de la création/édition d'un élève) | P1 |
| GET | `/api/admin/classes/{id}/eleves` | Élèves actifs d'une classe (`id`, `nom`, `prenom`, `photo_url`, `numero_etudiant` — sans coordonnées) | P2 |
| GET | `/api/admin/programme/matieres` | Lister les matières avec `nb_professeurs` et `nb_classes` | P2 |
| GET | `/api/admin/programme/professeurs` | Lister les professeurs (actifs et désactivés) avec leurs matières enseignées | P2 |
| GET | `/api/admin/programme/classes` | Lister les classes avec leur programme (`matieres` et `coefficient`) | P2 |
| POST | `/api/admin/matieres` | Créer une matière | P2 |
| PUT | `/api/admin/professeurs/{id}/matieres` | Matières qu'un prof enseigne | P2 |
| PUT | `/api/admin/classes/{id}/matieres` | Programme d'une classe et coefficients | P2 |

## Élève (fait)

Comportement :
- `emploi-du-temps` sans paramètre renvoie le jour même.
- `absences` renvoie aussi un `resume` : nombre d'absences, d'absences non justifiées et de retards, heures d'absence, et `ponctualite`. La ponctualité est le pourcentage des cours passés de la classe sans absence ni retard.
- Un devoir déjà rendu ne peut plus être marqué « à faire ». On peut déposer plusieurs fichiers tant qu'il n'est pas corrigé.
- `PATCH profil` ne modifie que les coordonnées de l'élève : `email`, `telephone` et `adresse`. Seuls les champs envoyés changent. `telephone` et `adresse` se vident avec `null` ou `""`, alors que `email` est obligatoire s'il est envoyé. Les autres champs (nom, prénom, naissance, nationalité, classe, identifiant…) restent réservés à l'administration : ils sont ignorés, et la requête répond 400 s'il ne reste aucun des trois champs. La réponse est `{ "profil": … }`, au même format que `GET profil`.
  - 400 : email invalide, téléphone invalide (chiffres, espaces, `+ . ( ) -`, 6 à 30 caractères), ou champ trop long (`email` 254, `telephone` 30, `adresse` 500).
  - 409 : email déjà utilisé par un autre compte (comparé à son email et à son identifiant, puisqu'on peut se connecter avec les deux).

| Méthode | Route | Sert à | P |
|---|---|---|---|
| GET | `/api/eleve/profil` | Page Profil (classe, année scolaire, naissance…) | P1 |
| PATCH | `/api/eleve/profil` | Modifier ses coordonnées (`email`, `telephone`, `adresse`) | P2 |
| GET | `/api/eleve/classe` | Classe de l'élève connecté et liste des camarades actifs (`id`, `nom`, `prenom`, `photo_url` — sans coordonnées) | P2 |
| GET | `/api/eleve/emploi-du-temps?du=&au=` | Accueil (jour affiché, flèches ← →) et page Emploi du temps | P1 |
| GET | `/api/eleve/notes?limit=` | Page Notes et bloc « Dernières notes » | P1 |
| GET | `/api/eleve/devoirs?statut=` | Bloc « Travail à faire » et page Devoirs | P1 |
| GET | `/api/eleve/ressources?limit=` | Bloc « Dernières ressources » | P1 |
| GET | `/api/eleve/absences` | Bloc « Vie scolaire » (avec la ponctualité) et page Vie scolaire | P1 |
| PATCH | `/api/eleve/devoirs/{id}` | Marquer un devoir comme fait | P2 |
| POST | `/api/eleve/devoirs/{id}/rendu` | Rendre un devoir en ligne | P2 |
| GET | `/api/eleve/documents` | Page Documents (renvoie `personnel` et `depose_par_moi`) | P2 |
| POST | `/api/eleve/documents` | Déposer un document dans l'espace « Mes documents » (`fichier`, `titre` facultatif) | P2 |
| DELETE | `/api/eleve/documents/{id}` | Supprimer un de ses propres documents de « Mes documents » | P2 |

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
| GET · POST | `/api/prof/devoirs` | Lister (avec `description` et `fichiers`) / donner un devoir | P2 |
| PUT · DELETE | `/api/prof/devoirs/{id}` | Modifier / supprimer | P2 |
| POST | `/api/prof/devoirs/{id}/fichiers` | Joindre un fichier à un devoir (multipart, champ `fichier`, prof auteur uniquement) | P2 |
| GET | `/api/prof/devoirs/{id}/suivi` | Qui a fait ou rendu le devoir, avec les fichiers | P2 |
| PATCH | `/api/prof/devoirs/{id}/eleves/{eleveId}` | Corriger un rendu (note et/ou appréciation → statut `corrige`) | P3 |
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

## Notifications (fait)

Routes dans [notifications.php](routes/notifications.php) (protégées par `requireConnecte()` : un utilisateur ne lit et ne modifie que ses propres notifications) et service d'envoi dans [notifications_service.php](routes/notifications_service.php) (chargé dans [index.php](public/index.php)).

| Méthode | Route | Droits | Sert à | P |
|---|---|---|---|---|
| GET | `/api/notifications?limit=&non_lues=` | Connecté | Mes notifications (plus récentes d'abord ; `limit` de 1 à 100, 20 par défaut ; `non_lues=true` pour filtrer) | P1 |
| PATCH | `/api/notifications/{id}/lue` | Connecté | Marquer une notification comme lue (sans effet si déjà lue ; 404 si inconnue ou d'un autre compte) | P1 |
| POST | `/api/notifications/tout-lire` | Connecté | Marquer toutes mes notifications non lues comme lues | P1 |

Réponses :
- `GET /api/notifications` : `{ "notifications": [{ "id", "type", "titre", "lien", "lue_at", "lue", "created_at" }], "non_lues": 3 }` (`non_lues` est le compteur total des non lues, indépendant de `limit`).
- `PATCH /api/notifications/{id}/lue` : `{ "notification": { "id", "type", "titre", "lien", "lue_at", "created_at" } }`.
- `POST /api/notifications/tout-lire` : `{ "marquees": 3 }`.

### Service d'envoi (`notifications_service.php`)

Types autorisés (`TYPES_NOTIFICATION`, enum SQL `type_notification`) : `systeme`, `actualite`, `absence`, `note`, `devoir`, `message`.

Fonctions disponibles :
- `notifier(array $destinataires, string $type, string $titre, ?string $lien = null, array|string|null $exclure = null): int`
- `notifierUtilisateurs(array $ids, string $type, string $titre, ?string $lien = null, array|string|null $exclure = null): int`
- `notifierClasse(int $classeId, string $type, string $titre, ?string $lien = null, array|string|null $exclure = null): int`
- `notifierConversation(string $conversationId, string $type, string $titre, ?string $lien = null, array|string|null $exclure = null): int`
- `notifierCours(string $coursId, string $type, string $titre, ?string $lien = null, array|string|null $exclure = null): int`
- `notifierTous(string $type, string $titre, ?string $lien = null, array|string|null $exclure = null): int`

Comportement :
- Les doublons, UUID invalides, comptes désactivés/supprimés et les ids passés dans `$exclure` (en général `moi()`) sont ignorés ; le titre est tronqué à 200 caractères.
- Toujours appeler **après** l'écriture principale (hors transaction ou après `commit`, même si `notifier()` pose un `SAVEPOINT` en cas de transaction active) : les erreurs SQL éventuelles sont journalisées (`error_log`) sans bloquer l'action de l'utilisateur.
- **Déjà branché :** publication d'une actualité dans [actualites.php](routes/actualites.php) (`POST /api/actualites` si `statut === 'publie'`, et `PUT /api/actualites/{id}` uniquement au passage de `brouillon` à `publie`) via `notifierTous('actualite', 'Nouvelle actualité : ' . $titre, '/actualites', moi())`.

### Appels à ajouter ailleurs

1. **Nouveau message** (`POST /api/conversations/{id}/messages`, route messagerie à créer) — après l'insertion du message :

```php
notifierConversation(
    $args['id'],
    'message',
    'Nouveau message de ' . trim($expediteur['prenom'] . ' ' . $expediteur['nom']),
    '/messages',
    moi()
);
```

2. **Nouvelle note** (`PUT /api/prof/evaluations/{id}/notes` dans [prof.php](routes/prof.php)) — après `transaction(...)` :

```php
$elevesNotifies = array_column(
    array_filter($lignes, fn (array $l) => $l['valeur'] !== null || $l['absent'] === 'true' || $l['commentaire'] !== null),
    'eleve'
);
if ($elevesNotifies !== []) {
    $eval = lireEvaluation($args['id']);
    notifierUtilisateurs(
        $elevesNotifies,
        'note',
        'Nouvelle note en ' . $eval['matiere'] . ' : ' . $eval['titre'],
        '/notes',
        moi()
    );
}
```

3. **Nouveau devoir** (`POST /api/prof/devoirs` dans [prof.php](routes/prof.php)) — après l'insertion du devoir :

```php
$devoir = lireDevoir($stmt->fetchColumn());
notifierClasse(
    (int) $devoir['classe_id'],
    'devoir',
    'Nouveau devoir en ' . $devoir['matiere'] . ' : ' . $devoir['titre'],
    '/devoirs',
    moi()
);
return json($response, ['devoir' => $devoir], 201);
```

4. **Cours annulé ou déplacé** (`PUT /api/admin/cours/{id}` et `DELETE /api/admin/cours/{id}`, routes emploi du temps à créer) — après `UPDATE` (si `annule` passe à `true` ou si `debut`/`fin`/`salle_id` changent), ou **avant** `DELETE` :

```php
$libelle = $annule ? 'Cours annulé : ' : 'Cours déplacé : ';
notifierCours(
    $args['id'],
    'systeme',
    $libelle . $matiereNom . ' (' . date('d/m H:i', strtotime($debut)) . ')',
    '/emploi-du-temps',
    moi()
);
```

5. **Nouvelle absence** (`POST /api/admin/absences`, route absences à créer) — après `INSERT INTO absence` :

```php
$libelle = $type === 'retard' ? 'Retard enregistré le ' : 'Absence enregistrée le ';
notifierUtilisateurs(
    [$eleveId],
    'absence',
    $libelle . date('d/m/Y', strtotime($dateAbsence)),
    '/absences',
    moi()
);
```

## RGPD (fait)

### Durées de conservation

| Donnée | Durée |
|---|---|
| Journal des connexions (table `journal_connexion`) | **12 mois**, puis purgé |
| Compte et données scolaires | Tant que le compte existe ; supprimées sur demande de la personne (voir plus bas) |

### Journal des connexions

- Chaque `POST /api/auth/login` ajoute une ligne, réussie ou non : date, utilisateur (vide si l'identifiant n'existe pas), identifiant ou e-mail saisi, adresse IP, User-Agent tronqué à 200 caractères, et pour un échec le motif (`identifiant_inconnu`, `mot_de_passe_incorrect`, `compte_desactive`). Le motif n'est jamais renvoyé au client : la réponse reste « Identifiant ou mot de passe incorrect ».
- L'écriture ne bloque jamais la connexion : si elle échoue (par exemple base pas encore migrée), l'erreur va dans le journal PHP et le login continue.
- L'adresse IP est `REMOTE_ADDR`. Derrière le nginx du front (`X-Real-IP`), c'est l'en-tête `X-Real-IP` qui est lu, mais seulement si la requête arrive d'une adresse privée ou locale.
- **Base existante :** jouer une fois [database/migrations/2026-11-27_sec04_journal_connexion.sql](database/migrations/2026-11-27_sec04_journal_connexion.sql). Une base neuve créée avec `init_database.sql` a déjà la table.

### Purge à planifier (équipe SISR)

Le script [scripts/purger_journal_connexions.php](scripts/purger_journal_connexions.php) supprime les lignes de plus de 12 mois (constante `JOURNAL_CONNEXIONS_MOIS` dans [helpers.php](routes/helpers.php)). Il ne se lance qu'en ligne de commande, affiche le nombre de lignes supprimées et sort avec le code 1 en cas d'erreur. L'option `--simulation` compte sans rien supprimer.

À lancer **une fois par jour** par une tâche planifiée sur le serveur, par exemple (cron, tous les jours à 3 h 15) :

```
15 3 * * * docker exec iris-api php /var/www/html/scripts/purger_journal_connexions.php >> /var/log/iris-purge-journal.log 2>&1
```

Sans PHP, le même effet en SQL (`psql`, `pg_cron`…) :

```sql
DELETE FROM journal_connexion WHERE created_at < now() - interval '12 months';
```

Filet de sécurité : environ une connexion réussie sur cent déclenche aussi cette purge. Elle ne remplace pas la tâche planifiée.

À prévoir aussi côté SISR : les **sauvegardes** de la base contiennent encore les lignes purgées ou supprimées jusqu'à leur propre expiration. Leur durée de rétention ne doit pas dépasser celle des données.

### Routes

| Méthode | Route | Droits | Sert à | P |
|---|---|---|---|---|
| GET | `/api/auth/me/export` | Tout utilisateur connecté | Télécharger ses propres données | P2 |
| GET | `/api/admin/utilisateurs/{id}/export` | Administrateur, direction | Télécharger les données d'un compte (demande d'accès d'une personne) | P2 |
| DELETE | `/api/admin/utilisateurs/{id}/donnees` | Administrateur, direction | Supprimer ou anonymiser un compte et ses données (demande d'effacement) | P2 |

**Export :** réponse 200 en JSON lisible, avec `Content-Disposition: attachment` (le front peut aussi le lire avec `fetch`). Les dates et les nombres suivent les conventions de l'API (texte pour les décimaux). Il ne contient **jamais** le hash du mot de passe ni les jetons de réinitialisation. Clés :

- `genere_le`, `utilisateur` (profil complet) ;
- `eleve` (numéro d'étudiant, classe, `notes`, `devoirs`, `fichiers_rendus`, `absences`), `null` si le compte n'est pas un élève ;
- `professeur` (`matieres`, `cours`, `devoirs_donnes`, `evaluations`, `ressources`), `null` si le compte n'est pas un professeur ;
- `actualites_ecrites`, `conversations`, `messages_envoyes` (avec le nom de leurs pièces jointes), `notifications`, `documents`, `demandes_contact` (retrouvées par e-mail), `reinitialisations_mdp` (dates seulement), `journal_connexions`.

Les messages **reçus** ne sont pas inclus : ils appartiennent à leurs expéditeurs. Les fichiers eux-mêmes (devoirs rendus, justificatifs…) ne sont pas joints, seulement leurs noms : à fournir à part si la personne les demande.

**Suppression :** irréversible, dans une transaction (tout ou rien) ; les fichiers sont effacés du disque une fois la base validée. Réponse 200 avec le nombre de lignes supprimées par table, et le nombre de fichiers effacés :

```json
{ "supprime": { "notes": 3, "devoirs": 12, "absences": 1, "fiche_eleve": 1, "...": 0 }, "fichiers_supprimes": 4 }
```

Erreurs :
- 400 : on ne peut pas supprimer son propre compte par cette route ;
- 404 : compte introuvable ;
- 409 : les données de ce compte ont déjà été supprimées.

Le compte supprimé ne peut plus se connecter (sa session en cours est refusée au prochain appel) et n'apparaît plus qu'en « Utilisateur supprimé ».

### Ce que devient chaque donnée à la suppression

Le compte est **anonymisé** et non effacé : plusieurs tables le référencent sans `ON DELETE` (messages, actualités, absences saisies, cours et devoirs d'un professeur…). Supprimer la ligne serait refusé par la base ou détruirait des données qui appartiennent aux autres utilisateurs ou à l'établissement. Tout ce qui ne concerne que la personne est supprimé.

| Donnée | Traitement |
|---|---|
| `utilisateur` | Anonymisée : identifiant `supprime-<uuid sans tirets>`, e-mail `supprime-<uuid sans tirets>@anonyme.invalid`, nom « supprimé », prénom « Utilisateur », naissance, lieu, pays, nationalité, téléphone, adresse et photo vidés, compte désactivé, mot de passe remplacé par un hash aléatoire, dernière connexion effacée |
| `eleve`, `note`, `devoir_eleve`, `devoir_rendu_fichier`, `absence` (de l'élève) | Supprimées, avec les fichiers rendus et les justificatifs sur le disque |
| `professeur`, `professeur_matiere`, `cours`, `devoir`, `evaluation`, `ressource` | Conservés, attribués au compte anonyme : les élèves en ont besoin (emploi du temps, devoirs, notes) et les clés étrangères composites vers `professeur_matiere` l'imposent |
| `message`, `conversation_participant` | Les messages envoyés sont conservés (les autres participants gardent leur fil), avec l'auteur anonymisé. Leurs pièces jointes (`message_piece_jointe`) et les fichiers sont supprimés. `dernier_lu_at` est effacé |
| `actualite` | Les actualités publiées sont conservées, auteur anonymisé. Les brouillons (non publiés) sont supprimés |
| `notification`, `reinitialisation_mdp`, `journal_connexion` | Supprimées |
| `document` destinés au compte | Supprimés, avec les fichiers. Les documents que le compte a déposés pour d'autres sont conservés |
| `demande_contact` | Supprimées si l'e-mail du formulaire est celui du compte ; celles qu'il a traitées sont conservées |
| `absence.saisi_par`, `document.depose_par`, `conversation.created_by`, `demande_contact.traitee_par` | Référence conservée vers le compte anonyme |

## Bonus (P3)

Ces routes ne sont pas nécessaires pour que le site tourne :

- **Mot de passe :** `PUT /api/auth/mot-de-passe`, `POST /api/auth/mot-de-passe-oublie`, `POST /api/auth/reinitialiser-mot-de-passe` (table `reinitialisation_mdp`)
- **Élève :** `GET /api/eleve/moyennes` (la vue `v_moyenne_matiere` est déjà prête), `POST /api/eleve/absences/{id}/justificatif`
- **Prof :** `PATCH /api/prof/devoirs/{id}/eleves/{eleveId}` pour corriger un devoir (note, appréciation)
- **Textes publics** (« À propos », mentions légales) : `GET /api/pages/{slug}`, `PUT /api/admin/pages/{slug}` (table `page_publique`)
- **Demandes de contact côté admin :** `GET /api/admin/contacts`, `PATCH /api/admin/contacts/{id}`

Les pages MediaSchool n'ont aucune table en base : leur contenu reste statique tant qu'on n'en crée pas.

## Correspondance des appels front hérités (reprise du README)

Table issue de l'ancien README du front : les appels de gauche doivent tous être remplacés par la route officielle de droite.

| Ancien appel front (README) | Service front | Route officielle (`ROUTES.md`) | État |
|---|---|---|---|
| `POST /api/auth/login` | `auth.login` | `POST /api/auth/login` (`{ identifiant, mot_de_passe }` → `{ user }` avec `droits`) | Fait (`SOC-02`, `SOC-03`) |
| `POST /api/auth/logout` | `auth.logout` | `POST /api/auth/logout` | Fait (`SOC-03`) |
| `GET /api/actualites[?statut=Publié]` | `actualites.get…` | `GET /api/actualites/publiques` (visiteur) · `GET /api/actualites?limit=` (connecté) · `GET /api/admin/actualites` (gestion) | À faire (`ACT-01`, `ACT-03`) |
| `POST /api/actualites` | `createActualite` | `POST /api/admin/actualites` | À faire (`ACT-01`, `ACT-03`) |
| `PUT /api/actualites/:id` | `updateActualite` | `PUT /api/admin/actualites/{id}` | À faire (`ACT-01`, `ACT-03`) |
| `DELETE /api/actualites/:id` | `deleteActualite` | `DELETE /api/admin/actualites/{id}` | À faire (`ACT-01`, `ACT-03`) |
| `GET /api/absences?date=today` | `getAbsences` | `GET /api/admin/absences?date=` (admin) · `GET /api/eleve/absences` (élève) | Bonus après J3 (`VSC-01`) / élève fait |
| `GET /api/planning` | `getPlanning` | `GET /api/admin/cours?classe_id=&du=&au=` · `GET /api/eleve/emploi-du-temps?du=&au=` · `GET /api/prof/emploi-du-temps?du=&au=` | Élève/prof faits ; admin à faire (`EDT-01`, `EDT-02`) |
| `GET /api/planning/aujourdhui` | `getCoursDuJour` | `GET /api/admin/cours?du=&au=` (date du jour) | À faire (`EDT-01`, `ACC-02`) |
| `GET /api/espaces` | `getEspaces` | `GET /api/admin/espaces` (gestion) · `GET /api/eleve/documents` (élève) | Fait (`DOC-02`, `DOC-04`) |
| `GET /api/conversations` | `getConversations` | `GET /api/conversations` | À faire (`MSG-01`, `MSG-03`) |
| `POST /api/conversations/:id/messages` | `sendMessage` | `POST /api/conversations/{id}/messages` | À faire (`MSG-01`, `MSG-03`) |
| `GET /api/eleve/emploi-du-temps?date=` | `getEmploiDuJour` | `GET /api/eleve/emploi-du-temps?du=&au=` · `GET /api/prof/emploi-du-temps?du=&au=` | Back fait ; front à brancher (`EDT-03`) |
| `GET /api/eleve/raccourcis` | `getRaccourcis` | Supprimée : remplacée par `/api/eleve/devoirs`, `/api/eleve/ressources`, `/api/eleve/notes` | À faire (`ACC-01`) |
| `GET /api/eleve/notes` | `getNotes` | `GET /api/eleve/notes` et `GET /api/eleve/moyennes` | Fait (`NOT-01`, `NOT-02` pour la saisie par le prof) |
| `GET /api/eleve/profil` | `getProfil` | `GET /api/profil` (tous rôles) · `GET /api/eleve/profil` (élève) | Fait (`CPT-07`) |

## Hors routes, mais bloquant

1. **La base est vide.** [init_database.sql](database/init_database.sql) ne crée aucun compte, donc le login répond toujours 401 tant que le jeu de démo (`SOC-01`, `seed_demo.sql`) n'est pas en place avec :
   - des comptes de test admin, prof et élève (hash avec `password_hash`) ;
   - une année scolaire courante et un campus ;
   - des classes et des matières ;
   - les liens prof ↔ matière et classe ↔ matière.
2. **Services front restant à brancher.** Les services `conversations`, `planning`, `absences`, `eleve` et `devoirs` doivent encore être alignés sur les routes ci-dessus (lots `ACC`, `ACT`, `MSG`, `EDT`, `DEV`, `NOT`).
3. **Écarts entre les pages et le schéma**, à trancher avant d'écrire les routes concernées :
   - **Actualités :** tranché par la décision D9, à valider par Matthieu (voir la section Actualités). Le statut « Archivé » disparaît de la bêta : un article est un brouillon ou publié. L'auteur est le compte connecté (`auteur_id`), plus un texte libre.
   - **Absences :**
     - pas de statut « En attente », car `justifie` est un booléen ;
     - pas de table pour le « contact responsable » (le parent) ;
     - pas d'heures de début et de fin, seulement `cours_id` et `duree_heures`.
   - **Emploi du temps :**
     - la matière et l'intervenant doivent devenir des menus, car la base attend des id ;
     - créer une classe exige une année scolaire et un campus, et créer une salle exige un campus ;
     - le « Enregistrer quand même ? » en cas de chevauchement ne pourra plus marcher, car la base refuse ces cours (contraintes `EXCLUDE`, erreur `23P01`). Il faudra renvoyer un code 409 au lieu d'une erreur 500.
   - **Profil :** il n'y a pas de colonne « civilité ».
