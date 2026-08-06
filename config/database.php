<?php
/**
 * Configuration de connexion à la Base de Données MySQL 'universite'
 * Compatible WAMP / XAMPP / LAMP (PDO PHP 8)
 */

define('DB_HOST', 'localhost');
define('DB_NAME', 'universite');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');

class Database {
    private static ?PDO $instance = null;

    public static function getConnection(): PDO {
        if (self::$instance === null) {
            try {
                $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
                $options = [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES   => false,
                ];
                self::$instance = new PDO($dsn, DB_USER, DB_PASS, $options);
            } catch (PDOException $e) {
                die("Erreur de connexion à la base de données universite : " . $e->getMessage());
            }
        }
        return self::$instance;
    }
}
