<?php

declare(strict_types=1);

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

// ---------------------------------------------------------------------
// GET /api/admin/contacts?traitee=true|false&limit=&offset= : demandes de contact, les plus récentes d'abord
// ---------------------------------------------------------------------
$group->get('/admin/contacts', function (ServerRequestInterface $request, ResponseInterface $response) {
    $query   = $request->getQueryParams();
    $limite  = limite($query) ?? 50;
    $offset  = entier($query, 'offset') ?? 0;
    $traitee = booleen($query, 'traitee'); // null = toutes les demandes

    if ($offset < 0) {
        throw new ApiException('Le paramètre « offset » doit être positif', 400);
    }

    $where = $traitee === null ? '' : ($traitee ? 'WHERE d.traitee' : 'WHERE NOT d.traitee');

    $stmt = db()->prepare(
        "SELECT d.id, d.nom, d.prenom, d.email, d.telephone, d.sujet, d.message,
                d.traitee, d.traitee_par, (u.prenom || ' ' || u.nom) AS traitee_par_nom, d.created_at
         FROM demande_contact d
         LEFT JOIN utilisateur u ON u.id = d.traitee_par
         $where
         ORDER BY d.created_at DESC
         LIMIT :limite OFFSET :offset"
    );
    $stmt->bindValue(':limite', $limite, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $contacts = $stmt->fetchAll();

    $total = (int) db()->query("SELECT count(*) FROM demande_contact d $where")->fetchColumn();

    return json($response, ['contacts' => $contacts, 'total' => $total]);
})->add(requireRole('administrateur', 'direction'));

// ---------------------------------------------------------------------
// PATCH /api/admin/contacts/{id} : marquer une demande comme traitée (ou la rouvrir)
// Corps : { "traitee": true | false }
// ---------------------------------------------------------------------
$group->patch('/admin/contacts/{id:' . UUID . '}', function (ServerRequestInterface $request, ResponseInterface $response, array $args) {
    $traitee = booleen(corps($request), 'traitee');
    if ($traitee === null) {
        throw new ApiException('Le champ « traitee » est requis', 400);
    }

    // On mémorise qui a traité la demande ; en la rouvrant, on efface cette trace
    $stmt = db()->prepare(
        'UPDATE demande_contact
         SET traitee = CAST(:traitee AS boolean), traitee_par = :par
         WHERE id = :id
         RETURNING id, nom, prenom, email, telephone, sujet, message, traitee, traitee_par, created_at'
    );
    $stmt->execute([
        'traitee' => $traitee ? 'true' : 'false',
        'par'     => $traitee ? moi() : null,
        'id'      => $args['id'],
    ]);
    $contact = $stmt->fetch();

    if (!$contact) {
        throw new ApiException('Demande introuvable', 404);
    }

    return json($response, ['contact' => $contact]);
})->add(requireRole('administrateur', 'direction'));