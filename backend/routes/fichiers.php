<?php

declare(strict_types=1);

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

const CATEGORIES_UPLOAD = ['general', 'actualites', 'avatars', 'messages'];

// POST /api/uploads : envoi générique d'un fichier (champ multipart « fichier », « categorie » facultative)
$group->post('/uploads', function (ServerRequestInterface $request, ResponseInterface $response) {
    $categorie = choix(corps($request), 'categorie', CATEGORIES_UPLOAD, 'general');
    // Le dossier « actualites » est lisible sans connexion : seuls ceux qui écrivent des actualités y déposent des images
    if ($categorie === 'actualites' && !in_array($_SESSION['role'] ?? '', ['administrateur', 'direction', 'dev', 'professeur'], true)) {
        throw new ApiException('Accès refusé', 403);
    }
    $extensions = in_array($categorie, ['actualites', 'avatars'], true)
        ? EXTENSIONS_IMAGES
        : EXTENSIONS_AUTORISEES;

    $fichier = enregistrerFichier($request, 'uploads/' . $categorie, $extensions);
    $urlApi = '/api/uploads/' . $categorie . '/' . basename($fichier['url']);

    return json($response, [
        'url'     => $urlApi,
        'fichier' => [
            'nom'    => $fichier['nom'],
            'chemin' => $fichier['url'],
            'url'    => $urlApi,
            'taille' => $fichier['taille'],
            'mime'   => $fichier['mime'],
        ],
    ], 201);
})->add(requireConnecte());

// Images publiques des actualités (page visiteur sans connexion)
$group->get('/uploads/{categorie:actualites}/{nom:[0-9a-f]{32}\.[a-z0-9]+}', function (ServerRequestInterface $request, ResponseInterface $response, array $args) {
    return envoyerFichier(
        $response,
        'uploads/' . $args['categorie'] . '/' . $args['nom'],
        $args['nom'],
        true,
        'public, max-age=86400'
    );
});

// Autres fichiers déposés via /api/uploads : réservés aux utilisateurs connectés
$group->get('/uploads/{categorie:general|avatars|messages}/{nom:[0-9a-f]{32}\.[a-z0-9]+}', function (ServerRequestInterface $request, ResponseInterface $response, array $args) {
    return envoyerFichier(
        $response,
        'uploads/' . $args['categorie'] . '/' . $args['nom'],
        $args['nom'],
        true,
        'private, max-age=3600'
    );
})->add(requireConnecte());

// GET /api/documents/{id}/telecharger : téléchargement d'un document avec vérification des droits
$group->get('/documents/{id:' . UUID . '}/telecharger', function (ServerRequestInterface $request, ResponseInterface $response, array $args) {
    $stmt = db()->prepare(
        'SELECT id, titre, url, utilisateur_id, depose_par
         FROM document
         WHERE id = :id'
    );
    $stmt->execute(['id' => $args['id']]);
    $doc = $stmt->fetch();

    if (!$doc) {
        throw new ApiException('Document introuvable', 404);
    }

    $role = $_SESSION['role'] ?? '';
    $autorise = match ($role) {
        'administrateur', 'direction', 'dev' => true,
        'eleve' => $doc['utilisateur_id'] === null || $doc['utilisateur_id'] === moi(),
        'professeur' => $doc['utilisateur_id'] === null
            || $doc['utilisateur_id'] === moi()
            || $doc['depose_par'] === moi(),
        default => false,
    };

    if (!$autorise) {
        throw new ApiException('Document introuvable', 404); // SEC-05 : le document d'un autre n'existe pas pour lui
    }

    return envoyerFichier($response, $doc['url'], $doc['titre'], false);
})->add(requireConnecte());
