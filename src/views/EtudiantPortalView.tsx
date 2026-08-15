import React, { useState, useEffect, useCallback } from 'react';
import { AuthUser, Paiement, Etudiant } from '../types/database';
import { DB } from '../lib/storage';
import {
  GraduationCap,
  Award,
  FileCheck2,
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
  RefreshCw
} from 'lucide-react';
import { Modal } from '../components/Modal';
import { ExcelBulletinView } from '../components/ExcelBulletinView';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface EtudiantPortalViewProps {
  user: AuthUser;
  activeTab?: string;
  setActiveTab?: (tab: any) => void;
}

export const EtudiantPortalView: React.FC<EtudiantPortalViewProps> = ({
  user,
  activeTab = 'bulletins',
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
    email: anyUser.email || 'm.traore@usttb.edu.ml',
    telephone: '+223 76 00 11 22',
    adresse: 'Hamdallaye ACI 2000, Bamako',
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

  const classes = DB.getClasses();
  const studentClass = classes.find(c => Number(c.id) === Number(etudiant.classe_id)) || classes[0];
  const filieres = DB.getFilieres();
  const studentFiliere = filieres.find(f => Number(f.id) === Number(studentClass?.filiere_id) || Number(f.id) === Number(etudiant.filiere_id)) || filieres[0];
  const facultes = DB.getFacultes();
  const studentFaculte = facultes.find(f => Number(f.id) === Number(studentFiliere?.faculte_id)) || facultes[0];
  const universite = DB.getUniversites()[0];
  const activeAnnee = DB.getActiveAnneeAcademique();
  const annees = DB.getAnneesAcademiques();
  const niveaux = DB.getNiveaux();
  const studentNiveau = niveaux.find(n => Number(n.id) === Number(studentClass?.niveau_id) || Number(n.id) === Number(etudiant.niveau_id)) || niveaux[0];
  const enseignants = DB.getEnseignants();

  const semestres = DB.getSemestres();
  const matieres = DB.getMatieres();
  
  // Dynamic student data from DB (automatically re-evaluated on dbTick change)
  const notes = DB.getNotes().filter(n => Number(n.etudiant_id) === Number(etudiant.id));
  const paiements = DB.getPaiements().filter(p => Number(p.etudiant_id) === Number(etudiant.id));
  const absences = DB.getAbsences().filter(a => Number(a.etudiant_id) === Number(etudiant.id));
  const studentInscriptions = DB.getInscriptions().filter(i => Number(i.etudiant_id) === Number(etudiant.id));
  const supportsCours = DB.getSupportsCours().filter(s => !s.filiere_id || Number(s.filiere_id) === Number(studentFiliere?.id));
  const studentBulletins = DB.getBulletins().filter(b => Number(b.etudiant_id) === Number(etudiant.id));

  // States
  const [selectedSemestreId, setSelectedSemestreId] = useState<number>(semestres[0]?.id || 1);
  const [phone, setPhone] = useState(etudiant.telephone || '');
  const [adresse, setAdresse] = useState(etudiant.adresse || '');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (etudiant) {
      setPhone(etudiant.telephone || '');
      setAdresse(etudiant.adresse || '');
    }
  }, [etudiant.id]);

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
            filiere_id: studentFiliere?.id || etudiant.filiere_id || 1,
            classe_id: etudiant.classe_id
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
  }, [etudiant.id, studentFiliere?.id, etudiant.filiere_id, etudiant.classe_id]);

  // Student Password Change State
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleExportPDF = async () => {
    setIsExportingPdf(true);
    try {
      const element = document.getElementById('bulletin-document-content');
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

      const activeSemestreObj = semestres.find(s => Number(s.id) === Number(selectedSemestreId)) || semestres[0];
      const semLibelle = activeSemestreObj?.libelle || 'Semestre';
      const fileName = `Bulletin_${etudiant.matricule}_${semLibelle.replace(/\s+/g, '_')}.pdf`;
      pdf.save(fileName);
      DB.logAccess('CONSULTATION', `Export PDF du bulletin de ${etudiant.prenom} ${etudiant.nom} (${semLibelle})`);
    } catch (err) {
      console.error('Erreur lors de la génération du PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

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

  // Modals
  const [isExcelBulletinModalOpen, setIsExcelBulletinModalOpen] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState<Paiement | null>(null);

  // Current selected tab state helper
  const validStudentTabs = ['bulletins', 'examen', 'paiements', 'profil_etudiant', 'absences'];
  const currentTab = validStudentTabs.includes(activeTab) ? activeTab : 'bulletins';

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    etudiant.telephone = phone;
    etudiant.adresse = adresse;
    DB.saveEtudiant({
      ...etudiant,
      telephone: phone,
      adresse
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

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

  // Tab mode for Examen tab: 0 = Bilan Annuel (S1 + S2), or semester ID (1 for S1, 2 for S2)
  const [examenViewFilter, setExamenViewFilter] = useState<number>(0);

  // Per-semester detailed calculations
  const semestresCalculations = activeSemestres.map(sem => {
    // Matieres for this semester & filiere
    const semMatieres = matieres.filter(m => 
      Number(m.semestre_id) === Number(sem.id) && 
      (!m.filiere_id || Number(m.filiere_id) === Number(studentFiliere?.id) || Number(m.filiere_id) === Number(etudiant.filiere_id))
    );
    const semNotes = notes.filter(n => Number(n.semestre_id) === Number(sem.id));
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
    const list: { filiereCode: string; montant: number; reduction: number; montantDu: number; annee: string }[] = [];
    const seenClasses = new Set<number>();

    studentInscriptions.forEach(insc => {
      seenClasses.add(Number(insc.classe_id));
      const cls = classes.find(c => Number(c.id) === Number(insc.classe_id));
      const fil = filieres.find(f => Number(f.id) === Number(cls?.filiere_id));
      const code = fil?.code || cls?.code || 'IG1';
      const montant = insc.frais_inscription || (code === 'IG1' ? 550000 : code === 'IG2' ? 450000 : 500000);
      const reduction = 0;
      const anneeObj = annees.find(a => Number(a.id) === Number(insc.annee_academique_id));
      list.push({
        filiereCode: code,
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
      const montant = code === 'IG1' ? 550000 : code === 'IG2' ? 450000 : 500000;
      const reduction = 0;
      list.push({
        filiereCode: code,
        montant,
        reduction,
        montantDu: montant - reduction,
        annee: activeAnnee?.code.replace('-', ' - ') || '2025 - 2026'
      });
    }

    if (list.length === 0) {
      list.push({
        filiereCode: studentFiliere?.code || 'IG1',
        montant: 550000,
        reduction: 0,
        montantDu: 550000,
        annee: activeAnnee?.code.replace('-', ' - ') || '2025 - 2026'
      });
    }

    return list;
  })();

  const totalFraisDusSum = fraisFormationList.reduce((sum, item) => sum + item.montantDu, 0);
  const totalMontantPaye = paiements.reduce((acc, p) => acc + (p.montant_paye || 0), 0);
  const soldeRestant = Math.max(0, totalFraisDusSum - totalMontantPaye);

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
      anneeText
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

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* TAB 1: MON BULLETIN (Format Admin Officiel direct) */}
      {currentTab === 'bulletins' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Header & Semester Selection Bar */}
          <div className="bg-white p-3.5 sm:p-4 rounded-[16px] border border-[#E5E7EB] shadow-xs flex flex-wrap items-center justify-between gap-3">
            {/* Semester Select Dropdown */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-gray-700 whitespace-nowrap">Semestre :</label>
              <select
                value={selectedSemestreId}
                onChange={(e) => setSelectedSemestreId(Number(e.target.value))}
                className="h-[40px] bg-white border border-[#E5E7EB] rounded-[12px] px-3.5 text-xs font-bold text-[#0066FF] focus:outline-none focus:border-[#0066FF] shadow-2xs cursor-pointer"
              >
                {semestres.map(s => (
                  <option key={s.id} value={s.id}>{s.libelle}</option>
                ))}
              </select>
            </div>

            {/* Exporter en PDF Button right on the semester line */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportPDF}
                disabled={isExportingPdf}
                className="h-[40px] px-4 bg-red-600 hover:bg-red-700 text-white rounded-[12px] text-xs font-bold flex items-center gap-2 shadow-2xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                title="Exporter le bulletin officiel en document PDF"
              >
                <Download className="w-4 h-4" />
                <span>{isExportingPdf ? 'Génération PDF...' : 'Exporter en PDF'}</span>
              </button>
            </div>
          </div>

          {/* Bulletin Admin Direct */}
          <ExcelBulletinView
            etudiant={etudiant}
            semestre={semestres.find(s => Number(s.id) === Number(selectedSemestreId)) || semestres[0]}
            notes={notes}
            matieres={matieres}
            classe={studentClass}
            filiere={studentFiliere}
            faculte={studentFaculte}
            universite={universite}
            anneeAcademique={activeAnnee}
            hideActionBar={true}
          />
        </div>
      )}

      {/* TAB EXAMEN & RELEVÉ DE NOTES (Semestre 1 & Semestre 2) */}
      {currentTab === 'examen' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Header Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-blue-600" />
                <span>Espace Examen & Relevé des Notes (Semestre 1 & 2)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Consultez le calcul des notes par semestre attribué à la filière <b>{studentFiliere?.nom || 'Informatique & Génie Logiciel'}</b> ({studentClass?.code || 'L1'}), votre moyenne générale et votre bilan LMD.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button type="button"
                onClick={() => window.print()}
                className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-xs shrink-0"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimer / Télécharger PDF</span>
              </button>
            </div>
          </div>



          {/* View Filter Switcher Tabs */}
          <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100 rounded-xl border border-slate-200">
            <button type="button"
              onClick={() => setExamenViewFilter(0)}
              className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all flex items-center gap-2 ${
                examenViewFilter === 0
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Bilan Annuel Global (S1 + S2)</span>
              {annualAverage !== null && !isNaN(Number(annualAverage)) && (
                <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 text-[10px] font-mono">
                  {Number(annualAverage).toFixed(2)}/20
                </span>
              )}
            </button>

            {semestresCalculations.map(sc => (
              <button type="button"
                key={sc.semestre.id}
                onClick={() => setExamenViewFilter(sc.semestre.id)}
                className={`px-4 py-2 rounded-lg text-xs font-extrabold transition-all flex items-center gap-2 ${
                  examenViewFilter === sc.semestre.id
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <span>{sc.semestre.libelle}</span>
                {sc.average !== null && !isNaN(Number(sc.average)) && (
                  <span className="px-2 py-0.5 rounded-md bg-slate-200/80 text-slate-800 text-[10px] font-mono">
                    {Number(sc.average).toFixed(2)}/20
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Detailed Exam Marks Tables */}
          {semestresCalculations
            .filter(sc => examenViewFilter === 0 || examenViewFilter === sc.semestre.id)
            .map(sc => (
              <div key={sc.semestre.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-extrabold text-xs font-mono">
                      {sc.semestre.code}
                    </span>
                    <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                      Relevé des Notes - {sc.semestre.libelle} ({sc.matieres.length} matières)
                    </h4>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-bold">
                    <span className="text-slate-500">
                      Moyenne : <b className="text-slate-900 font-mono">{sc.average !== null ? sc.average.toFixed(2) : '--'}/20</b>
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                      sc.isAdmis
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-red-100 text-red-800 border border-red-200'
                    }`}>
                      {sc.average !== null ? (sc.isAdmis ? 'ADMIS(E)' : 'AJOURNÉ(E)') : 'En attente'}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[640px]">
                    <thead>
                      <tr className="bg-slate-100/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                        <th className="px-5 py-3">Code / UE</th>
                        <th className="px-5 py-3">Matière / Module</th>
                        <th className="px-5 py-3 text-center">Crédits</th>
                        <th className="px-5 py-3 text-center">Note CC (/20)</th>
                        <th className="px-5 py-3 text-center">Note Examen (/20)</th>
                        <th className="px-5 py-3 text-center">Note Finale (/20)</th>
                        <th className="px-5 py-3 text-right">Décision UE</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs divide-y divide-slate-200">
                      {sc.rows.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-5 py-8 text-center text-slate-400 font-medium">
                            Aucune note d'examen enregistrée pour le {sc.semestre.libelle}.
                          </td>
                        </tr>
                      ) : (
                        sc.rows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-5 py-3 font-mono font-bold text-blue-600 whitespace-nowrap">{row.matiere.code}</td>
                            <td className="px-5 py-3 font-bold text-slate-900">{row.matiere.nom}</td>
                            <td className="px-5 py-3 text-center font-bold text-slate-700 font-mono">{row.matiere.credits || 3}</td>
                            <td className="px-5 py-3 text-center font-mono font-semibold text-slate-800">
                              {row.cc !== null ? row.cc.toFixed(1) : '--'}
                            </td>
                            <td className="px-5 py-3 text-center font-mono font-semibold text-slate-800">
                              {row.exam !== null ? row.exam.toFixed(1) : '--'}
                            </td>
                            <td className="px-5 py-3 text-center font-mono font-bold text-sm text-slate-900">
                              {row.finale !== null ? row.finale.toFixed(2) : '--'}
                            </td>
                            <td className="px-5 py-3 text-right whitespace-nowrap">
                              {row.finale !== null ? (
                                row.isValidated ? (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    Validée
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-800 border border-red-200">
                                    À Rattraper
                                  </span>
                                )
                              ) : (
                                <span className="text-slate-400 italic">En attente</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

          {/* Final Annual LMD Compensation Summary */}
          {examenViewFilter === 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="space-y-1">
                <h4 className="font-extrabold text-sm text-blue-950 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                  <span>Synthèse du Bilan Annuel & Compensation LMD</span>
                </h4>
                <p className="text-xs text-blue-800">
                  Calcul combiné des moyennes compensées de <b>Semestre 1</b> et <b>Semestre 2</b> conformément à la réglementation LMD USTTB.
                </p>
              </div>

              {/* Horizontal Row with 3 Columns for S1, S2, and Annual Average */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
                <div className="flex flex-col justify-between bg-white px-4 py-3.5 rounded-xl border border-blue-200/80 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Moyenne S1</span>
                  <span className="text-lg font-black font-mono text-slate-900">
                    {semestresCalculations[0]?.average !== null && !isNaN(Number(semestresCalculations[0]?.average)) ? Number(semestresCalculations[0].average).toFixed(2) : '--'} <span className="text-xs font-normal text-slate-400">/ 20</span>
                  </span>
                </div>

                <div className="flex flex-col justify-between bg-white px-4 py-3.5 rounded-xl border border-blue-200/80 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Moyenne S2</span>
                  <span className="text-lg font-black font-mono text-slate-900">
                    {semestresCalculations[1]?.average !== null && !isNaN(Number(semestresCalculations[1]?.average)) ? Number(semestresCalculations[1].average).toFixed(2) : '--'} <span className="text-xs font-normal text-slate-400">/ 20</span>
                  </span>
                </div>

                <div className="flex flex-col justify-between bg-blue-600 text-white px-4 py-3.5 rounded-xl border border-blue-700 shadow-xs">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-100 block mb-1">Moyenne Annuelle</span>
                  <span className="text-xl font-black font-mono text-white">
                    {annualAverage !== null && !isNaN(Number(annualAverage)) ? Number(annualAverage).toFixed(2) : '--'} <span className="text-xs font-semibold text-blue-200">/ 20</span>
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* TAB 2: MES PAIEMENTS & FRAIS DE FORMATION */}
      {currentTab === 'paiements' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <span>Frais de formation et état de paiement</span>
              </h3>
            </div>

            <div className="p-4 sm:p-6 space-y-6">
              {/* Block 1: Frais de formation */}
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50/30">
                <div className="px-4 py-2.5 bg-slate-100/90 border-b border-slate-200 font-bold text-xs text-slate-800">
                  Frais de formation
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse min-w-[500px]">
                    <thead>
                      <tr className="border-b border-slate-200 bg-white font-bold text-slate-900">
                        <th className="px-4 py-2.5 w-1/4">Filière</th>
                        <th className="px-4 py-2.5 w-1/4">Montant</th>
                        <th className="px-4 py-2.5 w-1/4">Réduction</th>
                        <th className="px-4 py-2.5 w-1/4">Montant dû</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {fraisFormationList.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-2.5 font-bold text-slate-900">{item.filiereCode}</td>
                          <td className="px-4 py-2.5 font-bold text-slate-900">{item.montant.toLocaleString()} FCFA</td>
                          <td className="px-4 py-2.5 font-bold text-rose-500">{item.reduction.toLocaleString()} FCFA</td>
                          <td className="px-4 py-2.5 font-extrabold text-emerald-600">{item.montantDu.toLocaleString()} FCFA</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="px-4 py-2 border-t border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-600">
                  Année : {activeAnnee?.code.replace('-', ' - ') || '2025 - 2026'}
                </div>
              </div>

              {/* Block 2: Paiement */}
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50/30">
                <div className="px-4 py-2.5 bg-slate-100/90 border-b border-slate-200 font-bold text-xs text-slate-800">
                  Paiement
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse min-w-[500px]">
                    <thead>
                      <tr className="border-b border-slate-200 bg-white font-bold text-slate-900">
                        <th className="px-4 py-2.5 w-1/4">Filière</th>
                        <th className="px-4 py-2.5 w-1/4">Montant</th>
                        <th className="px-4 py-2.5 w-1/4">Date</th>
                        <th className="px-4 py-2.5 w-1/4">Année</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {paiementsFiliereList.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-4 text-center text-slate-400">
                            Aucun règlement enregistré.
                          </td>
                        </tr>
                      ) : (
                        paiementsFiliereList.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-4 py-2.5 font-bold text-slate-900">{item.filiereCode}</td>
                            <td className="px-4 py-2.5 font-bold text-slate-900">{item.montantPaye.toLocaleString()} CFA</td>
                            <td className="px-4 py-2.5 font-medium text-slate-700">{item.datePaiement}</td>
                            <td className="px-4 py-2.5 font-medium text-slate-700">{item.anneeText}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Payments Table - Detailed Receipt Log */}
          <div className="bg-white rounded-[16px] sm:rounded-[20px] border border-[#E5E7EB] shadow-xs overflow-hidden">
            <div className="p-3.5 sm:p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <span className="font-bold text-xs text-[#1A1A1A] uppercase">Règlements & Reçus Officiels ({paiements.length})</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[640px]">
                <thead>
                  <tr className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    <th className="px-4 sm:px-6 py-3.5">Réf. Reçu</th>
                    <th className="px-4 sm:px-6 py-3.5">Type de Frais</th>
                    <th className="px-4 sm:px-6 py-3.5 text-emerald-600">Montant Encaissé</th>
                    <th className="px-4 sm:px-6 py-3.5">Mode de Règlement</th>
                    <th className="px-4 sm:px-6 py-3.5">Date de Règlement</th>
                    <th className="px-4 sm:px-6 py-3.5">Statut</th>
                    <th className="px-4 sm:px-6 py-3.5 text-right">Action Reçu</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-gray-100">
                  {paiements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 sm:px-6 py-8 text-center text-gray-400">
                        Aucun paiement enregistré pour votre dossier par l'administration pour le moment.
                      </td>
                    </tr>
                  ) : (
                    paiements.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 sm:px-6 py-3.5 font-mono font-bold text-gray-800 whitespace-nowrap">{item.reference_recu}</td>
                        <td className="px-4 sm:px-6 py-3.5 font-semibold text-[#1A1A1A]">{item.type_frais}</td>
                        <td className="px-4 sm:px-6 py-3.5 font-bold text-emerald-600 font-mono text-sm whitespace-nowrap">
                          {item.montant_paye.toLocaleString()} FCFA
                        </td>
                        <td className="px-4 sm:px-6 py-3.5 text-gray-600 whitespace-nowrap">{item.mode_paiement}</td>
                        <td className="px-4 sm:px-6 py-3.5 text-gray-500 whitespace-nowrap">{item.date_paiement}</td>
                        <td className="px-4 sm:px-6 py-3.5 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            item.statut === 'Complet'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {item.statut}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-3.5 text-right whitespace-nowrap">
                          <button type="button"
                            onClick={() => setViewingReceipt(item)}
                            className="px-2.5 py-1.5 bg-[#0066FF] hover:bg-blue-700 text-white rounded-[8px] sm:rounded-[10px] text-xs font-bold flex items-center gap-1.5 ml-auto transition-colors shadow-xs"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Voir Reçu</span>
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

            {/* Block 2: Parcours Académique & Faculté */}
            <div className="p-5 bg-gray-50/70 rounded-[16px] border border-gray-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-gray-200 pb-2 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-[#0066FF]" />
                <span>Affiliation & Faculté</span>
              </h4>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Université :</span>
                  <span className="font-semibold text-slate-900 text-right">{universite?.nom || 'USTTB'} ({universite?.sigle || 'USTTB'})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Faculté / UFR :</span>
                  <span className="font-semibold text-slate-900 text-right">{studentFaculte?.nom || 'Faculté des Sciences'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Doyen Faculté :</span>
                  <span className="font-medium text-slate-800 text-right">{studentFaculte?.doyen || 'Dr. Mamadou Diallo'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Filière / Domaine :</span>
                  <span className="font-bold text-[#0066FF] text-right">{studentFiliere?.nom || 'Informatique'} ({studentFiliere?.domaine || 'Sciences'})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Niveau & Diplôme Visé :</span>
                  <span className="font-bold text-slate-900 text-right">{studentNiveau?.nom || 'Licence 1'} - {studentNiveau?.diplome_vise || 'Licence Pro'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Classe / Promotion :</span>
                  <span className="font-bold text-slate-900 text-right">{studentClass?.nom || 'L1-IGL'} (Capacité: {studentClass?.capacite || 40})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Année Académique :</span>
                  <span className="font-bold text-slate-900">{activeAnnee?.libelle || '2025-2026'}</span>
                </div>
              </div>
            </div>

            {/* Block 3: Coordonnées & Contacts */}
            <div className="md:col-span-2 p-5 bg-blue-50/40 rounded-[16px] border border-blue-100 space-y-3">
              <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider border-b border-blue-200/60 pb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-[#0066FF]" />
                  <span>Coordonnées de Contact</span>
                </span>
                {isSaved && (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Modifications enregistrées</span>
                  </span>
                )}
              </h4>

              <form onSubmit={handleUpdateProfile} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Adresse Email</label>
                    <input
                      type="text"
                      disabled
                      value={etudiant.email || 'm.traore@usttb.edu.ml'}
                      className="w-full h-9 px-3 bg-gray-100 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-700 font-bold uppercase block mb-1">Téléphone Personnel</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+223 ..."
                      className="w-full h-9 px-3 bg-white border border-blue-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#0066FF]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-700 font-bold uppercase block mb-1">Adresse Résidence</label>
                    <input
                      type="text"
                      value={adresse}
                      onChange={(e) => setAdresse(e.target.value)}
                      placeholder="Quartier, Ville..."
                      className="w-full h-9 px-3 bg-white border border-blue-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-[#0066FF]"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#0066FF] hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Enregistrer mes coordonnées</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Block 4: Modification de Mot de Passe */}
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

      {/* Modal Reçu de Paiement */}
      {viewingReceipt && (
        <Modal
          isOpen={!!viewingReceipt}
          onClose={() => setViewingReceipt(null)}
          title="Reçu de Caisse Officiel"
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-xs p-2">
            <div className="p-4 bg-slate-900 text-white rounded-[14px] text-center space-y-1">
              <p className="text-[10px] font-mono text-blue-400 font-bold uppercase">
                {universite?.nom || 'USTTB - UNIVERSITÉ DE BAMAKO'}
              </p>
              <p className="text-base font-extrabold">REÇU DE PAIEMENT N° {viewingReceipt.reference_recu}</p>
              <p className="text-[10px] text-slate-300">Service de Recouvrement & Comptabilité</p>
            </div>

            <div className="space-y-2 divide-y divide-gray-100 font-medium">
              <div className="flex justify-between py-1.5">
                <span className="text-gray-500">Étudiant :</span>
                <span className="font-bold text-[#1A1A1A]">{etudiant.nom.toUpperCase()} {etudiant.prenom}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-gray-500">Matricule :</span>
                <span className="font-mono font-bold text-slate-900">{etudiant.matricule}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-gray-500">Type de Règlement :</span>
                <span className="font-bold text-[#0066FF]">{viewingReceipt.type_frais}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-gray-500">Mode de Paiement :</span>
                <span className="font-bold text-gray-800">{viewingReceipt.mode_paiement}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-gray-500">Date d'Encaissement :</span>
                <span className="font-bold text-gray-800">{viewingReceipt.date_paiement}</span>
              </div>
              <div className="flex justify-between py-2 text-sm">
                <span className="font-bold text-gray-800">Montant Payé :</span>
                <span className="font-black text-emerald-600 font-mono">
                  {viewingReceipt.montant_paye.toLocaleString()} FCFA
                </span>
              </div>
            </div>

            <button type="button"
              onClick={() => window.print()}
              className="w-full h-[44px] bg-[#0066FF] hover:bg-blue-700 text-white font-bold rounded-[14px] flex items-center justify-center gap-2 transition-colors mt-4"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer le Reçu</span>
            </button>
          </div>
        </Modal>
      )}

    </div>
  );
};
