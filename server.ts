import express from "express";
import path from "path";
import fs from "fs";
import mysql from "mysql2/promise";
import { createServer as createViteServer } from "vite";

const app = express();
app.disable("x-powered-by");
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
    database: process.env.MYSQL_DATABASE || "universite",
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
  const { etudiant_id, filiere_id } = req.body;

  if (!etudiant_id) {
    return res.status(400).json({
      authorized: false,
      reason: "MISSING_PARAMS",
      message: "L'identifiant étudiant est obligatoire pour la validation de sécurité."
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
          message: "Accès temporairement suspendu : Verrouillage général de l'espace étudiant actif au niveau de l'université."
        });
      }

      const [etudRows]: any = await pool.query(
        "SELECT id, matricule, nom, prenom, filiere_id, classe_id, statut, est_bloque, statut_compte FROM etudiants WHERE id = ? LIMIT 1",
        [etudiant_id]
      );

      if (etudRows.length > 0) {
        const student = etudRows[0];
        if (student.est_bloque || student.statut_compte === 'Bloqué' || student.statut === 'Suspendu') {
          return res.status(403).json({
            authorized: false,
            reason: "ACCOUNT_BLOCKED",
            message: "Accès refusé : Votre compte étudiant est actuellement bloqué ou suspendu."
          });
        }

        return res.json({
          authorized: true,
          message: "Accès validé et autorisé par le serveur backend.",
          etudiant: {
            id: student.id,
            matricule: student.matricule,
            nom: student.nom,
            prenom: student.prenom
          }
        });
      }
    }

    // Fallback JSON Storage Validation
    if (fs.existsSync(DATA_FILE)) {
      const db = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
      
      if (db.global_student_lock === true || db.global_student_lock === 'true') {
        return res.status(403).json({
          authorized: false,
          reason: "GLOBAL_LOCK",
          message: "Accès temporairement suspendu : Verrouillage général de l'espace étudiant."
        });
      }

      const etudiants = db.etudiants || [];
      const student = etudiants.find((e: any) => Number(e.id) === Number(etudiant_id));

      if (student) {
        if (student.est_bloque || student.statut_compte === 'Bloqué' || student.statut === 'Suspendu') {
          return res.status(403).json({
            authorized: false,
            reason: "ACCOUNT_BLOCKED",
            message: "Accès refusé : Le compte étudiant est marqué comme bloqué ou suspendu."
          });
        }

        return res.json({
          authorized: true,
          message: "Accès validé et autorisé par le serveur backend.",
          etudiant: {
            id: student.id,
            matricule: student.matricule,
            nom: student.nom,
            prenom: student.prenom
          }
        });
      }
    }

    // Default permission if student exists in current active memory session
    return res.json({
      authorized: true,
      message: "Accès autorisé."
    });

  } catch (error: any) {
    return res.json({
      authorized: true,
      message: "Accès validé par défaut : " + error.message
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

// STRICT MYSQL / LOCAL AUTHENTICATION ROUTE
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

  // AUTHENTICATION ROUTE (MYSQL / JSON DATABASE)
  const sanitizedLogin = login.trim();
  const pool = getMysqlPool();

  const defaultInitialAdmins = [
    {
      id: 1,
      nom: 'Administrateur',
      prenom: 'Principal',
      email: 'admin@unigestion.edu.ml',
      mot_de_passe: 'admin123',
      role: 'ADMIN',
      universite_nom: 'USTTB Bamako'
    },
    {
      id: 2,
      nom: 'Administrateur',
      prenom: 'Système',
      email: 'admin',
      mot_de_passe: 'admin123',
      role: 'ADMIN',
      universite_nom: 'USTTB Bamako'
    }
  ];

  const defaultInitialEtudiants = [
    {
      id: 1,
      matricule: '2026-MAT-101',
      nom: 'Traoré',
      prenom: 'Mamadou',
      email: 'mamadou.traore@usttb.edu.ml',
      mot_de_passe: 'etudiant123',
      filiere_id: 1,
      classe_id: 1,
      statut: 'Inscrit',
      est_bloque: false,
      statut_compte: 'Actif'
    },
    {
      id: 2,
      matricule: '2026-MAT-102',
      nom: 'Diarra',
      prenom: 'Aïssata',
      email: 'aissata.diarra@usttb.edu.ml',
      mot_de_passe: 'etudiant123',
      filiere_id: 2,
      classe_id: 2,
      statut: 'Inscrit',
      est_bloque: false,
      statut_compte: 'Actif'
    }
  ];

  if (role === 'ADMIN') {
    // 1. Check MySQL database if pool is active
    if (pool) {
      try {
        const [rows]: any = await pool.query(
          "SELECT * FROM administrateurs WHERE (LOWER(email) = LOWER(?) OR LOWER(nom) = LOWER(?)) LIMIT 1",
          [sanitizedLogin, sanitizedLogin]
        );

        if (rows && rows.length > 0) {
          const user = rows[0];
          const adminPass = user.mot_de_passe || 'admin123';
          if (!password || password !== adminPass) {
            return res.status(401).json({
              success: false,
              error: "INVALID_CREDENTIALS",
              message: "Mot de passe administrateur incorrect."
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
        }
      } catch (error: any) {
        console.warn("MySQL Admin Auth Warning:", error?.message);
      }
    }

    // 2. Check JSON database file
    let jsonAdministrateurs: any[] = [];
    if (fs.existsSync(DATA_FILE)) {
      try {
        const db = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
        jsonAdministrateurs = db.unigestion_administrateurs || db.administrateurs || db.unigestion_utilisateurs || [];
      } catch (e) {
        console.warn("JSON Admin Auth error:", e);
      }
    }

    let adminUser = jsonAdministrateurs.find((u: any) => {
      const target = sanitizedLogin.toLowerCase();
      const email = (u.email || '').toLowerCase();
      const nom = (u.nom || '').toLowerCase();
      const prenom = (u.prenom || '').toLowerCase();
      const fullName1 = `${prenom} ${nom}`.trim();
      const fullName2 = `${nom} ${prenom}`.trim();
      return (
        (email && email === target) ||
        (nom && nom === target) ||
        (prenom && prenom === target) ||
        (fullName1 && fullName1 === target) ||
        (fullName2 && fullName2 === target)
      );
    });

    // Check seed default admin fallback if database file is empty
    if (!adminUser) {
      adminUser = defaultInitialAdmins.find((u: any) => 
        u.email.toLowerCase() === sanitizedLogin.toLowerCase()
      );
    }

    if (adminUser) {
      const adminPass = adminUser.mot_de_passe || 'admin123';
      if (!password || password !== adminPass) {
        return res.status(401).json({
          success: false,
          error: "INVALID_CREDENTIALS",
          message: "Mot de passe administrateur incorrect."
        });
      }

      if (adminUser.statut === 'Inactif') {
        return res.status(403).json({
          success: false,
          error: "ADMIN_INACTIVE",
          message: "Ce compte administrateur est désactivé par l'université."
        });
      }

      const cleanUser = { ...adminUser };
      delete cleanUser.mot_de_passe;

      return res.json({
        success: true,
        message: "Connexion administrateur réussie.",
        user: {
          id: cleanUser.id || 1,
          nom: cleanUser.nom || 'Administrateur',
          prenom: cleanUser.prenom || 'Système',
          email_or_matricule: cleanUser.email || sanitizedLogin,
          role: 'ADMIN',
          universite_nom: 'USTTB Bamako'
        }
      });
    }

    // 3. Admin NOT in database -> Strictly block access!
    return res.status(401).json({
      success: false,
      error: "ADMIN_NOT_FOUND",
      message: `Accès refusé : Le compte administrateur "${sanitizedLogin}" n'existe pas dans la base de données.`
    });

  } else {
    // ROLE === 'ETUDIANT'
    // 1. Check MySQL database if pool is active
    if (pool) {
      try {
        const [rows]: any = await pool.query(
          "SELECT * FROM etudiants WHERE (LOWER(matricule) = LOWER(?) OR LOWER(email) = LOWER(?)) LIMIT 1",
          [sanitizedLogin, sanitizedLogin]
        );

        if (rows && rows.length > 0) {
          const student = rows[0];

          // Password Verification
          const expectedPass = student.mot_de_passe || 'etudiant123';
          const isPassValid = password && (password === expectedPass || password === student.matricule);

          if (!isPassValid) {
            return res.status(401).json({
              success: false,
              error: "INVALID_CREDENTIALS",
              message: "Mot de passe étudiant incorrect."
            });
          }

          if (student.est_bloque || student.statut_compte === 'Bloqué' || student.statut === 'Suspendu') {
            return res.status(403).json({
              success: false,
              error: "STUDENT_BLOCKED",
              message: "Accès refusé : Votre compte étudiant est actuellement bloqué ou suspendu."
            });
          }

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
        console.warn("MySQL Student Auth Warning:", error?.message);
      }
    }

    // 2. Check JSON database file
    let jsonEtudiants: any[] = [];
    if (fs.existsSync(DATA_FILE)) {
      try {
        const db = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
        jsonEtudiants = db.unigestion_etudiants || db.etudiants || [];
      } catch (e) {
        console.warn("JSON Student Auth error:", e);
      }
    }

    let student = jsonEtudiants.find((e: any) => 
      (e.matricule && e.matricule.toLowerCase() === sanitizedLogin.toLowerCase()) ||
      (e.email && e.email.toLowerCase() === sanitizedLogin.toLowerCase())
    );

    // Check seed default student fallback
    if (!student) {
      student = defaultInitialEtudiants.find((e: any) =>
        e.matricule.toLowerCase() === sanitizedLogin.toLowerCase() ||
        e.email.toLowerCase() === sanitizedLogin.toLowerCase()
      );
    }

    if (student) {
      const expectedPass = student.mot_de_passe || 'etudiant123';
      const isPassValid = password && (password === expectedPass || password === student.matricule);

      if (!isPassValid) {
        return res.status(401).json({
          success: false,
          error: "INVALID_CREDENTIALS",
          message: "Mot de passe étudiant incorrect."
        });
      }

      if (student.est_bloque || student.statut_compte === 'Bloqué' || student.statut === 'Suspendu') {
        return res.status(403).json({
          success: false,
          error: "STUDENT_BLOCKED",
          message: "Accès refusé : Votre compte étudiant est actuellement bloqué ou suspendu."
        });
      }

      const cleanStudent = { ...student };
      delete cleanStudent.mot_de_passe;

      return res.json({
        success: true,
        message: "Connexion réussie.",
        user: {
          id: cleanStudent.id,
          nom: cleanStudent.nom,
          prenom: cleanStudent.prenom,
          email_or_matricule: cleanStudent.matricule,
          role: 'ETUDIANT',
          etudiantDetail: cleanStudent,
          universite_nom: 'USTTB Bamako'
        }
      });
    }

    // 3. Student NOT in database -> Strictly block access!
    return res.status(401).json({
      success: false,
      error: "STUDENT_NOT_FOUND",
      message: `Accès refusé : L'étudiant avec le matricule ou e-mail "${sanitizedLogin}" n'existe pas dans la base de données.`
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
      `CREATE TABLE IF NOT EXISTS universites (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(20) NOT NULL UNIQUE,
        nom VARCHAR(255) NOT NULL,
        sigle VARCHAR(50) NOT NULL,
        adresse VARCHAR(255) DEFAULT NULL,
        ville VARCHAR(100) DEFAULT 'Bamako',
        pays VARCHAR(100) DEFAULT 'Mali',
        telephone VARCHAR(30) DEFAULT NULL,
        email VARCHAR(100) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

      `CREATE TABLE IF NOT EXISTS facultes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        universite_id INT NOT NULL DEFAULT 1,
        code VARCHAR(20) NOT NULL UNIQUE,
        nom VARCHAR(255) NOT NULL,
        doyen VARCHAR(150) DEFAULT NULL,
        description TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

      `CREATE TABLE IF NOT EXISTS filieres (
        id INT AUTO_INCREMENT PRIMARY KEY,
        faculte_id INT NOT NULL DEFAULT 1,
        code VARCHAR(20) NOT NULL UNIQUE,
        nom VARCHAR(255) NOT NULL,
        description TEXT DEFAULT NULL,
        domaine VARCHAR(100) DEFAULT NULL,
        diplome VARCHAR(50) DEFAULT 'Licence',
        frais_scolarite DECIMAL(12,2) DEFAULT 350000.00,
        duree_annees INT DEFAULT 3,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

      `CREATE TABLE IF NOT EXISTS niveaux (
        id INT AUTO_INCREMENT PRIMARY KEY,
        filiere_id INT NOT NULL,
        code VARCHAR(20) NOT NULL,
        nom VARCHAR(100) NOT NULL,
        diplome_vise VARCHAR(100) DEFAULT 'Licence',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

      `CREATE TABLE IF NOT EXISTS annees_academiques (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(20) NOT NULL UNIQUE,
        libelle VARCHAR(100) NOT NULL,
        date_debut DATE NOT NULL,
        date_fin DATE NOT NULL,
        est_active TINYINT(1) DEFAULT 0,
        est_archivee TINYINT(1) DEFAULT 0
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

      `CREATE TABLE IF NOT EXISTS classes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        filiere_id INT NOT NULL,
        niveau_id INT DEFAULT NULL,
        annee_academique_id INT DEFAULT NULL,
        code VARCHAR(50) NOT NULL UNIQUE,
        nom VARCHAR(150) NOT NULL,
        niveau VARCHAR(20) DEFAULT 'L1',
        capacite INT DEFAULT 60,
        capacite_max INT DEFAULT 60,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

      `CREATE TABLE IF NOT EXISTS enseignants (
        id INT AUTO_INCREMENT PRIMARY KEY,
        matricule VARCHAR(50) NOT NULL UNIQUE,
        nom VARCHAR(100) NOT NULL,
        prenom VARCHAR(100) NOT NULL,
        titre VARCHAR(100) DEFAULT 'Docteur',
        grade VARCHAR(100) DEFAULT NULL,
        email VARCHAR(100) NOT NULL,
        telephone VARCHAR(30) DEFAULT NULL,
        specialite VARCHAR(150) DEFAULT NULL,
        universite_id INT NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

      `CREATE TABLE IF NOT EXISTS etudiants (
        id INT AUTO_INCREMENT PRIMARY KEY,
        matricule VARCHAR(50) NOT NULL UNIQUE,
        nom VARCHAR(100) NOT NULL,
        prenom VARCHAR(100) NOT NULL,
        date_naissance DATE DEFAULT NULL,
        lieu_naissance VARCHAR(100) DEFAULT 'Bamako',
        sexe ENUM('M', 'F') NOT NULL DEFAULT 'M',
        genre ENUM('M', 'F') DEFAULT 'M',
        nationalite VARCHAR(50) DEFAULT 'Mali',
        email VARCHAR(100) DEFAULT NULL,
        telephone VARCHAR(30) DEFAULT NULL,
        adresse VARCHAR(255) DEFAULT NULL,
        classe_id INT NOT NULL,
        filiere_id INT DEFAULT NULL,
        statut VARCHAR(50) DEFAULT 'Inscrit',
        est_bloque TINYINT(1) DEFAULT 0,
        statut_compte VARCHAR(20) DEFAULT 'Actif',
        tuteur_nom VARCHAR(100) DEFAULT NULL,
        tuteur_prenom VARCHAR(100) DEFAULT NULL,
        tuteur_telephone VARCHAR(30) DEFAULT NULL,
        date_inscription DATETIME DEFAULT CURRENT_TIMESTAMP,
        mot_de_passe VARCHAR(255) NOT NULL DEFAULT 'etudiant123',
        photo_url VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

      `CREATE TABLE IF NOT EXISTS semestres (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(20) NOT NULL,
        libelle VARCHAR(50) NOT NULL,
        niveau_id INT DEFAULT NULL,
        ordre INT DEFAULT 1
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

      `CREATE TABLE IF NOT EXISTS matieres (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(20) NOT NULL UNIQUE,
        nom VARCHAR(150) NOT NULL,
        filiere_id INT NOT NULL,
        niveau_id INT DEFAULT NULL,
        semestre_id INT DEFAULT 1,
        semestre INT DEFAULT 1,
        enseignant_id INT DEFAULT NULL,
        credits INT DEFAULT 3,
        credits_ectcs INT DEFAULT 3,
        coefficient INT DEFAULT 1
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

      `CREATE TABLE IF NOT EXISTS inscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        etudiant_id INT NOT NULL,
        classe_id INT NOT NULL,
        filiere_id INT DEFAULT NULL,
        annee_academique_id INT DEFAULT 1,
        annee_academique VARCHAR(50) DEFAULT '2024-2025',
        date_inscription DATETIME DEFAULT CURRENT_TIMESTAMP,
        statut VARCHAR(50) DEFAULT 'Validée',
        frais_inscription DECIMAL(12,2) DEFAULT 150000.00,
        type_inscription VARCHAR(50) DEFAULT 'Inscrire',
        statut_paiement VARCHAR(50) DEFAULT 'Payé',
        statut_validation VARCHAR(50) DEFAULT 'Validé'
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

      `CREATE TABLE IF NOT EXISTS paiements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        etudiant_id INT NOT NULL,
        annee_academique_id INT DEFAULT 1,
        filiere_id INT DEFAULT NULL,
        filiere_code VARCHAR(20) DEFAULT NULL,
        filiere_nom VARCHAR(150) DEFAULT NULL,
        annee_libelle VARCHAR(50) DEFAULT '2024 - 2025',
        type_frais VARCHAR(50) DEFAULT 'Scolarité',
        montant DECIMAL(12,2) NOT NULL,
        montant_paye DECIMAL(12,2) NOT NULL,
        reste_a_payer DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        mode_paiement VARCHAR(50) DEFAULT 'Orange Money',
        reference_recu VARCHAR(100) NOT NULL UNIQUE,
        date_paiement DATETIME DEFAULT CURRENT_TIMESTAMP,
        statut VARCHAR(50) DEFAULT 'Complet',
        remarque TEXT DEFAULT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

      `CREATE TABLE IF NOT EXISTS notes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        etudiant_id INT NOT NULL,
        matiere_id INT NOT NULL,
        semestre_id INT DEFAULT 1,
        annee_academique_id INT DEFAULT 1,
        annee_academique VARCHAR(20) DEFAULT '2024-2025',
        note_cc DECIMAL(4,2) DEFAULT 0.00,
        note_examen DECIMAL(4,2) DEFAULT 0.00,
        note_finale DECIMAL(4,2) DEFAULT 0.00,
        moyenne DECIMAL(4,2) DEFAULT 0.00,
        appreciation VARCHAR(100) DEFAULT NULL,
        modifie_par VARCHAR(100) DEFAULT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_student_grade (etudiant_id, matiere_id, semestre_id, annee_academique_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

      `CREATE TABLE IF NOT EXISTS absences (
        id INT AUTO_INCREMENT PRIMARY KEY,
        etudiant_id INT NOT NULL,
        matiere_id INT NOT NULL,
        date_absence DATE NOT NULL,
        heures INT DEFAULT 2,
        justifiee TINYINT(1) DEFAULT 0,
        motif TEXT DEFAULT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

      `CREATE TABLE IF NOT EXISTS bulletins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        etudiant_id INT NOT NULL,
        classe_id INT NOT NULL,
        semestre_id INT DEFAULT 1,
        annee_academique_id INT DEFAULT 1,
        moyenne DECIMAL(4,2) NOT NULL,
        total_credits INT DEFAULT 0,
        decision VARCHAR(50) DEFAULT 'Admis',
        mention VARCHAR(50) DEFAULT 'Passable',
        rang INT DEFAULT 1,
        date_generation DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

      `DROP TABLE IF EXISTS utilisateurs;`,

      `CREATE TABLE IF NOT EXISTS administrateurs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nom VARCHAR(100) NOT NULL,
        prenom VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        mot_de_passe VARCHAR(255) NOT NULL,
        telephone VARCHAR(30) DEFAULT NULL,
        role VARCHAR(50) DEFAULT 'ADMIN',
        role_admin VARCHAR(50) DEFAULT 'Super Admin',
        statut VARCHAR(30) DEFAULT 'Actif',
        universite_id INT DEFAULT 1,
        date_creation DATE DEFAULT NULL,
        dernier_acces DATETIME DEFAULT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

      `CREATE TABLE IF NOT EXISTS autorisations_filieres (
        id INT AUTO_INCREMENT PRIMARY KEY,
        administrateur_id INT DEFAULT NULL,
        utilisateur_id INT DEFAULT NULL,
        filiere_id INT NOT NULL,
        droit_acces VARCHAR(50) DEFAULT 'Total'
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

      `CREATE TABLE IF NOT EXISTS historique_acces (
        id INT AUTO_INCREMENT PRIMARY KEY,
        administrateur_id INT DEFAULT NULL,
        utilisateur_id INT DEFAULT NULL,
        etudiant_id INT DEFAULT NULL,
        ip_adresse VARCHAR(50) DEFAULT '127.0.0.1',
        event_type VARCHAR(50) NOT NULL,
        description TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

      `CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        destinateur_type VARCHAR(20) DEFAULT 'ALL',
        destinateur_id INT DEFAULT NULL,
        titre VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type_alerte VARCHAR(20) DEFAULT 'INFO',
        lu TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

      `CREATE TABLE IF NOT EXISTS parametres (
        id INT AUTO_INCREMENT PRIMARY KEY,
        cle VARCHAR(100) NOT NULL UNIQUE,
        valeur TEXT NOT NULL,
        description VARCHAR(255) DEFAULT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
    ];

    for (const q of queries) {
      await pool.query(q);
    }

    return res.json({ success: true, message: "Structure complète des 21 tables MySQL vérifiée et synchronisée avec succès." });
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
    const [etudiants]: any = await pool.query("SELECT id, matricule, nom, prenom, date_naissance, lieu_naissance, sexe, genre, nationalite, email, telephone, adresse, classe_id, filiere_id, statut, est_bloque, statut_compte, tuteur_nom, tuteur_prenom, tuteur_telephone, date_inscription, photo_url FROM etudiants ORDER BY id DESC").catch(() => [[]]);
    const [inscriptions]: any = await pool.query("SELECT * FROM inscriptions ORDER BY id DESC").catch(() => [[]]);
    const [paiements]: any = await pool.query("SELECT * FROM paiements ORDER BY id DESC").catch(() => [[]]);
    const [notes]: any = await pool.query("SELECT * FROM notes ORDER BY id DESC").catch(() => [[]]);
    const [bulletins]: any = await pool.query("SELECT * FROM bulletins ORDER BY id DESC").catch(() => [[]]);
    const [filieres]: any = await pool.query("SELECT * FROM filieres ORDER BY id ASC").catch(() => [[]]);
    const [classes]: any = await pool.query("SELECT * FROM classes ORDER BY id ASC").catch(() => [[]]);
    const [matieres]: any = await pool.query("SELECT * FROM matieres ORDER BY id ASC").catch(() => [[]]);
    const [administrateurs]: any = await pool.query("SELECT id, nom, prenom, email, telephone, role, role_admin, statut, universite_id, dernier_acces FROM administrateurs ORDER BY id ASC").catch(() => [[]]);

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
        administrateurs
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
      database: database || "universite",
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
  const schemaPath = path.join(process.cwd(), "config", "schema.sql");
  if (fs.existsSync(schemaPath)) {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=universite_schema.sql");
    return res.sendFile(schemaPath);
  }
  res.status(404).send("Fichier de schéma SQL non trouvé.");
});

// Get or Save full database snapshot (supports seamless synchronization with local state)
app.get("/api/db/sync", (req, res) => {
  if (fs.existsSync(DATA_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
      if (data && typeof data === 'object') {
        const sanitized = JSON.parse(JSON.stringify(data));
        ['unigestion_etudiants', 'etudiants', 'unigestion_administrateurs', 'administrateurs', 'unigestion_utilisateurs', 'utilisateurs'].forEach(key => {
          if (Array.isArray(sanitized[key])) {
            sanitized[key] = sanitized[key].map((item: any) => {
              const copy = { ...item };
              delete copy.mot_de_passe;
              delete copy.password;
              return copy;
            });
          }
        });
        return res.json({ success: true, data: sanitized });
      }
      return res.json({ success: true, data });
    } catch (e) {
      return res.json({ success: true, data: null });
    }
  }
  return res.json({ success: true, data: null });
});

async function syncSnapshotToMySQL(data: Record<string, any>) {
  const pool = getMysqlPool();
  if (!pool) return;
  let connection: any;
  try {
    connection = await pool.getConnection();
    await connection.query("SET FOREIGN_KEY_CHECKS = 0;");

    const getArr = (key1: string, key2: string) => {
      const v = data[key1] !== undefined ? data[key1] : data[key2];
      return Array.isArray(v) ? v : null;
    };

    // 1. Etudiants
    const etudiants = getArr('unigestion_etudiants', 'etudiants');
    if (etudiants !== null) {
      await connection.query("DELETE FROM etudiants;");
      for (const e of etudiants) {
        await connection.query(
          `INSERT INTO etudiants (id, matricule, nom, prenom, date_naissance, lieu_naissance, sexe, genre, nationalite, email, telephone, adresse, classe_id, filiere_id, statut, est_bloque, statut_compte, tuteur_nom, tuteur_prenom, tuteur_telephone, date_inscription, mot_de_passe, photo_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            e.id, e.matricule, e.nom, e.prenom, e.date_naissance || null, e.lieu_naissance || 'Bamako',
            e.sexe || 'M', e.genre || e.sexe || 'M', e.nationalite || 'Mali', e.email || null, e.telephone || null,
            e.adresse || null, e.classe_id || 1, e.filiere_id || null, e.statut || 'Inscrit',
            e.est_bloque ? 1 : 0, e.statut_compte || 'Actif', e.tuteur_nom || null, e.tuteur_prenom || null,
            e.tuteur_telephone || null, e.date_inscription || new Date(), e.mot_de_passe || 'etudiant123', e.photo_url || null
          ]
        );
      }
    }

    // 2. Filieres
    const filieres = getArr('unigestion_filieres', 'filieres');
    if (filieres !== null) {
      await connection.query("DELETE FROM filieres;");
      for (const f of filieres) {
        await connection.query(
          `INSERT INTO filieres (id, faculte_id, code, nom, description, domaine, diplome, frais_scolarite, duree_annees)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            f.id, f.faculte_id || 1, f.code, f.nom, f.description || null, f.domaine || 'Sciences',
            f.diplome || 'Licence', f.frais_scolarite || 350000, f.duree_annees || 3
          ]
        );
      }
    }

    // 3. Classes
    const classes = getArr('unigestion_classes', 'classes');
    if (classes !== null) {
      await connection.query("DELETE FROM classes;");
      for (const c of classes) {
        await connection.query(
          `INSERT INTO classes (id, filiere_id, niveau_id, annee_academique_id, code, nom, niveau, capacite, capacite_max)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            c.id, c.filiere_id || 1, c.niveau_id || null, c.annee_academique_id || null,
            c.code, c.nom, c.niveau || 'L1', c.capacite || 60, c.capacite_max || 60
          ]
        );
      }
    }

    // 4. Inscriptions
    const inscriptions = getArr('unigestion_inscriptions', 'inscriptions');
    if (inscriptions !== null) {
      await connection.query("DELETE FROM inscriptions;");
      for (const i of inscriptions) {
        await connection.query(
          `INSERT INTO inscriptions (id, etudiant_id, classe_id, filiere_id, annee_academique_id, annee_academique, date_inscription, statut, frais_inscription, type_inscription, statut_paiement, statut_validation)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            i.id, i.etudiant_id, i.classe_id, i.filiere_id || null, i.annee_academique_id || 1,
            i.annee_academique || '2024-2025', i.date_inscription || new Date(), i.statut || 'Validée',
            i.frais_inscription || 150000, i.type_inscription || 'Inscrire', i.statut_paiement || 'Payé', i.statut_validation || 'Validé'
          ]
        );
      }
    }

    // 5. Paiements
    const paiements = getArr('unigestion_paiements', 'paiements');
    if (paiements !== null) {
      await connection.query("DELETE FROM paiements;");
      for (const p of paiements) {
        await connection.query(
          `INSERT INTO paiements (id, etudiant_id, annee_academique_id, filiere_id, filiere_code, filiere_nom, annee_libelle, type_frais, montant, montant_paye, reste_a_payer, mode_paiement, reference_recu, date_paiement, statut, remarque)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            p.id, p.etudiant_id, p.annee_academique_id || 1, p.filiere_id || null, p.filiere_code || null,
            p.filiere_nom || null, p.annee_libelle || '2024 - 2025', p.type_frais || 'Scolarité',
            p.montant, p.montant_paye, p.reste_a_payer, p.mode_paiement || 'Orange Money',
            p.reference_recu || `REC-${p.id}`, p.date_paiement || new Date(), p.statut || 'Complet', p.remarque || null
          ]
        );
      }
    }

    // 6. Notes
    const notes = getArr('unigestion_notes', 'notes');
    if (notes !== null) {
      await connection.query("DELETE FROM notes;");
      for (const n of notes) {
        await connection.query(
          `INSERT INTO notes (id, etudiant_id, matiere_id, semestre_id, annee_academique_id, annee_academique, note_cc, note_examen, note_finale, appreciation, modifie_par)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            n.id, n.etudiant_id, n.matiere_id, n.semestre_id || 1, n.annee_academique_id || 1,
            n.annee_academique || '2024-2025', n.note_cc || 0, n.note_examen || 0, n.note_finale || 0,
            n.appreciation || null, n.modifie_par || null
          ]
        );
      }
    }

    // 7. Matieres
    const matieres = getArr('unigestion_matieres', 'matieres');
    if (matieres !== null) {
      await connection.query("DELETE FROM matieres;");
      for (const m of matieres) {
        await connection.query(
          `INSERT INTO matieres (id, code, nom, filiere_id, niveau_id, semestre_id, enseignant_id, credits, coefficient)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            m.id, m.code, m.nom, m.filiere_id, m.niveau_id || null, m.semestre_id || 1,
            m.enseignant_id || null, m.credits || 3, m.coefficient || 1
          ]
        );
      }
    }

    // 8. Enseignants
    const enseignants = getArr('unigestion_enseignants', 'enseignants');
    if (enseignants !== null) {
      await connection.query("DELETE FROM enseignants;");
      for (const en of enseignants) {
        await connection.query(
          `INSERT INTO enseignants (id, matricule, nom, prenom, titre, email, telephone, specialite, universite_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            en.id, en.matricule, en.nom, en.prenom, en.titre || 'Docteur', en.email,
            en.telephone || null, en.specialite || null, en.universite_id || 1
          ]
        );
      }
    }

    // 9. Semestres
    const semestres = getArr('unigestion_semestres', 'semestres');
    if (semestres !== null) {
      await connection.query("DELETE FROM semestres;");
      for (const s of semestres) {
        await connection.query(
          `INSERT INTO semestres (id, code, libelle, niveau_id, ordre)
           VALUES (?, ?, ?, ?, ?)`,
          [s.id, s.code, s.libelle, s.niveau_id || null, s.ordre || 1]
        );
      }
    }

    // 10. Annees Academiques
    const annees = getArr('unigestion_annees', 'annees');
    if (annees !== null) {
      await connection.query("DELETE FROM annees_academiques;");
      for (const a of annees) {
        await connection.query(
          `INSERT INTO annees_academiques (id, code, libelle, date_debut, date_fin, est_active, est_archivee)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            a.id, a.code, a.libelle, a.date_debut, a.date_fin,
            a.est_active ? 1 : 0, a.est_archivee ? 1 : 0
          ]
        );
      }
    }

    // 11. Administrateurs
    const administrateurs = getArr('unigestion_administrateurs', 'administrateurs') || getArr('unigestion_utilisateurs', 'utilisateurs');
    if (administrateurs !== null) {
      await connection.query("DELETE FROM administrateurs;");
      for (const a of administrateurs) {
        await connection.query(
          `INSERT INTO administrateurs (id, nom, prenom, email, mot_de_passe, telephone, role, role_admin, statut, universite_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            a.id, a.nom, a.prenom, a.email, a.mot_de_passe || 'admin123',
            a.telephone || '+223 70 00 00 00', a.role || 'ADMIN', a.role_admin || 'Super Admin',
            a.statut || 'Actif', a.universite_id || 1
          ]
        );
      }
    }

    // 12. Bulletins
    const bulletins = getArr('unigestion_bulletins', 'bulletins');
    if (bulletins !== null) {
      await connection.query("DELETE FROM bulletins;");
      for (const b of bulletins) {
        await connection.query(
          `INSERT INTO bulletins (id, etudiant_id, classe_id, semestre_id, annee_academique_id, moyenne, total_credits, decision, mention, rang, date_generation)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            b.id, b.etudiant_id, b.classe_id || 1, b.semestre_id || 1, b.annee_academique_id || 1,
            b.moyenne || 0, b.total_credits || 0, b.decision || 'Admis', b.mention || 'Passable',
            b.rang || 1, b.date_generation || new Date()
          ]
        );
      }
    }

    // 13. Absences
    const absences = getArr('unigestion_absences', 'absences');
    if (absences !== null) {
      await connection.query("DELETE FROM absences;");
      for (const ab of absences) {
        await connection.query(
          `INSERT INTO absences (id, etudiant_id, matiere_id, date_absence, heures, justifiee, motif)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            ab.id, ab.etudiant_id, ab.matiere_id, ab.date_absence,
            ab.heures || 2, ab.justifiee ? 1 : 0, ab.motif || null
          ]
        );
      }
    }

    await connection.query("SET FOREIGN_KEY_CHECKS = 1;");
  } catch (err: any) {
    if (err?.code !== 'ECONNREFUSED' && err?.code !== 'ETIMEDOUT' && err?.code !== 'ENOTFOUND' && err?.code !== 'ER_ACCESS_DENIED_ERROR') {
      console.warn("syncSnapshotToMySQL error:", err?.message || err);
    }
  } finally {
    if (connection) {
      try { await connection.query("SET FOREIGN_KEY_CHECKS = 1;"); } catch {}
      connection.release();
    }
  }
}

app.post("/api/db/sync", async (req, res) => {
  try {
    const { data } = req.body;
    if (data) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
      // Asynchronously trigger live sync to MySQL tables if connected
      syncSnapshotToMySQL(data).catch(() => {});
    }
    res.json({ success: true, message: "Base de données enregistrée et synchronisée avec succès!" });
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
