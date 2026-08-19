<?php
/**
 * Configuration de connexion à la Base de Données MySQL 'universite'
 * Compatible WAMP / XAMPP / LAMP / Docker (PDO PHP 8)
 * Lecture dynamique des variables d'environnement .env
 */

$envPath = __DIR__ . '/../.env';
$envVars = [];
if (file_exists($envPath) && is_readable($envPath)) {
    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if (empty($line) || str_starts_with($line, '#')) continue;
        if (str_contains($line, '=')) {
            list($k, $v) = explode('=', $line, 2);
            $envVars[trim($k)] = trim($v, " \t\n\r\0\x0B\"'");
        }
    }
}

defined('DB_HOST') or define('DB_HOST', getenv('MYSQL_HOST') ?: ($envVars['MYSQL_HOST'] ?? 'localhost'));
defined('DB_PORT') or define('DB_PORT', getenv('MYSQL_PORT') ?: ($envVars['MYSQL_PORT'] ?? '3306'));
defined('DB_NAME') or define('DB_NAME', getenv('MYSQL_DATABASE') ?: ($envVars['MYSQL_DATABASE'] ?? 'gestio_scolaire'));
defined('DB_USER') or define('DB_USER', getenv('MYSQL_USER') ?: ($envVars['MYSQL_USER'] ?? 'root'));
defined('DB_PASS') or define('DB_PASS', getenv('MYSQL_PASSWORD') !== false ? getenv('MYSQL_PASSWORD') : ($envVars['MYSQL_PASSWORD'] ?? ''));
defined('DB_CHARSET') or define('DB_CHARSET', 'utf8mb4');

class Database {
    private static ?PDO $instance = null;

    public static function getConnection(): PDO {
        if (self::$instance === null) {
            try {
                $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
                $options = [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES   => false,
                ];
                self::$instance = new PDO($dsn, DB_USER, DB_PASS, $options);
            } catch (PDOException $e) {
                http_response_code(500);
                $dbName = DB_NAME;
                $msg = "Erreur de connexion MySQL\n"
                     . "L'application n'a pas pu se connecter à la base de données locale.\n\n"
                     . $e->getMessage() . "\n\n"
                     . "💡 Guide de résolution rapide :\n\n"
                     . "Assurez-vous que votre serveur WAMP ou XAMPP est démarré (l'icône de la barre des tâches doit être verte).\n"
                     . "Vérifiez que vous avez bien créé la base de données nommée {$dbName} dans votre phpMyAdmin.\n"
                     . "Importez le fichier de structure /config/schema.sql dans votre base de données si ce n'est pas déjà fait.\n"
                     . "Vérifiez le port de connexion dans /config/database.php (WAMP utilise par défaut 3306 ou 3308).\n";

                if (str_contains($_SERVER['HTTP_ACCEPT'] ?? '', 'json') || str_contains($_SERVER['CONTENT_TYPE'] ?? '', 'json')) {
                    header('Content-Type: application/json; charset=utf-8');
                    echo json_encode([
                        'success' => false,
                        'error'   => 'MYSQL_CONNECTION_FAILED',
                        'message' => $msg
                    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
                } else {
                    die(nl2br(htmlspecialchars($msg)));
                }
                exit;
            }
        }
        return self::$instance;
    }
}

