<?php

declare(strict_types=1);

namespace App\Controller;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

$group->get('/health', function (ServerRequestInterface $request, ResponseInterface $response) {
    $response->getBody()->write(json_encode(['status' => 'tout marche, c est O K']));
    return $response->withHeader('Content-Type', 'application/json');
});