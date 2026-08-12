import {
  Universite,
  Faculte,
  Filiere,
  Niveau,
  Classe,
  AnneeAcademique,
  Etudiant,
  Enseignant,
  Semestre,
  Matiere,
  Inscription,
  Note,
  Absence,
  Bulletin,
  Paiement,
  Utilisateur,
  Administrateur,
  NotificationAlerte,
  HistoriqueAcces,
  CorbeilleItem,
  SupportCours
} from '../types/database';

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
} from '../data/initialData';

const STORAGE_KEYS = {
  UNIVERSITES: 'unigestion_universites',
  FACULTES: 'unigestion_facultes',
  FILIERES: 'unigestion_filieres',
  NIVEAUX: 'unigestion_niveaux',
  ANNEES: 'unigestion_annees',
  CLASSES: 'unigestion_classes',
  ENSEIGNANTS: 'unigestion_enseignants',
  SEMESTRES: 'unigestion_semestres',
  MATIERES: 'unigestion_matieres',
  ETUDIANTS: 'unigestion_etudiants',
  INSCRIPTIONS: 'unigestion_inscriptions',
  NOTES: 'unigestion_notes',
  ABSENCES: 'unigestion_absences',
  BULLETINS: 'unigestion_bulletins',
  PAIEMENTS: 'unigestion_paiements',
  UTILISATEURS: 'unigestion_utilisateurs',
  ADMINISTRATEURS: 'unigestion_administrateurs',
  NOTIFICATIONS: 'unigestion_notifications',
  HISTORIQUE: 'unigestion_historique',
  CORBEILLE: 'unigestion_corbeille',
  SUPPORTS_COURS: 'unigestion_supports_cours',
  GLOBAL_STUDENT_LOCK: 'unigestion_global_student_lock',
};

const inMemoryStore: Record<string, string> = {};

function getItem<T>(key: string, defaultValue: T): T {
  try {
    const item = inMemoryStore[key];
    if (item !== undefined && item !== null) {
      return JSON.parse(item);
    }
    const local = localStorage.getItem(key);
    if (local !== null && local !== undefined) {
      inMemoryStore[key] = local;
      return JSON.parse(local);
    }
    return defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

let syncTimer: any = null;

function triggerServerSync() {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    try {
      const fullSnapshot: Record<string, any> = {};
      Object.entries(STORAGE_KEYS).forEach(([_, key]) => {
        const val = inMemoryStore[key] || localStorage.getItem(key);
        if (val) {
          try {
            fullSnapshot[key] = JSON.parse(val);
          } catch {}
        }
      });

      await fetch('/api/db/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: fullSnapshot })
      });
    } catch (e) {
      console.warn("Server DB sync error:", e);
    }
  }, 200);
}

function setItemWithoutSync<T>(key: string, value: T): void {
  try {
    const str = JSON.stringify(value);
    inMemoryStore[key] = str;
    try {
      localStorage.setItem(key, str);
    } catch (e) {
      console.error(`Error saving ${key} to localStorage:`, e);
    }
    window.dispatchEvent(new CustomEvent('unigestion_db_change', { detail: { key, value } }));
  } catch (e) {
    console.error(`Error saving ${key}`, e);
  }
}

function setItem<T>(key: string, value: T): void {
  setItemWithoutSync(key, value);
  triggerServerSync();
}

export class DB {
  static async initStorage(): Promise<void> {
    // 1. Populate memory from localStorage
    Object.values(STORAGE_KEYS).forEach(key => {
      try {
        const local = localStorage.getItem(key);
        if (local) inMemoryStore[key] = local;
      } catch {}
    });

    // 2. Load backend database snapshot (/api/db/sync)
    try {
      const res = await fetch('/api/db/sync');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          Object.entries(json.data).forEach(([key, val]) => {
            if (val !== undefined && val !== null) {
              const str = typeof val === 'string' ? val : JSON.stringify(val);
              inMemoryStore[key] = str;
              try { localStorage.setItem(key, str); } catch {}
            }
          });
        }
      }
    } catch (e) {
      console.warn("Failed to sync from backend:", e);
    }

    // 3. Sync from live MySQL if backend MySQL pool is connected
    await this.syncFromMySQL();
  }
  // Getters
  static getUniversites(): Universite[] {
    return getItem(STORAGE_KEYS.UNIVERSITES, INITIAL_UNIVERSITES);
  }

  static getFacultes(): Faculte[] {
    return getItem(STORAGE_KEYS.FACULTES, INITIAL_FACULTES);
  }

  static getFilieres(): Filiere[] {
    return getItem(STORAGE_KEYS.FILIERES, INITIAL_FILIERES);
  }

  static getNiveaux(): Niveau[] {
    return getItem(STORAGE_KEYS.NIVEAUX, INITIAL_NIVEAUX);
  }

  static getAnneesAcademiques(): AnneeAcademique[] {
    return getItem(STORAGE_KEYS.ANNEES, INITIAL_ANNEES_ACADEMIQUES);
  }

  static getClasses(): Classe[] {
    return getItem(STORAGE_KEYS.CLASSES, INITIAL_CLASSES);
  }

  static getEnseignants(): Enseignant[] {
    return getItem(STORAGE_KEYS.ENSEIGNANTS, INITIAL_ENSEIGNANTS);
  }

  static getSemestres(): Semestre[] {
    return getItem(STORAGE_KEYS.SEMESTRES, INITIAL_SEMESTRES);
  }

  static async syncFromMySQL(): Promise<boolean> {
    try {
      const res = await fetch('/api/data/all');
      if (!res.ok) return false;
      const json = await res.json();
      if (json.success && json.data) {
        const data = json.data;
        const getArr = (key1: string, key2: string) => {
          const val = data[key1] !== undefined ? data[key1] : data[key2];
          return Array.isArray(val) ? val : null;
        };

        const etudiants = getArr('unigestion_etudiants', 'etudiants');
        if (etudiants) setItemWithoutSync(STORAGE_KEYS.ETUDIANTS, etudiants);

        const inscriptions = getArr('unigestion_inscriptions', 'inscriptions');
        if (inscriptions) setItemWithoutSync(STORAGE_KEYS.INSCRIPTIONS, inscriptions);

        const paiements = getArr('unigestion_paiements', 'paiements');
        if (paiements) setItemWithoutSync(STORAGE_KEYS.PAIEMENTS, paiements);

        const notes = getArr('unigestion_notes', 'notes');
        if (notes) setItemWithoutSync(STORAGE_KEYS.NOTES, notes);

        const bulletins = getArr('unigestion_bulletins', 'bulletins');
        if (bulletins) setItemWithoutSync(STORAGE_KEYS.BULLETINS, bulletins);

        const filieres = getArr('unigestion_filieres', 'filieres');
        if (filieres) setItemWithoutSync(STORAGE_KEYS.FILIERES, filieres);

        const classes = getArr('unigestion_classes', 'classes');
        if (classes) setItemWithoutSync(STORAGE_KEYS.CLASSES, classes);

        const matieres = getArr('unigestion_matieres', 'matieres');
        if (matieres) setItemWithoutSync(STORAGE_KEYS.MATIERES, matieres);

        const enseignants = getArr('unigestion_enseignants', 'enseignants');
        if (enseignants) setItemWithoutSync(STORAGE_KEYS.ENSEIGNANTS, enseignants);

        const semestres = getArr('unigestion_semestres', 'semestres');
        if (semestres) setItemWithoutSync(STORAGE_KEYS.SEMESTRES, semestres);

        const annees = getArr('unigestion_annees', 'annees');
        if (annees) setItemWithoutSync(STORAGE_KEYS.ANNEES, annees);

        const administrateurs = getArr('unigestion_administrateurs', 'administrateurs') || getArr('unigestion_utilisateurs', 'utilisateurs');
        if (administrateurs) {
          setItemWithoutSync(STORAGE_KEYS.ADMINISTRATEURS, administrateurs);
          setItemWithoutSync(STORAGE_KEYS.UTILISATEURS, administrateurs);
        }

        const absences = getArr('unigestion_absences', 'absences');
        if (absences) setItemWithoutSync(STORAGE_KEYS.ABSENCES, absences);

        return true;
      }
    } catch (err) {
      console.error("Erreur lors de la synchronisation MySQL", err);
    }
    return false;
  }

  static getMatieres(): Matiere[] {
    return getItem(STORAGE_KEYS.MATIERES, INITIAL_MATIERES);
  }

  static getEtudiants(): Etudiant[] {
    return getItem(STORAGE_KEYS.ETUDIANTS, INITIAL_ETUDIANTS);
  }

  static getInscriptions(): Inscription[] {
    return getItem(STORAGE_KEYS.INSCRIPTIONS, INITIAL_INSCRIPTIONS);
  }

  static getNotes(): Note[] {
    return getItem(STORAGE_KEYS.NOTES, INITIAL_NOTES);
  }

  static getAbsences(): Absence[] {
    return getItem(STORAGE_KEYS.ABSENCES, INITIAL_ABSENCES);
  }

  static getBulletins(): Bulletin[] {
    return getItem(STORAGE_KEYS.BULLETINS, INITIAL_BULLETINS);
  }

  static getPaiements(): Paiement[] {
    return getItem(STORAGE_KEYS.PAIEMENTS, INITIAL_PAIEMENTS);
  }

  static getUtilisateurs(): Utilisateur[] {
    const list = getItem(STORAGE_KEYS.UTILISATEURS, []);
    if (list && list.length > 0) return list;
    return getItem(STORAGE_KEYS.ADMINISTRATEURS, INITIAL_ADMINISTRATEURS);
  }

  static getAdministrateurs(): Administrateur[] {
    return this.getUtilisateurs();
  }

  static getNotifications(): NotificationAlerte[] {
    return getItem(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
  }

  static getHistorique(): HistoriqueAcces[] {
    return getItem(STORAGE_KEYS.HISTORIQUE, INITIAL_HISTORIQUE);
  }

  static getSupportsCours(): SupportCours[] {
    return getItem(STORAGE_KEYS.SUPPORTS_COURS, INITIAL_SUPPORTS_COURS);
  }

  static saveSupportCours(item: Omit<SupportCours, 'id'> & { id?: number }): SupportCours {
    const list = this.getSupportsCours();
    let result: SupportCours;
    if (item.id) {
      const idx = list.findIndex(s => s.id === item.id);
      if (idx !== -1) list[idx] = { ...list[idx], ...item };
      result = list[idx];
    } else {
      const nextId = Math.max(0, ...list.map(s => s.id)) + 1;
      result = { ...item, id: nextId } as SupportCours;
      list.push(result);
    }
    setItem(STORAGE_KEYS.SUPPORTS_COURS, list);
    return result;
  }

  static deleteSupportCours(id: number): void {
    setItem(STORAGE_KEYS.SUPPORTS_COURS, this.getSupportsCours().filter(s => s.id !== id));
  }

  // Active Academic Year helper
  static getActiveAnneeAcademique(): AnneeAcademique {
    const annees = this.getAnneesAcademiques();
    return annees.find(a => a.est_active) || annees[0] || {
      id: 1,
      code: '2024-2025',
      libelle: 'Année Académique 2024 - 2025',
      date_debut: '2024-10-01',
      date_fin: '2025-07-31',
      est_active: true
    };
  }

  // Generic Save Helpers
  static saveUniversite(item: Omit<Universite, 'id'> & { id?: number }): Universite {
    const list = this.getUniversites();
    let result: Universite;
    if (item.id) {
      list.map(u => u.id === item.id ? (result = { ...u, ...item } as Universite) : u);
      const idx = list.findIndex(u => u.id === item.id);
      if (idx !== -1) list[idx] = { ...list[idx], ...item };
      result = list[idx];
    } else {
      const nextId = Math.max(0, ...list.map(u => u.id)) + 1;
      result = { ...item, id: nextId } as Universite;
      list.push(result);
    }
    setItem(STORAGE_KEYS.UNIVERSITES, list);
    return result;
  }

  static deleteUniversite(id: number): void {
    const list = this.getUniversites().filter(u => u.id !== id);
    setItem(STORAGE_KEYS.UNIVERSITES, list);
  }

  static saveFaculte(item: Omit<Faculte, 'id'> & { id?: number }): Faculte {
    const list = this.getFacultes();
    let result: Faculte;
    if (item.id) {
      const idx = list.findIndex(f => f.id === item.id);
      if (idx !== -1) list[idx] = { ...list[idx], ...item };
      result = list[idx];
    } else {
      const nextId = Math.max(0, ...list.map(f => f.id)) + 1;
      result = { ...item, id: nextId } as Faculte;
      list.push(result);
    }
    setItem(STORAGE_KEYS.FACULTES, list);
    return result;
  }

  static deleteFaculte(id: number): void {
    setItem(STORAGE_KEYS.FACULTES, this.getFacultes().filter(f => f.id !== id));
  }

  static saveFiliere(item: Omit<Filiere, 'id'> & { id?: number }): Filiere {
    const list = this.getFilieres();
    let result: Filiere;
    if (item.id) {
      const idx = list.findIndex(f => f.id === item.id);
      if (idx !== -1) list[idx] = { ...list[idx], ...item };
      result = list[idx];
    } else {
      const nextId = Math.max(0, ...list.map(f => f.id)) + 1;
      result = { ...item, id: nextId } as Filiere;
      list.push(result);
    }
    setItem(STORAGE_KEYS.FILIERES, list);
    return result;
  }

  static deleteFiliere(id: number): void {
    setItem(STORAGE_KEYS.FILIERES, this.getFilieres().filter(f => f.id !== id));
  }

  static saveSemestre(item: Omit<Semestre, 'id'> & { id?: number }): Semestre {
    const list = this.getSemestres();
    let result: Semestre;
    if (item.id) {
      const idx = list.findIndex(s => s.id === item.id);
      if (idx !== -1) list[idx] = { ...list[idx], ...item };
      result = list[idx];
    } else {
      const nextId = Math.max(0, ...list.map(s => s.id)) + 1;
      result = { ...item, id: nextId } as Semestre;
      list.push(result);
    }
    setItem(STORAGE_KEYS.SEMESTRES, list);
    return result;
  }

  static deleteSemestre(id: number): void {
    const sem = this.getSemestres().find(s => s.id === id);
    if (sem) {
      this.moveToCorbeille('SEMESTRE', sem.id, `${sem.code} - ${sem.libelle}`, `Semestre ${sem.libelle}`, sem);
    }
    setItem(STORAGE_KEYS.SEMESTRES, this.getSemestres().filter(s => s.id !== id));
  }

  static saveNiveau(item: Omit<Niveau, 'id'> & { id?: number }): Niveau {
    const list = this.getNiveaux();
    let result: Niveau;
    if (item.id) {
      const idx = list.findIndex(n => n.id === item.id);
      if (idx !== -1) list[idx] = { ...list[idx], ...item };
      result = list[idx];
    } else {
      const nextId = Math.max(0, ...list.map(n => n.id)) + 1;
      result = { ...item, id: nextId } as Niveau;
      list.push(result);
    }
    setItem(STORAGE_KEYS.NIVEAUX, list);
    return result;
  }

  static deleteNiveau(id: number): void {
    setItem(STORAGE_KEYS.NIVEAUX, this.getNiveaux().filter(n => n.id !== id));
  }

  static saveClasse(item: Omit<Classe, 'id'> & { id?: number }): Classe {
    const list = this.getClasses();
    let result: Classe;
    if (item.id) {
      const idx = list.findIndex(c => c.id === item.id);
      if (idx !== -1) list[idx] = { ...list[idx], ...item };
      result = list[idx];
    } else {
      const nextId = Math.max(0, ...list.map(c => c.id)) + 1;
      result = { ...item, id: nextId } as Classe;
      list.push(result);
    }
    setItem(STORAGE_KEYS.CLASSES, list);
    return result;
  }

  static deleteClasse(id: number): void {
    setItem(STORAGE_KEYS.CLASSES, this.getClasses().filter(c => c.id !== id));
  }

  static saveAnneeAcademique(item: Omit<AnneeAcademique, 'id'> & { id?: number }): AnneeAcademique {
    let list = this.getAnneesAcademiques();
    if (item.est_active) {
      list = list.map(a => ({ ...a, est_active: false }));
    }
    let result: AnneeAcademique;
    if (item.id) {
      const idx = list.findIndex(a => a.id === item.id);
      if (idx !== -1) list[idx] = { ...list[idx], ...item };
      result = list[idx];
    } else {
      const nextId = Math.max(0, ...list.map(a => a.id)) + 1;
      result = { ...item, id: nextId } as AnneeAcademique;
      list.push(result);
    }
    setItem(STORAGE_KEYS.ANNEES, list);
    return result;
  }

  static setActiveAnneeAcademique(id: number): void {
    const list = this.getAnneesAcademiques().map(a => ({
      ...a,
      est_active: a.id === id
    }));
    setItem(STORAGE_KEYS.ANNEES, list);
  }

  static deleteAnneeAcademique(id: number): void {
    setItem(STORAGE_KEYS.ANNEES, this.getAnneesAcademiques().filter(a => a.id !== id));
  }

  static saveEtudiant(item: Omit<Etudiant, 'id'> & { id?: number }): Etudiant {
    const list = this.getEtudiants();
    const classes = this.getClasses();
    
    // Auto-link filiere_id and niveau_id from classe_id
    let filiere_id = item.filiere_id;
    let niveau_id = item.niveau_id;
    if (item.classe_id) {
      const cls = classes.find(c => c.id === Number(item.classe_id));
      if (cls) {
        if (cls.filiere_id) filiere_id = cls.filiere_id;
        if (cls.niveau_id) niveau_id = cls.niveau_id;
      }
    }

    const itemWithFiliere = {
      ...item,
      ...(filiere_id ? { filiere_id } : {}),
      ...(niveau_id ? { niveau_id } : {})
    };

    let result: Etudiant;
    if (item.id) {
      const idx = list.findIndex(e => e.id === item.id);
      if (idx !== -1) list[idx] = { ...list[idx], ...itemWithFiliere };
      result = list[idx];
    } else {
      const nextId = Math.max(0, ...list.map(e => e.id)) + 1;
      // Auto-generate Matricule if missing
      const activeYear = this.getActiveAnneeAcademique();
      const yr = activeYear.code.substring(0, 4);
      const matricule = item.matricule || `${yr}-USTTB-${String(nextId).padStart(3, '0')}`;
      result = { ...itemWithFiliere, id: nextId, matricule, mot_de_passe: item.mot_de_passe || 'etudiant123', statut: item.statut || 'Inscrit' } as Etudiant;
      list.push(result);

      // Auto-create inscription for current active year
      this.saveInscription({
        etudiant_id: result.id,
        classe_id: result.classe_id,
        annee_academique_id: activeYear.id,
        date_inscription: new Date().toISOString().split('T')[0],
        statut: 'Validée',
        frais_inscription: 150000
      });
    }
    setItem(STORAGE_KEYS.ETUDIANTS, list);
    return result;
  }

  static deleteEtudiant(id: number): void {
    setItem(STORAGE_KEYS.ETUDIANTS, this.getEtudiants().filter(e => e.id !== id));
  }

  static saveEnseignant(item: Omit<Enseignant, 'id'> & { id?: number }): Enseignant {
    const list = this.getEnseignants();
    let result: Enseignant;
    if (item.id) {
      const idx = list.findIndex(e => e.id === item.id);
      if (idx !== -1) list[idx] = { ...list[idx], ...item };
      result = list[idx];
    } else {
      const nextId = Math.max(0, ...list.map(e => e.id)) + 1;
      const matricule = item.matricule || `ENS-${new Date().getFullYear()}-${String(nextId).padStart(3, '0')}`;
      result = { ...item, id: nextId, matricule } as Enseignant;
      list.push(result);
    }
    setItem(STORAGE_KEYS.ENSEIGNANTS, list);
    return result;
  }

  static deleteEnseignant(id: number): void {
    setItem(STORAGE_KEYS.ENSEIGNANTS, this.getEnseignants().filter(e => e.id !== id));
  }

  static saveMatiere(item: Omit<Matiere, 'id'> & { id?: number }): Matiere {
    const list = this.getMatieres();
    let result: Matiere;
    if (item.id) {
      const idx = list.findIndex(m => m.id === item.id);
      if (idx !== -1) list[idx] = { ...list[idx], ...item };
      result = list[idx];
    } else {
      const nextId = Math.max(0, ...list.map(m => m.id)) + 1;
      result = { ...item, id: nextId } as Matiere;
      list.push(result);
    }
    setItem(STORAGE_KEYS.MATIERES, list);
    return result;
  }

  static deleteMatiere(id: number): void {
    setItem(STORAGE_KEYS.MATIERES, this.getMatieres().filter(m => m.id !== id));
  }

  // Global Student Lock
  static isGlobalStudentLockActive(): boolean {
    return getItem(STORAGE_KEYS.GLOBAL_STUDENT_LOCK, false);
  }

  static setGlobalStudentLock(blocked: boolean): void {
    setItem(STORAGE_KEYS.GLOBAL_STUDENT_LOCK, blocked);
    this.logAccess('SECURITE', `Accès global espace étudiant ${blocked ? 'VERROUILLÉ / BLOQUÉ' : 'DÉVERROUILLÉ / ACTIVÉ'}`);
  }

  // Filiere Authorized Access Control
  static getEtudiantAuthorizedFilieres(etudiantId: number): Filiere[] {
    const inscriptions = this.getInscriptions().filter(i => i.etudiant_id === etudiantId);
    const classes = this.getClasses();
    const filieres = this.getFilieres();

    const filiereIds = new Set<number>();
    inscriptions.forEach(ins => {
      const cls = classes.find(c => c.id === ins.classe_id);
      if (cls && cls.filiere_id) {
        filiereIds.add(cls.filiere_id);
      }
    });

    const student = this.getEtudiants().find(e => e.id === etudiantId);
    if (student) {
      if (student.filiere_id) {
        filiereIds.add(student.filiere_id);
      }
      if (student.classe_id) {
        const mainClass = classes.find(c => c.id === student.classe_id);
        if (mainClass && mainClass.filiere_id) {
          filiereIds.add(mainClass.filiere_id);
        }
      }
    }

    if (filiereIds.size === 0) {
      return filieres; // Allow access if no specific constraint
    }

    return filieres.filter(f => filiereIds.has(f.id));
  }

  static isStudentAuthorizedForFiliere(etudiantId: number, filiereId: number): boolean {
    const authorized = this.getEtudiantAuthorizedFilieres(etudiantId);
    if (!authorized || authorized.length === 0) return true;
    return authorized.some(f => f.id === filiereId);
  }

  static isStudentAuthorizedForClasse(etudiantId: number, classeId: number): boolean {
    const cls = this.getClasses().find(c => c.id === classeId);
    if (!cls) return true;
    if (cls.filiere_id) {
      return this.isStudentAuthorizedForFiliere(etudiantId, cls.filiere_id);
    }
    return true;
  }

  static saveInscription(item: Omit<Inscription, 'id'> & { id?: number }): Inscription {
    const list = this.getInscriptions();
    let result: Inscription;
    if (item.id) {
      const idx = list.findIndex(i => i.id === item.id);
      if (idx !== -1) list[idx] = { ...list[idx], ...item };
      result = list[idx];
    } else {
      const nextId = Math.max(0, ...list.map(i => i.id)) + 1;
      result = { ...item, id: nextId } as Inscription;
      list.push(result);
    }
    setItem(STORAGE_KEYS.INSCRIPTIONS, list);

    // Auto-sync student active class & filiere so student gets instant access to all features
    if (result.etudiant_id && result.classe_id) {
      const etudiants = this.getEtudiants();
      const etudIdx = etudiants.findIndex(e => e.id === result.etudiant_id);
      if (etudIdx !== -1) {
        const classes = this.getClasses();
        const cls = classes.find(c => c.id === result.classe_id);
        const filiereId = cls?.filiere_id;
        
        etudiants[etudIdx] = {
          ...etudiants[etudIdx],
          classe_id: result.classe_id,
          niveau_id: cls?.niveau_id || etudiants[etudIdx].niveau_id,
          ...(filiereId ? { filiere_id: filiereId } : {}),
          statut: 'Inscrit',
          statut_compte: 'Actif',
          est_bloque: false
        };
        setItem(STORAGE_KEYS.ETUDIANTS, etudiants);
      }
    }

    return result;
  }

  static deleteInscription(id: number): void {
    setItem(STORAGE_KEYS.INSCRIPTIONS, this.getInscriptions().filter(i => i.id !== id));
  }

  static saveNote(item: Omit<Note, 'id'> & { id?: number }): Note {
    const list = this.getNotes();
    // Formula: Note Finale = (30% CC) + (70% Examen)
    const note_cc = Number(item.note_cc) || 0;
    const note_examen = Number(item.note_examen) || 0;
    const note_finale = Number(((note_cc * 0.3) + (note_examen * 0.7)).toFixed(2));

    let appreciation = 'Insuffisant';
    if (note_finale >= 16) appreciation = 'Très Bien';
    else if (note_finale >= 14) appreciation = 'Bien';
    else if (note_finale >= 12) appreciation = 'Assez Bien';
    else if (note_finale >= 10) appreciation = 'Passable';

    const fullNote = {
      ...item,
      note_cc,
      note_examen,
      note_finale,
      appreciation,
      updated_at: new Date().toISOString().split('T')[0]
    };

    let result: Note;
    if (item.id) {
      const idx = list.findIndex(n => n.id === item.id);
      if (idx !== -1) list[idx] = { ...list[idx], ...fullNote } as Note;
      result = list[idx];
    } else {
      const nextId = Math.max(0, ...list.map(n => n.id)) + 1;
      result = { ...fullNote, id: nextId } as Note;
      list.push(result);
    }
    setItem(STORAGE_KEYS.NOTES, list);

    // Auto update/recalculate bulletin for student
    this.recalculateBulletin(result.etudiant_id, result.semestre_id, result.annee_academique_id);

    // Trigger Notification for student
    const student = this.getEtudiants().find(e => e.id === result.etudiant_id);
    const subject = this.getMatieres().find(m => m.id === result.matiere_id);
    if (student && subject) {
      this.addNotification({
        destinateur_type: 'ETUDIANT',
        destinateur_id: student.id,
        titre: `Nouvelle note : ${subject.nom}`,
        message: `Votre note pour ${subject.nom} a été saisie : ${note_finale}/20 (${appreciation}).`,
        type_alerte: note_finale >= 10 ? 'SUCCESS' : 'WARNING',
        lu: false,
        created_at: new Date().toISOString().replace('T', ' ').substring(0, 16)
      });
    }

    return result;
  }

  static deleteNote(id: number): void {
    const list = this.getNotes();
    const note = list.find(n => n.id === id);
    setItem(STORAGE_KEYS.NOTES, list.filter(n => n.id !== id));
    if (note) {
      this.recalculateBulletin(note.etudiant_id, note.semestre_id, note.annee_academique_id);
    }
  }

  static saveAbsence(item: Omit<Absence, 'id'> & { id?: number }): Absence {
    const list = this.getAbsences();
    let result: Absence;
    if (item.id) {
      const idx = list.findIndex(a => a.id === item.id);
      if (idx !== -1) list[idx] = { ...list[idx], ...item };
      result = list[idx];
    } else {
      const nextId = Math.max(0, ...list.map(a => a.id)) + 1;
      result = { ...item, id: nextId } as Absence;
      list.push(result);
    }
    setItem(STORAGE_KEYS.ABSENCES, list);

    // Notify student on absence record
    const student = this.getEtudiants().find(e => e.id === result.etudiant_id);
    const subject = this.getMatieres().find(m => m.id === result.matiere_id);
    if (student && subject) {
      const totalAbsences = this.getAbsences().filter(a => a.etudiant_id === student.id && a.matiere_id === subject.id).length;
      this.addNotification({
        destinateur_type: 'ETUDIANT',
        destinateur_id: student.id,
        titre: `Alerte Présence : ${subject.nom}`,
        message: `Une absence de ${result.heures}h a été enregistrée le ${result.date_absence} (${result.justifiee ? 'Justifiée' : 'Non justifiée'}). Total absences dans la matière: ${totalAbsences}.`,
        type_alerte: totalAbsences >= 3 ? 'ERROR' : 'WARNING',
        lu: false,
        created_at: new Date().toISOString().replace('T', ' ').substring(0, 16)
      });
    }

    return result;
  }

  static deleteAbsence(id: number): void {
    setItem(STORAGE_KEYS.ABSENCES, this.getAbsences().filter(a => a.id !== id));
  }

  static recalculateBulletin(etudiantId: number, semestreId: number, anneeId: number): Bulletin | null {
    const notes = this.getNotes().filter(n => n.etudiant_id === etudiantId && n.semestre_id === semestreId && n.annee_academique_id === anneeId);
    if (notes.length === 0) return null;

    const matieres = this.getMatieres();
    let totalWeightedNotes = 0;
    let totalCreditsForAvg = 0;
    let totalCredits = 0;

    notes.forEach(note => {
      const mat = matieres.find(m => m.id === note.matiere_id);
      const credit = mat?.credits || 3;
      totalWeightedNotes += note.note_finale * credit;
      totalCreditsForAvg += credit;
      if (note.note_finale >= 10) {
        totalCredits += credit;
      }
    });

    const moyenne = totalCreditsForAvg > 0 ? Number((totalWeightedNotes / totalCreditsForAvg).toFixed(2)) : 0;

    let decision: 'Admis' | 'Ajourné' | 'Compensé' | 'En attente' = 'Admis';
    if (moyenne < 10) {
      decision = moyenne >= 9.0 ? 'Compensé' : 'Ajourné';
    }

    let mention: 'Passable' | 'Assez Bien' | 'Bien' | 'Très Bien' | 'N/A' = 'N/A';
    if (moyenne >= 16) mention = 'Très Bien';
    else if (moyenne >= 14) mention = 'Bien';
    else if (moyenne >= 12) mention = 'Assez Bien';
    else if (moyenne >= 10) mention = 'Passable';

    const student = this.getEtudiants().find(e => e.id === etudiantId);
    const classeId = student?.classe_id || 1;

    const bulletins = this.getBulletins();
    const existingIdx = bulletins.findIndex(b => b.etudiant_id === etudiantId && b.semestre_id === semestreId && b.annee_academique_id === anneeId);

    const bData: Omit<Bulletin, 'id'> = {
      etudiant_id: etudiantId,
      classe_id: classeId,
      semestre_id: semestreId,
      annee_academique_id: anneeId,
      moyenne,
      total_credits: totalCredits,
      decision,
      mention,
      rang: 1, // Will compute class rank
      date_generation: new Date().toISOString().split('T')[0]
    };

    let result: Bulletin;
    if (existingIdx !== -1) {
      bulletins[existingIdx] = { ...bulletins[existingIdx], ...bData };
      result = bulletins[existingIdx];
    } else {
      const nextId = Math.max(0, ...bulletins.map(b => b.id)) + 1;
      result = { ...bData, id: nextId };
      bulletins.push(result);
    }

    // Recompute ranks for class
    const classBulletins = bulletins
      .filter(b => b.classe_id === classeId && b.semestre_id === semestreId && b.annee_academique_id === anneeId)
      .sort((a, b) => b.moyenne - a.moyenne);

    classBulletins.forEach((b, idx) => {
      const globalIdx = bulletins.findIndex(g => g.id === b.id);
      if (globalIdx !== -1) {
        bulletins[globalIdx].rang = idx + 1;
      }
    });

    setItem(STORAGE_KEYS.BULLETINS, bulletins);
    return result;
  }

  static savePaiement(item: Omit<Paiement, 'id'> & { id?: number }): Paiement {
    const list = this.getPaiements();
    const montant = Number(item.montant) || 0;
    const montant_paye = Number(item.montant_paye) || 0;
    const reste_a_payer = Math.max(0, montant - montant_paye);

    let statut: 'Complet' | 'Partiel' | 'En retard' | 'En attente' = 'Complet';
    if (reste_a_payer > 0) {
      statut = montant_paye > 0 ? 'Partiel' : 'En retard';
    }

    const fullPaiement = {
      ...item,
      montant,
      montant_paye,
      reste_a_payer,
      statut,
      reference_recu: item.reference_recu || `REC-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`
    };

    let result: Paiement;
    if (item.id) {
      const idx = list.findIndex(p => p.id === item.id);
      if (idx !== -1) list[idx] = { ...list[idx], ...fullPaiement } as Paiement;
      result = list[idx];
    } else {
      const nextId = Math.max(0, ...list.map(p => p.id)) + 1;
      result = { ...fullPaiement, id: nextId } as Paiement;
      list.push(result);
    }
    setItem(STORAGE_KEYS.PAIEMENTS, list);

    // Notify student
    const student = this.getEtudiants().find(e => e.id === result.etudiant_id);
    if (student) {
      this.addNotification({
        destinateur_type: 'ETUDIANT',
        destinateur_id: student.id,
        titre: `Reçu de paiement enregistré : ${result.reference_recu}`,
        message: `Paiement de ${result.montant_paye.toLocaleString()} FCFA (${result.type_frais}) enregistré via ${result.mode_paiement}. Reste à payer : ${result.reste_a_payer.toLocaleString()} FCFA.`,
        type_alerte: 'SUCCESS',
        lu: false,
        created_at: new Date().toISOString().replace('T', ' ').substring(0, 16)
      });
    }

    return result;
  }

  static deletePaiement(id: number): void {
    setItem(STORAGE_KEYS.PAIEMENTS, this.getPaiements().filter(p => p.id !== id));
  }

  static saveAdministrateur(item: Omit<Administrateur, 'id'> & { id?: number }): Administrateur {
    const list = this.getUtilisateurs();
    let result: Administrateur;
    if (item.id) {
      const idx = list.findIndex(u => u.id === item.id);
      if (idx !== -1) list[idx] = { ...list[idx], ...item };
      result = list[idx];
    } else {
      const nextId = Math.max(0, ...list.map(u => u.id)) + 1;
      result = { ...item, id: nextId } as Administrateur;
      list.push(result);
    }
    setItem(STORAGE_KEYS.UTILISATEURS, list);
    setItem(STORAGE_KEYS.ADMINISTRATEURS, list);
    return result;
  }

  static deleteAdministrateur(id: number): void {
    const updated = this.getUtilisateurs().filter(u => u.id !== id);
    setItem(STORAGE_KEYS.UTILISATEURS, updated);
    setItem(STORAGE_KEYS.ADMINISTRATEURS, updated);
  }

  static saveUtilisateur(item: Omit<Utilisateur, 'id'> & { id?: number }): Utilisateur {
    return this.saveAdministrateur(item);
  }

  static deleteUtilisateur(id: number): void {
    this.deleteAdministrateur(id);
  }

  static saveBulletin(item: Omit<Bulletin, 'id'> & { id?: number }): Bulletin {
    const list = this.getBulletins();
    let result: Bulletin;
    if (item.id) {
      const idx = list.findIndex(b => b.id === item.id);
      if (idx !== -1) list[idx] = { ...list[idx], ...item };
      result = list[idx];
    } else {
      const nextId = Math.max(0, ...list.map(b => b.id)) + 1;
      result = { ...item, id: nextId } as Bulletin;
      list.push(result);
    }
    setItem(STORAGE_KEYS.BULLETINS, list);
    return result;
  }

  static addNotification(notif: Omit<NotificationAlerte, 'id'>): NotificationAlerte {
    const list = this.getNotifications();
    const nextId = Math.max(0, ...list.map(n => n.id)) + 1;
    const item: NotificationAlerte = { ...notif, id: nextId };
    list.unshift(item); // top
    setItem(STORAGE_KEYS.NOTIFICATIONS, list);
    return item;
  }

  static markNotificationRead(id: number): void {
    const list = this.getNotifications().map(n => n.id === id ? { ...n, lu: true } : n);
    setItem(STORAGE_KEYS.NOTIFICATIONS, list);
  }

  static logAccess(event_type: HistoriqueAcces['event_type'], description: string, userId?: number, etudiantId?: number): void {
    const list = this.getHistorique();
    const nextId = Math.max(0, ...list.map(h => h.id)) + 1;
    const entry: HistoriqueAcces = {
      id: nextId,
      utilisateur_id: userId,
      etudiant_id: etudiantId,
      ip_adresse: '197.230.12.44', // Simulated local Mali IP
      event_type,
      description,
      created_at: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    list.unshift(entry);
    setItem(STORAGE_KEYS.HISTORIQUE, list.slice(0, 250)); // Keep last 250 entries
  }

  static clearHistorique(): void {
    setItem(STORAGE_KEYS.HISTORIQUE, []);
  }

  // Corbeille (Recycle Bin)
  static getCorbeille(): CorbeilleItem[] {
    return getItem(STORAGE_KEYS.CORBEILLE, []);
  }

  static moveToCorbeille(
    type_element: CorbeilleItem['type_element'],
    element_id: number,
    titre: string,
    details: string,
    donnees: any,
    supprime_par: string = 'Administrateur'
  ): void {
    const list = this.getCorbeille();
    const nextId = Math.max(0, ...list.map(c => c.id)) + 1;
    const item: CorbeilleItem = {
      id: nextId,
      type_element,
      element_id,
      titre,
      details,
      donnees_json: JSON.stringify(donnees),
      supprime_par,
      supprime_le: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    list.unshift(item);
    setItem(STORAGE_KEYS.CORBEILLE, list);

    this.logAccess('SUPPRESSION', `Mise en corbeille : ${type_element} "${titre}" (ID #${element_id})`);
  }

  static restoreFromCorbeille(corbeilleId: number): boolean {
    const list = this.getCorbeille();
    const item = list.find(c => c.id === corbeilleId);
    if (!item) return false;

    try {
      const data = JSON.parse(item.donnees_json);
      if (item.type_element === 'ETUDIANT') {
        this.saveEtudiant(data);
      } else if (item.type_element === 'NOTE') {
        this.saveNote(data);
      } else if (item.type_element === 'MATIERE') {
        this.saveMatiere(data);
      } else if (item.type_element === 'PAIEMENT') {
        this.savePaiement(data);
      } else if (item.type_element === 'INSCRIPTION') {
        this.saveInscription(data);
      } else if (item.type_element === 'ENSEIGNANT') {
        this.saveEnseignant(data);
      } else if (item.type_element === 'CLASSE') {
        this.saveClasse(data);
      } else if (item.type_element === 'FILIERE') {
        this.saveFiliere(data);
      } else if (item.type_element === 'SEMESTRE') {
        this.saveSemestre(data);
      } else if (item.type_element === 'UTILISATEUR') {
        this.saveUtilisateur(data);
      }

      // remove from corbeille
      setItem(STORAGE_KEYS.CORBEILLE, list.filter(c => c.id !== corbeilleId));
      this.logAccess('RESTAURATION', `Restauration depuis la corbeille : ${item.type_element} "${item.titre}"`);
      return true;
    } catch (e) {
      console.error('Error restoring item', e);
      return false;
    }
  }

  static deletePermanentlyFromCorbeille(corbeilleId: number): void {
    const list = this.getCorbeille();
    const item = list.find(c => c.id === corbeilleId);
    setItem(STORAGE_KEYS.CORBEILLE, list.filter(c => c.id !== corbeilleId));
    if (item) {
      this.logAccess('SUPPRESSION', `Suppression définitive : ${item.type_element} "${item.titre}"`);
    }
  }

  static clearCorbeille(): void {
    setItem(STORAGE_KEYS.CORBEILLE, []);
    this.logAccess('SUPPRESSION', 'Corbeille entièrement vidée');
  }

  // Reset to default seed
  static resetToDefault(): void {
    Object.keys(inMemoryStore).forEach(key => delete inMemoryStore[key]);
    try { localStorage.clear(); } catch {}
  }
}
