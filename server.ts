import express from "express";
import path from "path";
import fs from "fs";
import mysql from "mysql2/promise";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

// Local JSON storage fallback path for reliable offline/standalone runtime
const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "db_storage.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// MySQL Pool Configuration from environment
function getMysqlConfig() {
  return {
    host: process.env.MYSQL_HOST || "localhost",
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "unigestion_db",
    connectTimeout: 5000,
  };
}

let mysqlPool: mysql.Pool | null = null;

function getMysqlPool() {
  if (!mysqlPool && process.env.MYSQL_HOST) {
    try {
      mysqlPool = mysql.createPool(getMysqlConfig());
    } catch (err) {
      console.warn("Could not create MySQL pool:", err);
    }
  }
  return mysqlPool;
}

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Download PHP connection test script
app.get("/test_db.php", (req, res) => {
  const phpPath = path.join(process.cwd(), "test_db.php");
  if (fs.existsSync(phpPath)) {
    res.setHeader("Content-Type", "application/x-httpd-php");
    res.setHeader("Content-Disposition", "inline; filename=test_db.php");
    res.sendFile(phpPath);
  } else {
    res.status(404).send("Fichier test_db.php non trouvé.");
  }
});

// Test MySQL connection status
app.get("/api/mysql/status", async (req, res) => {
  const config = getMysqlConfig();
  try {
    const connection = await mysql.createConnection(config);
    await connection.ping();
    await connection.end();
    res.json({
      connected: true,
      message: "Connexion MySQL réussie!",
      config: {
        host: config.host,
        port: config.port,
        user: config.user,
        database: config.database,
      },
    });
  } catch (error: any) {
    res.json({
      connected: false,
      message: `Connexion MySQL échouée: ${error?.message || "Hôte inaccessible"}`,
      config: {
        host: config.host,
        port: config.port,
        user: config.user,
        database: config.database,
      },
      hint: "Définissez MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD et MYSQL_DATABASE dans votre environnement pour basculer vers votre serveur MySQL local ou distant."
    });
  }
});

// Test custom MySQL parameters provided in body
app.post("/api/mysql/test-config", async (req, res) => {
  const { host, port, user, password, database } = req.body;
  try {
    const conn = await mysql.createConnection({
      host: host || "localhost",
      port: Number(port) || 3306,
      user: user || "root",
      password: password || "",
      database: database || "unigestion_db",
      connectTimeout: 4000
    });
    await conn.ping();
    await conn.end();
    res.json({ success: true, message: "Connexion à la base MySQL établie avec succès!" });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message || "Échec de connexion MySQL" });
  }
});

// SQL Schema Export Endpoint (Download SQL Script for phpMyAdmin / MySQL Workbench)
app.get("/api/mysql/schema.sql", (req, res) => {
  const sqlDump = `-- ============================================================
-- BASE DE DONNÉES MYSQL UNIGESTION MALI (STRUCTURE COMPLÈTE)
-- UNIVERSITÉ DES SCIENCES, DES TECHNIQUES ET DES TECHNOLOGIES DE BAMAKO
-- ============================================================

CREATE DATABASE IF NOT EXISTS \`unigestion_db\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE \`unigestion_db\`;

-- Table 1: Universités & Facultés
CREATE TABLE IF NOT EXISTS \`facultes\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`code\` VARCHAR(20) NOT NULL UNIQUE,
  \`nom\` VARCHAR(255) NOT NULL,
  \`description\` TEXT,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table 2: Filières d'études
CREATE TABLE IF NOT EXISTS \`filieres\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`faculte_id\` INT NOT NULL,
  \`code\` VARCHAR(20) NOT NULL UNIQUE,
  \`nom\` VARCHAR(255) NOT NULL,
  \`diplome\` ENUM('Licence', 'Master', 'Doctorat', 'DUT') DEFAULT 'Licence',
  \`duree_annees\` INT DEFAULT 3,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (\`faculte_id\`) REFERENCES \`facultes\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table 3: Classes
CREATE TABLE IF NOT EXISTS \`classes\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`filiere_id\` INT NOT NULL,
  \`code\` VARCHAR(50) NOT NULL UNIQUE,
  \`nom\` VARCHAR(255) NOT NULL,
  \`niveau\` VARCHAR(20) NOT NULL,
  \`capacite_max\` INT DEFAULT 50,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (\`filiere_id\`) REFERENCES \`filieres\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table 4: Étudiants
CREATE TABLE IF NOT EXISTS \`etudiants\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`matricule\` VARCHAR(50) NOT NULL UNIQUE,
  \`nom\` VARCHAR(100) NOT NULL,
  \`prenom\` VARCHAR(100) NOT NULL,
  \`email\` VARCHAR(150) UNIQUE,
  \`telephone\` VARCHAR(30),
  \`adresse\` VARCHAR(255),
  \`date_naissance\` DATE,
  \`lieu_naissance\` VARCHAR(100),
  \`genre\` ENUM('M', 'F') DEFAULT 'M',
  \`classe_id\` INT NOT NULL,
  \`filiere_id\` INT,
  \`statut\` ENUM('Régulier', 'Inscrit', 'Suspendu', 'Diplômé', 'Bloqué') DEFAULT 'Régulier',
  \`est_bloque\` BOOLEAN DEFAULT FALSE,
  \`statut_compte\` VARCHAR(20) DEFAULT 'Actif',
  \`mot_de_passe\` VARCHAR(255) NOT NULL DEFAULT 'etudiant123',
  \`date_inscription\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (\`classe_id\`) REFERENCES \`classes\`(\`id\`),
  FOREIGN KEY (\`filiere_id\`) REFERENCES \`filieres\`(\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table 5: Enseignants
CREATE TABLE IF NOT EXISTS \`enseignants\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`matricule\` VARCHAR(50) NOT NULL UNIQUE,
  \`nom\` VARCHAR(100) NOT NULL,
  \`prenom\` VARCHAR(100) NOT NULL,
  \`email\` VARCHAR(150),
  \`telephone\` VARCHAR(30),
  \`grade\` VARCHAR(100),
  \`specialite\` VARCHAR(150),
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table 6: Unités d'Enseignement (UE) & Matières
CREATE TABLE IF NOT EXISTS \`matieres\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`code\` VARCHAR(20) NOT NULL UNIQUE,
  \`nom\` VARCHAR(255) NOT NULL,
  \`filiere_id\` INT NOT NULL,
  \`enseignant_id\` INT,
  \`coefficient\` INT DEFAULT 1,
  \`credits_ectcs\` INT DEFAULT 3,
  \`semestre\` INT DEFAULT 1,
  FOREIGN KEY (\`filiere_id\`) REFERENCES \`filieres\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table 7: Notes & Évaluations
CREATE TABLE IF NOT EXISTS \`notes\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`etudiant_id\` INT NOT NULL,
  \`matiere_id\` INT NOT NULL,
  \`note_cc\` DECIMAL(4,2) DEFAULT NULL,
  \`note_examen\` DECIMAL(4,2) DEFAULT NULL,
  \`moyenne\` DECIMAL(4,2) DEFAULT NULL,
  \`appreciation\` VARCHAR(100),
  \`annee_academique\` VARCHAR(20) DEFAULT '2024-2025',
  FOREIGN KEY (\`etudiant_id\`) REFERENCES \`etudiants\`(\`id\`) ON DELETE CASCADE,
  FOREIGN KEY (\`matiere_id\`) REFERENCES \`matieres\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table 8: Paiements & Frais de Scolarité
CREATE TABLE IF NOT EXISTS \`paiements\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`etudiant_id\` INT NOT NULL,
  \`montant\` DECIMAL(10,2) NOT NULL,
  \`type_frais\` ENUM('Inscription', 'Scolarité', 'Examen', 'Autre') DEFAULT 'Scolarité',
  \`methode\` ENUM('Orange Money', 'Sama Money', 'Moov Money', 'Espèces', 'Virement') DEFAULT 'Orange Money',
  \`reference_transaction\` VARCHAR(100),
  \`statut\` ENUM('Payé', 'En attente', 'Rejeté') DEFAULT 'Payé',
  \`date_paiement\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (\`etudiant_id\`) REFERENCES \`etudiants\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table 9: Inscriptions Académiques
CREATE TABLE IF NOT EXISTS \`inscriptions\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`etudiant_id\` INT NOT NULL,
  \`classe_id\` INT NOT NULL,
  \`annee_academique\` VARCHAR(20) NOT NULL,
  \`statut\` ENUM('Validée', 'En attente', 'Annulée') DEFAULT 'Validée',
  \`date_inscription\` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (\`etudiant_id\`) REFERENCES \`etudiants\`(\`id\`) ON DELETE CASCADE,
  FOREIGN KEY (\`classe_id\`) REFERENCES \`classes\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table 10: Paramètres Généraux
CREATE TABLE IF NOT EXISTS \`parametres\` (
  \`cle\` VARCHAR(100) PRIMARY KEY,
  \`valeur\` TEXT NOT NULL,
  \`description\` TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insérer Verrouillage Global Étudiant par défaut
INSERT INTO \`parametres\` (\`cle\`, \`valeur\`, \`description\`) 
VALUES ('global_student_lock', 'false', 'Verrouille totalement l\'accès à l\'espace étudiant')
ON DUPLICATE KEY UPDATE \`valeur\`=\`valeur\`;
`;

  res.setHeader("Content-Type", "text/plain");
  res.setHeader("Content-Disposition", "attachment; filename=unigestion_schema.sql");
  res.send(sqlDump);
});

// Get or Save full database snapshot (supports seamless synchronization with local state)
app.get("/api/db/sync", (req, res) => {
  if (fs.existsSync(DATA_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
      return res.json({ success: true, data });
    } catch (e) {
      return res.json({ success: true, data: null });
    }
  }
  return res.json({ success: true, data: null });
});

app.post("/api/db/sync", (req, res) => {
  try {
    const { data } = req.body;
    if (data) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
    }
    res.json({ success: true, message: "Base de données sauvegardée avec succès!" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Vite middleware in dev or static server in prod
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
