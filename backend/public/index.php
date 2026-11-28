<?php

declare(strict_types=1);

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Exception\HttpException;
use Slim\Exception\HttpMethodNotAllowedException;
use Slim\Exception\HttpNotFoundException;
use Slim\Factory\AppFactory;

require __DIR__ . '/../vendor/autoload.php';
require __DIR__ . '/../routes/helpers.php';
require __DIR__ . '/../routes/notifications_service.php';

// « aujourd'hui » et les dates sans fuseau (ex. 2026-10-30T18:00) sont en heure de Paris
date_default_timezone_set('Europe/Paris');

$enDev = appEnDev();
ini_set('display_errors', $enDev ? '1' : '0');

// Cookie Secure en production ou si la requête arrive en HTTPS (direct ou derrière reverse proxy)
$cookieSecure = !$enDev
    || (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');

ini_set('session.use_strict_mode', '1');
ini_set('session.use_only_cookies', '1');
session_set_cookie_params([
    'lifetime' => 0,
    'path'     => '/',
    'domain'   => '',
    'secure'   => $cookieSecure,
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();

$app = AppFactory::create();

$app->addBodyParsingMiddleware();
$app->addRoutingMiddleware();
// Détail des erreurs affiché seulement en dev (APP_ENV=dev|development|local)
$errorMiddleware = $app->addErrorMiddleware($enDev, true, true);
// Les autres erreurs (route inconnue, 500…) en JSON plutôt qu'en page HTML
$errorMiddleware->getDefaultErrorHandler()->forceContentType('application/json');
// SEC-05 : même format { "error": message } que les ApiException (route inconnue, méthode refusée, erreur PHP).
// Le détail (classe, fichier, ligne) n'est ajouté qu'en dev ; en production, un message générique.
$errorMiddleware->getDefaultErrorHandler()->registerErrorRenderer(
    'application/json',
    function (Throwable $exception, bool $afficherDetails): string {
        $erreur = ['error' => match (true) {
            $exception instanceof HttpNotFoundException         => 'Route introuvable',
            $exception instanceof HttpMethodNotAllowedException => 'Méthode non autorisée',
            $exception instanceof HttpException                 => $exception->getTitle(),
            default                                             => 'Erreur interne du serveur',
        }];
        if ($afficherDetails) {
            $erreur['details'] = [
                'type'    => get_class($exception),
                'message' => $exception->getMessage(),
                'fichier' => $exception->getFile(),
                'ligne'   => $exception->getLine(),
            ];
        }
        return json_encode($erreur);
    }
);

// throw new ApiException('message', 404) dans une route → réponse JSON { "error": "message" } en 404
$errorMiddleware->setErrorHandler(ApiException::class, function (Request $request, Throwable $exception) use ($app): Response {
    return json($app->getResponseFactory()->createResponse(), ['error' => $exception->getMessage()], $exception->getCode());
});

// Toutes les routes sont préfixées par /api (comme les appels du front)
$app->group('/api', function ($group) {
    require __DIR__ . '/../routes/Controller/HealthController.php';
    require __DIR__ . '/../routes/emails.php';
    require __DIR__ . '/../routes/securite_connexion.php';
    require __DIR__ . '/../routes/auth.php';
    require __DIR__ . '/../routes/fichiers.php';
    require __DIR__ . '/../routes/profil_photo.php';
    require __DIR__ . '/../routes/devoirs_fichiers.php';
    require __DIR__ . '/../routes/visiteur.php';

    // Actualités : routes communes à plusieurs rôles (pas de préfixe), chacune pose son requireRole
    require __DIR__ . '/../routes/actualites.php';
    require __DIR__ . '/../routes/messagerie.php';

    // Routes Bonus (P3) : chacune pose elle-même son requireRole / requireConnecte
    require __DIR__ . '/../routes/mot_de_passe.php';
    require __DIR__ . '/../routes/notifications.php';
    require __DIR__ . '/../routes/pages_publiques.php';
    require __DIR__ . '/../routes/contacts_admin.php';
    require __DIR__ . '/../routes/eleve_bonus.php';
    require __DIR__ . '/../routes/prof_bonus.php';

    // RGPD : export de ses propres données (et fonctions partagées avec admin/rgpd.php)
    require __DIR__ . '/../routes/rgpd.php';

    // Chaque espace n'est accessible qu'aux rôles indiqués (401 si non connecté, 403 sinon)
    $group->group('/admin', function ($group) {
        require __DIR__ . '/../routes/admin/absences.php';
        require __DIR__ . '/../routes/admin/documents.php';
        require __DIR__ . '/../routes/admin/utilisateurs.php';
        require __DIR__ . '/../routes/admin/emploi_du_temps.php';
        require __DIR__ . '/../routes/admin/rgpd.php';
        require __DIR__ . '/../routes/admin/programme.php';
    })->add(requireRole('administrateur', 'direction', 'dev'));

    $group->group('/eleve', function ($group) {
        require __DIR__ . '/../routes/eleve.php';
    })->add(requireRole('eleve'));

    $group->group('/prof', function ($group) {
        require __DIR__ . '/../routes/prof.php';
    })->add(requireRole('professeur'));
})->add(refuserRequeteInterSite()); // SEC-05 : protection CSRF, voir helpers.php


$app->run();