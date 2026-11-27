<?php

declare(strict_types=1);

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

// ---------------------------------------------------------------------
// PUT /api/auth/mot-de-passe : changer son mot de passe (connecté)
// Corps : { "ancien_mot_de_passe": "...", "nouveau_mot_de_passe": "..." }
// ---------------------------------------------------------------------
$group->put('/auth/mot-de-passe', function (ServerRequestInterface $request, ResponseInterface $response) {
    $data   = corps($request);
    $ancien = $data['ancien_mot_de_passe'] ?? null; // pas de texte() : un mot de passe ne se « trim » pas
    if (!is_string($ancien) || $ancien === '') {
        throw new ApiException('Le champ « ancien_mot_de_passe » est requis', 400);
    }
    $nouveau = motDePasse($data, 'nouveau_mot_de_passe');
    if ($ancien === $nouveau) {
        throw new ApiException("Le nouveau mot de passe doit être différent de l'ancien", 400);
    }

    $stmt = db()->prepare('SELECT mot_de_passe_hash FROM utilisateur WHERE id = :id');
    $stmt->execute(['id' => moi()]);
    $hash = $stmt->fetchColumn();

    if (!is_string($hash) || !password_verify($ancien, $hash)) {
        throw new ApiException('Ancien mot de passe incorrect', 400);
    }

    transaction(function (PDO $pdo) use ($nouveau) {
        $stmt = $pdo->prepare('UPDATE utilisateur SET mot_de_passe_hash = :hash WHERE id = :id');
        $stmt->execute(['hash' => password_hash($nouveau, PASSWORD_DEFAULT), 'id' => moi()]);

        // Les liens de réinitialisation encore valides n'ont plus de raison d'être
        $stmt = $pdo->prepare(
            'UPDATE reinitialisation_mdp SET utilise_at = now()
             WHERE utilisateur_id = :id AND utilise_at IS NULL'
        );
        $stmt->execute(['id' => moi()]);
    });

    session_regenerate_id(true);

    return json($response, ['message' => 'Mot de passe modifié']);
})->add(requireConnecte());

// ---------------------------------------------------------------------
// POST /api/auth/mot-de-passe-oublie : demander un lien de réinitialisation (public)
// Corps : { "identifiant": "identifiant ou e-mail" }
// Même réponse que le compte existe ou non, pour ne pas révéler les comptes.
// ---------------------------------------------------------------------
$group->post('/auth/mot-de-passe-oublie', function (ServerRequestInterface $request, ResponseInterface $response) {
    $data        = corps($request);
    $identifiant = texte($data, 'identifiant', 255) ?? texte($data, 'email', 255);
    if ($identifiant === null) {
        throw new ApiException('Identifiant ou e-mail requis', 400);
    }

    $reponse = ['message' => 'Si ce compte existe, un lien de réinitialisation vient de lui être envoyé.'];

    $stmt = db()->prepare(
        'SELECT id, email FROM utilisateur
         WHERE (identifiant = :login OR email = :login) AND actif'
    );
    $stmt->execute(['login' => $identifiant]);
    $user = $stmt->fetch();

    if ($user) {
        // Le jeton en clair part dans le lien ; seule son empreinte est stockée en base
        $token = bin2hex(random_bytes(32));

        transaction(function (PDO $pdo) use ($user, $token) {
            // Un seul lien valide à la fois : on invalide les précédents
            $stmt = $pdo->prepare(
                'UPDATE reinitialisation_mdp SET utilise_at = now()
                 WHERE utilisateur_id = :id AND utilise_at IS NULL'
            );
            $stmt->execute(['id' => $user['id']]);

            $stmt = $pdo->prepare(
                "INSERT INTO reinitialisation_mdp (utilisateur_id, token_hash, expire_at)
                 VALUES (:id, :hash, now() + interval '1 hour')"
            );
            $stmt->execute(['id' => $user['id'], 'hash' => hash('sha256', $token)]);
        });

        $base = rtrim((string) (getenv('APP_URL') ?: 'http://localhost'), '/');
        $lien = $base . '/reinitialiser-mot-de-passe?token=' . $token;

        if (appEnDev()) {
            // Dev uniquement (APP_ENV=dev) : pas d'e-mail, on renvoie le lien pour pouvoir tester
            $reponse['lien_dev'] = $lien;
        } else {
            envoyerEmailReinitialisation((string) $user['email'], $lien);
        }
    }

    return json($response, $reponse);
});

// ---------------------------------------------------------------------
// POST /api/auth/reinitialiser-mot-de-passe : choisir un nouveau mot de passe avec le jeton (public)
// Corps : { "token": "...", "nouveau_mot_de_passe": "..." }
// ---------------------------------------------------------------------
$group->post('/auth/reinitialiser-mot-de-passe', function (ServerRequestInterface $request, ResponseInterface $response) {
    $data    = corps($request);
    $token   = texte($data, 'token', 200, true);
    $nouveau = motDePasse($data, 'nouveau_mot_de_passe');

    transaction(function (PDO $pdo) use ($token, $nouveau) {
        // Un seul UPDATE vérifie le jeton ET le consomme : impossible de l'utiliser deux fois
        $stmt = $pdo->prepare(
            'UPDATE reinitialisation_mdp SET utilise_at = now()
             WHERE token_hash = :hash AND utilise_at IS NULL AND expire_at > now()
             RETURNING utilisateur_id'
        );
        $stmt->execute(['hash' => hash('sha256', $token)]);
        $userId = $stmt->fetchColumn();

        if ($userId === false) {
            throw new ApiException('Lien invalide ou expiré', 400);
        }

        $stmt = $pdo->prepare('UPDATE utilisateur SET mot_de_passe_hash = :hash WHERE id = :id AND actif');
        $stmt->execute(['hash' => password_hash($nouveau, PASSWORD_DEFAULT), 'id' => $userId]);

        if ($stmt->rowCount() === 0) { // compte désactivé entre-temps
            throw new ApiException('Lien invalide ou expiré', 400);
        }

        // Les autres liens encore valides de ce compte sont invalidés
        $stmt = $pdo->prepare(
            'UPDATE reinitialisation_mdp SET utilise_at = now()
             WHERE utilisateur_id = :id AND utilise_at IS NULL'
        );
        $stmt->execute(['id' => $userId]);
    });

    return json($response, ['message' => 'Mot de passe modifié. Vous pouvez vous connecter.']);
});