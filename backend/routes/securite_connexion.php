<?php

declare(strict_types=1);

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

// ---------------------------------------------------------------------
// SÉCURITÉ DE LA CONNEXION : limite de tentatives (SEC-02), mot de passe robuste (CPT-06),
// double authentification TOTP (SEC-03). Chargé par auth.php et mot_de_passe.php.
// ---------------------------------------------------------------------

require_once __DIR__ . '/totp.php';

// SEC-02 : au bout de CONNEXION_ECHECS_MAX échecs dans les CONNEXION_FENETRE_MINUTES dernières minutes,
// la connexion est refusée (429) jusqu'à CONNEXION_FENETRE_MINUTES minutes après le dernier échec.
// Les échecs sont lus dans journal_connexion (pas de table en plus) : un compte, une adresse e-mail
// et un identifiant saisi autrement (majuscules…) comptent ensemble.
const CONNEXION_ECHECS_MAX        = 5;  // pour un même identifiant ou compte
const CONNEXION_ECHECS_MAX_IP     = 20; // pour une même adresse IP, tous identifiants confondus (un établissement partage souvent une seule IP)
const CONNEXION_FENETRE_MINUTES   = 15;

// SEC-03 : temps laissé pour saisir le code après le mot de passe
const CONNEXION_2FA_ATTENTE_SECONDES = 300;
const EMETTEUR_2FA                = 'Iris Space';
// Rôles pour lesquels la double authentification est proposée (décision D4). Les élèves : plus tard (SEC-07).
const ROLES_DOUBLE_AUTHENTIFICATION = ['administrateur', 'direction', 'professeur', 'dev'];

// Nombre de secondes pendant lesquelles la connexion est refusée (0 = autorisée) pour cet identifiant,
// ce compte (null si l'identifiant est inconnu) et l'adresse IP du client.
// Les tentatives refusées ne sont pas écrites dans le journal : elles ne prolongent pas le blocage.
// Ne masque pas les erreurs SQL : une limite qu'on ne peut pas vérifier ne doit pas être ignorée.
function secondesBlocageConnexion(ServerRequestInterface $request, string $identifiant, ?string $utilisateurId): int
{
    // Échecs de ce compte ou de cet identifiant, depuis la dernière connexion réussie du compte
    $stmt = db()->prepare(
        "SELECT count(*) AS echecs,
                COALESCE(EXTRACT(EPOCH FROM (max(created_at) + make_interval(mins => CAST(:fenetre2 AS int)) - now())), 0) AS reste
         FROM journal_connexion
         WHERE NOT reussie
           AND created_at > now() - make_interval(mins => CAST(:fenetre AS int))
           AND (lower(identifiant) = lower(:login) OR utilisateur_id = CAST(:compte AS uuid))
           AND created_at > COALESCE(
                 (SELECT max(s.created_at) FROM journal_connexion s WHERE s.reussie AND s.utilisateur_id = CAST(:compte2 AS uuid)),
                 '-infinity'::timestamptz)"
    );
    $stmt->execute([
        'fenetre'  => CONNEXION_FENETRE_MINUTES,
        'fenetre2' => CONNEXION_FENETRE_MINUTES,
        'login'    => texteJournal($identifiant, 254),
        'compte'   => $utilisateurId,
        'compte2'  => $utilisateurId,
    ]);
    $ligne = $stmt->fetch();
    $reste = (int) $ligne['echecs'] >= CONNEXION_ECHECS_MAX ? (int) ceil((float) $ligne['reste']) : 0;

    // Échecs de cette adresse IP
    $ip = adresseIp($request);
    if ($ip !== null) {
        $stmt = db()->prepare(
            "SELECT count(*) AS echecs,
                    COALESCE(EXTRACT(EPOCH FROM (max(created_at) + make_interval(mins => CAST(:fenetre2 AS int)) - now())), 0) AS reste
             FROM journal_connexion
             WHERE NOT reussie
               AND created_at > now() - make_interval(mins => CAST(:fenetre AS int))
               AND ip = CAST(:ip AS inet)"
        );
        $stmt->execute(['fenetre' => CONNEXION_FENETRE_MINUTES, 'fenetre2' => CONNEXION_FENETRE_MINUTES, 'ip' => $ip]);
        $ligne = $stmt->fetch();
        if ((int) $ligne['echecs'] >= CONNEXION_ECHECS_MAX_IP) {
            $reste = max($reste, (int) ceil((float) $ligne['reste']));
        }
    }

    return max(0, $reste);
}

// Réponse 429 « Trop de tentatives. Réessayez dans N minutes. » avec l'en-tête Retry-After (en secondes)
function reponseTropDeTentatives(ResponseInterface $response, int $secondes): ResponseInterface
{
    $minutes = max(1, (int) ceil($secondes / 60));
    $message = 'Trop de tentatives. Réessayez dans ' . $minutes . ($minutes > 1 ? ' minutes.' : ' minute.');

    return json($response, ['error' => $message], 429)->withHeader('Retry-After', (string) max(1, $secondes));
}

// Ouvre la session de l'utilisateur (connexion réussie) : id de session renouvelé, dernière connexion,
// journal, puis réponse { user } avec ses droits. $user vient d'un SELECT sur utilisateur.
function ouvrirSession(ServerRequestInterface $request, ResponseInterface $response, array $user, string $identifiant): ResponseInterface
{
    session_regenerate_id(true); // nouvel identifiant de session après connexion (sécurité)
    $_SESSION = [
        'user_id' => $user['id'],
        'role'    => $user['role'],
    ];

    $stmt = db()->prepare('UPDATE utilisateur SET derniere_connexion = now() WHERE id = :id');
    $stmt->execute(['id' => $user['id']]);

    journaliserConnexion($request, $identifiant, $user['id'], null);

    // Renvoyer l'utilisateur (SANS le hash, le champ actif ni les champs de la double authentification), avec ses droits
    unset($user['mot_de_passe_hash'], $user['actif'], $user['totp_actif'], $user['totp_secret'], $user['totp_dernier_pas']);
    $user['droits'] = droitsPourRole($user['role']);

    return json($response, ['user' => $user]);
}

// Mot de passe à choisir (changement, réinitialisation) : 8 à 72 caractères, avec au moins une lettre et un chiffre
function motDePasseRobuste(array $data, string $cle): string
{
    $valeur = motDePasse($data, $cle);
    if (!preg_match('/\p{L}/u', $valeur) || !preg_match('/\d/', $valeur)) {
        throw new ApiException('Le mot de passe doit contenir au moins une lettre et un chiffre', 400);
    }
    return $valeur;
}

// Code à 6 chiffres saisi par l'utilisateur : espaces retirés (les applications l'affichent « 123 456 »)
function codeDoubleAuthentification(array $data): string
{
    $code = $data['code'] ?? null; // texte : un nombre perdrait les zéros du début (012345)
    $code = is_string($code) ? preg_replace('/\s+/', '', $code) : null;
    if ($code === null || !preg_match('/^\d{6}$/', $code)) {
        throw new ApiException('Le code doit comporter 6 chiffres', 400);
    }
    return $code;
}
