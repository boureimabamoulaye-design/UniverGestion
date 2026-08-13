import React, { useState, useMemo, useEffect } from 'react';
import { DB } from '../lib/storage';
import { safeFetchJson } from '../lib/api';
import { Modal } from '../components/Modal';
import { 
  Save, 
  Search, 
  Check, 
  Download, 
  Upload, 
  Printer, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight, 
  FileSpreadsheet, 
  BookOpen,
  Layers,
  Sparkles,
  Award,
  AlertCircle
} from 'lucide-react';

interface DraftGrade {
  cc: number | string;
  exam: number | string;
  observation?: string;
}

export const NotesView: React.FC = () => {
  const [notesList, setNotesList] = useState(() => DB.getNotes());

  useEffect(() => {
    const handleSync = () => {
      setNotesList(DB.getNotes());
    };
    window.addEventListener('unigestion_db_change', handleSync);
    return () => window.removeEventListener('unigestion_db_change', handleSync);
  }, []);
  const annees = DB.getAnneesAcademiques();
  const filieres = DB.getFilieres();
  const classes = DB.getClasses();
  const matieres = DB.getMatieres();
  const semestres = DB.getSemestres();
  const etudiants = DB.getEtudiants();
  const activeAnnee = DB.getActiveAnneeAcademique();

  // ONLY 3 MANDATORY FILTERS as requested
  const [selectedAnnee, setSelectedAnnee] = useState<number>(activeAnnee.id);
  const [selectedFiliere, setSelectedFiliere] = useState<number>(filieres[0]?.id || 1);
  const [selectedSemestre, setSelectedSemestre] = useState<number>(semestres[0]?.id || 1);

  // Active view mode: 'SINGLE_MATIERE' or 'GLOBAL_MATRIX'
  const [activeMatiereId, setActiveMatiereId] = useState<number | 'ALL'>('ALL');

  // Search & Pagination & Grade Status Filter
  const [search, setSearch] = useState<string>('');
  const [gradeFilter, setGradeFilter] = useState<'ALL' | 'AVEC_NOTE' | 'SANS_NOTE'>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // Draft grades state (key = `${etudiantId}_${matiereId}`)
  const [draftGrades, setDraftGrades] = useState<{ [key: string]: DraftGrade }>({});
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  // Batch fill inputs
  const [batchCCValue, setBatchCCValue] = useState<string>('');
  const [batchExamValue, setBatchExamValue] = useState<string>('');

  // Modals state
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [rawCsvText, setRawCsvText] = useState<string>('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  useEffect(() => {
    DB.logAccess('VISITE_PAGE', 'Consultation du Registre de Saisie des Notes');
  }, []);

  // Selected Entities
  const currentAnnee = annees.find(a => a.id === Number(selectedAnnee)) || activeAnnee;
  const currentFiliere = filieres.find(f => f.id === Number(selectedFiliere));
  const currentSemestre = semestres.find(s => s.id === Number(selectedSemestre));

  // Subjects corresponding to Filiere and Semestre
  const semesterMatieres = useMemo(() => {
    const list = matieres.filter(
      m => m.filiere_id === Number(selectedFiliere) && m.semestre_id === Number(selectedSemestre)
    );
    if (list.length > 0) return list;
    // Fallback if no exact match: subjects of that filiere
    const listFiliere = matieres.filter(m => m.filiere_id === Number(selectedFiliere));
    return listFiliere.length > 0 ? listFiliere : matieres;
  }, [matieres, selectedFiliere, selectedSemestre]);

  // Ensure activeMatiereId is valid
  const currentActiveMatiere = useMemo(() => {
    if (activeMatiereId === 'ALL') return null;
    return semesterMatieres.find(m => m.id === activeMatiereId) || semesterMatieres[0] || null;
  }, [activeMatiereId, semesterMatieres]);

  // Students belonging to selected Filière (via Niveau & Classe)
  const filiereStudents = useMemo(() => {
    const niveaus = DB.getNiveaux();
    const filiereNiveauIds = niveaus
      .filter(n => n.filiere_id === Number(selectedFiliere))
      .map(n => n.id);

    const filiereClassIds = classes
      .filter(c => filiereNiveauIds.includes(c.niveau_id))
      .map(c => c.id);

    if (filiereClassIds.length === 0) {
      return etudiants;
    }

    return etudiants.filter(e => 
      filiereClassIds.includes(e.classe_id) || (e as any).filiere_id === Number(selectedFiliere)
    );
  }, [etudiants, classes, selectedFiliere]);

  // Key generator helper
  const getGradeKey = (etudiantId: number, matiereId: number) => `${etudiantId}_${matiereId}`;

  // Helper to fetch or initialize student grade for a given subject
  const getStudentGrade = (etudiantId: number, matiereId: number): DraftGrade => {
    const key = getGradeKey(etudiantId, matiereId);
    if (draftGrades[key] !== undefined) {
      return draftGrades[key];
    }
    const existing = notesList.find(
      n => n.etudiant_id === etudiantId &&
           n.matiere_id === matiereId &&
           n.semestre_id === Number(selectedSemestre) &&
           n.annee_academique_id === Number(selectedAnnee)
    );
    return {
      cc: existing?.note_cc !== undefined && existing?.note_cc !== null ? existing.note_cc : '',
      exam: existing?.note_examen !== undefined && existing?.note_examen !== null ? existing.note_examen : '',
      observation: existing?.appreciation ?? ''
    };
  };

  // Helper to check if a student has saved grades in DB for active subject(s)
  const hasSavedStudentGrade = (etudiantId: number) => {
    const targetMatieres = activeMatiereId === 'ALL'
      ? semesterMatieres
      : semesterMatieres.filter(m => m.id === activeMatiereId);

    if (targetMatieres.length === 0) return false;

    return targetMatieres.some(m => {
      const dbNote = notesList.find(
        n => n.etudiant_id === etudiantId &&
             n.matiere_id === m.id &&
             n.semestre_id === Number(selectedSemestre) &&
             n.annee_academique_id === Number(selectedAnnee)
      );
      return dbNote !== undefined && (dbNote.note_cc !== undefined || dbNote.note_examen !== undefined);
    });
  };

  // Helper to check if a student has received grades for active subject(s) (including drafts)
  const hasStudentGrade = (etudiantId: number) => {
    const targetMatieres = activeMatiereId === 'ALL'
      ? semesterMatieres
      : semesterMatieres.filter(m => m.id === activeMatiereId);

    if (targetMatieres.length === 0) return false;

    return targetMatieres.some(m => {
      const key = getGradeKey(etudiantId, m.id);
      const draft = draftGrades[key];
      if (draft !== undefined) {
        return (draft.cc !== '' && draft.cc !== undefined && draft.cc !== null) ||
               (draft.exam !== '' && draft.exam !== undefined && draft.exam !== null);
      }
      return hasSavedStudentGrade(etudiantId);
    });
  };

  // Counts for grade status filter
  const { avecNoteCount, sansNoteCount } = useMemo(() => {
    let avec = 0;
    let sans = 0;
    filiereStudents.forEach(st => {
      if (hasStudentGrade(st.id)) avec++;
      else sans++;
    });
    return { avecNoteCount: avec, sansNoteCount: sans };
  }, [filiereStudents, semesterMatieres, activeMatiereId, draftGrades, notesList, selectedSemestre, selectedAnnee]);

  // Filtered Students with Search & Grade Filter (filtering relies on saved DB records so typing never hides rows)
  const filteredStudents = useMemo(() => {
    return filiereStudents.filter(st => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesSearch = 
          st.matricule.toLowerCase().includes(q) ||
          st.nom.toLowerCase().includes(q) ||
          st.prenom.toLowerCase().includes(q) ||
          `${st.prenom} ${st.nom}`.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      // Grade Status (uses saved DB status so typing does not dynamically close/hide rows)
      if (gradeFilter !== 'ALL') {
        const hasSaved = hasSavedStudentGrade(st.id);
        if (gradeFilter === 'AVEC_NOTE' && !hasSaved) return false;
        if (gradeFilter === 'SANS_NOTE' && hasSaved) return false;
      }

      return true;
    });
  }, [filiereStudents, search, gradeFilter, semesterMatieres, activeMatiereId, notesList, selectedSemestre, selectedAnnee]);

  // Pagination logic
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage) || 1;
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(start, start + itemsPerPage);
  }, [filteredStudents, currentPage, itemsPerPage]);

  // Grade change handler
  const handleGradeChange = (etudiantId: number, matiereId: number, field: 'cc' | 'exam', rawValue: string) => {
    const key = getGradeKey(etudiantId, matiereId);
    const current = getStudentGrade(etudiantId, matiereId);
    let val: number | string = rawValue.trim();
    if (val !== '') {
      const parsed = parseFloat(rawValue);
      val = isNaN(parsed) ? '' : parsed;
    }

    setDraftGrades(prev => ({
      ...prev,
      [key]: {
        ...current,
        [field]: val
      }
    }));
    setIsSaved(false);
  };

  const handleObservationChange = (etudiantId: number, matiereId: number, val: string) => {
    const key = getGradeKey(etudiantId, matiereId);
    const current = getStudentGrade(etudiantId, matiereId);

    setDraftGrades(prev => ({
      ...prev,
      [key]: {
        ...current,
        observation: val
      }
    }));
    setIsSaved(false);
  };

  // Batch Fill for entire student list (for current active subject or all subjects)
  const handleBatchFill = (field: 'cc' | 'exam', rawVal: string) => {
    const val = rawVal.trim() === '' ? '' : Math.min(20, Math.max(0, parseFloat(rawVal)));

    const updated = { ...draftGrades };
    const targetMatieres = activeMatiereId === 'ALL' 
      ? semesterMatieres 
      : semesterMatieres.filter(m => m.id === activeMatiereId);

    filiereStudents.forEach(st => {
      targetMatieres.forEach(m => {
        const key = getGradeKey(st.id, m.id);
        const current = getStudentGrade(st.id, m.id);
        updated[key] = {
          ...current,
          [field]: val
        };
      });
    });

    setDraftGrades(updated);
    setIsSaved(false);
  };

  // Boundary Validation Check
  const getGradeValidationError = (grade: DraftGrade): string | null => {
    if (grade.cc !== '' && grade.cc !== undefined && grade.cc !== null) {
      const c = Number(grade.cc);
      if (isNaN(c) || c < 0 || c > 20) return 'CC [0-20]';
    }
    if (grade.exam !== '' && grade.exam !== undefined && grade.exam !== null) {
      const e = Number(grade.exam);
      if (isNaN(e) || e < 0 || e > 20) return 'Exam [0-20]';
    }
    return null;
  };

  // Progress metrics calculation
  const progressStats = useMemo(() => {
    let filledCount = 0;
    let totalExpected = filiereStudents.length * semesterMatieres.length;
    let invalidCount = 0;
    let totalMoyennes = 0;
    let passedStudents = 0;

    filiereStudents.forEach(st => {
      let studentSum = 0;
      let studentCredits = 0;

      semesterMatieres.forEach(m => {
        const g = getStudentGrade(st.id, m.id);
        const hasCc = g.cc !== '' && g.cc !== undefined && g.cc !== null;
        const hasExam = g.exam !== '' && g.exam !== undefined && g.exam !== null;
        const ccNum = hasCc ? Number(g.cc) : 0;
        const examNum = hasExam ? Number(g.exam) : 0;

        if (hasCc || hasExam) {
          if (ccNum >= 0 && ccNum <= 20 && examNum >= 0 && examNum <= 20) {
            filledCount++;
          } else {
            invalidCount++;
          }
        }
        const noteM = (ccNum * 0.4) + (examNum * 0.6);
        const credit = m.credits || 3;
        studentSum += noteM * credit;
        studentCredits += credit;
      });

      const stAvg = studentCredits > 0 ? studentSum / studentCredits : 0;
      totalMoyennes += stAvg;
      if (stAvg >= 10) passedStudents++;
    });

    const percentage = totalExpected > 0 ? Math.round((filledCount / totalExpected) * 100) : 0;
    const classAvg = filiereStudents.length > 0 ? (totalMoyennes / filiereStudents.length).toFixed(2) : '0.00';
    const passRate = filiereStudents.length > 0 ? Math.round((passedStudents / filiereStudents.length) * 100) : 0;

    return {
      filledCount,
      totalExpected,
      percentage,
      invalidCount,
      classAvg,
      passRate
    };
  }, [filiereStudents, semesterMatieres, draftGrades, notesList, selectedSemestre, selectedAnnee]);

  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Save all grades
  const handleSaveAllGrades = async () => {
    setErrorBanner(null);

    let hasError = false;
    filiereStudents.forEach(st => {
      semesterMatieres.forEach(m => {
        const g = getStudentGrade(st.id, m.id);
        if (getGradeValidationError(g)) {
          hasError = true;
        }
      });
    });

    if (hasError) {
      alert("Certaines notes sont hors de l'intervalle [0, 20]. Veuillez corriger les erreurs.");
      return;
    }

    const gradesPayload: any[] = [];

    filiereStudents.forEach(st => {
      semesterMatieres.forEach(m => {
        const g = getStudentGrade(st.id, m.id);
        const ccVal = g.cc === '' || g.cc === undefined || g.cc === null ? 0 : Number(g.cc);
        const examVal = g.exam === '' || g.exam === undefined || g.exam === null ? 0 : Number(g.exam);
        const noteFinale = parseFloat(((ccVal * 0.4) + (examVal * 0.6)).toFixed(2));
        let appreciation = g.observation || (noteFinale >= 10 ? 'Validé' : 'Ajourné');

        gradesPayload.push({
          etudiant_id: st.id,
          matiere_id: m.id,
          note_cc: ccVal,
          note_examen: examVal,
          appreciation
        });
      });
    });

    setIsSubmitting(true);
    try {
      const data = await safeFetchJson('/api/notes/saisie-collective', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          annee_academique_id: Number(selectedAnnee),
          filiere_id: Number(selectedFiliere),
          semestre_id: Number(selectedSemestre),
          grades: gradesPayload
        })
      });

      if (data && data.success === false) {
        setErrorBanner(data.message || "Erreur lors de l'enregistrement des notes dans la base MySQL.");
        return;
      }

      // Sync local cache
      filiereStudents.forEach(st => {
        semesterMatieres.forEach(m => {
          const g = getStudentGrade(st.id, m.id);
          const ccVal = g.cc === '' || g.cc === undefined || g.cc === null ? 0 : Number(g.cc);
          const examVal = g.exam === '' || g.exam === undefined || g.exam === null ? 0 : Number(g.exam);
          const noteFinale = parseFloat(((ccVal * 0.4) + (examVal * 0.6)).toFixed(2));

          const existingNote = notesList.find(
            n => n.etudiant_id === st.id &&
                 n.matiere_id === m.id &&
                 n.semestre_id === Number(selectedSemestre) &&
                 n.annee_academique_id === Number(selectedAnnee)
          );

          let appreciation = g.observation || (noteFinale >= 10 ? 'Validé' : 'Ajourné');

          DB.saveNote({
            id: existingNote?.id,
            etudiant_id: st.id,
            matiere_id: m.id,
            semestre_id: Number(selectedSemestre),
            annee_academique_id: Number(selectedAnnee),
            note_cc: ccVal,
            note_examen: examVal,
            note_finale: noteFinale,
            appreciation
          });
        });
      });

      setNotesList(DB.getNotes());
      setDraftGrades({});
      setIsSaved(true);
      setLastSavedTime(new Date().toLocaleTimeString());
      DB.logAccess(
        'NOTE_SAISIE',
        `Saisie globale enregistrée : ${filiereStudents.length} étudiants (${currentFiliere?.code || ''} - ${currentSemestre?.libelle || ''})`
      );
      setTimeout(() => setIsSaved(false), 4000);

    } catch (err: any) {
      setErrorBanner(`Erreur lors de l'enregistrement des notes : ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // CSV Export
  const handleExportCsv = () => {
    let csv = `PROCES-VERBAL GLOBAL DE NOTES\n`;
    csv += `Filiere: ${currentFiliere?.nom || ''}\n`;
    csv += `Semestre: ${currentSemestre?.libelle || ''}\n`;
    csv += `Annee Academique: ${currentAnnee.code}\n\n`;

    let header = `Nom_Complet`;
    semesterMatieres.forEach(m => {
      header += `;${m.nom}_CC;${m.nom}_EXAM;${m.nom}_MOY`;
    });
    header += `;Moyenne_Generale;Decision\n`;
    csv += header;

    filiereStudents.forEach(st => {
      let row = `"${st.prenom} ${st.nom}"`;
      
      let sum = 0;
      let coeffs = 0;

      semesterMatieres.forEach(m => {
        const g = getStudentGrade(st.id, m.id);
        const ccVal = g.cc === '' || g.cc === undefined || g.cc === null ? 0 : Number(g.cc);
        const examVal = g.exam === '' || g.exam === undefined || g.exam === null ? 0 : Number(g.exam);
        const moy = ((ccVal * 0.4) + (examVal * 0.6)).toFixed(2);
        const coeff = m.credits || 3;
        sum += parseFloat(moy) * coeff;
        coeffs += coeff;
        row += `;${g.cc};${g.exam};${moy}`;
      });

      const genAvg = coeffs > 0 ? (sum / coeffs).toFixed(2) : '0.00';
      const decision = parseFloat(genAvg) >= 10 ? 'Admis' : 'Ajourné';

      row += `;${genAvg};${decision}\n`;
      csv += row;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `PV_Collectif_Notes_${currentFiliere?.code || 'Filiere'}_${currentSemestre?.libelle || 'S1'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import Excel/CSV parser
  const handleProcessImportCsv = () => {
    if (!rawCsvText.trim()) {
      setImportStatus('Veuillez coller du texte au format CSV.');
      return;
    }

    const lines = rawCsvText.split('\n');
    let importedCount = 0;
    const updatedDrafts = { ...draftGrades };

    lines.forEach(line => {
      if (!line.trim() || line.startsWith('Matricule')) return;
      const parts = line.split(/[;,]/);
      if (parts.length >= 3) {
        const mat = parts[0].trim();
        const ccNum = parseFloat(parts[2]?.trim());
        const examNum = parseFloat(parts[3]?.trim());
        const obs = parts[4]?.trim() || '';

        const matchedStudent = filiereStudents.find(
          s => s.matricule.toLowerCase() === mat.toLowerCase()
        );

        if (matchedStudent) {
          const targetMatiereId = typeof activeMatiereId === 'number' ? activeMatiereId : semesterMatieres[0]?.id;
          if (targetMatiereId) {
            const key = getGradeKey(matchedStudent.id, targetMatiereId);
            updatedDrafts[key] = {
              cc: isNaN(ccNum) ? 10 : Math.min(20, Math.max(0, ccNum)),
              exam: isNaN(examNum) ? 10 : Math.min(20, Math.max(0, examNum)),
              observation: obs
            };
            importedCount++;
          }
        }
      }
    });

    setDraftGrades(updatedDrafts);
    setImportStatus(`${importedCount} notes importées avec succès !`);
    setTimeout(() => {
      setIsImportModalOpen(false);
      setImportStatus(null);
      setRawCsvText('');
    }, 1500);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      
      {/* Title & Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-[12px] border border-gray-300 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">Saisie Collective des Notes</h2>
            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-300 rounded text-[10px] font-semibold">
              Registre Administratif
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Sélectionnez l'année académique, la filière et le semestre pour afficher le registre complet des étudiants.
          </p>
        </div>

        {/* Error Notification Banner */}
      {errorBanner && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="whitespace-pre-line">{errorBanner}</span>
          </div>
          <button type="button" onClick={() => setErrorBanner(null)} className="text-rose-600 hover:text-rose-900 font-extrabold text-sm">✕</button>
        </div>
      )}

      {/* Global Toolbar Tools */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="h-[40px] px-3.5 bg-white hover:bg-slate-50 text-slate-700 border border-gray-300 rounded-[14px] text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="truncate">Importer CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="h-[40px] px-3.5 bg-white hover:bg-slate-50 text-slate-700 border border-gray-300 rounded-[14px] text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            <span className="truncate">Exporter Excel</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPrintModalOpen(true)}
            className="h-[40px] px-3.5 bg-white hover:bg-slate-50 text-slate-700 border border-gray-300 rounded-[14px] text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            <span className="truncate">Imprimer PV</span>
          </button>
        </div>
      </div>

      {/* STRICT 3 MAIN SELECTION FILTERS */}
      <div className="bg-white p-4 sm:p-5 rounded-[16px] border border-gray-300 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 1. Année Scolaire */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-800 text-[10px] font-bold flex items-center justify-center">1</span>
            Année Académique
          </label>
          <select
            value={selectedAnnee}
            onChange={(e) => { setSelectedAnnee(Number(e.target.value)); setDraftGrades({}); }}
            className="w-full h-[42px] bg-white border border-gray-300 rounded-[14px] px-3 text-xs font-semibold text-slate-900 focus:outline-none focus:border-slate-600 focus:ring-1 focus:ring-slate-600 transition-colors"
          >
            {annees.map(a => (
              <option key={a.id} value={a.id}>{a.libelle || a.code}</option>
            ))}
          </select>
        </div>

        {/* 2. Filière */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-800 text-[10px] font-bold flex items-center justify-center">2</span>
            Filière d'Études
          </label>
          <select
            value={selectedFiliere}
            onChange={(e) => { setSelectedFiliere(Number(e.target.value)); setDraftGrades({}); setCurrentPage(1); }}
            className="w-full h-[42px] bg-white border border-gray-300 rounded-[14px] px-3 text-xs font-semibold text-slate-900 focus:outline-none focus:border-slate-600 focus:ring-1 focus:ring-slate-600 transition-colors"
          >
            {filieres.map(f => (
              <option key={f.id} value={f.id}>{f.code} - {f.nom}</option>
            ))}
          </select>
        </div>

        {/* 3. Semestre */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-800 text-[10px] font-bold flex items-center justify-center">3</span>
            Semestre
          </label>
          <select
            value={selectedSemestre}
            onChange={(e) => { setSelectedSemestre(Number(e.target.value)); setDraftGrades({}); }}
            className="w-full h-[42px] bg-white border border-gray-300 rounded-[14px] px-3 text-xs font-semibold text-slate-900 focus:outline-none focus:border-slate-600 focus:ring-1 focus:ring-slate-600 transition-colors"
          >
            {semestres.map(s => (
              <option key={s.id} value={s.id}>{s.libelle}</option>
            ))}
          </select>
        </div>
      </div>

      {/* MATIÈRES BAR & GLOBAL PROGRESS */}
      <div className="bg-white p-3.5 sm:p-4 rounded-[12px] border border-gray-300 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-slate-700" />
          <h3 className="text-xs font-semibold text-slate-900">
            Matières de la filière ({semesterMatieres.length} matières pour {currentSemestre?.libelle})
          </h3>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {isSaved && (
            <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1 animate-pulse">
              <Check className="w-4 h-4" /> Enregistré {lastSavedTime && `à ${lastSavedTime}`}
            </span>
          )}
          <span className="text-slate-600 font-medium">
            Saisie globale : <strong className="text-slate-900 font-mono">{progressStats.percentage}%</strong> ({progressStats.filledCount}/{progressStats.totalExpected})
          </span>
        </div>
      </div>

      {/* STUDENT LIST & SUBJECT GRADES TABLE - ADMINISTRATIVE REGISTER STYLE */}
      <div className="bg-white rounded-[16px] border border-gray-300 shadow-sm overflow-hidden">
        
        {/* Table Controls (Search, Grade Status Filter & Pagination) */}
        <div className="p-4 bg-slate-50/80 border-b border-gray-200 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-xs">
              <input
                type="text"
                placeholder="Recherche par nom d'étudiant..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="w-full h-[36px] bg-white border border-gray-300 rounded-[8px] pl-9 pr-3 text-xs font-medium text-gray-800 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            </div>

            {/* Filter Grade Status Dropdown */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-semibold text-slate-600 hidden sm:inline">Statut :</span>
              <select
                value={gradeFilter}
                onChange={(e) => {
                  setGradeFilter(e.target.value as 'ALL' | 'AVEC_NOTE' | 'SANS_NOTE');
                  setCurrentPage(1);
                }}
                className="h-[36px] bg-white border border-gray-300 rounded-[8px] px-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shrink-0 cursor-pointer shadow-2xs"
              >
                <option value="ALL">Tous ({filiereStudents.length})</option>
                <option value="AVEC_NOTE">Avec notes ({avecNoteCount})</option>
                <option value="SANS_NOTE">Sans note ({sansNoteCount})</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-gray-600">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold">Afficher :</span>
              <select
                value={itemsPerPage}
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="h-[32px] bg-white border border-gray-300 rounded-[6px] px-2 text-xs font-semibold text-gray-700"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <span className="font-medium">
              Page <strong className="text-gray-900">{currentPage}</strong> / <strong className="text-gray-900">{totalPages}</strong> ({filteredStudents.length} étudiants)
            </span>

            <div className="flex items-center gap-1">
              <button type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="p-1.5 bg-white border border-gray-300 rounded-[6px] hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-white"
              >
                <ChevronLeft className="w-4 h-4 text-gray-700" />
              </button>
              <button type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="p-1.5 bg-white border border-gray-300 rounded-[6px] hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-white"
              >
                <ChevronRight className="w-4 h-4 text-gray-700" />
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Table Rendering - Administrative Ledger Grid */}
        <div className="overflow-x-auto">
          {activeMatiereId === 'ALL' ? (
            /* MULTI-MATIERE MATRIX TABLE */
            <table className="w-full text-left border-collapse border-spacing-0 min-w-[750px]">
              <thead>
                <tr className="bg-slate-100 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-gray-300">
                  <th className="px-2 py-2.5 text-center w-10 border-r border-gray-300">N°</th>
                  <th className="px-3 py-2.5 border-r border-gray-300 min-w-[170px] max-w-[210px]">Nom & Prénom(s)</th>
                  {semesterMatieres.map(m => (
                    <th key={m.id} className="px-1.5 py-2 text-center border-r border-gray-300 bg-slate-100/90 min-w-[85px] max-w-[105px]">
                      <div className="text-slate-900 font-extrabold normal-case text-[11px] leading-tight truncate px-0.5" title={m.nom}>{m.nom}</div>
                      <div className="text-[9px] font-semibold text-slate-500 mt-0.5">Cl 40% | Ex 60%</div>
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-center bg-slate-200/70 text-slate-900 min-w-[95px]">Moy. Sem.</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-gray-200">
                {paginatedStudents.length === 0 ? (
                  <tr>
                    <td colSpan={3 + semesterMatieres.length} className="text-center py-12 text-gray-400 font-medium">
                      Aucun étudiant trouvé dans cette filière.
                    </td>
                  </tr>
                ) : (
                  paginatedStudents.map((st, idx) => {
                    const globalIdx = (currentPage - 1) * itemsPerPage + idx + 1;
                    
                    let sumMoy = 0;
                    let totalCredits = 0;

                    return (
                      <tr key={st.id} className="odd:bg-white even:bg-slate-50/60 hover:bg-blue-50/40 transition-colors">
                        <td className="px-2 py-2 text-center text-slate-500 font-mono text-[10px] font-bold border-r border-gray-200">{globalIdx}</td>
                        <td className="px-3 py-2 font-bold text-slate-900 border-r border-gray-200 truncate max-w-[200px]" title={`${st.prenom} ${st.nom}`}>{st.prenom} {st.nom}</td>

                        {/* Matières Inputs Side-by-Side (Ultra Compact) */}
                        {semesterMatieres.map(m => {
                          const g = getStudentGrade(st.id, m.id);
                          const ccVal = g.cc === '' || g.cc === undefined || g.cc === null ? 0 : Number(g.cc);
                          const examVal = g.exam === '' || g.exam === undefined || g.exam === null ? 0 : Number(g.exam);
                          const moy = ((ccVal * 0.4) + (examVal * 0.6));
                          const credit = m.credits || 3;
                          sumMoy += moy * credit;
                          totalCredits += credit;

                          return (
                            <td key={m.id} className="px-1 py-1.5 text-center border-r border-gray-200">
                              <div className="flex items-center justify-center gap-0.5">
                                <div className="flex flex-col items-center">
                                  <span className="text-[8px] font-semibold text-slate-400 leading-none mb-0.5">CL</span>
                                  <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    max="20"
                                    placeholder=""
                                    value={g.cc}
                                    onChange={(e) => handleGradeChange(st.id, m.id, 'cc', e.target.value)}
                                    className="w-9 h-6 text-center bg-white border border-gray-300 rounded text-[10px] font-mono font-bold text-gray-900 focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none px-0.5"
                                  />
                                </div>
                                <span className="text-gray-300 text-[10px] font-bold self-end mb-0.5">/</span>
                                <div className="flex flex-col items-center">
                                  <span className="text-[8px] font-semibold text-slate-400 leading-none mb-0.5">EX</span>
                                  <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    max="20"
                                    placeholder=""
                                    value={g.exam}
                                    onChange={(e) => handleGradeChange(st.id, m.id, 'exam', e.target.value)}
                                    className="w-9 h-6 text-center bg-white border border-gray-300 rounded text-[10px] font-mono font-bold text-gray-900 focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] outline-none px-0.5"
                                  />
                                </div>
                              </div>
                              <div className={`text-[9px] font-mono font-extrabold mt-0.5 leading-none ${moy >= 10 ? 'text-emerald-700' : 'text-red-600'}`}>
                                {moy.toFixed(2)}
                              </div>
                            </td>
                          );
                        })}

                        {/* Student Overall Semester Average */}
                        {(() => {
                          const semAvg = totalCredits > 0 ? (sumMoy / totalCredits) : 0;
                          const isPass = semAvg >= 10;
                          return (
                            <td className="px-2.5 py-2 text-center font-mono font-bold bg-slate-50/80">
                              <span className={`inline-block px-2 py-0.5 rounded border text-[11px] font-bold ${
                                isPass 
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                                  : 'bg-red-50 text-red-800 border-red-300'
                              }`}>
                                {semAvg.toFixed(2)}
                              </span>
                            </td>
                          );
                        })()}

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            /* SINGLE ACTIVE MATIERE VIEW TABLE */
            <table className="w-full text-left border-collapse border-spacing-0">
              <thead>
                <tr className="bg-slate-100 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-gray-300">
                  <th className="px-4 py-3.5 text-center w-12 border-r border-gray-300">N°</th>
                  <th className="px-5 py-3.5 border-r border-gray-300">Nom & Prénom(s) de l'Étudiant</th>
                  <th className="px-5 py-3.5 text-center border-r border-gray-300 w-36">Note Classe (40%)</th>
                  <th className="px-5 py-3.5 text-center border-r border-gray-300 w-36">Note Examen (60%)</th>
                  <th className="px-5 py-3.5 text-center border-r border-gray-300 w-36 bg-slate-200/50">Note Finale (/20)</th>
                  <th className="px-5 py-3.5 border-r border-gray-300">Observation</th>
                  <th className="px-5 py-3.5 text-center w-36">Décision</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-gray-200">
                {paginatedStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-400 font-medium">
                      Aucun étudiant ne correspond aux critères.
                    </td>
                  </tr>
                ) : (
                  paginatedStudents.map((st, idx) => {
                    const matiereId = currentActiveMatiere?.id || semesterMatieres[0]?.id || 1;
                    const grade = getStudentGrade(st.id, matiereId);
                    const err = getGradeValidationError(grade);
                    const ccVal = grade.cc === '' || grade.cc === undefined || grade.cc === null ? 0 : Number(grade.cc);
                    const examVal = grade.exam === '' || grade.exam === undefined || grade.exam === null ? 0 : Number(grade.exam);
                    const moy = parseFloat(((ccVal * 0.4) + (examVal * 0.6)).toFixed(2));
                    const isPassed = moy >= 10;
                    const globalIdx = (currentPage - 1) * itemsPerPage + idx + 1;

                    return (
                      <tr key={st.id} className="odd:bg-white even:bg-slate-50/60 hover:bg-blue-50/40 transition-colors">
                        <td className="px-4 py-3 text-center text-slate-500 font-mono text-[11px] font-bold border-r border-gray-200">{globalIdx}</td>
                        <td className="px-5 py-3 font-bold text-slate-900 border-r border-gray-200">{st.prenom} {st.nom}</td>

                        {/* Note CC Input */}
                        <td className="px-5 py-3 text-center border-r border-gray-200">
                          <input
                            type="number"
                            step="0.25"
                            min="0"
                            max="20"
                            placeholder=""
                            value={grade.cc}
                            onChange={(e) => handleGradeChange(st.id, matiereId, 'cc', e.target.value)}
                            className={`w-20 h-8 text-center rounded-[6px] font-mono font-bold text-xs outline-none transition-all ${
                              grade.cc !== '' && (Number(grade.cc) < 0 || Number(grade.cc) > 20)
                                ? 'bg-red-50 border-2 border-red-500 text-red-700'
                                : 'bg-white border border-gray-300 text-gray-900 focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]'
                            }`}
                          />
                        </td>

                        {/* Note Examen Input */}
                        <td className="px-5 py-3 text-center border-r border-gray-200">
                          <input
                            type="number"
                            step="0.25"
                            min="0"
                            max="20"
                            placeholder=""
                            value={grade.exam}
                            onChange={(e) => handleGradeChange(st.id, matiereId, 'exam', e.target.value)}
                            className={`w-20 h-8 text-center rounded-[6px] font-mono font-bold text-xs outline-none transition-all ${
                              grade.exam !== '' && (Number(grade.exam) < 0 || Number(grade.exam) > 20)
                                ? 'bg-red-50 border-2 border-red-500 text-red-700'
                                : 'bg-white border border-gray-300 text-gray-900 focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]'
                            }`}
                          />
                        </td>

                        {/* Note Finale */}
                        <td className="px-5 py-3 text-center font-mono font-bold border-r border-gray-200 bg-slate-50/50">
                          <span className={`text-sm px-2.5 py-0.5 rounded-[4px] font-extrabold ${isPassed ? 'text-[#0066FF]' : 'text-red-600'}`}>
                            {moy.toFixed(2)} / 20
                          </span>
                        </td>

                        {/* Observation Input */}
                        <td className="px-5 py-3 border-r border-gray-200">
                          <input
                            type="text"
                            placeholder={isPassed ? 'Validé' : 'Ajourné'}
                            value={grade.observation || ''}
                            onChange={(e) => handleObservationChange(st.id, matiereId, e.target.value)}
                            className="w-full h-8 px-2.5 bg-white border border-gray-300 rounded-[6px] text-xs font-medium text-gray-800 focus:border-[#0066FF] outline-none"
                          />
                        </td>

                        {/* Validation State Icon */}
                        <td className="px-5 py-3 text-center">
                          {err ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full border border-red-200">
                              <AlertTriangle className="w-3 h-3" />
                              Hors Bornes
                            </span>
                          ) : (
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              isPassed 
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                : 'bg-red-50 text-red-800 border-red-200'
                            }`}>
                              <CheckCircle2 className="w-3 h-3" />
                              {isPassed ? 'Validé' : 'Ajourné'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* BOTTOM SAVE BAR GLUED DIRECTLY TO BULLETIN / TABLE REGISTER */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-gray-300 flex flex-col sm:flex-row items-center justify-between gap-3 sticky bottom-0 z-20">
          <div className="flex items-center gap-2.5">
            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isSaved ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <div className="text-xs">
              {isSaved ? (
                <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" /> Toutes les notes saisies ont été enregistrées avec succès {lastSavedTime && `à ${lastSavedTime}`}
                </span>
              ) : (
                <span className="text-slate-600 font-medium text-[11px]">
                  Saisissez les notes ci-dessus puis cliquez sur <strong className="text-slate-900">Enregistrer Tout</strong> pour valider les notes.
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={handleSaveAllGrades}
              className="w-full sm:w-auto h-[36px] px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-[10px] text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Enregistrer Tout</span>
            </button>
          </div>
        </div>
      </div>

      {/* IMPORT EXCEL / CSV MODAL */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Importer des Notes au Format CSV"
      >
        <div className="space-y-4 text-xs">
          <p className="text-gray-500">
            Copiez-collez les données de votre fichier au format CSV (séparées par des points-virgules).
            Format : <code>Matricule;Nom;Note_CC;Note_Examen;Observation</code>.
          </p>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Données CSV à importer :</label>
            <textarea
              rows={8}
              value={rawCsvText}
              onChange={(e) => setRawCsvText(e.target.value)}
              placeholder="2024-USTTB-001;Diallo Mamadou;14;15;Bien&#10;2024-USTTB-002;Coulibaly Fatoumata;11;12;Passable"
              className="w-full p-3 font-mono text-xs border border-[#E5E7EB] rounded-[14px] bg-[#F9FAFB] focus:bg-white outline-none"
            />
          </div>

          {importStatus && (
            <div className={`p-3 rounded-[12px] text-xs font-bold ${
              importStatus.includes('erreur') ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
            }`}>
              {importStatus}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t">
            <button
              type="button"
              onClick={() => setIsImportModalOpen(false)}
              className="px-4 py-2 border border-[#E5E7EB] rounded-[10px] text-gray-600 font-semibold"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleProcessImportCsv}
              className="px-5 py-2 bg-[#0066FF] hover:bg-blue-700 text-white font-bold rounded-[10px]"
            >
              Traiter et Appliquer
            </button>
          </div>
        </div>
      </Modal>

      {/* PRINT PROCÈS-VERBAL (PV) MODAL */}
      <Modal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="Procès-Verbal Officiel de Notes (PV)"
      >
        <div className="space-y-6 text-xs p-4 bg-white">
          <div className="text-center border-b pb-4 space-y-1">
            <h3 className="font-bold text-sm uppercase text-[#1A1A1A]">Université - Secrétariat Général / Scolarité</h3>
            <p className="text-[10px] text-gray-500">Procès-Verbal des Notes d'Examen</p>
            <h4 className="font-bold text-[#0066FF] text-base mt-2 uppercase">
              PV Collectif - {currentSemestre?.libelle}
            </h4>
            <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-gray-600 pt-2 font-medium">
              <span>Filière: <strong>{currentFiliere?.nom}</strong></span> | 
              <span>Année: <strong>{currentAnnee.code}</strong></span>
            </div>
          </div>

          {/* Table PV */}
          <div className="border border-gray-200 rounded-[12px] overflow-hidden">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-gray-100 font-bold border-b">
                <tr>
                  <th className="p-2 border-r">N°</th>
                  <th className="p-2 border-r">Matricule</th>
                  <th className="p-2 border-r">Nom Completo</th>
                  <th className="p-2 border-r text-center">Moyenne Générale</th>
                  <th className="p-2 text-center">Décision Finale</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filiereStudents.map((st, i) => {
                  let sum = 0;
                  let coeffs = 0;

                  semesterMatieres.forEach(m => {
                    const g = getStudentGrade(st.id, m.id);
                    const ccVal = g.cc === '' || g.cc === undefined || g.cc === null ? 0 : Number(g.cc);
                    const examVal = g.exam === '' || g.exam === undefined || g.exam === null ? 0 : Number(g.exam);
                    const moy = ((ccVal * 0.4) + (examVal * 0.6));
                    const c = m.credits || 3;
                    sum += moy * c;
                    coeffs += c;
                  });

                  const genMoy = coeffs > 0 ? (sum / coeffs).toFixed(2) : '0.00';
                  const isP = parseFloat(genMoy) >= 10;

                  return (
                    <tr key={st.id}>
                      <td className="p-2 border-r text-center">{i + 1}</td>
                      <td className="p-2 border-r font-mono">{st.matricule}</td>
                      <td className="p-2 border-r font-semibold">{st.prenom} {st.nom}</td>
                      <td className="p-2 border-r text-center font-mono font-bold">{genMoy} / 20</td>
                      <td className="p-2 text-center font-bold">
                        <span className={isP ? 'text-emerald-700' : 'text-red-600'}>
                          {isP ? 'Admis' : 'Ajourné'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-8 border-t text-center text-[11px]">
            <div>
              <p className="font-bold text-gray-700">Le Responsable Pédagogique</p>
              <p className="text-gray-400 mt-12">Signature & Date</p>
            </div>
            <div>
              <p className="font-bold text-gray-700">Le Doyen / Directeur</p>
              <p className="text-gray-400 mt-12">Cachet & Signature</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => setIsPrintModalOpen(false)}
              className="px-4 py-2 border border-[#E5E7EB] rounded-[10px] font-semibold"
            >
              Fermer
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-5 py-2 bg-[#0066FF] hover:bg-blue-700 text-white font-bold rounded-[10px] flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Imprimer PV Officiel
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};
