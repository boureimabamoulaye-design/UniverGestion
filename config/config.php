<?php
/**
 * Configuration globale, Sécurité & Fonctions Utilitaires
 * App: Gestion Scolaire Universitaire du Mali
 */

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Inscription automatique du DataValidator s'il existe
if (file_exists(__DIR__ . '/../api/validator.php')) {
    require_once __DIR__ . '/../api/validator.php';
}

// Paramètres généraux
define('APP_NAME', 'UniGestion Mali');
define('APP_URL', 'http://localhost/universite');

// Protection CSRF
function generate_csrf_token(): string {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function verify_csrf_token(string $token): bool {
    return isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
}

// Nettoyage contre les failles XSS
function e(?string $str): string {
    if ($str === null) return '';
    return htmlspecialchars(trim($str), ENT_QUOTES, 'UTF-8');
}

// Vérification de Session Authentifiée
function check_admin_auth(): void {
    if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'ADMIN') {
        header('Location: ../login.php?error=unauthorized');
        exit;
    }
}

function check_etudiant_auth(): void {
    if (!isset($_SESSION['etudiant_id']) || $_SESSION['role'] !== 'ETUDIANT') {
        header('Location: ../login.php?error=unauthorized');
        exit;
    }
}

// Calcul de la moyenne ponderée (30% CC + 70% Examen)
function compute_weighted_grade(float $cc, float $exam): float {
    $cleanCc = max(0.0, min(20.0, $cc));
    $cleanExam = max(0.0, min(20.0, $exam));
    return round(($cleanCc * 0.30) + ($cleanExam * 0.70), 2);
}

