<?php

declare(strict_types=1);

// =====================================================================
// NOTIFICATIONS PUSH (PWA-04, côté back) — après la bêta (décision D5)
//
// Chaque notification créée par notifier() part aussi en push sur les téléphones et
// navigateurs abonnés, si les clés VAPID sont configurées. Sans clés, rien ne change.
//
// Protocole Web Push sans bibliothèque : chiffrement du message (RFC 8291, aes128gcm)
// et authentification du serveur (VAPID, RFC 8292), avec l'extension openssl de PHP.
//
// Variables d'environnement :
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY   générées par : php bin/generer-cles-vapid.php
//   VAPID_SUBJECT                          contact pour les services push, ex. mailto:admin@iris-space.fr
//   PUSH_HOTES_AUTORISES                   facultatif : services push acceptés (voir hotesPushAutorises)
//
// Côté front (PWA-05, Thomas) : le service worker s'abonne avec la clé de GET /api/push/cle-publique,
// envoie l'abonnement à POST /api/push/abonnements, et affiche { titre, lien, type } reçu dans l'événement « push ».
// =====================================================================

const PUSH_TTL_SECONDES = 86400;   // un téléphone éteint reçoit le message s'il se rallume dans les 24 h
const PUSH_DELAI_HTTP   = 5;       // secondes par envoi

function pushConfigure(): bool
{
    return (string) getenv('VAPID_PUBLIC_KEY') !== '' && (string) getenv('VAPID_PRIVATE_KEY') !== '';
}

function base64UrlEncoder(string $octets): string
{
    return rtrim(strtr(base64_encode($octets), '+/', '-_'), '=');
}

function base64UrlDecoder(string $texte): string|false
{
    return base64_decode(strtr($texte, '-_', '+/') . str_repeat('=', (4 - strlen($texte) % 4) % 4), true);
}

// Services push des navigateurs. Le serveur envoie une requête à l'adresse donnée par le navigateur :
// on n'accepte que ces hôtes, pour que personne ne puisse faire appeler une adresse interne.
function hotesPushAutorises(): array
{
    $hotes = getenv('PUSH_HOTES_AUTORISES');
    if ($hotes !== false && trim($hotes) !== '') {
        return array_values(array_filter(array_map('trim', explode(',', $hotes))));
    }
    return [
        'fcm.googleapis.com',                 // Chrome, Edge (Android et ordinateur)
        'updates.push.services.mozilla.com',  // Firefox
        'web.push.apple.com',                 // Safari (iPhone, Mac)
        '.notify.windows.com',                // Edge ancien (un point au début = sous-domaines)
        '.push.apple.com',
    ];
}

function endpointPushValide(string $endpoint): bool
{
    $morceaux = parse_url($endpoint);
    if (!$morceaux || empty($morceaux['host'])) {
        return false;
    }
    // http seulement en dev, pour tester avec un faux service push local
    $schema = $morceaux['scheme'] ?? '';
    if ($schema !== 'https' && !($schema === 'http' && appEnDev())) {
        return false;
    }
    $hote = strtolower($morceaux['host']);
    foreach (hotesPushAutorises() as $autorise) {
        $autorise = strtolower($autorise);
        if ($hote === $autorise || (str_starts_with($autorise, '.') && str_ends_with($hote, $autorise))) {
            return true;
        }
    }
    return false;
}

// ---------------------------------------------------------------------
// CLÉS EC P-256
// ---------------------------------------------------------------------

// Point public non compressé (65 octets : 0x04 || x || y) d'une clé openssl
function pointPublic(OpenSSLAsymmetricKey $cle): string
{
    $ec = openssl_pkey_get_details($cle)['ec'];
    return "\x04" . str_pad($ec['x'], 32, "\0", STR_PAD_LEFT) . str_pad($ec['y'], 32, "\0", STR_PAD_LEFT);
}

// Clé publique openssl à partir d'un point non compressé de 65 octets
function clePubliqueDepuisPoint(string $point): OpenSSLAsymmetricKey|false
{
    if (strlen($point) !== 65 || $point[0] !== "\x04") {
        return false;
    }
    $der = hex2bin('3059301306072a8648ce3d020106082a8648ce3d030107034200') . $point;
    $pem = "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($der), 64, "\n") . "-----END PUBLIC KEY-----\n";
    return openssl_pkey_get_public($pem);
}

// Clé privée VAPID à partir de VAPID_PRIVATE_KEY (d, 32 octets) et VAPID_PUBLIC_KEY (point, 65 octets)
function clePriveeVapid(): OpenSSLAsymmetricKey
{
    $d = base64UrlDecoder((string) getenv('VAPID_PRIVATE_KEY'));
    $point = base64UrlDecoder((string) getenv('VAPID_PUBLIC_KEY'));
    if ($d === false || strlen($d) !== 32 || $point === false || strlen($point) !== 65) {
        throw new RuntimeException('VAPID_PUBLIC_KEY ou VAPID_PRIVATE_KEY invalide : relancer bin/generer-cles-vapid.php');
    }
    // ECPrivateKey (RFC 5915) en DER
    $der = hex2bin('30770201010420') . $d . hex2bin('a00a06082a8648ce3d030107a144034200') . $point;
    $pem = "-----BEGIN EC PRIVATE KEY-----\n" . chunk_split(base64_encode($der), 64, "\n") . "-----END EC PRIVATE KEY-----\n";
    $cle = openssl_pkey_get_private($pem);
    if ($cle === false) {
        throw new RuntimeException('Clé privée VAPID illisible');
    }
    return $cle;
}

// Signature ECDSA DER → format JWT (r || s, 64 octets)
function signatureBrute(string $der): string
{
    $position = 3;
    $longueurR = ord($der[$position]);
    $r = substr($der, $position + 1, $longueurR);
    $position += 2 + $longueurR;
    $longueurS = ord($der[$position]);
    $s = substr($der, $position + 1, $longueurS);
    return str_pad(ltrim($r, "\0"), 32, "\0", STR_PAD_LEFT) . str_pad(ltrim($s, "\0"), 32, "\0", STR_PAD_LEFT);
}

// En-tête Authorization VAPID pour un service push (RFC 8292)
function enteteVapid(string $endpoint): string
{
    $morceaux = parse_url($endpoint);
    $audience = $morceaux['scheme'] . '://' . $morceaux['host'] . (isset($morceaux['port']) ? ':' . $morceaux['port'] : '');
    $entete = base64UrlEncoder(json_encode(['typ' => 'JWT', 'alg' => 'ES256']));
    $contenu = base64UrlEncoder(json_encode([
        'aud' => $audience,
        'exp' => time() + 12 * 3600,
        'sub' => (string) (getenv('VAPID_SUBJECT') ?: 'mailto:admin@iris-space.fr'),
    ]));
    openssl_sign("$entete.$contenu", $signature, clePriveeVapid(), OPENSSL_ALGO_SHA256);
    return 'vapid t=' . "$entete.$contenu." . base64UrlEncoder(signatureBrute($signature))
        . ', k=' . getenv('VAPID_PUBLIC_KEY');
}

// ---------------------------------------------------------------------
// CHIFFREMENT DU MESSAGE (RFC 8291, aes128gcm)
// ---------------------------------------------------------------------

// Renvoie le corps binaire à envoyer au service push. $p256dh et $auth viennent de l'abonnement.
function chiffrerPush(string $message, string $p256dh, string $auth): string
{
    $clientPublic = base64UrlDecoder($p256dh);
    $secretAuth   = base64UrlDecoder($auth);
    $cleClient    = $clientPublic === false ? false : clePubliqueDepuisPoint($clientPublic);
    if ($cleClient === false || $secretAuth === false || strlen($secretAuth) !== 16) {
        throw new RuntimeException('Clés d\'abonnement invalides');
    }

    // Clé éphémère du serveur, nouvelle à chaque message
    $cleServeur = openssl_pkey_new(['curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC]);
    $serveurPublic = pointPublic($cleServeur);
    $secretPartage = openssl_pkey_derive($cleClient, $cleServeur, 32);

    // IKM = HKDF(auth, secret partagé, "WebPush: info" || clé client || clé serveur)
    $ikm = hash_hkdf('sha256', $secretPartage, 32, "WebPush: info\0" . $clientPublic . $serveurPublic, $secretAuth);
    $sel = random_bytes(16);
    $cle   = hash_hkdf('sha256', $ikm, 16, "Content-Encoding: aes128gcm\0", $sel);
    $nonce = hash_hkdf('sha256', $ikm, 12, "Content-Encoding: nonce\0", $sel);

    // Un seul enregistrement : le message suivi du délimiteur 0x02
    $chiffre = openssl_encrypt($message . "\x02", 'aes-128-gcm', $cle, OPENSSL_RAW_DATA, $nonce, $tag);

    // En-tête : sel (16) || taille d'enregistrement (4) || longueur de l'id (1) || clé publique du serveur (65)
    return $sel . pack('N', 4096) . chr(65) . $serveurPublic . $chiffre . $tag;
}

// Envoie un message à un abonnement. Renvoie le code HTTP du service push (0 si injoignable).
function envoyerPush(array $abonnement, array $donnees): int
{
    $corps = chiffrerPush(json_encode($donnees), $abonnement['p256dh'], $abonnement['auth']);
    $contexte = stream_context_create(['http' => [
        'method'        => 'POST',
        'header'        => implode("\r\n", [
            'Content-Type: application/octet-stream',
            'Content-Encoding: aes128gcm',
            'Content-Length: ' . strlen($corps),
            'TTL: ' . PUSH_TTL_SECONDES,
            'Urgency: normal',
            'Authorization: ' . enteteVapid($abonnement['endpoint']),
        ]),
        'content'       => $corps,
        'timeout'       => PUSH_DELAI_HTTP,
        'ignore_errors' => true, // lire le code même en cas d'erreur HTTP
        'follow_location' => 0,
    ]]);
    $reponse = @file_get_contents($abonnement['endpoint'], false, $contexte);
    $entetes = $http_response_header ?? [];
    if ($reponse === false && $entetes === []) {
        return 0;
    }
    return preg_match('#^HTTP/\S+\s+(\d{3})#', $entetes[0] ?? '', $m) ? (int) $m[1] : 0;
}

// ---------------------------------------------------------------------
// FILE D'ENVOI : les notifications créées pendant la requête partent à la fin,
// une fois la transaction validée (une notification annulée par un ROLLBACK n'existe plus en base).
// ---------------------------------------------------------------------

function mettreEnFilePush(array $notificationIds): void
{
    static $enregistre = false;
    if (!pushConfigure() || $notificationIds === []) {
        return;
    }
    $GLOBALS['iris_push_en_attente'] = array_merge($GLOBALS['iris_push_en_attente'] ?? [], $notificationIds);
    if (!$enregistre) {
        $enregistre = true;
        register_shutdown_function('envoyerPushEnAttente');
    }
}

function envoyerPushEnAttente(): void
{
    $ids = $GLOBALS['iris_push_en_attente'] ?? [];
    $GLOBALS['iris_push_en_attente'] = [];
    if ($ids === []) {
        return;
    }
    if (function_exists('fastcgi_finish_request')) {
        fastcgi_finish_request(); // la réponse part avant les envois (PHP-FPM)
    }

    try {
        $stmt = db()->prepare(
            'SELECT n.titre, n.lien, n.type, a.id AS abonnement_id, a.endpoint, a.p256dh, a.auth
             FROM notification n
             JOIN push_abonnement a ON a.utilisateur_id = n.utilisateur_id
             WHERE n.id = ANY(CAST(:ids AS uuid[]))'
        );
        $stmt->execute(['ids' => '{' . implode(',', $ids) . '}']);

        foreach ($stmt->fetchAll() as $envoi) {
            try {
                $code = envoyerPush($envoi, ['titre' => $envoi['titre'], 'lien' => $envoi['lien'], 'type' => $envoi['type']]);
            } catch (Throwable $e) {
                error_log('[Iris Space] Push non envoyé : ' . $e->getMessage());
                continue;
            }
            if ($code === 404 || $code === 410) {
                // Abonnement expiré ou retiré par le navigateur : on l'oublie
                db()->prepare('DELETE FROM push_abonnement WHERE id = :id')->execute(['id' => $envoi['abonnement_id']]);
            } elseif ($code >= 200 && $code < 300) {
                db()->prepare('UPDATE push_abonnement SET dernier_envoi_at = now() WHERE id = :id')->execute(['id' => $envoi['abonnement_id']]);
            } else {
                error_log("[Iris Space] Push refusé par le service ($code) : " . parse_url($envoi['endpoint'], PHP_URL_HOST));
            }
        }
    } catch (Throwable $e) {
        error_log('[Iris Space] Envoi des push impossible : ' . $e->getMessage());
    }
}
