import React, { useState } from 'react';
import { DB } from '../lib/storage';
import { Bulletin } from '../types/database';
import { Modal } from '../components/Modal';
import { FileCheck2, Download, Eye, Edit3, Save, AlertTriangle, Trash2, Users, Search, Award, RefreshCw } from 'lucide-react';
import { StudentSearchSelect } from '../components/StudentSearchSelect';
import { ExcelBulletinView } from '../components/ExcelBulletinView';

export const BulletinsView: React.FC = () => {
  const [bulletinsList, setBulletinsList] = useState<Bulletin[]>(() => {
    try {
      return DB.getBulletins() || [];
    } catch {
      return [];
    }
  });

  const etudiants = DB.getEtudiants() || [];
  const semestres = DB.getSemestres() || [];
  const classes = DB.getClasses() || [];
  const matieres = DB.getMatieres() || [];
  const notes = DB.getNotes() || [];
  const filieres = DB.getFilieres() || [];
  const activeAnnee = DB.getActiveAnneeAcademique();
  const universites = DB.getUniversites() || [];
  const universite = universites[0];

  // View Mode: 'BY_STUDENT' (dossiers par étudiant) or 'TABLE' (liste globale)
  const [viewMode, setViewMode] = useState<'BY_STUDENT' | 'TABLE'>('BY_STUDENT');
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [selectedFiliereId, setSelectedFiliereId] = useState<number | 'ALL'>('ALL');
  const [selectedClasseId, setSelectedClasseId] = useState<number | 'ALL'>('ALL');
  const [selectedStudentId, setSelectedStudentId] = useState<number>(() => etudiants[0]?.id || 1);
  const [selectedSemestreId, setSelectedSemestreId] = useState<number>(() => semestres[0]?.id || 1);
  
  const [viewingBulletin, setViewingBulletin] = useState<Bulletin | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Bulletin Editing Modal state (Requirement 8)
  const [editingBulletin, setEditingBulletin] = useState<Bulletin | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Form State for Editing Bulletin
  const [editFormData, setEditFormData] = useState({
    moyenne: 12,
    total_credits: 30,
    decision: 'Admis',
    mention: 'Assez Bien',
    remarques_jury: '',
  });

  // Local state for editing subject marks within the bulletin
  const [editSubjectNotes, setEditSubjectNotes] = useState<{
    matiere_id: number;
    code: string;
    nom: string;
    credits: number;
    note_cc: number;
    note_examen: number;
    note_finale: number;
  }[]>([]);

  // Filter students by selected filiere, classe and search
  const filteredEtudiants = etudiants.filter(e => {
    const cls = classes.find(c => Number(c.id) === Number(e.classe_id));
    const matchFiliere = selectedFiliereId === 'ALL' || Number(cls?.filiere_id) === Number(selectedFiliereId);
    const matchClasse = selectedClasseId === 'ALL' || Number(e.classe_id) === Number(selectedClasseId);
    const fullName = `${e.prenom || ''} ${e.nom || ''} ${e.matricule || ''}`.toLowerCase();
    const matchSearch = !studentSearchTerm.trim() || fullName.includes(studentSearchTerm.toLowerCase().trim());
    return matchFiliere && matchClasse && matchSearch;
  });

  const handleFiliereChange = (filiereId: number | 'ALL') => {
    setSelectedFiliereId(filiereId);
    setSelectedClasseId('ALL');
    const newFiltered = filiereId === 'ALL'
      ? etudiants
      : etudiants.filter(e => {
          const cls = classes.find(c => Number(c.id) === Number(e.classe_id));
          return Number(cls?.filiere_id) === Number(filiereId);
        });
    if (newFiltered.length > 0 && !newFiltered.some(e => Number(e.id) === Number(selectedStudentId))) {
      setSelectedStudentId(newFiltered[0].id);
    }
  };

  // Generate or recalculate Bulletin for selected student and semester
  const handleGenerateBulletin = (targetStudentId?: number, targetSemestreId?: number) => {
    const sId = targetStudentId || selectedStudentId;
    const semId = targetSemestreId || selectedSemestreId;
    const student = etudiants.find(e => Number(e.id) === Number(sId));
    if (!student) return;

    const newBulletin = DB.generateStudentBulletin(student.id, semId, activeAnnee?.id);
    if (newBulletin) {
      setBulletinsList(DB.getBulletins() || []);
      setViewingBulletin(newBulletin);
      setIsDetailOpen(true);
    }
  };

  // Batch generate bulletins for all students
  const handleGenerateAllBulletins = () => {
    DB.generateBulletinsForAllStudents(
      selectedSemestreId ? Number(selectedSemestreId) : undefined,
      activeAnnee?.id
    );
    setBulletinsList(DB.getBulletins() || []);
  };

  // Open Edit Bulletin Modal (Requirement 8)
  const handleOpenEditModal = (bulletin: Bulletin) => {
    setEditingBulletin(bulletin);
    const moyNum = Number(bulletin.moyenne_generale ?? bulletin.moyenne ?? 10);
    const credsNum = Number(bulletin.total_credits_valides ?? bulletin.total_credits ?? 30);
    setEditFormData({
      moyenne: !isNaN(moyNum) ? moyNum : 10,
      total_credits: !isNaN(credsNum) ? credsNum : 30,
      decision: bulletin.decision || 'Admis',
      mention: bulletin.mention || 'Passable',
      remarques_jury: bulletin.remarques_jury || ''
    });

    // Prepare subject notes list for editing
    const student = etudiants.find(e => Number(e.id) === Number(bulletin.etudiant_id));
    const studentClass = classes.find(c => Number(c.id) === Number(student?.classe_id));
    const studentFiliereId = (student as any)?.filiere_id || studentClass?.filiere_id || 1;
    const semesterMatieres = matieres.filter(m => Number(m.semestre_id) === Number(bulletin.semestre_id) && (!m.filiere_id || Number(m.filiere_id) === Number(studentFiliereId)));
    const resolvedMatieres = semesterMatieres.length > 0 ? semesterMatieres : matieres.filter(m => Number(m.semestre_id) === Number(bulletin.semestre_id));
    const studentNotes = (DB.getNotes() || []).filter(n => Number(n.etudiant_id) === Number(bulletin.etudiant_id) && Number(n.semestre_id) === Number(bulletin.semestre_id));

    const editableSubjects = resolvedMatieres.map(mat => {
      const noteObj = studentNotes.find(n => Number(n.matiere_id) === Number(mat.id));
      const cc = noteObj && noteObj.note_cc !== undefined && noteObj.note_cc !== null ? Number(noteObj.note_cc) : 12;
      const exam = noteObj && noteObj.note_examen !== undefined && noteObj.note_examen !== null ? Number(noteObj.note_examen) : 12;
      const finale = noteObj && noteObj.note_finale !== undefined && noteObj.note_finale !== null 
        ? Number(noteObj.note_finale) 
        : Math.round((cc * 0.4 + exam * 0.6) * 100) / 100;

      return {
        matiere_id: mat.id,
        code: mat.code || `MAT-${mat.id}`,
        nom: mat.nom || `Matière ${mat.id}`,
        credits: Number(mat.credits) || 3,
        note_cc: cc,
        note_examen: exam,
        note_finale: finale
      };
    });

    setEditSubjectNotes(editableSubjects);
    setIsEditModalOpen(true);
  };

  // Recalculate average automatically when subject marks change
  const handleSubjectNoteChange = (index: number, field: 'note_cc' | 'note_examen', val: number) => {
    const updated = [...editSubjectNotes];
    if (!updated[index]) return;
    const item = { ...updated[index] };
    const numVal = isNaN(val) ? 0 : val;

    if (field === 'note_cc') item.note_cc = Math.max(0, Math.min(20, numVal));
    if (field === 'note_examen') item.note_examen = Math.max(0, Math.min(20, numVal));

    item.note_finale = Math.round((item.note_cc * 0.4 + item.note_examen * 0.6) * 100) / 100;
    updated[index] = item;
    setEditSubjectNotes(updated);

    // Auto recalculate overall average & credits
    let pts = 0;
    let creds = 0;
    let valides = 0;
    updated.forEach(s => {
      pts += s.note_finale * s.credits;
      creds += s.credits;
      if (s.note_finale >= 10) valides += s.credits;
    });

    const newAvg = creds > 0 ? parseFloat((pts / creds).toFixed(2)) : 10;
    let newDec = newAvg >= 10 ? 'Admis' : 'Ajourné';
    let newMen = newAvg >= 16 ? 'Très Bien' : newAvg >= 14 ? 'Bien' : newAvg >= 12 ? 'Assez Bien' : 'Passable';

    setEditFormData(prev => ({
      ...prev,
      moyenne: newAvg,
      total_credits: valides,
      decision: newDec,
      mention: newAvg < 10 ? 'Sans Mention' : newMen
    }));
  };

  // Save modified bulletin and subject notes into DB
  const handleSaveEditedBulletin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBulletin) return;

    // 1. Save all updated subject notes into DB
    editSubjectNotes.forEach(item => {
      const existingNote = (DB.getNotes() || []).find(
        n => Number(n.etudiant_id) === Number(editingBulletin.etudiant_id) && 
             Number(n.matiere_id) === Number(item.matiere_id) && 
             Number(n.semestre_id) === Number(editingBulletin.semestre_id)
      );

      DB.saveNote({
        ...(existingNote ? { id: existingNote.id } : {}),
        etudiant_id: editingBulletin.etudiant_id,
        matiere_id: item.matiere_id,
        semestre_id: editingBulletin.semestre_id,
        annee_academique_id: editingBulletin.annee_academique_id || activeAnnee?.id || 1,
        note_cc: item.note_cc,
        note_examen: item.note_examen,
        note_finale: item.note_finale,
        appreciation: item.note_finale >= 10 ? 'Matière Validée' : 'Ajournée'
      });
    });

    // 2. Save updated Bulletin record
    const updatedRecord = DB.saveBulletin({
      ...editingBulletin,
      moyenne: Number(editFormData.moyenne),
      moyenne_generale: Number(editFormData.moyenne),
      total_credits: Number(editFormData.total_credits),
      total_credits_valides: Number(editFormData.total_credits),
      decision: editFormData.decision,
      mention: editFormData.mention,
      remarques_jury: editFormData.remarques_jury,
      date_generation: new Date().toISOString().split('T')[0]
    });

    DB.logAccess('MODIFICATION', `Bulletin de l'étudiant #${editingBulletin.etudiant_id} modifié par l'administration (Moyenne: ${editFormData.moyenne}, Décision: ${editFormData.decision})`);

    setBulletinsList(DB.getBulletins() || []);
    setViewingBulletin(updatedRecord);
    setIsEditModalOpen(false);
  };

  const handleDeleteBulletin = (id: number) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce bulletin ? Cette action est irréversible.")) {
      DB.deleteBulletin(id);
      setBulletinsList(DB.getBulletins() || []);
      if (viewingBulletin && viewingBulletin.id === id) {
        setViewingBulletin(null);
        setIsDetailOpen(false);
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1A1A1A]">Bulletins & Relevés de Notes des Étudiants</h2>
          <p className="text-xs text-gray-500 mt-1">
            Gestion individuelle et semestrielle des bulletins pour chaque étudiant inscrit ({etudiants.length} étudiants, {bulletinsList.length} bulletins émis).
          </p>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleGenerateAllBulletins}
            className="h-[40px] px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[12px] text-xs font-bold flex items-center gap-2 transition-colors shadow-xs"
            title="Générer les bulletins pour tous les étudiants inscrits"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Générer pour TOUS les Étudiants</span>
          </button>
        </div>
      </div>

      {/* Mode Switcher & Filter Bar */}
      <div className="bg-white p-4 rounded-[16px] border border-gray-200 shadow-xs space-y-4">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-100 pb-3">
          {/* Tabs */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('BY_STUDENT')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                viewMode === 'BY_STUDENT'
                  ? 'bg-white text-[#0066FF] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Dossiers par Étudiant ({filteredEtudiants.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('TABLE')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                viewMode === 'TABLE'
                  ? 'bg-white text-[#0066FF] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Tableau Général des Bulletins ({bulletinsList.length})</span>
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={studentSearchTerm}
              onChange={(e) => setStudentSearchTerm(e.target.value)}
              placeholder="Rechercher étudiant, matricule..."
              className="w-full h-[38px] pl-9 pr-3 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#0066FF] focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-gray-600 mb-1">Filière</label>
            <select
              value={selectedFiliereId}
              onChange={(e) => handleFiliereChange(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              className="w-full h-[38px] bg-white border border-gray-200 rounded-lg px-3 text-xs font-semibold focus:outline-none focus:border-[#0066FF]"
            >
              <option value="ALL">Toutes les filières ({filieres.length})</option>
              {filieres.map(f => (
                <option key={f.id} value={f.id}>{f.nom} ({f.code})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-600 mb-1">Classe</label>
            <select
              value={selectedClasseId}
              onChange={(e) => setSelectedClasseId(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              className="w-full h-[38px] bg-white border border-gray-200 rounded-lg px-3 text-xs font-semibold focus:outline-none focus:border-[#0066FF]"
            >
              <option value="ALL">Toutes les classes</option>
              {classes
                .filter(c => selectedFiliereId === 'ALL' || Number(c.filiere_id) === Number(selectedFiliereId))
                .map(c => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-600 mb-1">Semestre de référence</label>
            <select
              value={selectedSemestreId}
              onChange={(e) => setSelectedSemestreId(Number(e.target.value))}
              className="w-full h-[38px] bg-white border border-gray-200 rounded-lg px-3 text-xs font-semibold focus:outline-none focus:border-[#0066FF]"
            >
              {semestres.map(s => (
                <option key={s.id} value={s.id}>{s.libelle}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => handleGenerateBulletin()}
              className="w-full h-[38px] px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <FileCheck2 className="w-4 h-4 text-blue-400" />
              <span>Générer Saisie Directe</span>
            </button>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: BY STUDENT (Dossiers individuels par étudiant) */}
      {viewMode === 'BY_STUDENT' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEtudiants.length === 0 ? (
              <div className="col-span-full p-12 bg-white rounded-2xl border border-gray-200 text-center text-gray-500">
                Aucun étudiant ne correspond aux critères de recherche.
              </div>
            ) : (
              filteredEtudiants.map(student => {
                const studentClass = classes.find(c => Number(c.id) === Number(student.classe_id));
                const studentFiliere = filieres.find(f => Number(f.id) === Number(studentClass?.filiere_id || (student as any)?.filiere_id));
                const studentBulletins = bulletinsList.filter(b => Number(b.etudiant_id) === Number(student.id));

                return (
                  <div
                    key={student.id}
                    className="bg-white rounded-2xl border border-gray-200 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between gap-4"
                  >
                    {/* Student Info Card Top */}
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-200 text-[#0066FF] font-bold flex items-center justify-center text-sm shrink-0">
                            {(student.prenom?.[0] || 'E')}{(student.nom?.[0] || '')}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-gray-900 leading-tight">
                              {student.prenom} {student.nom}
                            </h4>
                            <p className="text-[11px] font-mono text-[#0066FF] font-bold mt-0.5">
                              {student.matricule}
                            </p>
                          </div>
                        </div>

                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-[10px] font-bold rounded-md">
                          {studentClass?.nom || 'Classe non assignée'}
                        </span>
                      </div>

                      <div className="mt-2 text-[11px] text-gray-500 flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="truncate">{studentFiliere?.nom || 'Filière Universitaire'}</span>
                      </div>
                    </div>

                    {/* Bulletins Per Semester for This Student */}
                    <div className="space-y-2 bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                      <div className="text-[11px] font-bold text-gray-700 flex items-center justify-between mb-1">
                        <span>Bulletins Semestriels</span>
                        <span className="text-[10px] text-gray-400 font-normal">
                          {studentBulletins.length} / {semestres.length} émis
                        </span>
                      </div>

                      {semestres.map(sem => {
                        const b = studentBulletins.find(sb => Number(sb.semestre_id) === Number(sem.id));
                        const moy = Number(b?.moyenne_generale ?? b?.moyenne ?? 0);
                        const isAdmis = b && (b.decision === 'Admis' || moy >= 10);

                        return (
                          <div
                            key={sem.id}
                            className="bg-white p-2.5 rounded-lg border border-gray-200/70 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs text-gray-900">{sem.libelle}</span>
                                {b && (
                                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                                    isAdmis ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'
                                  }`}>
                                    {b.decision || (moy >= 10 ? 'Admis' : 'Ajourné')}
                                  </span>
                                )}
                              </div>
                              {b ? (
                                <p className="text-[11px] font-mono text-gray-600 mt-0.5">
                                  Moyenne: <span className="font-bold text-[#0066FF]">{moy.toFixed(2)}/20</span> • {b.total_credits_valides ?? b.total_credits ?? 30} ECTS
                                </p>
                              ) : (
                                <p className="text-[10px] text-gray-400 italic">Bulletin non généré</p>
                              )}
                            </div>

                            {/* Actions per semester bulletin */}
                            <div className="flex items-center gap-1 shrink-0">
                              {b ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => { setViewingBulletin(b); setIsDetailOpen(true); }}
                                    title="Consulter le bulletin"
                                    className="p-1.5 bg-blue-50 hover:bg-blue-100 text-[#0066FF] rounded-md transition-colors cursor-pointer"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditModal(b)}
                                    title="Modifier le bulletin"
                                    className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-md transition-colors cursor-pointer"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => { setViewingBulletin(b); setIsDetailOpen(true); }}
                                    title="Télécharger PDF"
                                    className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-md transition-colors cursor-pointer"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteBulletin(b.id)}
                                    title="Supprimer"
                                    className="p-1.5 bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded-md transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleGenerateBulletin(student.id, sem.id)}
                                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold rounded-md flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  <FileCheck2 className="w-3 h-3" />
                                  <span>Générer</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* VIEW MODE 2: TABLE GÉNÉRALE */}
      {viewMode === 'TABLE' && (
        <div className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-xs overflow-hidden">
          <div className="p-5 border-b border-gray-100 font-bold text-sm text-[#1A1A1A] flex items-center justify-between">
            <span>Bulletins Émis ({bulletinsList.length})</span>
            <span className="text-xs text-gray-400 font-normal">Saisie, modification & suppression directe</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  <th className="px-6 py-4">Matricule</th>
                  <th className="px-6 py-4">Étudiant</th>
                  <th className="px-6 py-4">Semestre</th>
                  <th className="px-6 py-4 text-center">Moyenne Général</th>
                  <th className="px-6 py-4 text-center">Crédits Validés</th>
                  <th className="px-6 py-4">Décision Conseil</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-gray-100">
                {bulletinsList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                      Aucun bulletin généré pour le moment. Cliquez sur « Générer pour TOUS les Étudiants » ci-dessus.
                    </td>
                  </tr>
                ) : (
                  bulletinsList.map((b) => {
                    const st = etudiants.find(e => Number(e.id) === Number(b.etudiant_id));
                    const sem = semestres.find(s => Number(s.id) === Number(b.semestre_id));
                    const moyVal = Number(b.moyenne_generale ?? b.moyenne ?? 0);
                    const credsVal = Number(b.total_credits_valides ?? b.total_credits ?? 0);
                    const displayMoy = !isNaN(moyVal) ? moyVal.toFixed(2) : '0.00';
                    const displayCreds = !isNaN(credsVal) ? credsVal : 0;

                    return (
                      <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-[#0066FF]">{st?.matricule || 'N/A'}</td>
                        <td className="px-6 py-4 font-semibold text-[#1A1A1A]">
                          {st ? `${st.prenom || ''} ${st.nom || ''}`.trim() : `Étudiant #${b.etudiant_id}`}
                        </td>
                        <td className="px-6 py-4 text-gray-600 font-medium">{sem?.libelle || `Semestre #${b.semestre_id}`}</td>
                        <td className="px-6 py-4 text-center font-bold text-[#0066FF] font-mono text-sm">
                          {displayMoy} / 20
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-emerald-600 font-mono">
                          {displayCreds} / 30 ECTS
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            b.decision === 'Admis' || b.decision === 'Passage sous réserve' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                          }`}>
                            {b.decision || 'Admis'} ({b.mention || 'Passable'})
                          </span>
                          {b.remarques_jury && (
                            <span className="block text-[10px] text-gray-400 italic mt-0.5 max-w-[180px] truncate">
                              {b.remarques_jury}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                          <button type="button"
                            onClick={() => handleOpenEditModal(b)}
                            title="Modifier directement le bulletin"
                            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-[10px] text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Modifier</span>
                          </button>

                          <button type="button"
                            onClick={() => { setViewingBulletin(b); setIsDetailOpen(true); }}
                            title="Télécharger / Exporter le bulletin en PDF"
                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-[10px] text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Exporter en PDF</span>
                          </button>

                          <button type="button"
                            onClick={() => { setViewingBulletin(b); setIsDetailOpen(true); }}
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#0066FF] rounded-[10px] text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Consulter</span>
                          </button>

                          <button type="button"
                            onClick={() => handleDeleteBulletin(b.id)}
                            title="Supprimer ce bulletin"
                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 rounded-[10px] text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Supprimer</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL MODIFICATION DU BULLETIN (Requirement 8) */}
      {editingBulletin && isEditModalOpen && (() => {
        const student = etudiants.find(e => Number(e.id) === Number(editingBulletin.etudiant_id));
        const semester = semestres.find(s => Number(s.id) === Number(editingBulletin.semestre_id));

        return (
          <Modal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            title={`Modifier le Bulletin : ${student?.prenom || ''} ${student?.nom || ''} (${semester?.libelle || ''})`}
            maxWidth="max-w-3xl"
          >
            <form onSubmit={handleSaveEditedBulletin} className="space-y-5 text-xs">
              
              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Modifications Administrateur : Vous pouvez ajuster les notes individuellement ou outrepasser directement la moyenne et la décision du jury.
                </span>
              </div>

              {/* Subject Marks Editor Table */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                  1. Modification des Notes de Matières (Réajustement automatique)
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-[10px] font-bold text-slate-600 uppercase">
                        <th className="px-3 py-2">Code UE</th>
                        <th className="px-3 py-2">Matière</th>
                        <th className="px-3 py-2 text-center">Note CC (/20)</th>
                        <th className="px-3 py-2 text-center">Note Exam (/20)</th>
                        <th className="px-3 py-2 text-center">Note Finale</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {editSubjectNotes.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2 font-mono font-bold text-blue-600">{item.code}</td>
                          <td className="px-3 py-2 font-semibold text-slate-900">{item.nom}</td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="number"
                              step="0.25"
                              min="0"
                              max="20"
                              value={item.note_cc}
                              onChange={(e) => handleSubjectNoteChange(idx, 'note_cc', parseFloat(e.target.value) || 0)}
                              className="w-16 h-8 text-center bg-slate-50 border border-slate-300 rounded font-mono font-bold"
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="number"
                              step="0.25"
                              min="0"
                              max="20"
                              value={item.note_examen}
                              onChange={(e) => handleSubjectNoteChange(idx, 'note_examen', parseFloat(e.target.value) || 0)}
                              className="w-16 h-8 text-center bg-slate-50 border border-slate-300 rounded font-mono font-bold"
                            />
                          </td>
                          <td className="px-3 py-2 text-center font-mono font-extrabold text-slate-900">
                            {Number(item.note_finale || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Global Bulletin Decision & Override Settings */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                  2. Ajustement des Paramètres Globaux du Bulletin & Délibération
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Moyenne Générale (/20) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="20"
                      value={editFormData.moyenne}
                      onChange={(e) => setEditFormData({ ...editFormData, moyenne: parseFloat(e.target.value) || 0 })}
                      className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl font-mono font-bold text-blue-600"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Crédits Validés (ECTS) *</label>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      value={editFormData.total_credits}
                      onChange={(e) => setEditFormData({ ...editFormData, total_credits: parseInt(e.target.value) || 0 })}
                      className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl font-mono font-bold text-emerald-600"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Décision du Conseil / Jury *</label>
                    <select
                      value={editFormData.decision}
                      onChange={(e) => setEditFormData({ ...editFormData, decision: e.target.value })}
                      className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl font-bold text-slate-900"
                    >
                      <option value="Admis">Admis</option>
                      <option value="Ajourné">Ajourné</option>
                      <option value="Compensé">Compensé</option>
                      <option value="Passage sous réserve">Passage sous réserve</option>
                      <option value="Exclu">Exclu</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Mention Attribuée *</label>
                    <select
                      value={editFormData.mention}
                      onChange={(e) => setEditFormData({ ...editFormData, mention: e.target.value })}
                      className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl font-semibold text-slate-900"
                    >
                      <option value="Très Bien">Très Bien</option>
                      <option value="Bien">Bien</option>
                      <option value="Assez Bien">Assez Bien</option>
                      <option value="Passable">Passable</option>
                      <option value="Sans Mention">Sans Mention / Ajourné</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Remarques & Appréciations du Jury</label>
                    <input
                      type="text"
                      value={editFormData.remarques_jury}
                      onChange={(e) => setEditFormData({ ...editFormData, remarques_jury: e.target.value })}
                      placeholder="Ex : Passage sous réserve, Félicitations du Conseil..."
                      className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="h-10 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-2 shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>Enregistrer la Modification</span>
                </button>
              </div>

            </form>
          </Modal>
        );
      })()}

      {/* Modal Printable Official Transcript (Style Excel) */}
      {viewingBulletin && (() => {
        const st = etudiants.find(e => Number(e.id) === Number(viewingBulletin.etudiant_id)) || etudiants[0];
        const sem = semestres.find(s => Number(s.id) === Number(viewingBulletin.semestre_id)) || semestres[0];
        const cls = classes.find(c => Number(c.id) === Number(st?.classe_id));
        const fil = filieres.find(f => Number(f.id) === Number(cls?.filiere_id));
        const facultes = DB.getFacultes() || [];
        const fac = facultes.find(f => Number(f.id) === Number(fil?.faculte_id));

        return (
          <Modal
            isOpen={isDetailOpen}
            onClose={() => setIsDetailOpen(false)}
            title="Bulletin de Notes Universitaire (Style Excel)"
            maxWidth="max-w-4xl"
          >
            <ExcelBulletinView
              etudiant={st}
              semestre={sem}
              notes={DB.getNotes() || []}
              matieres={DB.getMatieres() || []}
              classe={cls}
              filiere={fil}
              faculte={fac}
              universite={universite}
              anneeAcademique={activeAnnee}
              onPrint={handlePrint}
            />
          </Modal>
        );
      })()}

    </div>
  );
};
