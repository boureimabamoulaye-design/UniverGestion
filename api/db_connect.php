<?php
/**
 * ============================================================
 * UNIGESTION MALI - UNIVERSITÉ DE BAMAKO (USTTB)
 * SOURCE DE VÉRITÉ UNIQUE : CONNEXION PDO MYSQL SÉCURISÉE
 * ============================================================
 * Fichier : api/db_connect.php
 * Ce fichier établit une connexion PDO stricte au serveur MySQL.
 * Il gère dynamiquement la lecture des variables d'environnement (.env / system).
 * En cas d'échec de connexion, il stoppe immédiatement l'exécution et renvoie un JSON 500 explicite.
 */

// Configuration des en-têtes de réponse JSON et CORS
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');

// Gestion de la requête préliminaire OPTIONS (Preflight CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Fonction utilitaire pour lire le fichier .env à la racine
if (!function_exists('loadDatabaseEnvVars')) {
    function loadDatabaseEnvVars(string $envPath): array {
        $vars = [];
        if (file_exists($envPath) && is_readable($envPath)) {
            $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                $line = trim($line);
                if (empty($line) || str_starts_with($line, '#')) continue;
                if (str_contains($line, '=')) {
                    list($key, $val) = explode('=', $line, 2);
                    $key = trim($key);
                    $val = trim($val, " \t\n\r\0\x0B\"'");
                    $vars[$key] = $val;
                }
            }
        }
        return $vars;
    }
}

// Chargement des paramètres d'environnement
$envData = loadDatabaseEnvVars(__DIR__ . '/../.env');

$dbHost = getenv('MYSQL_HOST') ?: ($envData['MYSQL_HOST'] ?? 'localhost');
$dbPort = getenv('MYSQL_PORT') ?: ($envData['MYSQL_PORT'] ?? '3306');
$dbName = getenv('MYSQL_DATABASE') ?: ($envData['MYSQL_DATABASE'] ?? 'gestio_scolaire');
$dbUser = getenv('MYSQL_USER') ?: ($envData['MYSQL_USER'] ?? 'root');
$dbPass = getenv('MYSQL_PASSWORD') !== false ? getenv('MYSQL_PASSWORD') : ($envData['MYSQL_PASSWORD'] ?? '');

$pdo = null;

// TENTATIVE DE CONNEXION AVEC BLOC TRY-CATCH ROBUSTE
try {
    $dsn = "mysql:host={$dbHost};port={$dbPort};dbname={$dbName};charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
        PDO::ATTR_TIMEOUT            => 5, // Timeout de 5 secondes
    ];

    $pdo = new PDO($dsn, $dbUser, $dbPass, $options);

} catch (PDOException $e) {
    // Interception de l'erreur avec guide de résolution rapide
    http_response_code(500);
    $errorMessage = "Erreur de connexion MySQL\nL'application n'a pas pu se connecter à la base de données locale.\n\n"
        . $e->getMessage() . "\n\n"
        . "💡 Guide de résolution rapide :\n\n"
        . "1. Assurez-vous que votre serveur WAMP ou XAMPP est démarré (l'icône de la barre des tâches doit être verte).\n"
        . "2. Vérifiez que vous avez bien créé la base de données nommée '{$dbName}' dans votre phpMyAdmin.\n"
        . "3. Importez le fichier de structure /config/schema.sql dans votre base de données si ce n'est pas déjà fait.\n"
        . "4. Vérifiez le port de connexion dans /config/database.php (WAMP utilise par défaut 3306 ou 3308).";

    echo json_encode([
        'success' => false,
        'error'   => 'MYSQL_CONNECTION_FAILED',
        'title'   => 'Erreur de connexion MySQL',
        'message' => $errorMessage,
        'details' => $e->getMessage(),
        'target'  => "{$dbUser}@{$dbHost}:{$dbPort}/{$dbName}",
        'guide'   => [
            "Assurez-vous que votre serveur WAMP ou XAMPP est démarré (l'icône de la barre des tâches doit être verte).",
            "Vérifiez que vous avez bien créé la base de données nommée '{$dbName}' dans votre phpMyAdmin.",
            "Importez le fichier de structure /config/schema.sql dans votre base de données si ce n'est pas déjà fait.",
            "Vérifiez le port de connexion dans /config/database.php (WAMP utilise par défaut 3306 ou 3308)."
        ]
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

/**
 * Fonction globale d'accès à l'instance PDO unique
 */
function getPDOConnection(): PDO {
    global $pdo;
    if (!$pdo) {
        throw new RuntimeException("La connexion PDO MySQL n'est pas initialisée.");
    }
    return $pdo;
}

function getStrictPDO(): PDO {
    return getPDOConnection();
}
