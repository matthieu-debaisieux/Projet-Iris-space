<?php

declare(strict_types=1);

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

// Espace élève : l'id vient TOUJOURS de la session (moi()), jamais de l'URL,
// pour qu'un élève ne puisse lire que ses propres données.

$group->get('/profil', function (ServerRequestInterface $request, ResponseInterface $response) {
    $stmt = db()->prepare(
        'SELECT u.id, u.identifiant, u.email, u.nom, u.prenom, u.date_naissance, u.lieu_naissance,
                u.pays_naissance, u.nationalite, u.telephone, u.adresse, u.photo_url,
                e.numero_etudiant, e.classe_id, c.nom AS classe, a.libelle AS annee_scolaire
         FROM utilisateur u
         JOIN eleve e               ON e.utilisateur_id = u.id
         LEFT JOIN classe c         ON c.id = e.classe_id
         LEFT JOIN annee_scolaire a ON a.id = c.annee_scolaire_id
         WHERE u.id = :id'
    );
    $stmt->execute(['id' => moi()]);

    return json($response, ['profil' => $stmt->fetch()]);
});

// ?du=AAAA-MM-JJ&au=AAAA-MM-JJ (par défaut : aujourd'hui)
$group->get('/emploi-du-temps', function (ServerRequestInterface $request, ResponseInterface $response) {
    [$du, $au] = periode($request->getQueryParams());

    $stmt = db()->prepare(
        "SELECT cours_id AS id, debut, fin, annule, matiere, prof_nom, prof_prenom, salle
         FROM v_emploi_du_temps_eleve
         WHERE eleve_id = :id
           AND debut < CAST(:au AS date) + 1
           AND fin   > CAST(:du AS date)
         ORDER BY debut"
    );
    $stmt->execute(['id' => moi(), 'du' => $du, 'au' => $au]);

    return json($response, ['du' => $du, 'au' => $au, 'cours' => $stmt->fetchAll()]);
});

// Les plus récentes d'abord ; ?limit=3 pour le bloc « Dernières notes »
$group->get('/notes', function (ServerRequestInterface $request, ResponseInterface $response) {
    $limite = limite($request->getQueryParams());

    $stmt = db()->prepare(
        'SELECT ev.id AS evaluation_id, ev.titre, ev.date_eval, ev.coefficient, ev.bareme, ev.periode,
                m.id AS matiere_id, m.nom AS matiere, up.nom AS prof_nom, up.prenom AS prof_prenom,
                n.valeur, n.absent, n.commentaire
         FROM note n
         JOIN evaluation ev  ON ev.id = n.evaluation_id
         JOIN matiere m      ON m.id = ev.matiere_id
         JOIN utilisateur up ON up.id = ev.professeur_id
         WHERE n.eleve_id = :id
         ORDER BY ev.date_eval DESC, ev.titre'
        . ($limite ? " LIMIT $limite" : '')
    );
    $stmt->execute(['id' => moi()]);

    return json($response, ['notes' => $stmt->fetchAll()]);
});

// ?statut=a_faire pour le bloc « Travail à faire » ; les plus proches échéances d'abord
$group->get('/devoirs', function (ServerRequestInterface $request, ResponseInterface $response) {
    $statut = choix($request->getQueryParams(), 'statut', ['a_faire', 'fait', 'rendu', 'corrige']);

    $stmt = db()->prepare(
        "SELECT d.id, d.type, d.titre, d.description, d.donne_le, d.a_rendre_le, d.rendu_en_ligne,
                m.id AS matiere_id, m.nom AS matiere, up.nom AS prof_nom, up.prenom AS prof_prenom,
                de.statut, de.fait_at, de.rendu_at, de.commentaire_eleve, de.note, de.appreciation,
                COALESCE(
                  (SELECT json_agg(json_build_object('id', f.id, 'nom', f.nom, 'taille_o', f.taille_o))
                   FROM devoir_fichier f WHERE f.devoir_id = d.id),
                  '[]'
                ) AS fichiers
         FROM devoir_eleve de
         JOIN devoir d       ON d.id = de.devoir_id
         JOIN matiere m      ON m.id = d.matiere_id
         JOIN utilisateur up ON up.id = d.professeur_id
         WHERE de.eleve_id = :id
           AND (CAST(:statut AS statut_devoir) IS NULL OR de.statut = CAST(:statut2 AS statut_devoir))
         ORDER BY d.a_rendre_le NULLS LAST, d.donne_le DESC"
    );
    $stmt->execute(['id' => moi(), 'statut' => $statut, 'statut2' => $statut]);
    $devoirs = $stmt->fetchAll();

    foreach ($devoirs as &$devoir) {
        $devoir['fichiers'] = json_decode($devoir['fichiers'], true);
    }

    return json($response, ['devoirs' => $devoirs]);
});

// Ressources de la classe de l'élève, les plus récentes d'abord
$group->get('/ressources', function (ServerRequestInterface $request, ResponseInterface $response) {
    $limite = limite($request->getQueryParams());

    $stmt = db()->prepare(
        'SELECT r.id, r.type, r.titre, r.contenu, r.url, r.created_at,
                m.id AS matiere_id, m.nom AS matiere, up.nom AS prof_nom, up.prenom AS prof_prenom
         FROM eleve e
         JOIN ressource r    ON r.classe_id = e.classe_id
         JOIN matiere m      ON m.id = r.matiere_id
         JOIN utilisateur up ON up.id = r.professeur_id
         WHERE e.utilisateur_id = :id
         ORDER BY r.created_at DESC'
        . ($limite ? " LIMIT $limite" : '')
    );
    $stmt->execute(['id' => moi()]);

    return json($response, ['ressources' => $stmt->fetchAll()]);
});

// Absences et retards, avec un résumé pour le bloc « Vie scolaire ».
// ponctualite = % des cours passés de la classe sans absence ni retard (null s'il n'y a eu aucun cours)
$group->get('/absences', function (ServerRequestInterface $request, ResponseInterface $response) {
    $stmt = db()->prepare(
        'SELECT a.id, a.type, a.date_absence, a.duree_heures, a.minutes_retard, a.libelle,
                a.justifie, a.motif, a.cours_id, co.debut AS cours_debut, co.fin AS cours_fin, m.nom AS matiere
         FROM absence a
         LEFT JOIN cours co  ON co.id = a.cours_id
         LEFT JOIN matiere m ON m.id = co.matiere_id
         WHERE a.eleve_id = :id
         ORDER BY a.date_absence DESC, co.debut DESC'
    );
    $stmt->execute(['id' => moi()]);
    $absences = $stmt->fetchAll();

    $stmt = db()->prepare(
        'SELECT count(*) AS cours_passes,
                count(*) FILTER (WHERE EXISTS (
                  SELECT 1 FROM absence a WHERE a.cours_id = co.id AND a.eleve_id = :id1
                )) AS cours_manques
         FROM eleve e
         JOIN cours co ON co.classe_id = e.classe_id
         WHERE e.utilisateur_id = :id2 AND NOT co.annule AND co.fin < now()'
    );
    $stmt->execute(['id1' => moi(), 'id2' => moi()]);
    $cours = $stmt->fetch();

    $resume = [
        'absences'                => 0,
        'absences_non_justifiees' => 0,
        'heures_absence'          => 0.0,
        'retards'                 => 0,
        'ponctualite'             => $cours['cours_passes'] > 0
            ? (int) round(100 * ($cours['cours_passes'] - $cours['cours_manques']) / $cours['cours_passes'])
            : null,
    ];
    foreach ($absences as $absence) {
        if ($absence['type'] === 'retard') {
            $resume['retards']++;
            continue;
        }
        $resume['absences']++;
        $resume['heures_absence'] += (float) $absence['duree_heures'];
        if (!$absence['justifie']) {
            $resume['absences_non_justifiees']++;
        }
    }

    return json($response, ['resume' => $resume, 'absences' => $absences]);
});

// { "fait": true } → statut « fait » ; { "fait": false } → retour à « à faire »
$group->patch('/devoirs/{id:' . UUID . '}', function (ServerRequestInterface $request, ResponseInterface $response, array $args) {
    $fait = booleen(corps($request), 'fait') ?? throw new ApiException('Le champ « fait » est requis', 400);

    $stmt = db()->prepare('SELECT statut FROM devoir_eleve WHERE devoir_id = :devoir AND eleve_id = :id');
    $stmt->execute(['devoir' => $args['id'], 'id' => moi()]);
    $statut = $stmt->fetchColumn();

    if ($statut === false) {
        throw new ApiException('Devoir introuvable', 404);
    }
    if (in_array($statut, ['rendu', 'corrige'], true)) {
        throw new ApiException('Ce devoir a déjà été rendu', 409);
    }

    $stmt = db()->prepare(
        "UPDATE devoir_eleve
         SET statut = CAST(:statut AS statut_devoir), fait_at = CASE WHEN :fait THEN now() END
         WHERE devoir_id = :devoir AND eleve_id = :id
         RETURNING devoir_id, statut, fait_at"
    );
    $stmt->execute([
        'statut' => $fait ? 'fait' : 'a_faire',
        'fait'   => $fait ? 'true' : 'false',
        'devoir' => $args['id'],
        'id'     => moi(),
    ]);

    return json($response, ['devoir' => $stmt->fetch()]);
});

// Formulaire multipart : fichier (obligatoire), commentaire (facultatif).
// On peut déposer plusieurs fichiers en rappelant la route, tant que le devoir n'est pas corrigé.
$group->post('/devoirs/{id:' . UUID . '}/rendu', function (ServerRequestInterface $request, ResponseInterface $response, array $args) {
    $commentaire = texte(corps($request), 'commentaire', 5000);

    $stmt = db()->prepare(
        'SELECT de.statut, d.rendu_en_ligne
         FROM devoir_eleve de JOIN devoir d ON d.id = de.devoir_id
         WHERE de.devoir_id = :devoir AND de.eleve_id = :id'
    );
    $stmt->execute(['devoir' => $args['id'], 'id' => moi()]);
    $devoir = $stmt->fetch();

    if (!$devoir) {
        throw new ApiException('Devoir introuvable', 404);
    }
    if (!$devoir['rendu_en_ligne']) {
        throw new ApiException('Ce devoir ne se rend pas en ligne', 400);
    }
    if ($devoir['statut'] === 'corrige') {
        throw new ApiException('Ce devoir est déjà corrigé', 409);
    }

    $fichier = enregistrerFichier($request, 'rendus');

    try {
        $rendu = transaction(function (PDO $pdo) use ($args, $fichier, $commentaire) {
            $stmt = $pdo->prepare(
                'INSERT INTO devoir_rendu_fichier (devoir_id, eleve_id, nom, url)
                 VALUES (:devoir, :id, :nom, :url)
                 RETURNING id, nom, depose_at'
            );
            $stmt->execute(['devoir' => $args['id'], 'id' => moi(), 'nom' => $fichier['nom'], 'url' => $fichier['url']]);
            $depot = $stmt->fetch();

            $stmt = $pdo->prepare(
                "UPDATE devoir_eleve
                 SET statut = 'rendu', rendu_at = now(), commentaire_eleve = COALESCE(:commentaire, commentaire_eleve)
                 WHERE devoir_id = :devoir AND eleve_id = :id
                 RETURNING statut, rendu_at, commentaire_eleve"
            );
            $stmt->execute(['commentaire' => $commentaire, 'devoir' => $args['id'], 'id' => moi()]);

            return $stmt->fetch() + ['fichier' => $depot];
        });
    } catch (Throwable $e) {
        supprimerFichier($fichier['url']);
        throw $e;
    }

    return json($response, ['rendu' => $rendu], 201);
});

// Documents généraux (sans utilisateur) et documents déposés pour cet élève
$group->get('/documents', function (ServerRequestInterface $request, ResponseInterface $response) {
    $stmt = db()->prepare(
        'SELECT d.id, d.titre, d.created_at, t.id AS espace_id, t.nom AS espace,
                (d.utilisateur_id IS NOT NULL) AS personnel
         FROM document d
         JOIN type_document t ON t.id = d.type_document_id
         WHERE d.utilisateur_id IS NULL OR d.utilisateur_id = :id
         ORDER BY t.nom, d.created_at DESC'
    );
    $stmt->execute(['id' => moi()]);

    return json($response, ['documents' => $stmt->fetchAll()]);
});
