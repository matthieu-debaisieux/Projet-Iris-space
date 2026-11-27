<?php

declare(strict_types=1);

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

// RGPD : export et suppression des données d'un compte.
// Ce fichier contient les fonctions et la route « mes données » ; les routes admin sont dans admin/rgpd.php.

// E-mail des comptes anonymisés (domaine .invalid réservé : il ne peut jamais recevoir de courrier)
const DOMAINE_ANONYME = 'anonyme.invalid';

function rgpdLignes(string $sql, array $params): array
{
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll();
}

// Toutes les données personnelles d'un compte, prêtes à être renvoyées en JSON.
// Jamais le hash du mot de passe ni les jetons de réinitialisation. Les messages reçus ne sont pas
// inclus : ils appartiennent à leurs expéditeurs. Les fichiers eux-mêmes ne sont pas joints, seulement leurs noms.
function exporterDonnees(string $id): array
{
    $utilisateur = rgpdLignes(
        'SELECT id, identifiant, email, role, nom, prenom, date_naissance, lieu_naissance, pays_naissance,
                nationalite, telephone, adresse, photo_url, actif, totp_actif, derniere_connexion, created_at, updated_at
         FROM utilisateur WHERE id = :id',
        ['id' => $id]
    )[0] ?? throw new ApiException('Utilisateur introuvable', 404);
    $role = $utilisateur['role'];

    $eleve = null;
    if ($role === 'eleve') {
        $eleve = rgpdLignes(
            'SELECT e.numero_etudiant, c.nom AS classe, a.libelle AS annee_scolaire
             FROM eleve e
             LEFT JOIN classe c         ON c.id = e.classe_id
             LEFT JOIN annee_scolaire a ON a.id = c.annee_scolaire_id
             WHERE e.utilisateur_id = :id',
            ['id' => $id]
        )[0] ?? ['numero_etudiant' => null, 'classe' => null, 'annee_scolaire' => null];

        $eleve['notes'] = rgpdLignes(
            'SELECT m.nom AS matiere, ev.titre AS evaluation, ev.date_eval, ev.coefficient, ev.bareme,
                    n.valeur, n.absent, n.commentaire
             FROM note n
             JOIN evaluation ev ON ev.id = n.evaluation_id
             JOIN matiere m     ON m.id = ev.matiere_id
             WHERE n.eleve_id = :id
             ORDER BY ev.date_eval DESC',
            ['id' => $id]
        );
        $eleve['devoirs'] = rgpdLignes(
            'SELECT d.titre, m.nom AS matiere, d.type, d.donne_le, d.a_rendre_le, de.statut, de.fait_at,
                    de.rendu_at, de.commentaire_eleve, de.note, de.appreciation, de.corrige_at
             FROM devoir_eleve de
             JOIN devoir d  ON d.id = de.devoir_id
             JOIN matiere m ON m.id = d.matiere_id
             WHERE de.eleve_id = :id
             ORDER BY d.donne_le DESC',
            ['id' => $id]
        );
        $eleve['fichiers_rendus'] = rgpdLignes(
            'SELECT d.titre AS devoir, f.nom, f.depose_at
             FROM devoir_rendu_fichier f
             JOIN devoir d ON d.id = f.devoir_id
             WHERE f.eleve_id = :id
             ORDER BY f.depose_at DESC',
            ['id' => $id]
        );
        $eleve['absences'] = rgpdLignes(
            'SELECT date_absence, type, duree_heures, minutes_retard, libelle, justifie, motif,
                    (justificatif_url IS NOT NULL) AS justificatif_depose, created_at
             FROM absence
             WHERE eleve_id = :id
             ORDER BY date_absence DESC',
            ['id' => $id]
        );
    }

    $professeur = null;
    if ($role === 'professeur') {
        $professeur = [
            'matieres' => rgpdLignes(
                'SELECT m.code, m.nom
                 FROM professeur_matiere pm JOIN matiere m ON m.id = pm.matiere_id
                 WHERE pm.professeur_id = :id
                 ORDER BY m.nom',
                ['id' => $id]
            ),
            'cours' => rgpdLignes(
                'SELECT co.debut, co.fin, co.annule, co.commentaire, cl.nom AS classe, m.nom AS matiere
                 FROM cours co
                 JOIN classe cl ON cl.id = co.classe_id
                 JOIN matiere m ON m.id = co.matiere_id
                 WHERE co.professeur_id = :id
                 ORDER BY co.debut DESC',
                ['id' => $id]
            ),
            'devoirs_donnes' => rgpdLignes(
                'SELECT d.titre, d.type, d.description, d.donne_le, d.a_rendre_le, cl.nom AS classe, m.nom AS matiere
                 FROM devoir d
                 JOIN classe cl ON cl.id = d.classe_id
                 JOIN matiere m ON m.id = d.matiere_id
                 WHERE d.professeur_id = :id
                 ORDER BY d.donne_le DESC',
                ['id' => $id]
            ),
            'evaluations' => rgpdLignes(
                'SELECT ev.titre, ev.date_eval, ev.coefficient, ev.bareme, ev.periode, cl.nom AS classe, m.nom AS matiere
                 FROM evaluation ev
                 JOIN classe cl ON cl.id = ev.classe_id
                 JOIN matiere m ON m.id = ev.matiere_id
                 WHERE ev.professeur_id = :id
                 ORDER BY ev.date_eval DESC',
                ['id' => $id]
            ),
            'ressources' => rgpdLignes(
                'SELECT r.titre, r.type, r.contenu, r.url, r.created_at, cl.nom AS classe, m.nom AS matiere
                 FROM ressource r
                 JOIN classe cl ON cl.id = r.classe_id
                 JOIN matiere m ON m.id = r.matiere_id
                 WHERE r.professeur_id = :id
                 ORDER BY r.created_at DESC',
                ['id' => $id]
            ),
        ];
    }

    // Messages envoyés par le compte, avec les noms de leurs pièces jointes
    $messages = rgpdLignes(
        'SELECT id, conversation_id, contenu, envoye_at, modifie_at, supprime
         FROM message
         WHERE expediteur_id = :id
         ORDER BY envoye_at DESC',
        ['id' => $id]
    );
    $piecesJointes = [];
    foreach (rgpdLignes(
        'SELECT pj.message_id, pj.nom
         FROM message_piece_jointe pj JOIN message m ON m.id = pj.message_id
         WHERE m.expediteur_id = :id',
        ['id' => $id]
    ) as $piece) {
        $piecesJointes[$piece['message_id']][] = $piece['nom'];
    }
    foreach ($messages as &$message) {
        $message['pieces_jointes'] = $piecesJointes[$message['id']] ?? [];
    }
    unset($message);

    return [
        'genere_le'           => date(DATE_ATOM),
        'utilisateur'         => $utilisateur,
        'eleve'               => $eleve,
        'professeur'          => $professeur,
        'actualites_ecrites'  => rgpdLignes(
            'SELECT titre, contenu, publique, publie_at, created_at
             FROM actualite WHERE auteur_id = :id ORDER BY created_at DESC',
            ['id' => $id]
        ),
        'conversations'       => rgpdLignes(
            'SELECT c.titre, c.est_groupe, cp.dernier_lu_at
             FROM conversation_participant cp JOIN conversation c ON c.id = cp.conversation_id
             WHERE cp.utilisateur_id = :id
             ORDER BY c.created_at DESC',
            ['id' => $id]
        ),
        'messages_envoyes'    => $messages,
        'notifications'       => rgpdLignes(
            'SELECT type, titre, lien, lue_at, created_at
             FROM notification WHERE utilisateur_id = :id ORDER BY created_at DESC',
            ['id' => $id]
        ),
        'documents'           => rgpdLignes(
            'SELECT d.titre, t.nom AS espace, d.created_at
             FROM document d JOIN type_document t ON t.id = d.type_document_id
             WHERE d.utilisateur_id = :id
             ORDER BY d.created_at DESC',
            ['id' => $id]
        ),
        // Les demandes du formulaire de contact n'ont pas de lien avec le compte : on les retrouve par l'e-mail
        'demandes_contact'    => rgpdLignes(
            'SELECT nom, prenom, email, telephone, sujet, message, traitee, created_at
             FROM demande_contact WHERE email = :email ORDER BY created_at DESC',
            ['email' => $utilisateur['email']]
        ),
        'reinitialisations_mdp' => rgpdLignes(
            'SELECT created_at, expire_at, utilise_at
             FROM reinitialisation_mdp WHERE utilisateur_id = :id ORDER BY created_at DESC',
            ['id' => $id]
        ),
        'journal_connexions'  => rgpdLignes(
            'SELECT created_at, reussie, motif, ip, user_agent
             FROM journal_connexion WHERE utilisateur_id = :id ORDER BY created_at DESC',
            ['id' => $id]
        ),
    ];
}

// Réponse JSON lisible, proposée en téléchargement (le front peut aussi la lire avec fetch)
function reponseExport(ResponseInterface $response, array $export, string $nomFichier): ResponseInterface
{
    $response->getBody()->write(json_encode(
        $export,
        JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE | JSON_THROW_ON_ERROR
    ));
    return $response
        ->withHeader('Content-Type', 'application/json')
        ->withHeader('Content-Disposition', 'attachment; filename="' . $nomFichier . '"');
}

// Supprime ou anonymise les données d'un compte, dans une transaction. Renvoie un bilan.
//
// Le compte (ligne utilisateur) est ANONYMISÉ et non supprimé : d'autres lignes le référencent sans ON DELETE
// (messages envoyés, actualités écrites, absences saisies, cours / devoirs / évaluations d'un professeur,
// documents déposés…) et appartiennent à l'établissement ou aux autres utilisateurs.
// Tout ce qui ne concerne que la personne est supprimé.
function effacerDonnees(string $id): array
{
    $fichiers = [];

    $bilan = transaction(function (PDO $pdo) use ($id, &$fichiers) {
        // Verrouille le compte pendant l'opération
        $stmt = $pdo->prepare('SELECT email, photo_url FROM utilisateur WHERE id = :id FOR UPDATE');
        $stmt->execute(['id' => $id]);
        $compte = $stmt->fetch();
        if (!$compte) {
            throw new ApiException('Utilisateur introuvable', 404);
        }
        if (str_ends_with(strtolower($compte['email']), '@' . DOMAINE_ANONYME)) {
            throw new ApiException('Les données de ce compte ont déjà été supprimées', 409);
        }

        // Fichiers à effacer du disque, une fois la base validée
        $requetesFichiers = [
            'SELECT url FROM devoir_rendu_fichier WHERE eleve_id = :id',
            'SELECT justificatif_url FROM absence WHERE eleve_id = :id AND justificatif_url IS NOT NULL',
            'SELECT url FROM document WHERE utilisateur_id = :id',
            'SELECT pj.url FROM message_piece_jointe pj JOIN message m ON m.id = pj.message_id WHERE m.expediteur_id = :id',
        ];
        foreach ($requetesFichiers as $sql) {
            $stmt = $pdo->prepare($sql);
            $stmt->execute(['id' => $id]);
            array_push($fichiers, ...$stmt->fetchAll(PDO::FETCH_COLUMN));
        }
        if ($compte['photo_url'] !== null) {
            $fichiers[] = $compte['photo_url'];
        }

        // Données propres à la personne : supprimées.
        // Pour un élève : notes, suivi des devoirs (et fichiers rendus, en cascade), absences, puis sa fiche élève
        // (numéro d'étudiant, classe). Les notes et absences ne servent à personne d'autre.
        $supprime = [];
        $suppressions = [
            'notes'              => 'DELETE FROM note WHERE eleve_id = :id',
            'devoirs'            => 'DELETE FROM devoir_eleve WHERE eleve_id = :id',
            'absences'           => 'DELETE FROM absence WHERE eleve_id = :id',
            'fiche_eleve'        => 'DELETE FROM eleve WHERE utilisateur_id = :id',
            'pieces_jointes'     => 'DELETE FROM message_piece_jointe WHERE message_id IN (SELECT id FROM message WHERE expediteur_id = :id)',
            'notifications'      => 'DELETE FROM notification WHERE utilisateur_id = :id',
            // Les actualités publiées restent à l'établissement ; un brouillon, que personne n'a vu, part avec son auteur
            'brouillons'         => 'DELETE FROM actualite WHERE auteur_id = :id AND publie_at IS NULL AND NOT publique',
            'documents'          => 'DELETE FROM document WHERE utilisateur_id = :id',
            'reinitialisations'  => 'DELETE FROM reinitialisation_mdp WHERE utilisateur_id = :id',
            'journal_connexions' => 'DELETE FROM journal_connexion WHERE utilisateur_id = :id',
        ];
        foreach ($suppressions as $nom => $sql) {
            $stmt = $pdo->prepare($sql);
            $stmt->execute(['id' => $id]);
            $supprime[$nom] = $stmt->rowCount();
        }

        // Demandes du formulaire de contact : liées à la personne par son e-mail seulement
        $stmt = $pdo->prepare('DELETE FROM demande_contact WHERE email = :email');
        $stmt->execute(['email' => $compte['email']]);
        $supprime['demandes_contact'] = $stmt->rowCount();

        // Il reste dans les conversations, mais sans trace de ce qu'il a lu
        $stmt = $pdo->prepare('UPDATE conversation_participant SET dernier_lu_at = NULL WHERE utilisateur_id = :id');
        $stmt->execute(['id' => $id]);

        // Le compte devient « Utilisateur supprimé », désactivé, avec un mot de passe que personne ne connaît.
        // Les lignes qui le référencent (messages, actualités…) restent, attribuées à ce compte anonyme.
        $sansTirets = str_replace('-', '', $id);
        $stmt = $pdo->prepare(
            'UPDATE utilisateur
             SET identifiant = :identifiant, email = :email, mot_de_passe_hash = :hash,
                 nom = :nom, prenom = :prenom, date_naissance = NULL, lieu_naissance = NULL,
                 pays_naissance = NULL, nationalite = NULL, telephone = NULL, adresse = NULL,
                 photo_url = NULL, actif = false, totp_actif = false, totp_secret = NULL,
                 totp_dernier_pas = NULL, derniere_connexion = NULL
             WHERE id = :id'
        );
        $stmt->execute([
            'identifiant' => 'supprime-' . $sansTirets,
            'email'       => 'supprime-' . $sansTirets . '@' . DOMAINE_ANONYME,
            'hash'        => password_hash(bin2hex(random_bytes(32)), PASSWORD_DEFAULT),
            'nom'         => 'supprimé',
            'prenom'      => 'Utilisateur',
            'id'          => $id,
        ]);

        return $supprime;
    });

    foreach ($fichiers as $url) {
        supprimerFichier($url);
    }

    return ['supprime' => $bilan, 'fichiers_supprimes' => count($fichiers)];
}

// ---------------------------------------------------------------------
// GET /api/auth/me/export : l'utilisateur connecté télécharge toutes ses données personnelles (JSON)
// ---------------------------------------------------------------------
$group->get('/auth/me/export', function (ServerRequestInterface $request, ResponseInterface $response) {
    return reponseExport($response, exporterDonnees(moi()), 'mes-donnees-iris-space.json');
})->add(requireConnecte());
