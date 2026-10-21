<?php

declare(strict_types=1);

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

// Page Documents de l'administration.
// Un « espace » de la page = une ligne de type_document.
// Un document sans utilisateur_id est un document général ; avec, il est réservé à cet utilisateur.

$group->get('/espaces', function (ServerRequestInterface $request, ResponseInterface $response) {
    $espaces = db()->query(
        "SELECT t.id, t.nom,
                COALESCE(
                  json_agg(json_build_object(
                    'id', d.id, 'titre', d.titre, 'utilisateur_id', d.utilisateur_id, 'created_at', d.created_at
                  ) ORDER BY d.created_at) FILTER (WHERE d.id IS NOT NULL),
                  '[]'
                ) AS documents
         FROM type_document t
         LEFT JOIN document d ON d.type_document_id = t.id
         GROUP BY t.id
         ORDER BY t.nom"
    )->fetchAll();

    foreach ($espaces as &$espace) {
        $espace['documents'] = json_decode($espace['documents'], true);
    }

    return json($response, ['espaces' => $espaces]);
});

$group->post('/espaces', function (ServerRequestInterface $request, ResponseInterface $response) {
    $nom = texte(corps($request), 'nom', 100, true);

    try {
        $stmt = db()->prepare('INSERT INTO type_document (nom) VALUES (:nom) RETURNING id, nom');
        $stmt->execute(['nom' => $nom]);
    } catch (PDOException $e) {
        if (codeSql($e) === '23505') {
            throw new ApiException('Un espace porte déjà ce nom', 409);
        }
        throw $e;
    }

    return json($response, ['espace' => $stmt->fetch() + ['documents' => []]], 201);
});

$group->patch('/espaces/{id:[0-9]+}', function (ServerRequestInterface $request, ResponseInterface $response, array $args) {
    $nom = texte(corps($request), 'nom', 100, true);

    try {
        $stmt = db()->prepare('UPDATE type_document SET nom = :nom WHERE id = :id RETURNING id, nom');
        $stmt->execute(['nom' => $nom, 'id' => $args['id']]);
    } catch (PDOException $e) {
        if (codeSql($e) === '23505') {
            throw new ApiException('Un espace porte déjà ce nom', 409);
        }
        throw $e;
    }

    $espace = $stmt->fetch();
    if (!$espace) {
        throw new ApiException('Espace introuvable', 404);
    }

    return json($response, ['espace' => $espace]);
});

// Supprime l'espace ET ses documents (la clé étrangère n'a pas de ON DELETE CASCADE)
$group->delete('/espaces/{id:[0-9]+}', function (ServerRequestInterface $request, ResponseInterface $response, array $args) {
    $fichiers = transaction(function (PDO $pdo) use ($args) {
        $stmt = $pdo->prepare('DELETE FROM document WHERE type_document_id = :id RETURNING url');
        $stmt->execute(['id' => $args['id']]);
        $fichiers = $stmt->fetchAll(PDO::FETCH_COLUMN);

        $stmt = $pdo->prepare('DELETE FROM type_document WHERE id = :id');
        $stmt->execute(['id' => $args['id']]);
        if ($stmt->rowCount() === 0) {
            throw new ApiException('Espace introuvable', 404);
        }
        return $fichiers;
    });

    // Les fichiers ne sont effacés du disque qu'une fois la suppression validée en base
    foreach ($fichiers as $url) {
        supprimerFichier($url);
    }

    return $response->withStatus(204);
});

// Formulaire multipart : fichier (obligatoire), titre (sinon le nom du fichier),
// utilisateur_id (facultatif : document réservé à cet utilisateur)
$group->post('/espaces/{id:[0-9]+}/documents', function (ServerRequestInterface $request, ResponseInterface $response, array $args) {
    $data = corps($request);
    $titre = texte($data, 'titre', 200);
    $utilisateurId = uuid($data, 'utilisateur_id');

    $stmt = db()->prepare('SELECT 1 FROM type_document WHERE id = :id');
    $stmt->execute(['id' => $args['id']]);
    if (!$stmt->fetch()) {
        throw new ApiException('Espace introuvable', 404);
    }

    $fichier = enregistrerFichier($request, 'documents');

    try {
        $stmt = db()->prepare(
            'INSERT INTO document (type_document_id, utilisateur_id, titre, url, depose_par)
             VALUES (:espace, :utilisateur, :titre, :url, :moi)
             RETURNING id, titre, utilisateur_id, created_at'
        );
        $stmt->execute([
            'espace'      => $args['id'],
            'utilisateur' => $utilisateurId,
            'titre'       => $titre ?? mb_substr($fichier['nom'], 0, 200),
            'url'         => $fichier['url'],
            'moi'         => moi(),
        ]);
    } catch (PDOException $e) {
        supprimerFichier($fichier['url']);
        if (codeSql($e) === '23503') {
            throw new ApiException('Utilisateur introuvable', 400);
        }
        throw $e;
    }

    return json($response, ['document' => $stmt->fetch()], 201);
});

$group->delete('/documents/{id:' . UUID . '}', function (ServerRequestInterface $request, ResponseInterface $response, array $args) {
    $stmt = db()->prepare('DELETE FROM document WHERE id = :id RETURNING url');
    $stmt->execute(['id' => $args['id']]);
    $url = $stmt->fetchColumn();

    if ($url === false) {
        throw new ApiException('Document introuvable', 404);
    }
    supprimerFichier($url);

    return $response->withStatus(204);
});
