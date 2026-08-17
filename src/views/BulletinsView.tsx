import React, { useState, useEffect, useMemo } from 'react';
import { DB } from '../lib/storage';
import { Etudiant, Classe, Semestre, AnneeAcademique, Filiere, Note, Matiere, Bulletin, Universite } from '../types/database';
import { 
  Award, 
  Search, 
  Filter, 
  Printer, 
  Download, 
  RefreshCw, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Eye, 
  GraduationCap,
  Calculator,
  UserCheck
} from 'lucide-react';
import { Modal } from '../components/Modal';

export const BulletinsView: React.FC = () => {
  const [etudiants, setEtudiants] = useState<Etudiant[]>([]);
  const [classes, setClasses] = useState<Classe[]>([]);
  const [filieres, setFilieres] = useState<Filiere[]>([]);
  const [semestres, setSemestres] = useState<Semestre[]>([]);
  const [annees, setAnnees] = useState<AnneeAcademique[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [matieres, setMatieres] = useState<Matiere[]>([]);
  const [bulletins, setBulletins] = useState<Bulletin[]>([]);
  const [universite, setUniversite] = useState<Universite | null>(null);

  // Filters
  const [selectedAnneeId, setSelectedAnneeId] = useState<number>(1);
  const [selectedFiliereId, setSelectedFiliereId] = useState<string>('ALL');
  const [selectedClasseId, setSelectedClasseId] = useState<string>('ALL');
  const [selectedSemestreId, setSelectedSemestreId] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected bulletin for detailed modal view
  const [viewStudent, setViewStudent] = useState<Etudiant | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const loadData = () => {
    const univs = DB.getUniversites();
    setUniversite(univs[0] || null);
    setEtudiants(DB.getEtudiants());
    setClasses(DB.getClasses());
    setFilieres(DB.getFilieres());
    setSemestres(DB.getSemestres());
    const allAnnees = DB.getAnneesAcademiques();
    setAnnees(allAnnees);
    const active = allAnnees.find(a => a.est_active) || allAnnees[0];
    if (active) setSelectedAnneeId(active.id);
    setNotes(DB.getNotes());
    setMatieres(DB.getMatieres());
    setBulletins(DB.getBulletins());
  };

  useEffect(() => {
    loadData();
    const handleSync = () => loadData();
    window.addEventListener('unigestion_db_change', handleSync);
    return () => window.removeEventListener('unigestion_db_change', handleSync);
  }, []);

  // Filtered classes based on selected filiere
  const filteredClasses = useMemo(() => {
    if (selectedFiliereId === 'ALL') return classes;
    return classes.filter(c => Number(c.filiere_id) === Number(selectedFiliereId));
  }, [classes, selectedFiliereId]);

  // Recalculate bulletins for all or current selection
  const handleRecalculateAll = () => {
    const result = DB.generateBulletinsForAllStudents(selectedSemestreId, selectedAnneeId);
    setBulletins(DB.getBulletins());
    alert(`Recalcul terminé : ${result.total} bulletin(s) recalculé(s) selon les notes réelles.`);
  };

  // Compute calculated bulletin rows for current filter
  const studentRows = useMemo(() => {
    return etudiants
      .filter(etud => {
        const cls = classes.find(c => Number(c.id) === Number(etud.classe_id));
        const filiereId = (etud as any).filiere_id || cls?.filiere_id;
        
        if (selectedFiliereId !== 'ALL' && Number(filiereId) !== Number(selectedFiliereId)) return false;
        if (selectedClasseId !== 'ALL' && Number(etud.classe_id) !== Number(selectedClasseId)) return false;
        
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = `${etud.prenom} ${etud.nom}`.toLowerCase().includes(q);
          const matchMatricule = (etud.matricule || '').toLowerCase().includes(q);
          if (!matchName && !matchMatricule) return false;
        }
        return true;
      })
      .map(etud => {
        const cls = classes.find(c => Number(c.id) === Number(etud.classe_id));
        const filiere = filieres.find(f => Number(f.id) === Number((etud as any).filiere_id || cls?.filiere_id));
        
        // Subject list for this filiere & semester
        const semMatieres = matieres.filter(
          m => Number(m.semestre_id) === Number(selectedSemestreId) && (!m.filiere_id || Number(m.filiere_id) === Number(filiere?.id))
        );
        const resolvedMatieres = semMatieres.length > 0 ? semMatieres : matieres.filter(m => Number(m.semestre_id) === Number(selectedSemestreId));
        const applicableIds = new Set(resolvedMatieres.map(m => Number(m.id)));

        // Student notes
        const stNotes = notes.filter(
          n => Number(n.etudiant_id) === Number(etud.id) &&
               Number(n.semestre_id) === Number(selectedSemestreId) &&
               Number(n.annee_academique_id || selectedAnneeId) === Number(selectedAnneeId) &&
               applicableIds.has(Number(n.matiere_id))
        );

        // Real calculations
        let totalPoints = 0;
        let totalCreditsEvalues = 0;
        let totalCreditsValides = 0;
        const totalCreditsInscrits = resolvedMatieres.reduce((s, m) => s + (Number(m.credits) || 3), 0) || 18;

        stNotes.forEach(n => {
          const mat = resolvedMatieres.find(m => Number(m.id) === Number(n.matiere_id));
          const cr = Number(mat?.credits) || 3;
          const fin = Number(n.note_finale) || 0;
          totalPoints += fin * cr;
          totalCreditsEvalues += cr;
          if (fin >= 10.0) totalCreditsValides += cr;
        });

        const hasEvaluations = totalCreditsEvalues > 0;
        const moyenne = hasEvaluations ? Number((totalPoints / totalCreditsEvalues).toFixed(2)) : 0;
        
        let decision: 'Admis' | 'Ajourné' | 'Compensé' | 'En attente' = 'En attente';
        let mention = 'N/A';

        if (hasEvaluations) {
          if (moyenne >= 10.0) decision = 'Admis';
          else if (moyenne >= 9.0) decision = 'Compensé';
          else decision = 'Ajourné';

          if (moyenne >= 16) mention = 'Très Bien';
          else if (moyenne >= 14) mention = 'Bien';
          else if (moyenne >= 12) mention = 'Assez Bien';
          else if (moyenne >= 10) mention = 'Passable';
        }

        const existingBulletin = bulletins.find(
          b => Number(b.etudiant_id) === Number(etud.id) &&
               Number(b.semestre_id) === Number(selectedSemestreId) &&
               Number(b.annee_academique_id) === Number(selectedAnneeId)
        );

        return {
          etudiant: etud,
          classe: cls,
          filiere,
          totalMatieres: resolvedMatieres.length,
          matieresEvaluees: stNotes.length,
          totalCreditsInscrits,
          totalCreditsValides,
          moyenne,
          hasEvaluations,
          decision,
          mention,
          rang: existingBulletin?.rang || '-',
          bulletinId: existingBulletin?.id
        };
      })
      .sort((a, b) => (b.moyenne || 0) - (a.moyenne || 0));
  }, [etudiants, classes, filieres, matieres, notes, bulletins, selectedFiliereId, selectedClasseId, selectedSemestreId, selectedAnneeId, searchQuery]);

  // Overall Promo Statistics
  const stats = useMemo(() => {
    const total = studentRows.length;
    const evalues = studentRows.filter(r => r.hasEvaluations).length;
    const admis = studentRows.filter(r => r.decision === 'Admis').length;
    const tauxReussite = evalues > 0 ? Number(((admis / evalues) * 100).toFixed(1)) : 0;
    const sumMoyennes = studentRows.filter(r => r.hasEvaluations).reduce((acc, r) => acc + r.moyenne, 0);
    const moyennePromo = evalues > 0 ? Number((sumMoyennes / evalues).toFixed(2)) : 0;

    return { total, evalues, admis, tauxReussite, moyennePromo };
  }, [studentRows]);

  // Handle Open Detail Modal
  const handleOpenDetail = (student: Etudiant) => {
    setViewStudent(student);
    setIsDetailModalOpen(true);
  };

  // Detailed Bulletin Data for Modal
  const detailData = useMemo(() => {
    if (!viewStudent) return null;
    const cls = classes.find(c => Number(c.id) === Number(viewStudent.classe_id));
    const filiere = filieres.find(f => Number(f.id) === Number((viewStudent as any).filiere_id || cls?.filiere_id));
    const sem = semestres.find(s => Number(s.id) === Number(selectedSemestreId));
    const annee = annees.find(a => Number(a.id) === Number(selectedAnneeId));

    const semMatieres = matieres.filter(
      m => Number(m.semestre_id) === Number(selectedSemestreId) && (!m.filiere_id || Number(m.filiere_id) === Number(filiere?.id))
    );
    const resolvedMatieres = semMatieres.length > 0 ? semMatieres : matieres.filter(m => Number(m.semestre_id) === Number(selectedSemestreId));

    const studentNotes = notes.filter(
      n => Number(n.etudiant_id) === Number(viewStudent.id) &&
           Number(n.semestre_id) === Number(selectedSemestreId) &&
           Number(n.annee_academique_id || selectedAnneeId) === Number(selectedAnneeId)
    );

    let totalPoints = 0;
    let totalCreditsEvalues = 0;
    let totalCreditsValides = 0;
    const totalCreditsInscrits = resolvedMatieres.reduce((s, m) => s + (Number(m.credits) || 3), 0);

    const lines = resolvedMatieres.map(mat => {
      const n = studentNotes.find(item => Number(item.matiere_id) === Number(mat.id));
      const credits = Number(mat.credits) || 3;
      if (n) {
        const cc = Number(n.note_cc) || 0;
        const exam = Number(n.note_examen) || 0;
        const finale = Number(n.note_finale) || Number(((cc * 0.4) + (exam * 0.6)).toFixed(2));
        const validee = finale >= 10.0;
        totalPoints += finale * credits;
        totalCreditsEvalues += credits;
        if (validee) totalCreditsValides += credits;

        return {
          matiere: mat,
          hasNote: true,
          note_cc: cc,
          note_examen: exam,
          note_finale: finale,
          credits,
          validee,
          appreciation: n.appreciation || (finale >= 16 ? 'Très Bien' : finale >= 14 ? 'Bien' : finale >= 12 ? 'Assez Bien' : finale >= 10 ? 'Passable' : 'Insuffisant')
        };
      } else {
        return {
          matiere: mat,
          hasNote: false,
          note_cc: null,
          note_examen: null,
          note_finale: null,
          credits,
          validee: false,
          appreciation: 'Non noté'
        };
      }
    });

    const hasEvaluations = totalCreditsEvalues > 0;
    const moyenne = hasEvaluations ? Number((totalPoints / totalCreditsEvalues).toFixed(2)) : 0;
    
    let decision: 'Admis' | 'Ajourné' | 'Compensé' | 'En attente' = 'En attente';
    let mention = 'N/A';

    if (hasEvaluations) {
      if (moyenne >= 10.0) decision = 'Admis';
      else if (moyenne >= 9.0) decision = 'Compensé';
      else decision = 'Ajourné';

      if (moyenne >= 16) mention = 'Très Bien';
      else if (moyenne >= 14) mention = 'Bien';
      else if (moyenne >= 12) mention = 'Assez Bien';
      else if (moyenne >= 10) mention = 'Passable';
    }

    const bRecord = bulletins.find(
      b => Number(b.etudiant_id) === Number(viewStudent.id) &&
           Number(b.semestre_id) === Number(selectedSemestreId) &&
           Number(b.annee_academique_id) === Number(selectedAnneeId)
    );

    return {
      etudiant: viewStudent,
      classe: cls,
      filiere,
      semestre: sem,
      annee: annee,
      lines,
      totalCreditsInscrits,
      totalCreditsValides,
      totalPoints,
      totalCreditsEvalues,
      moyenne,
      decision,
      mention,
      rang: bRecord?.rang || 1,
      dateGeneration: bRecord?.date_generation || new Date().toISOString().split('T')[0]
    };
  }, [viewStudent, classes, filieres, semestres, annees, matieres, notes, bulletins, selectedSemestreId, selectedAnneeId]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Bulletins & Délibérations LMD
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Calculs certifiés en temps réel basés strictement sur les notes CC (40%) et Examen (60%).
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRecalculateAll}
              className="inline-flex items-center px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Recalculer les moyennes
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors"
            >
              <Printer className="w-4 h-4 mr-2" />
              Imprimer les délibérations
            </button>
          </div>
        </div>

        {/* Global Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
          <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-lg border border-slate-100 dark:border-slate-800">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Effectif Sélectionné</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.total}</div>
          </div>
          <div className="bg-blue-50/50 dark:bg-blue-950/30 p-3.5 rounded-lg border border-blue-100/50 dark:border-blue-900/30">
            <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Étudiants Évalués</div>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">{stats.evalues} / {stats.total}</div>
          </div>
          <div className="bg-emerald-50/50 dark:bg-emerald-950/30 p-3.5 rounded-lg border border-emerald-100/50 dark:border-emerald-900/30">
            <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Taux d'Admission</div>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">{stats.tauxReussite}%</div>
          </div>
          <div className="bg-purple-50/50 dark:bg-purple-950/30 p-3.5 rounded-lg border border-purple-100/50 dark:border-purple-900/30">
            <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Moyenne de Promotion</div>
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-300 mt-1">{stats.moyennePromo} / 20</div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Année Académique */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Année Académique</label>
            <select
              value={selectedAnneeId}
              onChange={(e) => setSelectedAnneeId(Number(e.target.value))}
              className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              {annees.map(a => (
                <option key={a.id} value={a.id}>{a.libelle} {a.est_active ? '(Active)' : ''}</option>
              ))}
            </select>
          </div>

          {/* Semestre */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Semestre LMD</label>
            <select
              value={selectedSemestreId}
              onChange={(e) => setSelectedSemestreId(Number(e.target.value))}
              className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 font-medium"
            >
              {semestres.map(s => (
                <option key={s.id} value={s.id}>{s.libelle} ({s.code})</option>
              ))}
            </select>
          </div>

          {/* Filière */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Filière</label>
            <select
              value={selectedFiliereId}
              onChange={(e) => {
                setSelectedFiliereId(e.target.value);
                setSelectedClasseId('ALL');
              }}
              className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Toutes les filières</option>
              {filieres.map(f => (
                <option key={f.id} value={f.id}>{f.code} - {f.nom}</option>
              ))}
            </select>
          </div>

          {/* Classe */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Classe</label>
            <select
              value={selectedClasseId}
              onChange={(e) => setSelectedClasseId(e.target.value)}
              className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Toutes les classes</option>
              {filteredClasses.map(c => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
          </div>

          {/* Recherche */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Recherche</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Nom, matricule..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bulletins Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                <th className="py-3.5 px-4">Rang</th>
                <th className="py-3.5 px-4">Matricule</th>
                <th className="py-3.5 px-4">Étudiant</th>
                <th className="py-3.5 px-4">Classe & Filière</th>
                <th className="py-3.5 px-4 text-center">Évaluations</th>
                <th className="py-3.5 px-4 text-center">Crédits Validés</th>
                <th className="py-3.5 px-4 text-center">Moyenne / 20</th>
                <th className="py-3.5 px-4 text-center">Décision</th>
                <th className="py-3.5 px-4 text-center">Mention</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {studentRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-400">
                    <GraduationCap className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    Aucun étudiant trouvé pour ces critères de filtrage.
                  </td>
                </tr>
              ) : (
                studentRows.map((row, idx) => (
                  <tr 
                    key={row.etudiant.id} 
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">
                      {row.hasEvaluations ? (
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                          idx === 0 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300' :
                          idx === 1 ? 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200' :
                          idx === 2 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300' :
                          'text-slate-600 dark:text-slate-400'
                        }`}>
                          {idx + 1}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600 dark:text-slate-400">
                      {row.etudiant.matricule || '-'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {row.etudiant.prenom} {row.etudiant.nom}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {row.etudiant.email}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-800 dark:text-slate-200 text-xs font-medium">
                        {row.classe?.nom || 'Classe non assignée'}
                      </div>
                      <div className="text-xs text-slate-500">
                        {row.filiere?.code ? `Filière ${row.filiere.code}` : ''}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        row.matieresEvaluees === row.totalMatieres && row.totalMatieres > 0
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : row.matieresEvaluees > 0
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {row.matieresEvaluees} / {row.totalMatieres} matières
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-slate-800 dark:text-slate-200">
                      {row.totalCreditsValides} / {row.totalCreditsInscrits}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {row.hasEvaluations ? (
                        <span className={`text-base font-bold ${
                          row.moyenne >= 14 ? 'text-emerald-600 dark:text-emerald-400' :
                          row.moyenne >= 10 ? 'text-blue-600 dark:text-blue-400' :
                          row.moyenne >= 9 ? 'text-amber-600 dark:text-amber-400' :
                          'text-red-600 dark:text-red-400'
                        }`}>
                          {row.moyenne.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-xs italic text-slate-400">Non noté</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        row.decision === 'Admis' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' :
                        row.decision === 'Compensé' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' :
                        row.decision === 'Ajourné' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' :
                        'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {row.decision}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-xs font-medium text-slate-600 dark:text-slate-300">
                      {row.mention}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenDetail(row.etudiant)}
                        className="inline-flex items-center px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-medium transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Relevé officiel
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official Bulletin Detail Modal */}
      {isDetailModalOpen && detailData && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title="Bulletin de Notes Officiel (LMD)"
          maxWidth="max-w-4xl"
        >
          <div className="space-y-6 print:p-0">
            {/* University Header / Official Stamp */}
            <div className="border-b-2 border-slate-800 pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-black uppercase text-slate-900 tracking-wide">
                    {universite?.nom || 'UNIVERSITÉ DES SCIENCES ET TECHNOLOGIES'}
                  </h2>
                  <p className="text-xs text-slate-600 font-medium">
                    Excellence - Rigueur - Savoir
                  </p>
                  <p className="text-xs text-slate-500">
                    {universite?.adresse || 'Bamako, République du Mali'} | Tél : {universite?.telephone || '+223 20 00 00 00'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block border-2 border-blue-600 text-blue-700 px-3 py-1 text-xs font-black uppercase tracking-wider rounded">
                    Relevé de Notes Officiel
                  </span>
                  <div className="text-xs text-slate-500 mt-1">
                    Année : {detailData.annee?.libelle || '2025 - 2026'}
                  </div>
                </div>
              </div>
            </div>

            {/* Student & Promotion Summary Card */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block">Nom & Prénom :</span>
                <span className="font-bold text-slate-900 text-sm">{detailData.etudiant.prenom} {detailData.etudiant.nom}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Matricule :</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{detailData.etudiant.matricule || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Filière / Spécialité :</span>
                <span className="font-semibold text-slate-900">{detailData.filiere?.nom || 'Tronc Commun'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Semestre :</span>
                <span className="font-semibold text-blue-700">{detailData.semestre?.libelle} ({detailData.semestre?.code})</span>
              </div>
            </div>

            {/* Subject-by-Subject Grades Table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                    <th className="py-2.5 px-3">Code</th>
                    <th className="py-2.5 px-3">Unité d'Enseignement (Matière)</th>
                    <th className="py-2.5 px-2 text-center">Crédits</th>
                    <th className="py-2.5 px-2 text-center">Note CC (40%)</th>
                    <th className="py-2.5 px-2 text-center">Examen (60%)</th>
                    <th className="py-2.5 px-2 text-center">Note Finale</th>
                    <th className="py-2.5 px-2 text-center">Points (Note×Crédits)</th>
                    <th className="py-2.5 px-3 text-center">Validation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {detailData.lines.map(line => (
                    <tr key={line.matiere.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono font-medium text-slate-600">{line.matiere.code}</td>
                      <td className="py-2 px-3 font-medium text-slate-900">{line.matiere.nom}</td>
                      <td className="py-2 px-2 text-center font-bold text-slate-700">{line.credits}</td>
                      <td className="py-2 px-2 text-center font-mono">
                        {line.hasNote ? `${line.note_cc}/20` : <span className="text-slate-400 italic">-</span>}
                      </td>
                      <td className="py-2 px-2 text-center font-mono">
                        {line.hasNote ? `${line.note_examen}/20` : <span className="text-slate-400 italic">-</span>}
                      </td>
                      <td className="py-2 px-2 text-center font-mono font-bold">
                        {line.hasNote ? (
                          <span className={line.validee ? 'text-emerald-700' : 'text-red-600'}>
                            {line.note_finale?.toFixed(2)}/20
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">-</span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-center font-mono font-semibold text-slate-700">
                        {line.hasNote ? ((line.note_finale || 0) * line.credits).toFixed(2) : '-'}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {line.hasNote ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                            line.validee ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {line.validee ? 'Validé' : 'Ajourné'}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Non noté</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 font-bold border-t-2 border-slate-300 text-slate-900">
                    <td colSpan={2} className="py-2.5 px-3 uppercase">Total Semestre</td>
                    <td className="py-2.5 px-2 text-center">{detailData.totalCreditsInscrits}</td>
                    <td colSpan={3} className="py-2.5 px-2 text-right">Points Évalués :</td>
                    <td className="py-2.5 px-2 text-center font-mono">{detailData.totalPoints.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-center text-emerald-700">{detailData.totalCreditsValides} / {detailData.totalCreditsInscrits} ECTS</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Deliberation Final Results */}
            <div className="bg-blue-50/70 p-4 rounded-lg border border-blue-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <span className="text-xs text-slate-600 block">Moyenne Générale Pondérée</span>
                <span className="text-xl font-black text-blue-900">{detailData.moyenne.toFixed(2)} / 20</span>
              </div>
              <div>
                <span className="text-xs text-slate-600 block">Crédits Validés</span>
                <span className="text-xl font-bold text-slate-900">{detailData.totalCreditsValides} / {detailData.totalCreditsInscrits}</span>
              </div>
              <div>
                <span className="text-xs text-slate-600 block">Décision du Jury</span>
                <span className={`text-base font-black uppercase ${
                  detailData.decision === 'Admis' ? 'text-emerald-700' :
                  detailData.decision === 'Compensé' ? 'text-amber-700' :
                  detailData.decision === 'Ajourné' ? 'text-red-700' :
                  'text-slate-600'
                }`}>
                  {detailData.decision}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-600 block">Mention Attribuée</span>
                <span className="text-base font-bold text-purple-900">{detailData.mention}</span>
              </div>
            </div>

            {/* Official Signatures Box */}
            <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs text-center">
              <div>
                <p className="font-semibold text-slate-700">Le Responsable Pédagogique</p>
                <div className="h-14"></div>
                <p className="text-slate-500 italic">Signature & Cachet</p>
              </div>
              <div>
                <p className="font-semibold text-slate-700">Le Recteur / Directeur des Études</p>
                <div className="h-14"></div>
                <p className="text-slate-500 italic">Signature & Sceau Officiel</p>
              </div>
            </div>

            {/* Action Buttons in Modal */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors"
              >
                <Printer className="w-4 h-4 mr-2" />
                Imprimer ce bulletin
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
