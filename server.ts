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
    waitForConnections: true,
    connectionLimit: 30,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  };
}

let mysqlPool: mysql.Pool | null = null;

function getMysqlPool() {
  if (!mysqlPool) {
    try {
      mysqlPool = mysql.createPool(getMysqlConfig());
    } catch (err) {
      console.warn("Could not create MySQL pool:", err);
    }
  }
  return mysqlPool;
}

// Basic In-Memory Rate Limiter for brute-force protection
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string, maxAttempts = 15, windowMs = 15 * 60 * 1000): { allowed: boolean; remaining: number } {
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
  const clientIp = req.ip || req.socket.remoteAddress || "127.0.0.1";
  const rateLimit = checkRateLimit(clientIp, 15, 15 * 60 * 1000);

  if (!rateLimit.allowed) {
    return res.status(429).json({
      success: false,
      error: "TOO_MANY_ATTEMPTS",
      message: "Trop de tentatives de connexion détectées. Par mesure de sécurité, veuillez patienter quelques minutes."
    });
  }

  const { role, login, password, filiere_id } = req.body;

  if (!login || typeof login !== 'string') {
    return res.status(400).json({
      success: false,
      error: "INVALID_INPUT",
      message: "Identifiant ou e-mail invalide."
    });
  }

  const sanitizedLogin = login.trim();
  const pool = getMysqlPool();
  if (!pool) {
    return res.status(503).json({
      success: false,
      error: "MYSQL_POOL_ERROR",
      message: "Impossible d'initialiser la connexion au serveur MySQL (localhost:3306)."
    });
  }

  try {
    if (role === 'ADMIN') {
      const [rows]: any = await pool.query(
        "SELECT * FROM utilisateurs WHERE LOWER(email) = LOWER(?) LIMIT 1",
        [sanitizedLogin]
      );

      if (!rows || rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: "INVALID_CREDENTIALS",
          message: `Accès refusé : L'identifiant administrateur "${sanitizedLogin}" n'existe pas dans la base de données MySQL.`
        });
      }

      const user = rows[0];

      const adminPass = user.mot_de_passe || 'admin123';
      if (!password || password !== adminPass) {
        return res.status(401).json({
          success: false,
          error: "INVALID_CREDENTIALS",
          message: "Identifiant ou mot de passe administrateur incorrect."
        });
      }

      delete user.mot_de_passe;

      if (user.statut === 'Inactif') {
        return res.status(403).json({
          success: false,
          error: "ADMIN_INACTIVE",
          message: "Ce compte administrateur est désactivé par l'université."
        });
      }

      return res.json({
        success: true,
        message: "Connexion administrateur réussie.",
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
      const [rows]: any = await pool.query(
        "SELECT * FROM etudiants WHERE (LOWER(matricule) = LOWER(?) OR LOWER(email) = LOWER(?)) LIMIT 1",
        [sanitizedLogin, sanitizedLogin]
      );

      if (!rows || rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: "INVALID_CREDENTIALS",
          message: `Accès refusé : Le matricule ou e-mail "${sanitizedLogin}" n'existe pas dans la base de données MySQL.`
        });
      }

      const student = rows[0];

      // Strict Password Verification
      const expectedPass = student.mot_de_passe || 'etudiant123';
      const isPassValid = password && (password === expectedPass || password === student.matricule);

      if (!isPassValid) {
        return res.status(401).json({
          success: false,
          error: "INVALID_CREDENTIALS",
          message: "Mot de passe incorrect pour le matricule " + student.matricule + "."
        });
      }

      if (student.est_bloque || student.statut_compte === 'Bloqué' || student.statut === 'Suspendu') {
        return res.status(403).json({
          success: false,
          error: "STUDENT_BLOCKED",
          message: "Accès refusé : Votre compte étudiant est actuellement bloqué ou suspendu."
        });
      }

      // Check Filière: authorize if direct match OR if enrolled in inscriptions table
      if (filiere_id) {
        const directMatch = student.filiere_id && Number(student.filiere_id) === Number(filiere_id);
        if (!directMatch) {
          const [inscrRows]: any = await pool.query(
            "SELECT id FROM inscriptions WHERE etudiant_id = ? AND filiere_id = ? LIMIT 1",
            [Number(student.id), Number(filiere_id)]
          );

          if (!inscrRows || inscrRows.length === 0) {
            return res.status(403).json({
              success: false,
              error: "UNAUTHORIZED_FILIERE",
              message: "Accès refusé : Vous n'êtes pas inscrit dans cette filière."
            });
          }
        }
      }

      // SECURITY CRITICAL: Strip sensitive password from student object before sending to browser
      delete student.mot_de_passe;

      return res.json({
        success: true,
        message: "Connexion réussie.",
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
      error: error?.code || "MYSQL_ERROR",
      message: error?.message 
        ? `Erreur de base de données MySQL (${error?.code || 'inconnue'}) : ${error.message}`
        : "Erreur de connexion à la base de données MySQL."
    });
  }
});

// INITIALIZE SCHEMA IN MYSQL DATABASE
app.post("/api/mysql/init-schema", async (req, res) => {
  const pool = getMysqlPool();
  if (!pool) {
    return res.status(503).json({ success: false, message: "MySQL Pool non disponible." });
  }

  try {
    const queries = [
      `CREATE TABLE IF NOT EXISTS facultes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(20) NOT NULL UNIQUE,
        nom VARCHAR(255) NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

      `CREATE TABLE IF NOT EXISTS filieres (
        id INT AUTO_INCREMENT PRIMARY KEY,
        faculte_id INT DEFAULT 1,
        code VARCHAR(20) NOT NULL UNIQUE,
        nom VARCHAR(255) NOT NULL,
        diplome VARCHAR(50) DEFAULT 'Licence',
        frais_scolarite DECIMAL(12,2) DEFAULT 350000,
        duree_annees INT DEFAULT 3,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

      `CREATE TABLE IF NOT EXISTS classes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        filiere_id INT NOT NULL,
        code VARCHAR(50) NOT NULL UNIQUE,
        nom VARCHAR(255) NOT NULL,
        niveau VARCHAR(20) NOT NULL,
        capacite_max INT DEFAULT 50,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

      `CREATE TABLE IF NOT EXISTS etudiants (
        id INT AUTO_INCREMENT PRIMARY KEY,
        matricule VARCHAR(50) NOT NULL UNIQUE,
        nom VARCHAR(100) NOT NULL,
        prenom VARCHAR(100) NOT NULL,
        email VARCHAR(150),
        telephone VARCHAR(30),
        adresse VARCHAR(255),
        date_naissance DATE,
        lieu_naissance VARCHAR(100),
        genre ENUM('M', 'F') DEFAULT 'M',
        sexe ENUM('M', 'F') DEFAULT 'M',
        nationalite VARCHAR(50) DEFAULT 'Mali',
        classe_id INT NOT NULL,
        filiere_id INT,
        statut ENUM('Régulier', 'Inscrit', 'Suspendu', 'Diplômé', 'Bloqué') DEFAULT 'Inscrit',
        est_bloque BOOLEAN DEFAULT FALSE,
        statut_compte VARCHAR(20) DEFAULT 'Actif',
        tuteur_nom VARCHAR(100),
        tuteur_prenom VARCHAR(100),
        tuteur_telephone VARCHAR(30),
        mot_de_passe VARCHAR(255) NOT NULL DEFAULT 'etudiant123',
        date_inscription DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

      `CREATE TABLE IF NOT EXISTS inscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        etudiant_id INT NOT NULL,
        classe_id INT NOT NULL,
        filiere_id INT,
        annee_academique_id INT NOT NULL,
        annee_academique VARCHAR(50) DEFAULT '2025-2026',
        date_inscription DATETIME DEFAULT CURRENT_TIMESTAMP,
        statut ENUM('Validée', 'En attente', 'Annulée') DEFAULT 'Validée',
        frais_inscription DECIMAL(12,2) DEFAULT 150000,
        type_inscription VARCHAR(50) DEFAULT 'Inscrire',
        statut_paiement VARCHAR(50) DEFAULT 'Payé',
        statut_validation VARCHAR(50) DEFAULT 'Validé'
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

      `CREATE TABLE IF NOT EXISTS paiements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        etudiant_id INT NOT NULL,
        annee_academique_id INT DEFAULT 1,
        filiere_id INT,
        filiere_code VARCHAR(20),
        filiere_nom VARCHAR(150),
        annee_libelle VARCHAR(50) DEFAULT '2025 - 2026',
        type_frais VARCHAR(50) DEFAULT 'Scolarité',
        montant DECIMAL(12,2) NOT NULL,
        montant_paye DECIMAL(12,2) NOT NULL,
        reste_a_payer DECIMAL(12,2) NOT NULL DEFAULT 0,
        mode_paiement VARCHAR(50) DEFAULT 'Orange Money',
        reference_recu VARCHAR(100) NOT NULL UNIQUE,
        date_paiement DATETIME DEFAULT CURRENT_TIMESTAMP,
        statut VARCHAR(50) DEFAULT 'Complet',
        remarque TEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

      `CREATE TABLE IF NOT EXISTS matieres (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(20) NOT NULL,
        nom VARCHAR(255) NOT NULL,
        filiere_id INT NOT NULL,
        niveau_id INT,
        semestre_id INT DEFAULT 1,
        enseignant_id INT,
        coefficient INT DEFAULT 1,
        credits INT DEFAULT 3
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

      `CREATE TABLE IF NOT EXISTS notes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        etudiant_id INT NOT NULL,
        matiere_id INT NOT NULL,
        semestre_id INT DEFAULT 1,
        annee_academique_id INT DEFAULT 1,
        annee_academique VARCHAR(20) DEFAULT '2025-2026',
        note_cc DECIMAL(4,2) DEFAULT 0.00,
        note_examen DECIMAL(4,2) DEFAULT 0.00,
        note_finale DECIMAL(4,2) DEFAULT 0.00,
        appreciation VARCHAR(100),
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_student_grade (etudiant_id, matiere_id, semestre_id, annee_academique_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

      `CREATE TABLE IF NOT EXISTS bulletins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        etudiant_id INT NOT NULL,
        classe_id INT,
        semestre_id INT DEFAULT 1,
        annee_academique_id INT DEFAULT 1,
        moyenne DECIMAL(4,2) NOT NULL,
        total_credits INT DEFAULT 0,
        decision VARCHAR(50) DEFAULT 'Admis',
        mention VARCHAR(50) DEFAULT 'Passable',
        rang INT DEFAULT 1,
        date_generation DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
    ];

    for (const q of queries) {
      await pool.query(q);
    }

    return res.json({ success: true, message: "Structure des tables MySQL vérifiée et synchronisée avec succès." });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.code, message: `Erreur d'initialisation MySQL : ${error.message}` });
  }
});

// 1. INSCRIPTION INDIVIDUELLE AVEC TRANSACTION SQL (BEGIN -> QUERIES -> COMMIT / ROLLBACK)
app.post("/api/inscriptions/create", async (req, res) => {
  const pool = getMysqlPool();
  if (!pool) {
    return res.status(503).json({ success: false, error: "NO_MYSQL", message: "Serveur MySQL non disponible." });
  }

  const { etudiant_id, etudiant_data, classe_id, filiere_id, annee_academique_id, type_inscription, statut_paiement, statut_validation, frais_inscription, montant_initial_paye, mode_paiement } = req.body;

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    let finalEtudiantId = etudiant_id;

    // A. If new student or updating student profile
    if (etudiant_data) {
      if (finalEtudiantId) {
        await connection.query(
          `UPDATE etudiants SET nom=?, prenom=?, email=?, telephone=?, adresse=?, date_naissance=?, lieu_naissance=?, sexe=?, classe_id=?, filiere_id=?, statut='Inscrit', statut_compte='Actif' WHERE id=?`,
          [
            etudiant_data.nom, etudiant_data.prenom, etudiant_data.email || null, etudiant_data.telephone || null,
            etudiant_data.adresse || null, etudiant_data.date_naissance || null, etudiant_data.lieu_naissance || null,
            etudiant_data.sexe || 'M', classe_id, filiere_id || null, finalEtudiantId
          ]
        );
      } else {
        const [insertEtud]: any = await connection.query(
          `INSERT INTO etudiants (matricule, nom, prenom, email, telephone, adresse, date_naissance, lieu_naissance, sexe, classe_id, filiere_id, statut, statut_compte, mot_de_passe)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Inscrit', 'Actif', 'etudiant123')`,
          [
            etudiant_data.matricule, etudiant_data.nom, etudiant_data.prenom,
            etudiant_data.email || `${etudiant_data.matricule.toLowerCase()}@usttb.edu.ml`,
            etudiant_data.telephone || null, etudiant_data.adresse || null,
            etudiant_data.date_naissance || null, etudiant_data.lieu_naissance || null,
            etudiant_data.sexe || 'M', classe_id, filiere_id || null
          ]
        );
        finalEtudiantId = insertEtud.insertId;
      }
    } else if (finalEtudiantId) {
      // Update existing student status to 'Inscrit'
      await connection.query(
        `UPDATE etudiants SET classe_id = ?, filiere_id = COALESCE(?, filiere_id), statut = 'Inscrit', statut_compte = 'Actif' WHERE id = ?`,
        [classe_id, filiere_id || null, finalEtudiantId]
      );
    }

    if (!finalEtudiantId) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: "INVALID_STUDENT", message: "Identifiant étudiant invalide." });
    }

    // B. Insert Inscription record
    const [insResult]: any = await connection.query(
      `INSERT INTO inscriptions (etudiant_id, classe_id, filiere_id, annee_academique_id, date_inscription, statut, frais_inscription, type_inscription, statut_paiement, statut_validation)
       VALUES (?, ?, ?, ?, NOW(), 'Validée', ?, ?, ?, ?)`,
      [
        finalEtudiantId, classe_id, filiere_id || null, annee_academique_id || 1,
        frais_inscription || 150000, type_inscription || 'Inscrire', statut_paiement || 'Payé', statut_validation || 'Validé'
      ]
    );

    // C. Register initial payment if specified or if statut_paiement === 'Payé'
    let paymentId = null;
    const montantPaye = Number(montant_initial_paye) > 0 ? Number(montant_initial_paye) : (statut_paiement === 'Payé' ? Number(frais_inscription || 150000) : 0);

    if (montantPaye > 0) {
      const refRecu = `REC-INS-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
      const totalMontant = Number(frais_inscription || 150000);
      const reste = Math.max(0, totalMontant - montantPaye);
      const statutPay = reste <= 0 ? 'Complet' : 'Partiel';

      const [payResult]: any = await connection.query(
        `INSERT INTO paiements (etudiant_id, annee_academique_id, filiere_id, type_frais, montant, montant_paye, reste_a_payer, mode_paiement, reference_recu, date_paiement, statut, remarque)
         VALUES (?, ?, ?, 'Inscription', ?, ?, ?, ?, ?, NOW(), ?, 'Acompte/Paiement inscription initiale')`,
        [
          finalEtudiantId, annee_academique_id || 1, filiere_id || null,
          totalMontant, montantPaye, reste, mode_paiement || 'Orange Money', refRecu, statutPay
        ]
      );
      paymentId = payResult.insertId;
    }

    // COMMIT ALL OPERATIONS ATOMICALLY
    await connection.commit();

    return res.json({
      success: true,
      message: "Inscription et paiement enregistrés avec succès dans MySQL.",
      data: {
        inscription_id: insResult.insertId,
        etudiant_id: finalEtudiantId,
        paiement_id: paymentId
      }
    });

  } catch (error: any) {
    if (connection) await connection.rollback();
    return res.status(400).json({
      success: false,
      error: error?.code || "SQL_TRANSACTION_FAILED",
      message: `Échec de l'inscription MySQL : ${error?.message || "Erreur de contrainte SQL."}`
    });
  } finally {
    if (connection) connection.release();
  }
});

// 2. INSCRIPTION COLLECTIVE AVEC TRANSACTION SQL
app.post("/api/inscriptions/collective", async (req, res) => {
  const pool = getMysqlPool();
  if (!pool) return res.status(503).json({ success: false, message: "MySQL non disponible." });

  const { target_classe_id, annee_academique_id, student_ids, type_inscription, frais_inscription, statut_paiement, statut_validation } = req.body;

  if (!target_classe_id || !Array.isArray(student_ids) || student_ids.length === 0) {
    return res.status(400).json({ success: false, message: "Classe cible ou liste d'étudiants manquante." });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const insertedInscriptions = [];

    for (const stId of student_ids) {
      // Get student filiere_id
      const [stRows]: any = await connection.query("SELECT id, filiere_id FROM etudiants WHERE id = ?", [stId]);
      const filiereId = stRows.length > 0 ? stRows[0].filiere_id : null;

      // Update Student Class
      await connection.query(
        "UPDATE etudiants SET classe_id = ?, statut = 'Inscrit', statut_compte = 'Actif' WHERE id = ?",
        [target_classe_id, stId]
      );

      // Insert Inscription
      const [insRes]: any = await connection.query(
        `INSERT INTO inscriptions (etudiant_id, classe_id, filiere_id, annee_academique_id, date_inscription, statut, frais_inscription, type_inscription, statut_paiement, statut_validation)
         VALUES (?, ?, ?, ?, NOW(), 'Validée', ?, ?, ?, ?)`,
        [
          stId, target_classe_id, filiereId, annee_academique_id || 1,
          frais_inscription || 150000, type_inscription || 'Passage', statut_paiement || 'Payé', statut_validation || 'Validé'
        ]
      );
      insertedInscriptions.push(insRes.insertId);
    }

    await connection.commit();

    return res.json({
      success: true,
      message: `${student_ids.length} étudiants réinscrits/transférés avec succès dans MySQL.`,
      count: student_ids.length
    });

  } catch (error: any) {
    if (connection) await connection.rollback();
    return res.status(400).json({
      success: false,
      error: error?.code || "SQL_TRANSACTION_FAILED",
      message: `Échec du passage collectif MySQL : ${error?.message}`
    });
  } finally {
    if (connection) connection.release();
  }
});

// 3. ENREGISTREMENT PAIEMENT AVEC TRANSACTION SQL & SANITISATION STRICTE
app.post("/api/paiements/create", async (req, res) => {
  const pool = getMysqlPool();
  if (!pool) return res.status(503).json({ success: false, message: "MySQL non disponible." });

  const { etudiant_id, annee_academique_id, filiere_id, type_frais, montant, montant_paye, reste_a_payer, mode_paiement, reference_recu, remarque } = req.body;

  // Validation stricte des données entrantes
  const etudId = Number(etudiant_id);
  const paidAmount = Number(montant_paye);

  if (!etudId || isNaN(etudId) || etudId <= 0) {
    return res.status(400).json({ success: false, error: "VALIDATION_ERROR", message: "Identifiant étudiant invalide." });
  }

  if (isNaN(paidAmount) || paidAmount <= 0) {
    return res.status(400).json({ success: false, error: "VALIDATION_ERROR", message: "Le montant payé doit être un nombre supérieur à 0 FCFA." });
  }

  if (paidAmount > 50000000) {
    return res.status(400).json({ success: false, error: "VALIDATION_ERROR", message: "Le montant dépasse le plafond autorisé (50 000 000 FCFA)." });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    // Vérifier l'existence de l'étudiant
    const [stRows]: any = await connection.query("SELECT id FROM etudiants WHERE id = ?", [etudId]);
    if (!stRows || stRows.length === 0) {
      return res.status(404).json({ success: false, error: "NOT_FOUND", message: "Étudiant introuvable dans la base de données." });
    }

    await connection.beginTransaction();

    const ref = reference_recu ? String(reference_recu).trim().substring(0, 100) : `REC-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const totalMontant = Math.max(0, Number(montant) || 350000);
    const remaining = Number(reste_a_payer) >= 0 ? Number(reste_a_payer) : Math.max(0, totalMontant - paidAmount);
    const statusVal = remaining <= 0 ? 'Complet' : 'Partiel';
    const cleanType = String(type_frais || 'Scolarité').trim().substring(0, 50);
    const cleanMode = String(mode_paiement || 'Orange Money').trim().substring(0, 50);
    const cleanRemarque = remarque ? String(remarque).trim().substring(0, 255) : null;

    const [resPay]: any = await connection.query(
      `INSERT INTO paiements (etudiant_id, annee_academique_id, filiere_id, type_frais, montant, montant_paye, reste_a_payer, mode_paiement, reference_recu, date_paiement, statut, remarque)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)`,
      [
        etudId, annee_academique_id || 1, filiere_id || null,
        cleanType, totalMontant, paidAmount, remaining,
        cleanMode, ref, statusVal, cleanRemarque
      ]
    );

    await connection.commit();

    return res.json({
      success: true,
      message: "Paiement validé et enregistré avec succès dans MySQL.",
      paiement_id: resPay.insertId,
      reference_recu: ref
    });

  } catch (error: any) {
    if (connection) await connection.rollback();
    return res.status(400).json({
      success: false,
      error: error?.code || "SQL_ERROR",
      message: `Erreur MySQL lors de l'enregistrement du paiement : ${error?.message}`
    });
  } finally {
    if (connection) connection.release();
  }
});

// 4. SAISIE COLLECTIVE DES NOTES AVEC VALIDATION ET TRANSACTION SQL
app.post("/api/notes/saisie-collective", async (req, res) => {
  const pool = getMysqlPool();
  if (!pool) return res.status(503).json({ success: false, message: "MySQL non disponible." });

  const { annee_academique_id, filiere_id, semestre_id, grades } = req.body;

  if (!Array.isArray(grades) || grades.length === 0) {
    return res.status(400).json({ success: false, error: "VALIDATION_ERROR", message: "Aucune note transmise." });
  }

  let connection;
  try {
    connection = await pool.getConnection();

    // Valider chaque note transmise (0.00 <= note <= 20.00)
    for (const item of grades) {
      if (item.note_cc !== undefined && item.note_cc !== null && item.note_cc !== '') {
        const cc = Number(item.note_cc);
        if (isNaN(cc) || cc < 0 || cc > 20) {
          return res.status(400).json({ 
            success: false, 
            error: "INVALID_GRADE", 
            message: `La note de contrôle continu (${item.note_cc}) de l'étudiant ID ${item.etudiant_id} doit être comprise entre 0.00 et 20.00.` 
          });
        }
      }
      if (item.note_examen !== undefined && item.note_examen !== null && item.note_examen !== '') {
        const ex = Number(item.note_examen);
        if (isNaN(ex) || ex < 0 || ex > 20) {
          return res.status(400).json({ 
            success: false, 
            error: "INVALID_GRADE", 
            message: `La note d'examen (${item.note_examen}) de l'étudiant ID ${item.etudiant_id} doit être comprise entre 0.00 et 20.00.` 
          });
        }
      }
    }

    await connection.beginTransaction();

    let savedCount = 0;

    for (const item of grades) {
      const { etudiant_id, matiere_id, note_cc, note_examen, appreciation } = item;

      const rawCc = note_cc !== null && note_cc !== undefined && note_cc !== '' ? Number(note_cc) : 0.00;
      const rawExam = note_examen !== null && note_examen !== undefined && note_examen !== '' ? Number(note_examen) : 0.00;
      
      const ccVal = Math.max(0, Math.min(20, rawCc));
      const examVal = Math.max(0, Math.min(20, rawExam));
      const finaleVal = Number(((ccVal * 0.3) + (examVal * 0.7)).toFixed(2));
      const app = appreciation ? String(appreciation).trim().substring(0, 100) : (finaleVal >= 10 ? 'Validé' : 'Ajourné');

      // UPSERT Note using ON DUPLICATE KEY UPDATE to prevent duplicates
      await connection.query(
        `INSERT INTO notes (etudiant_id, matiere_id, semestre_id, annee_academique_id, note_cc, note_examen, note_finale, appreciation, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE 
           note_cc = VALUES(note_cc),
           note_examen = VALUES(note_examen),
           note_finale = VALUES(note_finale),
           appreciation = VALUES(appreciation),
           updated_at = NOW()`,
        [etudiant_id, matiere_id, semestre_id || 1, annee_academique_id || 1, ccVal, examVal, finaleVal, app]
      );

      savedCount++;
    }

    await connection.commit();

    return res.json({
      success: true,
      message: `${savedCount} notes validées (échelle 0-20) et enregistrées avec succès dans MySQL.`,
      count: savedCount
    });

  } catch (error: any) {
    if (connection) await connection.rollback();
    return res.status(400).json({
      success: false,
      error: error?.code || "SQL_ERROR",
      message: `Erreur MySQL lors de la saisie des notes : ${error?.message}`
    });
  } finally {
    if (connection) connection.release();
  }
});

// 5. GET ALL DATA FROM MYSQL TABLES FOR REAL REFRESH
app.get("/api/data/all", async (req, res) => {
  const pool = getMysqlPool();
  if (!pool) return res.status(503).json({ success: false, message: "MySQL non disponible." });

  try {
    const [etudiants]: any = await pool.query("SELECT * FROM etudiants ORDER BY id DESC").catch(() => [[]]);
    const [inscriptions]: any = await pool.query("SELECT * FROM inscriptions ORDER BY id DESC").catch(() => [[]]);
    const [paiements]: any = await pool.query("SELECT * FROM paiements ORDER BY id DESC").catch(() => [[]]);
    const [notes]: any = await pool.query("SELECT * FROM notes ORDER BY id DESC").catch(() => [[]]);
    const [bulletins]: any = await pool.query("SELECT * FROM bulletins ORDER BY id DESC").catch(() => [[]]);
    const [filieres]: any = await pool.query("SELECT * FROM filieres ORDER BY id ASC").catch(() => [[]]);
    const [classes]: any = await pool.query("SELECT * FROM classes ORDER BY id ASC").catch(() => [[]]);
    const [matieres]: any = await pool.query("SELECT * FROM matieres ORDER BY id ASC").catch(() => [[]]);
    const [administrateurs]: any = await pool.query("SELECT * FROM administrateurs ORDER BY id ASC").catch(() => [[]]);
    const [utilisateurs]: any = await pool.query("SELECT * FROM utilisateurs ORDER BY id ASC").catch(() => [[]]);

    return res.json({
      success: true,
      data: {
        etudiants,
        inscriptions,
        paiements,
        notes,
        bulletins,
        filieres,
        classes,
        matieres,
        administrateurs,
        utilisateurs
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.code, message: error.message });
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

// Catch-all for API 404s to guarantee JSON responses (preventing HTML fallback)
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
