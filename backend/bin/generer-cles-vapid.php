<?php

// Génère les clés VAPID des notifications push (PWA-04). Une seule fois par serveur :
//   php bin/generer-cles-vapid.php
// puis copier les deux lignes dans le .env du serveur. Changer de clés désabonne tout le monde.
// Avec Docker : docker compose exec api php bin/generer-cles-vapid.php

declare(strict_types=1);

$cle = openssl_pkey_new(['curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC]);
$ec = openssl_pkey_get_details($cle)['ec'];
$encoder = fn (string $o) => rtrim(strtr(base64_encode($o), '+/', '-_'), '=');

echo 'VAPID_PUBLIC_KEY=' . $encoder("\x04" . str_pad($ec['x'], 32, "\0", STR_PAD_LEFT) . str_pad($ec['y'], 32, "\0", STR_PAD_LEFT)) . PHP_EOL;
echo 'VAPID_PRIVATE_KEY=' . $encoder(str_pad($ec['d'], 32, "\0", STR_PAD_LEFT)) . PHP_EOL;
echo 'VAPID_SUBJECT=mailto:admin@iris-space.fr' . PHP_EOL;
