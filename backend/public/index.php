<?php

declare(strict_types=1);

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Factory\AppFactory;

require __DIR__ . '/../vendor/autoload.php';
require __DIR__ . '/../routes/helpers.php';

// « aujourd'hui » et les dates sans fuseau (ex. 2026-10-30T18:00) sont en heure de Paris
date_default_timezone_set('Europe/Paris');

session_start();

$app = AppFactory::create();

$app->addBodyParsingMiddleware();
$app->addRoutingMiddleware();
// true : affiche le détail des erreurs (à passer à false en prod)
$errorMiddleware = $app->addErrorMiddleware(true, true, true);
// Les autres erreurs (route inconnue, 500…) en JSON plutôt qu'en page HTML
$errorMiddleware->getDefaultErrorHandler()->forceContentType('application/json');

// throw new ApiException('message', 404) dans une route → réponse JSON { "error": "message" } en 404
$errorMiddleware->setErrorHandler(ApiException::class, function (Request $request, Throwable $exception) use ($app): Response {
    return json($app->getResponseFactory()->createResponse(), ['error' => $exception->getMessage()], $exception->getCode());
});

// Toutes les routes sont préfixées par /api (comme les appels du front)
$app->group('/api', function ($group) {
    require __DIR__ . '/../routes/Controller/HealthController.php';
    require __DIR__ . '/../routes/auth.php';
    require __DIR__ . '/../routes/visiteur.php';

    // Routes Bonus (P3) : chacune pose elle-même son requireRole / requireConnecte
    require __DIR__ . '/../routes/mot_de_passe.php';
    require __DIR__ . '/../routes/notifications.php';
    require __DIR__ . '/../routes/pages_publiques.php';
    require __DIR__ . '/../routes/contacts_admin.php';
    require __DIR__ . '/../routes/eleve_bonus.php';
    require __DIR__ . '/../routes/prof_bonus.php';

    // Chaque espace n'est accessible qu'aux rôles indiqués (401 si non connecté, 403 sinon)
    $group->group('/admin', function ($group) {
        require __DIR__ . '/../routes/admin/documents.php';
        require __DIR__ . '/../routes/admin/utilisateurs.php';
    })->add(requireRole('administrateur', 'direction'));

    $group->group('/eleve', function ($group) {
        require __DIR__ . '/../routes/eleve.php';
    })->add(requireRole('eleve'));

    $group->group('/prof', function ($group) {
        require __DIR__ . '/../routes/prof.php';
    })->add(requireRole('professeur'));
});


$app->run();