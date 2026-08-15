import React, { useState } from 'react';
import { DB } from '../lib/storage';
import { Bulletin } from '../types/database';
import { Modal } from '../components/Modal';
import { FileCheck2, Download, Eye, Edit3, Save, AlertTriangle } from 'lucide-react';
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

  const [selectedFiliereId, setSelectedFiliereId] = useState<number | 'ALL'>('ALL');
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

  // Filter students by selected filiere dropdown
  const filteredEtudiants = selectedFiliereId === 'ALL'
    ? etudiants
    : etudiants.filter(e => {
        const cls = classes.find(c => Number(c.id) === Number(e.classe_id));
        return Number(cls?.filiere_id) === Number(selectedFiliereId);
      });

  const handleFiliereChange = (filiereId: number | 'ALL') => {
    setSelectedFiliereId(filiereId);
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
  const handleGenerateBulletin = () => {
    const student = etudiants.find(e => Number(e.id) === Number(selectedStudentId));
    if (!student) return;

    // Retrieve student's class and corresponding filiere from database relations
    const studentClass = classes.find(c => Number(c.id) === Number(student.classe_id));
    const studentFiliereId = (student as any)?.filiere_id || studentClass?.filiere_id || 1;

    // Filter subjects strictly belonging to the student's filiere and semester
    const applicableMatieres = matieres.filter(
      m => Number(m.semestre_id) === Number(selectedSemestreId) && (!m.filiere_id || Number(m.filiere_id) === Number(studentFiliereId))
    );
    const resolvedMatieres = applicableMatieres.length > 0
      ? applicableMatieres
      : matieres.filter(m => Number(m.semestre_id) === Number(selectedSemestreId));

    const applicableMatiereIds = new Set(resolvedMatieres.map(m => Number(m.id)));

    // Get student's notes for applicable subjects in this semester
    const studentNotes = notes.filter(
      n => Number(n.etudiant_id) === Number(student.id) &&
           Number(n.semestre_id) === Number(selectedSemestreId) &&
           applicableMatiereIds.has(Number(n.matiere_id))
    );

    let totalPoints = 0;
    let totalCredits = 0;
    let totalCreditsValides = 0;

    studentNotes.forEach(n => {
      const mat = resolvedMatieres.find(m => Number(m.id) === Number(n.matiere_id));
      const credits = Number(mat?.credits) || 3;
      const noteFin = Number(n.note_finale) || 0;

      totalPoints += noteFin * credits;
      totalCredits += credits;

      if (noteFin >= 10) {
        totalCreditsValides += credits;
      }
    });

    const moyenneGenerale = totalCredits > 0 ? parseFloat((totalPoints / totalCredits).toFixed(2)) : 0;

    let decision: string = totalCredits > 0 ? 'Admis' : 'Non noté';
    if (totalCredits > 0) {
      if (moyenneGenerale < 10) decision = 'Ajourné';
      else if (moyenneGenerale >= 10 && totalCreditsValides < 30) decision = 'Compensé';
    }

    let mention = 'En attente';
    if (totalCredits > 0) {
      if (moyenneGenerale >= 16) mention = 'Très Bien';
      else if (moyenneGenerale >= 14) mention = 'Bien';
      else if (moyenneGenerale >= 12) mention = 'Assez Bien';
      else if (moyenneGenerale >= 10) mention = 'Passable';
      else mention = 'Insuffisant';
    }

    // Dynamic rank calculation among class peers for this semester
    const classmates = etudiants.filter(e => Number(e.classe_id) === Number(student.classe_id));
    const allClassBulletins = (DB.getBulletins() || []).filter(
      b => Number(b.semestre_id) === Number(selectedSemestreId) &&
           classmates.some(c => Number(c.id) === Number(b.etudiant_id))
    );
    const allMoyennes = [
      ...allClassBulletins.filter(b => Number(b.etudiant_id) !== Number(student.id)).map(b => Number(b.moyenne_generale ?? b.moyenne ?? 0)),
      moyenneGenerale
    ].sort((a, b) => b - a);
    const calculatedRank = Math.max(1, allMoyennes.indexOf(moyenneGenerale) + 1);

    const newBulletin = DB.saveBulletin({
      etudiant_id: student.id,
      classe_id: student.classe_id,
      semestre_id: Number(selectedSemestreId),
      annee_academique_id: activeAnnee?.id || 1,
      moyenne: moyenneGenerale,
      moyenne_generale: moyenneGenerale,
      total_credits: totalCreditsValides > 0 ? totalCreditsValides : 30,
      total_credits_valides: totalCreditsValides > 0 ? totalCreditsValides : 30,
      rang: calculatedRank,
      decision,
      mention,
      date_generation: new Date().toISOString().split('T')[0],
      remarques_jury: 'Bulletin officiel délibéré.'
    });

    setBulletinsList(DB.getBulletins() || []);
    setViewingBulletin(newBulletin);
    setIsDetailOpen(true);
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1A1A1A]">Édition & Modification des Bulletins Semestriels</h2>
          <p className="text-xs text-gray-500 mt-1">Calcul automatique, délibération de jury et modification manuelle des relevés.</p>
        </div>
      </div>

      {/* Generator Control Bar */}
      <div className="bg-white p-4 rounded-[12px] border border-gray-300 shadow-xs flex flex-col lg:flex-row items-end gap-4">
        
        <div className="w-full lg:w-[220px]">
          <label className="block text-xs font-bold text-slate-800 mb-1.5">Filière d'Études</label>
          <select
            value={selectedFiliereId}
            onChange={(e) => handleFiliereChange(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
            className="w-full h-[38px] bg-white border border-gray-300 rounded-[6px] px-3 text-xs font-semibold focus:outline-none focus:border-slate-800"
          >
            <option value="ALL">Toutes les filières</option>
            {filieres.map(f => (
              <option key={f.id} value={f.id}>{f.nom} ({f.code})</option>
            ))}
          </select>
        </div>

        <div className="flex-1 w-full">
          <StudentSearchSelect
            etudiants={filteredEtudiants}
            selectedStudentId={selectedStudentId}
            onSelectStudent={(id) => setSelectedStudentId(id)}
            label="Choisir un Étudiant (Saisie directe)"
          />
        </div>

        <div className="w-full lg:w-[220px]">
          <label className="block text-xs font-bold text-slate-800 mb-1.5">Semestre Académique *</label>
          <select
            value={selectedSemestreId}
            onChange={(e) => setSelectedSemestreId(Number(e.target.value))}
            className="w-full h-[38px] bg-white border border-gray-300 rounded-[6px] px-3 text-xs font-semibold focus:outline-none focus:border-slate-800"
          >
            {semestres.map(s => (
              <option key={s.id} value={s.id}>{s.libelle}</option>
            ))}
          </select>
        </div>

        <button type="button"
          onClick={handleGenerateBulletin}
          className="w-full lg:w-auto h-[38px] px-5 bg-slate-900 hover:bg-slate-800 text-white rounded-[6px] text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-xs shrink-0"
        >
          <FileCheck2 className="w-4 h-4" />
          <span>Générer le Bulletin</span>
        </button>
      </div>

      {/* Existing Bulletins Table */}
      <div className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-xs overflow-hidden">
        <div className="p-5 border-b border-gray-100 font-bold text-sm text-[#1A1A1A] flex items-center justify-between">
          <span>Bulletins Émis ({bulletinsList.length})</span>
          <span className="text-xs text-gray-400 font-normal">Saisie & Modification directe activée</span>
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
                    Aucun bulletin généré pour le moment. Sélectionnez un étudiant ci-dessus et cliquez sur « Générer le Bulletin ».
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
                        {/* Modifier Button */}
                        <button type="button"
                          onClick={() => handleOpenEditModal(b)}
                          title="Modifier directement le bulletin"
                          className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-[10px] text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Modifier</span>
                        </button>

                        {/* Exporter PDF Button */}
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
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

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
