import React, { useState } from 'react';
import { DB } from '../lib/storage';
import { Bulletin } from '../types/database';
import { Modal } from '../components/Modal';
import { FileCheck2, Printer, Download, Eye, Award, CheckCircle } from 'lucide-react';
import { StudentSearchSelect } from '../components/StudentSearchSelect';
import { ExcelBulletinView } from '../components/ExcelBulletinView';

export const BulletinsView: React.FC = () => {
  const [bulletinsList, setBulletinsList] = useState<Bulletin[]>(DB.getBulletins());
  const etudiants = DB.getEtudiants();
  const semestres = DB.getSemestres();
  const classes = DB.getClasses();
  const matieres = DB.getMatieres();
  const notes = DB.getNotes();
  const filieres = DB.getFilieres();
  const activeAnnee = DB.getActiveAnneeAcademique();
  const universite = DB.getUniversites()[0];

  const [selectedFiliereId, setSelectedFiliereId] = useState<number | 'ALL'>('ALL');
  const [selectedStudentId, setSelectedStudentId] = useState<number>(etudiants[0]?.id || 1);
  const [selectedSemestreId, setSelectedSemestreId] = useState<number>(semestres[0]?.id || 1);
  const [viewingBulletin, setViewingBulletin] = useState<Bulletin | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Filter students by selected filiere dropdown
  const filteredEtudiants = selectedFiliereId === 'ALL'
    ? etudiants
    : etudiants.filter(e => {
        const cls = classes.find(c => c.id === e.classe_id);
        return cls?.filiere_id === selectedFiliereId;
      });

  // Generate or recalculate Bulletin for selected student and semester
  const handleGenerateBulletin = () => {
    const student = etudiants.find(e => e.id === Number(selectedStudentId));
    if (!student) return;

    // Get all student's notes for this semester
    const studentNotes = notes.filter(
      n => n.etudiant_id === student.id && n.semestre_id === Number(selectedSemestreId)
    );

    let totalPoints = 0;
    let totalCredits = 0;
    let totalCreditsValides = 0;

    studentNotes.forEach(n => {
      const mat = matieres.find(m => m.id === n.matiere_id);
      const credits = mat?.credits || 3;

      totalPoints += n.note_finale * credits;
      totalCredits += credits;

      if (n.note_finale >= 10) {
        totalCreditsValides += credits;
      }
    });

    const moyenneGenerale = totalCredits > 0 ? parseFloat((totalPoints / totalCredits).toFixed(2)) : 12.5;

    let decision: 'Admis' | 'Ajourné' | 'Compensé' | 'En attente' = 'Admis';
    if (moyenneGenerale < 10) decision = 'Ajourné';
    else if (moyenneGenerale >= 10 && totalCreditsValides < 30) decision = 'Compensé';

    const newBulletin = DB.saveBulletin({
      etudiant_id: student.id,
      classe_id: student.classe_id,
      semestre_id: Number(selectedSemestreId),
      annee_academique_id: activeAnnee.id,
      moyenne: moyenneGenerale,
      total_credits: totalCreditsValides > 0 ? totalCreditsValides : 24,
      rang: 1,
      decision,
      mention: moyenneGenerale >= 16 ? 'Très Bien' : moyenneGenerale >= 14 ? 'Bien' : moyenneGenerale >= 12 ? 'Assez Bien' : 'Passable',
      date_generation: new Date().toISOString().split('T')[0]
    });

    setBulletinsList(DB.getBulletins());
    setViewingBulletin(newBulletin);
    setIsDetailOpen(true);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1A1A1A]">Édition & Génération des Bulletins Semestriels</h2>
          <p className="text-xs text-gray-500 mt-1">Calcul automatique de la moyenne semestrielle, des crédits ECTS et rangs LMD.</p>
        </div>
      </div>

      {/* Generator Control Bar */}
      <div className="bg-white p-4 rounded-[12px] border border-gray-300 shadow-xs flex flex-col lg:flex-row items-end gap-4">
        
        <div className="w-full lg:w-[220px]">
          <label className="block text-xs font-bold text-slate-800 mb-1.5">Filière d'Études</label>
          <select
            value={selectedFiliereId}
            onChange={(e) => setSelectedFiliereId(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
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

        <button
          onClick={handleGenerateBulletin}
          className="w-full lg:w-auto h-[38px] px-5 bg-slate-900 hover:bg-slate-800 text-white rounded-[6px] text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-xs shrink-0"
        >
          <FileCheck2 className="w-4 h-4" />
          <span>Générer le Bulletin</span>
        </button>
      </div>

      {/* Existing Bulletins Table */}
      <div className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-xs overflow-hidden">
        <div className="p-5 border-b border-gray-100 font-bold text-sm text-[#1A1A1A]">
          Bulletins Récents Émis
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                <th className="px-6 py-4">Matricule</th>
                <th className="px-6 py-4">Étudiant</th>
                <th className="px-6 py-4">Semestre</th>
                <th className="px-6 py-4 text-center">Moyenne Générale</th>
                <th className="px-6 py-4 text-center">Crédits Validés</th>
                <th className="px-6 py-4">Décision Conseil</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-gray-100">
              {bulletinsList.map((b) => {
                const st = etudiants.find(e => e.id === b.etudiant_id);
                const sem = semestres.find(s => s.id === b.semestre_id);
                return (
                  <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-[#0066FF]">{st?.matricule}</td>
                    <td className="px-6 py-4 font-semibold text-[#1A1A1A]">{st?.prenom} {st?.nom}</td>
                    <td className="px-6 py-4 text-gray-600 font-medium">{sem?.libelle}</td>
                    <td className="px-6 py-4 text-center font-bold text-[#0066FF] font-mono text-sm">
                      {b.moyenne_generale} / 20
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-emerald-600">
                      {b.total_credits_valides} / 30 ECTS
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        b.decision === 'Admis' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                      }`}>
                        {b.decision} ({b.mention})
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => { setViewingBulletin(b); setIsDetailOpen(true); }}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#0066FF] rounded-[10px] text-xs font-bold transition-colors"
                      >
                        Consulter / Imprimer
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Printable Official Transcript (Style Excel) */}
      {viewingBulletin && (() => {
        const st = etudiants.find(e => e.id === viewingBulletin.etudiant_id) || etudiants[0];
        const sem = semestres.find(s => s.id === viewingBulletin.semestre_id) || semestres[0];
        const cls = classes.find(c => c.id === st?.classe_id);
        const filieres = DB.getFilieres();
        const fil = filieres.find(f => f.id === cls?.filiere_id);
        const facultes = DB.getFacultes();
        const fac = facultes.find(f => f.id === fil?.faculte_id);

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
              notes={notes}
              matieres={matieres}
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
