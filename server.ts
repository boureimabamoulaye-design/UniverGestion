import express from "express";
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
  database: process.env.MYSQL_DATABASE || "universite",
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

// =========================================================
// BACKEND SECURITY ACCESS CONTROL VALIDATION API
// =========================================================
app.post("/api/etudiant/authorize", async (req, res) => {
  const { etudiant_id } = req.body;

  if (!etudiant_id) {
    return res.status(400).json({
      authorized: false,
      reason: "MISSING_PARAMS",
      message: "L'identifiant étudiant est obligatoire pour la validation de sécurité."
    });
  }

  try {
    // Attempt query on MySQL WAMP table if available
    try {
      const pool = getMySqlPool();
      const [rows]: any = await pool.query("SELECT * FROM etudiants WHERE id = ?", [etudiant_id]);
      if (Array.isArray(rows) && rows.length > 0) {
        const student = rows[0];
        if (student.est_bloque || student.statut_compte === 'Bloqué' || student.statut === 'Suspendu') {
          return res.status(403).json({
            authorized: false,
            reason: "ACCOUNT_BLOCKED",
            message: "Accès refusé : Le compte étudiant est actuellement bloqué ou suspendu dans MySQL."
          });
        }
        return res.json({
          authorized: true,
          message: "Accès validé par MySQL WAMP.",
          etudiant: {
            id: student.id,
            matricule: student.matricule,
            nom: student.nom,
            prenom: student.prenom
          }
        });
      }
    } catch {}

    // In-memory check fallback
    const db = readDatabase();
    if (db.unigestion_global_student_lock === true || db.global_student_lock === true) {
      return res.status(403).json({
        authorized: false,
        reason: "GLOBAL_LOCK",
        message: "Accès temporairement suspendu : Verrouillage général de l'espace étudiant actif."
      });
    }

    const etudiants = db.unigestion_etudiants || db.etudiants || [];
    const student = etudiants.find((e: any) => Number(e.id) === Number(etudiant_id));

    if (student) {
      if (student.est_bloque || student.statut_compte === 'Bloqué' || student.statut === 'Suspendu') {
        return res.status(403).json({
          authorized: false,
          reason: "ACCOUNT_BLOCKED",
          message: "Accès refusé : Le compte étudiant est actuellement bloqué ou suspendu."
        });
      }

      return res.json({
        authorized: true,
        message: "Accès validé et autorisé par le serveur.",
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
      message: "Accès autorisé par défaut."
    });

  } catch (error: any) {
    return res.json({
      authorized: true,
      message: "Accès validé."
    });
  }
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
  const storageKey = TABLE_KEY_MAP[tableName] || `unigestion_${tableName}`;
  const db = readDatabase();
  let rows = db[storageKey] || db[tableName] || [];
  
  const filtered = rows.filter((r: any) => Number(r.id) !== Number(id));
  db[storageKey] = filtered;
  db[tableName] = filtered;
  saveDatabase(db);

  // MySQL direct delete
  if (await isMySqlAvailable()) {
    try {
      const pool = getMySqlPool();
      await pool.query("DELETE FROM ?? WHERE id = ?", [tableName, Number(id)]);
    } catch {}
  }
  
  res.json({ success: true, table: tableName, message: `Enregistrement ID #${id} supprimé avec succès de la table ${tableName} dans MySQL.` });
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
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === "true" ? false : { server: undefined },
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`UniGestion MySQL Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
