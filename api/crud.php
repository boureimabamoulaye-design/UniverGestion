<?php
/**
 * ============================================================
 * UNIGESTION MALI - UNIVERSITÉ DE BAMAKO (USTTB)
 * ENDPOINT PHP UNIFIÉ CRUD MYSQL PDO (WAMP / Apache / PHP)
 * ============================================================
 * Supporte : GET, POST, PUT, DELETE pour toutes les tables.
 * Exécute directement les requêtes SQL préparées avec PDO.
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/db_connect.php';
require_once __DIR__ . '/validator.php';

// Tables autorisées pour prévenir toute injection de nom de table
$ALLOWED_TABLES = [
    'universites',
    'facultes',
    'filieres',
    'niveaux',
    'classes',
    'enseignants',
    'semestres',
    'matieres',
    'etudiants',
    'inscriptions',
    'notes',
    'absences',
    'bulletins',
    'paiements',
    'utilisateurs',
    'administrateurs',
    'notifications',
    'historique_acces',
    'annees_academiques',
    'supports_cours',
    'corbeille'
];

try {
    $db = getPDOConnection();

    // Extraction de la table et de l'id depuis l'URI ou les paramètres GET
    $table = $_GET['table'] ?? '';
    $id = isset($_GET['id']) ? (int)$_GET['id'] : null;

    if (empty($table) || !in_array(strtolower($table), $ALLOWED_TABLES, true)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'INVALID_TABLE',
            'message' => 'Nom de table MySQL invalide ou non autorisé.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $table = strtolower($table);
    $method = $_SERVER['REQUEST_METHOD'];

    switch ($method) {
        // ==========================================
        // 1. READ (GET)
        // ==========================================
        case 'GET':
            if ($id) {
                $stmt = $db->prepare("SELECT * FROM `{$table}` WHERE id = ? LIMIT 1");
                $stmt->execute([$id]);
                $item = $stmt->fetch();
                if (!$item) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'error' => 'NOT_FOUND', 'message' => 'Élément introuvable.'], JSON_UNESCAPED_UNICODE);
                    exit;
                }
                echo json_encode(['success' => true, 'table' => $table, 'data' => $item], JSON_UNESCAPED_UNICODE);
            } else {
                $stmt = $db->query("SELECT * FROM `{$table}`");
                $items = $stmt->fetchAll();
                echo json_encode(['success' => true, 'table' => $table, 'count' => count($items), 'data' => $items], JSON_UNESCAPED_UNICODE);
            }
            break;

        // ==========================================
        // 2. CREATE (POST)
        // ==========================================
        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
            if (empty($input) || !is_array($input)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'EMPTY_PAYLOAD', 'message' => 'Données POST vides.'], JSON_UNESCAPED_UNICODE);
                exit;
            }

            // Récupérer les colonnes réelles de la table MySQL
            $colStmt = $db->query("SHOW COLUMNS FROM `{$table}`");
            $tableCols = $colStmt->fetchAll(PDO::FETCH_COLUMN);

            $insertData = [];
            foreach ($input as $key => $val) {
                if (in_array($key, $tableCols, true) && $key !== 'created_at') {
                    if (is_bool($val)) {
                        $insertData[$key] = $val ? 1 : 0;
                    } elseif (is_array($val)) {
                        $insertData[$key] = json_encode($val);
                    } else {
                        $insertData[$key] = $val;
                    }
                }
            }

            if (empty($insertData)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'NO_VALID_COLUMNS', 'message' => 'Aucune colonne valide trouvée pour la table ' . $table], JSON_UNESCAPED_UNICODE);
                exit;
            }

            $columns = array_keys($insertData);
            $colNames = implode('`, `', $columns);
            $placeholders = implode(', ', array_fill(0, count($columns), '?'));

            // ON DUPLICATE KEY UPDATE si l'ID est fourni
            $updateClauses = [];
            foreach ($columns as $col) {
                if ($col !== 'id') {
                    $updateClauses[] = "`{$col}` = VALUES(`{$col}`)";
                }
            }
            $onDuplicate = !empty($updateClauses) ? "ON DUPLICATE KEY UPDATE " . implode(', ', $updateClauses) : "";

            $sql = "INSERT INTO `{$table}` (`{$colNames}`) VALUES ({$placeholders}) {$onDuplicate}";
            $stmt = $db->prepare($sql);
            $stmt->execute(array_values($insertData));

            $insertedId = !empty($insertData['id']) ? (int)$insertData['id'] : (int)$db->lastInsertId();
            $insertData['id'] = $insertedId;

            echo json_encode([
                'success' => true,
                'table' => $table,
                'message' => 'Enregistrement créé avec succès dans MySQL WAMP.',
                'id' => $insertedId,
                'data' => $insertData
            ], JSON_UNESCAPED_UNICODE);
            break;

        // ==========================================
        // 3. UPDATE (PUT)
        // ==========================================
        case 'PUT':
            if (!$id) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'MISSING_ID', 'message' => 'Identifiant ID requis pour la modification.'], JSON_UNESCAPED_UNICODE);
                exit;
            }

            $input = json_decode(file_get_contents('php://input'), true);
            if (empty($input) || !is_array($input)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'EMPTY_PAYLOAD', 'message' => 'Données de mise à jour vides.'], JSON_UNESCAPED_UNICODE);
                exit;
            }

            $colStmt = $db->query("SHOW COLUMNS FROM `{$table}`");
            $tableCols = $colStmt->fetchAll(PDO::FETCH_COLUMN);

            $updatePairs = [];
            $values = [];
            foreach ($input as $key => $val) {
                if (in_array($key, $tableCols, true) && $key !== 'id' && $key !== 'created_at') {
                    $updatePairs[] = "`{$key}` = ?";
                    if (is_bool($val)) {
                        $values[] = $val ? 1 : 0;
                    } elseif (is_array($val)) {
                        $values[] = json_encode($val);
                    } else {
                        $values[] = $val;
                    }
                }
            }

            if (empty($updatePairs)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'NO_VALID_COLUMNS', 'message' => 'Aucune colonne modifiable fournie.'], JSON_UNESCAPED_UNICODE);
                exit;
            }

            $values[] = $id;
            $sql = "UPDATE `{$table}` SET " . implode(', ', $updatePairs) . " WHERE id = ?";
            $stmt = $db->prepare($sql);
            $stmt->execute($values);

            echo json_encode([
                'success' => true,
                'table' => $table,
                'message' => 'Enregistrement ID #' . $id . ' mis à jour avec succès dans MySQL WAMP.',
                'id' => $id
            ], JSON_UNESCAPED_UNICODE);
            break;

        // ==========================================
        // 4. DELETE (DELETE)
        // ==========================================
        case 'DELETE':
            if (!$id) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'MISSING_ID', 'message' => 'Identifiant ID requis pour la suppression.'], JSON_UNESCAPED_UNICODE);
                exit;
            }

            // Exécution réelle de la requête DELETE préparée avec PDO
            $stmt = $db->prepare("DELETE FROM `{$table}` WHERE id = ?");
            $stmt->execute([$id]);

            // Cascades manuelles si nécessaire pour maintenir l'intégrité
            if ($table === 'etudiants') {
                $db->prepare("DELETE FROM inscriptions WHERE etudiant_id = ?")->execute([$id]);
                $db->prepare("DELETE FROM notes WHERE etudiant_id = ?")->execute([$id]);
                $db->prepare("DELETE FROM absences WHERE etudiant_id = ?")->execute([$id]);
                $db->prepare("DELETE FROM paiements WHERE etudiant_id = ?")->execute([$id]);
                $db->prepare("DELETE FROM bulletins WHERE etudiant_id = ?")->execute([$id]);
            } elseif ($table === 'classes') {
                $db->prepare("DELETE FROM inscriptions WHERE classe_id = ?")->execute([$id]);
                $db->prepare("DELETE FROM bulletins WHERE classe_id = ?")->execute([$id]);
            } elseif ($table === 'matieres') {
                $db->prepare("DELETE FROM notes WHERE matiere_id = ?")->execute([$id]);
                $db->prepare("DELETE FROM absences WHERE matiere_id = ?")->execute([$id]);
            }

            echo json_encode([
                'success' => true,
                'table' => $table,
                'message' => "Enregistrement ID #{$id} supprimé avec succès de la table {$table} dans MySQL WAMP.",
                'id' => $id
            ], JSON_UNESCAPED_UNICODE);
            break;

        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'METHOD_NOT_ALLOWED', 'message' => 'Méthode HTTP non supportée.'], JSON_UNESCAPED_UNICODE);
            break;
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'DATABASE_ERROR',
        'message' => 'Erreur MySQL PDO : ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'SERVER_ERROR',
        'message' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
