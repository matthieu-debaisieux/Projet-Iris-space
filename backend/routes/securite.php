<?php

declare(strict_types=1);

// =====================================================================
// SÉCURITÉ DE LA CONNEXION
//  - SEC-02 : limite des tentatives (mot de passe et code de double authentification)
//  - SEC-03 : double authentification par application (TOTP, RFC 6238)
// Fonctions seulement : les routes sont dans auth.php et double_authentification.php.
// =====================================================================

// --- Réglages des blocages -------------------------------------------
const TENTATIVES_MAX_PAR_COMPTE = 5;   // échecs d'affilée sur un même identifiant…
const TENTATIVES_MAX_PAR_IP     = 20;  // …ou depuis une même adresse IP…
const DUREE_BLOCAGE_MINUTES     = 15;  // …dans cette fenêtre : blocage jusqu'à ce qu'elle soit passée

// --- Réglages de la double authentification ---------------------------
const TOTP_PERIODE  = 30; // secondes par code
const TOTP_CHIFFRES = 6;
const TOTP_FENETRE  = 1;  // tolère un code d'avance ou de retard (horloge du téléphone)
const DOUBLE_AUTH_DELAI_MINUTES = 5; // temps pour saisir le code après le mot de passe

// ---------------------------------------------------------------------
// ADRESSE IP DU CLIENT
// ---------------------------------------------------------------------

// Derrière nginx (Docker), REMOTE_ADDR est l'adresse du conteneur nginx : on lit alors
// l'en-tête X-Real-IP posé par nginx. On ne le croit QUE si la requête vient d'une adresse
// privée (le relais), sinon n'importe qui pourrait choisir son IP et contourner la limite.
function ipClient(): ?string
{
    $distante = $_SERVER['REMOTE_ADDR'] ?? null;
    if ($distante === null || filter_var($distante, FILTER_VALIDATE_IP) === false) {
        return null;
    }
    $estRelais = filter_var($distante, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false;
    $relayee   = $_SERVER['HTTP_X_REAL_IP'] ?? '';
    if ($estRelais && filter_var($relayee, FILTER_VALIDATE_IP) !== false) {
        return $relayee;
    }
    return $distante;
}

// ---------------------------------------------------------------------
// LIMITE DES TENTATIVES (SEC-02)
// ---------------------------------------------------------------------

// Lève une 429 si l'identifiant ou l'IP a trop d'échecs récents (fenêtre glissante de 15 minutes).
// Pour un compte, seuls comptent les échecs postérieurs à sa dernière réussite. Le compte est reconnu
// par ce qui a été saisi ET par son id : essayer l'e-mail après l'identifiant ne donne pas 5 essais de plus.
// À appeler AVANT de vérifier le mot de passe, que le compte existe ou non (sinon on révèle les comptes).
function verifierBlocage(string $type, string $identifiant, ?string $utilisateurId = null): void
{
    $stmt = db()->prepare(
        "SELECT count(*) AS echecs, min(created_at) AS plus_ancien
         FROM tentative_connexion
         WHERE type = :type AND NOT reussie
           AND (identifiant = :identifiant OR utilisateur_id = CAST(:utilisateur AS uuid))
           AND created_at > now() - make_interval(mins => :duree)
           AND created_at > COALESCE((SELECT max(created_at) FROM tentative_connexion
                                      WHERE type = :type2 AND reussie
                                        AND (identifiant = :identifiant2 OR utilisateur_id = CAST(:utilisateur2 AS uuid))),
                                     '-infinity')"
    );
    $stmt->execute([
        'type' => $type, 'type2' => $type,
        'identifiant' => $identifiant, 'identifiant2' => $identifiant,
        'utilisateur' => $utilisateurId, 'utilisateur2' => $utilisateurId,
        'duree' => DUREE_BLOCAGE_MINUTES,
    ]);
    $compte = $stmt->fetch();
    if ((int) $compte['echecs'] >= TENTATIVES_MAX_PAR_COMPTE) {
        refuserTentative($compte['plus_ancien']);
    }

    $ip = ipClient();
    if ($ip !== null) {
        $stmt = db()->prepare(
            'SELECT count(*) AS echecs, min(created_at) AS plus_ancien
             FROM tentative_connexion
             WHERE type = :type AND ip = CAST(:ip AS inet) AND NOT reussie
               AND created_at > now() - make_interval(mins => :duree)'
        );
        $stmt->execute(['type' => $type, 'ip' => $ip, 'duree' => DUREE_BLOCAGE_MINUTES]);
        $parIp = $stmt->fetch();
        if ((int) $parIp['echecs'] >= TENTATIVES_MAX_PAR_IP) {
            refuserTentative($parIp['plus_ancien']);
        }
    }
}

// 429 avec le temps d'attente : jusqu'à ce que le plus ancien échec compté sorte de la fenêtre
function refuserTentative(string $plusAncien): never
{
    $fin = (new DateTimeImmutable($plusAncien))->modify('+' . DUREE_BLOCAGE_MINUTES . ' minutes');
    $minutes = max(1, (int) ceil(($fin->getTimestamp() - time()) / 60));
    throw new ApiException("Trop de tentatives. Réessayez dans $minutes minute" . ($minutes > 1 ? 's' : '') . '.', 429);
}

function enregistrerTentative(string $type, string $identifiant, ?string $utilisateurId, bool $reussie): void
{
    $stmt = db()->prepare(
        'INSERT INTO tentative_connexion (type, identifiant, utilisateur_id, ip, reussie)
         VALUES (:type, :identifiant, :utilisateur, CAST(:ip AS inet), :reussie)'
    );
    $stmt->execute([
        'type'        => $type,
        'identifiant' => mb_substr($identifiant, 0, 255),
        'utilisateur' => $utilisateurId,
        'ip'          => ipClient(),
        'reussie'     => $reussie ? 'true' : 'false',
    ]);
}

// ---------------------------------------------------------------------
// DOUBLE AUTHENTIFICATION (SEC-03)
// ---------------------------------------------------------------------

// Rôles concernés. Variable DOUBLE_AUTH_ROLES (liste séparée par des virgules) pour en changer :
// ajouter « eleve » suffit pour étendre aux élèves (SEC-07, après la bêta).
function rolesDoubleAuth(): array
{
    $roles = getenv('DOUBLE_AUTH_ROLES');
    if ($roles === false || trim($roles) === '') {
        return ['administrateur', 'direction', 'professeur'];
    }
    return array_values(array_filter(array_map('trim', explode(',', $roles))));
}

// Obligatoire pour ces rôles, sauf en développement (APP_ENV=dev), pour que les comptes de démo
// restent utilisables sans téléphone. DOUBLE_AUTH_OBLIGATOIRE=true|false force le choix.
function doubleAuthObligatoire(string $role): bool
{
    if (!in_array($role, rolesDoubleAuth(), true)) {
        return false;
    }
    $force = getenv('DOUBLE_AUTH_OBLIGATOIRE');
    if ($force !== false && $force !== '') {
        return filter_var($force, FILTER_VALIDATE_BOOLEAN);
    }
    return !appEnDev();
}

// Base32 (RFC 4648), l'alphabet attendu par les applications d'authentification
function base32Encoder(string $octets): string
{
    $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    $bits = '';
    foreach (str_split($octets) as $octet) {
        $bits .= str_pad(decbin(ord($octet)), 8, '0', STR_PAD_LEFT);
    }
    $resultat = '';
    foreach (str_split($bits, 5) as $morceau) {
        $resultat .= $alphabet[bindec(str_pad($morceau, 5, '0'))];
    }
    return $resultat;
}

function base32Decoder(string $texte): string
{
    $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    $bits = '';
    foreach (str_split(strtoupper(rtrim($texte, '='))) as $caractere) {
        $position = strpos($alphabet, $caractere);
        if ($position === false) {
            return '';
        }
        $bits .= str_pad(decbin($position), 5, '0', STR_PAD_LEFT);
    }
    $resultat = '';
    foreach (str_split($bits, 8) as $octet) {
        if (strlen($octet) === 8) {
            $resultat .= chr(bindec($octet));
        }
    }
    return $resultat;
}

function nouveauSecretTotp(): string
{
    return base32Encoder(random_bytes(20)); // 160 bits, la taille recommandée pour HMAC-SHA1
}

// Code à 6 chiffres pour un pas de temps donné (RFC 6238 / RFC 4226)
function codeTotp(string $secret, int $pas): string
{
    $hmac = hash_hmac('sha1', pack('J', $pas), base32Decoder($secret), true);
    $decalage = ord($hmac[19]) & 0x0F;
    $nombre = ((ord($hmac[$decalage]) & 0x7F) << 24)
            | (ord($hmac[$decalage + 1]) << 16)
            | (ord($hmac[$decalage + 2]) << 8)
            | ord($hmac[$decalage + 3]);
    return str_pad((string) ($nombre % (10 ** TOTP_CHIFFRES)), TOTP_CHIFFRES, '0', STR_PAD_LEFT);
}

// Renvoie le pas accepté, ou null. $dernierPas : refuse un code déjà utilisé (rejeu).
function verifierCodeTotp(string $secret, string $code, ?int $dernierPas): ?int
{
    $code = preg_replace('/\s+/', '', $code);
    if (!preg_match('/^\d{' . TOTP_CHIFFRES . '}$/', $code)) {
        return null;
    }
    $maintenant = intdiv(time(), TOTP_PERIODE);
    for ($i = -TOTP_FENETRE; $i <= TOTP_FENETRE; $i++) {
        $pas = $maintenant + $i;
        if ($dernierPas !== null && $pas <= $dernierPas) {
            continue;
        }
        if (hash_equals(codeTotp($secret, $pas), $code)) {
            return $pas;
        }
    }
    return null;
}

// Lien à transformer en QR code côté front (lu par Google Authenticator, Microsoft Authenticator, FreeOTP…)
function lienOtpauth(string $secret, string $compte): string
{
    $emetteur = 'Iris Space';
    return 'otpauth://totp/' . rawurlencode($emetteur . ':' . $compte)
        . '?secret=' . $secret
        . '&issuer=' . rawurlencode($emetteur)
        . '&algorithm=SHA1&digits=' . TOTP_CHIFFRES . '&period=' . TOTP_PERIODE;
}

// ---------------------------------------------------------------------
// OUVERTURE DE SESSION
// ---------------------------------------------------------------------

// Dernière étape d'une connexion réussie (après le mot de passe, et le code s'il en faut un)
function ouvrirSession(array $user): void
{
    session_regenerate_id(true); // nouvel identifiant de session après connexion (sécurité)
    unset($_SESSION['double_auth_en_attente']);
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['role']    = $user['role'];

    $stmt = db()->prepare('UPDATE utilisateur SET derniere_connexion = now() WHERE id = :id');
    $stmt->execute(['id' => $user['id']]);
}
