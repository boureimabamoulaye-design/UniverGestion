import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AuthUser, Paiement, Etudiant, SupportCours, Matiere } from '../types/database';
import { DB } from '../lib/storage';
import {
  GraduationCap,
  Award,
  CreditCard,
  AlertCircle,
  Save,
  Printer,
  CheckCircle,
  Eye,
  Calendar,
  FileText,
  User,
  UserCheck,
  ShieldCheck,
  Building2,
  DollarSign,
  Download,
  Lock,
  RefreshCw,
  BookOpen,
  Search,
  FolderOpen,
  ExternalLink,
  Layers,
  Sparkles,
  ChevronRight,
  Info,
  Clock
} from 'lucide-react';
import { Modal } from '../components/Modal';

interface EtudiantPortalViewProps {
  user: AuthUser;
  activeTab?: string;
  setActiveTab?: (tab: any) => void;
}

export const EtudiantPortalView: React.FC<EtudiantPortalViewProps> = ({
  user,
  activeTab = 'profil_etudiant',
  setActiveTab
}) => {
  // Real-time synchronization tick with DB updates
  const [dbTick, setDbTick] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const handleSync = () => setDbTick(t => t + 1);
    window.addEventListener('unigestion_db_change', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('unigestion_db_change', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await DB.syncFromBackend();
      setDbTick(t => t + 1);
    } catch (e) {
      console.error("Refresh error:", e);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  }, []);

  // Fetch updated student detail directly from DB
  const etudiants = DB.getEtudiants();
  const anyUser = user as any;
  const targetId = anyUser.etudiantDetail?.id || (anyUser.role?.toUpperCase() === 'ETUDIANT' ? anyUser.id : undefined);
  const matchedEtudiant = etudiants.find(e => 
    (targetId && Number(e.id) === Number(targetId)) || 
    (anyUser.matricule && e.matricule?.trim().toLowerCase() === anyUser.matricule.trim().toLowerCase()) ||
    (anyUser.email_or_matricule && (
      e.matricule?.trim().toLowerCase() === anyUser.email_or_matricule.trim().toLowerCase() || 
      e.email?.trim().toLowerCase() === anyUser.email_or_matricule.trim().toLowerCase()
    )) || 
    (anyUser.email && e.email?.trim().toLowerCase() === anyUser.email.trim().toLowerCase())
  );

  const etudiant: Etudiant = matchedEtudiant || user.etudiantDetail || etudiants[0] || {
    id: 1,
    matricule: anyUser.matricule || anyUser.email_or_matricule || '2024-USTTB-001',
    nom: user.nom || 'Traoré',
    prenom: user.prenom || 'Mamadou',
    email: anyUser.email || 'mamadou.traore@usttb.edu.ml',
    telephone: '+223 76 12 34 56',
    adresse: 'Badalabougou, Rue 12, Porte 45',
    date_naissance: '2003-05-12',
    lieu_naissance: 'Bamako',
    sexe: 'M' as const,
    statut: 'Inscrit' as const,
    nationalite: 'Malienne',
    filiere_id: 1,
    niveau_id: 1,
    classe_id: 1,
    date_inscription: '2025-10-01',
    mot_de_passe: 'etudiant123',
    tuteur_nom: 'Traoré',
    tuteur_prenom: 'Ousmane',
    tuteur_telephone: '+223 70 00 00 00',
    statut_compte: 'Actif',
    est_bloque: false
  };

  const enrollment = DB.getStudentActiveEnrollment(etudiant.id);
  const {
    hasActiveEnrollment,
    inscription: activeInscription,
    classe: studentClass,
    filiere: studentFiliere,
    niveau: studentNiveau
  } = enrollment;

  const classes = DB.getClasses();
  const filieres = DB.getFilieres();
  const facultes = DB.getFacultes();
  const studentFaculte = studentFiliere ? facultes.find(f => Number(f.id) === Number(studentFiliere.faculte_id)) || facultes[0] : facultes[0];
  const universite = DB.getUniversites()[0];
  const activeAnnee = DB.getActiveAnneeAcademique();
  const annees = DB.getAnneesAcademiques();
  const niveaux = DB.getNiveaux();
  const enseignants = DB.getEnseignants();

  const allSemestres = DB.getSemestres();
  const semestres = allSemestres.filter(s => !studentNiveau?.id || Number(s.niveau_id) === Number(studentNiveau.id));
  
  // STRICT FILIERE DATA ISOLATION: Only retrieve subjects and materials for the student's enrolled filière
  const matieres = DB.getStudentAuthorizedMatieres(etudiant.id);
  const authorizedMatiereIds = new Set(matieres.map(m => Number(m.id)));

  // Dynamic student data from DB (strictly scoped to this student and enrolled filiere)
  const notes = DB.getStudentAuthorizedNotes(etudiant.id);
  const paiements = DB.getPaiements().filter(p => Number(p.etudiant_id) === Number(etudiant.id));
  const absences = DB.getAbsences().filter(a => Number(a.etudiant_id) === Number(etudiant.id) && authorizedMatiereIds.has(Number(a.matiere_id)));
  const studentInscriptions = DB.getInscriptions().filter(i => Number(i.etudiant_id) === Number(etudiant.id));
  const studentBulletins = DB.getStudentAuthorizedBulletins(etudiant.id);

  // States
  const [selectedAnneeId, setSelectedAnneeId] = useState<number>(activeAnnee?.id || 1);
  const [selectedSemestreId, setSelectedSemestreId] = useState<number>(semestres[0]?.id || 1);

  // Backend authorization state
  const [backendAuthDeniedReason, setBackendAuthDeniedReason] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function verifyBackendStudentAccess() {
      if (!etudiant?.id) return;
      try {
        const response = await fetch('/api/etudiant/authorize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            etudiant_id: etudiant.id,
            filiere_id: studentFiliere?.id,
            classe_id: studentClass?.id
          })
        });

        if (response.ok) {
          const data = await response.json().catch(() => ({}));
          if (data.authorized === false) {
            if (isMounted) {
              setBackendAuthDeniedReason(data.message || "Accès restreint par l'administration.");
            }
          } else if (isMounted) {
            setBackendAuthDeniedReason(null);
          }
        }
      } catch (err) {
        if (isMounted) setBackendAuthDeniedReason(null);
      }
    }

    verifyBackendStudentAccess();
    return () => { isMounted = false; };
  }, [etudiant.id, studentFiliere?.id, studentClass?.id]);

  // Student Password Change State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.trim().length < 3) {
      setPasswordError('Le mot de passe doit contenir au moins 3 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas.');
      return;
    }

    etudiant.mot_de_passe = newPassword.trim();
    DB.saveEtudiant({
      ...etudiant,
      mot_de_passe: newPassword.trim()
    });

    setPasswordSuccess(true);
    setPasswordError('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPasswordSuccess(false), 4000);
  };

  const [viewingReceipt, setViewingReceipt] = useState<Paiement | null>(null);
  const [isQuitusModalOpen, setIsQuitusModalOpen] = useState(false);
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentModeFilter, setPaymentModeFilter] = useState('ALL');

  // Current selected tab state helper - Supports de cours directly integrated
  const validStudentTabs = ['profil_etudiant', 'supports_cours', 'examen', 'paiements', 'absences'];
  const currentTab = validStudentTabs.includes(activeTab) ? activeTab : 'profil_etudiant';

  // State for Course Materials (Supports de cours) connected directly to student's subjects
  const supportsCours = useMemo(() => DB.getStudentAuthorizedSupports(etudiant.id), [etudiant.id, dbTick]);
  const [courseSearch, setCourseSearch] = useState('');
  const [courseSemestreFilter, setCourseSemestreFilter] = useState<'all' | number>('all');
  const [viewingSupportModal, setViewingSupportModal] = useState<{ support: SupportCours; matiere?: Matiere } | null>(null);
  const [downloadToast, setDownloadToast] = useState<string | null>(null);

  const handleDownloadSupport = (support: SupportCours, mat?: Matiere) => {
    const url = support.fichier_url || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.download = `${(support.titre || 'Support_Cours').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadToast(`Téléchargement de "${support.titre}" lancé avec succès.`);
    setTimeout(() => setDownloadToast(null), 4000);
  };

  // Map student matieres with their attached supports
  const studentMatieresWithSupports = useMemo(() => {
    const targetFiliereId = studentFiliere?.id || etudiant.filiere_id;
    const targetMatieres = matieres.filter(m => !targetFiliereId || Number(m.filiere_id) === Number(targetFiliereId));

    return targetMatieres.map(m => {
      const semObj = semestres.find(s => Number(s.id) === Number(m.semestre_id));
      const ensObj = enseignants.find(e => Number(e.id) === Number(m.enseignant_id));
      
      // Directly attached supports from supports_cours table
      const attached = supportsCours.filter(s => Number(s.matiere_id) === Number(m.id));
      
      // If matiere has support_fichier_nom or support_fichier_url that is not yet in attached
      if ((m.support_fichier_nom || m.support_fichier_url) && !attached.some(s => s.fichier_url === m.support_fichier_url || s.titre.includes(m.support_fichier_nom || ''))) {
        attached.unshift({
          id: 8000 + Number(m.id),
          titre: m.support_titre || m.support_fichier_nom || `Support de cours : ${m.nom}`,
          matiere_id: m.id,
          filiere_id: m.filiere_id,
          type_document: (m.support_type_document as any) ||
            ((m.support_fichier_nom?.endsWith('.ppt') || m.support_fichier_nom?.endsWith('.pptx'))
              ? 'Diaporama PPT'
              : (m.support_fichier_nom?.endsWith('.doc') || m.support_fichier_nom?.endsWith('.docx'))
                ? 'Fiche TP/TD'
                : 'PDF'),
          fichier_url: m.support_fichier_url || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          description: m.support_description || `Document et cours officiel transmis par l'enseignant pour la matière ${m.code} - ${m.nom}.`,
          publie_par: m.enseignant_nom || (ensObj ? `${ensObj.prenom} ${ensObj.nom}` : 'Enseignant Titulaire'),
          date_publication: '2025-10-15'
        });
      }

      return {
        matiere: m,
        semestre: semObj,
        enseignant: ensObj,
        supports: attached
      };
    });
  }, [matieres, semestres, enseignants, supportsCours, studentFiliere?.id, etudiant.filiere_id]);

  const filteredMatieresWithSupports = useMemo(() => {
    return studentMatieresWithSupports.filter(item => {
      // Semester filter
      if (courseSemestreFilter !== 'all' && Number(item.matiere.semestre_id) !== Number(courseSemestreFilter)) {
        return false;
      }
      // Search filter
      if (courseSearch.trim()) {
        const query = courseSearch.toLowerCase();
        const matchCode = item.matiere.code.toLowerCase().includes(query);
        const matchNom = item.matiere.nom.toLowerCase().includes(query);
        const matchUE = item.matiere.ue_nom?.toLowerCase().includes(query) || false;
        const matchEns = item.enseignant ? `${item.enseignant.prenom} ${item.enseignant.nom}`.toLowerCase().includes(query) : false;
        const matchDoc = item.supports.some(s => s.titre.toLowerCase().includes(query) || (s.description && s.description.toLowerCase().includes(query)));
        return matchCode || matchNom || matchUE || matchEns || matchDoc;
      }
      return true;
    });
  }, [studentMatieresWithSupports, courseSemestreFilter, courseSearch]);

  const totalStudentSupportsCount = useMemo(() => {
    return studentMatieresWithSupports.reduce((acc, curr) => acc + curr.supports.length, 0);
  }, [studentMatieresWithSupports]);

  const getMention = (avg: number | null) => {
    if (avg === null) return 'En attente';
    if (avg >= 16) return 'Très Bien';
    if (avg >= 14) return 'Bien';
    if (avg >= 12) return 'Assez Bien';
    if (avg >= 10) return 'Passable';
    return 'Ajourné';
  };

  // Filter semestres assigned to student's level & filière (e.g. S1 & S2) or where student has grades
  const studentNiveauId = studentClass?.niveau_id || etudiant.niveau_id || 1;
  const assignedSemestres = semestres.filter(s => Number(s.niveau_id) === Number(studentNiveauId));
  const semesterIdsWithNotes = new Set(notes.map(n => Number(n.semestre_id)));
  const semestresWithNotes = semestres.filter(s => semesterIdsWithNotes.has(Number(s.id)));
  
  const combinedSemestres = [...assignedSemestres];
  semestresWithNotes.forEach(sn => {
    if (!combinedSemestres.some(cs => Number(cs.id) === Number(sn.id))) {
      combinedSemestres.push(sn);
    }
  });

  const activeSemestres = combinedSemestres.length > 0 
    ? combinedSemestres.sort((a, b) => (a.ordre || a.id) - (b.ordre || b.id))
    : semestres.slice(0, 2);

  // Tab mode for Examen tab: semester ID (1 for S1, 2 for S2) or 0 = Bilan Annuel
  const [examenViewFilter, setExamenViewFilter] = useState<number>(1);

  // Per-semester detailed calculations
  const semestresCalculations = activeSemestres.map(sem => {
    // Matieres for this semester & filiere
    const semMatieres = matieres.filter(m => 
      Number(m.semestre_id) === Number(sem.id) && 
      (!m.filiere_id || Number(m.filiere_id) === Number(studentFiliere?.id) || Number(m.filiere_id) === Number(etudiant.filiere_id))
    );
    const semNotes = notes.filter(n => 
      Number(n.semestre_id) === Number(sem.id) &&
      (!n.annee_academique_id || Number(n.annee_academique_id) === Number(selectedAnneeId))
    );
    const noteMatiereIds = new Set(semNotes.map(n => Number(n.matiere_id)));
    const extraMatieresWithNotes = matieres.filter(m => noteMatiereIds.has(Number(m.id)) && !semMatieres.some(sm => Number(sm.id) === Number(m.id)));

    let applicableMatieres = [...semMatieres, ...extraMatieresWithNotes];
    if (applicableMatieres.length === 0) {
      applicableMatieres = matieres.filter(m => Number(m.semestre_id) === Number(sem.id));
    }
    if (applicableMatieres.length === 0 && matieres.length > 0) {
      applicableMatieres = matieres.filter(m => !m.filiere_id || Number(m.filiere_id) === Number(studentFiliere?.id) || Number(m.filiere_id) === Number(etudiant.filiere_id));
    }

    let semTotalPoints = 0;
    let semTotalCredits = 0;
    let semCreditsValidated = 0;

    const tableRows = applicableMatieres.map(mat => {
      const noteObj = semNotes.find(n => Number(n.matiere_id) === Number(mat.id));
      const cc = noteObj && noteObj.note_cc !== undefined && noteObj.note_cc !== null ? Number(noteObj.note_cc) : null;
      const exam = noteObj && noteObj.note_examen !== undefined && noteObj.note_examen !== null ? Number(noteObj.note_examen) : null;
      const finale = noteObj && noteObj.note_finale !== undefined && noteObj.note_finale !== null 
        ? Number(noteObj.note_finale) 
        : (cc !== null && exam !== null ? Math.round((cc * 0.4 + exam * 0.6) * 100) / 100 : null);
      const isValidated = finale !== null && finale >= 10;

      if (finale !== null) {
        semTotalPoints += finale * (mat.credits || 1);
        semTotalCredits += mat.credits || 1;
        if (isValidated) {
          semCreditsValidated += mat.credits || 1;
        }
      }

      return {
        matiere: mat,
        cc,
        exam,
        finale,
        isValidated
      };
    });

    const average = semTotalCredits > 0
      ? Math.round((semTotalPoints / semTotalCredits) * 100) / 100
      : (semNotes.length > 0
        ? Math.round((semNotes.reduce((acc, curr) => acc + curr.note_finale, 0) / semNotes.length) * 100) / 100
        : null);

    return {
      semestre: sem,
      matieres: applicableMatieres,
      rows: tableRows,
      average,
      totalCredits: semTotalCredits || applicableMatieres.reduce((acc, m) => acc + (m.credits || 1), 0),
      validatedCredits: semCreditsValidated,
      isAdmis: average !== null && average >= 10,
      mention: getMention(average)
    };
  });

  // Calculate Global Annual Summary (S1 + S2)
  let annualTotalPoints = 0;
  let annualTotalCredits = 0;
  let annualValidatedCredits = 0;

  semestresCalculations.forEach(sc => {
    sc.rows.forEach(r => {
      if (r.finale !== null) {
        annualTotalPoints += r.finale * (r.matiere.credits || 1);
        annualTotalCredits += r.matiere.credits || 1;
        if (r.isValidated) annualValidatedCredits += r.matiere.credits || 1;
      }
    });
  });

  const annualAverage = annualTotalCredits > 0
    ? Math.round((annualTotalPoints / annualTotalCredits) * 100) / 100
    : (() => {
        const validAvgs = semestresCalculations.map(s => s.average).filter((a): a is number => a !== null);
        if (validAvgs.length === 0) return null;
        return Math.round((validAvgs.reduce((a, b) => a + b, 0) / validAvgs.length) * 100) / 100;
      })();

  const isAnnualAdmis = annualAverage !== null && annualAverage >= 10;
  const annualMention = getMention(annualAverage);

  // Backward compatibility helpers for selectedSemestreId
  const currentSelectedSemCalculation = semestresCalculations.find(sc => Number(sc.semestre.id) === Number(selectedSemestreId)) || semestresCalculations[0];
  const semesterAverage = currentSelectedSemCalculation?.average ?? null;
  const creditsValidated = currentSelectedSemCalculation?.validatedCredits ?? 0;
  const totalCreditsSemester = currentSelectedSemCalculation?.totalCredits ?? 30;
  const semesterMatieres = currentSelectedSemCalculation?.matieres ?? [];
  const notesTableData = currentSelectedSemCalculation?.rows ?? [];

  // Gather student's inscriptions & training fees (Frais de formation) across all registered filières
  const fraisFormationList = (() => {
    const list: { filiereCode: string; filiereNom: string; montant: number; reduction: number; montantDu: number; annee: string }[] = [];
    const seenClasses = new Set<number>();

    studentInscriptions.forEach(insc => {
      seenClasses.add(Number(insc.classe_id));
      const cls = classes.find(c => Number(c.id) === Number(insc.classe_id));
      const fil = filieres.find(f => Number(f.id) === Number(cls?.filiere_id));
      const code = fil?.code || cls?.code || 'IG1';
      const nom = fil?.nom || cls?.nom || 'Informatique de Gestion';
      const montant = insc.frais_inscription || fil?.frais_scolarite || (code === 'IG1' ? 550000 : code === 'IG2' ? 450000 : 500000);
      const reduction = 0;
      const anneeObj = annees.find(a => Number(a.id) === Number(insc.annee_academique_id));
      list.push({
        filiereCode: code,
        filiereNom: nom,
        montant,
        reduction,
        montantDu: montant - reduction,
        annee: anneeObj ? anneeObj.code.replace('-', ' - ') : '2025 - 2026'
      });
    });

    if (etudiant.classe_id && !seenClasses.has(Number(etudiant.classe_id))) {
      const cls = studentClass;
      const fil = studentFiliere;
      const code = fil?.code || cls?.code || 'IG1';
      const nom = fil?.nom || cls?.nom || 'Informatique de Gestion';
      const montant = fil?.frais_scolarite || (code === 'IG1' ? 550000 : code === 'IG2' ? 450000 : 500000);
      const reduction = 0;
      list.push({
        filiereCode: code,
        filiereNom: nom,
        montant,
        reduction,
        montantDu: montant - reduction,
        annee: activeAnnee?.code.replace('-', ' - ') || '2025 - 2026'
      });
    }

    if (list.length === 0) {
      list.push({
        filiereCode: studentFiliere?.code || 'IG1',
        filiereNom: studentFiliere?.nom || 'Informatique de Gestion',
        montant: studentFiliere?.frais_scolarite || 550000,
        reduction: 0,
        montantDu: studentFiliere?.frais_scolarite || 550000,
        annee: activeAnnee?.code.replace('-', ' - ') || '2025 - 2026'
      });
    }

    return list;
  })();

  const totalFraisDusSum = fraisFormationList.reduce((sum, item) => sum + item.montantDu, 0);
  const totalMontantPaye = paiements.reduce((acc, p) => acc + (p.montant_paye || 0), 0);
  const soldeRestant = Math.max(0, totalFraisDusSum - totalMontantPaye);
  const tauxReglement = totalFraisDusSum > 0 ? Math.min(100, Math.round((totalMontantPaye / totalFraisDusSum) * 100)) : 100;
  const isCompteSolde = soldeRestant <= 0 && totalMontantPaye > 0;

  // Filtered payments list for the student
  const filteredPaiements = useMemo(() => {
    return paiements.filter(p => {
      if (paymentModeFilter !== 'ALL' && p.mode_paiement !== paymentModeFilter) {
        return false;
      }
      if (paymentSearch.trim()) {
        const q = paymentSearch.toLowerCase();
        const refMatch = p.reference_recu?.toLowerCase().includes(q);
        const typeMatch = p.type_frais?.toLowerCase().includes(q);
        const modeMatch = p.mode_paiement?.toLowerCase().includes(q);
        const remMatch = p.remarque?.toLowerCase().includes(q);
        if (!refMatch && !typeMatch && !modeMatch && !remMatch) return false;
      }
      return true;
    });
  }, [paiements, paymentModeFilter, paymentSearch]);

  const paiementsFiliereList = paiements.map((p, idx) => {
    let filiereCode = p.filiere_code;
    if (!filiereCode) {
      const matchingInsc = studentInscriptions.find(i => Number(i.annee_academique_id) === Number(p.annee_academique_id));
      if (matchingInsc) {
        const cls = classes.find(c => Number(c.id) === Number(matchingInsc.classe_id));
        const fil = filieres.find(f => Number(f.id) === Number(cls?.filiere_id));
        filiereCode = fil?.code || cls?.code;
      }
    }
    if (!filiereCode) {
      filiereCode = idx === 0 ? 'IG1' : 'IG2';
    }

    const anneeObj = annees.find(a => Number(a.id) === Number(p.annee_academique_id));
    const anneeText = p.annee_libelle || (anneeObj ? anneeObj.code.replace('-', ' - ') : '2025 - 2026');

    return {
      filiereCode,
      montantPaye: p.montant_paye,
      datePaiement: p.date_paiement,
      anneeText,
      modePaiement: p.mode_paiement,
      reference: p.reference_recu,
      typeFrais: p.type_frais
    };
  });

  const isGlobalLock = DB.isGlobalStudentLockActive();
  const isIndividualLock = etudiant && (
    etudiant.statut_compte === 'Bloqué' ||
    etudiant.est_bloque ||
    etudiant.statut === 'Bloqué' ||
    (etudiant.statut as string) === 'Suspendu'
  );
  const isBlocked = isGlobalLock || isIndividualLock || !!backendAuthDeniedReason;

  if (isBlocked) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4">
        <div className="max-w-xl w-full bg-white rounded-3xl border border-red-200 shadow-2xl p-8 sm:p-10 text-center space-y-6 animate-in zoom-in-95 duration-200">
          
          <div className="w-20 h-20 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner border border-red-200">
            <Lock className="w-10 h-10" />
          </div>
          
          <div className="space-y-1">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
              Accès Restreint & Compte Indisponible
            </h2>
            <p className="text-xs font-bold text-red-600 uppercase tracking-wider">
              {backendAuthDeniedReason
                ? "Contrôle d'Accès Sécurisé Backend - Accès Refusé"
                : isGlobalLock 
                  ? "Verrouillage Général de l'Espace Étudiant Actif" 
                  : "Statut 'Bloqué' ou 'Suspendu' Détecté"}
            </p>
          </div>

          <div className="p-5 bg-red-50/90 border border-red-200/90 rounded-2xl text-xs text-slate-800 leading-relaxed font-medium text-left space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                {backendAuthDeniedReason ? (
                  <p>
                    <b>Validation du Serveur Backend MySQL :</b> {backendAuthDeniedReason}
                  </p>
                ) : isGlobalLock ? (
                  <p>
                    L'accès à l'ensemble du portail étudiant est temporairement verrouillé par l'administration générale de l'université. Toutes les fonctionnalités (bulletins, notes, paiements et profil) sont masquées.
                  </p>
                ) : (
                  <p>
                    Le statut de votre dossier étudiant est actuellement défini comme <b>Bloqué / Suspendu</b> dans le système académique. Votre interface portail a été restreinte par mesure de sécurité administrative.
                  </p>
                )}
              </div>
            </div>

            <p className="text-slate-600 text-[11px] font-medium border-t border-red-200/60 pt-2.5">
              Pour débloquer votre accès ou obtenir plus d'informations concernant votre situation administrative ou financière, veuillez vous adresser directement au <b>Service de la Scolarité et des Examens</b>.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-500 font-mono gap-2">
            <span>Étudiant : <b>{etudiant.prenom} {etudiant.nom}</b></span>
            <span>Matricule : <b className="text-slate-900 font-bold">{etudiant.matricule}</b></span>
          </div>

        </div>
      </div>
    );
  }

  // NO ACTIVE ENROLLMENT IN ANY FILIERE
  if (!hasActiveEnrollment || !studentFiliere) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-xl w-full bg-white rounded-3xl border border-amber-200 shadow-2xl p-8 sm:p-10 text-center space-y-6 animate-in zoom-in-95 duration-200">
          <div className="w-20 h-20 bg-amber-100 text-amber-700 rounded-3xl flex items-center justify-center mx-auto shadow-inner border border-amber-200">
            <AlertCircle className="w-10 h-10" />
          </div>
          
          <div className="space-y-1">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
              Aucune Inscription Active
            </h2>
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">
              Dossier académique en attente d'inscription dans une filière
            </p>
          </div>

          <div className="p-5 bg-amber-50/90 border border-amber-200/90 rounded-2xl text-xs text-slate-800 leading-relaxed font-medium text-left space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
              <div>
                <p>
                  Aucune inscription active n'est disponible pour votre compte étudiant. Conformément au règlement pédagogique, les cours, notes, bulletins et examens ne peuvent être affichés qu'après validation de votre inscription dans une filière officielle.
                </p>
              </div>
            </div>

            <p className="text-slate-600 text-[11px] font-medium border-t border-amber-200/60 pt-2.5">
              Pour finaliser votre inscription administrative ou pédagogique, veuillez contacter le <b>Service de la Scolarité et des Inscriptions</b>.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-500 font-mono gap-2">
            <span>Étudiant : <b>{etudiant.prenom} {etudiant.nom}</b></span>
            <span>Matricule : <b className="text-slate-900 font-bold">{etudiant.matricule}</b></span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* TAB SUPPORTS DE COURS DIRECTEMENT CONNECTÉS AUX MATIÈRES */}
      {currentTab === 'supports_cours' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Top Banner & Control Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 md:p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
                      <span>Supports de Cours & Polycopiés</span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                        {totalStudentSupportsCount} document{totalStudentSupportsCount > 1 ? 's' : ''}
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Filière : <b className="text-slate-800">{studentFiliere?.nom || 'Informatique'}</b> • Classe : <b className="text-slate-800">{studentClass?.code || 'L1'}</b> ({matieres.length} matières inscrites)
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Semester Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setCourseSemestreFilter('all')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    courseSemestreFilter === 'all'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tous les semestres ({studentMatieresWithSupports.length})
                </button>
                {activeSemestres.map(s => {
                  const countForSem = studentMatieresWithSupports.filter(m => Number(m.matiere.semestre_id) === Number(s.id)).length;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setCourseSemestreFilter(s.id)}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                        courseSemestreFilter === s.id
                          ? 'bg-white text-blue-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {s.code || s.libelle} ({countForSem})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Search Input Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={courseSearch}
                onChange={(e) => setCourseSearch(e.target.value)}
                placeholder="Rechercher une matière, un code (ex: INF101, SQL), un enseignant ou un document..."
                className="w-full h-11 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
              />
              {courseSearch && (
                <button
                  type="button"
                  onClick={() => setCourseSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
                >
                  Effacer
                </button>
              )}
            </div>
          </div>

          {/* Subjects and Course Materials List */}
          {filteredMatieresWithSupports.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">Aucune matière ou support trouvé</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Aucun résultat ne correspond à votre recherche "{courseSearch}". Essayez un autre terme ou réinitialisez les filtres.
              </p>
              <button
                type="button"
                onClick={() => { setCourseSearch(''); setCourseSemestreFilter('all'); }}
                className="px-4 py-2 bg-blue-50 text-blue-700 font-bold text-xs rounded-xl hover:bg-blue-100 transition-colors"
              >
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMatieresWithSupports.map(({ matiere: mat, semestre: sem, enseignant: ens, supports: matSupports }) => {
                const ensName = ens ? `${ens.prenom} ${ens.nom}` : mat.enseignant_nom || 'Enseignant Titulaire';

                return (
                  <div
                    key={mat.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all hover:border-slate-300"
                  >
                    {/* Subject Header Bar */}
                    <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start sm:items-center gap-3">
                        <div className="px-2.5 py-1.5 bg-blue-600 text-white rounded-xl font-mono font-black text-xs shadow-2xs">
                          {mat.code}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                              {mat.nom}
                            </h3>
                            {sem && (
                              <span className="px-2 py-0.5 rounded-md bg-slate-200/80 text-slate-700 text-[10px] font-extrabold font-mono">
                                {sem.code || sem.libelle}
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold">
                              {mat.credits || 3} Crédits
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-2">
                            <span>{mat.ue_nom || 'Unité d\'Enseignement'}</span>
                            <span>•</span>
                            <span>Enseignant : <b className="text-slate-700">{ensName}</b></span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-xl text-[11px] font-bold ${
                          matSupports.length > 0
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}>
                          {matSupports.length} support{matSupports.length > 1 ? 's' : ''} disponible{matSupports.length > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    {/* Course Documents List */}
                    <div className="p-4 sm:p-5">
                      {matSupports.length === 0 ? (
                        <div className="p-4 bg-slate-50/70 rounded-xl border border-dashed border-slate-200 flex items-center justify-between gap-3 text-xs text-slate-500">
                          <div className="flex items-center gap-2">
                            <Info className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <span>Aucun support de cours n'a encore été téléversé par l'enseignant pour cette matière.</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">En attente de publication</span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {matSupports.map((doc) => {
                            const isPPT = doc.type_document === 'Diaporama PPT';
                            const isTP = doc.type_document === 'Fiche TP/TD';
                            const isDevoir = doc.type_document === 'Devoir / Exercice';

                            const badgeColor = isPPT
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : isTP
                                ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                : isDevoir
                                  ? 'bg-purple-50 text-purple-800 border-purple-200'
                                  : 'bg-rose-50 text-rose-800 border-rose-200';

                            return (
                              <div
                                key={doc.id}
                                className="p-4 bg-slate-50/60 hover:bg-blue-50/30 rounded-xl border border-slate-200 transition-all flex flex-col justify-between gap-3 group"
                              >
                                <div className="space-y-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <div className={`p-2 rounded-lg ${
                                        isPPT ? 'bg-amber-100 text-amber-700' :
                                        isTP ? 'bg-indigo-100 text-indigo-700' :
                                        isDevoir ? 'bg-purple-100 text-purple-700' :
                                        'bg-rose-100 text-rose-700'
                                      }`}>
                                        <FileText className="w-4 h-4" />
                                      </div>
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${badgeColor}`}>
                                        {doc.type_document || 'PDF'}
                                      </span>
                                    </div>

                                    {doc.date_publication && (
                                      <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                                        <Clock className="w-3 h-3" />
                                        {doc.date_publication}
                                      </span>
                                    )}
                                  </div>

                                  <div>
                                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-blue-700 transition-colors leading-snug">
                                      {doc.titre}
                                    </h4>
                                    {doc.description && (
                                      <p className="text-[11px] text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                                        {doc.description}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                                  <span className="text-[10px] text-slate-500 truncate max-w-[140px]">
                                    Par : <b>{doc.publie_par || ensName}</b>
                                  </span>

                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => setViewingSupportModal({ support: doc, matiere: mat })}
                                      className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors shadow-2xs"
                                      title="Lire et prévisualiser le document"
                                    >
                                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                                      <span>Aperçu</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleDownloadSupport(doc, mat)}
                                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                                      title="Télécharger le fichier sur votre appareil"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                      <span>Télécharger</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* TAB EXAMEN & RELEVÉ DE NOTES */}
      {currentTab === 'examen' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Semester Selector & Quick Actions */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <label htmlFor="select-semestre-filter" className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>Sélectionner le Relevé :</span>
              </label>
              <select
                id="select-semestre-filter"
                value={examenViewFilter}
                onChange={(e) => setExamenViewFilter(Number(e.target.value))}
                className="h-10 px-3.5 bg-slate-50 border border-slate-300 text-slate-900 rounded-xl text-xs font-bold focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 cursor-pointer"
              >
                {semestresCalculations.map(sc => (
                  <option key={sc.semestre.id} value={sc.semestre.id}>
                    {sc.semestre.libelle} {sc.average !== null && !isNaN(Number(sc.average)) ? `(${Number(sc.average).toFixed(2)}/20)` : ''}
                  </option>
                ))}
                <option value={0}>
                  Bilan Annuel Global (S1 + S2) {annualAverage !== null && !isNaN(Number(annualAverage)) ? `(${Number(annualAverage).toFixed(2)}/20)` : ''}
                </option>
              </select>
            </div>

            {/* Quick Actions & Status Badge */}
            <div className="flex flex-wrap items-center gap-2.5">
              {examenViewFilter !== 0 ? (
                (() => {
                  const currentSc = semestresCalculations.find(sc => sc.semestre.id === examenViewFilter);
                  if (!currentSc) return null;
                  return (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-medium">Moyenne {currentSc.semestre.code} :</span>
                      <span className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 font-mono font-bold text-xs">
                        {currentSc.average !== null ? `${currentSc.average.toFixed(2)} / 20` : '--'}
                      </span>
                    </div>
                  );
                })()
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Moyenne Annuelle :</span>
                  <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-mono font-bold text-xs shadow-2xs">
                    {annualAverage !== null ? `${Number(annualAverage).toFixed(2)} / 20` : '--'}
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={() => window.print()}
                className="h-9 px-3.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                title="Télécharger le relevé de notes en format PDF"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>Télécharger</span>
              </button>
            </div>
          </div>

          {/* TABLEAU RÉCAPITULATIF DU BILAN ANNUEL (S1 + S2) - SI BILAN GLOBAL SÉLECTIONNÉ */}
          {examenViewFilter === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span className="font-bold text-xs uppercase tracking-wide">
                    Bilan Annuel Consolidé LMD • {studentFiliere?.nom || 'Informatique'} ({studentClass?.code || 'L1'})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-300">Résultat Annuel :</span>
                  <span className={`px-2.5 py-0.5 rounded text-[11px] font-black uppercase ${
                    isAnnualAdmis ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                  }`}>
                    {annualAverage !== null ? (isAnnualAdmis ? 'Admis(e)' : 'Ajourné(e)') : 'En attente'}
                  </span>
                </div>
              </div>

              {/* Structured Compact Annual Summary Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[620px]">
                  <thead>
                    <tr className="bg-slate-100 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                      <th className="px-3 py-2 border-r border-slate-200">Matière / Semestre</th>
                      <th className="px-2.5 py-2 text-center border-r border-slate-200 w-28">Note de classe</th>
                      <th className="px-2.5 py-2 text-center border-r border-slate-200 w-28">Note d'examen</th>
                      <th className="px-2.5 py-2 text-center border-r border-slate-200 w-32 bg-blue-50/60 text-blue-900 font-extrabold">Moyenne générale</th>
                      <th className="px-2.5 py-2 text-center border-r border-slate-200 w-28">Crédit</th>
                      <th className="px-2.5 py-2 text-center border-r border-slate-200 w-28">Mention</th>
                      <th className="px-2.5 py-2 text-center w-24">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs divide-y divide-slate-200">
                    {semestresCalculations.map((sc, idx) => {
                      let totalCc = 0;
                      let totalExam = 0;
                      let validRowsCount = 0;
                      sc.rows.forEach(r => {
                        if (r.cc !== null && r.exam !== null) {
                          totalCc += r.cc;
                          totalExam += r.exam;
                          validRowsCount++;
                        }
                      });
                      const avgCc = validRowsCount > 0 ? (totalCc / validRowsCount).toFixed(2) : '--';
                      const avgExam = validRowsCount > 0 ? (totalExam / validRowsCount).toFixed(2) : '--';

                      return (
                        <tr key={sc.semestre.id} className={idx % 2 === 0 ? 'bg-white hover:bg-slate-50/80' : 'bg-slate-50/40 hover:bg-slate-50/80'}>
                          <td className="px-3 py-2 font-bold text-slate-900 border-r border-slate-200">
                            <span className="font-mono text-blue-700 mr-1.5">[{sc.semestre.code}]</span>
                            <span>{sc.semestre.libelle}</span>
                          </td>
                          <td className="px-2.5 py-2 text-center font-mono text-slate-700 border-r border-slate-200">
                            {avgCc}
                          </td>
                          <td className="px-2.5 py-2 text-center font-mono text-slate-700 border-r border-slate-200">
                            {avgExam}
                          </td>
                          <td className="px-2.5 py-2 text-center font-mono font-bold text-blue-700 border-r border-slate-200 bg-blue-50/30">
                            {sc.average !== null ? `${sc.average.toFixed(2)} / 20` : '--'}
                          </td>
                          <td className="px-2.5 py-2 text-center font-mono font-bold text-slate-800 border-r border-slate-200">
                            {sc.validatedCredits} / {sc.totalCredits}
                          </td>
                          <td className="px-2.5 py-2 text-center font-semibold text-slate-800 border-r border-slate-200 text-[11px]">
                            {sc.mention}
                          </td>
                          <td className="px-2.5 py-2 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              sc.isAdmis ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'
                            }`}>
                              {sc.average !== null ? (sc.isAdmis ? 'Validé' : 'Ajourné') : 'En attente'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Ligne Bilan Annuel Global */}
                    <tr className="bg-slate-100 font-extrabold text-slate-900 border-t border-slate-300">
                      <td colSpan={3} className="px-3 py-2 uppercase tracking-wide text-xs border-r border-slate-300">
                        TOTAL ANNUEL
                      </td>
                      <td className="px-2.5 py-2 text-center font-mono font-black text-sm text-blue-700 border-r border-slate-300 bg-blue-100/70">
                        {annualAverage !== null ? `${Number(annualAverage).toFixed(2)} / 20` : '--'}
                      </td>
                      <td className="px-2.5 py-2 text-center font-mono border-r border-slate-300 text-slate-900 font-bold">
                        {annualValidatedCredits} / {annualTotalCredits}
                      </td>
                      <td className="px-2.5 py-2 text-center font-bold text-slate-900 border-r border-slate-300 text-[11px]">
                        {annualMention}
                      </td>
                      <td className="px-2.5 py-2 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-black uppercase ${
                          isAnnualAdmis ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                        }`}>
                          {annualAverage !== null ? (isAnnualAdmis ? 'Admis(e)' : 'Ajourné(e)') : 'En attente'}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Detailed Exam Marks Tables (Relevés sous forme de tableau compact avec colonnes exactes) */}
          {semestresCalculations
            .filter(sc => examenViewFilter === 0 || examenViewFilter === sc.semestre.id)
            .map(sc => {
              return (
                <div key={sc.semestre.id} className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                  
                  {/* Table Header Bar */}
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-extrabold text-[11px] font-mono">
                        {sc.semestre.code}
                      </span>
                      <span className="font-bold text-xs text-slate-900 uppercase">
                        Relevé de Notes - {sc.semestre.libelle}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-slate-600 text-[11px]">
                        Moyenne : <b className="text-blue-700 font-mono font-bold">{sc.average !== null ? sc.average.toFixed(2) : '--'}/20</b>
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        sc.isAdmis
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}>
                        {sc.average !== null ? (sc.isAdmis ? 'Admis' : 'Ajourné') : 'En attente'}
                      </span>
                    </div>
                  </div>

                  {/* Structured Table: Matiere, note de classe, note d'examen, moyenne generale, credit, mention, statut */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[620px]">
                      <thead>
                        <tr className="bg-slate-100 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                          <th className="px-3 py-2 border-r border-slate-200">Matière</th>
                          <th className="px-2.5 py-2 text-center border-r border-slate-200 w-28">Note de classe</th>
                          <th className="px-2.5 py-2 text-center border-r border-slate-200 w-28">Note d'examen</th>
                          <th className="px-2.5 py-2 text-center border-r border-slate-200 w-32 bg-blue-50/60 text-blue-900 font-extrabold">Moyenne générale</th>
                          <th className="px-2.5 py-2 text-center border-r border-slate-200 w-28">Crédit</th>
                          <th className="px-2.5 py-2 text-center border-r border-slate-200 w-28">Mention</th>
                          <th className="px-2.5 py-2 text-center w-24">Statut</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs divide-y divide-slate-200">
                        {sc.rows.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-3 py-6 text-center text-slate-400 font-medium italic">
                              Aucune note enregistrée pour le {sc.semestre.libelle}.
                            </td>
                          </tr>
                        ) : (
                          sc.rows.map((row, idx) => {
                            const credits = row.matiere.credits || 3;
                            let mentionMatiere = '--';
                            if (row.finale !== null) {
                              if (row.finale >= 16) mentionMatiere = 'Très Bien';
                              else if (row.finale >= 14) mentionMatiere = 'Bien';
                              else if (row.finale >= 12) mentionMatiere = 'Assez Bien';
                              else if (row.finale >= 10) mentionMatiere = 'Passable';
                              else mentionMatiere = 'Ajourné';
                            }

                            return (
                              <tr key={row.matiere.id || idx} className={idx % 2 === 0 ? 'bg-white hover:bg-slate-50/80' : 'bg-slate-50/40 hover:bg-slate-50/80'}>
                                <td className="px-3 py-1.5 font-semibold text-slate-900 border-r border-slate-200">
                                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                                    <div>
                                      <span className="font-mono text-[10.5px] text-blue-600 font-bold mr-1.5">{row.matiere.code}</span>
                                      <span>{row.matiere.nom}</span>
                                    </div>
                                    {(() => {
                                      const matSupports = supportsCours.filter(s => Number(s.matiere_id) === Number(row.matiere.id));
                                      if (matSupports.length === 0) return null;
                                      return (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (setActiveTab) setActiveTab('supports_cours');
                                            setCourseSearch(row.matiere.code);
                                          }}
                                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
                                          title={`Accéder aux ${matSupports.length} support(s) de cours pour ${row.matiere.nom}`}
                                        >
                                          <BookOpen className="w-3 h-3 text-blue-600" />
                                          <span>Supports ({matSupports.length})</span>
                                        </button>
                                      );
                                    })()}
                                  </div>
                                </td>
                                <td className="px-2.5 py-1.5 text-center font-mono text-slate-700 border-r border-slate-200">
                                  {row.cc !== null ? row.cc.toFixed(2) : '--'}
                                </td>
                                <td className="px-2.5 py-1.5 text-center font-mono text-slate-700 border-r border-slate-200">
                                  {row.exam !== null ? row.exam.toFixed(2) : '--'}
                                </td>
                                <td className="px-2.5 py-1.5 text-center font-mono font-bold text-slate-950 border-r border-slate-200 bg-blue-50/30">
                                  {row.finale !== null ? row.finale.toFixed(2) : '--'}
                                </td>
                                <td className="px-2.5 py-1.5 text-center font-bold text-slate-700 font-mono border-r border-slate-200">
                                  {credits}
                                </td>
                                <td className="px-2.5 py-1.5 text-center font-medium text-slate-700 text-[11px] border-r border-slate-200">
                                  {mentionMatiere}
                                </td>
                                <td className="px-2.5 py-1.5 text-center whitespace-nowrap">
                                  {row.finale !== null ? (
                                    row.isValidated ? (
                                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                                        Validée
                                      </span>
                                    ) : (
                                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-300">
                                        À Rattraper
                                      </span>
                                    )
                                  ) : (
                                    <span className="text-slate-400 italic text-[11px]">En attente</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}

                        {/* Totals & Semester Summary Footer Row: TOTAL SEMESTRE */}
                        <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                          <td colSpan={3} className="px-3 py-2 uppercase tracking-wide text-xs border-r border-slate-300 font-extrabold">
                            TOTAL SEMESTRE
                          </td>
                          <td className="px-2.5 py-2 text-center font-mono font-black text-sm text-blue-700 border-r border-slate-300 bg-blue-100/70">
                            {sc.average !== null ? `${sc.average.toFixed(2)}` : '--'}
                          </td>
                          <td className="px-2.5 py-2 text-center font-mono border-r border-slate-300 text-slate-900 font-bold">
                            {sc.validatedCredits} / {sc.totalCredits}
                          </td>
                          <td className="px-2.5 py-2 text-center font-bold text-slate-900 border-r border-slate-300 text-[11px]">
                            {sc.mention}
                          </td>
                          <td className="px-2.5 py-2 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              sc.isAdmis ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                            }`}>
                              {sc.average !== null ? (sc.isAdmis ? 'Admis' : 'Ajourné') : 'En attente'}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                </div>
              );
            })}

        </div>
      )}

      {/* TAB 2: MES PAIEMENTS & FRAIS DE FORMATION */}
      {currentTab === 'paiements' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Financial KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Total Frais Dus */}
            <div className="bg-white p-5 rounded-[18px] border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Frais Scolaires Totaux</span>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                  {totalFraisDusSum.toLocaleString()} <span className="text-xs font-semibold text-slate-500">FCFA</span>
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">Année académique en cours</p>
              </div>
            </div>

            {/* Total Réglé */}
            <div className="bg-white p-5 rounded-[18px] border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Total Réglé & Encaissé</span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <CheckCircle className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-emerald-600 font-mono">
                  {totalMontantPaye.toLocaleString()} <span className="text-xs font-semibold text-emerald-700">FCFA</span>
                </p>
                <p className="text-[11px] text-emerald-600/80 mt-0.5">{paiements.length} versement(s) comptabilisé(s)</p>
              </div>
            </div>

            {/* Reste à Payer */}
            <div className="bg-white p-5 rounded-[18px] border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Solde Restant Dû</span>
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className={`text-xl sm:text-2xl font-black font-mono ${soldeRestant <= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {soldeRestant.toLocaleString()} <span className="text-xs font-semibold text-slate-500">FCFA</span>
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {soldeRestant <= 0 ? "Frais de formation 100% soldés" : "Échéance en attente de versement"}
                </p>
              </div>
            </div>

            {/* Taux de Recouvrement / Quitus */}
            <div className="bg-white p-5 rounded-[18px] border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Taux de Règlement</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  tauxReglement >= 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {tauxReglement}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    tauxReglement >= 100 ? 'bg-emerald-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, tauxReglement))}%` }}
                />
              </div>

              {/* Quitus button */}
              <button
                type="button"
                onClick={() => setIsQuitusModalOpen(true)}
                className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs ${
                  soldeRestant <= 0
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{soldeRestant <= 0 ? "Quitus de Scolarité Officiel" : "Situation Financière"}</span>
              </button>
            </div>

          </div>

          {/* Grille Détails Frais & Versements */}
          <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <span>Frais de formation et état de paiement</span>
              </h3>
              <span className="text-xs text-slate-500 font-medium">
                Année Académique : <b>{activeAnnee?.code.replace('-', ' - ') || '2025 - 2026'}</b>
              </span>
            </div>

            <div className="p-4 sm:p-6 space-y-6">
              {/* Block 1: Frais de formation */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/30">
                <div className="px-4 py-2.5 bg-slate-100/90 border-b border-slate-200 font-bold text-xs text-slate-800 flex items-center justify-between">
                  <span>Frais de formation fixés</span>
                  <span className="text-[10px] text-slate-500">Tarification officielle</span>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse min-w-[500px]">
                    <thead>
                      <tr className="border-b border-slate-200 bg-white font-bold text-slate-900">
                        <th className="px-4 py-2.5 w-2/5">Filière / Programme</th>
                        <th className="px-4 py-2.5 w-1/5">Montant Annuel</th>
                        <th className="px-4 py-2.5 w-1/5">Exonération / Bourse</th>
                        <th className="px-4 py-2.5 w-1/5 text-right">Montant dû</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {fraisFormationList.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-2.5">
                            <span className="font-bold text-slate-900">{item.filiereCode}</span>
                            <span className="text-slate-500 text-[11px] block">{item.filiereNom}</span>
                          </td>
                          <td className="px-4 py-2.5 font-bold text-slate-900 font-mono">{item.montant.toLocaleString()} FCFA</td>
                          <td className="px-4 py-2.5 font-bold text-rose-500 font-mono">{item.reduction.toLocaleString()} FCFA</td>
                          <td className="px-4 py-2.5 font-extrabold text-emerald-600 font-mono text-right">{item.montantDu.toLocaleString()} FCFA</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-600">Total Frais de Formation dus :</span>
                  <span className="font-extrabold text-slate-900 font-mono text-sm">{totalFraisDusSum.toLocaleString()} FCFA</span>
                </div>
              </div>

              {/* Block 2: Paiement Récapitulatif */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/30">
                <div className="px-4 py-2.5 bg-slate-100/90 border-b border-slate-200 font-bold text-xs text-slate-800 flex items-center justify-between">
                  <span>Paiements enregistrés par l'administration</span>
                  <span className="text-[10px] text-slate-500">{paiements.length} transaction(s)</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse min-w-[500px]">
                    <thead>
                      <tr className="border-b border-slate-200 bg-white font-bold text-slate-900">
                        <th className="px-4 py-2.5">Filière</th>
                        <th className="px-4 py-2.5">Réf. Reçu</th>
                        <th className="px-4 py-2.5">Montant Versé</th>
                        <th className="px-4 py-2.5">Mode</th>
                        <th className="px-4 py-2.5">Date</th>
                        <th className="px-4 py-2.5 text-right">Année</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {paiementsFiliereList.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                            Aucun règlement enregistré sur votre dossier pour le moment.
                          </td>
                        </tr>
                      ) : (
                        paiementsFiliereList.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-4 py-2.5 font-bold text-slate-900">{item.filiereCode}</td>
                            <td className="px-4 py-2.5 font-mono text-blue-700 font-semibold">{item.reference || '--'}</td>
                            <td className="px-4 py-2.5 font-bold text-emerald-600 font-mono">{item.montantPaye.toLocaleString()} CFA</td>
                            <td className="px-4 py-2.5 font-medium text-slate-700">{item.modePaiement || 'Espèces'}</td>
                            <td className="px-4 py-2.5 font-medium text-slate-700">{item.datePaiement}</td>
                            <td className="px-4 py-2.5 font-medium text-slate-700 text-right">{item.anneeText}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-600">Total Encaissé & Validé :</span>
                  <span className="font-extrabold text-emerald-600 font-mono text-sm">{totalMontantPaye.toLocaleString()} FCFA</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payments Table - Detailed Receipt Log with Search & Filter */}
          <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-4 sm:p-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h4 className="font-bold text-sm sm:text-base text-slate-900 uppercase tracking-tight">
                  Historique Détaillé des Reçus de Caisse ({filteredPaiements.length})
                </h4>
                <p className="text-xs text-slate-500">
                  Consultez et imprimez les reçus officiels délivrés par le service de comptabilité
                </p>
              </div>

              {/* Search & Mode Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={paymentSearch}
                    onChange={(e) => setPaymentSearch(e.target.value)}
                    placeholder="Rechercher par réf, type..."
                    className="h-9 pl-8 pr-3 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-44 sm:w-56"
                  />
                </div>

                <select
                  value={paymentModeFilter}
                  onChange={(e) => setPaymentModeFilter(e.target.value)}
                  className="h-9 px-3 text-xs border border-slate-200 rounded-xl bg-slate-50 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">Tous les modes</option>
                  <option value="Orange Money">Orange Money</option>
                  <option value="Wave">Wave</option>
                  <option value="Moov Money">Moov Money</option>
                  <option value="Espèces">Espèces</option>
                  <option value="Virement">Virement</option>
                  <option value="Chèque">Chèque</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                    <th className="px-4 py-3">Réf. Reçu</th>
                    <th className="px-4 py-3">Type de Frais</th>
                    <th className="px-4 py-3 text-emerald-700">Montant Encaissé</th>
                    <th className="px-4 py-3">Mode de Règlement</th>
                    <th className="px-4 py-3">Date de Règlement</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-4 py-3 text-right">Reçu Officiel</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-slate-100">
                  {filteredPaiements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        {paiements.length === 0
                          ? "Aucun paiement enregistré pour votre dossier par l'administration pour le moment."
                          : "Aucun paiement ne correspond à vos critères de recherche."}
                      </td>
                    </tr>
                  ) : (
                    filteredPaiements.map((item) => (
                      <tr key={item.id} className="hover:bg-blue-50/40 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-blue-700 whitespace-nowrap">{item.reference_recu}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{item.type_frais}</td>
                        <td className="px-4 py-3 font-bold text-emerald-600 font-mono text-sm whitespace-nowrap">
                          {item.montant_paye.toLocaleString()} FCFA
                        </td>
                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap font-medium">{item.mode_paiement}</td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap font-mono">{item.date_paiement}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            item.statut === 'Complet' || (item.reste_a_payer !== undefined && item.reste_a_payer <= 0)
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {item.statut || 'Complet'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setViewingReceipt(item)}
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 ml-auto transition-all shadow-2xs border border-blue-200 hover:border-blue-600"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Imprimer Reçu</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: MON PROFIL (Informations de l'étudiant uniquement) */}
      {currentTab === 'profil_etudiant' && (
        <div className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-xs p-6 md:p-8 space-y-6 animate-in fade-in duration-300 max-w-4xl mx-auto">
          
          {/* Profile Header Title */}
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h3 className="font-bold text-lg text-[#1A1A1A] flex items-center gap-2">
                <User className="w-5 h-5 text-[#0066FF]" />
                <span>Informations de l'Étudiant</span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">Dossier individuel et coordonnées personnelles enregistrées</p>
            </div>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-200">
              {etudiant.statut || 'Inscrit'}
            </span>
          </div>

          {/* Information Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Block 1: Identité & Tuteur */}
            <div className="p-5 bg-gray-50/70 rounded-[16px] border border-gray-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-gray-200 pb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#0066FF]" />
                <span>État Civil & Tuteur Légal</span>
              </h4>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Matricule :</span>
                  <span className="font-mono font-bold text-slate-900">{etudiant.matricule}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Nom & Prénom :</span>
                  <span className="font-bold text-slate-900">{etudiant.nom.toUpperCase()} {etudiant.prenom}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Sexe / Genre :</span>
                  <span className="font-semibold text-slate-900">{etudiant.sexe === 'M' ? 'Masculin (M)' : 'Féminin (F)'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date & Lieu de Naissance :</span>
                  <span className="font-semibold text-slate-900">{etudiant.date_naissance || '12/05/2003'} à {etudiant.lieu_naissance || 'Bamako'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Nationalité :</span>
                  <span className="font-semibold text-slate-900">{etudiant.nationalite || 'Malienne'}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-gray-200/60">
                  <span className="text-gray-500">Tuteur Légal / Urgence :</span>
                  <span className="font-semibold text-slate-800">
                    {etudiant.tuteur_nom ? `${etudiant.tuteur_prenom || ''} ${etudiant.tuteur_nom}` : 'Parent / Tuteur désigné'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Contact Tuteur :</span>
                  <span className="font-mono font-medium text-slate-700">{etudiant.tuteur_telephone || '+223 70 00 00 00'}</span>
                </div>
              </div>
            </div>

            {/* Block 2: Coordonnées de Contact (Lecture Seule / Non modifiable par l'élève) */}
            <div className="p-5 bg-slate-50/80 rounded-[16px] border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <span>Coordonnées de Contact</span>
                </span>
                <span className="text-[10px] text-slate-500 font-medium bg-slate-200/80 px-2 py-0.5 rounded-md">
                  Non modifiable
                </span>
              </h4>

              <div className="space-y-2.5 text-xs">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 py-1 border-b border-slate-200/50">
                  <span className="text-slate-500 font-medium">Adresse Email :</span>
                  <span className="font-semibold text-slate-900 font-mono text-right">
                    {etudiant.email || 'mamadou.traore@usttb.edu.ml'}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 py-1 border-b border-slate-200/50">
                  <span className="text-slate-500 font-medium">Téléphone Personnel :</span>
                  <span className="font-semibold text-slate-900 font-mono text-right">
                    {etudiant.telephone || '+223 76 12 34 56'}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 py-1">
                  <span className="text-slate-500 font-medium">Adresse Résidence :</span>
                  <span className="font-semibold text-slate-900 text-right">
                    {etudiant.adresse || 'Badalabougou, Rue 12, Porte 45'}
                  </span>
                </div>
              </div>
            </div>

            {/* Block 3: Modification de Mot de Passe */}
            <div className="md:col-span-2 p-5 bg-amber-50/50 rounded-[16px] border border-amber-200/80 space-y-3">
              <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider border-b border-amber-200 pb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-amber-600" />
                  <span>Sécurité & Changement de Mot de Passe</span>
                </span>
                <span className="text-[10px] text-amber-800 font-mono font-medium">
                  Matricule : <b>{etudiant.matricule}</b>
                </span>
              </h4>

              <form onSubmit={handleChangePassword} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nouveau Mot de Passe</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => { setNewPassword(e.target.value); setPasswordError(''); }}
                      placeholder="Nouveau mot de passe..."
                      className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:border-amber-600"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Confirmer le Nouveau Mot de Passe</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(''); }}
                      placeholder="Répétez le mot de passe..."
                      className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:border-amber-600"
                      required
                    />
                  </div>
                </div>

                {passwordError && (
                  <p className="text-xs text-red-600 font-bold bg-red-100 p-2 rounded-lg">{passwordError}</p>
                )}

                {passwordSuccess && (
                  <p className="text-xs text-emerald-800 font-bold bg-emerald-100 p-2 rounded-lg flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>Votre mot de passe a été mis à jour avec succès !</span>
                  </p>
                )}

                <div className="pt-1">
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all active:scale-95 shadow-xs"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Mettre à jour mon mot de passe</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Block 4: Accès Direct aux Supports de Cours */}
            <div className="md:col-span-2 p-5 bg-blue-50/60 rounded-[16px] border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-600 text-white rounded-xl shadow-xs">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">Mes Supports de Cours & Matières</h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    <b>{totalStudentSupportsCount} supports</b> disponibles répartis sur vos <b>{matieres.length} matières</b> inscrites.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab && setActiveTab('supports_cours')}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-xs flex-shrink-0"
              >
                <span>Accéder aux cours & supports</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>
      )}

      {/* TAB 4: MES ABSENCES */}
      {currentTab === 'absences' && (
        <div className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-xs p-6 space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-bold text-base text-[#1A1A1A] flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-[#0066FF]" />
              <span>Mon Suivi des Absences</span>
            </h3>
            <span className="text-xs text-gray-400 font-medium">{absences.length} absences enregistrées</span>
          </div>

          {absences.length === 0 ? (
            <p className="text-xs text-gray-400 py-8 text-center">Aucune absence enregistrée sur votre dossier.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {absences.map(abs => {
                const mat = matieres.find(m => Number(m.id) === Number(abs.matiere_id));
                return (
                  <div key={abs.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-[#1A1A1A]">{mat?.nom || 'Matière'}</p>
                      <p className="text-[10px] text-gray-400">{abs.date_absence} • {abs.heures || 2} heures de cours</p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      abs.justifiee ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {abs.justifiee ? 'Justifiée' : 'Non justifiée'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal Reçu de Paiement Officiel */}
      {viewingReceipt && (
        <Modal
          isOpen={!!viewingReceipt}
          onClose={() => setViewingReceipt(null)}
          title="Reçu de Paiement Officiel"
          maxWidth="max-w-xl"
        >
          <div className="space-y-5 text-xs text-[#1A1A1A] p-6 bg-white rounded-[16px] border border-gray-200">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="font-bold text-[#0066FF] uppercase text-sm sm:text-base">
                  {universite?.nom || 'USTTB - UNIVERSITÉ DE BAMAKO'}
                </h3>
                <p className="text-[10px] text-gray-500">Service de la Comptabilité et du Recouvrement</p>
              </div>
              <div className="text-right">
                <span className="font-mono font-bold text-gray-800 text-sm block">{viewingReceipt.reference_recu}</span>
                <span className="text-[10px] text-gray-400 font-mono">Date : {viewingReceipt.date_paiement}</span>
              </div>
            </div>

            {(() => {
              const anneeObj = annees.find(a => a.id === viewingReceipt.annee_academique_id);
              const anneeText = viewingReceipt.annee_libelle || (anneeObj ? anneeObj.code.replace('-', ' - ') : '2025 - 2026');
              return (
                <div className="space-y-3 bg-gray-50 p-4 rounded-[14px]">
                  <p><span className="font-bold text-slate-700">Étudiant :</span> {etudiant.nom.toUpperCase()} {etudiant.prenom} (<span className="font-mono font-bold">{etudiant.matricule}</span>)</p>
                  <p><span className="font-bold text-slate-700">Filière / Classe :</span> {viewingReceipt.filiere_code || studentFiliere?.code || 'IG1'} - {studentClass?.nom || studentFiliere?.nom || 'Informatique'}</p>
                  <p><span className="font-bold text-slate-700">Année Académique :</span> {anneeText}</p>
                  <p><span className="font-bold text-slate-700">Objet du Règlement :</span> {viewingReceipt.type_frais}</p>
                  <p><span className="font-bold text-slate-700">Mode de Règlement :</span> {viewingReceipt.mode_paiement}</p>
                  {viewingReceipt.remarque && (
                    <p><span className="font-bold text-slate-700">Observation :</span> {viewingReceipt.remarque}</p>
                  )}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                    <span className="font-bold text-slate-800 text-sm">Montant Encaissé :</span>
                    <span className="text-base font-black text-emerald-600 font-mono">
                      {viewingReceipt.montant_paye.toLocaleString()} FCFA
                    </span>
                  </div>
                </div>
              );
            })()}

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViewingReceipt(null)}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 font-semibold rounded-xl text-xs transition-colors"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-[#0066FF] hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimer le Reçu Officiel</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Quitus Financier & Attestation de Non-Redevance */}
      {isQuitusModalOpen && (
        <Modal
          isOpen={isQuitusModalOpen}
          onClose={() => setIsQuitusModalOpen(false)}
          title="Quitus de Scolarité & Situation Financière"
          maxWidth="max-w-xl"
        >
          <div className="space-y-6 text-xs text-slate-900 p-6 bg-white rounded-2xl border border-slate-200">
            {/* Header document */}
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="font-black text-blue-700 uppercase text-sm sm:text-base">
                  {universite?.nom || 'USTTB - UNIVERSITÉ DE BAMAKO'}
                </h3>
                <p className="text-[10px] text-slate-500">Direction des Affaires Financières & Comptabilité</p>
              </div>
              <div className="text-right">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                  soldeRestant <= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {soldeRestant <= 0 ? 'Compte Soldé' : 'Solde Débiteur'}
                </span>
                <span className="text-[10px] text-slate-400 block mt-1 font-mono">
                  {new Date().toLocaleDateString('fr-FR')}
                </span>
              </div>
            </div>

            {/* Content Certificate */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <div className="text-center space-y-1 py-1">
                <h4 className="text-sm font-extrabold uppercase text-slate-900 tracking-wide">
                  ATTESTATION DE RÈGLEMENT DES FRAIS SCOLAIRES
                </h4>
                <p className="text-[11px] text-slate-500 font-medium">
                  Année Universitaire : <b>{activeAnnee?.code.replace('-', ' - ') || '2025 - 2026'}</b>
                </p>
              </div>

              <div className="space-y-2 text-xs divide-y divide-slate-200/80">
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Étudiant :</span>
                  <span className="font-bold text-slate-900">{etudiant.nom.toUpperCase()} {etudiant.prenom}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Numéro Matricule :</span>
                  <span className="font-mono font-bold text-slate-900">{etudiant.matricule}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Filière / Niveau :</span>
                  <span className="font-bold text-blue-700">{studentFiliere?.nom || 'Informatique'} ({studentFiliere?.code || 'IG1'})</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Total Frais Annuels :</span>
                  <span className="font-mono font-bold text-slate-900">{totalFraisDusSum.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Montant Total Encaissé :</span>
                  <span className="font-mono font-bold text-emerald-600">{totalMontantPaye.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between py-2 text-sm bg-white p-2.5 rounded-xl border border-slate-200 mt-2">
                  <span className="font-bold text-slate-800">Solde Restant Dû :</span>
                  <span className={`font-black font-mono ${soldeRestant <= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {soldeRestant.toLocaleString()} FCFA
                  </span>
                </div>
              </div>

              {soldeRestant <= 0 ? (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>
                    L'étudiant est en règle avec l'administration comptable. Il est autorisé à se présenter à l'ensemble des épreuves d'examens et sessions universitaires.
                  </span>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>
                    Un reliquat de <b>{soldeRestant.toLocaleString()} FCFA</b> reste à régulariser auprès de la caisse comptable avant la fin de l'échéance fixée.
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setIsQuitusModalOpen(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 font-semibold rounded-xl text-xs transition-colors"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimer le Quitus / Attestation</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Aperçu & Consultation de Document */}
      {viewingSupportModal && (
        <Modal
          isOpen={!!viewingSupportModal}
          onClose={() => setViewingSupportModal(null)}
          title={`Document de cours : ${viewingSupportModal.support.titre}`}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-4 p-2">
            {/* Header document card */}
            <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-blue-600 text-white font-mono font-bold text-xs">
                  {viewingSupportModal.matiere?.code || 'COURS'}
                </span>
                <span className="text-xs font-medium text-slate-300">
                  {viewingSupportModal.support.type_document || 'PDF'} • Publié le {viewingSupportModal.support.date_publication || '2025-10-15'}
                </span>
              </div>
              <h3 className="font-extrabold text-base sm:text-lg">
                {viewingSupportModal.support.titre}
              </h3>
              <p className="text-xs text-slate-300">
                Matière : <b>{viewingSupportModal.matiere?.nom || 'Matière'}</b> • Auteur : <b>{viewingSupportModal.support.publie_par || 'Enseignant Titulaire'}</b>
              </p>
            </div>

            {/* Document Previewer Frame & Content */}
            <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
              <div className="space-y-2">
                <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">Résumé et Contenu Pédagogique :</h4>
                <p className="text-xs text-slate-800 leading-relaxed bg-white p-3.5 rounded-lg border border-slate-200">
                  {viewingSupportModal.support.description || 'Document officiel de cours mis à disposition des étudiants inscrits dans l\'unité d\'enseignement.'}
                </p>
              </div>

              <div className="p-4 bg-blue-50/80 rounded-xl border border-blue-200 space-y-2">
                <h4 className="font-bold text-xs text-blue-900 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-blue-700" />
                  <span>Grandes Lignes & Chapitres Couverts</span>
                </h4>
                <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-5">
                  <li>Chapitre 1 : Fondements théoriques, concepts clés et définitions de base</li>
                  <li>Chapitre 2 : Méthodologie, modélisation et cas d'usage pratiques</li>
                  <li>Chapitre 3 : Applications concrètes, exercices d'approfondissement et synthèses</li>
                  <li>Annexes : Lexique des termes techniques et références bibliographiques</li>
                </ul>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Ce document est validé par le Conseil Pédagogique pour l'année universitaire en cours.</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setViewingSupportModal(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
              >
                Fermer l'aperçu
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600" />
                  <span>Imprimer</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleDownloadSupport(viewingSupportModal.support, viewingSupportModal.matiere);
                  }}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Télécharger le Fichier</span>
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Real-time Download Toast Feedback */}
      {downloadToast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-300 max-w-md">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
            <CheckCircle className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold">{downloadToast}</p>
        </div>
      )}

    </div>
  );
};
