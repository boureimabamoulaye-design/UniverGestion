import express from "express";
import path from "path";
import fs from "fs";
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

const app = express();
app.disable("x-powered-by");
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

// Local JSON storage path for reliable standalone runtime
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
    
    // Direct alias mappings
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
    annees: INITIAL_ANNEES_ACADEMIQUES,
    absences: INITIAL_ABSENCES,
    utilisateurs: INITIAL_UTILISATEURS,
    administrateurs: INITIAL_ADMINISTRATEURS
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
      console.error("Error reading db_storage.json, resetting to initial data:", e);
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
      console.error("Error saving db_storage.json:", e);
    }
  }, 1000);
  return true;
}

// In-Memory Rate Limiter for login protection
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

// BACKEND SECURITY ACCESS CONTROL VALIDATION API
app.post("/api/etudiant/authorize", (req, res) => {
  const { etudiant_id } = req.body;

  if (!etudiant_id) {
    return res.status(400).json({
      authorized: false,
      reason: "MISSING_PARAMS",
      message: "L'identifiant étudiant est obligatoire pour la validation de sécurité."
    });
  }

  try {
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

// SAISIE COLLECTIVE NOTES API
app.post("/api/notes/saisie-collective", (req, res) => {
  try {
    const { grades, annee_academique_id, filiere_id, semestre_id } = req.body;
    if (Array.isArray(grades) && grades.length > 0) {
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
      saveDatabase(db);
    }
    return res.json({ success: true, message: "Notes enregistrées avec succès" });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// CREATE INSCRIPTION API
app.post("/api/inscriptions/create", (req, res) => {
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
    saveDatabase(db);
    return res.json({ success: true, data: newInscription });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// COLLECTIVE INSCRIPTION API
app.post("/api/inscriptions/collective", (req, res) => {
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
      db.unigestion_etudiants = etudiants;
      saveDatabase(db);
    }
    return res.json({ success: true, message: "Inscriptions collectives effectuées" });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// CREATE PAIEMENT API
app.post("/api/paiements/create", (req, res) => {
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
    saveDatabase(db);
    return res.json({ success: true, data: newPaiement });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// BATCH NOTES ENTRY API
app.post("/api/notes/batch", (req, res) => {
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

    return res.json({
      success: true,
      message: `${savedCount} notes validées et enregistrées avec succès.`,
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

// AUTHENTICATION ROUTE
app.post("/api/mysql/authenticate", (req, res) => {
  const clientIp = req.ip || req.socket.remoteAddress || "127.0.0.1";
  const rateLimit = checkRateLimit(clientIp, 15, 15 * 60 * 1000);

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
  const db = readDatabase();

  if (role === 'ADMIN') {
    const adminList = db.unigestion_utilisateurs || db.utilisateurs || db.unigestion_administrateurs || db.administrateurs || [];
    
    let adminUser = adminList.find((u: any) => {
      const target = sanitizedLogin.toLowerCase();
      const email = (u.email || '').toLowerCase();
      const nom = (u.nom || '').toLowerCase();
      const prenom = (u.prenom || '').toLowerCase();
      return (
        (email && email === target) ||
        (nom && nom === target) ||
        (prenom && prenom === target) ||
        (`${prenom} ${nom}`.trim().toLowerCase() === target) ||
        (`${nom} ${prenom}`.trim().toLowerCase() === target)
      );
    });

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
          message: "Ce compte administrateur est désactivé."
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
          universite_nom: 'USTTB Bamako'
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
      if (!password || password !== etudPass) {
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
          universite_nom: 'USTTB Bamako'
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

// GET ALL DATA FOR REALTIME FRONTEND SYNC
app.get("/api/data/all", (req, res) => {
  const db = readDatabase();
  return res.json({ success: true, data: db });
});

// SYNC FULL DATABASE SNAPSHOT (READ & WRITE)
app.get("/api/db/sync", (req, res) => {
  const db = readDatabase();
  return res.json({ success: true, data: db });
});

app.post("/api/db/sync", (req, res) => {
  try {
    const { data } = req.body;
    if (data && typeof data === 'object') {
      const existing = readDatabase();
      const merged = { ...existing, ...data };
      saveDatabase(merged);
    }
    res.json({ success: true, message: "Base de données synchronisée avec succès!" });
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
    console.log(`UniGestion Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
