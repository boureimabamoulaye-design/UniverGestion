<?php
/**
 * ============================================================
 * SCRIPT DE TEST DE CONNEXION MYSQL - UNIGESTION MALI
 * ============================================================
 * Ce script vérifie la liaison avec la base de données MySQL
 * configurée dans le fichier .env et effectue un test réel sur
 * la table des étudiants et des utilisateurs.
 */

header('Content-Type: text/html; charset=utf-8');

// Function to parse .env file
function loadEnv($path = __DIR__ . '/.env') {
    if (!file_exists($path)) {
        $path = __DIR__ . '/.env.example';
    }
    if (!file_exists($path)) {
        return [];
    }
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    $env = [];
    foreach ($lines as $line) {
        $line = trim($line);
        if (strpos($line, '#') === 0 || empty($line)) continue;
        list($name, $value) = explode('=', $line, 2) + [NULL, NULL];
        if ($name !== NULL) {
            $env[trim($name)] = trim($value, " \t\n\r\0\x0B\"'");
        }
    }
    return $env;
}

$env = loadEnv();

$host     = $env['MYSQL_HOST']     ?? 'localhost';
$port     = $env['MYSQL_PORT']     ?? '3306';
$user     = $env['MYSQL_USER']     ?? 'root';
$password = $env['MYSQL_PASSWORD'] ?? '';
$database = $env['MYSQL_DATABASE'] ?? 'gestio_scolaire';

$connected = false;
$error_message = '';
$tables_found = [];
$etudiants_list = [];
$total_etudiants = 0;
$total_classes = 0;

try {
    $dsn = "mysql:host=$host;port=$port;dbname=$database;charset=utf8mb4";
    $pdo = new PDO($dsn, $user, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_TIMEOUT => 5
    ]);
    
    $connected = true;

    // Fetch existing tables
    $stmt = $pdo->query("SHOW TABLES");
    while ($row = $stmt->fetch(PDO::FETCH_NUM)) {
        $tables_found[] = $row[0];
    }

    // Check etudiants table
    if (in_array('etudiants', $tables_found)) {
        $stmtCount = $pdo->query("SELECT COUNT(*) FROM etudiants");
        $total_etudiants = (int)$stmtCount->fetchColumn();

        $stmtEtudiants = $pdo->query("SELECT id, matricule, nom, prenom, statut FROM etudiants LIMIT 10");
        $etudiants_list = $stmtEtudiants->fetchAll();
    }

    // Check classes table
    if (in_array('classes', $tables_found)) {
        $stmtClasses = $pdo->query("SELECT COUNT(*) FROM classes");
        $total_classes = (int)$stmtClasses->fetchColumn();
    }

} catch (PDOException $e) {
    $connected = false;
    $error_message = $e->getMessage();
}

?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Connexion MySQL - UniGestion</title>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; padding: 2rem; margin: 0; }
        .card { background: #1e293b; border-radius: 1rem; padding: 2rem; max-width: 800px; margin: 0 auto; box-shadow: 0 10px 25px rgba(0,0,0,0.5); border: 1px solid #334155; }
        .status-badge { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 9999px; font-weight: bold; font-size: 0.875rem; }
        .success { background: #064e3b; color: #34d399; border: 1px solid #059669; }
        .error { background: #7f1d1d; color: #fca5a5; border: 1px solid #dc2626; }
        h1 { margin-top: 0; font-size: 1.5rem; color: #38bdf8; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 1.5rem 0; }
        .box { background: #0f172a; padding: 1rem; border-radius: 0.5rem; border: 1px solid #334155; }
        .box-title { font-size: 0.75rem; text-transform: uppercase; color: #94a3b8; font-weight: bold; }
        .box-value { font-size: 1.125rem; font-weight: bold; margin-top: 0.25rem; word-break: break-all; }
        table { width: 100%; border-collapse: collapse; margin-top: 1rem; font-size: 0.875rem; }
        th, td { text-align: left; padding: 0.75rem; border-bottom: 1px solid #334155; }
        th { background: #0f172a; color: #94a3b8; text-transform: uppercase; font-size: 0.75rem; }
        .code { font-family: monospace; background: #0f172a; padding: 0.75rem; border-radius: 0.5rem; color: #38bdf8; font-size: 0.85rem; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="card">
        <h1>🔍 Rapport de Test Connexion Base de Données MySQL</h1>

        <?php if ($connected): ?>
            <div class="status-badge success">
                ✓ Connexion MySQL Établie avec Succès !
            </div>
            
            <div class="grid">
                <div class="box">
                    <div class="box-title">Hôte & Port</div>
                    <div class="box-value"><?= htmlspecialchars($host) ?>:<?= htmlspecialchars($port) ?></div>
                </div>
                <div class="box">
                    <div class="box-title">Base de Données</div>
                    <div class="box-value"><?= htmlspecialchars($database) ?></div>
                </div>
                <div class="box">
                    <div class="box-title">Utilisateur</div>
                    <div class="box-value"><?= htmlspecialchars($user) ?></div>
                </div>
                <div class="box">
                    <div class="box-title">Total Étudiants</div>
                    <div class="box-value"><?= $total_etudiants ?></div>
                </div>
            </div>

            <h3>📊 Tables Détectées dans `<?= htmlspecialchars($database) ?>` :</h3>
            <p class="code"><?= implode(', ', $tables_found) ?: 'Aucune table trouvée' ?></p>

            <?php if (!empty($etudiants_list)): ?>
                <h3>🎓 Échantillon des Étudiants (Vérification accès réel) :</h3>
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Matricule</th>
                            <th>Nom & Prénom</th>
                            <th>Statut</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($etudiants_list as $e): ?>
                            <tr>
                                <td><?= htmlspecialchars($e['id']) ?></td>
                                <td><b><?= htmlspecialchars($e['matricule']) ?></b></td>
                                <td><?= htmlspecialchars($e['prenom'] . ' ' . $e['nom']) ?></td>
                                <td><?= htmlspecialchars($e['statut']) ?></td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php endif; ?>

        <?php else: ?>
            <div class="status-badge error">
                ✗ Échec de Connexion au Serveur MySQL
            </div>

            <div class="grid">
                <div class="box">
                    <div class="box-title">Hôte Tenter</div>
                    <div class="box-value"><?= htmlspecialchars($host) ?>:<?= htmlspecialchars($port) ?></div>
                </div>
                <div class="box">
                    <div class="box-title">Base de Données</div>
                    <div class="box-value"><?= htmlspecialchars($database) ?></div>
                </div>
            </div>

            <h3>⚠️ Cause de l'erreur :</h3>
            <div class="code" style="color: #fca5a5;"><?= htmlspecialchars($error_message) ?></div>

            <p style="font-size: 0.875rem; color: #94a3b8; margin-top: 1.5rem;">
                <b>Remarque :</b> Pour connecter votre propre serveur MySQL local (WAMP/XAMPP/LAMP) ou distant, configurez les variables d'environnement dans le fichier <code style="color:#38bdf8">.env</code> :<br>
                <code>MYSQL_HOST</code>, <code>MYSQL_PORT</code>, <code>MYSQL_USER</code>, <code>MYSQL_PASSWORD</code>, <code>MYSQL_DATABASE</code>.
            </p>
        <?php endif; ?>
    </div>
</body>
</html>
