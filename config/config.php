<?php
/**
 * Configuration globale, Sécurité & Fonctions Utilitaires
 * App: Gestion Scolaire Universitaire du Mali
 */

if (session_status() === PHP_SESSION_NONE) {
    session_start();
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
function e(string $str): string {
    return htmlspecialchars($str, ENT_QUOTES, 'UTF-8');
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

// Calcul de la moyenne ponderée
function compute_weighted_grade(float $cc, float $exam): float {
    return round(($cc * 0.30) + ($exam * 0.70), 2);
}
