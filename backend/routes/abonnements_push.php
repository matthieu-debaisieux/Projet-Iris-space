<?php

declare(strict_types=1);

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

// =====================================================================
// ABONNEMENTS AUX NOTIFICATIONS PUSH (PWA-04) — fonctions dans push.php
// =====================================================================

// GET /api/push/cle-publique : clé VAPID à passer à pushManager.subscribe({ applicationServerKey })
// 503 si le serveur n'a pas de clés (push désactivé) : le front n'affiche alors pas l'option.
$group->get('/push/cle-publique', function (ServerRequestInterface $request, ResponseInterface $response) {
    if (!pushConfigure()) {
        throw new ApiException('Notifications push non configurées sur ce serveur', 503);
    }
    return json($response, ['cle_publique' => getenv('VAPID_PUBLIC_KEY')]);
})->add(requireConnecte());

// POST /api/push/abonnements : corps = subscription.toJSON() du navigateur
//   { "endpoint": "https://…", "keys": { "p256dh": "…", "auth": "…" } }
// Un même endpoint (un navigateur) n'appartient qu'à un compte : le dernier connecté.
$group->post('/push/abonnements', function (ServerRequestInterface $request, ResponseInterface $response) {
    if (!pushConfigure()) {
        throw new ApiException('Notifications push non configurées sur ce serveur', 503);
    }
    $data = corps($request);
    $endpoint = texte($data, 'endpoint', 2000, true);
    $cles = is_array($data['keys'] ?? null) ? $data['keys'] : [];
    $p256dh = texte($cles, 'p256dh', 200, true);
    $auth   = texte($cles, 'auth', 100, true);

    if (!endpointPushValide($endpoint)) {
        throw new ApiException('Service de notifications non reconnu', 400);
    }
    $point = base64UrlDecoder($p256dh);
    $secret = base64UrlDecoder($auth);
    if ($point === false || clePubliqueDepuisPoint($point) === false || $secret === false || strlen($secret) !== 16) {
        throw new ApiException('Clés d\'abonnement invalides', 400);
    }

    $stmt = db()->prepare(
        'INSERT INTO push_abonnement (utilisateur_id, endpoint, p256dh, auth, user_agent)
         VALUES (:moi, :endpoint, :p256dh, :auth, :agent)
         ON CONFLICT (endpoint) DO UPDATE
           SET utilisateur_id = EXCLUDED.utilisateur_id, p256dh = EXCLUDED.p256dh,
               auth = EXCLUDED.auth, user_agent = EXCLUDED.user_agent
         RETURNING id, created_at'
    );
    $stmt->execute([
        'moi' => moi(), 'endpoint' => $endpoint, 'p256dh' => $p256dh, 'auth' => $auth,
        'agent' => mb_substr($request->getHeaderLine('User-Agent'), 0, 300) ?: null,
    ]);

    return json($response, ['abonnement' => $stmt->fetch()], 201);
})->add(requireConnecte());

// DELETE /api/push/abonnements : { "endpoint": "…" } — se désabonner sur ce navigateur (204)
$group->delete('/push/abonnements', function (ServerRequestInterface $request, ResponseInterface $response) {
    $endpoint = texte(corps($request), 'endpoint', 2000, true);
    $stmt = db()->prepare('DELETE FROM push_abonnement WHERE endpoint = :endpoint AND utilisateur_id = :moi');
    $stmt->execute(['endpoint' => $endpoint, 'moi' => moi()]);
    return $response->withStatus(204);
})->add(requireConnecte());
