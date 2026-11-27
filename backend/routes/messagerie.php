<?php

declare(strict_types=1);

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Slim\Psr7\Stream;

// =====================================================================
// MESSAGERIE (MSG-01, MSG-02, MSG-04) : routes communes à tous les rôles connectés
//
// Qui peut écrire à qui (décision D10, à faire valider par Mme Hamidat) :
//  - un élève écrit aux profs, à l'administration et à la direction, pas aux autres élèves ;
//  - un prof, l'administration et la direction écrivent à tout le monde ;
//  - seuls les profs, l'administration et la direction créent des conversations de groupe
//    (un élève peut répondre dans un groupe dont il fait partie).
// Pour changer ces règles : peutEcrire() et peutCreerGroupe(), rien d'autre.
// =====================================================================

const ROLES_PERSONNEL = ['professeur', 'administrateur', 'direction'];
const MESSAGE_LONGUEUR_MAX = 5000;
const GROUPE_TAILLE_MAX = 50;

function peutEcrire(string $roleExpediteur, string $roleDestinataire): bool
{
    // Seul cas interdit : élève ↔ élève
    return in_array($roleExpediteur, ROLES_PERSONNEL, true) || in_array($roleDestinataire, ROLES_PERSONNEL, true);
}

function peutCreerGroupe(string $role): bool
{
    return in_array($role, ROLES_PERSONNEL, true);
}

function monRole(): string
{
    $stmt = db()->prepare('SELECT role FROM utilisateur WHERE id = :id');
    $stmt->execute(['id' => moi()]);
    return $stmt->fetchColumn();
}

function lienConversation(string $conversationId): string
{
    return '/messages?conversation=' . $conversationId;
}

// 404 si la conversation n'existe pas OU si l'utilisateur connecté n'y participe pas
function verifierParticipant(string $conversationId): void
{
    $stmt = db()->prepare(
        'SELECT 1 FROM conversation_participant WHERE conversation_id = :conversation AND utilisateur_id = :moi'
    );
    $stmt->execute(['conversation' => $conversationId, 'moi' => moi()]);
    if ($stmt->fetchColumn() === false) {
        throw new ApiException('Conversation introuvable', 404);
    }
}

// Mes conversations (ou une seule avec $id), avec les autres participants, le dernier message
// et le nombre de messages non lus. Les plus récentes d'abord.
function lireConversations(?string $id = null): array
{
    $stmt = db()->prepare(
        "SELECT c.id, c.titre, c.est_groupe, c.created_at,
                (SELECT COALESCE(json_agg(json_build_object(
                          'id', u.id, 'nom', u.nom, 'prenom', u.prenom, 'role', u.role,
                          'photo_url', u.photo_url, 'actif', u.actif) ORDER BY u.nom, u.prenom), '[]')
                 FROM conversation_participant p JOIN utilisateur u ON u.id = p.utilisateur_id
                 WHERE p.conversation_id = c.id AND p.utilisateur_id <> :moi1) AS participants,
                CASE WHEN dm.id IS NULL THEN NULL ELSE json_build_object(
                  'id', dm.id, 'contenu', dm.contenu, 'envoye_at', dm.envoye_at,
                  'expediteur_id', dm.expediteur_id, 'de_moi', dm.expediteur_id = :moi2) END AS dernier_message,
                (SELECT count(*) FROM message m
                 WHERE m.conversation_id = c.id AND NOT m.supprime AND m.expediteur_id <> :moi3
                   AND m.envoye_at > COALESCE(cp.dernier_lu_at, '-infinity')) AS non_lus
         FROM conversation_participant cp
         JOIN conversation c ON c.id = cp.conversation_id
         LEFT JOIN LATERAL (
           SELECT m.id, m.contenu, m.envoye_at, m.expediteur_id FROM message m
           WHERE m.conversation_id = c.id AND NOT m.supprime
           ORDER BY m.envoye_at DESC LIMIT 1
         ) dm ON true
         WHERE cp.utilisateur_id = :moi4
           AND (CAST(:id AS uuid) IS NULL OR c.id = CAST(:id2 AS uuid))
         ORDER BY COALESCE(dm.envoye_at, c.created_at) DESC"
    );
    $stmt->execute(['moi1' => moi(), 'moi2' => moi(), 'moi3' => moi(), 'moi4' => moi(), 'id' => $id, 'id2' => $id]);

    $conversations = $stmt->fetchAll();
    foreach ($conversations as &$conversation) {
        $conversation['participants']    = json_decode($conversation['participants'], true);
        $conversation['dernier_message'] = json_decode((string) $conversation['dernier_message'], true);
        $conversation['non_lus']         = (int) $conversation['non_lus'];
    }
    return $conversations;
}

// Messages d'une conversation, du plus ancien au plus récent
function lireMessages(string $conversationId, int $limite, ?string $avant = null, ?string $messageId = null): array
{
    $stmt = db()->prepare(
        "SELECT m.id, m.conversation_id, m.contenu, m.envoye_at, m.modifie_at,
                m.expediteur_id = :moi AS de_moi,
                json_build_object('id', u.id, 'nom', u.nom, 'prenom', u.prenom,
                                  'role', u.role, 'photo_url', u.photo_url) AS expediteur,
                (SELECT COALESCE(json_agg(json_build_object(
                          'id', pj.id, 'nom', pj.nom,
                          'url_telechargement', '/api/conversations/' || m.conversation_id || '/pieces-jointes/' || pj.id)
                        ORDER BY pj.nom), '[]')
                 FROM message_piece_jointe pj WHERE pj.message_id = m.id) AS pieces_jointes
         FROM message m
         JOIN utilisateur u ON u.id = m.expediteur_id
         WHERE m.conversation_id = :conversation AND NOT m.supprime
           AND (CAST(:avant AS timestamptz) IS NULL OR m.envoye_at < CAST(:avant2 AS timestamptz))
           AND (CAST(:message AS uuid) IS NULL OR m.id = CAST(:message2 AS uuid))
         ORDER BY m.envoye_at DESC
         LIMIT :limite"
    );
    $stmt->bindValue(':moi', moi());
    $stmt->bindValue(':conversation', $conversationId);
    $stmt->bindValue(':avant', $avant);
    $stmt->bindValue(':avant2', $avant);
    $stmt->bindValue(':message', $messageId);
    $stmt->bindValue(':message2', $messageId);
    $stmt->bindValue(':limite', $limite, PDO::PARAM_INT);
    $stmt->execute();

    $messages = array_reverse($stmt->fetchAll());
    foreach ($messages as &$message) {
        $message['de_moi']         = (bool) $message['de_moi'];
        $message['expediteur']     = json_decode($message['expediteur'], true);
        $message['pieces_jointes'] = json_decode($message['pieces_jointes'], true);
    }
    return $messages;
}

// Ajoute un message (et sa pièce jointe), marque la conversation lue pour l'expéditeur
// et prévient les autres participants (NTF-01). Renvoie l'id du message.
function ajouterMessage(PDO $pdo, string $conversationId, string $contenu, ?array $fichier): string
{
    $stmt = $pdo->prepare(
        'INSERT INTO message (conversation_id, expediteur_id, contenu)
         VALUES (:conversation, :moi, :contenu) RETURNING id, envoye_at'
    );
    $stmt->execute(['conversation' => $conversationId, 'moi' => moi(), 'contenu' => $contenu]);
    $message = $stmt->fetch();

    if ($fichier !== null) {
        $stmt = $pdo->prepare('INSERT INTO message_piece_jointe (message_id, nom, url) VALUES (:message, :nom, :url)');
        $stmt->execute(['message' => $message['id'], 'nom' => $fichier['nom'], 'url' => $fichier['url']]);
    }

    $stmt = $pdo->prepare(
        'UPDATE conversation_participant SET dernier_lu_at = :envoye
         WHERE conversation_id = :conversation AND utilisateur_id = :moi'
    );
    $stmt->execute(['envoye' => $message['envoye_at'], 'conversation' => $conversationId, 'moi' => moi()]);

    // Notification aux autres participants : une seule non lue par conversation
    $stmt = $pdo->prepare(
        "SELECT (SELECT prenom || ' ' || nom FROM utilisateur WHERE id = :moi) AS expediteur,
                c.titre, c.est_groupe,
                array_agg(p.utilisateur_id) FILTER (WHERE p.utilisateur_id <> :moi2) AS destinataires
         FROM conversation c JOIN conversation_participant p ON p.conversation_id = c.id
         WHERE c.id = :conversation GROUP BY c.id"
    );
    $stmt->execute(['moi' => moi(), 'moi2' => moi(), 'conversation' => $conversationId]);
    $infos = $stmt->fetch();

    $titre = 'Nouveau message de ' . $infos['expediteur'];
    if ($infos['est_groupe'] && $infos['titre'] !== null) {
        $titre .= ' dans « ' . $infos['titre'] . ' »';
    }
    $destinataires = $infos['destinataires'] ? explode(',', trim($infos['destinataires'], '{}')) : [];
    notifier($pdo, $destinataires, 'message', $titre, lienConversation($conversationId), true);

    return $message['id'];
}

// Contenu du message : JSON { "contenu" } ou formulaire multipart { contenu, fichier } (MSG-04).
// Le contenu peut être vide quand il y a une pièce jointe.
// Renvoie [contenu, fichier enregistré ou null].
function lireMessageEnvoye(ServerRequestInterface $request, array $data): array
{
    $fichierEnvoye = $request->getUploadedFiles()['fichier'] ?? null;
    $aFichier = $fichierEnvoye !== null && $fichierEnvoye->getError() !== UPLOAD_ERR_NO_FILE;

    $contenu = texte($data, 'contenu', MESSAGE_LONGUEUR_MAX, !$aFichier) ?? '';
    $fichier = $aFichier ? enregistrerFichier($request, 'messages') : null;

    return [$contenu, $fichier];
}

// ---------------------------------------------------------------------
// GET /api/conversations : mes conversations
// ---------------------------------------------------------------------
$group->get('/conversations', function (ServerRequestInterface $request, ResponseInterface $response) {
    return json($response, ['conversations' => lireConversations()]);
})->add(requireConnecte());

// ---------------------------------------------------------------------
// POST /api/conversations : nouvelle conversation avec un premier message
// JSON : { "participant_ids": ["uuid", …], "titre": "…" (groupe seulement), "contenu": "…" }
// Avec une seule personne, la conversation existante est reprise (200) au lieu d'en créer une (201).
// ---------------------------------------------------------------------
$group->post('/conversations', function (ServerRequestInterface $request, ResponseInterface $response) {
    $data = corps($request);

    $ids = $data['participant_ids'] ?? null;
    if (!is_array($ids) || $ids === []) {
        throw new ApiException('Le champ « participant_ids » doit être une liste non vide', 400);
    }
    $participants = [];
    foreach ($ids as $id) {
        $participants[] = strtolower(uuid(['participant_ids' => $id], 'participant_ids', true));
    }
    $participants = array_values(array_diff(array_unique($participants), [strtolower(moi())]));
    if ($participants === []) {
        throw new ApiException('Choisissez au moins un destinataire autre que vous', 400);
    }
    if (count($participants) > GROUPE_TAILLE_MAX) {
        throw new ApiException('Un groupe compte au plus ' . GROUPE_TAILLE_MAX . ' personnes', 400);
    }
    $estGroupe = count($participants) > 1;
    $titre     = texte($data, 'titre', 200);
    $contenu   = texte($data, 'contenu', MESSAGE_LONGUEUR_MAX, true);

    // Les destinataires existent, sont actifs, et les règles de D10 sont respectées
    $role = monRole();
    if ($estGroupe && !peutCreerGroupe($role)) {
        throw new ApiException('Seuls les professeurs et l\'administration peuvent créer un groupe', 403);
    }
    $stmt = db()->prepare(
        'SELECT id, role, nom, prenom FROM utilisateur WHERE id = ANY(CAST(:ids AS uuid[])) AND actif'
    );
    $stmt->execute(['ids' => '{' . implode(',', $participants) . '}']);
    $trouves = $stmt->fetchAll();
    if (count($trouves) !== count($participants)) {
        throw new ApiException('Destinataire introuvable ou compte désactivé', 400);
    }
    foreach ($trouves as $destinataire) {
        if (!peutEcrire($role, $destinataire['role'])) {
            throw new ApiException("Vous ne pouvez pas écrire à {$destinataire['prenom']} {$destinataire['nom']}", 403);
        }
    }

    [$conversationId, $creee] = transaction(function (PDO $pdo) use ($participants, $estGroupe, $titre, $contenu) {
        // Conversation à deux déjà ouverte : on la reprend
        if (!$estGroupe) {
            $stmt = $pdo->prepare(
                'SELECT c.id FROM conversation c
                 JOIN conversation_participant moi   ON moi.conversation_id = c.id   AND moi.utilisateur_id = :moi
                 JOIN conversation_participant autre ON autre.conversation_id = c.id AND autre.utilisateur_id = :autre
                 WHERE NOT c.est_groupe
                   AND (SELECT count(*) FROM conversation_participant p WHERE p.conversation_id = c.id) = 2
                 ORDER BY c.created_at LIMIT 1'
            );
            $stmt->execute(['moi' => moi(), 'autre' => $participants[0]]);
            $existante = $stmt->fetchColumn();
            if ($existante !== false) {
                ajouterMessage($pdo, $existante, $contenu, null);
                return [$existante, false];
            }
        }

        $stmt = $pdo->prepare(
            'INSERT INTO conversation (titre, est_groupe, created_by) VALUES (:titre, :groupe, :moi) RETURNING id'
        );
        $stmt->execute(['titre' => $estGroupe ? $titre : null, 'groupe' => $estGroupe ? 'true' : 'false', 'moi' => moi()]);
        $id = $stmt->fetchColumn();

        $stmt = $pdo->prepare(
            'INSERT INTO conversation_participant (conversation_id, utilisateur_id)
             SELECT :conversation, unnest(CAST(:ids AS uuid[]))'
        );
        $stmt->execute(['conversation' => $id, 'ids' => '{' . implode(',', [...$participants, moi()]) . '}']);

        ajouterMessage($pdo, $id, $contenu, null);
        return [$id, true];
    });

    return json($response, [
        'conversation' => lireConversations($conversationId)[0],
        'messages'     => lireMessages($conversationId, 1),
    ], $creee ? 201 : 200);
})->add(requireConnecte());

// ---------------------------------------------------------------------
// GET /api/conversations/{id}/messages?limit=50&avant=AAAA-MM-JJTHH:MM:SS
// Les « limit » derniers messages, du plus ancien au plus récent.
// « avant » (envoye_at du plus ancien message affiché) charge les précédents ; « encore » dit s'il en reste.
// ---------------------------------------------------------------------
$group->get('/conversations/{id:' . UUID . '}/messages', function (ServerRequestInterface $request, ResponseInterface $response, array $args) {
    verifierParticipant($args['id']);
    $query  = $request->getQueryParams();
    $limite = limite($query) ?? 50;
    $avant  = absent($query, 'avant') ? null : (string) $query['avant'];
    if ($avant !== null) {
        try {
            new DateTimeImmutable($avant);
        } catch (Exception) {
            throw new ApiException('Le paramètre « avant » doit être une date et heure', 400);
        }
    }

    $messages = lireMessages($args['id'], $limite + 1, $avant);
    $encore = count($messages) > $limite;
    if ($encore) {
        array_shift($messages); // le plus ancien ne sert qu'à savoir s'il en reste
    }

    return json($response, ['messages' => $messages, 'encore' => $encore]);
})->add(requireConnecte());

// ---------------------------------------------------------------------
// POST /api/conversations/{id}/messages : envoyer un message
// JSON { "contenu": "…" }, ou formulaire multipart avec « contenu » et « fichier » (pièce jointe, MSG-04)
// ---------------------------------------------------------------------
$group->post('/conversations/{id:' . UUID . '}/messages', function (ServerRequestInterface $request, ResponseInterface $response, array $args) {
    verifierParticipant($args['id']);

    // Conversation à deux avec un compte désactivé depuis : on ne peut plus y écrire
    $stmt = db()->prepare(
        'SELECT count(*) FILTER (WHERE u.actif) AS actifs
         FROM conversation_participant p JOIN utilisateur u ON u.id = p.utilisateur_id
         WHERE p.conversation_id = :conversation AND p.utilisateur_id <> :moi'
    );
    $stmt->execute(['conversation' => $args['id'], 'moi' => moi()]);
    if ((int) $stmt->fetchColumn() === 0) {
        throw new ApiException('Plus personne ne peut lire cette conversation (compte désactivé)', 409);
    }

    [$contenu, $fichier] = lireMessageEnvoye($request, corps($request));

    try {
        $messageId = transaction(fn (PDO $pdo) => ajouterMessage($pdo, $args['id'], $contenu, $fichier));
    } catch (Throwable $e) {
        supprimerFichier($fichier['url'] ?? null);
        throw $e;
    }

    return json($response, ['message' => lireMessages($args['id'], 1, null, $messageId)[0]], 201);
})->add(requireConnecte());

// ---------------------------------------------------------------------
// POST /api/conversations/{id}/lu : marquer la conversation comme lue
// Marque aussi comme lue sa notification. Renvoie le nouveau total de messages non lus.
// ---------------------------------------------------------------------
$group->post('/conversations/{id:' . UUID . '}/lu', function (ServerRequestInterface $request, ResponseInterface $response, array $args) {
    verifierParticipant($args['id']);

    transaction(function (PDO $pdo) use ($args) {
        $stmt = $pdo->prepare(
            'UPDATE conversation_participant SET dernier_lu_at = now()
             WHERE conversation_id = :conversation AND utilisateur_id = :moi'
        );
        $stmt->execute(['conversation' => $args['id'], 'moi' => moi()]);

        $stmt = $pdo->prepare(
            "UPDATE notification SET lue_at = now()
             WHERE utilisateur_id = :moi AND type = 'message' AND lien = :lien AND lue_at IS NULL"
        );
        $stmt->execute(['moi' => moi(), 'lien' => lienConversation($args['id'])]);
    });

    return json($response, compterNonLus());
})->add(requireConnecte());

// ---------------------------------------------------------------------
// GET /api/messages/non-lus : pastille de la navbar
// { "non_lus": messages non lus, "conversations": conversations qui en ont }
// ---------------------------------------------------------------------
function compterNonLus(): array
{
    $stmt = db()->prepare(
        "SELECT count(*) AS non_lus, count(DISTINCT m.conversation_id) AS conversations
         FROM conversation_participant cp
         JOIN message m ON m.conversation_id = cp.conversation_id
         WHERE cp.utilisateur_id = :moi AND m.expediteur_id <> :moi2 AND NOT m.supprime
           AND m.envoye_at > COALESCE(cp.dernier_lu_at, '-infinity')"
    );
    $stmt->execute(['moi' => moi(), 'moi2' => moi()]);
    $resultat = $stmt->fetch();
    return ['non_lus' => (int) $resultat['non_lus'], 'conversations' => (int) $resultat['conversations']];
}

$group->get('/messages/non-lus', function (ServerRequestInterface $request, ResponseInterface $response) {
    return json($response, compterNonLus());
})->add(requireConnecte());

// ---------------------------------------------------------------------
// GET /api/conversations/{id}/pieces-jointes/{pieceId} : télécharger une pièce jointe (MSG-04)
// Seulement pour les participants de la conversation.
// ---------------------------------------------------------------------
$group->get('/conversations/{id:' . UUID . '}/pieces-jointes/{pieceId:' . UUID . '}', function (ServerRequestInterface $request, ResponseInterface $response, array $args) {
    verifierParticipant($args['id']);

    $stmt = db()->prepare(
        'SELECT pj.nom, pj.url FROM message_piece_jointe pj
         JOIN message m ON m.id = pj.message_id
         WHERE pj.id = :piece AND m.conversation_id = :conversation AND NOT m.supprime'
    );
    $stmt->execute(['piece' => $args['pieceId'], 'conversation' => $args['id']]);
    $piece = $stmt->fetch();

    $chemin = $piece ? DOSSIER_FICHIERS . '/' . $piece['url'] : null;
    if (!$piece || str_contains($piece['url'], '..') || !is_file($chemin)) {
        throw new ApiException('Pièce jointe introuvable', 404);
    }

    // Toujours en téléchargement (jamais affiché par le navigateur) : un fichier envoyé ne peut pas
    // exécuter de script dans la page
    $nomAscii = preg_replace('/[^A-Za-z0-9._-]/', '_', $piece['nom']);
    return $response
        ->withBody(new Stream(fopen($chemin, 'rb')))
        ->withHeader('Content-Type', 'application/octet-stream')
        ->withHeader('Content-Length', (string) filesize($chemin))
        ->withHeader('X-Content-Type-Options', 'nosniff')
        ->withHeader('Content-Disposition',
            'attachment; filename="' . $nomAscii . '"; filename*=UTF-8\'\'' . rawurlencode($piece['nom']));
})->add(requireConnecte());

// ---------------------------------------------------------------------
// GET /api/utilisateurs?recherche=dup&limit=20 : à qui puis-je écrire ?
// Au moins 2 caractères ; cherche dans le nom, le prénom et l'identifiant.
// Ne renvoie que les comptes actifs à qui l'utilisateur connecté a le droit d'écrire (D10).
// ---------------------------------------------------------------------
$group->get('/utilisateurs', function (ServerRequestInterface $request, ResponseInterface $response) {
    $query     = $request->getQueryParams();
    $recherche = texte($query, 'recherche', 100, true);
    if (mb_strlen($recherche) < 2) {
        throw new ApiException('Saisissez au moins 2 caractères', 400);
    }
    $limite = limite($query) ?? 20;

    // Les % et _ tapés par l'utilisateur sont cherchés tels quels
    $motif = '%' . strtr($recherche, ['\\' => '\\\\', '%' => '\%', '_' => '\_']) . '%';
    $eleveSeulementPersonnel = !in_array(monRole(), ROLES_PERSONNEL, true);

    $stmt = db()->prepare(
        "SELECT u.id, u.nom, u.prenom, u.role, u.photo_url, c.nom AS classe
         FROM utilisateur u
         LEFT JOIN eleve e  ON e.utilisateur_id = u.id
         LEFT JOIN classe c ON c.id = e.classe_id
         WHERE u.actif AND u.id <> :moi
           AND (u.nom ILIKE :motif1 OR u.prenom ILIKE :motif2 OR u.identifiant ILIKE :motif3
                OR (u.prenom || ' ' || u.nom) ILIKE :motif4 OR (u.nom || ' ' || u.prenom) ILIKE :motif5)
           AND (NOT CAST(:personnel AS boolean) OR u.role <> 'eleve')
         ORDER BY u.nom, u.prenom
         LIMIT :limite"
    );
    $stmt->bindValue(':moi', moi());
    foreach (['motif1', 'motif2', 'motif3', 'motif4', 'motif5'] as $cle) {
        $stmt->bindValue(":$cle", $motif);
    }
    $stmt->bindValue(':personnel', $eleveSeulementPersonnel ? 'true' : 'false');
    $stmt->bindValue(':limite', $limite, PDO::PARAM_INT);
    $stmt->execute();

    return json($response, ['utilisateurs' => $stmt->fetchAll()]);
})->add(requireConnecte());
