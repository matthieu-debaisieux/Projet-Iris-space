<?php

declare(strict_types=1);

// ---------------------------------------------------------------------
// TOTP (RFC 6238) : code à usage unique à 6 chiffres d'une application
// d'authentification (Google Authenticator, Microsoft Authenticator, FreeOTP…).
// SHA-1, pas de 30 secondes. Fonctions pures, sans base de données ni bibliothèque.
// ---------------------------------------------------------------------

const TOTP_PERIODE  = 30; // secondes par pas
const TOTP_CHIFFRES = 6;
const TOTP_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; // base32, RFC 4648

// Octets → base32 (sans « = » de remplissage, comme les applications d'authentification)
function base32Encode(string $octets): string
{
    $bits = '';
    foreach (str_split($octets) as $octet) {
        $bits .= str_pad(decbin(ord($octet)), 8, '0', STR_PAD_LEFT);
    }
    $texte = '';
    foreach (str_split($bits, 5) as $groupe) {
        $texte .= TOTP_ALPHABET[bindec(str_pad($groupe, 5, '0'))];
    }
    return $texte;
}

// base32 → octets ; false si le texte contient autre chose que A-Z et 2-7
// (espaces, tirets et « = » sont ignorés : la clé est souvent affichée par groupes de 4)
function base32Decode(string $texte): string|false
{
    $texte = strtoupper(preg_replace('/[\s=-]+/', '', $texte) ?? '');
    if ($texte === '' || strspn($texte, TOTP_ALPHABET) !== strlen($texte)) {
        return false;
    }
    $bits = '';
    foreach (str_split($texte) as $caractere) {
        $bits .= str_pad(decbin((int) strpos(TOTP_ALPHABET, $caractere)), 5, '0', STR_PAD_LEFT);
    }
    $octets = '';
    foreach (str_split($bits, 8) as $groupe) {
        if (strlen($groupe) === 8) { // les bits de fin qui ne font pas un octet entier sont du remplissage
            $octets .= chr(bindec($groupe));
        }
    }
    return $octets;
}

// Nouvelle clé secrète : 20 octets aléatoires (la taille de la clé SHA-1) en base32, soit 32 caractères
function totpGenererSecret(): string
{
    return base32Encode(random_bytes(20));
}

// Code à 6 chiffres du pas $pas (nombre de périodes de 30 s depuis 1970) pour une clé en octets
function totpCode(string $cle, int $pas): string
{
    $hmac = hash_hmac('sha1', pack('J', $pas), $cle, true); // J = entier 64 bits, gros-boutiste
    $decalage = ord($hmac[19]) & 0x0F;
    $nombre = ((ord($hmac[$decalage]) & 0x7F) << 24)
        | (ord($hmac[$decalage + 1]) << 16)
        | (ord($hmac[$decalage + 2]) << 8)
        | ord($hmac[$decalage + 3]);

    return str_pad((string) ($nombre % (10 ** TOTP_CHIFFRES)), TOTP_CHIFFRES, '0', STR_PAD_LEFT);
}

// Vérifie un code saisi (secret en base32). Accepte le pas courant et un pas avant / après
// (horloges du téléphone et du serveur légèrement décalées).
// $dernierPas : dernier pas déjà accepté pour ce compte ; un code d'un pas inférieur ou égal est refusé,
// pour qu'un même code ne serve pas deux fois (RFC 6238, § 5.2).
// Renvoie le pas accepté (à enregistrer comme nouveau « dernier pas »), ou null si le code est faux.
function totpVerifier(string $secretBase32, string $code, ?int $dernierPas = null, ?int $maintenant = null): ?int
{
    $cle = base32Decode($secretBase32);
    if ($cle === false || !preg_match('/^\d{' . TOTP_CHIFFRES . '}$/', $code)) {
        return null;
    }

    $pasCourant = intdiv($maintenant ?? time(), TOTP_PERIODE);
    $accepte = null;
    // Les trois pas sont toujours calculés (pas de sortie anticipée) : même durée que le code soit bon ou non
    foreach ([0, -1, 1] as $ecart) {
        $pas = $pasCourant + $ecart;
        $bon = hash_equals(totpCode($cle, $pas), $code);
        if ($bon && $accepte === null && ($dernierPas === null || $pas > $dernierPas)) {
            $accepte = $pas;
        }
    }
    return $accepte;
}

// Adresse otpauth:// à saisir ou à transformer en QR code dans l'application d'authentification
function totpUrl(string $secretBase32, string $compte, string $emetteur): string
{
    return 'otpauth://totp/' . rawurlencode($emetteur) . ':' . rawurlencode($compte)
        . '?secret=' . $secretBase32
        . '&issuer=' . rawurlencode($emetteur)
        . '&algorithm=SHA1&digits=' . TOTP_CHIFFRES . '&period=' . TOTP_PERIODE;
}
