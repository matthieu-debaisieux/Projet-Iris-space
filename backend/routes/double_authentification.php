<?php

declare(strict_types=1);

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

// =====================================================================
// DOUBLE AUTHENTIFICATION (SEC-03)
// Code à 6 chiffres donné par une application (Google Authenticator, Microsoft Authenticator,
// FreeOTP…). Obligatoire pour les admins, la direction et les profs, sauf en dev (voir securite.php).
//
// Parcours côté front :
//  1. Configuration : POST …/configurer → afficher le QR code de « otpauth_url »
//     (et « secret » pour une saisie à la main), puis POST …/activer avec le premier code.
//  2. Connexion : si POST /auth/login répond { "double_authentification": true },
//     demander le code et l'envoyer à POST …/verifier, qui renvoie { user } comme le login.
// =====================================================================

// ---------------------------------------------------------------------
// GET /api/auth/double-authentification : état pour l'utilisateur connecté
// ---------------------------------------------------------------------
$group->get('/auth/double-authentification', function (ServerRequestInterface $request, ResponseInterface $response) {
    $stmt = db()->prepare('SELECT role, totp_active_at FROM utilisateur WHERE id = :id');
    $stmt->execute(['id' => moi()]);
    $user = $stmt->fetch();

    return json($response, [
        'active'      => $user['totp_active_at'] !== null,
        'active_le'   => $user['totp_active_at'],
        'obligatoire' => doubleAuthObligatoire($user['role']),
    ]);
})->add(requireConnecteSansDoubleAuth());

// ---------------------------------------------------------------------
// POST /api/auth/double-authentification/configurer : nouveau secret (pas encore actif)
// Réponse : { "secret": "BASE32…", "otpauth_url": "otpauth://totp/…" }
// Relancer cette route remplace le secret tant que la double authentification n'est pas activée.
// ---------------------------------------------------------------------
$group->post('/auth/double-authentification/configurer', function (ServerRequestInterface $request, ResponseInterface $response) {
    $secret = nouveauSecretTotp();

    $stmt = db()->prepare(
        'UPDATE utilisateur SET totp_secret = :secret, totp_dernier_pas = NULL
         WHERE id = :id AND totp_active_at IS NULL
         RETURNING identifiant'
    );
    $stmt->execute(['secret' => $secret, 'id' => moi()]);
    $identifiant = $stmt->fetchColumn();

    if ($identifiant === false) {
        throw new ApiException('La double authentification est déjà activée', 409);
    }

    return json($response, ['secret' => $secret, 'otpauth_url' => lienOtpauth($secret, $identifiant)]);
})->add(requireConnecteSansDoubleAuth());

// ---------------------------------------------------------------------
// POST /api/auth/double-authentification/activer : { "code": "123456" }
// Le premier code prouve que l'application est bien configurée.
// ---------------------------------------------------------------------
$group->post('/auth/double-authentification/activer', function (ServerRequestInterface $request, ResponseInterface $response) {
    $code = texte(corps($request), 'code', 20, true);

    verifierBlocage('double_auth', moi(), moi());

    $stmt = db()->prepare('SELECT totp_secret, totp_active_at FROM utilisateur WHERE id = :id');
    $stmt->execute(['id' => moi()]);
    $user = $stmt->fetch();

    if ($user['totp_active_at'] !== null) {
        throw new ApiException('La double authentification est déjà activée', 409);
    }
    if ($user['totp_secret'] === null) {
        throw new ApiException("Commencez par POST /api/auth/double-authentification/configurer", 400);
    }

    $pas = verifierCodeTotp($user['totp_secret'], $code, null);
    if ($pas === null) {
        enregistrerTentative('double_auth', moi(), moi(), false);
        throw new ApiException('Code incorrect. Vérifiez l\'heure de votre téléphone et réessayez.', 400);
    }
    enregistrerTentative('double_auth', moi(), moi(), true);

    $stmt = db()->prepare(
        'UPDATE utilisateur SET totp_active_at = now(), totp_dernier_pas = :pas WHERE id = :id RETURNING totp_active_at'
    );
    $stmt->execute(['pas' => $pas, 'id' => moi()]);

    return json($response, ['active' => true, 'active_le' => $stmt->fetchColumn()]);
})->add(requireConnecteSansDoubleAuth());

// ---------------------------------------------------------------------
// POST /api/auth/double-authentification/desactiver : { "mot_de_passe": "…" }
// Impossible quand elle est obligatoire pour le rôle (403) : l'admin peut la réinitialiser.
// ---------------------------------------------------------------------
$group->post('/auth/double-authentification/desactiver', function (ServerRequestInterface $request, ResponseInterface $response) {
    $motDePasse = corps($request)['mot_de_passe'] ?? null;
    if (!is_string($motDePasse) || $motDePasse === '') {
        throw new ApiException('Le champ « mot_de_passe » est requis', 400);
    }

    $stmt = db()->prepare('SELECT role, mot_de_passe_hash FROM utilisateur WHERE id = :id');
    $stmt->execute(['id' => moi()]);
    $user = $stmt->fetch();

    if (doubleAuthObligatoire($user['role'])) {
        throw new ApiException('La double authentification est obligatoire pour votre compte', 403);
    }
    if (!password_verify($motDePasse, $user['mot_de_passe_hash'])) {
        throw new ApiException('Mot de passe incorrect', 400);
    }

    $stmt = db()->prepare(
        'UPDATE utilisateur SET totp_secret = NULL, totp_active_at = NULL, totp_dernier_pas = NULL WHERE id = :id'
    );
    $stmt->execute(['id' => moi()]);

    return json($response, ['active' => false]);
})->add(requireConnecte());

// ---------------------------------------------------------------------
// POST /api/auth/double-authentification/verifier : { "code": "123456" }
// Deuxième étape de la connexion. 401 si le mot de passe n'a pas été saisi juste avant
// (ou il y a plus de 5 minutes), 429 après 5 codes faux.
// ---------------------------------------------------------------------
$group->post('/auth/double-authentification/verifier', function (ServerRequestInterface $request, ResponseInterface $response) {
    $code = texte(corps($request), 'code', 20, true);

    $attente = $_SESSION['double_auth_en_attente'] ?? null;
    if (!is_array($attente) || $attente['expire'] < time()) {
        unset($_SESSION['double_auth_en_attente']);
        throw new ApiException('Session expirée : saisissez à nouveau votre mot de passe', 401);
    }

    verifierBlocage('double_auth', $attente['id'], $attente['id']);

    $stmt = db()->prepare(
        'SELECT id, identifiant, email, role, nom, prenom, photo_url, actif, totp_secret, totp_dernier_pas
         FROM utilisateur WHERE id = :id AND totp_active_at IS NOT NULL'
    );
    $stmt->execute(['id' => $attente['id']]);
    $user = $stmt->fetch();

    if (!$user || !$user['actif']) {
        unset($_SESSION['double_auth_en_attente']);
        throw new ApiException('Session expirée : saisissez à nouveau votre mot de passe', 401);
    }

    $dernierPas = $user['totp_dernier_pas'] === null ? null : (int) $user['totp_dernier_pas'];
    $pas = verifierCodeTotp($user['totp_secret'], $code, $dernierPas);
    if ($pas === null) {
        enregistrerTentative('double_auth', $user['id'], $user['id'], false);
        throw new ApiException('Code incorrect', 401);
    }
    enregistrerTentative('double_auth', $user['id'], $user['id'], true);

    $stmt = db()->prepare('UPDATE utilisateur SET totp_dernier_pas = :pas WHERE id = :id');
    $stmt->execute(['pas' => $pas, 'id' => $user['id']]);

    ouvrirSession($user);

    unset($user['actif'], $user['totp_secret'], $user['totp_dernier_pas']);
    return json($response, ['user' => $user]);
});

// ---------------------------------------------------------------------
// DELETE /api/admin/utilisateurs/{id}/double-authentification : réinitialiser (téléphone perdu)
// L'utilisateur devra la configurer à nouveau à sa prochaine connexion.
// ---------------------------------------------------------------------
$group->delete('/admin/utilisateurs/{id:' . UUID . '}/double-authentification', function (ServerRequestInterface $request, ResponseInterface $response, array $args) {
    $stmt = db()->prepare(
        'UPDATE utilisateur SET totp_secret = NULL, totp_active_at = NULL, totp_dernier_pas = NULL
         WHERE id = :id RETURNING id'
    );
    $stmt->execute(['id' => $args['id']]);

    if ($stmt->fetchColumn() === false) {
        throw new ApiException('Utilisateur introuvable', 404);
    }

    return $response->withStatus(204);
})->add(requireRole('administrateur', 'direction'));
