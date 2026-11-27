<?php

declare(strict_types=1);

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

// Actualités. Pas de statut « archivé » dans la bêta : un article est soit un brouillon
// (publie_at vaut NULL), soit publié (publie_at renseigné). `publique` dit si les visiteurs
// sans connexion peuvent le lire. L'auteur est toujours le compte connecté (auteur_id) :
// le corps de la requête ne peut pas le choisir.
// Lecture : tout utilisateur connecté. Écriture : admin et direction sur tous les articles,
// un professeur seulement sur les siens (403 sinon).

const STATUTS_ACTUALITE = ['publie', 'brouillon'];

// Forme d'un article dans toutes les réponses (la table actualite est jointe en « a », son auteur en « u »)
const COLONNES_ACTUALITE = "a.id, a.titre, a.contenu, a.image_url, a.publique,
    CASE WHEN a.publie_at IS NULL THEN 'brouillon' ELSE 'publie' END AS statut,
    a.publie_at, a.created_at, a.updated_at,
    a.auteur_id, u.nom AS auteur_nom, u.prenom AS auteur_prenom";

// Champs communs à la création et à la modification (PUT remplace tout)
function champsActualite(array $data): array
{
    $statut = choix($data, 'statut', STATUTS_ACTUALITE);
    if ($statut === null) {
        throw new ApiException('Le champ « statut » est requis', 400);
    }

    return [
        'titre'     => texte($data, 'titre', 200, true),
        'contenu'   => texte($data, 'contenu', 100000, true),
        'image_url' => urlOuChemin($data, 'image_url'),
        'publique'  => booleen($data, 'publique', false) ? 'true' : 'false',
        'publie'    => $statut === 'publie' ? 'true' : 'false',
    ];
}

function lireActualite(string $id): array|false
{
    $stmt = db()->prepare(
        'SELECT ' . COLONNES_ACTUALITE . '
         FROM actualite a
         JOIN utilisateur u ON u.id = a.auteur_id
         WHERE a.id = :id'
    );
    $stmt->execute(['id' => $id]);
    return $stmt->fetch();
}

function roleConnecte(): string
{
    $stmt = db()->prepare('SELECT role FROM utilisateur WHERE id = :id');
    $stmt->execute(['id' => moi()]);
    return (string) $stmt->fetchColumn();
}

// 404 si l'article n'existe pas ; 403 si un professeur essaie de toucher à l'article de quelqu'un d'autre
function verifierDroitSurActualite(string $id): void
{
    $stmt = db()->prepare('SELECT auteur_id FROM actualite WHERE id = :id');
    $stmt->execute(['id' => $id]);
    $auteurId = $stmt->fetchColumn();

    if ($auteurId === false) {
        throw new ApiException('Article introuvable', 404);
    }
    if (roleConnecte() === 'professeur' && $auteurId !== moi()) {
        throw new ApiException('Vous ne pouvez modifier que vos propres articles', 403);
    }
}

// ---------------------------------------------------------------------
// GET /api/actualites/publiques?limit= : articles publiés et publics, sans connexion
// ---------------------------------------------------------------------
$group->get('/actualites/publiques', function (ServerRequestInterface $request, ResponseInterface $response) {
    $limite = limite($request->getQueryParams()) ?? 100;

    $stmt = db()->prepare(
        'SELECT ' . COLONNES_ACTUALITE . '
         FROM actualite a
         JOIN utilisateur u ON u.id = a.auteur_id
         WHERE a.publie_at IS NOT NULL AND a.publique
         ORDER BY a.publie_at DESC
         LIMIT :limite'
    );
    $stmt->bindValue(':limite', $limite, PDO::PARAM_INT);
    $stmt->execute();

    return json($response, ['actualites' => $stmt->fetchAll()]);
});

// ---------------------------------------------------------------------
// GET /api/actualites?limit=&brouillons=true : articles publiés, les plus récents d'abord
// Avec brouillons=true, admin et direction reçoivent aussi tous les brouillons, un professeur
// les siens (sans effet pour un élève).
// ---------------------------------------------------------------------
$group->get('/actualites', function (ServerRequestInterface $request, ResponseInterface $response) {
    $query      = $request->getQueryParams();
    $limite     = limite($query) ?? 100;
    $brouillons = booleen($query, 'brouillons', false);

    $where = 'a.publie_at IS NOT NULL';
    $siens = false;
    if ($brouillons) {
        $role = roleConnecte();
        if (in_array($role, ['administrateur', 'direction', 'dev'], true)) {
            $where = 'TRUE';
        } elseif ($role === 'professeur') {
            $where .= ' OR a.auteur_id = :moi';
            $siens = true;
        }
    }

    $stmt = db()->prepare(
        'SELECT ' . COLONNES_ACTUALITE . "
         FROM actualite a
         JOIN utilisateur u ON u.id = a.auteur_id
         WHERE $where
         ORDER BY COALESCE(a.publie_at, a.created_at) DESC, a.created_at DESC
         LIMIT :limite"
    );
    if ($siens) {
        $stmt->bindValue(':moi', moi());
    }
    $stmt->bindValue(':limite', $limite, PDO::PARAM_INT);
    $stmt->execute();

    return json($response, ['actualites' => $stmt->fetchAll()]);
})->add(requireConnecte());

// ---------------------------------------------------------------------
// POST /api/actualites : créer un article (l'auteur est l'utilisateur connecté)
// Corps : { "titre", "contenu", "statut": "publie" | "brouillon", "image_url"?, "publique"? (faux par défaut) }
// ---------------------------------------------------------------------
$group->post('/actualites', function (ServerRequestInterface $request, ResponseInterface $response) {
    $champs = champsActualite(corps($request));

    // Publier = renseigner publie_at ; un brouillon le laisse à NULL
    $stmt = db()->prepare(
        'INSERT INTO actualite (auteur_id, titre, contenu, image_url, publique, publie_at)
         VALUES (:moi, :titre, :contenu, :image_url, CAST(:publique AS boolean),
                 CASE WHEN CAST(:publie AS boolean) THEN now() END)
         RETURNING id'
    );
    $stmt->execute($champs + ['moi' => moi()]);

    return json($response, ['actualite' => lireActualite($stmt->fetchColumn())], 201);
})->add(requireRole('administrateur', 'direction', 'dev', 'professeur'));

// ---------------------------------------------------------------------
// PUT /api/actualites/{id} : modifier un article (même corps que la création, PUT remplace tout)
// L'auteur ne change pas. Un article déjà publié garde sa date de publication ; repasser en
// brouillon l'efface, et le publier à nouveau la fixe à maintenant.
// ---------------------------------------------------------------------
$group->put('/actualites/{id:' . UUID . '}', function (ServerRequestInterface $request, ResponseInterface $response, array $args) {
    verifierDroitSurActualite($args['id']);
    $champs = champsActualite(corps($request));

    $stmt = db()->prepare(
        'UPDATE actualite
         SET titre = :titre, contenu = :contenu, image_url = :image_url,
             publique = CAST(:publique AS boolean),
             publie_at = CASE WHEN CAST(:publie AS boolean) THEN COALESCE(publie_at, now()) END
         WHERE id = :id'
    );
    $stmt->execute($champs + ['id' => $args['id']]);

    return json($response, ['actualite' => lireActualite($args['id'])]);
})->add(requireRole('administrateur', 'direction', 'dev', 'professeur'));

// ---------------------------------------------------------------------
// DELETE /api/actualites/{id} : supprimer un article (204)
// ---------------------------------------------------------------------
$group->delete('/actualites/{id:' . UUID . '}', function (ServerRequestInterface $request, ResponseInterface $response, array $args) {
    verifierDroitSurActualite($args['id']);

    $stmt = db()->prepare('DELETE FROM actualite WHERE id = :id');
    $stmt->execute(['id' => $args['id']]);

    return $response->withStatus(204);
})->add(requireRole('administrateur', 'direction', 'dev', 'professeur'));
