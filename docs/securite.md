# Revue de sécurité avant la bêta (SEC-05)

Revue du 28/11/2026 : lecture de tout le back (`backend/public/index.php`, `backend/routes/**/*.php`) et des points sensibles du front (`frontend/src`), puis vérification par requêtes curl sur une API locale (base de démo), en `APP_ENV=dev` et en `APP_ENV=production`. Les données de test ont été supprimées ensuite.

## Ce qui a été vérifié

| Domaine | Vérifié | Résultat |
|---|---|---|
| Accès horizontal (IDOR) | Notes, devoirs et rendus, absences et justificatifs, documents, messages et pièces jointes, profil, export RGPD, notifications : l'id de l'élève vient toujours de la session. Prof : devoirs, évaluations, notes, ressources, corrections et élèves d'une classe vérifiés par `professeur_id` | Conforme (404 pour un devoir, une évaluation, une ressource, une conversation ou une absence d'autrui). Les téléchargements répondaient 403 : corrigé en 404 |
| Accès vertical | `requireRole` / `requireConnecte` sur chaque groupe et chaque route ; élève et prof sur `/admin/*`, `/admin/pages`, `/admin/contacts`, `/prof/*`, `/eleve/*`, écriture des actualités | Conforme (401 sans session, 403 mauvais rôle). Une faille corrigée : effacement RGPD d'un compte dev par un admin |
| Double authentification | Entre l'étape 1 et l'étape 2 : `/auth/me`, `/profil`, `/prof/*`, `/notifications`, export, `/auth/2fa/preparer` | 401 partout ; code rejoué refusé ; 5 codes faux = retour à l'étape 1 |
| Limite de connexion | 5 échecs → 429 avec `Retry-After`, même avec le bon mot de passe, l'identifiant en majuscules ou un `X-Real-IP` forgé | Conforme |
| Fichiers | Extension en liste blanche, type réel (fileinfo) : PHP renommé en `.pdf` et HTML en `.txt` refusés ; nom aléatoire sur le disque ; nom `../../public/evil.pdf` sans effet ; `uploads/` hors de `public/` ; téléchargement avec `Content-Type` détecté, `Content-Disposition`, `X-Content-Type-Options: nosniff` | Conforme |
| Injections SQL | Toutes les requêtes sont préparées ; les morceaux dynamiques (colonnes du PATCH profil, `WHERE` des listes, `LIMIT`) viennent de listes fixes ou d'entiers validés | Conforme |
| XSS (front) | Aucun `dangerouslySetInnerHTML` ni `innerHTML` ; liens des ressources filtrés `http(s)` ; `image_url` validée côté back (`urlOuChemin`) | Conforme |
| Erreurs | Format `{ error }`, détail masqué en production | Les erreurs Slim (route inconnue, 405, 500) n'étaient pas au format `{ error }` : corrigé |
| Session et cookies | `HttpOnly`, `SameSite=Lax`, `Secure` en production ; identifiant régénéré à la connexion (un identifiant imposé est refusé : `use_strict_mode`) ; cookie inutilisable après la déconnexion | Conforme. CSRF : protection ajoutée (voir plus bas) |
| Mots de passe et secrets | bcrypt (`password_hash`) ; aucun secret suivi par git (`.env` ignoré, seul `.env.example`) ; jeton de réinitialisation de 64 caractères hexadécimaux, stocké haché, valable 1 h, refusé à la 2e utilisation | Conforme. Énumération des comptes par le temps de réponse : corrigée |

## Failles corrigées

| Gravité | Faille | Correction | Preuve |
|---|---|---|---|
| Moyenne | Un administrateur ou la direction pouvait effacer (anonymiser, désactiver, changer le mot de passe) un compte `dev` avec `DELETE /api/admin/utilisateurs/{id}/donnees`, alors que seul un dev peut modifier un compte dev | `verifierDroitSurCompte()` dans [admin/rgpd.php](../backend/routes/admin/rgpd.php) | Compte dev de test : 200 avant, 403 après ; un dev l'efface toujours (200), un admin efface toujours un élève (200) |
| Faible | Les téléchargements renvoyaient 403 pour le fichier d'autrui (document, pièce jointe d'un devoir, rendu), ce qui confirmait que l'id existe | 404 « introuvable » dans [fichiers.php](../backend/routes/fichiers.php) et [devoirs_fichiers.php](../backend/routes/devoirs_fichiers.php), et pour `DELETE /api/eleve/documents/{id}` sur le document d'un autre élève ([eleve.php](../backend/routes/eleve.php)) | Autre élève ou autre classe : 403 avant, 404 après ; le propriétaire et le prof du devoir : toujours 200 |
| Faible | Énumération des comptes : `POST /api/auth/login` répondait en 70 ms environ pour un identifiant inconnu et 270 ms pour un compte existant (bcrypt non calculé) | Vérification contre un hash factice (`HASH_FACTICE`) dans [auth.php](../backend/routes/auth.php) | Après : environ 270 ms dans les deux cas |
| Faible | CSRF : seul `SameSite=Lax` protégeait ; les routes acceptent aussi un formulaire (urlencoded, multipart) et un sous-domaine voisin (« same-site ») n'est pas bloqué par Lax | Middleware `refuserRequeteInterSite()` ([helpers.php](../backend/routes/helpers.php)) sur `/api` : `POST`/`PUT`/`PATCH`/`DELETE` avec `Sec-Fetch-Site: cross-site` ou `same-site` → 403 | `POST /notifications/tout-lire` en `text/plain` cross-site : 200 avant, 403 après ; `same-origin` et sans en-tête : 200 |
| Faible | Erreurs Slim (route inconnue, 405, 500) au format `{ message, exception }` et pas `{ error }` | Rendu JSON `{ error }` dans [index.php](../backend/public/index.php), `details` seulement en dev | En production : `{"error":"Erreur interne du serveur"}` (500), `{"error":"Route introuvable"}` (404), sans chemin de fichier |

## Risques restants et décisions à prendre

1. **Sessions après un changement de mot de passe** : changer ou réinitialiser son mot de passe ne ferme pas les autres sessions ouvertes (stockage des sessions PHP par défaut). Il faudrait un compteur de version du mot de passe en base, comparé par `requireRole`. À décider.
2. **Aucune limite sur `POST /api/auth/mot-de-passe-oublie` et `POST /api/contact`** : envoi d'e-mails en masse et spam possibles. À décider : limite par IP ou par compte (comme SEC-02), ou captcha.
3. **`X-Real-IP` et port 3000** : l'IP n'est lue dans `X-Real-IP` que pour une requête venant d'une adresse privée. Si l'API est joignable directement (port 3000 du `docker-compose.yml`, réseau Docker privé), un client peut choisir son IP et contourner la limite de 20 échecs par IP (la limite par compte tient). En production, n'exposer que nginx (config serveur).
4. **En-têtes de sécurité du front** (nginx) : pas de `Content-Security-Policy`, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`, HSTS. Config serveur à ajouter avant la mise en ligne.
5. **HTTPS obligatoire en production** : avec `APP_ENV=production`, le cookie est `Secure` ; servi en HTTP, la connexion ne tiendrait pas. Les ports 5432 (PostgreSQL) et 8081 (Adminer) du `docker-compose.yml` ne doivent pas être exposés en production.
6. **Durée des sessions** : pas d'expiration côté serveur au-delà du ramasse-miettes PHP (`session.gc_maxlifetime`). À décider : durée d'inactivité maximale.
7. **Fichiers « général » de `POST /api/uploads`** : tout compte connecté peut déposer un fichier et tout compte connecté peut le lire s'il connaît son nom aléatoire (32 caractères hexadécimaux). Pas de quota. À décider si ce dépôt générique doit rester ouvert aux élèves.
8. **Export RGPD d'un compte dev** : un administrateur peut toujours exporter les données d'un compte dev (lecture seule). À décider si cela doit être réservé au dev.
9. **Administrateurs entre eux** : un administrateur ou la direction peut changer le mot de passe d'un autre administrateur ou de la direction (`PUT /api/admin/utilisateurs/{id}`). Conforme au contrat actuel, à confirmer.
10. **PDF affichés dans le navigateur** (pièces jointes des messages, justificatifs côté administration) : le PDF peut contenir du JavaScript, exécuté seulement dans la visionneuse du navigateur. Risque accepté.
11. Hors sécurité, vu pendant la revue : une date `0000-01-01` passe la validation `dateJour` et provoque une erreur 500 (PostgreSQL refuse l'année 0).
