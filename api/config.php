<?php
/**
 * ============================================================
 * CONFIGURATION DE CONNEXION PDO STRICTE MYSQL (PHP 8)
 * UNIGESTION MALI - UNIVERSITÉ DE BAMAKO (USTTB)
 * ============================================================
 * Inclut obligatoirement api/db_connect.php comme source de vérité unique.
 */

require_once __DIR__ . '/db_connect.php';

/**
 * Alias pour préserver la compatibilité ascendante
 */
function getStrictPDO(): PDO {
    return getPDOConnection();
}

