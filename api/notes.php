<?php
/**
 * ============================================================
 * ENDPOINT PHP : SAISIE ET VALIDATION DES NOTES ÉTUDIANTES
 * UNIGESTION MALI - UNIVERSITÉ DE BAMAKO (USTTB)
 * ============================================================
 */

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/db_connect.php';
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/validator.php';

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new BadMethodCallException("Méthode HTTP non autorisée. Seul POST est accepté.");
    }

    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

    // 1. Validation des identifiants et clés étrangères
    $etudiantId = DataValidator::validateId($input['etudiant_id'] ?? 0, 'etudiant_id');
    $matiereId  = DataValidator::validateId($input['matiere_id'] ?? 0, 'matiere_id');
    $semestreId = DataValidator::validateId($input['semestre_id'] ?? 1, 'semestre_id');

    // 2. Validation stricte des bornes de notes (0.00 <= note <= 20.00)
    $noteCC     = DataValidator::validateNote($input['note_cc'] ?? 0, 'Note CC / Contrôle Continu');
    $noteExamen = DataValidator::validateNote($input['note_examen'] ?? 0, 'Note Examen');

    // Calcul de la moyenne pondérée (30% CC + 70% Examen)
    $noteFinale = compute_weighted_grade($noteCC, $noteExamen);

    // 3. Connexion PDO
    $db = getPDOConnection();

    // 4. Vérification d'existence de l'étudiant et de la matière en base
    DataValidator::assertEntityExists($db, 'etudiants', 'id', $etudiantId, 'Étudiant');
    DataValidator::assertEntityExists($db, 'matieres', 'id', $matiereId, 'Matière');

    // 5. Upsert (Mise à jour si existe, sinon Insertion)
    $stmtCheck = $db->prepare("SELECT id FROM notes WHERE etudiant_id = ? AND matiere_id = ? AND semestre_id = ? LIMIT 1");
    $stmtCheck->execute([$etudiantId, $matiereId, $semestreId]);
    $existing = $stmtCheck->fetchColumn();

    if ($existing) {
        $stmtUpdate = $db->prepare("
            UPDATE notes 
            SET note_cc = :cc, note_examen = :exam, note_finale = :final, date_saisie = NOW()
            WHERE id = :id
        ");
        $stmtUpdate->execute([
            ':cc'    => $noteCC,
            ':exam'  => $noteExamen,
            ':final' => $noteFinale,
            ':id'    => $existing
        ]);
        $noteId = (int)$existing;
    } else {
        $stmtInsert = $db->prepare("
            INSERT INTO notes (etudiant_id, matiere_id, semestre_id, note_cc, note_examen, note_finale, date_saisie)
            VALUES (:etudiant_id, :matiere_id, :semestre_id, :cc, :exam, :final, NOW())
        ");
        $stmtInsert->execute([
            ':etudiant_id' => $etudiantId,
            ':matiere_id'  => $matiereId,
            ':semestre_id' => $semestreId,
            ':cc'          => $noteCC,
            ':exam'        => $noteExamen,
            ':final'       => $noteFinale
        ]);
        $noteId = (int)$db->lastInsertId();
    }

    echo json_encode([
        'success' => true,
        'message' => 'Note validée et enregistrée avec succès.',
        'note_id' => $noteId,
        'data'    => [
            'etudiant_id' => $etudiantId,
            'matiere_id'  => $matiereId,
            'note_cc'     => $noteCC,
            'note_examen' => $noteExamen,
            'note_finale' => $noteFinale,
            'statut'      => ($noteFinale >= 10.0) ? 'Validé' : 'Ajourné'
        ]
    ]);

} catch (InvalidArgumentException $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'VALIDATION_ERROR', 'message' => $e->getMessage()]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'SERVER_ERROR', 'message' => $e->getMessage()]);
}
