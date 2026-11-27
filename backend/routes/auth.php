<?php

declare(strict_types=1);

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

$group->post('/auth/login', function (ServerRequestInterface $request, ResponseInterface $response) {
    // 1. Lire le JSON envoyé
    $data = corps($request);
    $identifiant = $data['identifiant'] ?? '';
    $motDePasse  = $data['mot_de_passe'] ?? '';

    // 2. Si un champ est vide (ou n'est pas du texte) → 400
    if (!is_string($identifiant) || !is_string($motDePasse)
        || trim($identifiant) === '' || $motDePasse === '') {
        throw new ApiException('Identifiant et mot de passe sont requis', 400);
    }

    $identifiant = trim($identifiant);

    // 3. Chercher l'utilisateur par identifiant ou par email (deux paramètres : piège PDO)
    $stmt = db()->prepare(
        'SELECT id, identifiant, email, mot_de_passe_hash, role, nom, prenom, photo_url, actif,
                totp_actif, totp_secret, totp_dernier_pas
         FROM utilisateur
         WHERE identifiant = :login OR email = :login2'
    );
    $stmt->execute(['login' => $identifiant, 'login2' => $identifiant]);
    $user = $stmt->fetch();

    // 4. SEC-02 : vérifier la limite d'échecs sur les 15 dernières minutes avant de vérifier le mot de passe
    $blocage = secondesBlocageConnexion($request, $identifiant, $user['id'] ?? null);
    if ($blocage > 0) {
        return reponseTropDeTentatives($response, $blocage);
    }

    // 5. Si pas trouvé OU mauvais mot de passe → 401 (même message : on ne révèle pas si le compte existe)
    if (!$user || !password_verify($motDePasse, $user['mot_de_passe_hash'])) {
        // Journal des connexions (RGPD) : le motif précis n'est pas renvoyé au client, seulement noté
        journaliserConnexion($request, $identifiant, $user['id'] ?? null, $user ? 'mot_de_passe_incorrect' : 'identifiant_inconnu');
        throw new ApiException('Identifiant ou mot de passe incorrect', 401);
    }

    // 6. Si le compte n'est pas actif → 403
    if (!$user['actif']) {
        journaliserConnexion($request, $identifiant, $user['id'], 'compte_desactive');
        throw new ApiException('Ce compte est désactivé', 403);
    }

    // 7. SEC-03 : si la double authentification TOTP est activée, ne pas ouvrir la session tout de suite
    if ($user['totp_actif']
        && in_array($user['role'], ROLES_DOUBLE_AUTHENTIFICATION, true)
        && is_string($user['totp_secret'])
        && $user['totp_secret'] !== '') {
        session_regenerate_id(true);
        $_SESSION = [
            'auth_2fa_user_id'     => $user['id'],
            'auth_2fa_identifiant' => $identifiant,
            'auth_2fa_expire_at'   => time() + CONNEXION_2FA_ATTENTE_SECONDES,
            'auth_2fa_essais'      => 0,
        ];

        return json($response, [
            'double_authentification_requise' => true,
            'expire_dans'                     => CONNEXION_2FA_ATTENTE_SECONDES,
        ]);
    }

    // 8. Connexion OK : ouvrir la session et renvoyer l'utilisateur
    return ouvrirSession($request, $response, $user, $identifiant);
});

// SEC-03 : étape 2 de la connexion avec double authentification TOTP
$group->post('/auth/2fa/verifier', function (ServerRequestInterface $request, ResponseInterface $response) {
    $code = codeDoubleAuthentification(corps($request));

    $userId = $_SESSION['auth_2fa_user_id'] ?? null;
    $expireAt = (int) ($_SESSION['auth_2fa_expire_at'] ?? 0);
    if (!is_string($userId) || $userId === '' || time() > $expireAt) {
        // Ne touche pas à une session déjà ouverte : seules les données de l'étape 2 sont retirées
        unset($_SESSION['auth_2fa_user_id'], $_SESSION['auth_2fa_identifiant'], $_SESSION['auth_2fa_expire_at'], $_SESSION['auth_2fa_essais']);
        throw new ApiException('Session de vérification expirée. Veuillez vous reconnecter.', 401);
    }

    $stmt = db()->prepare(
        'SELECT id, identifiant, email, mot_de_passe_hash, role, nom, prenom, photo_url, actif,
                totp_actif, totp_secret, totp_dernier_pas
         FROM utilisateur
         WHERE id = :id'
    );
    $stmt->execute(['id' => $userId]);
    $user = $stmt->fetch();

    if (!$user || !$user['actif'] || !$user['totp_actif']
        || !is_string($user['totp_secret']) || $user['totp_secret'] === ''
        || !in_array($user['role'], ROLES_DOUBLE_AUTHENTIFICATION, true)) {
        $_SESSION = [];
        throw new ApiException('Session de vérification invalide. Veuillez vous reconnecter.', 401);
    }

    $identifiantSaisi = (string) ($_SESSION['auth_2fa_identifiant'] ?? $user['identifiant']);
    $blocage = secondesBlocageConnexion($request, $identifiantSaisi, $user['id']);
    if ($blocage > 0) {
        $_SESSION = [];
        return reponseTropDeTentatives($response, $blocage);
    }

    $dernierPas = $user['totp_dernier_pas'] !== null ? (int) $user['totp_dernier_pas'] : null;
    $pas = totpVerifier($user['totp_secret'], $code, $dernierPas);

    if ($pas === null) {
        $_SESSION['auth_2fa_essais'] = (int) ($_SESSION['auth_2fa_essais'] ?? 0) + 1;
        journaliserConnexion($request, $identifiantSaisi, $user['id'], 'code_2fa_incorrect');

        if ($_SESSION['auth_2fa_essais'] >= CONNEXION_ECHECS_MAX) {
            $_SESSION = [];
            return json($response, ['error' => 'Trop de tentatives. Veuillez vous reconnecter.'], 429);
        }

        throw new ApiException('Code de double authentification invalide', 401);
    }

    $stmt = db()->prepare('UPDATE utilisateur SET totp_dernier_pas = :pas WHERE id = :id');
    $stmt->execute(['pas' => $pas, 'id' => $user['id']]);

    return ouvrirSession($request, $response, $user, $identifiantSaisi);
});

// SEC-03 : gestion de la double authentification depuis le profil (rôles éligibles uniquement)
$group->group('/auth/2fa', function ($group) {
    $group->post('/preparer', function (ServerRequestInterface $request, ResponseInterface $response) {
        $stmt = db()->prepare('SELECT identifiant, email, totp_actif FROM utilisateur WHERE id = :id');
        $stmt->execute(['id' => moi()]);
        $user = $stmt->fetch();

        if (!$user) {
            throw new ApiException('Utilisateur introuvable', 404);
        }
        if ($user['totp_actif']) {
            throw new ApiException('La double authentification est déjà activée', 409);
        }

        $secret = totpGenererSecret();
        $_SESSION['totp_en_attente'] = [
            'user_id' => moi(),
            'secret'  => $secret,
            'cree_at' => time(),
        ];

        $compte = $user['email'] ?: $user['identifiant'];

        return json($response, [
            'secret'      => $secret,
            'otpauth_url' => totpUrl($secret, $compte, EMETTEUR_2FA),
        ]);
    });

    $group->post('/confirmer', function (ServerRequestInterface $request, ResponseInterface $response) {
        $code = codeDoubleAuthentification(corps($request));
        $attente = $_SESSION['totp_en_attente'] ?? null;

        if (!is_array($attente)
            || ($attente['user_id'] ?? null) !== moi()
            || !is_string($attente['secret'] ?? null)
            || (time() - (int) ($attente['cree_at'] ?? 0)) > 900) {
            unset($_SESSION['totp_en_attente']);
            throw new ApiException("Aucune activation en cours. Recommencez l'opération.", 400);
        }

        $stmt = db()->prepare('SELECT totp_actif FROM utilisateur WHERE id = :id');
        $stmt->execute(['id' => moi()]);
        if ($stmt->fetchColumn()) {
            unset($_SESSION['totp_en_attente']);
            throw new ApiException('La double authentification est déjà activée', 409);
        }

        $pas = totpVerifier($attente['secret'], $code);
        if ($pas === null) {
            throw new ApiException("Code invalide. Vérifiez l'heure de votre appareil et réessayez.", 400);
        }

        $stmt = db()->prepare(
            'UPDATE utilisateur
             SET totp_actif = true, totp_secret = :secret, totp_dernier_pas = :pas
             WHERE id = :id'
        );
        $stmt->execute([
            'secret' => $attente['secret'],
            'pas'    => $pas,
            'id'     => moi(),
        ]);

        unset($_SESSION['totp_en_attente']);
        session_regenerate_id(true);

        return json($response, [
            'message'    => 'Double authentification activée',
            'totp_actif' => true,
        ]);
    });

    $group->post('/desactiver', function (ServerRequestInterface $request, ResponseInterface $response) {
        $data = corps($request);
        $motDePasse = $data['mot_de_passe'] ?? null; // pas de trim : les espaces font partie du mot de passe
        if (!is_string($motDePasse) || $motDePasse === '') {
            throw new ApiException('Le champ « mot_de_passe » est requis', 400);
        }

        $stmt = db()->prepare('SELECT mot_de_passe_hash, totp_actif FROM utilisateur WHERE id = :id');
        $stmt->execute(['id' => moi()]);
        $user = $stmt->fetch();

        if (!$user) {
            throw new ApiException('Utilisateur introuvable', 404);
        }
        if (!$user['totp_actif']) {
            throw new ApiException("La double authentification n'est pas activée", 400);
        }
        if (!password_verify($motDePasse, $user['mot_de_passe_hash'])) {
            throw new ApiException('Mot de passe incorrect', 400);
        }

        $stmt = db()->prepare(
            'UPDATE utilisateur
             SET totp_actif = false, totp_secret = NULL, totp_dernier_pas = NULL
             WHERE id = :id'
        );
        $stmt->execute(['id' => moi()]);

        unset($_SESSION['totp_en_attente']);
        session_regenerate_id(true);

        return json($response, [
            'message'    => 'Double authentification désactivée',
            'totp_actif' => false,
        ]);
    });
})->add(requireRole(...ROLES_DOUBLE_AUTHENTIFICATION));

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

    // 4. Renvoyer l'utilisateur (même format que /auth/login, SANS le champ actif), avec ses droits
    unset($user['actif']);
    $user['droits'] = droitsPourRole($user['role']);

    $response->getBody()->write(json_encode(['user' => $user]));
    return $response->withHeader('Content-Type', 'application/json');
});

// Profil détaillé de l'utilisateur connecté, adapté à son rôle (élève, professeur, admin/direction)
$group->get('/profil', function (ServerRequestInterface $request, ResponseInterface $response) {
    $stmt = db()->prepare(
        'SELECT id, identifiant, email, role, nom, prenom, date_naissance, lieu_naissance,
                pays_naissance, nationalite, telephone, adresse, photo_url, totp_actif,
                derniere_connexion, created_at
         FROM utilisateur
         WHERE id = :id'
    );
    $stmt->execute(['id' => moi()]);
    $profil = $stmt->fetch();

    if (!$profil) {
        throw new ApiException('Utilisateur introuvable', 404);
    }

    $profil['totp_actif'] = (bool) $profil['totp_actif'];

    if ($profil['role'] === 'eleve') {
        $stmt = db()->prepare(
            'SELECT e.numero_etudiant, e.classe_id, c.nom AS classe, a.libelle AS annee_scolaire
             FROM eleve e
             LEFT JOIN classe c         ON c.id = e.classe_id
             LEFT JOIN annee_scolaire a ON a.id = c.annee_scolaire_id
             WHERE e.utilisateur_id = :id'
        );
        $stmt->execute(['id' => moi()]);
        $profil += $stmt->fetch() ?: [
            'numero_etudiant' => null,
            'classe_id'       => null,
            'classe'          => null,
            'annee_scolaire'  => null,
        ];
    } elseif ($profil['role'] === 'professeur') {
        $stmt = db()->prepare(
            'SELECT m.id, m.code, m.nom
             FROM professeur_matiere pm
             JOIN matiere m ON m.id = pm.matiere_id
             WHERE pm.professeur_id = :id
             ORDER BY m.nom'
        );
        $stmt->execute(['id' => moi()]);
        $profil['matieres'] = $stmt->fetchAll();

        $stmt = db()->prepare(
            'SELECT DISTINCT c.id, c.nom
             FROM cours co
             JOIN classe c ON c.id = co.classe_id
             WHERE co.professeur_id = :id
             ORDER BY c.nom'
        );
        $stmt->execute(['id' => moi()]);
        $profil['classes'] = $stmt->fetchAll();
    }

    return json($response, ['profil' => $profil]);
})->add(requireConnecte());
