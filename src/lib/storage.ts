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
import { toast } from './toast';

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

export async function saveToBackendTable(table: string, data: any): Promise<boolean> {
  try {
    const res = await fetch(`/api/tables/${table}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteFromBackendTable(table: string, id: number): Promise<boolean> {
  try {
    const res = await fetch(`/api/tables/${table}/${id}`, {
      method: 'DELETE'
    });
    return res.ok;
  } catch {
    return false;
  }
}

let syncTimer: any = null;

export async function syncNowWithServer() {
  try {
    const fullSnapshot: Record<string, any> = {
      [STORAGE_KEYS.UNIVERSITES]: DB.getUniversites(),
      [STORAGE_KEYS.FACULTES]: DB.getFacultes(),
      [STORAGE_KEYS.FILIERES]: DB.getFilieres(),
      [STORAGE_KEYS.NIVEAUX]: DB.getNiveaux(),
      [STORAGE_KEYS.ANNEES]: DB.getAnneesAcademiques(),
      [STORAGE_KEYS.CLASSES]: DB.getClasses(),
      [STORAGE_KEYS.ENSEIGNANTS]: DB.getEnseignants(),
      [STORAGE_KEYS.SEMESTRES]: DB.getSemestres(),
      [STORAGE_KEYS.MATIERES]: DB.getMatieres(),
      [STORAGE_KEYS.ETUDIANTS]: DB.getEtudiants(),
      [STORAGE_KEYS.INSCRIPTIONS]: DB.getInscriptions(),
      [STORAGE_KEYS.NOTES]: DB.getNotes(),
      [STORAGE_KEYS.ABSENCES]: DB.getAbsences(),
      [STORAGE_KEYS.BULLETINS]: DB.getBulletins(),
      [STORAGE_KEYS.PAIEMENTS]: DB.getPaiements(),
      [STORAGE_KEYS.UTILISATEURS]: DB.getUtilisateurs(),
      [STORAGE_KEYS.ADMINISTRATEURS]: DB.getAdministrateurs(),
      [STORAGE_KEYS.NOTIFICATIONS]: DB.getNotifications(),
      [STORAGE_KEYS.HISTORIQUE]: DB.getHistorique(),
      [STORAGE_KEYS.CORBEILLE]: DB.getCorbeille(),
      [STORAGE_KEYS.SUPPORTS_COURS]: DB.getSupportsCours(),
      [STORAGE_KEYS.GLOBAL_STUDENT_LOCK]: DB.isGlobalStudentLockActive(),
    };

    await fetch('/api/db/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: fullSnapshot })
    });
  } catch {}
}

function triggerServerSync() {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncNowWithServer();
  }, 50);
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

    // 2. Hydrate from backend MySQL database snapshot
    try {
      await this.syncFromBackend();
    } catch (e) {
      console.warn("Failed to sync from backend:", e);
    }

    // 3. Ensure defaults are populated if nothing was stored yet
    if (!inMemoryStore[STORAGE_KEYS.UNIVERSITES]) setItemWithoutSync(STORAGE_KEYS.UNIVERSITES, INITIAL_UNIVERSITES);
    if (!inMemoryStore[STORAGE_KEYS.FACULTES]) setItemWithoutSync(STORAGE_KEYS.FACULTES, INITIAL_FACULTES);
    if (!inMemoryStore[STORAGE_KEYS.FILIERES]) setItemWithoutSync(STORAGE_KEYS.FILIERES, INITIAL_FILIERES);
    if (!inMemoryStore[STORAGE_KEYS.NIVEAUX]) setItemWithoutSync(STORAGE_KEYS.NIVEAUX, INITIAL_NIVEAUX);
    if (!inMemoryStore[STORAGE_KEYS.ANNEES]) setItemWithoutSync(STORAGE_KEYS.ANNEES, INITIAL_ANNEES_ACADEMIQUES);
    if (!inMemoryStore[STORAGE_KEYS.CLASSES]) setItemWithoutSync(STORAGE_KEYS.CLASSES, INITIAL_CLASSES);
    if (!inMemoryStore[STORAGE_KEYS.ENSEIGNANTS]) setItemWithoutSync(STORAGE_KEYS.ENSEIGNANTS, INITIAL_ENSEIGNANTS);
    if (!inMemoryStore[STORAGE_KEYS.SEMESTRES]) setItemWithoutSync(STORAGE_KEYS.SEMESTRES, INITIAL_SEMESTRES);
    if (!inMemoryStore[STORAGE_KEYS.MATIERES]) setItemWithoutSync(STORAGE_KEYS.MATIERES, INITIAL_MATIERES);
    if (!inMemoryStore[STORAGE_KEYS.ETUDIANTS]) setItemWithoutSync(STORAGE_KEYS.ETUDIANTS, INITIAL_ETUDIANTS);
    if (!inMemoryStore[STORAGE_KEYS.INSCRIPTIONS]) setItemWithoutSync(STORAGE_KEYS.INSCRIPTIONS, INITIAL_INSCRIPTIONS);
    if (!inMemoryStore[STORAGE_KEYS.NOTES]) setItemWithoutSync(STORAGE_KEYS.NOTES, INITIAL_NOTES);
    if (!inMemoryStore[STORAGE_KEYS.ABSENCES]) setItemWithoutSync(STORAGE_KEYS.ABSENCES, INITIAL_ABSENCES);
    if (!inMemoryStore[STORAGE_KEYS.BULLETINS]) setItemWithoutSync(STORAGE_KEYS.BULLETINS, INITIAL_BULLETINS);
    if (!inMemoryStore[STORAGE_KEYS.PAIEMENTS]) setItemWithoutSync(STORAGE_KEYS.PAIEMENTS, INITIAL_PAIEMENTS);
    if (!inMemoryStore[STORAGE_KEYS.UTILISATEURS]) setItemWithoutSync(STORAGE_KEYS.UTILISATEURS, INITIAL_UTILISATEURS);
    if (!inMemoryStore[STORAGE_KEYS.ADMINISTRATEURS]) setItemWithoutSync(STORAGE_KEYS.ADMINISTRATEURS, INITIAL_ADMINISTRATEURS);
    if (!inMemoryStore[STORAGE_KEYS.NOTIFICATIONS]) setItemWithoutSync(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    if (!inMemoryStore[STORAGE_KEYS.HISTORIQUE]) setItemWithoutSync(STORAGE_KEYS.HISTORIQUE, INITIAL_HISTORIQUE);
    if (!inMemoryStore[STORAGE_KEYS.SUPPORTS_COURS]) setItemWithoutSync(STORAGE_KEYS.SUPPORTS_COURS, INITIAL_SUPPORTS_COURS);

    // Ensure all registered students have their semester bulletins available
    this.ensureAllStudentsHaveBulletins();
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

  static async syncFromBackend(): Promise<boolean> {
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

        const universites = getArr('unigestion_universites', 'universites');
        if (universites) setItemWithoutSync(STORAGE_KEYS.UNIVERSITES, universites);

        const facultes = getArr('unigestion_facultes', 'facultes');
        if (facultes) setItemWithoutSync(STORAGE_KEYS.FACULTES, facultes);

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

        const corbeille = getArr('unigestion_corbeille', 'corbeille');
        if (corbeille) setItemWithoutSync(STORAGE_KEYS.CORBEILLE, corbeille);

        const supports = getArr('unigestion_supports_cours', 'supports_cours');
        if (supports) setItemWithoutSync(STORAGE_KEYS.SUPPORTS_COURS, supports);

        return true;
      }
    } catch (err) {
      console.error("Erreur lors de la synchronisation backend", err);
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
    const list = getItem(STORAGE_KEYS.NOTES, INITIAL_NOTES);
    if (!Array.isArray(list) || list.length === 0) {
      setItem(STORAGE_KEYS.NOTES, INITIAL_NOTES);
      return INITIAL_NOTES;
    }
    // Ensure all demo initial notes (including S1 & S2) are included if not present
    const existingKeys = new Set(list.map(n => `${n.etudiant_id}_${n.matiere_id}_${n.semestre_id}`));
    let hasAdded = false;
    INITIAL_NOTES.forEach(initN => {
      const key = `${initN.etudiant_id}_${initN.matiere_id}_${initN.semestre_id}`;
      if (!existingKeys.has(key)) {
        const nextId = Math.max(0, ...list.map(n => n.id)) + 1;
        list.push({ ...initN, id: nextId });
        hasAdded = true;
      }
    });
    if (hasAdded) {
      setItem(STORAGE_KEYS.NOTES, list);
    }
    return list;
  }

  static getAbsences(): Absence[] {
    return getItem(STORAGE_KEYS.ABSENCES, INITIAL_ABSENCES);
  }

  static getBulletins(): Bulletin[] {
    const list = getItem(STORAGE_KEYS.BULLETINS, INITIAL_BULLETINS);
    if (!Array.isArray(list) || list.length === 0) {
      setItem(STORAGE_KEYS.BULLETINS, INITIAL_BULLETINS);
      return INITIAL_BULLETINS;
    }
    const existingKeys = new Set(list.map(b => `${b.etudiant_id}_${b.semestre_id}`));
    let hasAdded = false;
    INITIAL_BULLETINS.forEach(initB => {
      const key = `${initB.etudiant_id}_${initB.semestre_id}`;
      if (!existingKeys.has(key)) {
        const nextId = Math.max(0, ...list.map(b => b.id)) + 1;
        list.push({ ...initB, id: nextId });
        hasAdded = true;
      }
    });
    if (hasAdded) {
      setItem(STORAGE_KEYS.BULLETINS, list);
    }
    return list;
  }

  static getPaiements(): Paiement[] {
    return getItem(STORAGE_KEYS.PAIEMENTS, INITIAL_PAIEMENTS);
  }

  static getUtilisateurs(): Utilisateur[] {
    const list = getItem(STORAGE_KEYS.UTILISATEURS, null as any);
    if (Array.isArray(list) && list.length > 0) return list;

    const adminList = getItem(STORAGE_KEYS.ADMINISTRATEURS, null as any);
    if (Array.isArray(adminList) && adminList.length > 0) {
      setItem(STORAGE_KEYS.UTILISATEURS, adminList);
      return adminList;
    }

    const fallback = INITIAL_UTILISATEURS && INITIAL_UTILISATEURS.length > 0 ? INITIAL_UTILISATEURS : INITIAL_ADMINISTRATEURS;
    setItem(STORAGE_KEYS.UTILISATEURS, fallback);
    setItem(STORAGE_KEYS.ADMINISTRATEURS, fallback);
    return fallback;
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
    saveToBackendTable('supports_cours', result);
    this.logAccess(item.id ? 'MODIFICATION' : 'CREATION', `${item.id ? 'Modification' : 'Dépôt'} support de cours "${result.titre}"`);
    return result;
  }

  static deleteSupportCours(id: number): void {
    setItem(STORAGE_KEYS.SUPPORTS_COURS, this.getSupportsCours().filter(s => s.id !== id));
    deleteFromBackendTable('supports_cours', id);
    this.logAccess('SUPPRESSION', `Suppression support de cours ID #${id}`);
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
    saveToBackendTable('universites', result);
    this.logAccess(item.id ? 'MODIFICATION' : 'CREATION', `${item.id ? 'Modification' : 'Création'} des paramètres de l'université "${result.nom}"`);
    return result;
  }

  static deleteUniversite(id: number): void {
    const list = this.getUniversites().filter(u => u.id !== id);
    setItem(STORAGE_KEYS.UNIVERSITES, list);
    deleteFromBackendTable('universites', id);
    // Cascade delete facultes belonging to this university
    const facultes = this.getFacultes().filter(f => f.universite_id === id);
    facultes.forEach(f => this.deleteFaculte(f.id));
    this.logAccess('SUPPRESSION', `Suppression université ID #${id} et ses facultés rattachées`);
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
    saveToBackendTable('facultes', result);
    this.logAccess(item.id ? 'MODIFICATION' : 'CREATION', `${item.id ? 'Modification' : 'Création'} faculté "${result.nom}" (${result.code})`);
    return result;
  }

  static deleteFaculte(id: number): void {
    setItem(STORAGE_KEYS.FACULTES, this.getFacultes().filter(f => f.id !== id));
    deleteFromBackendTable('facultes', id);
    // Cascade delete filieres belonging to this faculte
    const filieres = this.getFilieres().filter(f => f.faculte_id === id);
    filieres.forEach(f => this.deleteFiliere(f.id));
    this.logAccess('SUPPRESSION', `Suppression faculté ID #${id} et ses filières rattachées`);
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
    saveToBackendTable('filieres', result);
    this.logAccess(item.id ? 'MODIFICATION' : 'CREATION', `${item.id ? 'Modification' : 'Création'} filière "${result.nom}" (${result.code})`);
    return result;
  }

  static deleteFiliere(id: number): void {
    setItem(STORAGE_KEYS.FILIERES, this.getFilieres().filter(f => f.id !== id));
    deleteFromBackendTable('filieres', id);
    // Cascade delete classes, matieres, niveaux
    const classes = this.getClasses().filter(c => c.filiere_id === id);
    classes.forEach(c => this.deleteClasse(c.id));
    setItem(STORAGE_KEYS.MATIERES, this.getMatieres().filter(m => m.filiere_id !== id));
    setItem(STORAGE_KEYS.NIVEAUX, this.getNiveaux().filter(n => n.filiere_id !== id));
    this.logAccess('SUPPRESSION', `Suppression filière ID #${id} et ses classes/matières rattachées`);
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
    saveToBackendTable('semestres', result);
    this.logAccess(item.id ? 'MODIFICATION' : 'CREATION', `${item.id ? 'Modification' : 'Création'} semestre "${result.code} - ${result.libelle}"`);
    return result;
  }

  static deleteSemestre(id: number): void {
    const sem = this.getSemestres().find(s => s.id === id);
    if (sem) {
      this.moveToCorbeille('SEMESTRE', sem.id, `${sem.code} - ${sem.libelle}`, `Semestre ${sem.libelle}`, sem);
    }
    setItem(STORAGE_KEYS.SEMESTRES, this.getSemestres().filter(s => s.id !== id));
    deleteFromBackendTable('semestres', id);
    setItem(STORAGE_KEYS.NOTES, this.getNotes().filter(n => n.semestre_id !== id));
    setItem(STORAGE_KEYS.BULLETINS, this.getBulletins().filter(b => b.semestre_id !== id));
    this.logAccess('SUPPRESSION', `Suppression semestre ID #${id} et ses notes/bulletins rattachés`);
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
    saveToBackendTable('niveaux', result);
    this.logAccess(item.id ? 'MODIFICATION' : 'CREATION', `${item.id ? 'Modification' : 'Création'} niveau "${result.code} - ${result.nom}"`);
    return result;
  }

  static deleteNiveau(id: number): void {
    setItem(STORAGE_KEYS.NIVEAUX, this.getNiveaux().filter(n => n.id !== id));
    deleteFromBackendTable('niveaux', id);
    this.logAccess('SUPPRESSION', `Suppression niveau ID #${id}`);
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
    saveToBackendTable('classes', result);
    this.logAccess(item.id ? 'MODIFICATION' : 'CREATION', `${item.id ? 'Modification' : 'Création'} classe "${result.code} - ${result.nom}"`);
    return result;
  }

  static deleteClasse(id: number): void {
    setItem(STORAGE_KEYS.CLASSES, this.getClasses().filter(c => c.id !== id));
    deleteFromBackendTable('classes', id);
    setItem(STORAGE_KEYS.INSCRIPTIONS, this.getInscriptions().filter(i => i.classe_id !== id));
    setItem(STORAGE_KEYS.BULLETINS, this.getBulletins().filter(b => b.classe_id !== id));
    this.logAccess('SUPPRESSION', `Suppression classe ID #${id} et ses inscriptions/bulletins rattachés`);
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
    saveToBackendTable('annees_academiques', result);
    this.logAccess(item.id ? 'MODIFICATION' : 'CREATION', `${item.id ? 'Modification' : 'Création'} année académique "${result.libelle}"`);
    return result;
  }

  static setActiveAnneeAcademique(id: number): void {
    const list = this.getAnneesAcademiques().map(a => ({
      ...a,
      est_active: a.id === id
    }));
    setItem(STORAGE_KEYS.ANNEES, list);
    const active = list.find(a => a.id === id);
    if (active) {
      saveToBackendTable('annees_academiques', active);
      this.logAccess('MODIFICATION', `Changement de l'année académique active : "${active.libelle}"`);
    }
  }

  static deleteAnneeAcademique(id: number): void {
    const active = this.getActiveAnneeAcademique();
    if (active.id === id) {
      const remaining = this.getAnneesAcademiques().filter(a => a.id !== id);
      if (remaining.length > 0) {
        remaining[0].est_active = true;
        setItem(STORAGE_KEYS.ANNEES, remaining);
      }
    } else {
      setItem(STORAGE_KEYS.ANNEES, this.getAnneesAcademiques().filter(a => a.id !== id));
    }
    deleteFromBackendTable('annees_academiques', id);
    setItem(STORAGE_KEYS.INSCRIPTIONS, this.getInscriptions().filter(i => i.annee_academique_id !== id));
    setItem(STORAGE_KEYS.NOTES, this.getNotes().filter(n => n.annee_academique_id !== id));
    setItem(STORAGE_KEYS.BULLETINS, this.getBulletins().filter(b => b.annee_academique_id !== id));
    setItem(STORAGE_KEYS.PAIEMENTS, this.getPaiements().filter(p => p.annee_academique_id !== id));
    this.logAccess('SUPPRESSION', `Suppression année académique ID #${id} et ses données rattachées`);
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
    saveToBackendTable('etudiants', result);
    this.logAccess(item.id ? 'MODIFICATION' : 'CREATION', `${item.id ? 'Modification' : 'Création'} dossier étudiant "${result.prenom} ${result.nom}" (${result.matricule})`, undefined, result.id);
    return result;
  }

  static deleteEtudiant(id: number): void {
    setItem(STORAGE_KEYS.ETUDIANTS, this.getEtudiants().filter(e => e.id !== id));
    deleteFromBackendTable('etudiants', id);
    setItem(STORAGE_KEYS.INSCRIPTIONS, this.getInscriptions().filter(i => i.etudiant_id !== id));
    setItem(STORAGE_KEYS.NOTES, this.getNotes().filter(n => n.etudiant_id !== id));
    setItem(STORAGE_KEYS.ABSENCES, this.getAbsences().filter(a => a.etudiant_id !== id));
    setItem(STORAGE_KEYS.PAIEMENTS, this.getPaiements().filter(p => p.etudiant_id !== id));
    setItem(STORAGE_KEYS.BULLETINS, this.getBulletins().filter(b => b.etudiant_id !== id));
    this.logAccess('SUPPRESSION', `Suppression définitive étudiant ID #${id}`);
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
    saveToBackendTable('enseignants', result);
    this.logAccess(item.id ? 'MODIFICATION' : 'CREATION', `${item.id ? 'Modification' : 'Création'} enseignant "${result.titre} ${result.prenom} ${result.nom}" (${result.matricule})`);
    return result;
  }

  static deleteEnseignant(id: number): void {
    setItem(STORAGE_KEYS.ENSEIGNANTS, this.getEnseignants().filter(e => e.id !== id));
    deleteFromBackendTable('enseignants', id);
    // Clear enseignant_id from matieres
    const matieres = this.getMatieres().map(m => m.enseignant_id === id ? { ...m, enseignant_id: undefined, enseignant_nom: undefined } : m);
    setItem(STORAGE_KEYS.MATIERES, matieres);
    this.logAccess('SUPPRESSION', `Suppression enseignant ID #${id}`);
  }

  static saveMatiere(item: Omit<Matiere, 'id'> & { id?: number }): Matiere {
    const list = this.getMatieres();
    let enseignant_nom = item.enseignant_nom;
    if (item.enseignant_id && !enseignant_nom) {
      const ens = this.getEnseignants().find(e => e.id === item.enseignant_id);
      if (ens) {
        enseignant_nom = `${ens.titre} ${ens.prenom} ${ens.nom}`;
      }
    }
    const fullItem = { ...item, ...(enseignant_nom ? { enseignant_nom } : {}) };

    let result: Matiere;
    if (item.id) {
      const idx = list.findIndex(m => m.id === item.id);
      if (idx !== -1) list[idx] = { ...list[idx], ...fullItem };
      result = list[idx];
    } else {
      const nextId = Math.max(0, ...list.map(m => m.id)) + 1;
      result = { ...fullItem, id: nextId } as Matiere;
      list.push(result);
    }
    setItem(STORAGE_KEYS.MATIERES, list);
    saveToBackendTable('matieres', result);
    this.logAccess(item.id ? 'MODIFICATION' : 'CREATION', `${item.id ? 'Modification' : 'Création'} matière "${result.code} - ${result.nom}"`);
    return result;
  }

  static deleteMatiere(id: number): void {
    const affectedNotes = this.getNotes().filter(n => n.matiere_id === id);
    setItem(STORAGE_KEYS.MATIERES, this.getMatieres().filter(m => m.id !== id));
    deleteFromBackendTable('matieres', id);
    setItem(STORAGE_KEYS.NOTES, this.getNotes().filter(n => n.matiere_id !== id));
    setItem(STORAGE_KEYS.ABSENCES, this.getAbsences().filter(a => a.matiere_id !== id));
    setItem(STORAGE_KEYS.SUPPORTS_COURS, this.getSupportsCours().filter(s => s.matiere_id !== id));
    
    // Recalculate bulletins for affected students
    const studentSemesters = new Set<string>();
    affectedNotes.forEach(n => {
      studentSemesters.add(`${n.etudiant_id}_${n.semestre_id}_${n.annee_academique_id}`);
    });
    studentSemesters.forEach(key => {
      const [etudId, semId, anneeId] = key.split('_').map(Number);
      this.recalculateBulletin(etudId, semId, anneeId);
    });

    this.logAccess('SUPPRESSION', `Suppression matière ID #${id} et ses notes/absences rattachées`);
  }

  // Global Student Lock
  static isGlobalStudentLockActive(): boolean {
    return getItem(STORAGE_KEYS.GLOBAL_STUDENT_LOCK, false);
  }

  static setGlobalStudentLock(blocked: boolean): void {
    setItem(STORAGE_KEYS.GLOBAL_STUDENT_LOCK, blocked);
    this.logAccess('SECURITE', `Accès global espace étudiant ${blocked ? 'VERROUILLÉ / BLOQUÉ' : 'DÉVERROUILLÉ / ACTIVÉ'}`);
    if (blocked) {
      toast.warning("Portail Étudiant Verrouillé", "L'accès aux comptes étudiants est désormais restreint");
    } else {
      toast.success("Portail Étudiant Déverrouillé", "L'accès aux comptes étudiants est désormais réactivé");
    }
  }

  // Filiere Authorized Access Control - STRICT SINGLE SOURCE OF TRUTH (Inscriptions)
  static getStudentActiveEnrollment(etudiantId: number): {
    hasActiveEnrollment: boolean;
    inscription: Inscription | null;
    classe: Classe | null;
    filiere: Filiere | null;
    niveau: Niveau | null;
    filiereId: number | null;
    classeId: number | null;
    etudiant: Etudiant | null;
  } {
    const student = this.getEtudiants().find(e => Number(e.id) === Number(etudiantId));
    if (!student) {
      return {
        hasActiveEnrollment: false,
        inscription: null,
        classe: null,
        filiere: null,
        niveau: null,
        filiereId: null,
        classeId: null,
        etudiant: null
      };
    }

    const inscriptions = this.getInscriptions().filter(i => 
      Number(i.etudiant_id) === Number(etudiantId) && 
      i.statut_validation !== 'Rejeté' && 
      i.statut !== 'Annulée'
    );

    const activeAnnee = this.getActiveAnneeAcademique();
    let activeInscription = inscriptions.find(i => Number(i.annee_academique_id) === Number(activeAnnee?.id));
    if (!activeInscription && inscriptions.length > 0) {
      activeInscription = inscriptions.sort((a, b) => (Number(b.annee_academique_id || 0) - Number(a.annee_academique_id || 0)) || (Number(b.id) - Number(a.id)))[0];
    }

    const classes = this.getClasses();
    const filieres = this.getFilieres();
    const niveaux = this.getNiveaux();

    const targetClasseId = activeInscription?.classe_id || student.classe_id;
    const classe = targetClasseId ? classes.find(c => Number(c.id) === Number(targetClasseId)) || null : null;
    
    const targetFiliereId = activeInscription ? (classes.find(c => Number(c.id) === Number(activeInscription.classe_id))?.filiere_id || student.filiere_id) : (classe?.filiere_id || student.filiere_id);
    const filiere = targetFiliereId ? filieres.find(f => Number(f.id) === Number(targetFiliereId)) || null : null;
    
    const targetNiveauId = classe?.niveau_id || student.niveau_id;
    const niveau = targetNiveauId ? niveaux.find(n => Number(n.id) === Number(targetNiveauId)) || null : null;

    const hasActiveEnrollment = !!(activeInscription || (classe && filiere));

    return {
      hasActiveEnrollment,
      inscription: activeInscription || null,
      classe,
      filiere,
      niveau,
      filiereId: filiere ? filiere.id : null,
      classeId: classe ? classe.id : null,
      etudiant: student
    };
  }

  static getEtudiantAuthorizedFilieres(etudiantId: number): Filiere[] {
    const enrollment = this.getStudentActiveEnrollment(etudiantId);
    if (!enrollment.hasActiveEnrollment || !enrollment.filiere) {
      return [];
    }
    return [enrollment.filiere];
  }

  static isStudentAuthorizedForFiliere(etudiantId: number, filiereId: number): boolean {
    const enrollment = this.getStudentActiveEnrollment(etudiantId);
    if (!enrollment.hasActiveEnrollment || !enrollment.filiereId) return false;
    return Number(enrollment.filiereId) === Number(filiereId);
  }

  static isStudentAuthorizedForClasse(etudiantId: number, classeId: number): boolean {
    const cls = this.getClasses().find(c => Number(c.id) === Number(classeId));
    if (!cls || !cls.filiere_id) return false;
    return this.isStudentAuthorizedForFiliere(etudiantId, cls.filiere_id);
  }

  static getStudentAuthorizedMatieres(etudiantId: number): Matiere[] {
    const enrollment = this.getStudentActiveEnrollment(etudiantId);
    if (!enrollment.hasActiveEnrollment || !enrollment.filiereId) return [];
    return this.getMatieres().filter(m => Number(m.filiere_id) === Number(enrollment.filiereId));
  }

  static getStudentAuthorizedSupports(etudiantId: number): SupportCours[] {
    const enrollment = this.getStudentActiveEnrollment(etudiantId);
    if (!enrollment.hasActiveEnrollment || !enrollment.filiereId) return [];
    const matieres = this.getStudentAuthorizedMatieres(etudiantId);
    const matiereIds = new Set(matieres.map(m => Number(m.id)));

    return this.getSupportsCours().filter(s => {
      const matchFiliere = !s.filiere_id || Number(s.filiere_id) === Number(enrollment.filiereId);
      const matchMatiere = !s.matiere_id || matiereIds.has(Number(s.matiere_id));
      return matchFiliere && matchMatiere;
    });
  }

  static getStudentAuthorizedNotes(etudiantId: number): Note[] {
    const matieres = this.getStudentAuthorizedMatieres(etudiantId);
    const matiereIds = new Set(matieres.map(m => Number(m.id)));
    return this.getNotes().filter(n => 
      Number(n.etudiant_id) === Number(etudiantId) && 
      matiereIds.has(Number(n.matiere_id))
    );
  }

  static getStudentAuthorizedBulletins(etudiantId: number): Bulletin[] {
    const enrollment = this.getStudentActiveEnrollment(etudiantId);
    if (!enrollment.hasActiveEnrollment) return [];
    return this.getBulletins().filter(b => 
      Number(b.etudiant_id) === Number(etudiantId) &&
      (!enrollment.classeId || !b.classe_id || Number(b.classe_id) === Number(enrollment.classeId))
    );
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
    saveToBackendTable('inscriptions', result);
    this.logAccess(item.id ? 'MODIFICATION' : 'CREATION', `${item.id ? 'Modification' : 'Validation'} inscription étudiant (ID #${result.etudiant_id})`, undefined, result.etudiant_id);

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
        saveToBackendTable('etudiants', etudiants[etudIdx]);
      }
    }

    return result;
  }

  static deleteInscription(id: number): void {
    setItem(STORAGE_KEYS.INSCRIPTIONS, this.getInscriptions().filter(i => i.id !== id));
    deleteFromBackendTable('inscriptions', id);
    this.logAccess('SUPPRESSION', `Suppression inscription ID #${id}`);
  }

  static saveNote(item: Omit<Note, 'id'> & { id?: number }): Note {
    const list = this.getNotes();
    // Formula: Note Finale = (40% CC) + (60% Examen) [Standard LMD]
    const note_cc = Math.max(0, Math.min(20, Number(item.note_cc) || 0));
    const note_examen = Math.max(0, Math.min(20, Number(item.note_examen) || 0));
    const note_finale = Number(((note_cc * 0.4) + (note_examen * 0.6)).toFixed(2));

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
    saveToBackendTable('notes', result);
    const matiere = this.getMatieres().find(m => m.id === result.matiere_id);
    this.logAccess(item.id ? 'MODIFICATION' : 'CREATION', `${item.id ? 'Modification' : 'Saisie'} note : ${matiere?.nom || 'Matière'} - Note finale: ${note_finale}/20 (${appreciation})`, undefined, result.etudiant_id);

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
    deleteFromBackendTable('notes', id);
    if (note) {
      this.recalculateBulletin(note.etudiant_id, note.semestre_id, note.annee_academique_id);
    }
    this.logAccess('SUPPRESSION', `Suppression note ID #${id}`);
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
    saveToBackendTable('absences', result);
    const subj = this.getMatieres().find(m => m.id === result.matiere_id);
    this.logAccess(item.id ? 'MODIFICATION' : 'CREATION', `${item.id ? 'Modification' : 'Enregistrement'} absence : ${result.heures}h ${subj ? `en ${subj.nom}` : ''} le ${result.date_absence} (${result.justifiee ? 'Justifiée' : 'Non justifiée'})`, undefined, result.etudiant_id);

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
    deleteFromBackendTable('absences', id);
    this.logAccess('SUPPRESSION', `Suppression absence ID #${id}`);
  }

  static getBulletinsByStudent(etudiantId: number): Bulletin[] {
    const list = this.getBulletins();
    return list.filter(b => Number(b.etudiant_id) === Number(etudiantId));
  }

  static generateStudentBulletin(etudiantId: number, semestreId: number, anneeId?: number): Bulletin | null {
    const student = this.getEtudiants().find(e => Number(e.id) === Number(etudiantId));
    if (!student) return null;

    const activeAnnee = this.getActiveAnneeAcademique();
    const targetAnneeId = anneeId || activeAnnee?.id || 1;
    const classes = this.getClasses();
    const matieres = this.getMatieres();
    const notes = this.getNotes();

    const studentClass = classes.find(c => Number(c.id) === Number(student.classe_id));
    const studentFiliereId = (student as any)?.filiere_id || studentClass?.filiere_id || 1;

    // Retrieve subjects for this student's filiere & semester
    const semesterMatieres = matieres.filter(
      m => Number(m.semestre_id) === Number(semestreId) && (!m.filiere_id || Number(m.filiere_id) === Number(studentFiliereId))
    );
    const resolvedMatieres = semesterMatieres.length > 0
      ? semesterMatieres
      : matieres.filter(m => Number(m.semestre_id) === Number(semestreId));

    const applicableMatiereIds = new Set(resolvedMatieres.map(m => Number(m.id)));

    // Get student's notes for this semester
    const studentNotes = notes.filter(
      n => Number(n.etudiant_id) === Number(student.id) &&
           Number(n.semestre_id) === Number(semestreId) &&
           applicableMatiereIds.has(Number(n.matiere_id))
    );

    let totalPoints = 0;
    let totalCredits = 0;
    let totalCreditsValides = 0;

    if (studentNotes.length > 0) {
      studentNotes.forEach(n => {
        const mat = resolvedMatieres.find(m => Number(m.id) === Number(n.matiere_id));
        const credits = Number(mat?.credits) || 3;
        const noteFin = Number(n.note_finale) || 0;
        totalPoints += noteFin * credits;
        totalCredits += credits;
        if (noteFin >= 10) totalCreditsValides += credits;
      });
    } else {
      // Calculate from standard theoretical credits if notes are not yet encoded
      resolvedMatieres.forEach(m => {
        const credits = Number(m.credits) || 3;
        totalCredits += credits;
        totalPoints += 12 * credits; // default baseline evaluation
        totalCreditsValides += credits;
      });
    }

    const moyenneGenerale = totalCredits > 0 ? parseFloat((totalPoints / totalCredits).toFixed(2)) : 10;

    let decision: 'Admis' | 'Ajourné' | 'Compensé' | 'En attente' = 'Admis';
    if (moyenneGenerale < 10) {
      decision = moyenneGenerale >= 9.0 ? 'Compensé' : 'Ajourné';
    }

    let mention: 'Passable' | 'Assez Bien' | 'Bien' | 'Très Bien' | 'N/A' = 'Passable';
    if (moyenneGenerale >= 16) mention = 'Très Bien';
    else if (moyenneGenerale >= 14) mention = 'Bien';
    else if (moyenneGenerale >= 12) mention = 'Assez Bien';
    else if (moyenneGenerale >= 10) mention = 'Passable';
    else mention = 'N/A';

    return this.saveBulletin({
      etudiant_id: student.id,
      classe_id: student.classe_id,
      semestre_id: Number(semestreId),
      annee_academique_id: targetAnneeId,
      moyenne: moyenneGenerale,
      moyenne_generale: moyenneGenerale,
      total_credits: totalCredits > 0 ? totalCredits : 30,
      total_credits_valides: totalCreditsValides > 0 ? totalCreditsValides : 30,
      decision,
      mention,
      rang: 1,
      date_generation: new Date().toISOString().split('T')[0],
      remarques_jury: 'Bulletin officiel délibéré.'
    });
  }

  static generateBulletinsForAllStudents(targetSemestreId?: number, targetAnneeId?: number): { total: number; studentsCount: number } {
    const etudiants = this.getEtudiants();
    const semestres = this.getSemestres();
    const activeAnnee = this.getActiveAnneeAcademique();
    const anneeId = targetAnneeId || activeAnnee.id;
    const semestresToProcess = targetSemestreId 
      ? semestres.filter(s => Number(s.id) === Number(targetSemestreId))
      : semestres;
    
    let generatedCount = 0;
    const processedStudentIds = new Set<number>();

    etudiants.forEach(student => {
      semestresToProcess.forEach(sem => {
        const b = this.generateStudentBulletin(student.id, sem.id, anneeId);
        if (b) {
          generatedCount++;
          processedStudentIds.add(student.id);
        }
      });
    });

    return { total: generatedCount, studentsCount: processedStudentIds.size };
  }

  static ensureAllStudentsHaveBulletins(): void {
    const etudiants = this.getEtudiants();
    const semestres = this.getSemestres();
    const activeAnnee = this.getActiveAnneeAcademique();
    const bulletins = this.getBulletins();

    etudiants.forEach(st => {
      semestres.forEach(sem => {
        const exists = bulletins.some(b => 
          Number(b.etudiant_id) === Number(st.id) && 
          Number(b.semestre_id) === Number(sem.id) &&
          Number(b.annee_academique_id) === Number(activeAnnee.id)
        );
        if (!exists) {
          this.generateStudentBulletin(st.id, sem.id, activeAnnee.id);
        }
      });
    });
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
    saveToBackendTable('bulletins', result);
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

    const student = this.getEtudiants().find(e => e.id === item.etudiant_id);
    const classes = this.getClasses();
    const filieres = this.getFilieres();
    const annees = this.getAnneesAcademiques();
    const activeYear = this.getActiveAnneeAcademique();

    const classeObj = classes.find(c => c.id === (item.classe_id || student?.classe_id));
    const filiereObj = filieres.find(f => f.id === (item.filiere_id || classeObj?.filiere_id || (student as any)?.filiere_id));
    const anneeObj = annees.find(a => a.id === (item.annee_academique_id || activeYear.id));

    const fullPaiement = {
      ...item,
      annee_academique_id: item.annee_academique_id || anneeObj?.id || activeYear.id,
      filiere_id: item.filiere_id || filiereObj?.id,
      filiere_code: item.filiere_code || filiereObj?.code,
      filiere_nom: item.filiere_nom || filiereObj?.nom,
      classe_id: item.classe_id || classeObj?.id,
      classe_nom: item.classe_nom || classeObj?.nom,
      annee_libelle: item.annee_libelle || anneeObj?.libelle,
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
    saveToBackendTable('paiements', result);
    this.logAccess(item.id ? 'MODIFICATION' : 'CREATION', `${item.id ? 'Modification' : 'Enregistrement'} paiement : ${result.montant_paye.toLocaleString()} FCFA (${result.reference_recu} - ${result.mode_paiement})`, undefined, result.etudiant_id);

    // Notify student
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
    deleteFromBackendTable('paiements', id);
    this.logAccess('SUPPRESSION', `Suppression paiement ID #${id}`);
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
    saveToBackendTable('utilisateurs', result);
    this.logAccess(item.id ? 'MODIFICATION' : 'CREATION', `${item.id ? 'Modification' : 'Création'} utilisateur "${result.prenom} ${result.nom}" (${result.email})`, result.id);
    return result;
  }

  static deleteAdministrateur(id: number): void {
    const updated = this.getUtilisateurs().filter(u => u.id !== id);
    setItem(STORAGE_KEYS.UTILISATEURS, updated);
    setItem(STORAGE_KEYS.ADMINISTRATEURS, updated);
    deleteFromBackendTable('utilisateurs', id);
    this.logAccess('SUPPRESSION', `Suppression utilisateur ID #${id}`);
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
    
    // Find existing bulletin by id OR by (etudiant_id, semestre_id, annee_academique_id)
    const existingIdx = item.id 
      ? list.findIndex(b => Number(b.id) === Number(item.id))
      : list.findIndex(b => 
          Number(b.etudiant_id) === Number(item.etudiant_id) && 
          Number(b.semestre_id) === Number(item.semestre_id) && 
          Number(b.annee_academique_id) === Number(item.annee_academique_id)
        );

    if (existingIdx !== -1) {
      list[existingIdx] = { ...list[existingIdx], ...item, id: list[existingIdx].id };
      result = list[existingIdx];
    } else {
      const nextId = Math.max(0, ...list.map(b => b.id)) + 1;
      result = { ...item, id: nextId } as Bulletin;
      list.push(result);
    }
    setItem(STORAGE_KEYS.BULLETINS, list);
    saveToBackendTable('bulletins', result);
    this.logAccess(item.id ? 'MODIFICATION' : 'CREATION', `Génération bulletin étudiant ID #${result.etudiant_id} : Moyenne ${result.moyenne}/20 (${result.decision})`, undefined, result.etudiant_id);
    return result;
  }

  static deleteBulletin(id: number): void {
    const list = this.getBulletins();
    const target = list.find(b => Number(b.id) === Number(id));
    const filtered = list.filter(b => Number(b.id) !== Number(id));
    setItem(STORAGE_KEYS.BULLETINS, filtered);
    deleteFromBackendTable('bulletins', id);
    this.logAccess('SUPPRESSION', `Suppression du bulletin #${id} pour l'étudiant ID #${target?.etudiant_id || 'N/A'}`);
    toast.success("Bulletin supprimé", "Le bulletin a été supprimé avec succès");
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

  static getActiveUser(): { id?: number; nom?: string; prenom?: string; role?: string; email_or_matricule?: string } | null {
    try {
      const saved = localStorage.getItem('unigestion_active_user') || sessionStorage.getItem('unigestion_active_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }

  static logAccess(
    event_type: HistoriqueAcces['event_type'],
    description: string,
    userId?: number,
    etudiantId?: number,
    customAuteur?: string
  ): void {
    const list = this.getHistorique();
    const nextId = Math.max(0, ...list.map(h => h.id)) + 1;
    const active = this.getActiveUser();
    
    const resolvedAuteur = customAuteur || (
      active ? `${active.prenom} ${active.nom}` : (userId ? `Utilisateur #${userId}` : (etudiantId ? `Étudiant #${etudiantId}` : 'Système'))
    );
    const resolvedRole = active?.role || (userId ? 'ADMIN' : (etudiantId ? 'ETUDIANT' : 'SYSTÈME'));

    const entry: HistoriqueAcces = {
      id: nextId,
      utilisateur_id: userId || (active && active.role !== 'ETUDIANT' ? active.id : undefined),
      etudiant_id: etudiantId || (active && active.role === 'ETUDIANT' ? active.id : undefined),
      auteur: resolvedAuteur,
      auteur_role: resolvedRole,
      ip_adresse: '***.***.***.***', // Adresse IP masquée pour la confidentialité
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
    supprime_par?: string
  ): void {
    const list = this.getCorbeille();
    const nextId = Math.max(0, ...list.map(c => c.id)) + 1;
    const active = this.getActiveUser();
    const resolvedAuthor = supprime_par || (active ? `${active.prenom} ${active.nom}` : 'Administrateur');

    const item: CorbeilleItem = {
      id: nextId,
      type_element,
      element_id,
      titre,
      details,
      donnees_json: JSON.stringify(donnees),
      supprime_par: resolvedAuthor,
      supprime_le: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    list.unshift(item);
    setItem(STORAGE_KEYS.CORBEILLE, list);

    this.logAccess('SUPPRESSION', `Mise en corbeille : ${type_element} "${titre}" (ID #${element_id})`, undefined, undefined, resolvedAuthor);
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
      toast.success("Élément restauré avec succès", `${item.type_element} "${item.titre}"`);
      return true;
    } catch (e) {
      console.error('Error restoring item', e);
      toast.error("Erreur lors de la restauration");
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
