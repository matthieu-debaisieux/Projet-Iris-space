<?php

declare(strict_types=1);

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

// Page « Gestion de l'emploi du temps » de l'administration : classes, salles, menus (matières, professeurs)
// et cours. GET /classes (liste) et POST /matieres (création) sont dans utilisateurs.php.
// Un cours est un créneau daté (debut / fin en heure de Paris), pas une semaine type.

const ID_MAX = 2147483647; // limite d'un int PostgreSQL

// Identifiant numérique (classe, matière, salle, campus) : entier entre 1 et ID_MAX
function idPositif(array $data, string $cle, bool $requis = false): ?int
{
    $id = entier($data, $cle, $requis);
    if ($id !== null && ($id < 1 || $id > ID_MAX)) {
        throw new ApiException("Le champ « $cle » n'est pas un identifiant valide", 400);
    }
    return $id;
}

// Année de la nouvelle classe quand on n'en précise pas : l'année courante
function anneeCourante(): int
{
    $id = db()->query('SELECT id FROM annee_scolaire WHERE courante')->fetchColumn();
    if ($id === false) {
        throw new ApiException("Aucune année scolaire n'est en cours", 400);
    }
    return (int) $id;
}

// Campus de la nouvelle classe ou salle : celui demandé, sinon le seul qui existe
function campusDe(array $data): int
{
    $id = idPositif($data, 'campus_id');
    if ($id !== null) {
        return $id;
    }
    $campus = db()->query('SELECT id FROM campus ORDER BY id LIMIT 2')->fetchAll(PDO::FETCH_COLUMN);
    if (count($campus) !== 1) {
        throw new ApiException($campus ? 'Précisez le campus' : "Aucun campus n'existe", 400);
    }
    return (int) $campus[0];
}

// ---------------------------------------------------------------------
// CLASSES ET SALLES
// ---------------------------------------------------------------------

$group->post('/classes', function (ServerRequestInterface $request, ResponseInterface $response) {
    $data = corps($request);
    $nom = texte($data, 'nom', 50, true);
    $annee = idPositif($data, 'annee_scolaire_id') ?? anneeCourante();
    $campus = campusDe($data);

    try {
        $stmt = db()->prepare(
            'INSERT INTO classe (annee_scolaire_id, campus_id, nom) VALUES (:annee, :campus, :nom) RETURNING id'
        );
        $stmt->execute(['annee' => $annee, 'campus' => $campus, 'nom' => $nom]);
    } catch (PDOException $e) {
        throw match (codeSql($e)) {
            '23505' => new ApiException('Une classe porte déjà ce nom pour cette année et ce campus', 409),
            '23503' => new ApiException('Année scolaire ou campus introuvable', 400),
            default => $e,
        };
    }

    // Même format que GET /admin/classes
    $lecture = db()->prepare(
        'SELECT c.id, c.nom, a.libelle AS annee_scolaire, ca.nom AS campus
         FROM classe c
         JOIN annee_scolaire a ON a.id = c.annee_scolaire_id
         JOIN campus ca ON ca.id = c.campus_id
         WHERE c.id = :id'
    );
    $lecture->execute(['id' => $stmt->fetchColumn()]);

    return json($response, ['classe' => $lecture->fetch()], 201);
});

$group->get('/salles', function (ServerRequestInterface $request, ResponseInterface $response) {
    $campus = idPositif($request->getQueryParams(), 'campus_id');

    $stmt = db()->prepare(
        'SELECT s.id, s.nom, s.capacite, s.campus_id, ca.nom AS campus
         FROM salle s
         JOIN campus ca ON ca.id = s.campus_id
         WHERE CAST(:campus AS int) IS NULL OR s.campus_id = CAST(:campus2 AS int)
         ORDER BY ca.nom, s.nom'
    );
    $stmt->execute(['campus' => $campus, 'campus2' => $campus]);

    return json($response, ['salles' => $stmt->fetchAll()]);
});

$group->post('/salles', function (ServerRequestInterface $request, ResponseInterface $response) {
    $data = corps($request);
    $nom = texte($data, 'nom', 50, true);
    $capacite = entier($data, 'capacite');
    if ($capacite !== null && ($capacite < 1 || $capacite > 10000)) {
        throw new ApiException('La capacité doit être un nombre entier entre 1 et 10000', 400);
    }
    $campus = campusDe($data);

    try {
        $stmt = db()->prepare(
            'INSERT INTO salle (campus_id, nom, capacite) VALUES (:campus, :nom, :capacite) RETURNING id'
        );
        $stmt->execute(['campus' => $campus, 'nom' => $nom, 'capacite' => $capacite]);
    } catch (PDOException $e) {
        throw match (codeSql($e)) {
            '23505' => new ApiException('Une salle porte déjà ce nom dans ce campus', 409),
            '23503' => new ApiException('Campus introuvable', 400),
            default => $e,
        };
    }

    $lecture = db()->prepare(
        'SELECT s.id, s.nom, s.capacite, s.campus_id, ca.nom AS campus
         FROM salle s JOIN campus ca ON ca.id = s.campus_id
         WHERE s.id = :id'
    );
    $lecture->execute(['id' => $stmt->fetchColumn()]);

    return json($response, ['salle' => $lecture->fetch()], 201);
});

// ---------------------------------------------------------------------
// MENUS DU FORMULAIRE D'UN COURS : matières (selon la classe), professeurs (selon la matière)
// ---------------------------------------------------------------------

// ?classe_id= : seulement le programme de cette classe, avec le coefficient
$group->get('/matieres', function (ServerRequestInterface $request, ResponseInterface $response) {
    $classe = idPositif($request->getQueryParams(), 'classe_id');

    if ($classe === null) {
        $matieres = db()->query('SELECT id, code, nom FROM matiere ORDER BY nom')->fetchAll();
        return json($response, ['matieres' => $matieres]);
    }

    $stmt = db()->prepare('SELECT 1 FROM classe WHERE id = :id');
    $stmt->execute(['id' => $classe]);
    if (!$stmt->fetch()) {
        throw new ApiException('Classe introuvable', 404);
    }

    $stmt = db()->prepare(
        'SELECT m.id, m.code, m.nom, cm.coefficient
         FROM classe_matiere cm
         JOIN matiere m ON m.id = cm.matiere_id
         WHERE cm.classe_id = :classe
         ORDER BY m.nom'
    );
    $stmt->execute(['classe' => $classe]);

    return json($response, ['matieres' => $stmt->fetchAll()]);
});

// Professeurs (comptes actifs) avec toutes leurs matières ; ?matiere_id= ne garde ceux qui l'enseignent
$group->get('/professeurs', function (ServerRequestInterface $request, ResponseInterface $response) {
    $matiere = idPositif($request->getQueryParams(), 'matiere_id');

    $stmt = db()->prepare(
        "SELECT u.id, u.nom, u.prenom,
                COALESCE(
                  json_agg(json_build_object('id', m.id, 'nom', m.nom) ORDER BY m.nom) FILTER (WHERE m.id IS NOT NULL),
                  '[]'
                ) AS matieres
         FROM professeur p
         JOIN utilisateur u ON u.id = p.utilisateur_id AND u.actif
         LEFT JOIN professeur_matiere pm ON pm.professeur_id = p.utilisateur_id
         LEFT JOIN matiere m ON m.id = pm.matiere_id
         WHERE CAST(:matiere AS int) IS NULL
            OR EXISTS (SELECT 1 FROM professeur_matiere pm2
                       WHERE pm2.professeur_id = p.utilisateur_id AND pm2.matiere_id = CAST(:matiere2 AS int))
         GROUP BY u.id
         ORDER BY u.nom, u.prenom"
    );
    $stmt->execute(['matiere' => $matiere, 'matiere2' => $matiere]);
    $professeurs = $stmt->fetchAll();
    foreach ($professeurs as &$professeur) {
        $professeur['matieres'] = json_decode($professeur['matieres'], true);
    }

    return json($response, ['professeurs' => $professeurs]);
});

// ---------------------------------------------------------------------
// COURS
// Le format d'un cours : { id, classe_id, classe, matiere_id, matiere, professeur_id, prof_nom, prof_prenom,
// salle_id, salle, debut, fin, annule, commentaire }. debut et fin sont en heure de Paris
// ('2026-11-30 09:00:00+01'), comme dans /eleve/emploi-du-temps et /prof/emploi-du-temps.
// ---------------------------------------------------------------------

const SELECT_COURS =
    'SELECT co.id, co.classe_id, cl.nom AS classe, co.matiere_id, m.nom AS matiere,
            co.professeur_id, up.nom AS prof_nom, up.prenom AS prof_prenom,
            co.salle_id, s.nom AS salle, co.debut, co.fin, co.annule, co.commentaire
     FROM cours co
     JOIN classe cl      ON cl.id = co.classe_id
     JOIN matiere m      ON m.id = co.matiere_id
     JOIN utilisateur up ON up.id = co.professeur_id
     LEFT JOIN salle s   ON s.id = co.salle_id';

function lireCours(string $id): array|false
{
    $stmt = db()->prepare(SELECT_COURS . ' WHERE co.id = :id');
    $stmt->execute(['id' => $id]);
    return $stmt->fetch();
}

// Date et heure du corps de la requête → DateTimeImmutable (heure de Paris si aucun fuseau n'est donné)
function horaireCours(array $data, string $cle): DateTimeImmutable
{
    $valeur = dateHeure($data, $cle, true);
    $date = new DateTimeImmutable($valeur);
    // dateHeure accepte 2026-02-30 (qui devient le 2 mars) : le jour doit être un vrai jour du calendrier
    if ($date->format('Y-m-d') !== substr($data[$cle], 0, 10)) {
        throw new ApiException("Le champ « $cle » n'est pas une date valide", 400);
    }
    return $date;
}

// Champs d'un cours (création et modification), validés avant de toucher à la base
function champsCours(array $data): array
{
    $classe = idPositif($data, 'classe_id', true);
    $matiere = idPositif($data, 'matiere_id', true);
    $prof = uuid($data, 'professeur_id', true);
    $salle = idPositif($data, 'salle_id');

    $debut = horaireCours($data, 'debut');
    $fin = horaireCours($data, 'fin');
    if ($fin <= $debut) {
        throw new ApiException("L'heure de fin doit être après l'heure de début", 400);
    }
    $paris = new DateTimeZone('Europe/Paris');
    if ($debut->setTimezone($paris)->format('Y-m-d') !== $fin->setTimezone($paris)->format('Y-m-d')) {
        throw new ApiException('Un cours doit commencer et finir le même jour', 400);
    }

    return [
        'classe'      => $classe,
        'matiere'     => $matiere,
        'prof'        => $prof,
        'salle'       => $salle,
        'debut'       => $debut->format(DATE_ATOM),
        'fin'         => $fin->format(DATE_ATOM),
        'annule'      => booleen($data, 'annule', false) ? 'true' : 'false',
        'commentaire' => texte($data, 'commentaire', 500),
    ];
}

// Classe, matière, professeur et salle existent, la matière est au programme de la classe et le prof
// l'enseigne : sinon 400 avec la raison précise (la base refuserait aussi, mais par une erreur peu lisible)
function verifierReferencesCours(array $c): void
{
    $stmt = db()->prepare(
        'SELECT (SELECT nom FROM classe WHERE id = :classe) AS classe,
                (SELECT nom FROM matiere WHERE id = :matiere) AS matiere,
                (SELECT u.prenom || \' \' || u.nom FROM professeur p JOIN utilisateur u ON u.id = p.utilisateur_id
                  WHERE p.utilisateur_id = :prof) AS professeur,
                (SELECT nom FROM salle WHERE id = :salle) AS salle,
                EXISTS (SELECT 1 FROM classe_matiere WHERE classe_id = :classe2 AND matiere_id = :matiere2) AS au_programme,
                EXISTS (SELECT 1 FROM professeur_matiere WHERE professeur_id = :prof2 AND matiere_id = :matiere3) AS enseigne'
    );
    $stmt->execute([
        'classe' => $c['classe'], 'classe2' => $c['classe'],
        'matiere' => $c['matiere'], 'matiere2' => $c['matiere'], 'matiere3' => $c['matiere'],
        'prof' => $c['prof'], 'prof2' => $c['prof'],
        'salle' => $c['salle'],
    ]);
    $r = $stmt->fetch();

    if ($r['classe'] === null) {
        throw new ApiException('Classe introuvable', 400);
    }
    if ($r['matiere'] === null) {
        throw new ApiException('Matière introuvable', 400);
    }
    if ($r['professeur'] === null) {
        throw new ApiException('Professeur introuvable', 400);
    }
    if ($c['salle'] !== null && $r['salle'] === null) {
        throw new ApiException('Salle introuvable', 400);
    }
    if (!$r['au_programme']) {
        throw new ApiException("La matière {$r['matiere']} n'est pas au programme de la classe {$r['classe']}", 400);
    }
    if (!$r['enseigne']) {
        throw new ApiException("{$r['professeur']} n'enseigne pas la matière {$r['matiere']}", 400);
    }
}

// « le 30/11 de 09h00 à 11h00 » (horodatages renvoyés par PostgreSQL, en heure de Paris)
function creneauTexte(string $debut, string $fin): string
{
    $paris = new DateTimeZone('Europe/Paris');
    $d = (new DateTimeImmutable($debut))->setTimezone($paris);
    $f = (new DateTimeImmutable($fin))->setTimezone($paris);
    if ($d->format('Y-m-d') === $f->format('Y-m-d')) {
        return 'le ' . $d->format('d/m') . ' de ' . $d->format('H\hi') . ' à ' . $f->format('H\hi');
    }
    return 'du ' . $d->format('d/m à H\hi') . ' au ' . $f->format('d/m à H\hi');
}

// Message 409 : quel professeur, quelle classe ou quelle salle est déjà pris sur ce créneau, et par quel cours.
// $ignorer : id du cours modifié (il ne peut pas être en conflit avec lui-même), null à la création.
function messageChevauchement(array $c, ?string $ignorer): string
{
    $stmt = db()->prepare(
        'SELECT co.debut, co.fin, cl.nom AS classe, m.nom AS matiere, up.prenom, up.nom, s.nom AS salle,
                co.professeur_id = CAST(:prof AS uuid) AS meme_prof,
                co.classe_id = :classe AS meme_classe,
                (co.salle_id IS NOT NULL AND co.salle_id = CAST(:salle AS int)) AS meme_salle
         FROM cours co
         JOIN classe cl      ON cl.id = co.classe_id
         JOIN matiere m      ON m.id = co.matiere_id
         JOIN utilisateur up ON up.id = co.professeur_id
         LEFT JOIN salle s   ON s.id = co.salle_id
         WHERE NOT co.annule
           AND tstzrange(co.debut, co.fin) && tstzrange(CAST(:debut AS timestamptz), CAST(:fin AS timestamptz))
           AND co.id IS DISTINCT FROM CAST(:id AS uuid)
           AND (co.professeur_id = CAST(:prof2 AS uuid) OR co.classe_id = :classe2
                OR (co.salle_id IS NOT NULL AND co.salle_id = CAST(:salle2 AS int)))
         ORDER BY co.debut'
    );
    $stmt->execute([
        'prof' => $c['prof'], 'prof2' => $c['prof'],
        'classe' => $c['classe'], 'classe2' => $c['classe'],
        'salle' => $c['salle'], 'salle2' => $c['salle'],
        'debut' => $c['debut'], 'fin' => $c['fin'],
        'id' => $ignorer,
    ]);

    // Un message par type de conflit (professeur, classe, salle), sur le premier cours concerné
    $messages = [];
    foreach ($stmt->fetchAll() as $autre) {
        $quand = creneauTexte($autre['debut'], $autre['fin']);
        if ($autre['meme_prof'] && !isset($messages['prof'])) {
            $messages['prof'] = "Le professeur {$autre['prenom']} {$autre['nom']} a déjà cours $quand ({$autre['classe']}, {$autre['matiere']}).";
        }
        if ($autre['meme_classe'] && !isset($messages['classe'])) {
            $messages['classe'] = "La classe {$autre['classe']} a déjà cours $quand ({$autre['matiere']} avec {$autre['prenom']} {$autre['nom']}).";
        }
        if ($autre['meme_salle'] && !isset($messages['salle'])) {
            $messages['salle'] = "La salle {$autre['salle']} est déjà occupée $quand ({$autre['classe']}, {$autre['matiere']}).";
        }
    }

    return $messages
        ? implode(' ', array_filter([$messages['prof'] ?? null, $messages['classe'] ?? null, $messages['salle'] ?? null]))
        : 'Ce créneau chevauche un autre cours (professeur, classe ou salle déjà occupés).';
}

// Erreurs SQL attendues lors d'une création / modification de cours
function erreurCours(PDOException $e, array $c, ?string $ignorer): never
{
    throw match (codeSql($e)) {
        '23P01' => new ApiException(messageChevauchement($c, $ignorer), 409),
        '23503' => new ApiException("Classe, matière, professeur ou salle introuvable, ou matière absente du programme de la classe ou de l'enseignement du professeur", 400),
        '23514' => new ApiException("L'heure de fin doit être après l'heure de début", 400),
        default => $e,
    };
}

// Cours entre `du` et `au` inclus (par défaut : aujourd'hui) ; `classe_id` facultatif (sans lui : toutes les classes)
$group->get('/cours', function (ServerRequestInterface $request, ResponseInterface $response) {
    $query = $request->getQueryParams();
    [$du, $au] = periode($query);
    $classe = idPositif($query, 'classe_id');

    if ($classe !== null) {
        $stmt = db()->prepare('SELECT 1 FROM classe WHERE id = :id');
        $stmt->execute(['id' => $classe]);
        if (!$stmt->fetch()) {
            throw new ApiException('Classe introuvable', 404);
        }
    }

    $stmt = db()->prepare(
        SELECT_COURS . '
         WHERE co.debut < CAST(:au AS date) + 1
           AND co.fin   > CAST(:du AS date)
           AND (CAST(:classe AS int) IS NULL OR co.classe_id = CAST(:classe2 AS int))
         ORDER BY co.debut, cl.nom'
    );
    $stmt->execute(['du' => $du, 'au' => $au, 'classe' => $classe, 'classe2' => $classe]);

    return json($response, ['du' => $du, 'au' => $au, 'cours' => $stmt->fetchAll()]);
});

$group->post('/cours', function (ServerRequestInterface $request, ResponseInterface $response) {
    $c = champsCours(corps($request));
    verifierReferencesCours($c);

    try {
        $stmt = db()->prepare(
            'INSERT INTO cours (classe_id, matiere_id, professeur_id, salle_id, debut, fin, annule, commentaire)
             VALUES (:classe, :matiere, :prof, :salle, :debut, :fin, :annule, :commentaire)
             RETURNING id'
        );
        $stmt->execute($c);
    } catch (PDOException $e) {
        erreurCours($e, $c, null);
    }

    return json($response, ['cours' => lireCours($stmt->fetchColumn())], 201);
});

// Remplace tous les champs du cours. La classe ne change pas (classe_id est facultatif, mais s'il est donné
// il doit être celui du cours) : pour déplacer un cours dans une autre classe, le supprimer et le recréer.
$group->put('/cours/{id:' . UUID . '}', function (ServerRequestInterface $request, ResponseInterface $response, array $args) {
    $existant = lireCours($args['id']);
    if (!$existant) {
        throw new ApiException('Cours introuvable', 404);
    }

    $data = corps($request);
    $data['classe_id'] = $data['classe_id'] ?? $existant['classe_id'];
    $c = champsCours($data);
    if ($c['classe'] !== $existant['classe_id']) {
        throw new ApiException("La classe d'un cours ne se modifie pas : supprimez le cours et créez-le dans l'autre classe", 400);
    }
    verifierReferencesCours($c);

    try {
        $stmt = db()->prepare(
            'UPDATE cours SET matiere_id = :matiere, professeur_id = :prof, salle_id = :salle, debut = :debut,
                    fin = :fin, annule = :annule, commentaire = :commentaire
             WHERE id = :id'
        );
        $stmt->execute([
            'matiere' => $c['matiere'], 'prof' => $c['prof'], 'salle' => $c['salle'], 'debut' => $c['debut'],
            'fin' => $c['fin'], 'annule' => $c['annule'], 'commentaire' => $c['commentaire'], 'id' => $args['id'],
        ]);
    } catch (PDOException $e) {
        erreurCours($e, $c, $args['id']);
    }
    if ($stmt->rowCount() === 0) {
        throw new ApiException('Cours introuvable', 404);
    }

    return json($response, ['cours' => lireCours($args['id'])]);
});

// Les devoirs, ressources et absences liés au cours gardent leurs données (ON DELETE SET NULL)
$group->delete('/cours/{id:' . UUID . '}', function (ServerRequestInterface $request, ResponseInterface $response, array $args) {
    $stmt = db()->prepare('DELETE FROM cours WHERE id = :id');
    $stmt->execute(['id' => $args['id']]);
    if ($stmt->rowCount() === 0) {
        throw new ApiException('Cours introuvable', 404);
    }

    return $response->withStatus(204);
});
