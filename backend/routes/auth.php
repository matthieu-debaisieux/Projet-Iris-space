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
        'SELECT id, identifiant, email, mot_de_passe_hash, role, nom, prenom, photo_url, actif
         FROM utilisateur
         WHERE identifiant = :login OR email = :login'
    );
    $stmt->execute(['login' => trim($identifiant)]);
    $user = $stmt->fetch();

    // 4. Si pas trouvé OU mauvais mot de passe → 401 (même message : on ne révèle pas si le compte existe)
    if (!$user || !password_verify($motDePasse, $user['mot_de_passe_hash'])) {
        $response->getBody()->write(json_encode(['error' => 'Identifiant ou mot de passe incorrect']));
        return $response->withStatus(401)->withHeader('Content-Type', 'application/json');
    }

    // 5. Si le compte n'est pas actif → 403
    if (!$user['actif']) {
        $response->getBody()->write(json_encode(['error' => 'Ce compte est désactivé']));
        return $response->withStatus(403)->withHeader('Content-Type', 'application/json');
    }

    // 6. Connexion OK : enregistrer en session, mettre à jour derniere_connexion
    session_regenerate_id(true); // nouvel identifiant de session après connexion (sécurité)
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['role']    = $user['role'];

    $stmt = db()->prepare('UPDATE utilisateur SET derniere_connexion = now() WHERE id = :id');
    $stmt->execute(['id' => $user['id']]);

    // 7. Renvoyer l'utilisateur (SANS le hash ni le champ actif)
    unset($user['mot_de_passe_hash'], $user['actif']);

    $response->getBody()->write(json_encode(['user' => $user]));
    return $response->withHeader('Content-Type', 'application/json');
});
