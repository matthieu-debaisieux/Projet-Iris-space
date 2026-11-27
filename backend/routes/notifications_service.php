<?php

declare(strict_types=1);

// ---------------------------------------------------------------------
// ENVOI DE NOTIFICATIONS (NTF-01)
// Fonctions à appeler depuis les routes : elles écrivent dans la table notification, que le
// front lit avec GET /api/notifications (routes/notifications.php).
//
//   notifier($ids, 'devoir', 'Nouveau devoir en Mathématiques', '/devoirs', exclure: moi());
//   notifierClasse($classeId, 'note', 'Nouvelle note en Mathématiques', '/notes');
//   notifierConversation($conversationId, 'message', 'Nouveau message de Jeanne Martin', '/messages', moi());
//   notifierCours($coursId, 'systeme', 'Cours annulé : Mathématiques du 12/12', '/emploi-du-temps');
//   notifierTous('actualite', 'Nouvelle actualité : Portes ouvertes', '/actualites', moi());
//
// Toutes renvoient le nombre de notifications créées et ne lèvent jamais d'erreur à cause de la
// base : une notification ratée ne doit pas faire échouer l'action de l'utilisateur (un message
// envoyé, une note saisie…). L'erreur est écrite dans le journal PHP (error_log). Appeler ces
// fonctions APRÈS l'écriture principale, de préférence une fois la transaction validée.
// ---------------------------------------------------------------------

// Types de la liste type_notification (init_database.sql)
const TYPES_NOTIFICATION = ['systeme', 'actualite', 'absence', 'note', 'devoir', 'message'];

// Insère une notification non lue pour chaque destinataire.
//   $destinataires : ids (uuid) d'utilisateurs. Les doublons, les ids invalides, les comptes
//                    désactivés ou supprimés sont ignorés.
//   $type          : un des TYPES_NOTIFICATION (une autre valeur est une erreur de code : exception)
//   $titre         : texte affiché dans la cloche (coupé à 200 caractères)
//   $lien          : page du front à ouvrir au clic ('/devoirs'), ou null
//   $exclure       : id (ou liste d'ids) à ne pas notifier, en général l'auteur de l'action : moi()
function notifier(array $destinataires, string $type, string $titre, ?string $lien = null, array|string|null $exclure = null): int
{
    if (!in_array($type, TYPES_NOTIFICATION, true)) {
        throw new InvalidArgumentException("Type de notification inconnu : $type");
    }
    if ($lien !== null && !preg_match('#^(https?://\S+|/(?!/)\S*)$#', $lien)) {
        throw new InvalidArgumentException("Lien de notification invalide : $lien");
    }

    $titre = trim($titre);
    if ($titre === '') {
        throw new InvalidArgumentException('Une notification a besoin d\'un titre');
    }
    if (mb_strlen($titre) > 200) {
        $titre = mb_substr($titre, 0, 199) . '…';
    }

    $exclus = array_map('strtolower', array_map('strval', (array) $exclure));
    $ids = [];
    foreach ($destinataires as $id) {
        $id = strtolower((string) $id);
        if (preg_match('/^' . UUID . '$/', $id) && !in_array($id, $exclus, true)) {
            $ids[$id] = $id; // clé = id : supprime les doublons
        }
    }
    if ($ids === []) {
        return 0;
    }

    $pdo = db();
    // Dans une transaction, une requête en échec annule tout : un point de sauvegarde isole
    // l'échec de la notification du reste de la transaction
    $dansTransaction = $pdo->inTransaction();
    try {
        if ($dansTransaction) {
            $pdo->exec('SAVEPOINT notifier');
        }
        // Les ids ont été validés (uuid) : le tableau PostgreSQL '{id1,id2}' est sûr
        $stmt = $pdo->prepare(
            'INSERT INTO notification (utilisateur_id, type, titre, lien)
             SELECT u.id, CAST(:type AS type_notification), :titre, :lien
             FROM utilisateur u
             WHERE u.id = ANY (CAST(:ids AS uuid[])) AND u.actif'
        );
        $stmt->execute([
            'type'  => $type,
            'titre' => $titre,
            'lien'  => $lien,
            'ids'   => '{' . implode(',', $ids) . '}',
        ]);
        if ($dansTransaction) {
            $pdo->exec('RELEASE SAVEPOINT notifier');
        }
        return $stmt->rowCount();
    } catch (PDOException $e) {
        if ($dansTransaction) {
            $pdo->exec('ROLLBACK TO SAVEPOINT notifier');
        }
        error_log('Notification non créée : ' . $e->getMessage());
        return 0;
    }
}

// Même chose que notifier(), sous un nom explicite à côté de notifierClasse() et des autres
function notifierUtilisateurs(array $ids, string $type, string $titre, ?string $lien = null, array|string|null $exclure = null): int
{
    return notifier($ids, $type, $titre, $lien, $exclure);
}

// Ids d'une requête qui renvoie une colonne : lecture des destinataires, sans jamais lever
// d'erreur (voir plus haut)
function destinatairesDe(string $sql, array $params): array
{
    try {
        $stmt = db()->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_COLUMN);
    } catch (PDOException $e) {
        error_log('Destinataires de notification introuvables : ' . $e->getMessage());
        return [];
    }
}

// Tous les élèves d'une classe (id de la table classe)
function notifierClasse(int $classeId, string $type, string $titre, ?string $lien = null, array|string|null $exclure = null): int
{
    $ids = destinatairesDe('SELECT utilisateur_id FROM eleve WHERE classe_id = :classe', ['classe' => $classeId]);
    return notifier($ids, $type, $titre, $lien, $exclure);
}

// Tous les participants d'une conversation. Pour un nouveau message, passer l'expéditeur en
// $exclure (moi()) : il ne se notifie pas lui-même.
function notifierConversation(string $conversationId, string $type, string $titre, ?string $lien = null, array|string|null $exclure = null): int
{
    $ids = destinatairesDe(
        'SELECT utilisateur_id FROM conversation_participant WHERE conversation_id = :conversation',
        ['conversation' => $conversationId]
    );
    return notifier($ids, $type, $titre, $lien, $exclure);
}

// Les élèves de la classe d'un cours et son professeur (cours annulé ou déplacé)
function notifierCours(string $coursId, string $type, string $titre, ?string $lien = null, array|string|null $exclure = null): int
{
    $ids = destinatairesDe(
        'SELECT e.utilisateur_id FROM cours c JOIN eleve e ON e.classe_id = c.classe_id WHERE c.id = :cours
         UNION
         SELECT c.professeur_id FROM cours c WHERE c.id = :cours_prof',
        ['cours' => $coursId, 'cours_prof' => $coursId]
    );
    return notifier($ids, $type, $titre, $lien, $exclure);
}

// Tous les comptes actifs (annonce générale, actualité publiée)
function notifierTous(string $type, string $titre, ?string $lien = null, array|string|null $exclure = null): int
{
    $ids = destinatairesDe('SELECT id FROM utilisateur WHERE actif', []);
    return notifier($ids, $type, $titre, $lien, $exclure);
}
