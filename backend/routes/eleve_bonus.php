<?php

declare(strict_types=1);

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

// ---------------------------------------------------------------------
// GET /api/eleve/moyennes : mes moyennes par matière + moyenne générale
// (vue v_moyenne_matiere ; l'élève vient de la session)
// ---------------------------------------------------------------------
$group->get('/eleve/moyennes', function (ServerRequestInterface $request, ResponseInterface $response) {
    $stmt = db()->prepare(
        'SELECT m.id AS matiere_id, m.nom AS matiere, cm.coefficient, v.moyenne_sur_20
         FROM v_moyenne_matiere v
         JOIN matiere m ON m.id = v.matiere_id
         JOIN eleve e   ON e.utilisateur_id = v.eleve_id
         LEFT JOIN classe_matiere cm ON cm.classe_id = e.classe_id AND cm.matiere_id = v.matiere_id
         WHERE v.eleve_id = :id
         ORDER BY m.nom'
    );
    $stmt->execute(['id' => moi()]);

    $moyennes  = [];
    $somme     = 0.0;
    $sommeCoef = 0.0;
    foreach ($stmt->fetchAll() as $ligne) {
        $moyenne = decimal($ligne['moyenne_sur_20']);
        // Matière absente du programme de la classe actuelle (changement de classe) : coefficient 1
        $coef = decimal($ligne['coefficient']) ?? 1.0;

        $moyennes[] = [
            'matiere_id'     => (int) $ligne['matiere_id'],
            'matiere'        => $ligne['matiere'],
            'coefficient'    => $coef,
            'moyenne_sur_20' => $moyenne,
        ];
        if ($moyenne !== null) {
            $somme += $moyenne * $coef;
            $sommeCoef += $coef;
        }
    }

    return json($response, [
        'moyennes'         => $moyennes,
        'moyenne_generale' => $sommeCoef > 0 ? round($somme / $sommeCoef, 2) : null,
    ]);
})->add(requireRole('eleve'));

// ---------------------------------------------------------------------
// POST /api/eleve/absences/{id}/justificatif : joindre un justificatif à une de MES absences
// Formulaire multipart : « fichier » (obligatoire), « motif » (facultatif)
// Le fichier est rangé dans uploads/justificatifs/ ; absence.justificatif_url reçoit son chemin.
// `justifie` reste à false : c'est l'administration qui valide (PATCH /api/admin/absences/{id}).
// Une absence avec justificatif_url renseigné et justifie = false est donc « en attente ».
// ---------------------------------------------------------------------
$group->post('/eleve/absences/{id:' . UUID . '}/justificatif', function (ServerRequestInterface $request, ResponseInterface $response, array $args) {
    $motif = texte(corps($request), 'motif', 2000);

    // Une absence qui n'est pas la mienne est traitée comme inexistante (404)
    $stmt = db()->prepare('SELECT justifie, justificatif_url FROM absence WHERE id = :id AND eleve_id = :eleve');
    $stmt->execute(['id' => $args['id'], 'eleve' => moi()]);
    $absence = $stmt->fetch();

    if (!$absence) {
        throw new ApiException('Absence introuvable', 404);
    }
    if ($absence['justifie']) {
        throw new ApiException('Cette absence est déjà justifiée', 409);
    }

    // Le fichier n'est enregistré qu'après les vérifications ci-dessus
    $fichier = enregistrerFichier($request, 'justificatifs');

    try {
        $stmt = db()->prepare(
            'UPDATE absence SET justificatif_url = :url, motif = COALESCE(:motif, motif)
             WHERE id = :id AND eleve_id = :eleve
             RETURNING id, type, date_absence, duree_heures, minutes_retard, libelle,
                       justifie, motif, justificatif_url'
        );
        $stmt->execute(['url' => $fichier['url'], 'motif' => $motif, 'id' => $args['id'], 'eleve' => moi()]);
    } catch (Throwable $e) {
        supprimerFichier($fichier['url']); // pas de fichier orphelin si la base refuse
        throw $e;
    }

    supprimerFichier($absence['justificatif_url']); // l'ancien justificatif est remplacé

    return json($response, ['absence' => $stmt->fetch()]);
})->add(requireRole('eleve'));