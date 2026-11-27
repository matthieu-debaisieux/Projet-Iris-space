<?php

declare(strict_types=1);

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

$group->post('/auth/login', function (ServerRequestInterface $request, ResponseInterface $response) {
    // 1. Lire le JSON envoyé
    $data = $request->getParsedBody();
    $identifiant = $data['identifiant'] ?? '';
    $motDePasse  = $data['mot_de_passe'] ?? '';


    // 2. Si un champ est vide (ou n'est pas du texte) → 400
    if (!is_string($identifiant) || !is_string($motDePasse)
        || trim($identifiant) === '' || trim($motDePasse) === '') {
        $response->getBody()->write(json_encode(['error' => 'Identifiant et mot de passe sont requis']));
        return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
    }

    // 3. Chercher l'utilisateur par identifiant ou par email (requête préparée : pas d'injection SQL)
    $stmt = db()->prepare(
        'SELECT id, identifiant, email, mot_de_passe_hash, role, nom, prenom, photo_url, actif, totp_active_at
         FROM utilisateur
         WHERE identifiant = :login OR email = :login'
    );
    $identifiant = trim($identifiant);
    $stmt->execute(['login' => $identifiant]);
    $user = $stmt->fetch();

    // 4. Trop d'échecs récents pour ce compte ou cette IP → 429 (SEC-02).
    //    Même réponse que le compte existe ou non.
    verifierBlocage('mot_de_passe', $identifiant, $user['id'] ?? null);

    // 5. Si pas trouvé OU mauvais mot de passe → 401 (même message : on ne révèle pas si le compte existe)
    if (!$user || !password_verify($motDePasse, $user['mot_de_passe_hash'])) {
        enregistrerTentative('mot_de_passe', $identifiant, $user['id'] ?? null, false);
        $response->getBody()->write(json_encode(['error' => 'Identifiant ou mot de passe incorrect']));
        return $response->withStatus(401)->withHeader('Content-Type', 'application/json');
    }

    // 6. Si le compte n'est pas actif → 403
    if (!$user['actif']) {
        $response->getBody()->write(json_encode(['error' => 'Ce compte est désactivé']));
        return $response->withStatus(403)->withHeader('Content-Type', 'application/json');
    }

    enregistrerTentative('mot_de_passe', $identifiant, $user['id'], true);

    // 7. Double authentification activée : la session ne s'ouvre qu'après le code (SEC-03),
    //    avec POST /api/auth/double-authentification/verifier
    if ($user['totp_active_at'] !== null) {
        session_regenerate_id(true);
        $_SESSION = ['double_auth_en_attente' => [
            'id'     => $user['id'],
            'expire' => time() + DOUBLE_AUTH_DELAI_MINUTES * 60,
        ]];
        $response->getBody()->write(json_encode(['double_authentification' => true]));
        return $response->withHeader('Content-Type', 'application/json');
    }

    // 8. Connexion OK : enregistrer en session, mettre à jour derniere_connexion
    ouvrirSession($user);

    // 9. Renvoyer l'utilisateur (SANS le hash ni le champ actif).
    //    double_authentification_a_configurer : le front envoie vers la page de configuration (SEC-03).
    $aConfigurer = doubleAuthObligatoire($user['role']);
    unset($user['mot_de_passe_hash'], $user['actif'], $user['totp_active_at']);

    $response->getBody()->write(json_encode([
        'user' => $user,
        'double_authentification_a_configurer' => $aConfigurer,
    ]));
    return $response->withHeader('Content-Type', 'application/json');
});

$group->post('/auth/logout', function (ServerRequestInterface $request, ResponseInterface $response) {
    // 1. Vider la session côté serveur
    $_SESSION = [];

    // 2. Supprimer le cookie de session côté navigateur
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', [
            'expires'  => time() - 42000,
            'path'     => $params['path'],
            'domain'   => $params['domain'],
            'secure'   => $params['secure'],
            'httponly' => $params['httponly'],
            'samesite' => $params['samesite'],
        ]);
    }

    // 3. Détruire la session (on répond 204 même si personne n'était connecté)
    session_destroy();

    return $response->withStatus(204);
});

$group->get('/auth/me', function (ServerRequestInterface $request, ResponseInterface $response) {
    // 1. Pas de session → 401
    if (empty($_SESSION['user_id'])) {
        $response->getBody()->write(json_encode(['error' => 'Non connecté']));
        return $response->withStatus(401)->withHeader('Content-Type', 'application/json');
    }

    // 2. Relire l'utilisateur en base (le compte a pu être modifié ou désactivé depuis la connexion)
    $stmt = db()->prepare(
        'SELECT id, identifiant, email, role, nom, prenom, photo_url, actif
         FROM utilisateur
         WHERE id = :id'
    );
    $stmt->execute(['id' => $_SESSION['user_id']]);
    $user = $stmt->fetch();

    // 3. Compte supprimé ou désactivé → on ferme la session et 401
    if (!$user || !$user['actif']) {
        $_SESSION = [];
        session_destroy();
        $response->getBody()->write(json_encode(['error' => 'Non connecté']));
        return $response->withStatus(401)->withHeader('Content-Type', 'application/json');
    }

    // 4. Renvoyer l'utilisateur (même format que /auth/login, SANS le champ actif)
    unset($user['actif']);

    $response->getBody()->write(json_encode(['user' => $user]));
    return $response->withHeader('Content-Type', 'application/json');
});
