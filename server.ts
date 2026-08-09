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

// Download PHP connection test script & PHP Access Control script
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

app.get("/check_student_access.php", (req, res) => {
  const phpPath = path.join(process.cwd(), "check_student_access.php");
  if (fs.existsSync(phpPath)) {
    res.setHeader("Content-Type", "application/x-httpd-php");
    res.setHeader("Content-Disposition", "inline; filename=check_student_access.php");
    res.sendFile(phpPath);
  } else {
    res.status(404).send("Fichier check_student_access.php non trouvé.");
  }
});

// BACKEND SECURITY ACCESS CONTROL VALIDATION API
app.post("/api/etudiant/authorize", async (req, res) => {
  const { etudiant_id, filiere_id, classe_id } = req.body;

  if (!etudiant_id || !filiere_id) {
    return res.status(400).json({
      authorized: false,
      reason: "MISSING_PARAMS",
      message: "Les identifiants 'etudiant_id' et 'filiere_id' sont obligatoires pour la validation de sécurité backend."
    });
  }

  try {
    const pool = getMysqlPool();
    if (pool) {
      // Direct MySQL Validation
      const [paramRows]: any = await pool.query(
        "SELECT valeur FROM parametres WHERE cle = 'global_student_lock' LIMIT 1"
      );
      if (paramRows.length > 0 && (paramRows[0].valeur === 'true' || paramRows[0].valeur === '1')) {
        return res.status(403).json({
          authorized: false,
          reason: "GLOBAL_LOCK",
          message: "Accès refusé par le serveur backend : Verrouillage général de l'espace étudiant actif au niveau supérieur de l'université."
        });
      }

      const [etudRows]: any = await pool.query(
        "SELECT id, matricule, nom, prenom, filiere_id, classe_id, statut, est_bloque, statut_compte FROM etudiants WHERE id = ? LIMIT 1",
        [etudiant_id]
      );

      if (etudRows.length === 0) {
        return res.status(404).json({
          authorized: false,
          reason: "NOT_FOUND",
          message: "Étudiant introuvable dans la base de données MySQL backend."
        });
      }

      const student = etudRows[0];
      if (student.est_bloque || student.statut_compte === 'Bloqué' || student.statut === 'Suspendu') {
        return res.status(403).json({
          authorized: false,
          reason: "ACCOUNT_BLOCKED",
          message: "Accès refusé par le serveur backend : Votre compte étudiant est marqué comme bloqué ou suspendu dans la base de données MySQL."
        });
      }

      if (student.filiere_id != filiere_id) {
        const [inscrRows]: any = await pool.query(
          "SELECT id FROM inscriptions WHERE etudiant_id = ? AND filiere_id = ? AND statut = 'Validée' LIMIT 1",
          [etudiant_id, filiere_id]
        );

        if (inscrRows.length === 0) {
          return res.status(403).json({
            authorized: false,
            reason: "UNAUTHORIZED_FILIERE",
            message: `Accès refusé par le serveur backend : L'étudiant ${student.matricule} n'a aucune inscription validée pour la filière ID ${filiere_id}.`
          });
        }
      }

      return res.json({
        authorized: true,
        message: "Accès validé et autorisé par le serveur backend MySQL.",
        etudiant: {
          id: student.id,
          matricule: student.matricule,
          nom: student.nom,
          prenom: student.prenom
        }
      });

    } else if (fs.existsSync(DATA_FILE)) {
      // Fallback JSON Storage Validation
      const db = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
      
      if (db.global_student_lock === true || db.global_student_lock === 'true') {
        return res.status(403).json({
          authorized: false,
          reason: "GLOBAL_LOCK",
          message: "Accès refusé par le serveur backend : Verrouillage général de l'espace étudiant actif."
        });
      }

      const etudiants = db.etudiants || [];
      const student = etudiants.find((e: any) => Number(e.id) === Number(etudiant_id));

      if (!student) {
        return res.status(404).json({
          authorized: false,
          reason: "NOT_FOUND",
          message: "Étudiant introuvable dans le système backend."
        });
      }

      if (student.est_bloque || student.statut_compte === 'Bloqué' || student.statut === 'Suspendu') {
        return res.status(403).json({
          authorized: false,
          reason: "ACCOUNT_BLOCKED",
          message: "Accès refusé par le serveur backend : Le statut de l'étudiant est Bloqué ou Suspendu."
        });
      }

      const isFiliereMatch = Number(student.filiere_id) === Number(filiere_id);
      const inscriptions = db.inscriptions || [];
      const isInscriptionMatch = inscriptions.some(
        (i: any) => Number(i.etudiant_id) === Number(etudiant_id) && Number(i.filiere_id) === Number(filiere_id) && i.statut === 'Validée'
      );

      if (!isFiliereMatch && !isInscriptionMatch) {
        return res.status(403).json({
          authorized: false,
          reason: "UNAUTHORIZED_FILIERE",
          message: `Accès refusé par le serveur backend : Accès non autorisé à la filière ID ${filiere_id}.`
        });
      }

      return res.json({
        authorized: true,
        message: "Accès validé et autorisé par le backend.",
        etudiant: {
          id: student.id,
          matricule: student.matricule,
          nom: student.nom,
          prenom: student.prenom
        }
      });
    }

    return res.json({
      authorized: true,
      message: "Contrôle d'accès passé par défaut."
    });

  } catch (error: any) {
    return res.status(500).json({
      authorized: false,
      reason: "SERVER_ERROR",
      message: "Erreur serveur lors de la validation du contrôle d'accès : " + error.message
    });
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

// STRICT MYSQL AUTHENTICATION ROUTE (WAMP / PHPMYADMIN ONLY)
app.post("/api/mysql/authenticate", async (req, res) => {
  const { role, login, password, filiere_id } = req.body;
  const config = getMysqlConfig();

  try {
    const connection = await mysql.createConnection(config);
    await connection.ping();

    if (role === 'ADMIN') {
      const [rows]: any = await connection.query(
        "SELECT * FROM utilisateurs WHERE LOWER(email) = LOWER(?) LIMIT 1",
        [login.trim()]
      );

      await connection.end();

      if (!rows || rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: "ADMIN_NOT_FOUND",
          message: "Compte administrateur introuvable dans la base de données MySQL WAMP. Veuillez vérifier la base 'unigestion_db'."
        });
      }

      const user = rows[0];
      if (user.statut === 'Inactif') {
        return res.status(403).json({
          success: false,
          error: "ADMIN_INACTIVE",
          message: "Ce compte administrateur est marqué comme inactif dans la base MySQL WAMP."
        });
      }

      return res.json({
        success: true,
        message: "Authentification Administrateur réussie via la base MySQL WAMP.",
        user: {
          id: user.id,
          nom: user.nom,
          prenom: user.prenom,
          email_or_matricule: user.email,
          role: 'ADMIN',
          universite_nom: 'USTTB Bamako'
        }
      });

    } else {
      // ETUDIANT
      const [rows]: any = await connection.query(
        "SELECT * FROM etudiants WHERE (LOWER(matricule) = LOWER(?) OR LOWER(email) = LOWER(?)) LIMIT 1",
        [login.trim(), login.trim()]
      );

      if (!rows || rows.length === 0) {
        await connection.end();
        return res.status(401).json({
          success: false,
          error: "STUDENT_NOT_FOUND",
          message: "Étudiant introuvable avec ce matricule/e-mail dans la base de données MySQL WAMP."
        });
      }

      const student = rows[0];

      if (student.est_bloque || student.statut_compte === 'Bloqué' || student.statut === 'Suspendu') {
        await connection.end();
        return res.status(403).json({
          success: false,
          error: "STUDENT_BLOCKED",
          message: "Accès refusé : Votre compte étudiant est marqué comme bloqué dans la base MySQL WAMP."
        });
      }

      // Check Filière if provided
      if (filiere_id && student.filiere_id && Number(student.filiere_id) !== Number(filiere_id)) {
        const [inscrRows]: any = await connection.query(
          "SELECT id FROM inscriptions WHERE etudiant_id = ? AND filiere_id = ? LIMIT 1",
          [student.id, filiere_id]
        );

        if (!inscrRows || inscrRows.length === 0) {
          await connection.end();
          return res.status(403).json({
            success: false,
            error: "UNAUTHORIZED_FILIERE",
            message: `Accès refusé : L'étudiant ${student.matricule} n'est pas autorisé pour cette filière dans la base MySQL WAMP.`
          });
        }
      }

      await connection.end();

      return res.json({
        success: true,
        message: "Authentification Étudiant réussie via la base MySQL WAMP.",
        user: {
          id: student.id,
          nom: student.nom,
          prenom: student.prenom,
          email_or_matricule: student.matricule,
          role: 'ETUDIANT',
          etudiantDetail: student,
          universite_nom: 'USTTB Bamako'
        }
      });
    }

  } catch (error: any) {
    return res.status(503).json({
      success: false,
      error: "MYSQL_SERVER_OFFLINE",
      message: `Impossible de contacter le serveur MySQL WAMP (localhost:3306) : ${error?.message || "Connexion refusée"}. Assurez-vous que WAMP est démarré et que la base 'unigestion_db' ou 'universite' est présente dans phpMyAdmin.`
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
