# Gestion de projet — Iris Space

État des lieux, reste à faire, roadmap et répartition des tâches de l'équipe SLAM, au 27/11/2026.

Sources : le cahier des charges v1 (Google Doc « PROJET COMMUN - IRIS-SPACE », 19/10/2026), le code des branches `main`, `backend`, `front-eleve+navbar/louis` et `2Front-VieScolaire/Louis`, `backend/ROUTES.md`, et les cours de gestion de projet 2 et 3 (découpage, jalons, suivi, comptes rendus).

## Où on en est

- **Front** : les écrans élève, admin et visiteur existent en React, avec des données fictives (mocks et localStorage). L'espace prof est presque vide (pas de devoirs, pas de saisie des notes) et la page Devoirs élève est vide. 18 écrans sur les 28 du MVP du cahier des charges.
- **Back** : API PHP Slim + PostgreSQL sur la branche `backend`, 57 routes codées (connexion, élève, prof, documents et comptes côté admin). Il manque les actualités, la messagerie, l'emploi du temps côté admin et l'envoi et le téléchargement de fichiers.
- **Front et back ne sont pas reliés** : le front tourne sur ses mocks, et les adresses qu'il appelle ne correspondent pas aux routes du back, connexion comprise.
- **Le code est éparpillé** : rien n'est entré dans `main` depuis le 21/10/2026.
- **Infra** : Docker Compose marche en local. Pas encore de HTTPS, de serveur ni de sauvegardes.

**Prochain jalon : J1 « Socle intégré », vendredi 11/12/2026.** Une seule branche à jour, `docker compose up` lance tout, et admin, prof et élève se connectent avec la vraie API.

## Les fichiers

| Fichier | Contenu |
|---|---|
| [01-etat-des-lieux.md](01-etat-des-lieux.md) | Ce qui est fait : par fonctionnalité du cahier des charges, par branche, côté front, back et infra, et qui a fait quoi |
| [02-reste-a-faire.md](02-reste-a-faire.md) | Ce qui reste à faire : blocages, écarts entre front et back, backlog par lot (77 tâches), décisions prises et à prendre |
| [03-roadmap.md](03-roadmap.md) | Hypothèses, Gantt, jalons, contenu de chaque sprint, chemin critique, risques, rituels de suivi |
| [04-repartition-des-taches.md](04-repartition-des-taches.md) | Les 5 postes, la charge par sprint, une fiche par personne, l'équipe SISR, la matrice RACI, la variante à 4 personnes, les règles de travail |
| [taches.csv](taches.csv) | Toutes les tâches (identifiant, lot, priorité, charge, responsable, sprint), à importer dans Notion, GitHub Projects ou un tableur |

## En chiffres

|  |  |
|---|---|
| Tâches | 77, dont 7 pour l'équipe SISR |
| Charge de l'équipe SLAM d'ici J5 | 216 h de Must, plus 30 h de Should et Could |
| Prévu après la bêta | 14 h (notifications push, double authentification des élèves) |
| Charge de l'équipe SISR | 26 h, sans compter le passage chez un hébergeur externe |
| Sprints | 6 sprints de deux semaines, du 30/11/2026 au 05/03/2027 |
| Jalons | 5, plus l'oral |
| Décisions | 5 prises le 27/11/2026 (D1, D3, D4, D5, D7), 6 encore ouvertes (D2, D6, D8 à D11) |

## Ce qui est décidé, ce qui reste à confirmer

Décidé le 27/11/2026 (détail dans [02](02-reste-a-faire.md#décisions-prises)) :
- l'équipe : les 5 développeurs SLAM du cahier des charges (Matthieu, Maïlys, Louis, Thomas, Teva), l'équipe SISR gardant l'infrastructure ;
- environ 6 h de travail par personne et par semaine ;
- la vie scolaire reste un bonus ; la double authentification couvre les admins et les profs dans la bêta ; les notifications restent dans l'application pour la bêta ; l'élève dépose ses documents en rendant un devoir ou dans « Mes documents ».

Reste à confirmer : la date de l'oral. En attendant, la bêta est visée pour le 05/03/2027, bien avant « l'oral de juillet » du cahier des charges. Les autres décisions ouvertes sont dans [02](02-reste-a-faire.md#décisions-à-prendre).

## Tenir ces fichiers à jour

- Chaque tâche a un identifiant (`MSG-01`, `EDT-02`…). On le reprend dans le nom de la branche, le titre de la PR et la carte du tableau de suivi.
- Le tableau de suivi a quatre colonnes : À faire → En cours → À valider → Terminé. Une tâche ne passe en « Terminé » qu'après relecture et test (voir les règles de travail dans [04](04-repartition-des-taches.md#règles-de-travail)).
- À chaque revue de sprint, le chef de projet met à jour [01](01-etat-des-lieux.md) (ce qui est fait) et [03](03-roadmap.md) (jalons tenus ou décalés), et range le compte rendu dans `comptes-rendus/`.
