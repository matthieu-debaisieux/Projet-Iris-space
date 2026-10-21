<?php

declare(strict_types=1);

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\UploadedFileInterface;
use Psr\Http\Server\RequestHandlerInterface;

// Motif d'un uuid dans une route : '/documents/{id:' . UUID . '}'
const UUID = '[0-9a-fA-F]{8}-(?:[0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}';

// Fichiers envoyés : hors de public/, donc jamais servis directement par Apache
const DOSSIER_FICHIERS = __DIR__ . '/../uploads';
const TAILLE_MAX_FICHIER = 10 * 1024 * 1024; // 10 Mo
const EXTENSIONS_AUTORISEES = [
    'pdf', 'txt', 'csv', 'zip',
    'doc', 'docx', 'odt', 'xls', 'xlsx', 'ods', 'ppt', 'pptx', 'odp',
    'jpg', 'jpeg', 'png', 'gif', 'webp',
];

// Erreur renvoyée au front en JSON { "error": message }, avec le code HTTP en 2e argument :
// throw new ApiException('Devoir introuvable', 404);
class ApiException extends RuntimeException
{
}

// ---------------------------------------------------------------------
// RÉPONSES
// ---------------------------------------------------------------------

function json(ResponseInterface $response, mixed $data, int $status = 200): ResponseInterface
{
    $response->getBody()->write(json_encode($data));
    return $response->withStatus($status)->withHeader('Content-Type', 'application/json');
}

// ---------------------------------------------------------------------
// SESSION ET RÔLES
// ---------------------------------------------------------------------

// Middleware à poser sur un groupe : ->add(requireRole('eleve'))
// 401 si personne n'est connecté, 403 si le rôle ne correspond pas.
function requireRole(string ...$roles): callable
{
    return function (ServerRequestInterface $request, RequestHandlerInterface $handler) use ($roles): ResponseInterface {
        if (empty($_SESSION['user_id'])) {
            throw new ApiException('Non connecté', 401);
        }

        // Relire le compte en base : il a pu être désactivé depuis la connexion
        $stmt = db()->prepare('SELECT role, actif FROM utilisateur WHERE id = :id');
        $stmt->execute(['id' => $_SESSION['user_id']]);
        $user = $stmt->fetch();

        if (!$user || !$user['actif']) {
            $_SESSION = [];
            session_destroy();
            throw new ApiException('Non connecté', 401);
        }
        if (!in_array($user['role'], $roles, true)) {
            throw new ApiException('Accès refusé', 403);
        }

        return $handler->handle($request);
    };
}

// Id de l'utilisateur connecté (le middleware requireRole a déjà vérifié qu'il existe)
function moi(): string
{
    return $_SESSION['user_id'];
}

// ---------------------------------------------------------------------
// LECTURE ET VALIDATION DES CHAMPS
// Chaque fonction lit $data[$cle] (corps JSON, formulaire ou paramètres d'URL),
// renvoie null si le champ est absent et facultatif, ou lève une ApiException 400.
// ---------------------------------------------------------------------

function corps(ServerRequestInterface $request): array
{
    $data = $request->getParsedBody();
    if (is_array($data)) {
        return $data;
    }
    // Corps envoyé en JSON mais illisible : le dire plutôt que de répondre « champ requis »
    if (str_contains($request->getHeaderLine('Content-Type'), 'json') && trim((string) $request->getBody()) !== '') {
        throw new ApiException('Corps JSON invalide', 400);
    }
    return [];
}

function absent(array $data, string $cle): bool
{
    $valeur = $data[$cle] ?? null;
    return $valeur === null || (is_string($valeur) && trim($valeur) === '');
}

function texte(array $data, string $cle, int $max, bool $requis = false): ?string
{
    if (absent($data, $cle)) {
        if ($requis) {
            throw new ApiException("Le champ « $cle » est requis", 400);
        }
        return null;
    }
    if (!is_string($data[$cle]) || !mb_check_encoding($data[$cle], 'UTF-8')) {
        throw new ApiException("Le champ « $cle » doit être du texte UTF-8", 400);
    }
    $valeur = trim($data[$cle]);
    if (mb_strlen($valeur) > $max) {
        throw new ApiException("Le champ « $cle » dépasse $max caractères", 400);
    }
    return $valeur;
}

function entier(array $data, string $cle, bool $requis = false): ?int
{
    if (absent($data, $cle)) {
        if ($requis) {
            throw new ApiException("Le champ « $cle » est requis", 400);
        }
        return null;
    }
    $valeur = filter_var($data[$cle], FILTER_VALIDATE_INT);
    if ($valeur === false || is_bool($data[$cle])) {
        throw new ApiException("Le champ « $cle » doit être un nombre entier", 400);
    }
    return $valeur;
}

function nombre(array $data, string $cle, bool $requis = false): ?float
{
    if (absent($data, $cle)) {
        if ($requis) {
            throw new ApiException("Le champ « $cle » est requis", 400);
        }
        return null;
    }
    $valeur = filter_var($data[$cle], FILTER_VALIDATE_FLOAT);
    if ($valeur === false || is_bool($data[$cle])) {
        throw new ApiException("Le champ « $cle » doit être un nombre", 400);
    }
    return $valeur;
}

// Accepte true/false (JSON) et "true"/"false"/"1"/"0" (formulaire multipart)
function booleen(array $data, string $cle, ?bool $defaut = null): ?bool
{
    if (absent($data, $cle)) {
        return $defaut;
    }
    $valeur = filter_var($data[$cle], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
    if ($valeur === null) {
        throw new ApiException("Le champ « $cle » doit valoir true ou false", 400);
    }
    return $valeur;
}

function uuid(array $data, string $cle, bool $requis = false): ?string
{
    if (absent($data, $cle)) {
        if ($requis) {
            throw new ApiException("Le champ « $cle » est requis", 400);
        }
        return null;
    }
    if (!is_string($data[$cle]) || !preg_match('/^' . UUID . '$/', $data[$cle])) {
        throw new ApiException("Le champ « $cle » n'est pas un identifiant valide", 400);
    }
    return $data[$cle];
}

// Date au format AAAA-MM-JJ
function dateJour(array $data, string $cle, bool $requis = false): ?string
{
    if (absent($data, $cle)) {
        if ($requis) {
            throw new ApiException("Le champ « $cle » est requis", 400);
        }
        return null;
    }
    $date = is_string($data[$cle]) ? DateTimeImmutable::createFromFormat('!Y-m-d', $data[$cle]) : false;
    if (!$date || $date->format('Y-m-d') !== $data[$cle]) {
        throw new ApiException("Le champ « $cle » doit être une date AAAA-MM-JJ", 400);
    }
    return $data[$cle];
}

// Date et heure ISO 8601 (ex. 2026-10-21T18:00 ou 2026-10-21T18:00:00+02:00)
function dateHeure(array $data, string $cle, bool $requis = false): ?string
{
    if (absent($data, $cle)) {
        if ($requis) {
            throw new ApiException("Le champ « $cle » est requis", 400);
        }
        return null;
    }
    try {
        if (!is_string($data[$cle]) || !preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/', $data[$cle])) {
            throw new Exception();
        }
        return (new DateTimeImmutable($data[$cle]))->format(DATE_ATOM);
    } catch (Exception) {
        throw new ApiException("Le champ « $cle » doit être une date et heure ISO (AAAA-MM-JJTHH:MM)", 400);
    }
}

function choix(array $data, string $cle, array $valeurs, ?string $defaut = null): ?string
{
    if (absent($data, $cle)) {
        return $defaut;
    }
    if (!in_array($data[$cle], $valeurs, true)) {
        throw new ApiException("Le champ « $cle » doit valoir : " . implode(', ', $valeurs), 400);
    }
    return $data[$cle];
}

// Liste d'entiers JSON → tableau PostgreSQL '{1,2,3}' (à utiliser avec ::int[])
function tableauEntiers(array $valeurs, string $cle): string
{
    foreach ($valeurs as $valeur) {
        if (filter_var($valeur, FILTER_VALIDATE_INT) === false || is_bool($valeur)) {
            throw new ApiException("Le champ « $cle » doit être une liste d'entiers", 400);
        }
    }
    return '{' . implode(',', array_map('intval', $valeurs)) . '}';
}

// ?limit=N (1 à 100), null si absent
function limite(array $query): ?int
{
    $limite = entier($query, 'limit');
    if ($limite !== null && ($limite < 1 || $limite > 100)) {
        throw new ApiException('Le paramètre « limit » doit être entre 1 et 100', 400);
    }
    return $limite;
}

// ?du=AAAA-MM-JJ&au=AAAA-MM-JJ (par défaut : aujourd'hui), bornes incluses
function periode(array $query): array
{
    $du = dateJour($query, 'du') ?? date('Y-m-d');
    $au = dateJour($query, 'au') ?? $du;
    if ($au < $du) {
        throw new ApiException('La date « au » doit être après la date « du »', 400);
    }
    return [$du, $au];
}

// ---------------------------------------------------------------------
// BASE DE DONNÉES
// ---------------------------------------------------------------------

// Exécute $fn dans une transaction : tout est annulé si une exception est levée
function transaction(callable $fn): mixed
{
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $resultat = $fn($pdo);
        $pdo->commit();
        return $resultat;
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}

// Code SQLSTATE d'une erreur PostgreSQL : 23505 = doublon, 23503 = clé étrangère, 23P01 = chevauchement
function codeSql(PDOException $e): string
{
    return (string) ($e->errorInfo[0] ?? $e->getCode());
}

// ---------------------------------------------------------------------
// FICHIERS
// ---------------------------------------------------------------------

// Enregistre le fichier envoyé dans le champ multipart « fichier ».
// Renvoie ['nom' => nom d'origine, 'url' => chemin relatif à uploads/, 'taille' => octets].
function enregistrerFichier(ServerRequestInterface $request, string $sousDossier): array
{
    $fichier = $request->getUploadedFiles()['fichier'] ?? null;
    if (!$fichier instanceof UploadedFileInterface || $fichier->getError() === UPLOAD_ERR_NO_FILE) {
        throw new ApiException('Fichier manquant (champ « fichier »)', 400);
    }
    if (in_array($fichier->getError(), [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true)
        || $fichier->getSize() > TAILLE_MAX_FICHIER) {
        throw new ApiException('Fichier trop volumineux (10 Mo maximum)', 413);
    }
    if ($fichier->getError() !== UPLOAD_ERR_OK) {
        throw new ApiException("Échec de l'envoi du fichier", 400);
    }

    $nom = mb_substr(basename($fichier->getClientFilename() ?? 'fichier'), 0, 255);
    $extension = strtolower(pathinfo($nom, PATHINFO_EXTENSION));
    if (!in_array($extension, EXTENSIONS_AUTORISEES, true)) {
        throw new ApiException('Type de fichier non autorisé', 400);
    }

    // Nom aléatoire sur le disque : pas de collision ni de nom choisi par l'utilisateur
    $dossier = DOSSIER_FICHIERS . '/' . $sousDossier;
    if (!is_dir($dossier)) {
        mkdir($dossier, 0775, true);
    }
    $url = $sousDossier . '/' . bin2hex(random_bytes(16)) . '.' . $extension;
    $fichier->moveTo(DOSSIER_FICHIERS . '/' . $url);

    return ['nom' => $nom, 'url' => $url, 'taille' => $fichier->getSize()];
}

function supprimerFichier(?string $url): void
{
    if ($url === null || $url === '' || str_contains($url, '..')) {
        return;
    }
    $chemin = DOSSIER_FICHIERS . '/' . $url;
    if (is_file($chemin)) {
        unlink($chemin);
    }
}
