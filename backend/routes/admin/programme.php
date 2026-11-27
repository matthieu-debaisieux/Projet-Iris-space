<?php

declare(strict_types=1);

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

// Programme (CPT-02) : lectures qui complètent les écritures de utilisateurs.php
// (POST /matieres, PUT /professeurs/{id}/matieres, PUT /classes/{id}/matieres),
// et « Voir la classe » (CPT-03) côté administration.
// Les routes de liste des matières, salles, professeurs et cours pour l'emploi du temps
// (GET /matieres, /professeurs…) sont ailleurs : ici tout est sous /programme pour ne pas les doubler.

// Matières, avec le nombre de professeurs qui l'enseignent et de classes où elle est au programme
$group->get('/programme/matieres', function (ServerRequestInterface $request, ResponseInterface $response) {
    $matieres = db()->query(
        'SELECT m.id, m.code, m.nom,
                (SELECT count(*) FROM professeur_matiere pm WHERE pm.matiere_id = m.id) AS nb_professeurs,
                (SELECT count(*) FROM classe_matiere cm WHERE cm.matiere_id = m.id) AS nb_classes
         FROM matiere m
         ORDER BY m.nom'
    )->fetchAll();

    return json($response, ['matieres' => $matieres]);
});

// Tous les professeurs (même désactivés), chacun avec les matières qu'il enseigne
$group->get('/programme/professeurs', function (ServerRequestInterface $request, ResponseInterface $response) {
    $professeurs = db()->query(
        "SELECT u.id, u.identifiant, u.nom, u.prenom, u.actif,
                COALESCE(
                    json_agg(json_build_object('id', m.id, 'code', m.code, 'nom', m.nom) ORDER BY m.nom)
                        FILTER (WHERE m.id IS NOT NULL),
                    '[]'
                ) AS matieres
         FROM professeur p
         JOIN utilisateur u              ON u.id = p.utilisateur_id
         LEFT JOIN professeur_matiere pm ON pm.professeur_id = p.utilisateur_id
         LEFT JOIN matiere m             ON m.id = pm.matiere_id
         GROUP BY u.id
         ORDER BY u.nom, u.prenom"
    )->fetchAll();

    foreach ($professeurs as &$professeur) {
        $professeur['matieres'] = json_decode($professeur['matieres'], true);
    }

    return json($response, ['professeurs' => $professeurs]);
});

// Toutes les classes (années précédentes comprises), chacune avec son programme : matières et coefficients
// (coefficient en texte, comme les autres décimaux de l'API : "4.00")
$group->get('/programme/classes', function (ServerRequestInterface $request, ResponseInterface $response) {
    $classes = db()->query(
        "SELECT c.id, c.nom, a.libelle AS annee_scolaire, a.courante, ca.nom AS campus,
                COALESCE(
                    (SELECT json_agg(
                                json_build_object('id', m.id, 'code', m.code, 'nom', m.nom,
                                                  'coefficient', CAST(cm.coefficient AS text))
                                ORDER BY m.nom)
                     FROM classe_matiere cm
                     JOIN matiere m ON m.id = cm.matiere_id
                     WHERE cm.classe_id = c.id),
                    '[]'
                ) AS matieres
         FROM classe c
         JOIN annee_scolaire a ON a.id = c.annee_scolaire_id
         JOIN campus ca        ON ca.id = c.campus_id
         ORDER BY a.courante DESC, c.nom"
    )->fetchAll();

    foreach ($classes as &$classe) {
        $classe['matieres'] = json_decode($classe['matieres'], true);
    }

    return json($response, ['classes' => $classes]);
});

// « Voir la classe » : élèves actifs d'une classe, quelle qu'elle soit (l'administration voit tout).
// Pas d'e-mail, de téléphone ni d'adresse : la liste sert à reconnaître les élèves, pas à les contacter.
$group->get('/classes/{id:[0-9]{1,9}}/eleves', function (ServerRequestInterface $request, ResponseInterface $response, array $args) {
    $stmt = db()->prepare(
        'SELECT c.id, c.nom, a.libelle AS annee_scolaire, ca.nom AS campus
         FROM classe c
         JOIN annee_scolaire a ON a.id = c.annee_scolaire_id
         JOIN campus ca        ON ca.id = c.campus_id
         WHERE c.id = :id'
    );
    $stmt->execute(['id' => $args['id']]);
    $classe = $stmt->fetch();
    if (!$classe) {
        throw new ApiException('Classe introuvable', 404);
    }

    $stmt = db()->prepare(
        'SELECT u.id, u.nom, u.prenom, u.photo_url, e.numero_etudiant
         FROM eleve e
         JOIN utilisateur u ON u.id = e.utilisateur_id
         WHERE e.classe_id = :classe AND u.actif
         ORDER BY u.nom, u.prenom'
    );
    $stmt->execute(['classe' => $args['id']]);

    return json($response, ['classe' => $classe, 'eleves' => $stmt->fetchAll()]);
});
