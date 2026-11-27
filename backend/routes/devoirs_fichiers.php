<?php

declare(strict_types=1);

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

// Téléchargement des fichiers d'un devoir, avec vérification des droits (même principe que
// GET /api/documents/{id}/telecharger dans fichiers.php : le fichier est toujours envoyé en pièce jointe).
// Les fichiers sont déposés avec POST /api/prof/devoirs/{id}/fichiers (pièces jointes du prof)
// et POST /api/eleve/devoirs/{id}/rendu (rendus des élèves).

// GET /api/devoirs/fichiers/{id}/telecharger : pièce jointe d'un devoir
//   - le professeur qui a donné le devoir ;
//   - les élèves qui ont ce devoir dans leur suivi (ceux de la classe au moment où il a été donné) ;
//   - l'administration.
$group->get('/devoirs/fichiers/{id:' . UUID . '}/telecharger', function (ServerRequestInterface $request, ResponseInterface $response, array $args) {
    $stmt = db()->prepare(
        'SELECT f.nom, f.url, d.professeur_id,
                EXISTS (SELECT 1 FROM devoir_eleve de WHERE de.devoir_id = f.devoir_id AND de.eleve_id = :moi) AS eleve_du_devoir
         FROM devoir_fichier f
         JOIN devoir d ON d.id = f.devoir_id
         WHERE f.id = :id'
    );
    $stmt->execute(['moi' => moi(), 'id' => $args['id']]);
    $fichier = $stmt->fetch();

    if (!$fichier) {
        throw new ApiException('Fichier introuvable', 404);
    }

    $autorise = match ($_SESSION['role'] ?? '') {
        'administrateur', 'direction', 'dev' => true,
        'professeur' => $fichier['professeur_id'] === moi(),
        'eleve'      => $fichier['eleve_du_devoir'],
        default      => false,
    };
    if (!$autorise) {
        throw new ApiException('Accès refusé', 403);
    }

    return envoyerFichier($response, $fichier['url'], $fichier['nom'], false);
})->add(requireConnecte());

// GET /api/devoirs/rendus/{id}/telecharger : fichier rendu par un élève
// Réservé à l'élève qui l'a déposé et au professeur qui a donné le devoir (pas à l'administration :
// c'est le travail personnel de l'élève).
$group->get('/devoirs/rendus/{id:' . UUID . '}/telecharger', function (ServerRequestInterface $request, ResponseInterface $response, array $args) {
    $stmt = db()->prepare(
        'SELECT r.nom, r.url, r.eleve_id, d.professeur_id
         FROM devoir_rendu_fichier r
         JOIN devoir d ON d.id = r.devoir_id
         WHERE r.id = :id'
    );
    $stmt->execute(['id' => $args['id']]);
    $rendu = $stmt->fetch();

    if (!$rendu) {
        throw new ApiException('Fichier introuvable', 404);
    }

    $autorise = match ($_SESSION['role'] ?? '') {
        'professeur' => $rendu['professeur_id'] === moi(),
        'eleve'      => $rendu['eleve_id'] === moi(),
        default      => false,
    };
    if (!$autorise) {
        throw new ApiException('Accès refusé', 403);
    }

    return envoyerFichier($response, $rendu['url'], $rendu['nom'], false);
})->add(requireConnecte());
