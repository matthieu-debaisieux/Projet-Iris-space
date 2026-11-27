<?php

declare(strict_types=1);

// Purge du journal des connexions (RGPD) : supprime les lignes de plus de 12 mois
// (constante JOURNAL_CONNEXIONS_MOIS de routes/helpers.php).
//
// Ligne de commande uniquement, à lancer chaque jour par une tâche planifiée (cron) :
//   php scripts/purger_journal_connexions.php               supprime et affiche le nombre de lignes
//   php scripts/purger_journal_connexions.php --simulation  compte sans rien supprimer
//
// Avec Docker (variables DB_* déjà présentes dans le conteneur) :
//   docker exec iris-api php /var/www/html/scripts/purger_journal_connexions.php
//
// Code de sortie : 0 si tout va bien, 1 en cas d'erreur (base injoignable…).

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require __DIR__ . '/../routes/database.php';
require __DIR__ . '/../routes/helpers.php';

date_default_timezone_set('Europe/Paris'); // comme public/index.php

$simulation = in_array('--simulation', $argv, true);

try {
    $nombre = purgerJournalConnexions($simulation);
} catch (Throwable $e) {
    fwrite(STDERR, date('c') . ' Purge du journal des connexions impossible : ' . $e->getMessage() . PHP_EOL);
    exit(1);
}

echo sprintf(
    '%s Journal des connexions : %d ligne(s) de plus de %d mois %s.',
    date('c'),
    $nombre,
    JOURNAL_CONNEXIONS_MOIS,
    $simulation ? 'à supprimer (simulation, rien n\'a été supprimé)' : 'supprimée(s)'
), PHP_EOL;
