<?php

declare(strict_types=1);

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

// Comptes, matières et programme (pas encore de page front).

const ROLES = ['eleve', 'professeur', 'administrateur', 'direction'];

// Champs du profil communs à la création et à la modification
function champsUtilisateur(array $data): array
{
    $email = texte($data, 'email', 254, true);
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new ApiException("L'email n'est pas valide", 400);
    }

    return [
        'identifiant'    => texte($data, 'identifiant', 50, true),
        'email'          => $email,
        'nom'            => texte($data, 'nom', 100, true),
        'prenom'         => texte($data, 'prenom', 100, true),
        'date_naissance' => dateJour($data, 'date_naissance'),
        'lieu_naissance' => texte($data, 'lieu_naissance', 100),
        'pays_naissance' => texte($data, 'pays_naissance', 100),
        'nationalite'    => texte($data, 'nationalite', 100),
        'telephone'      => texte($data, 'telephone', 30),
        'adresse'        => texte($data, 'adresse', 500),
    ];
}

function motDePasse(array $data, bool $requis): ?string
{
    $motDePasse = $data['mot_de_passe'] ?? null;
    if ($motDePasse === null || $motDePasse === '') {
        if ($requis) {
            throw new ApiException('Le champ « mot_de_passe » est requis', 400);
        }
        return null;
    }
    if (!is_string($motDePasse) || mb_strlen($motDePasse) < 8) {
        throw new ApiException('Le mot de passe doit faire au moins 8 caractères', 400);
    }
    return password_hash($motDePasse, PASSWORD_DEFAULT);
}

// Erreurs SQL attendues lors d'une création / modification de compte
function erreurCompte(PDOException $e): never
{
    throw match (codeSql($e)) {
        '23505' => new ApiException('Identifiant, email ou numéro étudiant déjà utilisé', 409),
        '23503' => new ApiException('Classe introuvable', 400),
        default => $e,
    };
}

function lireUtilisateur(string $id): array|false
{
    $stmt = db()->prepare(
        'SELECT u.id, u.identifiant, u.email, u.role, u.nom, u.prenom, u.date_naissance,
                u.lieu_naissance, u.pays_naissance, u.nationalite, u.telephone, u.adresse,
                u.photo_url, u.actif, u.derniere_connexion, u.created_at,
                e.numero_etudiant, e.classe_id, c.nom AS classe
         FROM utilisateur u
         LEFT JOIN eleve e  ON e.utilisateur_id = u.id
         LEFT JOIN classe c ON c.id = e.classe_id
         WHERE u.id = :id'
    );
    $stmt->execute(['id' => $id]);
    return $stmt->fetch();
}

$group->get('/utilisateurs', function (ServerRequestInterface $request, ResponseInterface $response) {
    $role = choix($request->getQueryParams(), 'role', ROLES);

    $stmt = db()->prepare(
        'SELECT u.id, u.identifiant, u.email, u.role, u.nom, u.prenom, u.telephone,
                u.actif, u.derniere_connexion, e.numero_etudiant, e.classe_id, c.nom AS classe
         FROM utilisateur u
         LEFT JOIN eleve e  ON e.utilisateur_id = u.id
         LEFT JOIN classe c ON c.id = e.classe_id
         WHERE CAST(:role AS role_utilisateur) IS NULL OR u.role = CAST(:role2 AS role_utilisateur)
         ORDER BY u.nom, u.prenom'
    );
    $stmt->execute(['role' => $role, 'role2' => $role]);

    return json($response, ['utilisateurs' => $stmt->fetchAll()]);
});

// Crée l'utilisateur et, selon le rôle, sa ligne dans eleve ou professeur
$group->post('/utilisateurs', function (ServerRequestInterface $request, ResponseInterface $response) {
    $data = corps($request);
    $champs = champsUtilisateur($data);
    $champs['role'] = choix($data, 'role', ROLES) ?? throw new ApiException('Le champ « role » est requis', 400);
    $champs['mot_de_passe_hash'] = motDePasse($data, true);
    $classeId = entier($data, 'classe_id');
    $numeroEtudiant = texte($data, 'numero_etudiant', 30);

    try {
        $id = transaction(function (PDO $pdo) use ($champs, $classeId, $numeroEtudiant) {
            $stmt = $pdo->prepare(
                'INSERT INTO utilisateur (identifiant, email, mot_de_passe_hash, role, nom, prenom, date_naissance,
                                          lieu_naissance, pays_naissance, nationalite, telephone, adresse)
                 VALUES (:identifiant, :email, :mot_de_passe_hash, :role, :nom, :prenom, :date_naissance,
                         :lieu_naissance, :pays_naissance, :nationalite, :telephone, :adresse)
                 RETURNING id'
            );
            $stmt->execute($champs);
            $id = $stmt->fetchColumn();

            if ($champs['role'] === 'eleve') {
                $stmt = $pdo->prepare(
                    'INSERT INTO eleve (utilisateur_id, numero_etudiant, classe_id) VALUES (:id, :numero, :classe)'
                );
                $stmt->execute(['id' => $id, 'numero' => $numeroEtudiant, 'classe' => $classeId]);
            } elseif ($champs['role'] === 'professeur') {
                $pdo->prepare('INSERT INTO professeur (utilisateur_id) VALUES (:id)')->execute(['id' => $id]);
            }
            return $id;
        });
    } catch (PDOException $e) {
        erreurCompte($e);
    }

    return json($response, ['utilisateur' => lireUtilisateur($id)], 201);
});

// Le rôle ne se modifie pas (il faudrait déplacer les lignes eleve / professeur).
// mot_de_passe facultatif : s'il est fourni, il remplace l'ancien.
$group->put('/utilisateurs/{id:' . UUID . '}', function (ServerRequestInterface $request, ResponseInterface $response, array $args) {
    $data = corps($request);
    $champs = champsUtilisateur($data);
    $hash = motDePasse($data, false);
    $classeId = entier($data, 'classe_id');
    $numeroEtudiant = texte($data, 'numero_etudiant', 30);

    try {
        transaction(function (PDO $pdo) use ($args, $champs, $hash, $classeId, $numeroEtudiant) {
            $stmt = $pdo->prepare(
                'UPDATE utilisateur SET identifiant = :identifiant, email = :email, nom = :nom, prenom = :prenom,
                        date_naissance = :date_naissance, lieu_naissance = :lieu_naissance,
                        pays_naissance = :pays_naissance, nationalite = :nationalite,
                        telephone = :telephone, adresse = :adresse,
                        mot_de_passe_hash = COALESCE(:hash, mot_de_passe_hash)
                 WHERE id = :id
                 RETURNING role'
            );
            $stmt->execute($champs + ['hash' => $hash, 'id' => $args['id']]);
            $role = $stmt->fetchColumn();
            if ($role === false) {
                throw new ApiException('Utilisateur introuvable', 404);
            }

            if ($role === 'eleve') {
                $stmt = $pdo->prepare('UPDATE eleve SET classe_id = :classe, numero_etudiant = :numero WHERE utilisateur_id = :id');
                $stmt->execute(['classe' => $classeId, 'numero' => $numeroEtudiant, 'id' => $args['id']]);
            }
        });
    } catch (PDOException $e) {
        erreurCompte($e);
    }

    return json($response, ['utilisateur' => lireUtilisateur($args['id'])]);
});

$group->patch('/utilisateurs/{id:' . UUID . '}/actif', function (ServerRequestInterface $request, ResponseInterface $response, array $args) {
    $actif = booleen(corps($request), 'actif') ?? throw new ApiException('Le champ « actif » est requis', 400);
    if (!$actif && $args['id'] === moi()) {
        throw new ApiException('Vous ne pouvez pas désactiver votre propre compte', 400);
    }

    $stmt = db()->prepare('UPDATE utilisateur SET actif = :actif WHERE id = :id');
    $stmt->execute(['actif' => $actif ? 'true' : 'false', 'id' => $args['id']]);
    if ($stmt->rowCount() === 0) {
        throw new ApiException('Utilisateur introuvable', 404);
    }

    return json($response, ['utilisateur' => lireUtilisateur($args['id'])]);
});

$group->post('/matieres', function (ServerRequestInterface $request, ResponseInterface $response) {
    $data = corps($request);

    try {
        $stmt = db()->prepare('INSERT INTO matiere (code, nom) VALUES (:code, :nom) RETURNING id, code, nom');
        $stmt->execute(['code' => texte($data, 'code', 20), 'nom' => texte($data, 'nom', 100, true)]);
    } catch (PDOException $e) {
        if (codeSql($e) === '23505') {
            throw new ApiException('Une matière porte déjà ce nom ou ce code', 409);
        }
        throw $e;
    }

    return json($response, ['matiere' => $stmt->fetch()], 201);
});

// Remplace la liste des matières d'un prof : { "matiere_ids": [1, 4] }
$group->put('/professeurs/{id:' . UUID . '}/matieres', function (ServerRequestInterface $request, ResponseInterface $response, array $args) {
    $ids = corps($request)['matiere_ids'] ?? null;
    if (!is_array($ids)) {
        throw new ApiException('Le champ « matiere_ids » doit être une liste', 400);
    }
    $tableau = tableauEntiers($ids, 'matiere_ids');

    try {
        transaction(function (PDO $pdo) use ($args, $tableau) {
            $stmt = $pdo->prepare('SELECT 1 FROM professeur WHERE utilisateur_id = :id');
            $stmt->execute(['id' => $args['id']]);
            if (!$stmt->fetch()) {
                throw new ApiException('Professeur introuvable', 404);
            }

            $stmt = $pdo->prepare(
                'DELETE FROM professeur_matiere WHERE professeur_id = :id AND NOT (matiere_id = ANY(CAST(:ids AS int[])))'
            );
            $stmt->execute(['id' => $args['id'], 'ids' => $tableau]);

            $stmt = $pdo->prepare(
                'INSERT INTO professeur_matiere (professeur_id, matiere_id)
                 SELECT CAST(:id AS uuid), unnest(CAST(:ids AS int[]))
                 ON CONFLICT DO NOTHING'
            );
            $stmt->execute(['id' => $args['id'], 'ids' => $tableau]);
        });
    } catch (PDOException $e) {
        throw match (codeSql($e)) {
            // matière inexistante, ou matière retirée alors que le prof a encore des cours / devoirs dedans
            '23503' => new ApiException('Matière introuvable, ou encore utilisée par des cours, devoirs ou évaluations de ce prof', 409),
            default => $e,
        };
    }

    $stmt = db()->prepare(
        'SELECT m.id, m.code, m.nom FROM professeur_matiere pm JOIN matiere m ON m.id = pm.matiere_id
         WHERE pm.professeur_id = :id ORDER BY m.nom'
    );
    $stmt->execute(['id' => $args['id']]);

    return json($response, ['matieres' => $stmt->fetchAll()]);
});

// Remplace le programme d'une classe : { "matieres": [{ "matiere_id": 1, "coefficient": 2 }] }
$group->put('/classes/{id:[0-9]+}/matieres', function (ServerRequestInterface $request, ResponseInterface $response, array $args) {
    $matieres = corps($request)['matieres'] ?? null;
    if (!is_array($matieres)) {
        throw new ApiException('Le champ « matieres » doit être une liste', 400);
    }

    $lignes = [];
    foreach ($matieres as $matiere) {
        if (!is_array($matiere)) {
            throw new ApiException('Chaque élément de « matieres » doit contenir matiere_id et coefficient', 400);
        }
        $coefficient = nombre($matiere, 'coefficient') ?? 1.0;
        if ($coefficient <= 0 || $coefficient >= 100) {
            throw new ApiException('Le coefficient doit être entre 0 et 100', 400);
        }
        $lignes[entier($matiere, 'matiere_id', true)] = $coefficient;
    }
    $tableau = tableauEntiers(array_keys($lignes), 'matieres');

    try {
        transaction(function (PDO $pdo) use ($args, $lignes, $tableau) {
            $stmt = $pdo->prepare('SELECT 1 FROM classe WHERE id = :id');
            $stmt->execute(['id' => $args['id']]);
            if (!$stmt->fetch()) {
                throw new ApiException('Classe introuvable', 404);
            }

            $stmt = $pdo->prepare(
                'DELETE FROM classe_matiere WHERE classe_id = :id AND NOT (matiere_id = ANY(CAST(:ids AS int[])))'
            );
            $stmt->execute(['id' => $args['id'], 'ids' => $tableau]);

            $stmt = $pdo->prepare(
                'INSERT INTO classe_matiere (classe_id, matiere_id, coefficient) VALUES (:classe, :matiere, :coef)
                 ON CONFLICT (classe_id, matiere_id) DO UPDATE SET coefficient = EXCLUDED.coefficient'
            );
            foreach ($lignes as $matiereId => $coefficient) {
                $stmt->execute(['classe' => $args['id'], 'matiere' => $matiereId, 'coef' => $coefficient]);
            }
        });
    } catch (PDOException $e) {
        throw match (codeSql($e)) {
            '23503' => new ApiException('Matière introuvable, ou encore utilisée par des cours, devoirs ou évaluations de cette classe', 409),
            default => $e,
        };
    }

    $stmt = db()->prepare(
        'SELECT m.id, m.code, m.nom, cm.coefficient FROM classe_matiere cm JOIN matiere m ON m.id = cm.matiere_id
         WHERE cm.classe_id = :id ORDER BY m.nom'
    );
    $stmt->execute(['id' => $args['id']]);

    return json($response, ['matieres' => $stmt->fetchAll()]);
});
