<?php

declare(strict_types=1);

function db(): PDO{
    static $pdo = null;
    if ($pdo === null) {
        $dsn = sprintf(
            'pgsql:host=%s;port=%s;dbname=%s',
            getenv('DB_HOST'),
            getenv('DB_PORT'),
            getenv('DB_NAME')
        );
        $pdo = new PDO($dsn, getenv('DB_USER'), getenv('DB_PASSWORD'), [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION, // erreur SQL = exception
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,       // lignes en tableaux ['colonne' => valeur]
        ]);
        // Heures en heure de Paris (sinon PostgreSQL compte en UTC : un cours à 00h30 tomberait la veille)
        $pdo->exec("SET TIME ZONE 'Europe/Paris'");
    }
    return $pdo;
}