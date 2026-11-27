<?php

declare(strict_types=1);

// =====================================================================
// ENVOI D'E-MAILS PAR SMTP (CPT-06)
// Petit client SMTP sans dépendance : STARTTLS (port 587) ou TLS direct (port 465),
// authentification LOGIN. Remplace mail(), qui ne marche pas sans serveur d'envoi.
//
// Variables d'environnement :
//   SMTP_HOST        serveur (vide = aucun envoi, l'erreur est écrite dans le journal PHP)
//   SMTP_PORT        587 par défaut
//   SMTP_SECURE      tls (STARTTLS, par défaut), ssl (TLS direct, port 465) ou none (dev seulement)
//   SMTP_USER        identifiant (facultatif)
//   SMTP_PASSWORD    mot de passe (facultatif)
//   SMTP_FROM        adresse d'expédition, par exemple no-reply@iris-space.fr
//   SMTP_FROM_NAME   nom affiché, « Iris Space » par défaut
// En dev, docker-compose.yml lance Mailpit : les e-mails s'affichent sur http://localhost:8025.
// =====================================================================

class SmtpException extends RuntimeException
{
}

// Envoie un e-mail texte. Lève SmtpException si l'envoi échoue.
function envoyerEmail(string $destinataire, string $sujet, string $texte): void
{
    $hote = (string) getenv('SMTP_HOST');
    if ($hote === '') {
        throw new SmtpException('SMTP_HOST non défini : aucun e-mail ne peut partir');
    }
    $port     = (int) (getenv('SMTP_PORT') ?: 587);
    $securite = strtolower((string) (getenv('SMTP_SECURE') ?: 'tls'));
    $expediteur = (string) (getenv('SMTP_FROM') ?: 'no-reply@iris-space.fr');
    $nomExpediteur = (string) (getenv('SMTP_FROM_NAME') ?: 'Iris Space');

    foreach ([$destinataire, $expediteur] as $adresse) {
        if (filter_var($adresse, FILTER_VALIDATE_EMAIL) === false || preg_match('/[\r\n<>]/', $adresse)) {
            throw new SmtpException("Adresse invalide : $adresse");
        }
    }

    $contexte = stream_context_create(['ssl' => ['verify_peer' => true, 'verify_peer_name' => true]]);
    $adresseServeur = ($securite === 'ssl' ? 'ssl://' : 'tcp://') . $hote . ':' . $port;
    $connexion = @stream_socket_client($adresseServeur, $erreur, $message, 10, STREAM_CLIENT_CONNECT, $contexte);
    if ($connexion === false) {
        throw new SmtpException("Connexion à $adresseServeur impossible : $message");
    }
    stream_set_timeout($connexion, 10);

    try {
        smtpLire($connexion, 220);
        $domaine = gethostname() ?: 'localhost';
        smtpCommande($connexion, "EHLO $domaine", 250);

        if ($securite === 'tls') {
            smtpCommande($connexion, 'STARTTLS', 220);
            if (!stream_socket_enable_crypto($connexion, true, STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT | STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT)) {
                throw new SmtpException('Échec du chiffrement STARTTLS');
            }
            smtpCommande($connexion, "EHLO $domaine", 250);
        }

        $utilisateur = (string) getenv('SMTP_USER');
        if ($utilisateur !== '') {
            smtpCommande($connexion, 'AUTH LOGIN', 334);
            smtpCommande($connexion, base64_encode($utilisateur), 334);
            smtpCommande($connexion, base64_encode((string) getenv('SMTP_PASSWORD')), 235, true);
        }

        smtpCommande($connexion, "MAIL FROM:<$expediteur>", 250);
        smtpCommande($connexion, "RCPT TO:<$destinataire>", [250, 251]);
        smtpCommande($connexion, 'DATA', 354);

        $entetes = [
            'Date: ' . date(DATE_RFC2822),
            'From: ' . encoderEntete($nomExpediteur) . " <$expediteur>",
            "To: <$destinataire>",
            'Subject: ' . encoderEntete($sujet),
            'Message-ID: <' . bin2hex(random_bytes(16)) . '@' . substr(strrchr($expediteur, '@'), 1) . '>',
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=UTF-8',
            'Content-Transfer-Encoding: base64',
        ];
        $corps = chunk_split(base64_encode(str_replace(["\r\n", "\r"], "\n", $texte)));
        // base64 : aucune ligne ne commence par « . », pas besoin d'échapper la fin de DATA
        smtpEcrire($connexion, implode("\r\n", $entetes) . "\r\n\r\n" . $corps . ".\r\n");
        smtpLire($connexion, 250);

        smtpCommande($connexion, 'QUIT', 221);
    } finally {
        fclose($connexion);
    }
}

// Sujet ou nom avec accents : encodage MIME
function encoderEntete(string $texte): string
{
    $texte = str_replace(["\r", "\n"], ' ', $texte);
    return preg_match('/[^\x20-\x7E]/', $texte) ? '=?UTF-8?B?' . base64_encode($texte) . '?=' : $texte;
}

/** @param resource $connexion */
function smtpEcrire($connexion, string $donnees): void
{
    if (@fwrite($connexion, $donnees) === false) {
        throw new SmtpException('Connexion SMTP interrompue');
    }
}

/** @param resource $connexion */
function smtpLire($connexion, int|array $codesAttendus): string
{
    $reponse = '';
    while (($ligne = fgets($connexion, 1024)) !== false) {
        $reponse .= $ligne;
        if (strlen($ligne) < 4 || $ligne[3] !== '-') { // « 250-… » : la réponse continue
            break;
        }
    }
    $code = (int) substr($reponse, 0, 3);
    if (!in_array($code, (array) $codesAttendus, true)) {
        throw new SmtpException('Réponse SMTP inattendue : ' . trim($reponse));
    }
    return $reponse;
}

/** @param resource $connexion */
function smtpCommande($connexion, string $commande, int|array $codesAttendus, bool $secret = false): string
{
    smtpEcrire($connexion, $commande . "\r\n");
    try {
        return smtpLire($connexion, $codesAttendus);
    } catch (SmtpException $e) {
        // Ne jamais écrire un mot de passe dans le journal
        throw new SmtpException(($secret ? '(identifiants)' : explode(' ', $commande)[0]) . ' : ' . $e->getMessage());
    }
}
