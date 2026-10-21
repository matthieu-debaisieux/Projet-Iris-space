<?php

declare(strict_types=1);

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Factory\AppFactory;

require __DIR__ . '/../vendor/autoload.php';

$app = AppFactory::create();

$app->addBodyParsingMiddleware();
$app->addRoutingMiddleware();
// true : affiche le détail des erreurs (à passer à false en prod)
$app->addErrorMiddleware(true, true, true);

// Toutes les routes sont préfixées par /api (comme les appels du front)
$app->group('/api', function ($group) {
    require __DIR__ . '/../routes/Controller/HealthController.php';
});


$app->run();
