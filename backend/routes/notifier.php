<?php

declare(strict_types=1);

// =====================================================================
// CRÉATION DES NOTIFICATIONS (NTF-01)
// Une seule fonction pour tout le back : notifier(). Les routes de lecture sont dans notifications.php.
// Si les clés VAPID sont configurées, chaque notification part aussi en push (PWA-04, push.php).
// À appeler dans la même transaction que la modification qui la déclenche, avec le même $pdo :
// si la modification échoue, la notification n'est pas créée.
//
// Types (enum type_notification) : message, devoir, note, absence, actualite, systeme.
// « lien » : chemin de la page du front à ouvrir au clic (/messages, /devoirs, /notes, /emploi-du-temps…).
// =====================================================================

// Crée une notification pour chacun des utilisateurs donnés. Renvoie le nombre créé.
// $saufNonLueIdentique : ne crée rien pour un utilisateur qui a déjà une notification non lue
// de même type et même lien (évite 10 notifications pour 10 messages d'une même conversation).
function notifier(PDO $pdo, array $utilisateurIds, string $type, string $titre, ?string $lien = null, bool $saufNonLueIdentique = false): int
{
    $utilisateurIds = array_values(array_unique(array_filter($utilisateurIds)));
    if ($utilisateurIds === []) {
        return 0;
    }

    $sql = 'INSERT INTO notification (utilisateur_id, type, titre, lien)
            SELECT u.id, CAST(:type AS type_notification), :titre, :lien
            FROM utilisateur u
            WHERE u.id = ANY(CAST(:ids AS uuid[])) AND u.actif';
    if ($saufNonLueIdentique) {
        $sql .= ' AND NOT EXISTS (
                    SELECT 1 FROM notification n
                    WHERE n.utilisateur_id = u.id AND n.lue_at IS NULL
                      AND n.type = CAST(:type2 AS type_notification) AND n.lien IS NOT DISTINCT FROM :lien2)';
    }

    $parametres = [
        'type'  => $type,
        'titre' => mb_substr($titre, 0, 200),
        'lien'  => $lien,
        'ids'   => '{' . implode(',', $utilisateurIds) . '}',
    ];
    if ($saufNonLueIdentique) {
        $parametres += ['type2' => $type, 'lien2' => $lien];
    }

    $stmt = $pdo->prepare($sql . ' RETURNING id');
    $stmt->execute($parametres);
    $ids = $stmt->fetchAll(PDO::FETCH_COLUMN);

    // Aussi en push sur les appareils abonnés, à la fin de la requête (PWA-04, voir push.php)
    mettreEnFilePush($ids);

    return count($ids);
}

// Tous les élèves d'une classe
function elevesDeLaClasse(PDO $pdo, int $classeId): array
{
    $stmt = $pdo->prepare('SELECT utilisateur_id FROM eleve WHERE classe_id = :classe');
    $stmt->execute(['classe' => $classeId]);
    return $stmt->fetchAll(PDO::FETCH_COLUMN);
}

// Cours annulé, déplacé ou modifié : prévient les élèves de la classe et le prof du cours.
// Pour EDT-01 (routes admin de l'emploi du temps) : appeler après l'UPDATE, dans la transaction.
//   notifierCours($pdo, $coursId, 'annulé');
//   notifierCours($pdo, $coursId, 'déplacé');
function notifierCours(PDO $pdo, string $coursId, string $changement): int
{
    $stmt = $pdo->prepare(
        "SELECT c.classe_id, c.professeur_id, m.nom AS matiere,
                to_char(c.debut AT TIME ZONE 'Europe/Paris', 'DD/MM à HH24\"h\"MI') AS quand
         FROM cours c JOIN matiere m ON m.id = c.matiere_id
         WHERE c.id = :id"
    );
    $stmt->execute(['id' => $coursId]);
    $cours = $stmt->fetch();
    if (!$cours) {
        return 0;
    }

    $destinataires = elevesDeLaClasse($pdo, (int) $cours['classe_id']);
    $destinataires[] = $cours['professeur_id'];

    return notifier(
        $pdo,
        $destinataires,
        'systeme',
        "{$cours['matiere']} : cours du {$cours['quand']} $changement",
        '/emploi-du-temps'
    );
}
