<?php

declare(strict_types=1);

// ---------------------------------------------------------------------
// ENVOI D'E-MAILS
// Aucune bibliothèque d'e-mail dans composer.json : petit client SMTP intégré (sockets PHP).
//
// Variables d'environnement (jamais dans le dépôt : .env en local, secrets du serveur en production) :
//   SMTP_HOST      serveur SMTP ; vide = SMTP non configuré (voir plus bas)
//   SMTP_PORT      587 par défaut (STARTTLS) ; 465 = TLS dès la connexion ; 25 ou 1025 pour un serveur local sans TLS
//   SMTP_USER      identifiant de connexion (facultatif)
//   SMTP_PASSWORD  mot de passe de connexion (facultatif)
//   SMTP_FROM      adresse de l'expéditeur (par défaut : SMTP_USER, sinon noreply@iris-space.local)
//
// Sans SMTP_HOST :
//   - en dev (APP_ENV=dev) : rien n'est envoyé, le message est écrit dans error_log (le lien y figure) ;
//   - sinon : repli sur mail() de PHP, qui ne marche que si le serveur a un MTA configuré.
// ---------------------------------------------------------------------

function smtpConfigure(): bool
{
    return trim((string) getenv('SMTP_HOST')) !== '';
}

// Envoie un e-mail texte. Renvoie true si le message est parti (ou, en dev sans SMTP, écrit dans error_log).
// Ne lève jamais d'exception : un e-mail qui ne part pas ne doit pas faire échouer la route
// (et ne doit pas révéler si un compte existe). L'erreur va dans error_log, sans mot de passe.
function envoyerEmail(string $destinataire, string $sujet, string $texte): bool
{
    if (filter_var($destinataire, FILTER_VALIDATE_EMAIL) === false) {
        return false;
    }

    if (smtpConfigure()) {
        try {
            smtpEnvoyer($destinataire, $sujet, $texte);
            return true;
        } catch (Throwable $e) {
            error_log('Envoi SMTP impossible : ' . $e->getMessage());
            return false;
        }
    }

    if (appEnDev()) {
        error_log("E-mail non envoyé (SMTP non configuré), à $destinataire : $sujet\n$texte");
        return true;
    }

    $envoye = @mail(
        $destinataire,
        '=?UTF-8?B?' . base64_encode($sujet) . '?=',
        $texte,
        'Content-Type: text/plain; charset=UTF-8'
    );
    if (!$envoye) {
        error_log('E-mail non envoyé : SMTP non configuré (SMTP_HOST) et mail() indisponible');
    }
    return $envoye;
}

// E-mail du lien de réinitialisation du mot de passe (valable 1 heure)
function envoyerEmailReinitialisation(string $email, string $lien): bool
{
    return envoyerEmail(
        $email,
        'Réinitialisation de votre mot de passe',
        "Bonjour,\n\n"
        . "Pour choisir un nouveau mot de passe, ouvrez ce lien (valable 1 heure) :\n"
        . $lien . "\n\n"
        . "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.\n"
    );
}

// ---------------------------------------------------------------------
// Client SMTP minimal (RFC 5321) : EHLO, STARTTLS, AUTH PLAIN / LOGIN, MAIL, RCPT, DATA
// ---------------------------------------------------------------------

// Lit une réponse SMTP (éventuellement sur plusieurs lignes « 250-… » puis « 250 … »)
// et lève une exception si son code n'est pas parmi $attendus. Renvoie le texte de la réponse.
function smtpLire($flux, array $attendus): string
{
    $reponse = '';
    do {
        $ligne = fgets($flux, 1024);
        if ($ligne === false) {
            throw new RuntimeException('connexion fermée ou délai dépassé');
        }
        $reponse .= $ligne;
    } while (strlen($ligne) >= 4 && $ligne[3] === '-');

    if (!in_array((int) substr($reponse, 0, 3), $attendus, true)) {
        throw new RuntimeException('réponse inattendue du serveur : ' . trim(preg_replace('/\s+/', ' ', $reponse) ?? ''));
    }
    return $reponse;
}

function smtpCommande($flux, string $commande, array $attendus, ?string $affichage = null): string
{
    // $affichage : version à mettre dans un message d'erreur à la place d'une commande qui contient un secret
    if (fwrite($flux, $commande . "\r\n") === false) {
        throw new RuntimeException('écriture impossible');
    }
    try {
        return smtpLire($flux, $attendus);
    } catch (RuntimeException $e) {
        throw new RuntimeException(($affichage ?? $commande) . ' : ' . $e->getMessage(), 0, $e);
    }
}

function smtpEnvoyer(string $destinataire, string $sujet, string $texte): void
{
    $hote = trim((string) getenv('SMTP_HOST'));
    $port = (int) (getenv('SMTP_PORT') ?: 587);
    $utilisateur = (string) getenv('SMTP_USER');
    $motDePasse = (string) getenv('SMTP_PASSWORD');
    $expediteur = trim((string) getenv('SMTP_FROM')) ?: ($utilisateur !== '' && str_contains($utilisateur, '@') ? $utilisateur : 'noreply@iris-space.local');

    // Pas de saut de ligne dans une adresse : sinon on pourrait injecter des en-têtes
    foreach ([$destinataire, $expediteur] as $adresse) {
        if (filter_var($adresse, FILTER_VALIDATE_EMAIL) === false) {
            throw new RuntimeException("adresse invalide : $adresse");
        }
    }

    $local = in_array(strtolower($hote), ['localhost', '127.0.0.1', '::1'], true);
    $contexte = stream_context_create(['ssl' => ['verify_peer' => true, 'verify_peer_name' => true, 'peer_name' => $hote]]);
    $flux = @stream_socket_client(
        ($port === 465 ? 'ssl://' : 'tcp://') . $hote . ':' . $port,
        $codeErreur,
        $messageErreur,
        10,
        STREAM_CLIENT_CONNECT,
        $contexte
    );
    if ($flux === false) {
        throw new RuntimeException("connexion à $hote:$port impossible ($messageErreur)");
    }
    stream_set_timeout($flux, 15);

    try {
        smtpLire($flux, [220]);
        $nom = preg_replace('/[^A-Za-z0-9.-]/', '', (string) parse_url((string) (getenv('APP_URL') ?: 'http://localhost'), PHP_URL_HOST)) ?: 'localhost';
        $capacites = smtpCommande($flux, "EHLO $nom", [250]);

        $chiffre = $port === 465; // TLS dès la connexion
        if (!$chiffre && stripos($capacites, 'STARTTLS') !== false) {
            smtpCommande($flux, 'STARTTLS', [220]);
            if (stream_socket_enable_crypto($flux, true, STREAM_CRYPTO_METHOD_TLS_CLIENT) !== true) {
                throw new RuntimeException('négociation TLS impossible');
            }
            $chiffre = true;
            $capacites = smtpCommande($flux, "EHLO $nom", [250]);
        }

        if ($utilisateur !== '') {
            // Jamais d'identifiants en clair sur le réseau (sauf vers la machine elle-même)
            if (!$chiffre && !$local) {
                throw new RuntimeException("le serveur $hote n'offre pas STARTTLS : connexion refusée plutôt que d'envoyer le mot de passe en clair");
            }
            if (stripos($capacites, 'AUTH') !== false && stripos($capacites, 'PLAIN') === false && stripos($capacites, 'LOGIN') !== false) {
                smtpCommande($flux, 'AUTH LOGIN', [334]);
                smtpCommande($flux, base64_encode($utilisateur), [334], 'AUTH LOGIN (identifiant)');
                smtpCommande($flux, base64_encode($motDePasse), [235], 'AUTH LOGIN (mot de passe)');
            } else {
                smtpCommande($flux, 'AUTH PLAIN ' . base64_encode("\0$utilisateur\0$motDePasse"), [235], 'AUTH PLAIN');
            }
        }

        smtpCommande($flux, "MAIL FROM:<$expediteur>", [250]);
        smtpCommande($flux, "RCPT TO:<$destinataire>", [250, 251]);
        smtpCommande($flux, 'DATA', [354]);

        $domaine = substr(strrchr($expediteur, '@') ?: '@localhost', 1);
        $entetes = [
            'Date: ' . date('r'),
            "From: Iris Space <$expediteur>",
            "To: <$destinataire>",
            'Subject: =?UTF-8?B?' . base64_encode($sujet) . '?=',
            'Message-ID: <' . bin2hex(random_bytes(12)) . '@' . $domaine . '>',
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=UTF-8',
            'Content-Transfer-Encoding: base64',
        ];
        // Corps en base64 (lignes de 76 caractères) : accents sans souci, et pas de ligne réduite à « . »
        $message = implode("\r\n", $entetes) . "\r\n\r\n" . chunk_split(base64_encode($texte), 76, "\r\n");
        if (fwrite($flux, $message . ".\r\n") === false) {
            throw new RuntimeException('écriture du message impossible');
        }
        smtpLire($flux, [250]);

        try {
            smtpCommande($flux, 'QUIT', [221]);
        } catch (RuntimeException) {
            // Le message est parti : peu importe si le serveur ferme sans répondre
        }
    } finally {
        fclose($flux);
    }
}
