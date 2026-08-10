<?php
/**
 * ============================================================
 * ENDPOINT PHP : INSCRIPTION ET RÉINSCRIPTION ÉTUDIANTE
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

    // 1. Validation des champs
    $etudiantId  = DataValidator::validateId($input['etudiant_id'] ?? 0, 'etudiant_id');
    $classeId    = DataValidator::validateId($input['classe_id'] ?? 0, 'classe_id');
    $filiereId   = DataValidator::validateId($input['filiere_id'] ?? 0, 'filiere_id');
    $frais       = DataValidator::validateMontant($input['frais_inscription'] ?? 0, 0.0, 2000000.0, 'Frais Inscription');
    $anneeAcad   = DataValidator::sanitizeString($input['annee_academique_id'] ?? '2024-2025', 20);
    $typeInsc    = DataValidator::validateEnum(
        $input['type_inscription'] ?? 'Inscrire', 
        ['Inscrire', 'Réinscrire', 'Passage', 'Dérogation'], 
        'type_inscription'
    );

    // 2. Connexion PDO
    $db = getPDOConnection();

    // 3. Vérification des contraintes en base de données
    DataValidator::assertEntityExists($db, 'etudiants', 'id', $etudiantId, 'Étudiant');
    DataValidator::assertEntityExists($db, 'classes', 'id', $classeId, 'Classe');
    DataValidator::assertEntityExists($db, 'filieres', 'id', $filiereId, 'Filière');

    // 4. Exécution de l'inscription
    $stmt = $db->prepare("
        INSERT INTO inscriptions (etudiant_id, classe_id, filiere_id, annee_academique, type_inscription, frais_inscription, date_inscription, statut)
        VALUES (:etudiant_id, :classe_id, :filiere_id, :annee_academique, :type_inscription, :frais_inscription, NOW(), 'Validée')
    ");

    $stmt->execute([
        ':etudiant_id'      => $etudiantId,
        ':classe_id'        => $classeId,
        ':filiere_id'       => $filiereId,
        ':annee_academique' => $anneeAcad,
        ':type_inscription' => $typeInsc,
        ':frais_inscription'=> $frais
    ]);

    // Mettre à jour la classe courante de l'étudiant
    $stmtUpd = $db->prepare("UPDATE etudiants SET classe_id = ?, filiere_id = ? WHERE id = ?");
    $stmtUpd->execute([$classeId, $filiereId, $etudiantId]);

    echo json_encode([
        'success'        => true,
        'message'        => 'Inscription validée et enregistrée en base de données.',
        'inscription_id' => (int)$db->lastInsertId()
    ]);

} catch (InvalidArgumentException $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'VALIDATION_ERROR', 'message' => $e->getMessage()]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'SERVER_ERROR', 'message' => $e->getMessage()]);
}
