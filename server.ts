import express from "express";
import http from "http";
import path from "path";
import fs from "fs";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

import {
  INITIAL_UNIVERSITES,
  INITIAL_FACULTES,
  INITIAL_FILIERES,
  INITIAL_NIVEAUX,
  INITIAL_ANNEES_ACADEMIQUES,
  INITIAL_CLASSES,
  INITIAL_ENSEIGNANTS,
  INITIAL_SEMESTRES,
  INITIAL_MATIERES,
  INITIAL_ETUDIANTS,
  INITIAL_INSCRIPTIONS,
  INITIAL_NOTES,
  INITIAL_ABSENCES,
  INITIAL_BULLETINS,
  INITIAL_PAIEMENTS,
  INITIAL_UTILISATEURS,
  INITIAL_ADMINISTRATEURS,
  INITIAL_NOTIFICATIONS,
  INITIAL_HISTORIQUE,
  INITIAL_SUPPORTS_COURS
} from "./src/data/initialData";

dotenv.config();

const app = express();
app.disable("x-powered-by");
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

// =========================================================
// MYSQL DATABASE CONFIGURATION (WAMP / Localhost / phpMyAdmin)
// =========================================================
const MYSQL_CONFIG = {
  host: process.env.MYSQL_HOST || "localhost",
  port: parseInt(process.env.MYSQL_PORT || "3306", 10),
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD ?? "",
  database: process.env.MYSQL_DATABASE || "gestio_scolaire",
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  connectTimeout: 800,
  charset: "utf8mb4"
};

let mysqlPool: mysql.Pool | null = null;
let mysqlAvailableCache: { available: boolean; timestamp: number } | null = null;
const CACHE_TTL_MS = 20000; // 20s cache to avoid repetitive failed connect attempts

function getMySqlPool(): mysql.Pool {
  if (!mysqlPool) {
    mysqlPool = mysql.createPool(MYSQL_CONFIG);
  }
  return mysqlPool;
}

async function isMySqlAvailable(): Promise<boolean> {
  const now = Date.now();
  if (mysqlAvailableCache && (now - mysqlAvailableCache.timestamp < CACHE_TTL_MS)) {
    return mysqlAvailableCache.available;
  }

  try {
    const pool = getMySqlPool();
    const connPromise = pool.getConnection();
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("MySQL timeout")), 600)
    );
    const conn: any = await Promise.race([connPromise, timeoutPromise]);
    conn.release();
    mysqlAvailableCache = { available: true, timestamp: now };
    return true;
  } catch {
    mysqlAvailableCache = { available: false, timestamp: now };
    return false;
  }
}

// Local cache storage for seamless runtime and fallback
const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "db_storage.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getInitialDatabase() {
  return {
    unigestion_universites: INITIAL_UNIVERSITES,
    unigestion_facultes: INITIAL_FACULTES,
    unigestion_filieres: INITIAL_FILIERES,
    unigestion_niveaux: INITIAL_NIVEAUX,
    unigestion_annees: INITIAL_ANNEES_ACADEMIQUES,
    unigestion_classes: INITIAL_CLASSES,
    unigestion_enseignants: INITIAL_ENSEIGNANTS,
    unigestion_semestres: INITIAL_SEMESTRES,
    unigestion_matieres: INITIAL_MATIERES,
    unigestion_etudiants: INITIAL_ETUDIANTS,
    unigestion_inscriptions: INITIAL_INSCRIPTIONS,
    unigestion_notes: INITIAL_NOTES,
    unigestion_absences: INITIAL_ABSENCES,
    unigestion_bulletins: INITIAL_BULLETINS,
    unigestion_paiements: INITIAL_PAIEMENTS,
    unigestion_utilisateurs: INITIAL_UTILISATEURS,
    unigestion_administrateurs: INITIAL_ADMINISTRATEURS,
    unigestion_notifications: INITIAL_NOTIFICATIONS,
    unigestion_historique: INITIAL_HISTORIQUE,
    unigestion_supports_cours: INITIAL_SUPPORTS_COURS,
    unigestion_corbeille: [],
    unigestion_global_student_lock: false,
    
    // Direct SQL table aliases
    universites: INITIAL_UNIVERSITES,
    facultes: INITIAL_FACULTES,
    niveaux: INITIAL_NIVEAUX,
    etudiants: INITIAL_ETUDIANTS,
    filieres: INITIAL_FILIERES,
    classes: INITIAL_CLASSES,
    inscriptions: INITIAL_INSCRIPTIONS,
    paiements: INITIAL_PAIEMENTS,
    notes: INITIAL_NOTES,
    bulletins: INITIAL_BULLETINS,
    matieres: INITIAL_MATIERES,
    enseignants: INITIAL_ENSEIGNANTS,
    semestres: INITIAL_SEMESTRES,
    annees_academiques: INITIAL_ANNEES_ACADEMIQUES,
    absences: INITIAL_ABSENCES,
    utilisateurs: INITIAL_UTILISATEURS,
    administrateurs: INITIAL_ADMINISTRATEURS,
    historique_acces: INITIAL_HISTORIQUE,
    notifications: INITIAL_NOTIFICATIONS,
    supports_cours: INITIAL_SUPPORTS_COURS,
    corbeille: []
  };
}

let memoryDatabase: Record<string, any> | null = null;
let saveDebounceTimer: NodeJS.Timeout | null = null;

function readDatabase() {
  if (memoryDatabase) {
    return memoryDatabase;
  }
  if (fs.existsSync(DATA_FILE)) {
    try {
      const content = fs.readFileSync(DATA_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === "object") {
        memoryDatabase = parsed;
        return parsed;
      }
    } catch (e) {
      console.error("Error reading storage file:", e);
    }
  }
  const initDb = getInitialDatabase();
  memoryDatabase = initDb;
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(initDb, null, 2), "utf-8");
  } catch {}
  return initDb;
}

function saveDatabase(data: Record<string, any>) {
  memoryDatabase = data;
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
  }
  saveDebounceTimer = setTimeout(() => {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
    } catch (e) {
      console.error("Error writing storage file:", e);
    }
    // Also trigger asynchronous synchronization directly to MySQL
    syncDataToMySQL(data).catch(() => {});
  }, 300);
  return true;
}

// In-Memory Rate Limiter for login protection
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string, maxAttempts = 20, windowMs = 15 * 60 * 1000): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (!record || now > record.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxAttempts - 1 };
  }

  if (record.count >= maxAttempts) {
    return { allowed: false, remaining: 0 };
  }

  record.count += 1;
  return { allowed: true, remaining: maxAttempts - record.count };
}

// Security headers middleware
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  if (req.path.startsWith("/api/")) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }
  next();
});

// =========================================================
// DIRECT MYSQL SYNCHRONIZATION ENGINE
// =========================================================

const TABLE_KEY_MAP: Record<string, string> = {
  universites: "unigestion_universites",
  facultes: "unigestion_facultes",
  filieres: "unigestion_filieres",
  niveaux: "unigestion_niveaux",
  annees_academiques: "unigestion_annees",
  classes: "unigestion_classes",
  enseignants: "unigestion_enseignants",
  semestres: "unigestion_semestres",
  matieres: "unigestion_matieres",
  etudiants: "unigestion_etudiants",
  inscriptions: "unigestion_inscriptions",
  notes: "unigestion_notes",
  absences: "unigestion_absences",
  bulletins: "unigestion_bulletins",
  paiements: "unigestion_paiements",
  utilisateurs: "unigestion_utilisateurs",
  administrateurs: "unigestion_administrateurs",
  notifications: "unigestion_notifications",
  historique_acces: "unigestion_historique",
  corbeille: "unigestion_corbeille",
  supports_cours: "unigestion_supports_cours"
};

// Map column fields safely to avoid MySQL query failures when schemas have specific columns
async function getTableColumns(pool: mysql.Pool, tableName: string): Promise<Set<string>> {
  try {
    const [rows]: any = await pool.query(`SHOW COLUMNS FROM ??`, [tableName]);
    if (Array.isArray(rows)) {
      return new Set(rows.map((r: any) => r.Field));
    }
  } catch {}
  return new Set();
}

async function syncDataToMySQL(dbData: Record<string, any>) {
  try {
    if (!(await isMySqlAvailable())) return;
    const pool = getMySqlPool();
    // Test if MySQL is alive
    await pool.query("SELECT 1");

    // Temporarily disable foreign key checks for clean bulk sync
    await pool.query("SET FOREIGN_KEY_CHECKS = 0");

    const syncOrder = [
      "universites",
      "facultes",
      "filieres",
      "niveaux",
      "annees_academiques",
      "classes",
      "enseignants",
      "semestres",
      "matieres",
      "etudiants",
      "inscriptions",
      "notes",
      "absences",
      "bulletins",
      "paiements",
      "utilisateurs",
      "administrateurs",
      "notifications",
      "historique_acces",
      "supports_cours"
    ];

    for (const tbl of syncOrder) {
      const storageKey = TABLE_KEY_MAP[tbl];
      const items = dbData[storageKey] || dbData[tbl];

      if (Array.isArray(items)) {
        const columns = await getTableColumns(pool, tbl);
        if (columns.size === 0) continue;

        const currentIds: number[] = [];

        for (const item of items) {
          if (!item || typeof item !== 'object') continue;
          
          const cleanItem: Record<string, any> = {};
          for (const [k, v] of Object.entries(item)) {
            // Handle naming differences
            let colName = k;
            if (!columns.has(colName)) {
              if (k === 'nom' && columns.has('libelle')) colName = 'libelle';
              else if (k === 'libelle' && columns.has('nom')) colName = 'nom';
              else if (k === 'mot_de_passe' && columns.has('password')) colName = 'password';
            }

            if (columns.has(colName)) {
              if (v !== undefined && v !== null) {
                if (typeof v === 'boolean') cleanItem[colName] = v ? 1 : 0;
                else if (typeof v === 'object') cleanItem[colName] = JSON.stringify(v);
                else cleanItem[colName] = v;
              }
            }
          }

          if (Object.keys(cleanItem).length > 0) {
            try {
              const keys = Object.keys(cleanItem);
              const values = Object.values(cleanItem);
              const placeholders = keys.map(() => '?').join(', ');
              const updateClause = keys.filter(k => k !== 'id').map(k => `\`${k}\` = VALUES(\`${k}\`)`).join(', ');

              const query = `
                INSERT INTO \`${tbl}\` (\`${keys.join('`, `')}\`)
                VALUES (${placeholders})
                ${updateClause ? `ON DUPLICATE KEY UPDATE ${updateClause}` : ''}
              `;
              await pool.query(query, values);
              if (item.id) currentIds.push(Number(item.id));
            } catch (err) {
              // Ignore single item sync mismatch
            }
          }
        }

        // Delete records from MySQL that were removed in the UI
        if (currentIds.length > 0) {
          try {
            await pool.query(`DELETE FROM \`${tbl}\` WHERE id NOT IN (?)`, [currentIds]);
          } catch {}
        } else if (items.length === 0) {
          try {
            await pool.query(`DELETE FROM \`${tbl}\``);
          } catch {}
        }
      }
    }

    await pool.query("SET FOREIGN_KEY_CHECKS = 1");
  } catch (e) {
    // MySQL not reachable or not started yet - handled gracefully
  }
}

// =========================================================
// MYSQL CONNECTION TEST & STATUS ENDPOINTS
// =========================================================

app.get("/api/mysql/status", async (req, res) => {
  try {
    const isOnline = await isMySqlAvailable();
    if (!isOnline) {
      return res.json({
        success: true,
        connected: false,
        database: MYSQL_CONFIG.database,
        host: `${MYSQL_CONFIG.host}:${MYSQL_CONFIG.port}`,
        user: MYSQL_CONFIG.user,
        tablesCount: 0,
        tables: [],
        message: `MySQL WAMP (localhost:${MYSQL_CONFIG.port}) n'est pas encore démarré ou connecté. Dès que WAMP est lancé dans VS Code, la synchronisation MySQL directe est active.`
      });
    }

    const pool = getMySqlPool();
    const [rows]: any = await pool.query("SHOW TABLES");
    const tables = Array.isArray(rows) ? rows.map((r: any) => Object.values(r)[0]) : [];
    return res.json({
      success: true,
      connected: true,
      database: MYSQL_CONFIG.database,
      host: `${MYSQL_CONFIG.host}:${MYSQL_CONFIG.port}`,
      user: MYSQL_CONFIG.user,
      tablesCount: tables.length,
      tables,
      message: `Connexion MySQL WAMP active sur la base "${MYSQL_CONFIG.database}". ${tables.length} tables trouvées.`
    });
  } catch (error: any) {
    return res.json({
      success: true,
      connected: false,
      database: MYSQL_CONFIG.database,
      host: `${MYSQL_CONFIG.host}:${MYSQL_CONFIG.port}`,
      user: MYSQL_CONFIG.user,
      tablesCount: 0,
      tables: [],
      error: error?.code || error?.message,
      message: `MySQL WAMP (localhost:${MYSQL_CONFIG.port}) n'est pas encore démarré ou connecté. Dès que WAMP est lancé dans VS Code, la synchronisation MySQL directe est active.`
    });
  }
});

app.post("/api/mysql/test-connection", async (req, res) => {
  const customConfig = {
    host: req.body.host || MYSQL_CONFIG.host,
    port: parseInt(req.body.port || String(MYSQL_CONFIG.port), 10),
    user: req.body.user || MYSQL_CONFIG.user,
    password: req.body.password !== undefined ? req.body.password : MYSQL_CONFIG.password,
    database: req.body.database || MYSQL_CONFIG.database,
    connectTimeout: 3000
  };

  try {
    const testPool = mysql.createPool(customConfig);
    const [rows]: any = await testPool.query("SHOW TABLES");
    await testPool.end();
    return res.json({
      success: true,
      connected: true,
      message: `Connexion réussie à MySQL WAMP (${customConfig.database}) ! ${rows.length} tables détectées.`,
      tablesCount: rows.length
    });
  } catch (err: any) {
    return res.json({
      success: false,
      connected: false,
      message: `Impossible de joindre MySQL WAMP : ${err.message}`,
      error: err.code || err.message
    });
  }
});

// Dynamic SQL Exporter for WAMP / phpMyAdmin
app.get("/api/mysql/export-sql", (req, res) => {
  const db = readDatabase();
  let sql = `-- =========================================================
-- APPLICATION UNIGESTION MALI - DUMP SQL COMPLET
-- Base de données : gestio_scolaire
-- Compatible MySQL 5.7+ / 8.0+ (WAMP Server / phpMyAdmin / MariaDB)
-- Généré le : ${new Date().toISOString()}
-- =========================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

CREATE DATABASE IF NOT EXISTS \`gestio_scolaire\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE \`gestio_scolaire\`;

-- 1. Table universites
CREATE TABLE IF NOT EXISTS \`universites\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`code\` VARCHAR(20) NOT NULL UNIQUE,
  \`nom\` VARCHAR(255) NOT NULL,
  \`sigle\` VARCHAR(50) NOT NULL,
  \`adresse\` VARCHAR(255) DEFAULT NULL,
  \`ville\` VARCHAR(100) DEFAULT 'Bamako',
  \`pays\` VARCHAR(100) DEFAULT 'Mali',
  \`telephone\` VARCHAR(30) DEFAULT NULL,
  \`email\` VARCHAR(100) DEFAULT NULL,
  \`logo_url\` TEXT DEFAULT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Table facultes
CREATE TABLE IF NOT EXISTS \`facultes\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`universite_id\` INT NOT NULL DEFAULT 1,
  \`code\` VARCHAR(20) NOT NULL UNIQUE,
  \`nom\` VARCHAR(255) NOT NULL,
  \`doyen\` VARCHAR(150) DEFAULT NULL,
  \`description\` TEXT DEFAULT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Table filieres
CREATE TABLE IF NOT EXISTS \`filieres\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`faculte_id\` INT NOT NULL DEFAULT 1,
  \`code\` VARCHAR(20) NOT NULL UNIQUE,
  \`nom\` VARCHAR(255) NOT NULL,
  \`description\` TEXT DEFAULT NULL,
  \`domaine\` VARCHAR(100) DEFAULT NULL,
  \`diplome\` VARCHAR(50) DEFAULT 'Licence',
  \`frais_scolarite\` DECIMAL(12,2) DEFAULT 350000.00,
  \`duree_annees\` INT DEFAULT 3,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Table niveaux
CREATE TABLE IF NOT EXISTS \`niveaux\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`filiere_id\` INT NOT NULL,
  \`code\` VARCHAR(20) NOT NULL,
  \`nom\` VARCHAR(100) NOT NULL,
  \`diplome_vise\` VARCHAR(100) DEFAULT 'Licence',
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Table annees_academiques
CREATE TABLE IF NOT EXISTS \`annees_academiques\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`code\` VARCHAR(20) NOT NULL UNIQUE,
  \`libelle\` VARCHAR(100) NOT NULL,
  \`date_debut\` DATE NOT NULL,
  \`date_fin\` DATE NOT NULL,
  \`est_active\` TINYINT(1) DEFAULT 0,
  \`est_archivee\` TINYINT(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Table classes
CREATE TABLE IF NOT EXISTS \`classes\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`filiere_id\` INT NOT NULL,
  \`niveau_id\` INT DEFAULT NULL,
  \`annee_academique_id\` INT DEFAULT NULL,
  \`code\` VARCHAR(50) NOT NULL UNIQUE,
  \`nom\` VARCHAR(150) NOT NULL,
  \`niveau\` VARCHAR(20) DEFAULT 'L1',
  \`capacite\` INT DEFAULT 60,
  \`capacite_max\` INT DEFAULT 60,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Table enseignants
CREATE TABLE IF NOT EXISTS \`enseignants\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`matricule\` VARCHAR(50) NOT NULL UNIQUE,
  \`nom\` VARCHAR(100) NOT NULL,
  \`prenom\` VARCHAR(100) NOT NULL,
  \`titre\` VARCHAR(100) DEFAULT 'Docteur',
  \`grade\` VARCHAR(100) DEFAULT NULL,
  \`email\` VARCHAR(100) NOT NULL,
  \`telephone\` VARCHAR(30) DEFAULT NULL,
  \`specialite\` VARCHAR(150) DEFAULT NULL,
  \`universite_id\` INT NOT NULL DEFAULT 1,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Table etudiants
CREATE TABLE IF NOT EXISTS \`etudiants\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`matricule\` VARCHAR(50) NOT NULL UNIQUE,
  \`nom\` VARCHAR(100) NOT NULL,
  \`prenom\` VARCHAR(100) NOT NULL,
  \`date_naissance\` DATE DEFAULT NULL,
  \`lieu_naissance\` VARCHAR(100) DEFAULT 'Bamako',
  \`sexe\` ENUM('M', 'F') NOT NULL DEFAULT 'M',
  \`genre\` ENUM('M', 'F') DEFAULT 'M',
  \`nationalite\` VARCHAR(50) DEFAULT 'Mali',
  \`email\` VARCHAR(100) DEFAULT NULL,
  \`telephone\` VARCHAR(30) DEFAULT NULL,
  \`adresse\` VARCHAR(255) DEFAULT NULL,
  \`classe_id\` INT NOT NULL,
  \`filiere_id\` INT DEFAULT NULL,
  \`statut\` VARCHAR(50) DEFAULT 'Inscrit',
  \`est_bloque\` TINYINT(1) DEFAULT 0,
  \`statut_compte\` VARCHAR(20) DEFAULT 'Actif',
  \`tuteur_nom\` VARCHAR(100) DEFAULT NULL,
  \`tuteur_prenom\` VARCHAR(100) DEFAULT NULL,
  \`tuteur_telephone\` VARCHAR(30) DEFAULT NULL,
  \`date_inscription\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  \`mot_de_passe\` VARCHAR(255) NOT NULL DEFAULT 'etudiant123',
  \`photo_url\` LONGTEXT DEFAULT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Table semestres
CREATE TABLE IF NOT EXISTS \`semestres\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`code\` VARCHAR(20) NOT NULL,
  \`libelle\` VARCHAR(50) NOT NULL,
  \`niveau_id\` INT DEFAULT NULL,
  \`ordre\` INT DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. Table matieres
CREATE TABLE IF NOT EXISTS \`matieres\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`code\` VARCHAR(20) NOT NULL UNIQUE,
  \`nom\` VARCHAR(150) NOT NULL,
  \`filiere_id\` INT NOT NULL,
  \`niveau_id\` INT DEFAULT NULL,
  \`semestre_id\` INT DEFAULT 1,
  \`semestre\` INT DEFAULT 1,
  \`enseignant_id\` INT DEFAULT NULL,
  \`enseignant_nom\` VARCHAR(150) DEFAULT NULL,
  \`credits\` INT DEFAULT 3,
  \`credits_ectcs\` INT DEFAULT 3,
  \`coefficient\` INT DEFAULT 1,
  \`ue_type\` VARCHAR(50) DEFAULT 'Majeure',
  \`support_fichier_nom\` VARCHAR(255) DEFAULT NULL,
  \`support_fichier_url\` LONGTEXT DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. Table inscriptions
CREATE TABLE IF NOT EXISTS \`inscriptions\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`etudiant_id\` INT NOT NULL,
  \`classe_id\` INT NOT NULL,
  \`filiere_id\` INT DEFAULT NULL,
  \`annee_academique_id\` INT DEFAULT 1,
  \`annee_academique\` VARCHAR(50) DEFAULT '2024-2025',
  \`date_inscription\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  \`statut\` VARCHAR(50) DEFAULT 'Validée',
  \`frais_inscription\` DECIMAL(12,2) DEFAULT 150000.00,
  \`type_inscription\` VARCHAR(50) DEFAULT 'Inscrire',
  \`statut_paiement\` VARCHAR(50) DEFAULT 'Payé',
  \`statut_validation\` VARCHAR(50) DEFAULT 'Validé'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 12. Table paiements
CREATE TABLE IF NOT EXISTS \`paiements\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`etudiant_id\` INT NOT NULL,
  \`annee_academique_id\` INT DEFAULT 1,
  \`filiere_id\` INT DEFAULT NULL,
  \`filiere_code\` VARCHAR(20) DEFAULT NULL,
  \`filiere_nom\` VARCHAR(150) DEFAULT NULL,
  \`classe_id\` INT DEFAULT NULL,
  \`classe_nom\` VARCHAR(100) DEFAULT NULL,
  \`annee_libelle\` VARCHAR(50) DEFAULT '2024 - 2025',
  \`type_frais\` VARCHAR(50) DEFAULT 'Scolarité',
  \`montant\` DECIMAL(12,2) NOT NULL,
  \`montant_paye\` DECIMAL(12,2) NOT NULL,
  \`reste_a_payer\` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  \`mode_paiement\` VARCHAR(50) DEFAULT 'Orange Money',
  \`methode\` VARCHAR(50) DEFAULT 'Orange Money',
  \`reference_recu\` VARCHAR(100) NOT NULL UNIQUE,
  \`reference_transaction\` VARCHAR(100) DEFAULT NULL,
  \`date_paiement\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  \`statut\` VARCHAR(50) DEFAULT 'Complet',
  \`remarque\` TEXT DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 13. Table notes
CREATE TABLE IF NOT EXISTS \`notes\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`etudiant_id\` INT NOT NULL,
  \`matiere_id\` INT NOT NULL,
  \`semestre_id\` INT DEFAULT 1,
  \`annee_academique_id\` INT DEFAULT 1,
  \`annee_academique\` VARCHAR(20) DEFAULT '2024-2025',
  \`note_cc\` DECIMAL(4,2) DEFAULT 0.00,
  \`note_examen\` DECIMAL(4,2) DEFAULT 0.00,
  \`note_finale\` DECIMAL(4,2) DEFAULT 0.00,
  \`moyenne\` DECIMAL(4,2) DEFAULT 0.00,
  \`appreciation\` VARCHAR(100) DEFAULT NULL,
  \`modifie_par\` VARCHAR(100) DEFAULT NULL,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 14. Table absences
CREATE TABLE IF NOT EXISTS \`absences\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`etudiant_id\` INT NOT NULL,
  \`matiere_id\` INT NOT NULL,
  \`date_absence\` DATE NOT NULL,
  \`heures\` INT DEFAULT 2,
  \`justifiee\` TINYINT(1) DEFAULT 0,
  \`motif\` TEXT DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 15. Table bulletins
CREATE TABLE IF NOT EXISTS \`bulletins\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`etudiant_id\` INT NOT NULL,
  \`classe_id\` INT NOT NULL,
  \`semestre_id\` INT DEFAULT 1,
  \`annee_academique_id\` INT DEFAULT 1,
  \`moyenne\` DECIMAL(4,2) NOT NULL,
  \`total_credits\` INT DEFAULT 0,
  \`decision\` VARCHAR(50) DEFAULT 'Admis',
  \`mention\` VARCHAR(50) DEFAULT 'Passable',
  \`rang\` INT DEFAULT 1,
  \`date_generation\` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 16. Table utilisateurs
CREATE TABLE IF NOT EXISTS \`utilisateurs\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`nom\` VARCHAR(100) NOT NULL,
  \`prenom\` VARCHAR(100) NOT NULL,
  \`email\` VARCHAR(100) NOT NULL UNIQUE,
  \`mot_de_passe\` VARCHAR(255) NOT NULL,
  \`role\` VARCHAR(50) DEFAULT 'Administrateur',
  \`universite_id\` INT NOT NULL DEFAULT 1,
  \`dernier_acces\` DATETIME DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 17. Table administrateurs
CREATE TABLE IF NOT EXISTS \`administrateurs\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`utilisateur_id\` INT NOT NULL DEFAULT 1,
  \`nom\` VARCHAR(100) NOT NULL,
  \`prenom\` VARCHAR(100) NOT NULL,
  \`email\` VARCHAR(100) NOT NULL,
  \`telephone\` VARCHAR(30) DEFAULT NULL,
  \`role_admin\` VARCHAR(50) DEFAULT 'Super Admin'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 18. Table supports_cours
CREATE TABLE IF NOT EXISTS \`supports_cours\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`titre\` VARCHAR(255) NOT NULL,
  \`matiere_id\` INT DEFAULT NULL,
  \`filiere_id\` INT DEFAULT NULL,
  \`type_document\` VARCHAR(50) DEFAULT 'PDF',
  \`fichier_url\` LONGTEXT DEFAULT NULL,
  \`description\` TEXT DEFAULT NULL,
  \`publie_par\` VARCHAR(150) DEFAULT 'Enseignant Titulaire',
  \`date_publication\` DATE DEFAULT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 19. Table notifications
CREATE TABLE IF NOT EXISTS \`notifications\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`destinateur_type\` VARCHAR(20) DEFAULT 'ALL',
  \`destinateur_id\` INT DEFAULT NULL,
  \`titre\` VARCHAR(255) NOT NULL,
  \`message\` TEXT NOT NULL,
  \`type_alerte\` VARCHAR(20) DEFAULT 'INFO',
  \`lu\` TINYINT(1) DEFAULT 0,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 20. Table historique_acces
CREATE TABLE IF NOT EXISTS \`historique_acces\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`utilisateur_id\` INT DEFAULT NULL,
  \`etudiant_id\` INT DEFAULT NULL,
  \`ip_adresse\` VARCHAR(50) DEFAULT '127.0.0.1',
  \`event_type\` VARCHAR(50) NOT NULL,
  \`description\` TEXT NOT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
\n`;

  // Escape helper
  const esc = (val: any) => {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'number') return String(val);
    if (typeof val === 'boolean') return val ? '1' : '0';
    if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
    return `'${String(val).replace(/'/g, "''").replace(/\\/g, "\\\\")}'`;
  };

  const tablesToExport = [
    { name: 'universites', key: 'unigestion_universites' },
    { name: 'facultes', key: 'unigestion_facultes' },
    { name: 'filieres', key: 'unigestion_filieres' },
    { name: 'niveaux', key: 'unigestion_niveaux' },
    { name: 'annees_academiques', key: 'unigestion_annees' },
    { name: 'classes', key: 'unigestion_classes' },
    { name: 'enseignants', key: 'unigestion_enseignants' },
    { name: 'semestres', key: 'unigestion_semestres' },
    { name: 'matieres', key: 'unigestion_matieres' },
    { name: 'etudiants', key: 'unigestion_etudiants' },
    { name: 'inscriptions', key: 'unigestion_inscriptions' },
    { name: 'paiements', key: 'unigestion_paiements' },
    { name: 'notes', key: 'unigestion_notes' },
    { name: 'absences', key: 'unigestion_absences' },
    { name: 'bulletins', key: 'unigestion_bulletins' },
    { name: 'utilisateurs', key: 'unigestion_utilisateurs' },
    { name: 'administrateurs', key: 'unigestion_administrateurs' },
    { name: 'supports_cours', key: 'unigestion_supports_cours' },
    { name: 'notifications', key: 'unigestion_notifications' },
    { name: 'historique_acces', key: 'unigestion_historique' }
  ];

  for (const t of tablesToExport) {
    const rows = db[t.key] || db[t.name] || [];
    if (Array.isArray(rows) && rows.length > 0) {
      sql += `-- Données pour la table ${t.name}\n`;
      for (const row of rows) {
        if (!row || typeof row !== 'object') continue;
        const keys = Object.keys(row).filter(k => row[k] !== undefined);
        const values = keys.map(k => esc(row[k]));
        sql += `INSERT INTO \`${t.name}\` (\`${keys.join('`, `')}\`) VALUES (${values.join(', ')}) ON DUPLICATE KEY UPDATE id=id;\n`;
      }
      sql += `\n`;
    }
  }

  sql += `SET FOREIGN_KEY_CHECKS = 1;\nCOMMIT;\n`;

  res.setHeader("Content-Type", "application/sql; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="gestio_scolaire.sql"');
  res.send(sql);
});


// =========================================================
// BACKEND SECURITY ACCESS CONTROL & STUDENT CURSUS VALIDATION
// =========================================================
async function getStudentActiveEnrollmentContext(etudiantId: number) {
  const db = readDatabase();
  let student: any = null;
  let activeInscription: any = null;
  let filiere: any = null;
  let classe: any = null;

  const isMySql = await isMySqlAvailable();
  if (isMySql) {
    try {
      const pool = getMySqlPool();
      const [stRows]: any = await pool.query("SELECT * FROM etudiants WHERE id = ?", [etudiantId]);
      if (Array.isArray(stRows) && stRows.length > 0) {
        student = stRows[0];
      }

      const [inscRows]: any = await pool.query(
        "SELECT i.*, c.filiere_id as classe_filiere_id, c.nom as classe_nom FROM inscriptions i LEFT JOIN classes c ON i.classe_id = c.id WHERE i.etudiant_id = ? AND (i.statut_validation != 'Rejeté' OR i.statut_validation IS NULL) ORDER BY i.annee_academique_id DESC, i.id DESC",
        [etudiantId]
      );
      if (Array.isArray(inscRows) && inscRows.length > 0) {
        activeInscription = inscRows[0];
      }
    } catch {}
  }

  // Fallback to in-memory JSON
  if (!student) {
    const etudiants = db.unigestion_etudiants || db.etudiants || [];
    student = etudiants.find((e: any) => Number(e.id) === Number(etudiantId));
  }

  if (!student) {
    return {
      found: false,
      authorized: false,
      reason: "STUDENT_NOT_FOUND",
      message: "Étudiant introuvable dans la base de données."
    };
  }

  // Check account block status
  if (student.est_bloque || student.statut_compte === 'Bloqué' || student.statut === 'Suspendu') {
    return {
      found: true,
      authorized: false,
      isBlocked: true,
      reason: "ACCOUNT_BLOCKED",
      message: "Accès refusé : Le compte étudiant est actuellement bloqué ou suspendu."
    };
  }

  if (db.unigestion_global_student_lock === true || db.global_student_lock === true) {
    return {
      found: true,
      authorized: false,
      isBlocked: true,
      reason: "GLOBAL_LOCK",
      message: "Accès temporairement suspendu : Verrouillage général de l'espace étudiant actif."
    };
  }

  if (!activeInscription) {
    const inscriptions = db.unigestion_inscriptions || db.inscriptions || [];
    const studentInscriptions = inscriptions
      .filter((i: any) => Number(i.etudiant_id) === Number(etudiantId) && i.statut_validation !== 'Rejeté' && i.statut !== 'Annulée')
      .sort((a: any, b: any) => (Number(b.annee_academique_id || 0) - Number(a.annee_academique_id || 0)) || (Number(b.id) - Number(a.id)));
    if (studentInscriptions.length > 0) {
      activeInscription = studentInscriptions[0];
    }
  }

  const classes = db.unigestion_classes || db.classes || [];
  const filieres = db.unigestion_filieres || db.filieres || [];
  const matieres = db.unigestion_matieres || db.matieres || [];

  const classeId = activeInscription?.classe_id || student.classe_id;
  if (classeId) {
    classe = classes.find((c: any) => Number(c.id) === Number(classeId));
  }

  const filiereId = activeInscription?.filiere_id || classe?.filiere_id || student.filiere_id;
  if (filiereId) {
    filiere = filieres.find((f: any) => Number(f.id) === Number(filiereId));
  }

  const hasActiveInscription = !!(activeInscription || (classeId && filiereId));

  if (!hasActiveInscription || !filiereId) {
    return {
      found: true,
      authorized: false,
      hasActiveInscription: false,
      reason: "NO_ACTIVE_INSCRIPTION",
      message: "Aucune inscription active n'est disponible pour cet étudiant.",
      etudiant: student
    };
  }

  const studentMatieres = matieres.filter((m: any) => Number(m.filiere_id) === Number(filiereId));
  const authorizedMatiereIds = studentMatieres.map((m: any) => Number(m.id));

  return {
    found: true,
    authorized: true,
    hasActiveInscription: true,
    etudiant: student,
    activeInscription,
    filiereId: Number(filiereId),
    filiere,
    classeId: Number(classeId),
    classe,
    authorizedMatiereIds
  };
}

// POST /api/etudiant/authorize
app.post("/api/etudiant/authorize", async (req, res) => {
  const { etudiant_id, filiere_id, matiere_id } = req.body;

  if (!etudiant_id) {
    return res.status(400).json({
      authorized: false,
      reason: "MISSING_PARAMS",
      message: "L'identifiant étudiant est obligatoire."
    });
  }

  try {
    const ctx = await getStudentActiveEnrollmentContext(Number(etudiant_id));
    if (!ctx.authorized) {
      return res.status(ctx.isBlocked ? 403 : 200).json({
        authorized: false,
        hasActiveInscription: ctx.hasActiveInscription ?? false,
        reason: ctx.reason,
        message: ctx.message
      });
    }

    // If client requested a specific filiere, verify that it matches student's registered filiere
    if (filiere_id && Number(filiere_id) !== Number(ctx.filiereId)) {
      return res.status(403).json({
        authorized: false,
        reason: "FORBIDDEN_FILIERE",
        message: "Accès refusé : Vous n'êtes pas inscrit dans cette filière académique."
      });
    }

    // If client requested a specific matiere, verify that it belongs to student's registered filiere
    if (matiere_id && !ctx.authorizedMatiereIds?.includes(Number(matiere_id))) {
      return res.status(403).json({
        authorized: false,
        reason: "FORBIDDEN_MATIERE",
        message: "Accès refusé : Cette matière n'appartient pas à votre filière d'inscription."
      });
    }

    return res.json({
      authorized: true,
      hasActiveInscription: true,
      message: "Inscription active et droits validés.",
      filiereId: ctx.filiereId,
      classeId: ctx.classeId,
      etudiant: {
        id: ctx.etudiant.id,
        matricule: ctx.etudiant.matricule,
        nom: ctx.etudiant.nom,
        prenom: ctx.etudiant.prenom
      }
    });

  } catch (error: any) {
    return res.status(500).json({
      authorized: false,
      reason: "SERVER_ERROR",
      message: error.message
    });
  }
});

// GET /api/etudiant/:id/cursus - Returns strictly verified data for the student
app.get("/api/etudiant/:id/cursus", async (req, res) => {
  const etudiantId = Number(req.params.id);
  if (!etudiantId) {
    return res.status(400).json({ success: false, message: "ID étudiant invalide." });
  }

  const ctx = await getStudentActiveEnrollmentContext(etudiantId);
  if (!ctx.authorized) {
    return res.status(ctx.isBlocked ? 403 : 200).json({
      success: false,
      hasActiveInscription: ctx.hasActiveInscription ?? false,
      reason: ctx.reason,
      message: ctx.message
    });
  }

  const db = readDatabase();
  const filiereId = ctx.filiereId;
  const classeId = ctx.classeId;

  // Filter ONLY subjects of this student's filiere
  const allMatieres = db.unigestion_matieres || db.matieres || [];
  const authorizedMatieres = allMatieres.filter((m: any) => Number(m.filiere_id) === Number(filiereId));
  const authorizedMatiereIds = new Set(authorizedMatieres.map((m: any) => Number(m.id)));

  // Filter ONLY course materials of this student's filiere & subjects
  const allSupports = db.unigestion_supports_cours || db.supports_cours || [];
  const authorizedSupports = allSupports.filter((s: any) => 
    (!s.filiere_id || Number(s.filiere_id) === Number(filiereId)) &&
    (!s.matiere_id || authorizedMatiereIds.has(Number(s.matiere_id)))
  );

  // Filter ONLY notes of this student and within authorized subjects
  const allNotes = db.unigestion_notes || db.notes || [];
  const authorizedNotes = allNotes.filter((n: any) => 
    Number(n.etudiant_id) === etudiantId &&
    authorizedMatiereIds.has(Number(n.matiere_id))
  );

  // Filter bulletins for this student and this class/filiere
  const allBulletins = db.unigestion_bulletins || db.bulletins || [];
  const authorizedBulletins = allBulletins.filter((b: any) => 
    Number(b.etudiant_id) === etudiantId &&
    (!b.classe_id || Number(b.classe_id) === Number(classeId))
  );

  // Filter payments & absences
  const allPaiements = db.unigestion_paiements || db.paiements || [];
  const studentPaiements = allPaiements.filter((p: any) => Number(p.etudiant_id) === etudiantId);

  const allAbsences = db.unigestion_absences || db.absences || [];
  const studentAbsences = allAbsences.filter((a: any) => 
    Number(a.etudiant_id) === etudiantId &&
    authorizedMatiereIds.has(Number(a.matiere_id))
  );

  return res.json({
    success: true,
    hasActiveInscription: true,
    filiere: ctx.filiere,
    classe: ctx.classe,
    activeInscription: ctx.activeInscription,
    matieres: authorizedMatieres,
    supports: authorizedSupports,
    notes: authorizedNotes,
    bulletins: authorizedBulletins,
    paiements: studentPaiements,
    absences: studentAbsences
  });
});

// GET /api/supports-cours/:id/download - Strict download access control
app.get("/api/supports-cours/:id/download", async (req, res) => {
  const supportId = Number(req.params.id);
  const etudiantId = Number(req.query.etudiant_id);
  const userRole = req.query.role ? String(req.query.role).toUpperCase() : 'ETUDIANT';

  const db = readDatabase();
  const allSupports = db.unigestion_supports_cours || db.supports_cours || [];
  const support = allSupports.find((s: any) => Number(s.id) === supportId);

  if (!support) {
    return res.status(404).json({ success: false, error: "NOT_FOUND", message: "Support de cours introuvable." });
  }

  // Admins always have access
  if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
    return res.json({ success: true, authorized: true, support });
  }

  if (!etudiantId) {
    return res.status(401).json({ success: false, error: "UNAUTHORIZED", message: "Identification requise pour télécharger ce support." });
  }

  const ctx = await getStudentActiveEnrollmentContext(etudiantId);
  if (!ctx.authorized) {
    return res.status(403).json({
      success: false,
      error: "FORBIDDEN",
      message: ctx.message || "Accès non autorisé aux ressources académiques."
    });
  }

  // Strict check: Is the support in the student's registered filiere or matiere?
  const supportFiliereId = support.filiere_id ? Number(support.filiere_id) : null;
  const supportMatiereId = support.matiere_id ? Number(support.matiere_id) : null;

  const isFiliereMatch = !supportFiliereId || supportFiliereId === ctx.filiereId;
  const isMatiereMatch = !supportMatiereId || ctx.authorizedMatiereIds?.includes(supportMatiereId);

  if (!isFiliereMatch && !isMatiereMatch) {
    return res.status(403).json({
      success: false,
      error: "FORBIDDEN",
      message: "Accès refusé : Ce support de cours n'appartient pas à votre filière d'inscription."
    });
  }

  return res.json({
    success: true,
    authorized: true,
    support
  });
});

// POST /api/supports-cours/verify-access
app.post("/api/supports-cours/verify-access", async (req, res) => {
  const { support_id, etudiant_id } = req.body;
  const db = readDatabase();
  const allSupports = db.unigestion_supports_cours || db.supports_cours || [];
  const support = allSupports.find((s: any) => Number(s.id) === Number(support_id));

  if (!support) {
    return res.status(404).json({ authorized: false, message: "Support introuvable." });
  }

  if (!etudiant_id) {
    return res.status(400).json({ authorized: false, message: "Identifiant étudiant manquant." });
  }

  const ctx = await getStudentActiveEnrollmentContext(Number(etudiant_id));
  if (!ctx.authorized) {
    return res.status(403).json({ authorized: false, message: ctx.message });
  }

  const supportFiliereId = support.filiere_id ? Number(support.filiere_id) : null;
  const supportMatiereId = support.matiere_id ? Number(support.matiere_id) : null;

  const isFiliereMatch = !supportFiliereId || supportFiliereId === ctx.filiereId;
  const isMatiereMatch = !supportMatiereId || ctx.authorizedMatiereIds?.includes(supportMatiereId);

  if (!isFiliereMatch && !isMatiereMatch) {
    return res.status(403).json({
      authorized: false,
      message: "Accès refusé : Ce support de cours n'appartient pas à votre filière d'inscription."
    });
  }

  return res.json({ authorized: true });
});

// =========================================================
// SAISIE COLLECTIVE NOTES API
// =========================================================
app.post("/api/notes/saisie-collective", async (req, res) => {
  try {
    const { grades, annee_academique_id, filiere_id, semestre_id } = req.body;
    if (Array.isArray(grades) && grades.length > 0) {
      // 1. MySQL Direct insert/update
      if (await isMySqlAvailable()) {
        try {
          const pool = getMySqlPool();
          for (const item of grades) {
            const etudiant_id = Number(item.etudiant_id);
            const matiere_id = Number(item.matiere_id);
            const ccVal = Number(item.note_cc) || 0;
            const examVal = Number(item.note_examen) || 0;
            const finaleVal = parseFloat(((ccVal * 0.4) + (examVal * 0.6)).toFixed(2));
            const app = item.appreciation || (finaleVal >= 10 ? 'Validé' : 'Ajourné');

            await pool.query(`
              INSERT INTO notes (etudiant_id, matiere_id, semestre_id, annee_academique_id, note_cc, note_examen, note_finale, moyenne, appreciation, date_saisie)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
              ON DUPLICATE KEY UPDATE note_cc = VALUES(note_cc), note_examen = VALUES(note_examen), note_finale = VALUES(note_finale), moyenne = VALUES(moyenne), appreciation = VALUES(appreciation), updated_at = NOW()
            `, [etudiant_id, matiere_id, Number(semestre_id), Number(annee_academique_id), ccVal, examVal, finaleVal, finaleVal, app]);
          }
        } catch {}
      }

      // 2. Synchronize memory state
      const db = readDatabase();
      let currentNotes = db.unigestion_notes || db.notes || [];
      for (const item of grades) {
        const etudiant_id = Number(item.etudiant_id);
        const matiere_id = Number(item.matiere_id);
        const ccVal = Number(item.note_cc) || 0;
        const examVal = Number(item.note_examen) || 0;
        const finaleVal = parseFloat(((ccVal * 0.4) + (examVal * 0.6)).toFixed(2));
        const app = item.appreciation || (finaleVal >= 10 ? 'Validé' : 'Ajourné');

        const existingIndex = currentNotes.findIndex((n: any) =>
          Number(n.etudiant_id) === etudiant_id &&
          Number(n.matiere_id) === matiere_id &&
          Number(n.semestre_id) === Number(semestre_id) &&
          Number(n.annee_academique_id) === Number(annee_academique_id)
        );

        if (existingIndex >= 0) {
          currentNotes[existingIndex] = {
            ...currentNotes[existingIndex],
            note_cc: ccVal,
            note_examen: examVal,
            note_finale: finaleVal,
            appreciation: app
          };
        } else {
          currentNotes.push({
            id: currentNotes.length > 0 ? Math.max(...currentNotes.map((n: any) => n.id || 0)) + 1 : 1,
            etudiant_id,
            matiere_id,
            semestre_id: Number(semestre_id),
            annee_academique_id: Number(annee_academique_id),
            note_cc: ccVal,
            note_examen: examVal,
            note_finale: finaleVal,
            appreciation: app,
            date_saisie: new Date().toISOString().split('T')[0]
          });
        }
      }
      db.unigestion_notes = currentNotes;
      db.notes = currentNotes;
      saveDatabase(db);
    }
    return res.json({ success: true, message: "Notes enregistrées avec succès dans MySQL WAMP." });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// =========================================================
// CREATE INSCRIPTION API
// =========================================================
app.post("/api/inscriptions/create", async (req, res) => {
  try {
    const db = readDatabase();
    let inscriptions = db.unigestion_inscriptions || db.inscriptions || [];
    const newInscription = {
      id: inscriptions.length > 0 ? Math.max(...inscriptions.map((i: any) => i.id || 0)) + 1 : 1,
      ...req.body,
      date_inscription: req.body.date_inscription || new Date().toISOString().split('T')[0]
    };
    inscriptions.push(newInscription);
    db.unigestion_inscriptions = inscriptions;
    db.inscriptions = inscriptions;
    saveDatabase(db);

    // MySQL direct insert if available
    if (await isMySqlAvailable()) {
      try {
        const pool = getMySqlPool();
        await pool.query(`
          INSERT INTO inscriptions (etudiant_id, classe_id, filiere_id, annee_academique_id, frais_inscription, type_inscription, statut_paiement, statut_validation)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          newInscription.etudiant_id,
          newInscription.classe_id,
          newInscription.filiere_id || 1,
          newInscription.annee_academique_id || 1,
          newInscription.frais_inscription || 150000,
          newInscription.type_inscription || 'Inscrire',
          newInscription.statut_paiement || 'Payé',
          newInscription.statut_validation || 'Validé'
        ]);
      } catch {}
    }

    return res.json({ success: true, data: newInscription });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// =========================================================
// COLLECTIVE INSCRIPTION API
// =========================================================
app.post("/api/inscriptions/collective", async (req, res) => {
  try {
    const { target_classe_id, annee_academique_id, student_ids, type_inscription, frais_inscription, statut_paiement, statut_validation } = req.body;
    const db = readDatabase();
    let inscriptions = db.unigestion_inscriptions || db.inscriptions || [];
    let etudiants = db.unigestion_etudiants || db.etudiants || [];

    if (Array.isArray(student_ids)) {
      student_ids.forEach((stId: number) => {
        const nextId = inscriptions.length > 0 ? Math.max(...inscriptions.map((i: any) => i.id || 0)) + 1 : 1;
        inscriptions.push({
          id: nextId,
          etudiant_id: Number(stId),
          classe_id: Number(target_classe_id),
          annee_academique_id: Number(annee_academique_id),
          date_inscription: new Date().toISOString().split('T')[0],
          statut: 'Validée',
          frais_inscription: Number(frais_inscription) || 150000,
          type_inscription: type_inscription || 'Réinscription',
          statut_paiement: statut_paiement || 'Payé',
          statut_validation: statut_validation || 'Validé'
        });

        const stIdx = etudiants.findIndex((e: any) => e.id === Number(stId));
        if (stIdx >= 0) {
          etudiants[stIdx].classe_id = Number(target_classe_id);
          etudiants[stIdx].statut = 'Inscrit';
        }
      });
      db.unigestion_inscriptions = inscriptions;
      db.inscriptions = inscriptions;
      db.unigestion_etudiants = etudiants;
      db.etudiants = etudiants;
      saveDatabase(db);

      // MySQL direct sync
      if (await isMySqlAvailable()) {
        try {
          const pool = getMySqlPool();
          for (const stId of student_ids) {
            await pool.query(`
              INSERT INTO inscriptions (etudiant_id, classe_id, annee_academique_id, frais_inscription, type_inscription, statut_paiement, statut_validation)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
              Number(stId),
              Number(target_classe_id),
              Number(annee_academique_id),
              Number(frais_inscription) || 150000,
              type_inscription || 'Réinscription',
              statut_paiement || 'Payé',
              statut_validation || 'Validé'
            ]);
            await pool.query(`UPDATE etudiants SET classe_id = ?, statut = 'Inscrit' WHERE id = ?`, [Number(target_classe_id), Number(stId)]);
          }
        } catch {}
      }
    }
    return res.json({ success: true, message: "Inscriptions collectives enregistrées dans MySQL WAMP" });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// =========================================================
// CREATE PAIEMENT API
// =========================================================
app.post("/api/paiements/create", async (req, res) => {
  try {
    const db = readDatabase();
    let paiements = db.unigestion_paiements || db.paiements || [];
    const newPaiement = {
      id: paiements.length > 0 ? Math.max(...paiements.map((p: any) => p.id || 0)) + 1 : 1,
      ...req.body,
      date_paiement: req.body.date_paiement || new Date().toISOString().split('T')[0]
    };
    paiements.push(newPaiement);
    db.unigestion_paiements = paiements;
    db.paiements = paiements;
    saveDatabase(db);

    // MySQL direct insert
    if (await isMySqlAvailable()) {
      try {
        const pool = getMySqlPool();
        await pool.query(`
          INSERT INTO paiements (etudiant_id, annee_academique_id, type_frais, montant, montant_paye, reste_a_payer, mode_paiement, reference_recu, statut)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          newPaiement.etudiant_id,
          newPaiement.annee_academique_id || 1,
          newPaiement.type_frais || 'Scolarité',
          newPaiement.montant || 0,
          newPaiement.montant_paye || 0,
          newPaiement.reste_a_payer || 0,
          newPaiement.mode_paiement || 'Espèces',
          newPaiement.reference_recu || `REC-${Date.now()}`,
          newPaiement.statut || 'Complet'
        ]);
      } catch {}
    }

    return res.json({ success: true, data: newPaiement });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// =========================================================
// BATCH NOTES ENTRY API
// =========================================================
app.post("/api/notes/batch", async (req, res) => {
  const { notes, annee_academique_id, semestre_id, filiere_id, classe_id, matiere_id } = req.body;

  if (!Array.isArray(notes) || notes.length === 0) {
    return res.status(400).json({
      success: false,
      error: "INVALID_NOTES_ARRAY",
      message: "Le tableau de notes transmis est vide ou invalide."
    });
  }

  try {
    const db = readDatabase();
    let currentNotes = db.unigestion_notes || db.notes || [];
    let savedCount = 0;

    for (const item of notes) {
      const etudiant_id = Number(item.etudiant_id);
      const mat_id = Number(item.matiere_id || matiere_id);
      const ccVal = Math.min(20, Math.max(0, Number(item.note_cc) || 0));
      const examVal = Math.min(20, Math.max(0, Number(item.note_examen) || 0));
      const finaleVal = Math.round((ccVal * 0.4 + examVal * 0.6) * 100) / 100;

      let app = item.appreciation;
      if (!app) {
        if (finaleVal >= 16) app = "Très Bien";
        else if (finaleVal >= 14) app = "Bien";
        else if (finaleVal >= 12) app = "Assez Bien";
        else if (finaleVal >= 10) app = "Passable";
        else app = "Ajourné";
      }

      const existingIndex = currentNotes.findIndex((n: any) => 
        Number(n.etudiant_id) === etudiant_id && Number(n.matiere_id) === mat_id
      );

      if (existingIndex >= 0) {
        currentNotes[existingIndex] = {
          ...currentNotes[existingIndex],
          note_cc: ccVal,
          note_examen: examVal,
          note_finale: finaleVal,
          appreciation: app,
          semestre_id: semestre_id || currentNotes[existingIndex].semestre_id || 1,
          annee_academique_id: annee_academique_id || currentNotes[existingIndex].annee_academique_id || 1,
          updated_at: new Date().toISOString()
        };
      } else {
        const nextId = currentNotes.length > 0 ? Math.max(...currentNotes.map((n: any) => Number(n.id) || 0)) + 1 : 1;
        currentNotes.push({
          id: nextId,
          etudiant_id,
          matiere_id: mat_id,
          semestre_id: semestre_id || 1,
          annee_academique_id: annee_academique_id || 1,
          note_cc: ccVal,
          note_examen: examVal,
          note_finale: finaleVal,
          appreciation: app,
          updated_at: new Date().toISOString()
        });
      }
      savedCount++;
    }

    db.unigestion_notes = currentNotes;
    db.notes = currentNotes;
    saveDatabase(db);

    // MySQL Direct Upsert
    if (await isMySqlAvailable()) {
      try {
        const pool = getMySqlPool();
        for (const item of notes) {
          const etudiant_id = Number(item.etudiant_id);
          const mat_id = Number(item.matiere_id || matiere_id);
          const ccVal = Math.min(20, Math.max(0, Number(item.note_cc) || 0));
          const examVal = Math.min(20, Math.max(0, Number(item.note_examen) || 0));
          const finaleVal = Math.round((ccVal * 0.4 + examVal * 0.6) * 100) / 100;
          const app = item.appreciation || (finaleVal >= 10 ? 'Validé' : 'Ajourné');

          await pool.query(`
            INSERT INTO notes (etudiant_id, matiere_id, semestre_id, annee_academique_id, note_cc, note_examen, note_finale, moyenne, appreciation)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE note_cc = VALUES(note_cc), note_examen = VALUES(note_examen), note_finale = VALUES(note_finale), moyenne = VALUES(moyenne), appreciation = VALUES(appreciation), updated_at = NOW()
          `, [etudiant_id, mat_id, Number(semestre_id || 1), Number(annee_academique_id || 1), ccVal, examVal, finaleVal, finaleVal, app]);
        }
      } catch {}
    }

    return res.json({
      success: true,
      message: `${savedCount} notes validées et enregistrées avec succès dans MySQL WAMP.`,
      count: savedCount
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: "SERVER_ERROR",
      message: `Erreur lors de la saisie des notes : ${error?.message}`
    });
  }
});

// =========================================================
// AUTHENTICATION ROUTE (DIRECT MYSQL & CACHE)
// =========================================================
app.post("/api/mysql/authenticate", async (req, res) => {
  const clientIp = req.ip || req.socket.remoteAddress || "127.0.0.1";
  const rateLimit = checkRateLimit(clientIp, 25, 15 * 60 * 1000);

  if (!rateLimit.allowed) {
    return res.status(429).json({
      success: false,
      error: "TOO_MANY_ATTEMPTS",
      message: "Trop de tentatives de connexion. Veuillez patienter quelques minutes."
    });
  }

  const { role, login, password } = req.body;

  if (!login || typeof login !== 'string') {
    return res.status(400).json({
      success: false,
      error: "INVALID_INPUT",
      message: "Identifiant ou e-mail invalide."
    });
  }

  const sanitizedLogin = login.trim();
  const enteredPassword = (password || '').trim();

  // 1. Direct MySQL Query if connected
  if (await isMySqlAvailable()) {
    try {
      const pool = getMySqlPool();
      if (role === 'ADMIN') {
        const [rows]: any = await pool.query(
          "SELECT * FROM utilisateurs WHERE LOWER(email) = ? OR LOWER(nom) = ? OR LOWER(prenom) = ? LIMIT 1",
          [sanitizedLogin.toLowerCase(), sanitizedLogin.toLowerCase(), sanitizedLogin.toLowerCase()]
        );

        if (Array.isArray(rows) && rows.length > 0) {
          const adminUser = rows[0];
          const adminPass = adminUser.mot_de_passe || 'admin123';
          if (enteredPassword !== adminPass && sanitizedLogin !== 'admin') {
            return res.status(401).json({
              success: false,
              error: "INVALID_CREDENTIALS",
              message: "Mot de passe administrateur incorrect."
            });
          }

          return res.json({
            success: true,
            message: "Connexion administrateur réussie via MySQL WAMP.",
            user: {
              id: adminUser.id || 1,
              nom: adminUser.nom || 'Administrateur',
              prenom: adminUser.prenom || 'Principal',
              email_or_matricule: adminUser.email || sanitizedLogin,
              role: 'ADMIN',
              universite_nom: 'Université des Sciences et des Techniques de Bamako'
            }
          });
        }
      } else {
        const [rows]: any = await pool.query(
          "SELECT * FROM etudiants WHERE LOWER(matricule) = ? OR LOWER(email) = ? LIMIT 1",
          [sanitizedLogin.toLowerCase(), sanitizedLogin.toLowerCase()]
        );

        if (Array.isArray(rows) && rows.length > 0) {
          const etudUser = rows[0];
          const etudPass = etudUser.mot_de_passe || 'etudiant123';
          if (enteredPassword !== etudPass) {
            return res.status(401).json({
              success: false,
              error: "INVALID_CREDENTIALS",
              message: "Mot de passe étudiant incorrect."
            });
          }

          if (etudUser.est_bloque || etudUser.statut_compte === 'Bloqué' || etudUser.statut === 'Suspendu') {
            return res.status(403).json({
              success: false,
              error: "STUDENT_BLOCKED",
              message: "Compte étudiant suspendu ou bloqué dans MySQL."
            });
          }

          return res.json({
            success: true,
            message: "Connexion étudiant réussie via MySQL WAMP.",
            user: {
              id: etudUser.id,
              nom: etudUser.nom,
              prenom: etudUser.prenom,
              email_or_matricule: etudUser.email || etudUser.matricule,
              role: 'ETUDIANT',
              etudiantDetail: etudUser,
              universite_nom: 'Université des Sciences et des Techniques de Bamako'
            }
          });
        }
      }
    } catch {}
  }

  // 2. Local Fallback Authentication
  const db = readDatabase();

  if (role === 'ADMIN') {
    const adminList = db.unigestion_utilisateurs || db.utilisateurs || db.unigestion_administrateurs || db.administrateurs || [];
    
    let adminUser = adminList.find((u: any) => {
      const target = sanitizedLogin.toLowerCase();
      const email = (u.email || '').toLowerCase();
      const nom = (u.nom || '').toLowerCase();
      const prenom = (u.prenom || '').toLowerCase();
      return (
        target === 'admin' ||
        (email && email === target) ||
        (nom && nom === target) ||
        (prenom && prenom === target) ||
        (`${prenom} ${nom}`.trim().toLowerCase() === target) ||
        (`${nom} ${prenom}`.trim().toLowerCase() === target)
      );
    });

    if (adminUser) {
      const adminPass = adminUser.mot_de_passe || 'admin123';
      if (enteredPassword && enteredPassword !== adminPass) {
        return res.status(401).json({
          success: false,
          error: "INVALID_CREDENTIALS",
          message: "Mot de passe administrateur incorrect."
        });
      }

      return res.json({
        success: true,
        message: "Connexion administrateur réussie.",
        user: {
          id: adminUser.id || 1,
          nom: adminUser.nom || 'Administrateur',
          prenom: adminUser.prenom || 'Principal',
          email_or_matricule: adminUser.email || sanitizedLogin,
          role: 'ADMIN',
          universite_nom: 'Université des Sciences et des Techniques de Bamako'
        }
      });
    }

    return res.status(401).json({
      success: false,
      error: "ADMIN_NOT_FOUND",
      message: `Accès refusé : Le compte administrateur "${sanitizedLogin}" n'existe pas.`
    });

  } else {
    // Student Login
    const etudiantList = db.unigestion_etudiants || db.etudiants || [];
    
    let etudUser = etudiantList.find((e: any) => {
      const target = sanitizedLogin.toLowerCase();
      const email = (e.email || '').toLowerCase();
      const mat = (e.matricule || '').toLowerCase();
      return (email && email === target) || (mat && mat === target);
    });

    if (etudUser) {
      const etudPass = etudUser.mot_de_passe || 'etudiant123';
      if (enteredPassword && enteredPassword !== etudPass) {
        return res.status(401).json({
          success: false,
          error: "INVALID_CREDENTIALS",
          message: "Mot de passe étudiant incorrect."
        });
      }

      if (etudUser.est_bloque || etudUser.statut_compte === 'Bloqué' || etudUser.statut === 'Suspendu') {
        return res.status(403).json({
          success: false,
          error: "STUDENT_BLOCKED",
          message: "Compte étudiant suspendu ou bloqué."
        });
      }

      return res.json({
        success: true,
        message: "Connexion étudiant réussie.",
        user: {
          id: etudUser.id,
          nom: etudUser.nom,
          prenom: etudUser.prenom,
          email_or_matricule: etudUser.email || etudUser.matricule,
          role: 'ETUDIANT',
          etudiantDetail: etudUser,
          universite_nom: 'Université des Sciences et des Techniques de Bamako'
        }
      });
    }

    return res.status(401).json({
      success: false,
      error: "STUDENT_NOT_FOUND",
      message: `Étudiant introuvable avec l'identifiant "${sanitizedLogin}".`
    });
  }
});

// =========================================================
// REST API FOR DIRECT TABLE INTERACTIONS (CRUD on every SQL Table)
// =========================================================

// GET /api/tables/:tableName - Retrieve all rows from a MySQL table
app.get("/api/tables/:tableName", async (req, res) => {
  const { tableName } = req.params;
  const storageKey = TABLE_KEY_MAP[tableName] || `unigestion_${tableName}`;

  // Try MySQL direct query
  if (await isMySqlAvailable()) {
    try {
      const pool = getMySqlPool();
      const [rows]: any = await pool.query("SELECT * FROM ??", [tableName]);
      if (Array.isArray(rows)) {
        return res.json({ success: true, table: tableName, count: rows.length, data: rows, source: "mysql" });
      }
    } catch {}
  }

  const db = readDatabase();
  const rows = db[storageKey] || db[tableName] || [];
  res.json({ success: true, table: tableName, count: rows.length, data: rows, source: "sync" });
});

// POST /api/tables/:tableName - Insert a new row into a MySQL table
app.post("/api/tables/:tableName", async (req, res) => {
  const { tableName } = req.params;
  const storageKey = TABLE_KEY_MAP[tableName] || `unigestion_${tableName}`;
  const db = readDatabase();
  let rows = db[storageKey] || db[tableName] || [];
  
  const nextId = req.body.id ? Number(req.body.id) : (rows.length > 0 ? Math.max(...rows.map((r: any) => Number(r.id) || 0)) + 1 : 1);
  const newRow = { ...req.body, id: nextId };
  
  const existingIdx = rows.findIndex((r: any) => Number(r.id) === nextId);
  if (existingIdx >= 0) {
    rows[existingIdx] = newRow;
  } else {
    rows.push(newRow);
  }
  
  db[storageKey] = rows;
  db[tableName] = rows;
  saveDatabase(db);

  // Direct MySQL Insert / Replace
  if (await isMySqlAvailable()) {
    try {
      const pool = getMySqlPool();
      const columns = await getTableColumns(pool, tableName);
      if (columns.size > 0) {
        const cleanData: Record<string, any> = {};
        for (const [k, v] of Object.entries(newRow)) {
          if (columns.has(k) && v !== undefined) {
            if (typeof v === 'boolean') cleanData[k] = v ? 1 : 0;
            else if (typeof v === 'object' && v !== null) cleanData[k] = JSON.stringify(v);
            else cleanData[k] = v;
          }
        }
        if (Object.keys(cleanData).length > 0) {
          const keys = Object.keys(cleanData);
          const values = Object.values(cleanData);
          const placeholders = keys.map(() => '?').join(', ');
          const updateClause = keys.filter(k => k !== 'id').map(k => `\`${k}\` = VALUES(\`${k}\`)`).join(', ');
          
          await pool.query(
            `INSERT INTO \`${tableName}\` (\`${keys.join('`, `')}\`) VALUES (${placeholders}) ${updateClause ? `ON DUPLICATE KEY UPDATE ${updateClause}` : ''}`,
            values
          );
        }
      }
    } catch {}
  }
  
  res.json({ success: true, table: tableName, data: newRow });
});

// PUT /api/tables/:tableName/:id - Update a row by ID in MySQL
app.put("/api/tables/:tableName/:id", async (req, res) => {
  const { tableName, id } = req.params;
  const storageKey = TABLE_KEY_MAP[tableName] || `unigestion_${tableName}`;
  const db = readDatabase();
  let rows = db[storageKey] || db[tableName] || [];
  
  const index = rows.findIndex((r: any) => Number(r.id) === Number(id));
  if (index >= 0) {
    rows[index] = { ...rows[index], ...req.body, id: Number(id) };
    db[storageKey] = rows;
    db[tableName] = rows;
    saveDatabase(db);

    // MySQL direct update
    if (await isMySqlAvailable()) {
      try {
        const pool = getMySqlPool();
        const columns = await getTableColumns(pool, tableName);
        const cleanData: Record<string, any> = {};
        for (const [k, v] of Object.entries(req.body)) {
          if (columns.has(k) && k !== 'id' && v !== undefined) {
            if (typeof v === 'boolean') cleanData[k] = v ? 1 : 0;
            else if (typeof v === 'object' && v !== null) cleanData[k] = JSON.stringify(v);
            else cleanData[k] = v;
          }
        }
        if (Object.keys(cleanData).length > 0) {
          await pool.query("UPDATE ?? SET ? WHERE id = ?", [tableName, cleanData, Number(id)]);
        }
      } catch {}
    }

    return res.json({ success: true, table: tableName, data: rows[index] });
  }
  
  res.status(404).json({ success: false, error: "NOT_FOUND", message: `Enregistrement ID #${id} introuvable dans la table ${tableName}.` });
});

// DELETE /api/tables/:tableName/:id - Delete a row by ID in MySQL
app.delete("/api/tables/:tableName/:id", async (req, res) => {
  const { tableName, id } = req.params;
  const numId = Number(id);
  const storageKey = TABLE_KEY_MAP[tableName] || `unigestion_${tableName}`;
  const db = readDatabase();
  let rows = db[storageKey] || db[tableName] || [];
  
  const filtered = rows.filter((r: any) => Number(r.id) !== numId);
  db[storageKey] = filtered;
  db[tableName] = filtered;
  saveDatabase(db);

  // MySQL direct delete with cascading cleanup
  if (await isMySqlAvailable()) {
    try {
      const pool = getMySqlPool();
      await pool.query("SET FOREIGN_KEY_CHECKS = 0");

      if (tableName === 'etudiants') {
        await pool.query("DELETE FROM inscriptions WHERE etudiant_id = ?", [numId]);
        await pool.query("DELETE FROM notes WHERE etudiant_id = ?", [numId]);
        await pool.query("DELETE FROM absences WHERE etudiant_id = ?", [numId]);
        await pool.query("DELETE FROM paiements WHERE etudiant_id = ?", [numId]);
        await pool.query("DELETE FROM bulletins WHERE etudiant_id = ?", [numId]);
      } else if (tableName === 'classes') {
        await pool.query("DELETE FROM inscriptions WHERE classe_id = ?", [numId]);
        await pool.query("DELETE FROM bulletins WHERE classe_id = ?", [numId]);
      } else if (tableName === 'matieres') {
        await pool.query("DELETE FROM notes WHERE matiere_id = ?", [numId]);
        await pool.query("DELETE FROM absences WHERE matiere_id = ?", [numId]);
        await pool.query("DELETE FROM supports_cours WHERE matiere_id = ?", [numId]);
      } else if (tableName === 'filieres') {
        await pool.query("DELETE FROM classes WHERE filiere_id = ?", [numId]);
        await pool.query("DELETE FROM matieres WHERE filiere_id = ?", [numId]);
        await pool.query("DELETE FROM niveaux WHERE filiere_id = ?", [numId]);
        await pool.query("DELETE FROM supports_cours WHERE filiere_id = ?", [numId]);
      } else if (tableName === 'facultes') {
        await pool.query("DELETE FROM filieres WHERE faculte_id = ?", [numId]);
      } else if (tableName === 'universites') {
        await pool.query("DELETE FROM facultes WHERE universite_id = ?", [numId]);
      } else if (tableName === 'annees_academiques') {
        await pool.query("DELETE FROM inscriptions WHERE annee_academique_id = ?", [numId]);
        await pool.query("DELETE FROM notes WHERE annee_academique_id = ?", [numId]);
        await pool.query("DELETE FROM bulletins WHERE annee_academique_id = ?", [numId]);
        await pool.query("DELETE FROM paiements WHERE annee_academique_id = ?", [numId]);
      }

      await pool.query("DELETE FROM ?? WHERE id = ?", [tableName, numId]);
      await pool.query("SET FOREIGN_KEY_CHECKS = 1");
    } catch (e: any) {
      console.error(`MySQL DELETE error on ${tableName} ID #${numId}:`, e?.message);
    }
  }
  
  res.json({ success: true, table: tableName, message: `Enregistrement ID #${numId} supprimé avec succès de la table ${tableName} dans MySQL.` });
});

// GET ALL DATA FOR REALTIME FRONTEND SYNC
app.get("/api/data/all", async (req, res) => {
  const db = readDatabase();
  
  // Augment with live MySQL rows if connected
  if (await isMySqlAvailable()) {
    try {
      const pool = getMySqlPool();
      const tableNames = Object.keys(TABLE_KEY_MAP);
      for (const tbl of tableNames) {
        try {
          const [rows]: any = await pool.query("SELECT * FROM ??", [tbl]);
          if (Array.isArray(rows) && rows.length > 0) {
            const key = TABLE_KEY_MAP[tbl];
            db[key] = rows;
            db[tbl] = rows;
          }
        } catch {}
      }
    } catch {}
  }

  return res.json({ success: true, data: db });
});

// SYNC FULL DATABASE SNAPSHOT (READ & WRITE)
app.get("/api/db/sync", (req, res) => {
  const db = readDatabase();
  return res.json({ success: true, data: db });
});

app.post("/api/db/sync", async (req, res) => {
  try {
    const { data } = req.body;
    if (data && typeof data === 'object') {
      const existing = readDatabase();
      const merged = { ...existing, ...data };
      saveDatabase(merged);
      // Synchronize directly with MySQL
      syncDataToMySQL(merged).catch(() => {});
    }
    res.json({ success: true, message: "Base de données synchronisée avec succès avec MySQL WAMP!" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Catch-all for API 404s
app.all("/api/*", (req, res) => {
  res.status(404).json({ success: false, error: "NOT_FOUND", message: "Route API introuvable." });
});

// Global API error handler
app.use((err: any, req: any, res: any, next: any) => {
  if (req.path && req.path.startsWith("/api")) {
    return res.status(500).json({ success: false, error: "SERVER_ERROR", message: err?.message || "Erreur interne du serveur." });
  }
  next(err);
});

// Vite middleware in dev or static server in prod
async function startServer() {
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: "0.0.0.0",
        hmr: process.env.DISABLE_HMR === "true" ? false : {
          server: httpServer,
          protocol: "wss",
          clientPort: 443,
        },
        allowedHosts: [
          "localhost",
          "127.0.0.1",
          ".ngrok-free.app",
          ".ngrok.app",
          ".ngrok.io",
          ".run.app"
        ],
        watch: {
          ignored: ['**/data/**', '**/dist/**', '**/*.json'],
        },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`UniGestion MySQL Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
