<?php

declare(strict_types=1);

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

// Photo de profil de l'utilisateur connecté (tous les rôles). Le fichier est rangé dans uploads/avatars/ et
// utilisateur.photo_url contient son URL (/api/uploads/avatars/<nom>), lisible par tout utilisateur connecté
// (GET /api/uploads/avatars/..., dans fichiers.php) : navbar, messagerie, liste d'une classe.

const EXTENSIONS_PHOTO_PROFIL = ['jpg', 'jpeg', 'png', 'webp']; // volontairement sans gif ni svg
const MIMES_PHOTO_PROFIL = ['image/jpeg', 'image/png', 'image/webp'];
const TAILLE_MAX_PHOTO_PROFIL = 2 * 1024 * 1024; // 2 Mo

// ---------------------------------------------------------------------
// POST /api/profil/photo : envoyer ou remplacer sa photo (multipart, champ « fichier »)
// Réponse : { "photo_url": "/api/uploads/avatars/<nom>" } ; l'ancienne photo est effacée du disque.
// POST et non PUT : PHP ne lit les fichiers d'un formulaire multipart que pour un POST.
// ---------------------------------------------------------------------
$group->post('/profil/photo', function (ServerRequestInterface $request, ResponseInterface $response) {
    $fichier = enregistrerFichier($request, 'uploads/avatars', EXTENSIONS_PHOTO_PROFIL);

    // Le contenu doit être vraiment une image jpg, png ou webp, de 2 Mo au plus
    if (!in_array($fichier['mime'], MIMES_PHOTO_PROFIL, true)) {
        supprimerFichier($fichier['url']);
        throw new ApiException('La photo doit être une image JPG, PNG ou WebP', 400);
    }
    if ($fichier['taille'] > TAILLE_MAX_PHOTO_PROFIL) {
        supprimerFichier($fichier['url']);
        throw new ApiException('Photo trop volumineuse (2 Mo maximum)', 413);
    }

    $urlApi = '/api/uploads/avatars/' . basename($fichier['url']);

    try {
        $ancienne = transaction(function (PDO $pdo) use ($urlApi) {
            $stmt = $pdo->prepare('SELECT photo_url FROM utilisateur WHERE id = :id FOR UPDATE');
            $stmt->execute(['id' => moi()]);
            $ancienne = $stmt->fetchColumn();

            $stmt = $pdo->prepare('UPDATE utilisateur SET photo_url = :url WHERE id = :id');
            $stmt->execute(['url' => $urlApi, 'id' => moi()]);

            return $ancienne === false ? null : $ancienne;
        });
    } catch (Throwable $e) {
        supprimerFichier($fichier['url']); // pas de fichier orphelin si la base refuse
        throw $e;
    }

    supprimerFichier($ancienne);

    return json($response, ['photo_url' => $urlApi]);
})->add(requireConnecte());

// ---------------------------------------------------------------------
// DELETE /api/profil/photo : retirer sa photo (204, même si elle n'en avait pas)
// ---------------------------------------------------------------------
$group->delete('/profil/photo', function (ServerRequestInterface $request, ResponseInterface $response) {
    $ancienne = transaction(function (PDO $pdo) {
        $stmt = $pdo->prepare('SELECT photo_url FROM utilisateur WHERE id = :id FOR UPDATE');
        $stmt->execute(['id' => moi()]);
        $ancienne = $stmt->fetchColumn();

        $stmt = $pdo->prepare('UPDATE utilisateur SET photo_url = NULL WHERE id = :id');
        $stmt->execute(['id' => moi()]);

        return $ancienne === false ? null : $ancienne;
    });

    supprimerFichier($ancienne);

    return $response->withStatus(204);
})->add(requireConnecte());
