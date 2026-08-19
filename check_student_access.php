<?php
/**
 * ============================================================
 * SCRIPT DE VALIDATION DE SÉCURITÉ ET DE CONTRÔLE D'ACCÈS BACKEND
 * UNIGESTION MALI - UNIVERSITÉ DE BAMAKO (USTTB)
 * ============================================================
 * 
 * Ce script doit être inclus au début de chaque endpoint PHP / requête SQL
 * traitant de l'espace étudiant pour vérifier systématiquement :
 * 1. Le verrouillage global de l'espace étudiant dans la table `parametres`
 * 2. Le statut individuel de l'étudiant (Actif / Bloqué / Suspendu)
 * 3. La permission d'accès stricte à la filière et à la classe demandées.
 */

header('Content-Type: application/json; charset=utf-8');

function validateStudentAccessPDO(PDO $pdo, int $etudiantId, int $filiereId, ?int $classeId = null): array {
    try {
        // 1. Vérification du Verrou Global Système
        $stmtLock = $pdo->prepare("SELECT valeur FROM parametres WHERE cle = 'global_student_lock' LIMIT 1");
        $stmtLock->execute();
        $globalLock = $stmtLock->fetchColumn();

        if ($globalLock === 'true' || $globalLock === '1') {
            return [
                'authorized' => false,
                'http_code' => 403,
                'reason' => 'GLOBAL_LOCK',
                'message' => "L'accès à l'espace étudiant est temporairement suspendu au niveau supérieur de l'université."
            ];
        }

        // 2. Vérification du Statut de l'Étudiant dans la Base de Données
        $stmtEtudiant = $pdo->prepare("
            SELECT id, matricule, nom, prenom, filiere_id, classe_id, statut, est_bloque, statut_compte 
            FROM etudiants 
            WHERE id = :id 
            LIMIT 1
        ");
        $stmtEtudiant->execute([':id' => $etudiantId]);
        $etudiant = $stmtEtudiant->fetch(PDO::FETCH_ASSOC);

        if (!$etudiant) {
            return [
                'authorized' => false,
                'http_code' => 404,
                'reason' => 'NOT_FOUND',
                'message' => "Étudiant introuvable dans la base de données."
            ];
        }

        // Vérification des drapeaux de blocage
        if ($etudiant['est_bloque'] || $etudiant['statut_compte'] === 'Bloqué' || $etudiant['statut'] === 'Suspendu') {
            return [
                'authorized' => false,
                'http_code' => 403,
                'reason' => 'ACCOUNT_BLOCKED',
                'message' => "Accès refusé : Le compte de cet étudiant est bloqué ou suspendu par l'administration."
            ];
        }

        // 3. Contrôle d'Accès Stricte à la Filière
        $stmtFiliereAuth = $pdo->prepare("
            SELECT COUNT(*) FROM etudiants 
            WHERE id = :id AND (filiere_id = :filiere_id OR id IN (
                SELECT etudiant_id FROM inscriptions WHERE etudiant_id = :id2 AND filiere_id = :filiere_id2 AND statut = 'Validée'
            ))
        ");
        $stmtFiliereAuth->execute([
            ':id' => $etudiantId,
            ':filiere_id' => $filiereId,
            ':id2' => $etudiantId,
            ':filiere_id2' => $filiereId
        ]);

        $isAuthorizedFiliere = (int)$stmtFiliereAuth->fetchColumn() > 0;

        if (!$isAuthorizedFiliere && $etudiant['filiere_id'] != $filiereId) {
            return [
                'authorized' => false,
                'http_code' => 403,
                'reason' => 'UNAUTHORIZED_FILIERE',
                'message' => "Accès refusé : L'étudiant n'est pas autorisé ni inscrit dans cette filière d'études."
            ];
        }

        // 4. Contrôle d'Accès optionnel à la Classe
        if ($classeId !== null && $classeId > 0) {
            if ($etudiant['classe_id'] != $classeId) {
                $stmtClasseAuth = $pdo->prepare("
                    SELECT COUNT(*) FROM inscriptions 
                    WHERE etudiant_id = :id AND classe_id = :classe_id AND statut = 'Validée'
                ");
                $stmtClasseAuth->execute([':id' => $etudiantId, ':classe_id' => $classeId]);
                if ((int)$stmtClasseAuth->fetchColumn() === 0) {
                    return [
                        'authorized' => false,
                        'http_code' => 403,
                        'reason' => 'UNAUTHORIZED_CLASSE',
                        'message' => "Accès refusé : L'étudiant n'appartient pas à la classe demandée."
                    ];
                }
            }
        }

        // Accès Réussi
        return [
            'authorized' => true,
            'http_code' => 200,
            'etudiant' => $etudiant,
            'message' => "Accès autorisé et validé par le backend MySQL."
        ];

    } catch (Exception $e) {
        return [
            'authorized' => false,
            'http_code' => 500,
            'reason' => 'DB_ERROR',
            'message' => "Erreur de contrôle de sécurité MySQL : " . $e->getMessage()
        ];
    }
}

// Exécution si appelé directement via API HTTP GET/POST
if (basename(__FILE__) == basename($_SERVER['SCRIPT_FILENAME'])) {
    $etudiantId = isset($_REQUEST['etudiant_id']) ? (int)$_REQUEST['etudiant_id'] : 0;
    $filiereId  = isset($_REQUEST['filiere_id'])  ? (int)$_REQUEST['filiere_id']  : 0;
    $classeId   = isset($_REQUEST['classe_id'])   ? (int)$_REQUEST['classe_id']   : null;

    if ($etudiantId <= 0 || $filiereId <= 0) {
        http_response_code(400);
        echo json_encode([
            'authorized' => false,
            'message' => "Paramètres 'etudiant_id' et 'filiere_id' requis pour la validation backend."
        ]);
        exit;
    }

    // Chargement de la connexion PDO
    $envFile = __DIR__ . '/.env';
    $host = 'localhost'; $port = '3306'; $user = 'root'; $pass = ''; $db = 'gestio_scolaire';
    if (file_exists($envFile)) {
        $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            if (strpos(trim($line), '#') === 0) continue;
            list($k, $v) = explode('=', $line, 2) + [null, null];
            if ($k === 'MYSQL_HOST') $host = trim($v);
            if ($k === 'MYSQL_PORT') $port = trim($v);
            if ($k === 'MYSQL_USER') $user = trim($v);
            if ($k === 'MYSQL_PASSWORD') $pass = trim($v);
            if ($k === 'MYSQL_DATABASE') $db = trim($v);
        }
    }

    try {
        $pdo = new PDO("mysql:host=$host;port=$port;dbname=$db;charset=utf8mb4", $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
        ]);
        $result = validateStudentAccessPDO($pdo, $etudiantId, $filiereId, $classeId);
        http_response_code($result['http_code']);
        echo json_encode($result);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['authorized' => false, 'message' => 'Erreur de connexion MySQL : ' . $e->getMessage()]);
    }
}
