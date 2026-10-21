<?php

declare(strict_types=1);

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

// Slug d'une page : lettres minuscules, chiffres et tirets (50 caractères maximum)
const SLUG = '[a-z0-9-]{1,50}';

// ---------------------------------------------------------------------
// GET /api/pages/{slug} : texte d'une page publique (« À propos », mentions légales…), sans connexion
// ---------------------------------------------------------------------
$group->get('/pages/{slug:' . SLUG . '}', function (ServerRequestInterface $request, ResponseInterface $response, array $args) {
    $stmt = db()->prepare('SELECT slug, titre, contenu, image_url, updated_at FROM page_publique WHERE slug = :slug');
    $stmt->execute(['slug' => $args['slug']]);
    $page = $stmt->fetch();

    if (!$page) {
        throw new ApiException('Page introuvable', 404);
    }

    return json($response, ['page' => $page]);
});

// ---------------------------------------------------------------------
// PUT /api/admin/pages/{slug} : créer ou remplacer une page publique
// Corps : { "titre": "...", "contenu": "..." | null, "image_url": "..." | null }
// ---------------------------------------------------------------------
$group->put('/admin/pages/{slug:' . SLUG . '}', function (ServerRequestInterface $request, ResponseInterface $response, array $args) {
    $data = corps($request);

    $titre    = texte($data, 'titre', 200, true);
    $contenu  = texte($data, 'contenu', 100000);
    $imageUrl = urlOuChemin($data, 'image_url');

    // Upsert : la page est créée si le slug n'existe pas encore
    $stmt = db()->prepare(
        'INSERT INTO page_publique (slug, titre, contenu, image_url)
         VALUES (:slug, :titre, :contenu, :image)
         ON CONFLICT (slug) DO UPDATE
           SET titre = EXCLUDED.titre, contenu = EXCLUDED.contenu,
               image_url = EXCLUDED.image_url, updated_at = now()
         RETURNING slug, titre, contenu, image_url, updated_at'
    );
    $stmt->execute([
        'slug'    => $args['slug'],
        'titre'   => $titre,
        'contenu' => $contenu,
        'image'   => $imageUrl,
    ]);

    return json($response, ['page' => $stmt->fetch()]);
})->add(requireRole('administrateur', 'direction'));