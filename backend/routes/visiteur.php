<?php

declare(strict_types=1);

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

// Routes publiques de l'espace visiteur (sans connexion).

// Formulaire de contact : nom, email et message obligatoires
$group->post('/contact', function (ServerRequestInterface $request, ResponseInterface $response) {
    $data = corps($request);

    $email = texte($data, 'email', 254, true);
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new ApiException("L'email n'est pas valide", 400);
    }

    $stmt = db()->prepare(
        'INSERT INTO demande_contact (nom, prenom, email, telephone, sujet, message)
         VALUES (:nom, :prenom, :email, :telephone, :sujet, :message)
         RETURNING id, created_at'
    );
    $stmt->execute([
        'nom'       => texte($data, 'nom', 100, true),
        'prenom'    => texte($data, 'prenom', 100),
        'email'     => $email,
        'telephone' => texte($data, 'telephone', 30),
        'sujet'     => texte($data, 'sujet', 200),
        'message'   => texte($data, 'message', 5000, true),
    ]);

    return json($response, ['demande' => $stmt->fetch()], 201);
});
