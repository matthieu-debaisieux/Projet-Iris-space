<?php

declare(strict_types=1);

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

// RGPD côté admin : export et suppression des données d'un compte sur demande de la personne.
// Les fonctions (exporterDonnees, effacerDonnees) sont dans routes/rgpd.php.

// Toutes les données personnelles du compte, en JSON (sans mot de passe)
$group->get('/utilisateurs/{id:' . UUID . '}/export', function (ServerRequestInterface $request, ResponseInterface $response, array $args) {
    $id = strtolower($args['id']);

    return reponseExport($response, exporterDonnees($id), 'export-' . $id . '.json');
});

// Supprime ou anonymise le compte et ses données (voir la section RGPD de ROUTES.md pour le détail par table).
// Irréversible. Répond 200 avec le nombre de lignes supprimées par table.
$group->delete('/utilisateurs/{id:' . UUID . '}/donnees', function (ServerRequestInterface $request, ResponseInterface $response, array $args) {
    // En minuscules : l'uuid de la session l'est, et l'URL peut être écrite en majuscules
    $id = strtolower($args['id']);
    if ($id === strtolower(moi())) {
        throw new ApiException('Vous ne pouvez pas supprimer votre propre compte', 400);
    }

    $bilan = effacerDonnees($id);

    // Trace de l'opération (identifiants seulement, aucune donnée personnelle)
    error_log("RGPD : données du compte $id supprimées par " . moi());

    return json($response, $bilan);
});
