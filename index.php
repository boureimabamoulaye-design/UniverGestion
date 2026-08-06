<?php
require_once 'config/config.php';

if (isset($_SESSION['role'])) {
    if ($_SESSION['role'] === 'ADMIN') {
        header('Location: admin/dashboard.php');
        exit;
    } elseif ($_SESSION['role'] === 'ETUDIANT') {
        header('Location: etudiant/dashboard.php');
        exit;
    }
}

header('Location: login.php');
exit;
