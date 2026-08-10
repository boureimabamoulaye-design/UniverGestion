<?php
/**
 * ============================================================
 * ENDPOINT PHP : ENREGISTREMENT ET VALIDATION DES PAIEMENTS
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

    // 1. Sanitisation et Validation des champs obligatoires
    $etudiantId  = DataValidator::validateId($input['etudiant_id'] ?? 0, 'etudiant_id');
    $typeFrais   = DataValidator::validateEnum(
        $input['type_frais'] ?? 'Scolarité', 
        ['Scolarité', 'Inscription', 'Réinscription', 'Examen', 'Autre'], 
        'type_frais'
    );
    $montantPaye = DataValidator::validateMontant($input['montant_paye'] ?? 0, 100.0, 5000000.0, 'Montant Payé');
    $modePaiement= DataValidator::validateEnum(
        $input['mode_paiement'] ?? 'Espèces', 
        ['Espèces', 'Orange Money', 'Moov Money', 'Chèque', 'Virement'], 
        'mode_paiement'
    );
    $refRecu     = DataValidator::sanitizeString($input['reference_recu'] ?? ('REC-' . time()), 50);
    $remarque    = DataValidator::sanitizeString($input['remarque'] ?? '', 255);

    // 2. Connexion PDO
    $db = getPDOConnection();

    // 3. Vérification des contraintes d'intégrité référentielle en Base de Données
    DataValidator::assertEntityExists($db, 'etudiants', 'id', $etudiantId, 'Étudiant');

    // 4. Insertion sécurisée via requête préparée
    $stmt = $db->prepare("
        INSERT INTO paiements (etudiant_id, type_frais, montant_paye, mode_paiement, reference_recu, remarque, date_paiement)
        VALUES (:etudiant_id, :type_frais, :montant_paye, :mode_paiement, :reference_recu, :remarque, NOW())
    ");

    $stmt->execute([
        ':etudiant_id'   => $etudiantId,
        ':type_frais'    => $typeFrais,
        ':montant_paye'  => $montantPaye,
        ':mode_paiement' => $modePaiement,
        ':reference_recu'=> $refRecu,
        ':remarque'     => $remarque
    ]);

    $paiementId = $db->lastInsertId();

    echo json_encode([
        'success'     => true,
        'message'     => 'Paiement validé, sanitizé et enregistré en base de données avec succès.',
        'paiement_id' => (int)$paiementId,
        'data'        => [
            'etudiant_id'  => $etudiantId,
            'type_frais'   => $typeFrais,
            'montant_paye' => $montantPaye,
            'mode_paiement'=> $modePaiement,
            'reference'    => $refRecu
        ]
    ]);

} catch (InvalidArgumentException $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'VALIDATION_ERROR', 'message' => $e->getMessage()]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'SERVER_ERROR', 'message' => $e->getMessage()]);
}
