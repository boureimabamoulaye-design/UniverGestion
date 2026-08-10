<?php
/**
 * ============================================================
 * MODULE DE VALIDATION ET DE SANITISATION DES DONNÉES ENTRANTES (PHP 8)
 * UNIGESTION MALI - UNIVERSITÉ DE BAMAKO (USTTB)
 * ============================================================
 */

class DataValidator {

    /**
     * Sanitise une chaîne de caractères contre XSS et espaces superflus.
     */
    public static function sanitizeString(?string $input, int $maxLength = 255): string {
        if ($input === null) return '';
        $trimmed = trim($input);
        $clean = htmlspecialchars(strip_tags($trimmed), ENT_QUOTES, 'UTF-8');
        return mb_substr($clean, 0, $maxLength);
    }

    /**
     * Valide et nettoie un montant financier (ex: paiement, frais de scolarité).
     * @throws InvalidArgumentException si le montant est hors limites ou invalide.
     */
    public static function validateMontant($value, float $min = 0.0, float $max = 100000000.0, string $fieldName = 'Montant'): float {
        if (!is_numeric($value)) {
            throw new InvalidArgumentException("Le champ '$fieldName' doit être une valeur numérique valide.");
        }
        $amount = (float)$value;
        if ($amount < $min) {
            throw new InvalidArgumentException("Le champ '$fieldName' ne peut pas être inférieur à " . number_format($min, 2) . " FCFA.");
        }
        if ($amount > $max) {
            throw new InvalidArgumentException("Le champ '$fieldName' dépasse le plafond autorisé de " . number_format($max, 2) . " FCFA.");
        }
        return round($amount, 2);
    }

    /**
     * Valide une note scolaire sur l'échelle 0.00 à 20.00.
     * @throws InvalidArgumentException si la note est invalide.
     */
    public static function validateNote($value, string $noteName = 'Note'): float {
        if ($value === null || $value === '') return 0.0;
        if (!is_numeric($value)) {
            throw new InvalidArgumentException("La $noteName doit être un nombre compris entre 0 et 20.");
        }
        $note = (float)$value;
        if ($note < 0.0 || $note > 20.0) {
            throw new InvalidArgumentException("La $noteName ($note) doit obligatoirement être comprise entre 0.00 et 20.00.");
        }
        return round($note, 2);
    }

    /**
     * Valide une valeur contre une liste de choix autorisés (enum).
     * @throws InvalidArgumentException si la valeur n'est pas autorisée.
     */
    public static function validateEnum(string $value, array $allowed, string $fieldName = 'Champ'): string {
        $val = trim($value);
        if (!in_array($val, $allowed, true)) {
            throw new InvalidArgumentException("Valeur '$val' non autorisée pour '$fieldName'. Valeurs permises: " . implode(', ', $allowed));
        }
        return $val;
    }

    /**
     * Valide un identifiant entier positif (Clé primaires, IDs).
     */
    public static function validateId($value, string $idName = 'ID'): int {
        if (!filter_var($value, FILTER_VALIDATE_INT) || (int)$value <= 0) {
            throw new InvalidArgumentException("L'identifiant '$idName' doit être un entier positif valide.");
        }
        return (int)$value;
    }

    /**
     * Vérifie l'existence d'un enregistrement dans la base de données.
     * @throws Exception si la clé n'existe pas.
     */
    public static function assertEntityExists(PDO $db, string $table, string $column, $id, string $entityName = 'Enregistrement'): void {
        $validId = self::validateId($id, $column);
        $stmt = $db->prepare("SELECT COUNT(*) FROM `$table` WHERE `$column` = ?");
        $stmt->execute([$validId]);
        if ((int)$stmt->fetchColumn() === 0) {
            throw new Exception("$entityName introuvable dans la base de données (table: $table, ID: $validId).");
        }
    }
}
