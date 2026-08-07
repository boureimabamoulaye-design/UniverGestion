import React, { useState, useEffect } from 'react';
import { AuthUser, Paiement } from '../types/database';
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
  ShieldCheck,
  Building2,
  DollarSign,
  Download
} from 'lucide-react';
import { Modal } from '../components/Modal';
import { ExcelBulletinView } from '../components/ExcelBulletinView';

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

  useEffect(() => {
    const handleSync = () => setDbTick(t => t + 1);
    window.addEventListener('unigestion_db_change', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('unigestion_db_change', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // Fetch updated student detail directly from DB
  const etudiants = DB.getEtudiants();
  const targetId = user.etudiantDetail?.id;
  const matchedEtudiant = etudiants.find(e => 
    (targetId && e.id === targetId) || 
    e.matricule === user.email_or_matricule || 
    e.email === user.email_or_matricule
  );

  const etudiant = matchedEtudiant || user.etudiantDetail || etudiants[0] || {
    id: 1,
    matricule: user.email_or_matricule || '2024-USTTB-001',
    nom: user.nom || 'Traoré',
    prenom: user.prenom || 'Mamadou',
    email: 'm.traore@usttb.edu.ml',
    telephone: '+223 76 00 11 22',
    adresse: 'Hamdallaye ACI 2000, Bamako',
    date_naissance: '2003-05-12',
    lieu_naissance: 'Bamako',
    genre: 'M' as const,
    sexe: 'M' as const,
    statut: 'Actif' as const,
    nationalite: 'Malienne',
    filiere_id: 1,
    niveau_id: 1,
    classe_id: 1,
    date_inscription: '2025-10-01'
  };



  const classes = DB.getClasses();
  const studentClass = classes.find(c => c.id === etudiant.classe_id) || classes[0];
  const filieres = DB.getFilieres();
  const studentFiliere = filieres.find(f => f.id === studentClass?.filiere_id) || filieres[0];
  const facultes = DB.getFacultes();
  const studentFaculte = facultes.find(f => f.id === studentFiliere?.faculte_id) || facultes[0];
  const universite = DB.getUniversites()[0];
  const activeAnnee = DB.getActiveAnneeAcademique();

  const semestres = DB.getSemestres();
  const matieres = DB.getMatieres();
  
  // Dynamic student data from DB (automatically re-evaluated on dbTick change)
  const notes = DB.getNotes().filter(n => n.etudiant_id === etudiant.id);
  const paiements = DB.getPaiements().filter(p => p.etudiant_id === etudiant.id);
  const absences = DB.getAbsences().filter(a => a.etudiant_id === etudiant.id);

  // States
  const [selectedSemestreId, setSelectedSemestreId] = useState<number>(semestres[0]?.id || 1);
  const [phone, setPhone] = useState(etudiant.telephone || '');
  const [adresse, setAdresse] = useState(etudiant.adresse || '');
  const [isSaved, setIsSaved] = useState(false);

  // Modals
  const [isExcelBulletinModalOpen, setIsExcelBulletinModalOpen] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState<Paiement | null>(null);

  // Current selected tab state helper
  const currentTab = activeTab === 'dashboard' || !activeTab ? 'bulletins' : activeTab;

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    DB.saveEtudiant({
      ...etudiant,
      telephone: phone,
      adresse
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  // Filter matieres for selected semester
  const semesterMatieres = matieres.filter(m => m.semestre_id === selectedSemestreId);

  // Calculate semester notes & statistics
  const semesterNotes = notes.filter(n => n.semestre_id === selectedSemestreId);

  let totalPoints = 0;
  let totalCreditsSemester = 0;
  let creditsValidated = 0;

  const notesTableData = semesterMatieres.map(mat => {
    const noteObj = semesterNotes.find(n => n.matiere_id === mat.id);
    const cc = noteObj ? noteObj.note_cc : null;
    const exam = noteObj ? noteObj.note_examen : null;
    const finale = noteObj ? noteObj.note_finale : null;
    const isValidated = finale !== null && finale >= 10;

    if (finale !== null) {
      totalPoints += finale * (mat.credits || 1);
      totalCreditsSemester += mat.credits || 1;
      if (isValidated) {
        creditsValidated += mat.credits || 1;
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

  const semesterAverage = totalCreditsSemester > 0
    ? Math.round((totalPoints / totalCreditsSemester) * 100) / 100
    : (semesterNotes.length > 0
      ? Math.round((semesterNotes.reduce((acc, curr) => acc + curr.note_finale, 0) / semesterNotes.length) * 100) / 100
      : null);

  const getMention = (avg: number | null) => {
    if (avg === null) return 'En attente';
    if (avg >= 16) return 'Très Bien';
    if (avg >= 14) return 'Bien';
    if (avg >= 12) return 'Assez Bien';
    if (avg >= 10) return 'Passable';
    return 'Ajourné';
  };

  // Gather student's inscriptions & training fees (Frais de formation) across all registered filières
  const studentInscriptions = DB.getInscriptions().filter(i => i.etudiant_id === etudiant.id);
  const annees = DB.getAnneesAcademiques();

  const fraisFormationList = (() => {
    const list: { filiereCode: string; montant: number; reduction: number; montantDu: number; annee: string }[] = [];
    const seenClasses = new Set<number>();

    studentInscriptions.forEach(insc => {
      seenClasses.add(insc.classe_id);
      const cls = classes.find(c => c.id === insc.classe_id);
      const fil = filieres.find(f => f.id === cls?.filiere_id);
      const code = fil?.code || cls?.code || 'IG1';
      const montant = insc.frais_inscription || (code === 'IG1' ? 550000 : code === 'IG2' ? 450000 : 500000);
      const reduction = 0;
      const anneeObj = annees.find(a => a.id === insc.annee_academique_id);
      list.push({
        filiereCode: code,
        montant,
        reduction,
        montantDu: montant - reduction,
        annee: anneeObj ? anneeObj.code.replace('-', ' - ') : '2025 - 2026'
      });
    });

    if (etudiant.classe_id && !seenClasses.has(etudiant.classe_id)) {
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
      const matchingInsc = studentInscriptions.find(i => i.annee_academique_id === p.annee_academique_id);
      if (matchingInsc) {
        const cls = classes.find(c => c.id === matchingInsc.classe_id);
        const fil = filieres.find(f => f.id === cls?.filiere_id);
        filiereCode = fil?.code || cls?.code;
      }
    }
    if (!filiereCode) {
      filiereCode = idx === 0 ? 'IG1' : 'IG2';
    }

    const anneeObj = annees.find(a => a.id === p.annee_academique_id);
    const anneeText = p.annee_libelle || (anneeObj ? anneeObj.code.replace('-', ' - ') : '2025 - 2026');

    return {
      filiereCode,
      montantPaye: p.montant_paye,
      datePaiement: p.date_paiement,
      anneeText
    };
  });



  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* TAB 1: MON BULLETIN (Format Admin Officiel direct) */}
      {currentTab === 'bulletins' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Header & Semester Selection Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-[20px] border border-[#E5E7EB] shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.print()}
                className="p-2 sm:px-3 sm:py-2 bg-[#0066FF] hover:bg-blue-700 text-white rounded-[10px] text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 shrink-0"
                title="Télécharger / Imprimer le bulletin"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Télécharger</span>
              </button>

              <h3 className="font-bold text-base text-[#1A1A1A] flex items-center gap-2">
                <span>Bulletin</span>
              </h3>
            </div>

            {/* Semester Select Dropdown */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-gray-700 whitespace-nowrap">Semestre :</label>
              <select
                value={selectedSemestreId}
                onChange={(e) => setSelectedSemestreId(Number(e.target.value))}
                className="h-[40px] bg-white border border-[#E5E7EB] rounded-[12px] px-3.5 text-xs font-bold text-[#0066FF] focus:outline-none focus:border-[#0066FF] shadow-2xs"
              >
                {semestres.map(s => (
                  <option key={s.id} value={s.id}>{s.libelle}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Bulletin Admin Direct */}
          <ExcelBulletinView
            etudiant={etudiant}
            semestre={semestres.find(s => s.id === selectedSemestreId) || semestres[0]}
            notes={notes}
            matieres={matieres}
            classe={studentClass}
            filiere={studentFiliere}
            faculte={studentFaculte}
            universite={universite}
            anneeAcademique={activeAnnee}
            onPrint={() => window.print()}
          />
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
                          <button
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
            
            {/* Block 1: Identité */}
            <div className="p-5 bg-gray-50/70 rounded-[16px] border border-gray-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-gray-200 pb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#0066FF]" />
                <span>État Civil & Identité</span>
              </h4>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Matricule :</span>
                  <span className="font-mono font-bold text-slate-900">{etudiant.matricule}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Nom :</span>
                  <span className="font-bold text-slate-900">{etudiant.nom.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Prénom :</span>
                  <span className="font-bold text-slate-900">{etudiant.prenom}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Sexe / Genre :</span>
                  <span className="font-semibold text-slate-900">{etudiant.sexe === 'M' ? 'Masculin (M)' : 'Féminin (F)'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date de Naissance :</span>
                  <span className="font-semibold text-slate-900">{etudiant.date_naissance || '12/05/2003'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Lieu de Naissance :</span>
                  <span className="font-semibold text-slate-900">{etudiant.lieu_naissance || 'Bamako'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Nationalité :</span>
                  <span className="font-semibold text-slate-900">{etudiant.nationalite || 'Malienne'}</span>
                </div>
              </div>
            </div>

            {/* Block 2: Parcours Académique */}
            <div className="p-5 bg-gray-50/70 rounded-[16px] border border-gray-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-gray-200 pb-2 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-[#0066FF]" />
                <span>Inscription Académique</span>
              </h4>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Université :</span>
                  <span className="font-semibold text-slate-900 text-right">{universite?.nom || 'USTTB'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Faculté :</span>
                  <span className="font-semibold text-slate-900 text-right">{studentFaculte?.nom || 'FST'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Filière d'Études :</span>
                  <span className="font-bold text-[#0066FF] text-right">{studentFiliere?.nom || 'Informatique'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Classe / Niveau :</span>
                  <span className="font-bold text-slate-900 text-right">{studentClass?.nom || 'Licence 1'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Année Académique :</span>
                  <span className="font-bold text-slate-900">{activeAnnee?.libelle || '2025-2026'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date d'Inscription :</span>
                  <span className="font-semibold text-slate-900">{etudiant.date_inscription || '2025-10-01'}</span>
                </div>
              </div>
            </div>

            {/* Block 3: Coordonnées & Contacts */}
            <div className="md:col-span-2 p-5 bg-blue-50/40 rounded-[16px] border border-blue-100 space-y-3">
              <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider border-b border-blue-200/60 pb-2 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-[#0066FF]" />
                <span>Coordonnées de Contact</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase block">Adresse Email</span>
                  <span className="font-medium text-slate-900">{etudiant.email || 'm.traore@usttb.edu.ml'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase block">Téléphone Personnel</span>
                  <span className="font-bold text-slate-900">{etudiant.telephone || '+223 76 00 11 22'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase block">Adresse Résidence</span>
                  <span className="font-medium text-slate-900">{etudiant.adresse || 'Hamdallaye ACI 2000, Bamako'}</span>
                </div>
              </div>
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
                const mat = matieres.find(m => m.id === abs.matiere_id);
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

            <button
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
