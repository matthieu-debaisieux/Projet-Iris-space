<?php

declare(strict_types=1);

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

// Vie scolaire (administration) : absences et retards de tous les élèves.
//
// Il n'y a pas de colonne « statut » : il est calculé à partir de `justifie` et de `justificatif_url`.
//   justifie     : l'administration a validé la justification
//   en_attente   : l'élève (ou l'administration) a envoyé un justificatif, pas encore validé
//   non_justifie : ni l'un ni l'autre
// Refuser un justificatif = le retirer (PATCH `supprimer_justificatif`) : l'absence redevient « non_justifie ».

const TYPES_ABSENCE = ['absence', 'retard'];
const STATUTS_ABSENCE = ['non_justifie', 'en_attente', 'justifie'];
const MAX_ABSENCES_LISTEES = 300;

// Une absence ou un retard avec son élève, sa classe et son cours : même forme dans toutes les réponses.
// `justificatif_url` (chemin sur le disque) reste interne : le front voit `justificatif_envoye`.
const SQL_ABSENCES = "SELECT a.id, a.type, a.date_absence, a.duree_heures, a.minutes_retard, a.libelle,
        a.justifie, a.motif,
        CASE WHEN a.justifie THEN 'justifie'
             WHEN a.justificatif_url IS NOT NULL THEN 'en_attente'
             ELSE 'non_justifie' END AS statut,
        a.justificatif_url IS NOT NULL AS justificatif_envoye,
        a.cours_id, co.debut AS cours_debut, co.fin AS cours_fin, m.nom AS matiere,
        a.eleve_id, u.nom, u.prenom, u.telephone, u.email, e.classe_id, cl.nom AS classe,
        a.saisi_par, a.created_at
 FROM absence a
 JOIN eleve e        ON e.utilisateur_id = a.eleve_id
 JOIN utilisateur u  ON u.id = a.eleve_id
 LEFT JOIN classe cl ON cl.id = e.classe_id
 LEFT JOIN cours co  ON co.id = a.cours_id
 LEFT JOIN matiere m ON m.id = co.matiere_id";

function lireAbsence(string $id): array
{
    $stmt = db()->prepare(SQL_ABSENCES . ' WHERE a.id = :id');
    $stmt->execute(['id' => $id]);
    $absence = $stmt->fetch();
    if (!$absence) {
        throw new ApiException('Absence introuvable', 404);
    }
    return $absence;
}

// Cours à rattacher à une absence : sa classe, son jour (heure de Paris) et sa durée en heures
function coursPourAbsence(string $id): array|false
{
    $stmt = db()->prepare(
        'SELECT co.id, co.classe_id, co.annule, m.nom AS matiere,
                CAST(co.debut AS date) AS jour,
                round(CAST(extract(epoch FROM co.fin - co.debut) / 3600 AS numeric), 2) AS duree_heures
         FROM cours co
         JOIN matiere m ON m.id = co.matiere_id
         WHERE co.id = :id'
    );
    $stmt->execute(['id' => $id]);
    return $stmt->fetch();
}

// ---------------------------------------------------------------------
// GET /api/admin/absences?date=AAAA-MM-JJ&statut=
//   sans paramètre : les absences et retards d'aujourd'hui, toutes classes
//   date           : ce jour-là
//   statut         : non_justifie, en_attente ou justifie ; sans `date`, tous les jours
//                    (ex. ?statut=en_attente : les justificatifs à traiter)
// ---------------------------------------------------------------------
$group->get('/absences', function (ServerRequestInterface $request, ResponseInterface $response) {
    $query  = $request->getQueryParams();
    $date   = dateJour($query, 'date');
    $statut = choix($query, 'statut', STATUTS_ABSENCE);
    if ($date === null && $statut === null) {
        $date = date('Y-m-d');
    }

    $conditions = [];
    $params     = [];
    if ($date !== null) {
        $conditions[]   = 'a.date_absence = :date';
        $params['date'] = $date;
    }
    if ($statut === 'justifie') {
        $conditions[] = 'a.justifie';
    } elseif ($statut === 'en_attente') {
        $conditions[] = 'NOT a.justifie AND a.justificatif_url IS NOT NULL';
    } elseif ($statut === 'non_justifie') {
        $conditions[] = 'NOT a.justifie AND a.justificatif_url IS NULL';
    }

    $stmt = db()->prepare(
        SQL_ABSENCES
        . ' WHERE ' . implode(' AND ', $conditions)
        . ' ORDER BY a.date_absence DESC, cl.nom, u.nom, u.prenom, co.debut
            LIMIT ' . MAX_ABSENCES_LISTEES
    );
    $stmt->execute($params);
    $absences = $stmt->fetchAll();

    $resume = ['absences' => 0, 'retards' => 0, 'justifiees' => 0, 'en_attente' => 0, 'non_justifiees' => 0];
    foreach ($absences as $absence) {
        $resume[$absence['type'] === 'retard' ? 'retards' : 'absences']++;
        $resume[match ($absence['statut']) {
            'justifie'   => 'justifiees',
            'en_attente' => 'en_attente',
            default      => 'non_justifiees',
        }]++;
    }

    return json($response, ['date' => $date, 'statut' => $statut, 'resume' => $resume, 'absences' => $absences]);
});

// ---------------------------------------------------------------------
// GET /api/admin/absences/cours?eleve_id=&date= : cours de la classe de l'élève ce jour-là
// (menu « Cours » du formulaire de saisie) ; `deja_saisie` = une absence existe déjà pour ce cours
// ---------------------------------------------------------------------
$group->get('/absences/cours', function (ServerRequestInterface $request, ResponseInterface $response) {
    $query = $request->getQueryParams();
    $eleve = uuid($query, 'eleve_id', true);
    $date  = dateJour($query, 'date') ?? date('Y-m-d');

    $stmt = db()->prepare(
        'SELECT co.id, co.debut, co.fin, co.annule, m.nom AS matiere,
                EXISTS (SELECT 1 FROM absence a WHERE a.cours_id = co.id AND a.eleve_id = e.utilisateur_id) AS deja_saisie
         FROM eleve e
         JOIN cours co  ON co.classe_id = e.classe_id
         JOIN matiere m ON m.id = co.matiere_id
         WHERE e.utilisateur_id = :eleve AND CAST(co.debut AS date) = :date
         ORDER BY co.debut'
    );
    $stmt->execute(['eleve' => $eleve, 'date' => $date]);

    return json($response, ['cours' => $stmt->fetchAll()]);
});

// ---------------------------------------------------------------------
// POST /api/admin/absences : saisir une absence ou un retard
// Corps : { eleve_id, type: "absence" | "retard" (défaut absence), cours_id?, date_absence?, duree_heures?,
//           minutes_retard?, libelle?, motif?, justifie? }
//   - avec `cours_id` : le cours doit être de la classe de l'élève ; le jour, le libellé (la matière)
//     et la durée (absence) viennent du cours s'ils ne sont pas envoyés ; un seul enregistrement par cours et par élève
//   - sans cours : `date_absence` (défaut : aujourd'hui, jamais dans le futur)
//   - un retard exige `minutes_retard` (1 à 480) et n'a pas de durée ; une absence n'a pas de minutes
// `saisi_par` = le compte connecté. Réponse 201 : { absence }
// ---------------------------------------------------------------------
$group->post('/absences', function (ServerRequestInterface $request, ResponseInterface $response) {
    $data     = corps($request);
    $eleveId  = uuid($data, 'eleve_id', true);
    $type     = choix($data, 'type', TYPES_ABSENCE, 'absence');
    $coursId  = uuid($data, 'cours_id');
    $jour     = dateJour($data, 'date_absence');
    $duree    = nombre($data, 'duree_heures');
    $minutes  = entier($data, 'minutes_retard');
    $libelle  = texte($data, 'libelle', 200);
    $motif    = texte($data, 'motif', 2000);
    $justifie = booleen($data, 'justifie', false);

    if ($type === 'retard') {
        if ($minutes === null || $minutes < 1 || $minutes > 480) {
            throw new ApiException('Un retard exige « minutes_retard » entre 1 et 480', 400);
        }
        $duree = null;
    } else {
        $minutes = null;
        if ($duree !== null && ($duree <= 0 || $duree > 24)) {
            throw new ApiException('La durée doit être comprise entre 0 et 24 heures', 400);
        }
    }

    $stmt = db()->prepare('SELECT classe_id FROM eleve WHERE utilisateur_id = :id');
    $stmt->execute(['id' => $eleveId]);
    $eleve = $stmt->fetch();
    if (!$eleve) {
        throw new ApiException('Élève introuvable', 404);
    }

    if ($coursId !== null) {
        $cours = coursPourAbsence($coursId);
        if (!$cours) {
            throw new ApiException('Cours introuvable', 404);
        }
        if ($eleve['classe_id'] === null || (int) $cours['classe_id'] !== (int) $eleve['classe_id']) {
            throw new ApiException("Ce cours n'est pas un cours de la classe de l'élève", 400);
        }
        if ($cours['annule']) {
            throw new ApiException('Ce cours est annulé', 400);
        }

        $stmt = db()->prepare('SELECT 1 FROM absence WHERE eleve_id = :eleve AND cours_id = :cours');
        $stmt->execute(['eleve' => $eleveId, 'cours' => $coursId]);
        if ($stmt->fetch()) {
            throw new ApiException('Une absence est déjà saisie pour cet élève et ce cours', 409);
        }

        $jour    = $cours['jour'];
        $libelle ??= $cours['matiere'];
        if ($type === 'absence') {
            $duree ??= decimal($cours['duree_heures']);
        }
    } else {
        $jour ??= date('Y-m-d');
    }
    if ($jour > date('Y-m-d')) {
        throw new ApiException('La date ne peut pas être dans le futur', 400);
    }

    $stmt = db()->prepare(
        'INSERT INTO absence (eleve_id, cours_id, type, date_absence, duree_heures, minutes_retard, libelle, justifie, motif, saisi_par)
         VALUES (:eleve, :cours, :type, :jour, :duree, :minutes, :libelle, :justifie, :motif, :moi)
         RETURNING id'
    );
    $stmt->execute([
        'eleve'    => $eleveId,
        'cours'    => $coursId,
        'type'     => $type,
        'jour'     => $jour,
        'duree'    => $duree,
        'minutes'  => $minutes,
        'libelle'  => $libelle,
        'justifie' => $justifie ? 'true' : 'false',
        'motif'    => $motif,
        'moi'      => moi(),
    ]);

    return json($response, ['absence' => lireAbsence($stmt->fetchColumn())], 201);
});

// ---------------------------------------------------------------------
// PATCH /api/admin/absences/{id} : justifier (ou retirer la justification)
// Corps, au moins un champ (les absents ne changent pas) :
//   justifie                : true valide la justification, false la retire
//   motif                   : texte, vide ou null pour l'effacer
//   supprimer_justificatif  : true efface le fichier envoyé (justificatif refusé : l'absence redevient « non_justifie »)
// Réponse : { absence }
// ---------------------------------------------------------------------
$group->patch('/absences/{id:' . UUID . '}', function (ServerRequestInterface $request, ResponseInterface $response, array $args) {
    $data = corps($request);

    $sets   = [];
    $params = ['id' => $args['id']];
    if (array_key_exists('justifie', $data)) {
        $justifie = booleen($data, 'justifie');
        if ($justifie === null) {
            throw new ApiException("Le champ « justifie » doit valoir true ou false", 400);
        }
        $sets[]             = 'justifie = :justifie';
        $params['justifie'] = $justifie ? 'true' : 'false';
    }
    if (array_key_exists('motif', $data)) {
        $sets[]          = 'motif = :motif';
        $params['motif'] = texte($data, 'motif', 2000);
    }
    $retirer = booleen($data, 'supprimer_justificatif', false);
    if (!$sets && !$retirer) {
        throw new ApiException('Rien à modifier : envoyez « justifie », « motif » ou « supprimer_justificatif »', 400);
    }

    $stmt = db()->prepare('SELECT justificatif_url FROM absence WHERE id = :id');
    $stmt->execute(['id' => $args['id']]);
    $actuel = $stmt->fetch();
    if (!$actuel) {
        throw new ApiException('Absence introuvable', 404);
    }

    if ($retirer) {
        $sets[] = 'justificatif_url = NULL';
    }
    $stmt = db()->prepare('UPDATE absence SET ' . implode(', ', $sets) . ' WHERE id = :id');
    $stmt->execute($params);

    if ($retirer) {
        supprimerFichier($actuel['justificatif_url']);
    }

    return json($response, ['absence' => lireAbsence($args['id'])]);
});

// ---------------------------------------------------------------------
// POST /api/admin/absences/{id}/justificatif : joindre un justificatif (justificatif papier remis à la vie scolaire)
// Formulaire multipart : « fichier » (obligatoire), « motif » (facultatif). `justifie` ne change pas : valider avec le PATCH.
// ---------------------------------------------------------------------
$group->post('/absences/{id:' . UUID . '}/justificatif', function (ServerRequestInterface $request, ResponseInterface $response, array $args) {
    $motif = texte(corps($request), 'motif', 2000);

    $stmt = db()->prepare('SELECT justificatif_url FROM absence WHERE id = :id');
    $stmt->execute(['id' => $args['id']]);
    $actuel = $stmt->fetch();
    if (!$actuel) {
        throw new ApiException('Absence introuvable', 404);
    }

    $fichier = enregistrerFichier($request, 'justificatifs');

    try {
        $stmt = db()->prepare(
            'UPDATE absence SET justificatif_url = :url, motif = COALESCE(:motif, motif) WHERE id = :id'
        );
        $stmt->execute(['url' => $fichier['url'], 'motif' => $motif, 'id' => $args['id']]);
    } catch (Throwable $e) {
        supprimerFichier($fichier['url']); // pas de fichier orphelin si la base refuse
        throw $e;
    }

    supprimerFichier($actuel['justificatif_url']); // l'ancien justificatif est remplacé

    return json($response, ['absence' => lireAbsence($args['id'])]);
});

// GET /api/admin/absences/{id}/justificatif : télécharger le justificatif (PDF ou image s'affichent dans le navigateur)
$group->get('/absences/{id:' . UUID . '}/justificatif', function (ServerRequestInterface $request, ResponseInterface $response, array $args) {
    $stmt = db()->prepare(
        'SELECT a.justificatif_url, a.date_absence, u.nom, u.prenom
         FROM absence a JOIN utilisateur u ON u.id = a.eleve_id
         WHERE a.id = :id'
    );
    $stmt->execute(['id' => $args['id']]);
    $absence = $stmt->fetch();

    if (!$absence) {
        throw new ApiException('Absence introuvable', 404);
    }
    if ($absence['justificatif_url'] === null) {
        throw new ApiException("Cette absence n'a pas de justificatif", 404);
    }

    $nom = "justificatif {$absence['nom']} {$absence['prenom']} {$absence['date_absence']}";
    return envoyerFichier($response, $absence['justificatif_url'], $nom, true);
});

// DELETE /api/admin/absences/{id} : supprimer l'absence (et son justificatif)
$group->delete('/absences/{id:' . UUID . '}', function (ServerRequestInterface $request, ResponseInterface $response, array $args) {
    $stmt = db()->prepare('DELETE FROM absence WHERE id = :id RETURNING justificatif_url');
    $stmt->execute(['id' => $args['id']]);
    $supprimee = $stmt->fetch();

    if (!$supprimee) {
        throw new ApiException('Absence introuvable', 404);
    }
    supprimerFichier($supprimee['justificatif_url']);

    return $response->withStatus(204);
});
