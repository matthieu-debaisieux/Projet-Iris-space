<?php

declare(strict_types=1);

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

// Messagerie (conversations, messages, non-lus, recherche des destinataires).
// Tout utilisateur connecté s'en sert, mais ne voit que les conversations dont il est participant :
// pour les autres, la réponse est 404 (comme si elles n'existaient pas).
//
// Décision D10 (proposition appliquée, à valider par Mme Hamidat) : un élève écrit aux professeurs et à
// l'administration ; un professeur ou l'administration écrit à tout le monde ; pas d'élève ↔ élève dans
// la bêta. L'« administration » regroupe les rôles administrateur, direction et dev. Concrètement, une
// conversation ne peut jamais réunir deux élèves ou plus.
//
// Les participants sont fixés à la création de la conversation (pas de route pour en ajouter ou en retirer) :
// la règle D10 est donc contrôlée une seule fois, à la création, et reste vraie ensuite.

const MESSAGERIE_MAX_PARTICIPANTS = 50;
const MESSAGE_MAX_CARACTERES = 5000;
const MESSAGERIE_APERCU_CARACTERES = 200;
const MESSAGERIE_MAX_MOTS_RECHERCHE = 5;

// Recherche sans tenir compte des accents ni de la casse : le texte cherché et les colonnes de la base
// passent par la même transformation (translate PostgreSQL côté base, strtr côté PHP).
const MESSAGERIE_ACCENTS_DE   = 'àáâãäåçèéêëìíîïñòóôõöùúûüýÿÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝ';
const MESSAGERIE_ACCENTS_VERS = 'aaaaaaceeeeiiiinooooouuuuyyAAAAAACEEEEIIIINOOOOOUUUUY';

// Mots qui désignent chaque rôle dans la recherche (sans accent) : « prof » trouve les professeurs
const MESSAGERIE_MOTS_ROLES = [
    'eleve'          => ['eleve', 'etudiant'],
    'professeur'     => ['professeur', 'enseignant'],
    'administrateur' => ['administrateur', 'administration'],
    'direction'      => ['direction'],
    'dev'            => ['dev', 'developpeur'],
];

// Colonnes d'un message (message en « m », expéditeur en « u »)
const COLONNES_MESSAGE = 'm.id, m.conversation_id, m.expediteur_id,
    u.nom AS expediteur_nom, u.prenom AS expediteur_prenom,
    m.contenu, m.envoye_at, m.modifie_at';

function messagerieRole(string $utilisateurId): ?string
{
    $stmt = db()->prepare('SELECT role FROM utilisateur WHERE id = :id');
    $stmt->execute(['id' => $utilisateurId]);
    $role = $stmt->fetchColumn();
    return $role === false ? null : (string) $role;
}

// 404 si l'utilisateur connecté ne participe pas à la conversation (ou si elle n'existe pas)
function messagerieVerifierParticipant(string $conversationId): void
{
    $stmt = db()->prepare(
        'SELECT 1 FROM conversation_participant WHERE conversation_id = :conversation AND utilisateur_id = :moi'
    );
    $stmt->execute(['conversation' => $conversationId, 'moi' => moi()]);
    if ($stmt->fetchColumn() === false) {
        throw new ApiException('Conversation introuvable', 404);
    }
}

// Nombre de messages des autres que je n'ai pas lus, dans toutes mes conversations.
// Un message est non lu s'il est plus récent que mon dernier_lu_at (ou si je n'ai jamais rien lu).
function messagerieNonLus(): int
{
    $stmt = db()->prepare(
        'SELECT count(*)
         FROM message m
         JOIN conversation_participant cp ON cp.conversation_id = m.conversation_id AND cp.utilisateur_id = :moi
         WHERE NOT m.supprime
           AND m.expediteur_id <> :moi2
           AND (cp.dernier_lu_at IS NULL OR m.envoye_at > cp.dernier_lu_at)'
    );
    $stmt->execute(['moi' => moi(), 'moi2' => moi()]);
    return (int) $stmt->fetchColumn();
}

// Mes conversations (ou une seule avec $id), de la plus récemment active à la plus ancienne. Une conversation
// sans aucun message n'apparaît que chez son créateur : les autres ne la voient qu'au premier message.
// { id, titre, est_groupe, created_at, participants (les autres), dernier_message, non_lus }
function messagerieConversations(?string $id = null, int $limite = 100): array
{
    $sql = 'SELECT c.id, c.titre, c.est_groupe, c.created_at,
                   (SELECT count(*) FROM message m
                     WHERE m.conversation_id = c.id AND NOT m.supprime AND m.expediteur_id <> :moi
                       AND (cp.dernier_lu_at IS NULL OR m.envoye_at > cp.dernier_lu_at)) AS non_lus,
                   dm.id AS dm_id, left(dm.contenu, ' . MESSAGERIE_APERCU_CARACTERES . ') AS dm_contenu,
                   dm.expediteur_id AS dm_expediteur_id, dm.envoye_at AS dm_envoye_at
            FROM conversation c
            JOIN conversation_participant cp ON cp.conversation_id = c.id AND cp.utilisateur_id = :moi2
            LEFT JOIN LATERAL (
                SELECT m.id, m.contenu, m.expediteur_id, m.envoye_at
                FROM message m
                WHERE m.conversation_id = c.id AND NOT m.supprime
                ORDER BY m.envoye_at DESC, m.id DESC
                LIMIT 1
            ) dm ON true
            WHERE (dm.id IS NOT NULL OR c.created_by = :moi3)';
    if ($id !== null) {
        $sql .= ' AND c.id = :id';
    }
    $sql .= ' ORDER BY COALESCE(dm.envoye_at, c.created_at) DESC, c.id LIMIT :limite';

    $stmt = db()->prepare($sql);
    $stmt->bindValue(':moi', moi());
    $stmt->bindValue(':moi2', moi());
    $stmt->bindValue(':moi3', moi());
    if ($id !== null) {
        $stmt->bindValue(':id', $id);
    }
    $stmt->bindValue(':limite', $limite, PDO::PARAM_INT);
    $stmt->execute();
    $lignes = $stmt->fetchAll();
    if (!$lignes) {
        return [];
    }

    // Les autres participants de toutes ces conversations, en une requête
    $ids = '{' . implode(',', array_column($lignes, 'id')) . '}';
    $stmt = db()->prepare(
        'SELECT cp.conversation_id, u.id, u.nom, u.prenom, u.role, u.photo_url
         FROM conversation_participant cp
         JOIN utilisateur u ON u.id = cp.utilisateur_id
         WHERE cp.conversation_id = ANY (CAST(:ids AS uuid[])) AND cp.utilisateur_id <> :moi
         ORDER BY u.nom, u.prenom'
    );
    $stmt->execute(['ids' => $ids, 'moi' => moi()]);
    $participants = [];
    foreach ($stmt->fetchAll() as $participant) {
        $conversationId = $participant['conversation_id'];
        unset($participant['conversation_id']);
        $participants[$conversationId][] = $participant;
    }

    return array_map(fn (array $l): array => [
        'id'              => $l['id'],
        'titre'           => $l['titre'],
        'est_groupe'      => (bool) $l['est_groupe'],
        'created_at'      => $l['created_at'],
        'participants'    => $participants[$l['id']] ?? [],
        'dernier_message' => $l['dm_id'] === null ? null : [
            'id'            => $l['dm_id'],
            'contenu'       => $l['dm_contenu'],
            'expediteur_id' => $l['dm_expediteur_id'],
            'envoye_at'     => $l['dm_envoye_at'],
        ],
        'non_lus'         => (int) $l['non_lus'],
    ], $lignes);
}

function messagerieLireMessage(string $id): array
{
    $stmt = db()->prepare(
        'SELECT ' . COLONNES_MESSAGE . '
         FROM message m
         JOIN utilisateur u ON u.id = m.expediteur_id
         WHERE m.id = :id'
    );
    $stmt->execute(['id' => $id]);
    return $stmt->fetch();
}

// Enregistre un message envoyé par l'utilisateur connecté et renvoie son id
function messagerieInsererMessage(string $conversationId, string $contenu): string
{
    $stmt = db()->prepare(
        'INSERT INTO message (conversation_id, expediteur_id, contenu)
         VALUES (:conversation, :moi, :contenu)
         RETURNING id'
    );
    $stmt->execute(['conversation' => $conversationId, 'moi' => moi(), 'contenu' => $contenu]);
    return (string) $stmt->fetchColumn();
}

// Texte sans accent ni majuscule, pour la recherche
function messagerieNormaliser(string $texte): string
{
    static $table = null;
    $table ??= array_combine(mb_str_split(MESSAGERIE_ACCENTS_DE), mb_str_split(MESSAGERIE_ACCENTS_VERS));
    return strtolower(strtr($texte, $table));
}

// Même transformation, pour une colonne de la base
function messagerieSqlNormalise(string $colonne): string
{
    return "lower(translate($colonne, '" . MESSAGERIE_ACCENTS_DE . "', '" . MESSAGERIE_ACCENTS_VERS . "'))";
}

// Rôles que désigne un mot de la recherche (« prof » → professeur), d'après le début des mots de MESSAGERIE_MOTS_ROLES
function messagerieRolesDuMot(string $mot): array
{
    if (mb_strlen($mot) < 3) {
        return [];
    }
    $roles = [];
    foreach (MESSAGERIE_MOTS_ROLES as $role => $alias) {
        foreach ($alias as $nom) {
            if (str_starts_with($nom, $mot)) {
                $roles[] = $role;
                break;
            }
        }
    }
    return $roles;
}

// ---------------------------------------------------------------------
// GET /api/utilisateurs?recherche=&limit= : à qui puis-je écrire ?
// Comptes actifs autorisés par la règle D10 (un élève ne voit que les professeurs et l'administration),
// sauf moi. Chaque mot de la recherche doit se retrouver dans le nom, le prénom, la classe ou le rôle,
// sans tenir compte des accents. Sans recherche : les premiers par ordre alphabétique (20 par défaut).
// ---------------------------------------------------------------------
$group->get('/utilisateurs', function (ServerRequestInterface $request, ResponseInterface $response) {
    $query     = $request->getQueryParams();
    $recherche = texte($query, 'recherche', 100) ?? '';
    $limite    = limite($query) ?? 20;

    $where  = ['u.actif', 'u.id <> :moi'];
    $params = ['moi' => moi()];
    if (messagerieRole(moi()) === 'eleve') {
        $where[] = "u.role <> 'eleve'";
    }

    $mots = preg_split('/\s+/', messagerieNormaliser($recherche), -1, PREG_SPLIT_NO_EMPTY) ?: [];
    foreach (array_slice($mots, 0, MESSAGERIE_MAX_MOTS_RECHERCHE) as $i => $mot) {
        // Un paramètre nommé ne peut apparaître qu'une fois dans la requête : un suffixe par colonne
        $params["m{$i}n"] = $params["m{$i}p"] = $params["m{$i}c"] = '%' . addcslashes($mot, '%_\\') . '%';
        $clauses = [
            messagerieSqlNormalise('u.nom') . " LIKE :m{$i}n",
            messagerieSqlNormalise('u.prenom') . " LIKE :m{$i}p",
            messagerieSqlNormalise('c.nom') . " LIKE :m{$i}c",
        ];
        $roles = messagerieRolesDuMot($mot);
        if ($roles) {
            $params["m{$i}r"] = '{' . implode(',', $roles) . '}';
            $clauses[] = "u.role::text = ANY (CAST(:m{$i}r AS text[]))";
        }
        $where[] = '(' . implode(' OR ', $clauses) . ')';
    }

    $stmt = db()->prepare(
        'SELECT u.id, u.nom, u.prenom, u.role, c.nom AS classe, u.photo_url
         FROM utilisateur u
         LEFT JOIN eleve e ON e.utilisateur_id = u.id
         LEFT JOIN classe c ON c.id = e.classe_id
         WHERE ' . implode(' AND ', $where) . '
         ORDER BY u.nom, u.prenom, u.id
         LIMIT :limite'
    );
    foreach ($params as $nom => $valeur) {
        $stmt->bindValue(':' . $nom, $valeur);
    }
    $stmt->bindValue(':limite', $limite, PDO::PARAM_INT);
    $stmt->execute();

    return json($response, ['utilisateurs' => $stmt->fetchAll()]);
})->add(requireConnecte());

// ---------------------------------------------------------------------
// GET /api/conversations : mes conversations avec leur dernier message et leur nombre de non-lus
// (100 au maximum, les plus récemment actives d'abord)
// ---------------------------------------------------------------------
$group->get('/conversations', function (ServerRequestInterface $request, ResponseInterface $response) {
    $limite = limite($request->getQueryParams()) ?? 100;

    return json($response, ['conversations' => messagerieConversations(null, $limite)]);
})->add(requireConnecte());

// ---------------------------------------------------------------------
// POST /api/conversations : nouvelle conversation
// Corps : { "participant_ids": ["uuid", …], "message"?: "premier message", "titre"?: "nom du groupe" }
// Les participants sont les destinataires ; le créateur en fait partie sans avoir à s'y mettre.
// Un seul destinataire : conversation à deux (« titre » ignoré) ; s'il en existe déjà une entre les
// deux personnes, elle est réutilisée (200) et le message y est ajouté. Plusieurs : conversation de groupe.
// 201 avec la conversation créée. 403 si la règle D10 est violée (deux élèves), 404 si un destinataire
// n'existe pas ou n'est pas actif.
// ---------------------------------------------------------------------
$group->post('/conversations', function (ServerRequestInterface $request, ResponseInterface $response) {
    $data    = corps($request);
    $message = texte($data, 'message', MESSAGE_MAX_CARACTERES);
    $titre   = texte($data, 'titre', 200);

    $demandes = $data['participant_ids'] ?? null;
    if (!is_array($demandes) || !array_is_list($demandes)) {
        throw new ApiException('Le champ « participant_ids » doit être une liste d\'identifiants', 400);
    }
    foreach ($demandes as $demande) {
        if (!is_string($demande) || !preg_match('/^' . UUID . '$/', $demande)) {
            throw new ApiException('Le champ « participant_ids » contient un identifiant invalide', 400);
        }
    }
    // Sans doublon (la casse d'un uuid ne compte pas) et sans moi
    $destinataires = array_values(array_diff(array_unique(array_map('strtolower', $demandes)), [strtolower(moi())]));
    if (!$destinataires) {
        throw new ApiException('Choisissez au moins un destinataire', 400);
    }
    if (count($destinataires) >= MESSAGERIE_MAX_PARTICIPANTS) {
        throw new ApiException('Une conversation ne peut pas réunir plus de ' . MESSAGERIE_MAX_PARTICIPANTS . ' personnes', 400);
    }

    $stmt = db()->prepare('SELECT id, role FROM utilisateur WHERE actif AND id = ANY (CAST(:ids AS uuid[]))');
    $stmt->execute(['ids' => '{' . implode(',', $destinataires) . '}']);
    $trouves = $stmt->fetchAll();
    if (count($trouves) !== count($destinataires)) {
        throw new ApiException('Destinataire introuvable', 404);
    }

    // Règle D10 : jamais deux élèves dans la même conversation
    $eleves = count(array_filter(array_column($trouves, 'role'), fn ($role) => $role === 'eleve'));
    if (messagerieRole(moi()) === 'eleve') {
        $eleves++;
    }
    if ($eleves > 1) {
        throw new ApiException('Une conversation ne peut pas réunir plusieurs élèves : un élève écrit aux professeurs et à l\'administration', 403);
    }

    $groupe = count($destinataires) > 1;

    [$conversationId, $creee] = transaction(function (PDO $pdo) use ($destinataires, $groupe, $titre, $message): array {
        // Conversation à deux : on reprend celle qui existe déjà entre ces deux personnes
        if (!$groupe) {
            $stmt = $pdo->prepare(
                'SELECT c.id FROM conversation c
                 WHERE NOT c.est_groupe
                   AND EXISTS (SELECT 1 FROM conversation_participant WHERE conversation_id = c.id AND utilisateur_id = :moi)
                   AND EXISTS (SELECT 1 FROM conversation_participant WHERE conversation_id = c.id AND utilisateur_id = :autre)
                 LIMIT 1'
            );
            $stmt->execute(['moi' => moi(), 'autre' => $destinataires[0]]);
            $existante = $stmt->fetchColumn();
            if ($existante !== false) {
                if ($message !== null) {
                    messagerieInsererMessage((string) $existante, $message);
                }
                return [(string) $existante, false];
            }
        }

        $stmt = $pdo->prepare(
            'INSERT INTO conversation (titre, est_groupe, created_by)
             VALUES (:titre, CAST(:groupe AS boolean), :moi)
             RETURNING id'
        );
        $stmt->execute(['titre' => $groupe ? $titre : null, 'groupe' => $groupe ? 'true' : 'false', 'moi' => moi()]);
        $conversationId = (string) $stmt->fetchColumn();

        // Le créateur n'a rien à lire : sa conversation commence à zéro non-lu
        $stmt = $pdo->prepare(
            'INSERT INTO conversation_participant (conversation_id, utilisateur_id, dernier_lu_at)
             VALUES (:conversation, :utilisateur, CASE WHEN CAST(:lu AS boolean) THEN now() END)'
        );
        $stmt->execute(['conversation' => $conversationId, 'utilisateur' => moi(), 'lu' => 'true']);
        foreach ($destinataires as $destinataire) {
            $stmt->execute(['conversation' => $conversationId, 'utilisateur' => $destinataire, 'lu' => 'false']);
        }

        if ($message !== null) {
            messagerieInsererMessage($conversationId, $message);
        }
        return [$conversationId, true];
    });

    return json($response, ['conversation' => messagerieConversations($conversationId)[0]], $creee ? 201 : 200);
})->add(requireConnecte());

// ---------------------------------------------------------------------
// GET /api/conversations/{id}/messages?limit=&avant= : fil de discussion, dans l'ordre chronologique
// Renvoie les `limit` messages les plus récents (50 par défaut, 100 au maximum). Pour remonter dans
// l'historique, passer en `avant` l'id du plus ancien message déjà reçu.
// Réponse : { messages: […], plus_anciens: true s'il en reste avant le premier }
// ---------------------------------------------------------------------
$group->get('/conversations/{id:' . UUID . '}/messages', function (ServerRequestInterface $request, ResponseInterface $response, array $args) {
    messagerieVerifierParticipant($args['id']);

    $query  = $request->getQueryParams();
    $limite = limite($query) ?? 50;
    $avant  = uuid($query, 'avant');

    $sql = 'SELECT ' . COLONNES_MESSAGE . '
            FROM message m
            JOIN utilisateur u ON u.id = m.expediteur_id
            WHERE m.conversation_id = :conversation AND NOT m.supprime';
    $params = ['conversation' => $args['id']];
    if ($avant !== null) {
        $stmt = db()->prepare('SELECT 1 FROM message WHERE id = :id AND conversation_id = :conversation');
        $stmt->execute(['id' => $avant, 'conversation' => $args['id']]);
        if ($stmt->fetchColumn() === false) {
            throw new ApiException('Message introuvable', 404);
        }
        $sql .= ' AND (m.envoye_at, m.id) < (SELECT envoye_at, id FROM message WHERE id = :avant AND conversation_id = :conversation2)';
        $params += ['avant' => $avant, 'conversation2' => $args['id']];
    }
    // Un message de plus que demandé, pour savoir s'il reste un historique à charger
    $sql .= ' ORDER BY m.envoye_at DESC, m.id DESC LIMIT :limite';

    $stmt = db()->prepare($sql);
    foreach ($params as $nom => $valeur) {
        $stmt->bindValue(':' . $nom, $valeur);
    }
    $stmt->bindValue(':limite', $limite + 1, PDO::PARAM_INT);
    $stmt->execute();
    $messages = $stmt->fetchAll();

    $plusAnciens = count($messages) > $limite;
    $messages = array_reverse(array_slice($messages, 0, $limite));

    return json($response, ['messages' => $messages, 'plus_anciens' => $plusAnciens]);
})->add(requireConnecte());

// ---------------------------------------------------------------------
// POST /api/conversations/{id}/messages : envoyer un message (201 avec { message })
// Corps : { "contenu": "texte" } (5000 caractères au maximum). Pas de pièce jointe pour le moment (MSG-04).
// ---------------------------------------------------------------------
$group->post('/conversations/{id:' . UUID . '}/messages', function (ServerRequestInterface $request, ResponseInterface $response, array $args) {
    messagerieVerifierParticipant($args['id']);
    $contenu = texte(corps($request), 'contenu', MESSAGE_MAX_CARACTERES, true);

    $messageId = messagerieInsererMessage($args['id'], $contenu);

    return json($response, ['message' => messagerieLireMessage($messageId)], 201);
})->add(requireConnecte());

// ---------------------------------------------------------------------
// POST /api/conversations/{id}/lu : marquer la conversation comme lue (dernier_lu_at = maintenant)
// Réponse : { non_lus } = le total qui reste dans toutes mes conversations (pour la pastille)
// ---------------------------------------------------------------------
$group->post('/conversations/{id:' . UUID . '}/lu', function (ServerRequestInterface $request, ResponseInterface $response, array $args) {
    $stmt = db()->prepare(
        'UPDATE conversation_participant SET dernier_lu_at = now()
         WHERE conversation_id = :conversation AND utilisateur_id = :moi'
    );
    $stmt->execute(['conversation' => $args['id'], 'moi' => moi()]);
    if ($stmt->rowCount() === 0) {
        throw new ApiException('Conversation introuvable', 404);
    }

    return json($response, ['non_lus' => messagerieNonLus()]);
})->add(requireConnecte());

// ---------------------------------------------------------------------
// GET /api/messages/non-lus : nombre de messages non lus (pastille de la barre de navigation)
// ---------------------------------------------------------------------
$group->get('/messages/non-lus', function (ServerRequestInterface $request, ResponseInterface $response) {
    return json($response, ['non_lus' => messagerieNonLus()]);
})->add(requireConnecte());
