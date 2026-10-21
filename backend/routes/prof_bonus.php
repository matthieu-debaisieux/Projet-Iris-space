<?php

declare(strict_types=1);

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

// ---------------------------------------------------------------------
// PATCH /api/prof/devoirs/{id}/eleves/{eleveId} : corriger le devoir d'un élève
// Corps : { "note": 14.5, "appreciation": "Bon travail" }
//   - au moins une des deux clés ; null efface la valeur
//   - la note ou l'appréciation doit rester renseignée après modification
// Le devoir doit être celui du professeur connecté. Le statut passe à « corrige ».
// ---------------------------------------------------------------------
$group->patch('/prof/devoirs/{id:' . UUID . '}/eleves/{eleveId:' . UUID . '}', function (ServerRequestInterface $request, ResponseInterface $response, array $args) {
    $data = corps($request);

    // array_key_exists : « clé absente » (on garde la valeur) ≠ « clé à null » (on efface)
    $aNote         = array_key_exists('note', $data);
    $aAppreciation = array_key_exists('appreciation', $data);
    if (!$aNote && !$aAppreciation) {
        throw new ApiException('Renseigne une note et/ou une appréciation', 400);
    }

    $note = nombre($data, 'note');
    if ($note !== null) {
        $note = round($note, 2);
        if ($note < 0 || $note > 999.99) { // numeric(5,2) en base
            throw new ApiException('La note doit être comprise entre 0 et 999,99', 400);
        }
    }
    $appreciation = texte($data, 'appreciation', 4000);

    $resultat = transaction(function (PDO $pdo) use ($args, $aNote, $aAppreciation, $note, $appreciation) {
        // Le JOIN sur d.professeur_id garantit que le devoir est bien celui de ce prof
        $stmt = $pdo->prepare(
            'SELECT de.note, de.appreciation
             FROM devoir_eleve de
             JOIN devoir d ON d.id = de.devoir_id
             WHERE de.devoir_id = :devoir AND de.eleve_id = :eleve AND d.professeur_id = :prof
             FOR UPDATE OF de'
        );
        $stmt->execute(['devoir' => $args['id'], 'eleve' => $args['eleveId'], 'prof' => moi()]);
        $actuel = $stmt->fetch();

        if (!$actuel) {
            throw new ApiException('Devoir ou élève introuvable', 404);
        }

        $noteFinale         = $aNote ? $note : decimal($actuel['note']);
        $appreciationFinale = $aAppreciation ? $appreciation : $actuel['appreciation'];

        if ($noteFinale === null && $appreciationFinale === null) {
            throw new ApiException('Une note ou une appréciation doit rester renseignée', 400);
        }

        $stmt = $pdo->prepare(
            "UPDATE devoir_eleve
             SET note = :note, appreciation = :appreciation, statut = 'corrige', corrige_at = now()
             WHERE devoir_id = :devoir AND eleve_id = :eleve
             RETURNING devoir_id, eleve_id, statut, note, appreciation, corrige_at"
        );
        $stmt->execute([
            'note'         => $noteFinale,
            'appreciation' => $appreciationFinale,
            'devoir'       => $args['id'],
            'eleve'        => $args['eleveId'],
        ]);
        return $stmt->fetch();
    });

    $resultat['note'] = decimal($resultat['note']);

    return json($response, ['devoir_eleve' => $resultat]);
})->add(requireRole('professeur'));