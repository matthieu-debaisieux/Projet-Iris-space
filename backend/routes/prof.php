<?php

declare(strict_types=1);

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

// Espace professeur : un prof ne voit et ne modifie que ses propres devoirs, évaluations et ressources.
// Pour créer, la base vérifie elle-même (clés étrangères) qu'il enseigne la matière
// et que la matière est au programme de la classe.

const TYPES_DEVOIR = ['travail_a_faire', 'controle', 'projet', 'lecture'];
const TYPES_RESSOURCE = ['fichier', 'lien', 'texte'];

// Erreur SQL attendue quand le couple classe / matière ne correspond pas au prof
function erreurClasseMatiere(PDOException $e): never
{
    throw match (codeSql($e)) {
        '23503' => new ApiException("Classe ou matière invalide : vous n'enseignez pas cette matière dans cette classe", 400),
        default => $e,
    };
}

// 404 si l'élément n'existe pas ou n'appartient pas au prof connecté
function verifierProprietaire(string $table, string $id): void
{
    $stmt = db()->prepare("SELECT 1 FROM $table WHERE id = :id AND professeur_id = :moi");
    $stmt->execute(['id' => $id, 'moi' => moi()]);
    if (!$stmt->fetch()) {
        $noms = ['devoir' => 'Devoir introuvable', 'evaluation' => 'Évaluation introuvable', 'ressource' => 'Ressource introuvable'];
        throw new ApiException($noms[$table], 404);
    }
}

// Le prof enseigne-t-il au moins une matière au programme de cette classe ?
function verifierClasse(int $classeId): void
{
    $stmt = db()->prepare(
        'SELECT 1 FROM classe_matiere cm
         JOIN professeur_matiere pm ON pm.matiere_id = cm.matiere_id
         WHERE cm.classe_id = :classe AND pm.professeur_id = :moi
         LIMIT 1'
    );
    $stmt->execute(['classe' => $classeId, 'moi' => moi()]);
    if (!$stmt->fetch()) {
        throw new ApiException('Classe introuvable', 404);
    }
}

function lireDevoir(string $id): array
{
    $stmt = db()->prepare(
        "SELECT d.id, d.classe_id, c.nom AS classe, d.matiere_id, m.nom AS matiere, d.cours_id, d.type,
                d.titre, d.description, d.donne_le, d.a_rendre_le, d.rendu_en_ligne, d.created_at, d.updated_at,
                count(de.eleve_id) AS eleves,
                count(*) FILTER (WHERE de.statut IN ('fait', 'rendu', 'corrige')) AS faits,
                count(*) FILTER (WHERE de.statut IN ('rendu', 'corrige')) AS rendus
         FROM devoir d
         JOIN classe c  ON c.id = d.classe_id
         JOIN matiere m ON m.id = d.matiere_id
         LEFT JOIN devoir_eleve de ON de.devoir_id = d.id
         WHERE d.id = :id
         GROUP BY d.id, c.nom, m.nom"
    );
    $stmt->execute(['id' => $id]);
    return $stmt->fetch();
}

function lireEvaluation(string $id): array
{
    $stmt = db()->prepare(
        'SELECT ev.id, ev.classe_id, c.nom AS classe, ev.matiere_id, m.nom AS matiere, ev.devoir_id,
                ev.titre, ev.date_eval, ev.coefficient, ev.bareme, ev.periode,
                count(n.valeur) AS notes, ROUND(avg(n.valeur), 2) AS moyenne
         FROM evaluation ev
         JOIN classe c  ON c.id = ev.classe_id
         JOIN matiere m ON m.id = ev.matiere_id
         LEFT JOIN note n ON n.evaluation_id = ev.id
         WHERE ev.id = :id
         GROUP BY ev.id, c.nom, m.nom'
    );
    $stmt->execute(['id' => $id]);
    return $stmt->fetch();
}

// Tous les élèves de la classe de l'évaluation, avec leur note (null si pas encore saisie)
function lireNotes(string $evaluationId): array
{
    $stmt = db()->prepare(
        'SELECT u.id AS eleve_id, u.nom, u.prenom, n.valeur, n.absent, n.commentaire
         FROM evaluation ev
         JOIN eleve e       ON e.classe_id = ev.classe_id
         JOIN utilisateur u ON u.id = e.utilisateur_id
         LEFT JOIN note n   ON n.evaluation_id = ev.id AND n.eleve_id = e.utilisateur_id
         WHERE ev.id = :id
         ORDER BY u.nom, u.prenom'
    );
    $stmt->execute(['id' => $evaluationId]);
    return $stmt->fetchAll();
}

// Champs modifiables d'un devoir (création et modification)
function champsDevoir(array $data): array
{
    return [
        'type'           => choix($data, 'type', TYPES_DEVOIR, 'travail_a_faire'),
        'titre'          => texte($data, 'titre', 200, true),
        'description'    => texte($data, 'description', 10000),
        'a_rendre_le'    => dateHeure($data, 'a_rendre_le'),
        'rendu_en_ligne' => booleen($data, 'rendu_en_ligne', false) ? 'true' : 'false',
    ];
}

// Champs modifiables d'une évaluation (création et modification)
function champsEvaluation(array $data): array
{
    $coefficient = nombre($data, 'coefficient') ?? 1.0;
    $bareme = nombre($data, 'bareme') ?? 20.0;
    if ($coefficient <= 0 || $coefficient >= 100) {
        throw new ApiException('Le coefficient doit être entre 0 et 100', 400);
    }
    if ($bareme <= 0 || $bareme >= 1000) {
        throw new ApiException('Le barème doit être entre 0 et 1000', 400);
    }

    return [
        'titre'       => texte($data, 'titre', 200, true),
        'date_eval'   => dateJour($data, 'date_eval', true),
        'coefficient' => $coefficient,
        'bareme'      => $bareme,
        'periode'     => texte($data, 'periode', 30),
    ];
}

// ---------------------------------------------------------------------
// EMPLOI DU TEMPS ET CLASSES
// ---------------------------------------------------------------------

// ?du=AAAA-MM-JJ&au=AAAA-MM-JJ (par défaut : aujourd'hui)
$group->get('/emploi-du-temps', function (ServerRequestInterface $request, ResponseInterface $response) {
    [$du, $au] = periode($request->getQueryParams());

    $stmt = db()->prepare(
        'SELECT co.id, co.debut, co.fin, co.annule, co.commentaire,
                cl.id AS classe_id, cl.nom AS classe, m.id AS matiere_id, m.nom AS matiere, s.nom AS salle
         FROM cours co
         JOIN classe cl    ON cl.id = co.classe_id
         JOIN matiere m    ON m.id = co.matiere_id
         LEFT JOIN salle s ON s.id = co.salle_id
         WHERE co.professeur_id = :moi
           AND co.debut < CAST(:au AS date) + 1
           AND co.fin   > CAST(:du AS date)
         ORDER BY co.debut'
    );
    $stmt->execute(['moi' => moi(), 'du' => $du, 'au' => $au]);

    return json($response, ['du' => $du, 'au' => $au, 'cours' => $stmt->fetchAll()]);
});

// Classes de l'année en cours où le prof enseigne au moins une matière, avec ces matières
$group->get('/classes', function (ServerRequestInterface $request, ResponseInterface $response) {
    $stmt = db()->prepare(
        "SELECT c.id, c.nom,
                json_agg(json_build_object('id', m.id, 'nom', m.nom, 'coefficient', cm.coefficient) ORDER BY m.nom) AS matieres
         FROM classe c
         JOIN annee_scolaire a      ON a.id = c.annee_scolaire_id AND a.courante
         JOIN classe_matiere cm     ON cm.classe_id = c.id
         JOIN professeur_matiere pm ON pm.matiere_id = cm.matiere_id AND pm.professeur_id = :moi
         JOIN matiere m             ON m.id = cm.matiere_id
         GROUP BY c.id
         ORDER BY c.nom"
    );
    $stmt->execute(['moi' => moi()]);
    $classes = $stmt->fetchAll();

    foreach ($classes as &$classe) {
        $classe['matieres'] = json_decode($classe['matieres'], true);
    }

    return json($response, ['classes' => $classes]);
});

$group->get('/classes/{id:[0-9]+}/eleves', function (ServerRequestInterface $request, ResponseInterface $response, array $args) {
    verifierClasse((int) $args['id']);

    $stmt = db()->prepare(
        'SELECT u.id, u.nom, u.prenom, u.photo_url, e.numero_etudiant
         FROM eleve e JOIN utilisateur u ON u.id = e.utilisateur_id
         WHERE e.classe_id = :classe AND u.actif
         ORDER BY u.nom, u.prenom'
    );
    $stmt->execute(['classe' => $args['id']]);

    return json($response, ['eleves' => $stmt->fetchAll()]);
});

// ---------------------------------------------------------------------
// DEVOIRS
// ---------------------------------------------------------------------

// ?classe_id= facultatif ; avec le nombre d'élèves qui l'ont fait ou rendu
$group->get('/devoirs', function (ServerRequestInterface $request, ResponseInterface $response) {
    $classeId = entier($request->getQueryParams(), 'classe_id');

    $stmt = db()->prepare(
        "SELECT d.id, d.classe_id, c.nom AS classe, d.matiere_id, m.nom AS matiere, d.type, d.titre,
                d.donne_le, d.a_rendre_le, d.rendu_en_ligne,
                count(de.eleve_id) AS eleves,
                count(*) FILTER (WHERE de.statut IN ('fait', 'rendu', 'corrige')) AS faits,
                count(*) FILTER (WHERE de.statut IN ('rendu', 'corrige')) AS rendus
         FROM devoir d
         JOIN classe c  ON c.id = d.classe_id
         JOIN matiere m ON m.id = d.matiere_id
         LEFT JOIN devoir_eleve de ON de.devoir_id = d.id
         WHERE d.professeur_id = :moi
           AND (CAST(:classe AS int) IS NULL OR d.classe_id = CAST(:classe2 AS int))
         GROUP BY d.id, c.nom, m.nom
         ORDER BY d.a_rendre_le DESC NULLS LAST, d.donne_le DESC"
    );
    $stmt->execute(['moi' => moi(), 'classe' => $classeId, 'classe2' => $classeId]);

    return json($response, ['devoirs' => $stmt->fetchAll()]);
});

// Un suivi (devoir_eleve) est créé automatiquement pour chaque élève de la classe (trigger SQL)
$group->post('/devoirs', function (ServerRequestInterface $request, ResponseInterface $response) {
    $data = corps($request);
    $champs = champsDevoir($data) + [
        'classe_id'  => entier($data, 'classe_id', true),
        'matiere_id' => entier($data, 'matiere_id', true),
        'cours_id'   => uuid($data, 'cours_id'),
        'moi'        => moi(),
    ];

    try {
        $stmt = db()->prepare(
            'INSERT INTO devoir (classe_id, matiere_id, professeur_id, cours_id, type, titre, description,
                                 a_rendre_le, rendu_en_ligne)
             VALUES (:classe_id, :matiere_id, :moi, :cours_id, :type, :titre, :description,
                     :a_rendre_le, :rendu_en_ligne)
             RETURNING id'
        );
        $stmt->execute($champs);
    } catch (PDOException $e) {
        erreurClasseMatiere($e);
    }

    return json($response, ['devoir' => lireDevoir($stmt->fetchColumn())], 201);
});

// La classe et la matière ne se modifient pas (les suivis des élèves en dépendent)
$group->put('/devoirs/{id:' . UUID . '}', function (ServerRequestInterface $request, ResponseInterface $response, array $args) {
    $champs = champsDevoir(corps($request));
    verifierProprietaire('devoir', $args['id']);

    $stmt = db()->prepare(
        'UPDATE devoir SET type = :type, titre = :titre, description = :description,
                           a_rendre_le = :a_rendre_le, rendu_en_ligne = :rendu_en_ligne
         WHERE id = :id'
    );
    $stmt->execute($champs + ['id' => $args['id']]);

    return json($response, ['devoir' => lireDevoir($args['id'])]);
});

$group->delete('/devoirs/{id:' . UUID . '}', function (ServerRequestInterface $request, ResponseInterface $response, array $args) {
    verifierProprietaire('devoir', $args['id']);

    $fichiers = transaction(function (PDO $pdo) use ($args) {
        // Chemins des fichiers à effacer du disque (les lignes partent en cascade)
        $stmt = $pdo->prepare(
            'SELECT url FROM devoir_rendu_fichier WHERE devoir_id = :id1
             UNION ALL
             SELECT url FROM devoir_fichier WHERE devoir_id = :id2'
        );
        $stmt->execute(['id1' => $args['id'], 'id2' => $args['id']]);
        $fichiers = $stmt->fetchAll(PDO::FETCH_COLUMN);

        $pdo->prepare('DELETE FROM devoir WHERE id = :id')->execute(['id' => $args['id']]);
        return $fichiers;
    });

    foreach ($fichiers as $url) {
        supprimerFichier($url);
    }

    return $response->withStatus(204);
});

// Statut de chaque élève, avec les fichiers rendus
$group->get('/devoirs/{id:' . UUID . '}/suivi', function (ServerRequestInterface $request, ResponseInterface $response, array $args) {
    verifierProprietaire('devoir', $args['id']);

    $stmt = db()->prepare(
        "SELECT u.id AS eleve_id, u.nom, u.prenom, de.statut, de.fait_at, de.rendu_at,
                de.commentaire_eleve, de.note, de.appreciation, de.corrige_at,
                COALESCE(
                  json_agg(json_build_object('id', f.id, 'nom', f.nom, 'depose_at', f.depose_at) ORDER BY f.depose_at)
                    FILTER (WHERE f.id IS NOT NULL),
                  '[]'
                ) AS fichiers
         FROM devoir_eleve de
         JOIN utilisateur u ON u.id = de.eleve_id
         LEFT JOIN devoir_rendu_fichier f ON f.devoir_id = de.devoir_id AND f.eleve_id = de.eleve_id
         WHERE de.devoir_id = :id
         GROUP BY u.id, de.devoir_id, de.eleve_id
         ORDER BY u.nom, u.prenom"
    );
    $stmt->execute(['id' => $args['id']]);
    $suivi = $stmt->fetchAll();

    foreach ($suivi as &$ligne) {
        $ligne['fichiers'] = json_decode($ligne['fichiers'], true);
    }

    return json($response, ['devoir' => lireDevoir($args['id']), 'eleves' => $suivi]);
});

// ---------------------------------------------------------------------
// ÉVALUATIONS ET NOTES
// ---------------------------------------------------------------------

// ?classe_id=&matiere_id= facultatifs ; avec le nombre de notes saisies et la moyenne
$group->get('/evaluations', function (ServerRequestInterface $request, ResponseInterface $response) {
    $query = $request->getQueryParams();
    $classeId = entier($query, 'classe_id');
    $matiereId = entier($query, 'matiere_id');

    $stmt = db()->prepare(
        'SELECT ev.id, ev.classe_id, c.nom AS classe, ev.matiere_id, m.nom AS matiere, ev.devoir_id,
                ev.titre, ev.date_eval, ev.coefficient, ev.bareme, ev.periode,
                count(n.valeur) AS notes, ROUND(avg(n.valeur), 2) AS moyenne
         FROM evaluation ev
         JOIN classe c  ON c.id = ev.classe_id
         JOIN matiere m ON m.id = ev.matiere_id
         LEFT JOIN note n ON n.evaluation_id = ev.id
         WHERE ev.professeur_id = :moi
           AND (CAST(:classe AS int) IS NULL OR ev.classe_id = CAST(:classe2 AS int))
           AND (CAST(:matiere AS int) IS NULL OR ev.matiere_id = CAST(:matiere2 AS int))
         GROUP BY ev.id, c.nom, m.nom
         ORDER BY ev.date_eval DESC, ev.titre'
    );
    $stmt->execute([
        'moi'     => moi(),
        'classe'  => $classeId,  'classe2'  => $classeId,
        'matiere' => $matiereId, 'matiere2' => $matiereId,
    ]);

    return json($response, ['evaluations' => $stmt->fetchAll()]);
});

$group->post('/evaluations', function (ServerRequestInterface $request, ResponseInterface $response) {
    $data = corps($request);
    $champs = champsEvaluation($data) + [
        'classe_id'  => entier($data, 'classe_id', true),
        'matiere_id' => entier($data, 'matiere_id', true),
        'devoir_id'  => uuid($data, 'devoir_id'),
        'moi'        => moi(),
    ];
    if ($champs['devoir_id'] !== null) {
        verifierProprietaire('devoir', $champs['devoir_id']);
    }

    try {
        $stmt = db()->prepare(
            'INSERT INTO evaluation (classe_id, matiere_id, professeur_id, devoir_id, titre, date_eval,
                                     coefficient, bareme, periode)
             VALUES (:classe_id, :matiere_id, :moi, :devoir_id, :titre, :date_eval,
                     :coefficient, :bareme, :periode)
             RETURNING id'
        );
        $stmt->execute($champs);
    } catch (PDOException $e) {
        erreurClasseMatiere($e);
    }

    return json($response, ['evaluation' => lireEvaluation($stmt->fetchColumn())], 201);
});

// La classe et la matière ne se modifient pas (les notes sont liées aux élèves de la classe)
$group->put('/evaluations/{id:' . UUID . '}', function (ServerRequestInterface $request, ResponseInterface $response, array $args) {
    $champs = champsEvaluation(corps($request));
    verifierProprietaire('evaluation', $args['id']);

    // Le nouveau barème ne doit pas être inférieur à une note déjà saisie
    $stmt = db()->prepare('SELECT max(valeur) FROM note WHERE evaluation_id = :id');
    $stmt->execute(['id' => $args['id']]);
    $max = $stmt->fetchColumn();
    if ($max !== null && (float) $max > $champs['bareme']) {
        throw new ApiException("Le barème est inférieur à une note déjà saisie ($max)", 400);
    }

    $stmt = db()->prepare(
        'UPDATE evaluation SET titre = :titre, date_eval = :date_eval, coefficient = :coefficient,
                               bareme = :bareme, periode = :periode
         WHERE id = :id'
    );
    $stmt->execute($champs + ['id' => $args['id']]);

    return json($response, ['evaluation' => lireEvaluation($args['id'])]);
});

// Les notes de l'évaluation partent avec (ON DELETE CASCADE)
$group->delete('/evaluations/{id:' . UUID . '}', function (ServerRequestInterface $request, ResponseInterface $response, array $args) {
    verifierProprietaire('evaluation', $args['id']);
    db()->prepare('DELETE FROM evaluation WHERE id = :id')->execute(['id' => $args['id']]);

    return $response->withStatus(204);
});

$group->get('/evaluations/{id:' . UUID . '}/notes', function (ServerRequestInterface $request, ResponseInterface $response, array $args) {
    verifierProprietaire('evaluation', $args['id']);

    return json($response, ['evaluation' => lireEvaluation($args['id']), 'notes' => lireNotes($args['id'])]);
});

// Saisie en lot : { "notes": [{ "eleve_id": "…", "valeur": 14.5, "absent": false, "commentaire": "…" }] }
// Seuls les élèves envoyés sont modifiés. Une ligne sans valeur, ni absence, ni commentaire efface la note.
$group->put('/evaluations/{id:' . UUID . '}/notes', function (ServerRequestInterface $request, ResponseInterface $response, array $args) {
    verifierProprietaire('evaluation', $args['id']);
    $notes = corps($request)['notes'] ?? null;
    if (!is_array($notes)) {
        throw new ApiException('Le champ « notes » doit être une liste', 400);
    }

    $stmt = db()->prepare(
        'SELECT ev.bareme, array_agg(e.utilisateur_id) FILTER (WHERE e.utilisateur_id IS NOT NULL) AS eleves
         FROM evaluation ev LEFT JOIN eleve e ON e.classe_id = ev.classe_id
         WHERE ev.id = :id GROUP BY ev.id'
    );
    $stmt->execute(['id' => $args['id']]);
    $evaluation = $stmt->fetch();
    $bareme = (float) $evaluation['bareme'];
    $elevesClasse = $evaluation['eleves'] ? explode(',', trim($evaluation['eleves'], '{}')) : [];

    // Tout valider avant d'écrire quoi que ce soit
    $lignes = [];
    foreach ($notes as $note) {
        if (!is_array($note)) {
            throw new ApiException('Chaque élément de « notes » doit contenir eleve_id', 400);
        }
        $eleveId = uuid($note, 'eleve_id', true);
        if (!in_array(strtolower($eleveId), $elevesClasse, true)) {
            throw new ApiException("L'élève $eleveId n'est pas dans la classe de cette évaluation", 400);
        }
        $absent = booleen($note, 'absent', false);
        $valeur = $absent ? null : nombre($note, 'valeur');
        if ($valeur !== null && ($valeur < 0 || $valeur > $bareme)) {
            throw new ApiException("Une note doit être entre 0 et $bareme", 400);
        }
        $lignes[] = [
            'eleve'       => $eleveId,
            'valeur'      => $valeur,
            'absent'      => $absent ? 'true' : 'false',
            'commentaire' => texte($note, 'commentaire', 2000),
        ];
    }

    transaction(function (PDO $pdo) use ($args, $lignes) {
        $enregistrer = $pdo->prepare(
            'INSERT INTO note (evaluation_id, eleve_id, valeur, absent, commentaire)
             VALUES (:evaluation, :eleve, :valeur, :absent, :commentaire)
             ON CONFLICT (evaluation_id, eleve_id)
             DO UPDATE SET valeur = EXCLUDED.valeur, absent = EXCLUDED.absent, commentaire = EXCLUDED.commentaire'
        );
        $effacer = $pdo->prepare('DELETE FROM note WHERE evaluation_id = :evaluation AND eleve_id = :eleve');

        foreach ($lignes as $ligne) {
            if ($ligne['valeur'] === null && $ligne['absent'] === 'false' && $ligne['commentaire'] === null) {
                $effacer->execute(['evaluation' => $args['id'], 'eleve' => $ligne['eleve']]);
            } else {
                $enregistrer->execute($ligne + ['evaluation' => $args['id']]);
            }
        }
    });

    return json($response, ['evaluation' => lireEvaluation($args['id']), 'notes' => lireNotes($args['id'])]);
});

// ---------------------------------------------------------------------
// RESSOURCES
// ---------------------------------------------------------------------

// ?classe_id=&matiere_id= facultatifs
$group->get('/ressources', function (ServerRequestInterface $request, ResponseInterface $response) {
    $query = $request->getQueryParams();
    $classeId = entier($query, 'classe_id');
    $matiereId = entier($query, 'matiere_id');

    $stmt = db()->prepare(
        'SELECT r.id, r.classe_id, c.nom AS classe, r.matiere_id, m.nom AS matiere, r.cours_id,
                r.type, r.titre, r.contenu, r.url, r.created_at
         FROM ressource r
         JOIN classe c  ON c.id = r.classe_id
         JOIN matiere m ON m.id = r.matiere_id
         WHERE r.professeur_id = :moi
           AND (CAST(:classe AS int) IS NULL OR r.classe_id = CAST(:classe2 AS int))
           AND (CAST(:matiere AS int) IS NULL OR r.matiere_id = CAST(:matiere2 AS int))
         ORDER BY c.nom, m.nom, r.created_at DESC'
    );
    $stmt->execute([
        'moi'     => moi(),
        'classe'  => $classeId,  'classe2'  => $classeId,
        'matiere' => $matiereId, 'matiere2' => $matiereId,
    ]);

    return json($response, ['ressources' => $stmt->fetchAll()]);
});

// type = fichier : formulaire multipart avec « fichier » ;
// type = lien : « url » (http ou https) ; type = texte : « contenu »
$group->post('/ressources', function (ServerRequestInterface $request, ResponseInterface $response) {
    $data = corps($request);
    $type = choix($data, 'type', TYPES_RESSOURCE) ?? throw new ApiException('Le champ « type » est requis', 400);
    $champs = [
        'classe_id'  => entier($data, 'classe_id', true),
        'matiere_id' => entier($data, 'matiere_id', true),
        'cours_id'   => uuid($data, 'cours_id'),
        'type'       => $type,
        'titre'      => texte($data, 'titre', 200, true),
        'contenu'    => texte($data, 'contenu', 20000, $type === 'texte'),
        'url'        => null,
        'moi'        => moi(),
    ];

    if ($type === 'lien') {
        $url = texte($data, 'url', 2000, true);
        if (!filter_var($url, FILTER_VALIDATE_URL) || !preg_match('#^https?://#i', $url)) {
            throw new ApiException("L'URL doit commencer par http:// ou https://", 400);
        }
        $champs['url'] = $url;
    }
    if ($type === 'fichier') {
        $champs['url'] = enregistrerFichier($request, 'ressources')['url'];
    }

    try {
        $stmt = db()->prepare(
            'INSERT INTO ressource (classe_id, matiere_id, professeur_id, cours_id, type, titre, contenu, url)
             VALUES (:classe_id, :matiere_id, :moi, :cours_id, :type, :titre, :contenu, :url)
             RETURNING id, classe_id, matiere_id, cours_id, type, titre, contenu, url, created_at'
        );
        $stmt->execute($champs);
    } catch (PDOException $e) {
        if ($type === 'fichier') {
            supprimerFichier($champs['url']);
        }
        erreurClasseMatiere($e);
    }

    return json($response, ['ressource' => $stmt->fetch()], 201);
});

$group->delete('/ressources/{id:' . UUID . '}', function (ServerRequestInterface $request, ResponseInterface $response, array $args) {
    verifierProprietaire('ressource', $args['id']);

    $stmt = db()->prepare('DELETE FROM ressource WHERE id = :id RETURNING type, url');
    $stmt->execute(['id' => $args['id']]);
    $ressource = $stmt->fetch();
    if ($ressource['type'] === 'fichier') {
        supprimerFichier($ressource['url']);
    }

    return $response->withStatus(204);
});
