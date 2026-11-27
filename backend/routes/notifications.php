<?php

declare(strict_types=1);

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

// ---------------------------------------------------------------------
// GET /api/notifications?limit=&non_lues=true : mes notifications, les plus récentes d'abord
// ---------------------------------------------------------------------
$group->get('/notifications', function (ServerRequestInterface $request, ResponseInterface $response) {
    $query   = $request->getQueryParams();
    $limite  = limite($query) ?? 20;
    $nonLues = booleen($query, 'non_lues', false);

    $sql = 'SELECT id, type, titre, lien, lue_at, (lue_at IS NOT NULL) AS lue, created_at
            FROM notification
            WHERE utilisateur_id = :id';
    if ($nonLues) {
        $sql .= ' AND lue_at IS NULL';
    }
    $sql .= ' ORDER BY created_at DESC LIMIT :limite';

    $stmt = db()->prepare($sql);
    $stmt->bindValue(':id', moi());
    $stmt->bindValue(':limite', $limite, PDO::PARAM_INT);
    $stmt->execute();
    $notifications = $stmt->fetchAll();

    // Compteur total de non lues (pour une pastille), indépendant de la limite
    $stmt = db()->prepare('SELECT count(*) FROM notification WHERE utilisateur_id = :id AND lue_at IS NULL');
    $stmt->execute(['id' => moi()]);

    return json($response, [
        'notifications' => $notifications,
        'non_lues'      => (int) $stmt->fetchColumn(),
    ]);
})->add(requireConnecte());

// ---------------------------------------------------------------------
// POST /api/notifications/tout-lire : tout marquer comme lu
// ---------------------------------------------------------------------
$group->post('/notifications/tout-lire', function (ServerRequestInterface $request, ResponseInterface $response) {
    $stmt = db()->prepare(
        'UPDATE notification SET lue_at = now()
         WHERE utilisateur_id = :id AND lue_at IS NULL'
    );
    $stmt->execute(['id' => moi()]);

    return json($response, ['marquees' => $stmt->rowCount()]);
})->add(requireConnecte());

// ---------------------------------------------------------------------
// PATCH /api/notifications/{id}/lue : marquer une notification comme lue
// ---------------------------------------------------------------------
$group->patch('/notifications/{id:' . UUID . '}/lue', function (ServerRequestInterface $request, ResponseInterface $response, array $args) {
    // utilisateur_id dans le WHERE : on ne peut marquer que ses propres notifications
    $stmt = db()->prepare(
        'UPDATE notification SET lue_at = COALESCE(lue_at, now())
         WHERE id = :id AND utilisateur_id = :user
         RETURNING id, type, titre, lien, lue_at, created_at'
    );
    $stmt->execute(['id' => $args['id'], 'user' => moi()]);
    $notification = $stmt->fetch();

    if (!$notification) {
        throw new ApiException('Notification introuvable', 404);
    }

    return json($response, ['notification' => $notification]);
})->add(requireConnecte());