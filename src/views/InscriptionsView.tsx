import React, { useState, useEffect } from 'react';
import { DB } from '../lib/storage';
import { Inscription, Etudiant, Classe } from '../types/database';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { StudentSearchSelect } from '../components/StudentSearchSelect';
import { UserPlus, Users, Search, CheckCircle, Clock, Trash2, AlertCircle, ArrowRight, CheckSquare, Square, Filter, RefreshCw, Check } from 'lucide-react';

export const InscriptionsView: React.FC = () => {
  const [list, setList] = useState<Inscription[]>(DB.getInscriptions());
  const etudiants = DB.getEtudiants();
  const classes = DB.getClasses();
  const filieres = DB.getFilieres();
  const activeAnnee = DB.getActiveAnneeAcademique();
  const annees = DB.getAnneesAcademiques();

  const [isIndivModalOpen, setIsIndivModalOpen] = useState(false);
  const [isCollectiveModalOpen, setIsCollectiveModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Search & Filter State for main list
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClasseId, setFilterClasseId] = useState<number | 'ALL'>('ALL');
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Single Inscription Form
  const [indivForm, setIndivForm] = useState({
    etudiant_id: null as number | null,
    classe_id: classes[0]?.id || 1,
    annee_academique_id: activeAnnee.id,
    type_inscription: 'Inscrire' as 'Inscrire' | 'Réinscrire' | 'Passage',
    statut_paiement: 'Payé' as 'Non payé' | 'Partiel' | 'Payé',
    statut_validation: 'Validé' as 'En attente' | 'Validé' | 'Rejeté',
    frais_inscription: 150000
  });

  const handleOpenIndivModal = () => {
    setIndivForm({
      etudiant_id: null,
      classe_id: classes[0]?.id || 1,
      annee_academique_id: activeAnnee.id,
      type_inscription: 'Inscrire',
      statut_paiement: 'Payé',
      statut_validation: 'Validé',
      frais_inscription: 150000
    });
    setIsIndivModalOpen(true);
  };

  // Collective Inscription Form & State
  const [collectiveForm, setCollectiveForm] = useState({
    source_classe_id: classes[0]?.id || 1,
    target_classe_id: classes[1]?.id || classes[0]?.id || 1,
    annee_academique_id: activeAnnee.id,
    type_inscription: 'Réinscrire' as 'Inscrire' | 'Réinscrire' | 'Passage',
    statut_paiement: 'Payé' as 'Non payé' | 'Partiel' | 'Payé',
    statut_validation: 'Validé' as 'En attente' | 'Validé' | 'Rejeté',
    frais_inscription: 150000
  });

  // Selected student IDs for collective passage
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);

  // Students in source class
  const studentsInSourceClass = etudiants.filter(
    st => st.classe_id === Number(collectiveForm.source_classe_id)
  );

  // Whenever source class changes in collective form, re-select all students of that class by default
  useEffect(() => {
    const ids = studentsInSourceClass.map(s => s.id);
    setSelectedStudentIds(ids);
  }, [collectiveForm.source_classe_id]);

  const toggleSelectStudent = (id: number) => {
    if (selectedStudentIds.includes(id)) {
      setSelectedStudentIds(selectedStudentIds.filter(sId => sId !== id));
    } else {
      setSelectedStudentIds([...selectedStudentIds, id]);
    }
  };

  const toggleSelectAllStudents = () => {
    if (selectedStudentIds.length === studentsInSourceClass.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(studentsInSourceClass.map(s => s.id));
    }
  };

  const handleIndivSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!indivForm.etudiant_id) {
      alert("Veuillez sélectionner un étudiant.");
      return;
    }
    const etudiant = etudiants.find(e => e.id === Number(indivForm.etudiant_id));
    const targetClass = classes.find(c => c.id === Number(indivForm.classe_id));
    if (!etudiant) return;

    const newIns = DB.saveInscription({
      etudiant_id: Number(indivForm.etudiant_id),
      classe_id: Number(indivForm.classe_id),
      annee_academique_id: Number(indivForm.annee_academique_id),
      date_inscription: new Date().toISOString().split('T')[0],
      statut: 'Validée',
      frais_inscription: Number(indivForm.frais_inscription) || 150000,
      type_inscription: indivForm.type_inscription,
      statut_paiement: indivForm.statut_paiement,
      statut_validation: indivForm.statut_validation
    });

    // Update student's current class
    DB.saveEtudiant({
      ...etudiant,
      classe_id: Number(indivForm.classe_id),
      statut: 'Inscrit'
    });

    DB.logAccess('INSCRIPTION', `Inscription individuelle de ${etudiant.prenom} ${etudiant.nom} dans la classe ${targetClass?.nom || ''}`);

    setList(DB.getInscriptions());
    setIsIndivModalOpen(false);
    setSuccessBanner(`Inscription enregistrée avec succès pour ${etudiant.prenom} ${etudiant.nom}.`);
    setTimeout(() => setSuccessBanner(null), 5000);
  };

  // Collective Passage Handler
  const handleCollectiveSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (Number(collectiveForm.source_classe_id) === Number(collectiveForm.target_classe_id)) {
      alert("La classe source et la classe de destination ne peuvent pas être identiquement la même.");
      return;
    }

    if (selectedStudentIds.length === 0) {
      alert("Veuillez sélectionner au moins un étudiant pour effectuer le passage collectif.");
      return;
    }

    const sourceClass = classes.find(c => c.id === Number(collectiveForm.source_classe_id));
    const targetClass = classes.find(c => c.id === Number(collectiveForm.target_classe_id));

    let processedCount = 0;

    selectedStudentIds.forEach(stId => {
      const student = etudiants.find(e => e.id === stId);
      if (!student) return;

      // 1. Create Inscription record
      DB.saveInscription({
        etudiant_id: student.id,
        classe_id: Number(collectiveForm.target_classe_id),
        annee_academique_id: Number(collectiveForm.annee_academique_id),
        date_inscription: new Date().toISOString().split('T')[0],
        statut: 'Validée',
        frais_inscription: Number(collectiveForm.frais_inscription) || 150000,
        type_inscription: collectiveForm.type_inscription,
        statut_paiement: collectiveForm.statut_paiement,
        statut_validation: collectiveForm.statut_validation
      });

      // 2. Update Student Record with new Class ID & Active Status
      DB.saveEtudiant({
        ...student,
        classe_id: Number(collectiveForm.target_classe_id),
        statut: 'Inscrit'
      });

      processedCount++;
    });

    DB.logAccess('INSCRIPTION', `Passage collectif effectué : ${processedCount} étudiant(s) transféré(s) de ${sourceClass?.nom || ''} vers ${targetClass?.nom || ''}`);

    setList(DB.getInscriptions());
    setIsCollectiveModalOpen(false);
    setSuccessBanner(`✅ Passage collectif validé avec succès ! ${processedCount} étudiant(s) réinscrit(s) dans la classe "${targetClass?.nom}".`);
    setTimeout(() => setSuccessBanner(null), 6000);
  };

  const handleDelete = (id: number) => {
    setDeleteConfirmId(id);
  };

  const executeDeleteInscription = () => {
    if (deleteConfirmId !== null) {
      const item = list.find(i => i.id === deleteConfirmId);
      if (item) {
        const student = etudiants.find(e => e.id === item.etudiant_id);
        DB.moveToCorbeille('INSCRIPTION', item.id, `Inscription ${student ? `${student.prenom} ${student.nom}` : `#${item.id}`}`, `Paiement: ${item.statut_paiement}`, item);
        DB.deleteInscription(deleteConfirmId);
        setList(DB.getInscriptions());
        setSuccessBanner("Inscription déplacée vers la corbeille.");
        setTimeout(() => setSuccessBanner(null), 4000);
      }
      setDeleteConfirmId(null);
    }
  };

  // Filtered list for display
  const filteredInscriptions = list.filter(item => {
    const student = etudiants.find(e => e.id === item.etudiant_id);
    const matchesSearch = searchQuery === '' || 
      (student && `${student.prenom} ${student.nom} ${student.matricule}`.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesClasse = filterClasseId === 'ALL' || item.classe_id === Number(filterClasseId);

    return matchesSearch && matchesClasse;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1A1A1A]">Gestion des Inscriptions & Réinscriptions</h2>
          <p className="text-xs text-gray-500 mt-1">Validation des dossiers, passage collectif par niveau et suivi des effectifs.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCollectiveModalOpen(true)}
            className="h-[44px] px-4 bg-white border border-[#E5E7EB] hover:bg-slate-50 text-slate-800 rounded-[14px] text-xs font-bold flex items-center gap-2 transition-all shadow-2xs hover:border-slate-300"
          >
            <Users className="w-4 h-4 text-blue-600" />
            <span>Passage Collectif par Classe</span>
          </button>

          <button
            onClick={handleOpenIndivModal}
            className="h-[44px] px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-[14px] text-xs font-bold flex items-center gap-2 transition-colors shadow-xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>Inscription Individuelle</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successBanner && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button onClick={() => setSuccessBanner(null)} className="text-emerald-600 hover:text-emerald-900 font-extrabold">✕</button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par nom ou matricule..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-600"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <select
            value={filterClasseId}
            onChange={(e) => setFilterClasseId(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
            className="h-9 bg-gray-50 border border-gray-200 rounded-xl px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-600 w-full sm:w-auto"
          >
            <option value="ALL">Toutes les classes ({list.length} inscriptions)</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Inscriptions Table */}
      <div className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                <th className="px-6 py-4">Matricule</th>
                <th className="px-6 py-4">Étudiant</th>
                <th className="px-6 py-4">Classe Attribuée</th>
                <th className="px-6 py-4">Type Inscription</th>
                <th className="px-6 py-4">Paiement Frais</th>
                <th className="px-6 py-4">Statut Validation</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-gray-100">
              {filteredInscriptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-400 font-medium">
                    Aucune inscription trouvée.
                  </td>
                </tr>
              ) : (
                filteredInscriptions.map((item) => {
                  const st = etudiants.find(e => e.id === item.etudiant_id);
                  const cls = classes.find(c => c.id === item.classe_id);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-[#0066FF]">{st?.matricule || 'N/A'}</td>
                      <td className="px-6 py-4 font-semibold text-[#1A1A1A]">
                        {st ? `${st.prenom} ${st.nom}` : 'Étudiant Inconnu'}
                      </td>
                      <td className="px-6 py-4 text-gray-700 font-medium">{cls?.nom || 'Non assignée'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-md font-bold text-[10px] ${
                          item.type_inscription === 'Passage' || item.type_inscription === 'Réinscrire'
                            ? 'bg-blue-50 text-blue-700 border border-blue-100'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {item.type_inscription || 'Inscrire'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-emerald-600">{item.statut_paiement || 'Payé'}</td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          {item.statut_validation || 'Validé'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-[10px] text-xs font-semibold inline-flex items-center"
                          title="Annuler / Supprimer l'inscription"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Modal Inscription Individuelle */}
      <Modal
        isOpen={isIndivModalOpen}
        onClose={() => setIsIndivModalOpen(false)}
        title="Nouvelle Inscription Individuelle"
      >
        <form onSubmit={handleIndivSave} className="space-y-4 text-xs">
          <div>
            <StudentSearchSelect
              etudiants={etudiants}
              selectedStudentId={indivForm.etudiant_id}
              onSelectStudent={(id) => setIndivForm({ ...indivForm, etudiant_id: id })}
              label="Sélectionner l'Étudiant (Saisie directe / Recherche) *"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Classe de Destination *</label>
              <select
                value={indivForm.classe_id}
                onChange={(e) => setIndivForm({ ...indivForm, classe_id: Number(e.target.value) })}
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] bg-white font-medium"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Type d'Acte *</label>
              <select
                value={indivForm.type_inscription}
                onChange={(e) => setIndivForm({ ...indivForm, type_inscription: e.target.value as any })}
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] bg-white font-semibold"
              >
                <option value="Inscrire">Première Inscription</option>
                <option value="Réinscrire">Réinscription</option>
                <option value="Passage">Passage de Niveau</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Année Académique *</label>
              <select
                value={indivForm.annee_academique_id}
                onChange={(e) => setIndivForm({ ...indivForm, annee_academique_id: Number(e.target.value) })}
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] bg-white font-medium"
              >
                {annees.map(a => (
                  <option key={a.id} value={a.id}>{a.libelle} ({a.code})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Frais d'Inscription (FCFA)</label>
              <input
                type="number"
                value={indivForm.frais_inscription}
                onChange={(e) => setIndivForm({ ...indivForm, frais_inscription: Number(e.target.value) || 0 })}
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] bg-white font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Statut des Frais</label>
              <select
                value={indivForm.statut_paiement}
                onChange={(e) => setIndivForm({ ...indivForm, statut_paiement: e.target.value as any })}
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] bg-white font-medium"
              >
                <option value="Payé">Totalement Payé</option>
                <option value="Partiel">Paiement Partiel</option>
                <option value="Non payé">Exonéré / En Attente</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Validation Administrative</label>
              <select
                value={indivForm.statut_validation}
                onChange={(e) => setIndivForm({ ...indivForm, statut_validation: e.target.value as any })}
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] bg-white font-bold text-emerald-700"
              >
                <option value="Validé">Dossier Validé</option>
                <option value="En attente">En Attente de Pièces</option>
                <option value="Rejeté">Dossier Rejeté</option>
              </select>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsIndivModalOpen(false)}
              className="h-[44px] px-5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-[14px]"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="h-[44px] px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-[14px]"
            >
              Valider l'Inscription
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Inscription Collective / Passage par Classe */}
      <Modal
        isOpen={isCollectiveModalOpen}
        onClose={() => setIsCollectiveModalOpen(false)}
        title="Passage / Réinscription Collective par Classe"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleCollectiveSave} className="space-y-5 text-xs">
          
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 font-semibold flex items-start gap-2.5">
            <Users className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block mb-0.5">Procédure de Passage Collectif de Niveau</span>
              Seuls les étudiants cochés ci-dessous seront réinscrits et transférés de la classe de départ vers la classe de destination pour l'année académique active ({activeAnnee.code}).
            </div>
          </div>

          {/* Source & Target Class Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-800 mb-1">Classe Source (Départ) *</label>
              <select
                value={collectiveForm.source_classe_id}
                onChange={(e) => setCollectiveForm({ ...collectiveForm, source_classe_id: Number(e.target.value) })}
                className="w-full h-11 px-3 border border-slate-300 rounded-xl bg-slate-50 font-bold text-slate-900 focus:outline-none focus:border-blue-600"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">Classe de Destination (Passage) *</label>
              <select
                value={collectiveForm.target_classe_id}
                onChange={(e) => setCollectiveForm({ ...collectiveForm, target_classe_id: Number(e.target.value) })}
                className="w-full h-11 px-3 border border-slate-300 rounded-xl bg-white font-bold text-blue-600 focus:outline-none focus:border-blue-600"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Same Class Warning */}
          {Number(collectiveForm.source_classe_id) === Number(collectiveForm.target_classe_id) && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Attention : Veuillez sélectionner une classe de destination différente de la classe source.</span>
            </div>
          )}

          {/* Student Selection Section */}
          <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                  Liste des Étudiants de la Classe Source ({studentsInSourceClass.length})
                </h4>
                <p className="text-[11px] text-slate-500 font-medium">
                  {selectedStudentIds.length} sur {studentsInSourceClass.length} étudiant(s) coché(s) pour le passage.
                </p>
              </div>

              {studentsInSourceClass.length > 0 && (
                <button
                  type="button"
                  onClick={toggleSelectAllStudents}
                  className="px-3 py-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-lg text-[11px] flex items-center gap-1.5 transition-colors"
                >
                  {selectedStudentIds.length === studentsInSourceClass.length ? (
                    <>
                      <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                      <span>Tout Désélectionner</span>
                    </>
                  ) : (
                    <>
                      <Square className="w-3.5 h-3.5 text-slate-400" />
                      <span>Tout Sélectionner</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Student Checkbox Table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white max-h-56 overflow-y-auto">
              {studentsInSourceClass.length === 0 ? (
                <div className="p-6 text-center text-slate-400 font-medium">
                  Aucun étudiant n'est inscrit dans cette classe source pour le moment.
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-[10px] font-bold text-slate-600 uppercase border-b border-slate-200">
                      <th className="px-3 py-2 text-center w-10">Cocher</th>
                      <th className="px-3 py-2">Matricule</th>
                      <th className="px-3 py-2">Nom & Prénom</th>
                      <th className="px-3 py-2 text-right">Statut Actuel</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {studentsInSourceClass.map((st) => {
                      const isSelected = selectedStudentIds.includes(st.id);
                      return (
                        <tr
                          key={st.id}
                          onClick={() => toggleSelectStudent(st.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // handled by row click
                              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                          <td className="px-3 py-2 font-mono font-bold text-blue-600">{st.matricule}</td>
                          <td className="px-3 py-2 font-bold text-slate-900">{st.prenom} {st.nom}</td>
                          <td className="px-3 py-2 text-right">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                              {st.statut}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Parameters for the passage */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Année Académique *</label>
              <select
                value={collectiveForm.annee_academique_id}
                onChange={(e) => setCollectiveForm({ ...collectiveForm, annee_academique_id: Number(e.target.value) })}
                className="w-full h-10 px-3 border border-slate-300 rounded-xl bg-white font-medium text-slate-800"
              >
                {annees.map(a => (
                  <option key={a.id} value={a.id}>{a.libelle} ({a.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Frais de Passage (FCFA)</label>
              <input
                type="number"
                value={collectiveForm.frais_inscription}
                onChange={(e) => setCollectiveForm({ ...collectiveForm, frais_inscription: Number(e.target.value) || 0 })}
                className="w-full h-10 px-3 border border-slate-300 rounded-xl bg-white font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Validation Administrative</label>
              <select
                value={collectiveForm.statut_validation}
                onChange={(e) => setCollectiveForm({ ...collectiveForm, statut_validation: e.target.value as any })}
                className="w-full h-10 px-3 border border-slate-300 rounded-xl bg-white font-bold text-emerald-700"
              >
                <option value="Validé">Dossier Validé</option>
                <option value="En attente">En Attente de Pièces</option>
              </select>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsCollectiveModalOpen(false)}
              className="h-11 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={
                selectedStudentIds.length === 0 ||
                Number(collectiveForm.source_classe_id) === Number(collectiveForm.target_classe_id)
              }
              className={`h-11 px-6 text-white font-bold rounded-xl flex items-center gap-2 shadow-sm transition-all ${
                selectedStudentIds.length === 0 || Number(collectiveForm.source_classe_id) === Number(collectiveForm.target_classe_id)
                  ? 'bg-slate-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Valider le Passage Collectif ({selectedStudentIds.length})</span>
            </button>
          </div>

        </form>
      </Modal>

      <ConfirmModal
        isOpen={deleteConfirmId !== null}
        title="Confirmer l'annulation de l'inscription"
        message="Voulez-vous vraiment annuler/supprimer cette inscription ? Elle sera déplacée vers la Corbeille."
        confirmLabel="Oui, supprimer"
        onConfirm={executeDeleteInscription}
        onClose={() => setDeleteConfirmId(null)}
      />

    </div>
  );
};
