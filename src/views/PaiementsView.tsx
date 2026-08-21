import React, { useState, useEffect, useMemo } from 'react';
import { DB } from '../lib/storage';
import { safeFetchJson } from '../lib/api';
import { Paiement } from '../types/database';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { 
  CreditCard, 
  Plus, 
  Printer, 
  Edit2, 
  Trash2, 
  Eye, 
  ShieldCheck, 
  AlertCircle, 
  Search, 
  CheckCircle2, 
  TrendingUp, 
  Wallet, 
  Smartphone, 
  Download,
  Filter
} from 'lucide-react';
import { StudentSearchSelect } from '../components/StudentSearchSelect';

export const PaiementsView: React.FC = () => {
  const [list, setList] = useState<Paiement[]>(DB.getPaiements());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModeFilter, setSelectedModeFilter] = useState('ALL');
  const [selectedStatutFilter, setSelectedStatutFilter] = useState('ALL');

  useEffect(() => {
    const handleSync = () => setList(DB.getPaiements());
    window.addEventListener('unigestion_db_change', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('unigestion_db_change', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const etudiants = DB.getEtudiants();
  const filieres = DB.getFilieres();
  const annees = DB.getAnneesAcademiques();
  const activeAnnee = DB.getActiveAnneeAcademique();
  const universite = DB.getUniversites()[0];
  const universiteNom = universite?.nom || "USTTB - Université des Sciences, des Techniques et des Technologies de Bamako";

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<Paiement | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Delete confirmation modal state
  const [deletingPaiement, setDeletingPaiement] = useState<Paiement | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    etudiant_id: 0 as number,
    type_frais: 'Scolarité' as 'Inscription' | 'Scolarité' | 'Rattrapage' | 'Diplôme' | 'Examen' | 'Autre',
    filiere_id: filieres[0]?.id || 1,
    filiere_code: filieres[0]?.code || 'IGL',
    annee_academique_id: activeAnnee?.id || 1,
    montant_paye: 100000,
    mode_paiement: 'Orange Money' as 'Espèces' | 'Chèque' | 'Virement' | 'Orange Money' | 'Moov Money' | 'Wave',
    date_paiement: new Date().toISOString().split('T')[0],
    statut: 'Partiel' as 'Complet' | 'Partiel' | 'En retard' | 'En attente',
    remarque: ''
  });

  // Helper to get student's filiere & calculate financials
  const selectedStudent = etudiants.find(e => e.id === Number(formData.etudiant_id));
  const studentEnrollment = formData.etudiant_id ? DB.getStudentActiveEnrollment(Number(formData.etudiant_id)) : null;
  const studentClass = DB.getClasses().find(c => c.id === selectedStudent?.classe_id);
  
  const currentFiliere = filieres.find(f => f.id === formData.filiere_id) ||
                         studentEnrollment?.filiere ||
                         filieres.find(f => f.id === (selectedStudent as any)?.filiere_id) ||
                         filieres.find(f => f.id === studentClass?.filiere_id) ||
                         filieres[0];

  const prixFiliere = currentFiliere?.frais_scolarite || 550000;
  
  // Total previous payments for this student
  const totalDejaPaye = formData.etudiant_id ? list
    .filter(p => Number(p.etudiant_id) === Number(formData.etudiant_id) && p.id !== editingId)
    .reduce((sum, p) => sum + (p.montant_paye || 0), 0) : 0;

  const totalPayeApresReglement = totalDejaPaye + Number(formData.montant_paye || 0);
  const resteAPayer = Math.max(0, prixFiliere - totalPayeApresReglement);

  // Auto update filiere when student is chosen in modal
  const handleSelectStudentInModal = (studentId: number) => {
    const student = etudiants.find(e => e.id === studentId);
    const enrol = studentId ? DB.getStudentActiveEnrollment(studentId) : null;
    const targetFiliere = enrol?.filiere || filieres.find(f => f.id === (student as any)?.filiere_id) || filieres[0];
    
    // Calculate how much is left
    const alreadyPaid = list
      .filter(p => Number(p.etudiant_id) === Number(studentId))
      .reduce((sum, p) => sum + (p.montant_paye || 0), 0);
    const fullFee = targetFiliere?.frais_scolarite || 550000;
    const remaining = Math.max(0, fullFee - alreadyPaid);
    const suggestedMontant = remaining > 0 ? (remaining >= 100000 ? 100000 : remaining) : 50000;

    setFormData(prev => ({
      ...prev,
      etudiant_id: studentId,
      filiere_id: targetFiliere?.id || prev.filiere_id,
      filiere_code: targetFiliere?.code || prev.filiere_code,
      montant_paye: suggestedMontant
    }));
  };

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setFormData({
      etudiant_id: 0,
      type_frais: 'Scolarité',
      filiere_id: filieres[0]?.id || 1,
      filiere_code: filieres[0]?.code || 'IGL',
      annee_academique_id: activeAnnee?.id || 1,
      montant_paye: 100000,
      mode_paiement: 'Orange Money',
      date_paiement: new Date().toISOString().split('T')[0],
      statut: 'Partiel',
      remarque: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: Paiement) => {
    setEditingId(item.id);
    const matchedFiliere = filieres.find(f => f.id === item.filiere_id || f.code === item.filiere_code) || filieres[0];
    setFormData({
      etudiant_id: item.etudiant_id,
      type_frais: item.type_frais as any,
      filiere_id: item.filiere_id || matchedFiliere?.id || 1,
      filiere_code: item.filiere_code || matchedFiliere?.code || 'IGL',
      annee_academique_id: item.annee_academique_id || activeAnnee?.id || 1,
      montant_paye: item.montant_paye,
      mode_paiement: item.mode_paiement,
      date_paiement: item.date_paiement || new Date().toISOString().split('T')[0],
      statut: item.statut as any || 'Partiel',
      remarque: item.remarque || ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);

    if (!formData.etudiant_id) {
      setErrorBanner("Veuillez sélectionner un étudiant.");
      return;
    }

    const existingItem = editingId ? list.find(p => p.id === editingId) : null;
    const randomRef = existingItem?.reference_recu || `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const montantPaye = Number(formData.montant_paye);
    const selectedAnneeObj = annees.find(a => a.id === Number(formData.annee_academique_id));
    const anneeLibelle = selectedAnneeObj ? selectedAnneeObj.code.replace('-', ' - ') : '2025 - 2026';
    const calculatedStatut = resteAPayer <= 0 ? 'Complet' : 'Partiel';

    setIsSubmitting(true);
    try {
      const data = await safeFetchJson('/api/paiements/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          etudiant_id: Number(formData.etudiant_id),
          annee_academique_id: Number(formData.annee_academique_id),
          filiere_id: currentFiliere?.id,
          type_frais: formData.type_frais,
          montant: prixFiliere,
          montant_paye: montantPaye,
          reste_a_payer: resteAPayer,
          mode_paiement: formData.mode_paiement,
          reference_recu: randomRef,
          remarque: formData.remarque
        })
      });

      if (data && data.success === false) {
        setErrorBanner(data.message || "Erreur lors de l'enregistrement du paiement.");
        return;
      }

      // Sync local cache and broadcast to student space
      const savedPaiement = DB.savePaiement({
        id: editingId || undefined,
        etudiant_id: Number(formData.etudiant_id),
        annee_academique_id: Number(formData.annee_academique_id),
        filiere_id: currentFiliere?.id,
        filiere_code: currentFiliere?.code || formData.filiere_code,
        filiere_nom: currentFiliere?.nom,
        annee_libelle: anneeLibelle,
        type_frais: formData.type_frais,
        montant: prixFiliere,
        montant_paye: montantPaye,
        reste_a_payer: resteAPayer,
        mode_paiement: formData.mode_paiement,
        reference_recu: data?.reference_recu || randomRef,
        date_paiement: formData.date_paiement,
        statut: calculatedStatut,
        remarque: formData.remarque
      });

      setList(DB.getPaiements());
      setIsModalOpen(false);

      if (!editingId) {
        setViewingReceipt(savedPaiement);
        setIsReceiptModalOpen(true);
      }

    } catch (err: any) {
      setErrorBanner(`Erreur lors de l'enregistrement du paiement : ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = () => {
    if (deletingPaiement) {
      DB.deletePaiement(deletingPaiement.id);
      setList(DB.getPaiements());
      setDeletingPaiement(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Financial Statistics
  const stats = useMemo(() => {
    const totalEncaisse = list.reduce((acc, p) => acc + (Number(p.montant_paye) || 0), 0);
    const uniqueStudents = new Set(list.map(p => p.etudiant_id)).size;
    const mobileMoneyCount = list.filter(p => ['Orange Money', 'Wave', 'Moov Money'].includes(p.mode_paiement)).length;
    const completedCount = list.filter(p => p.statut === 'Complet' || (p.reste_a_payer !== undefined && p.reste_a_payer <= 0)).length;

    return {
      totalEncaisse,
      totalCount: list.length,
      uniqueStudents,
      mobileMoneyCount,
      completedCount
    };
  }, [list]);

  // Filtered Payments List
  const filteredList = useMemo(() => {
    return list.filter(item => {
      const st = etudiants.find(e => e.id === item.etudiant_id);
      const studentName = `${st?.prenom || ''} ${st?.nom || ''}`.toLowerCase();
      const matricule = (st?.matricule || '').toLowerCase();
      const ref = (item.reference_recu || '').toLowerCase();
      const filiere = (item.filiere_code || '').toLowerCase();
      const search = searchTerm.toLowerCase();

      const matchesSearch = !searchTerm || 
        studentName.includes(search) || 
        matricule.includes(search) || 
        ref.includes(search) || 
        filiere.includes(search);

      const matchesMode = selectedModeFilter === 'ALL' || item.mode_paiement === selectedModeFilter;
      const matchesStatut = selectedStatutFilter === 'ALL' || item.statut === selectedStatutFilter;

      return matchesSearch && matchesMode && matchesStatut;
    });
  }, [list, etudiants, searchTerm, selectedModeFilter, selectedStatutFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1A1A1A] flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-[#0066FF]" />
            <span>Gestion Financière & Recouvrement des Frais</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Enregistrement des règlements, édition des reçus officiels et synchronisation directe avec l'Espace Étudiant.
          </p>
        </div>

        <button type="button"
          onClick={handleOpenCreateModal}
          className="h-[44px] px-5 bg-[#0066FF] hover:bg-blue-700 text-white rounded-[14px] text-xs font-semibold flex items-center gap-2 transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Enregistrer un Règlement</span>
        </button>
      </div>

      {/* KPI Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Total Encaissé</p>
            <p className="text-lg font-black text-slate-900 font-mono">{stats.totalEncaisse.toLocaleString()} FCFA</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#0066FF] flex items-center justify-center font-bold">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Reçus Délivrés</p>
            <p className="text-lg font-black text-slate-900 font-mono">{stats.totalCount} règlements</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Mobile Money (OM/Wave)</p>
            <p className="text-lg font-black text-slate-900 font-mono">{stats.mobileMoneyCount} transactions</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Étudiants Ayant Réglé</p>
            <p className="text-lg font-black text-slate-900 font-mono">{stats.uniqueStudents} dossiers</p>
          </div>
        </div>
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

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par étudiant, matricule, référence reçu (REC-...) ou filière..."
            className="w-full h-[40px] pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#0066FF] focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded-xl border border-slate-200">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedModeFilter}
              onChange={(e) => setSelectedModeFilter(e.target.value)}
              className="bg-transparent text-xs font-medium focus:outline-none cursor-pointer"
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

          <div className="flex items-center gap-1 text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded-xl border border-slate-200">
            <select
              value={selectedStatutFilter}
              onChange={(e) => setSelectedStatutFilter(e.target.value)}
              className="bg-transparent text-xs font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="Complet">Soldé / Complet</option>
              <option value="Partiel">Partiel</option>
              <option value="En retard">En retard</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                <th className="px-6 py-4">Réf. Reçu</th>
                <th className="px-6 py-4">Étudiant & Matricule</th>
                <th className="px-6 py-4">Filière</th>
                <th className="px-6 py-4">Année</th>
                <th className="px-6 py-4">Objet Règlement</th>
                <th className="px-6 py-4 text-[#0066FF]">Montant Encaissé</th>
                <th className="px-6 py-4">Mode</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-gray-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-400 font-medium">
                    Aucun paiement ne correspond à vos critères de recherche.
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => {
                  const st = etudiants.find(e => e.id === item.etudiant_id);
                  const anneeObj = annees.find(a => a.id === item.annee_academique_id);
                  const anneeText = item.annee_libelle || (anneeObj ? anneeObj.code.replace('-', ' - ') : '2025 - 2026');
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-gray-700">{item.reference_recu}</td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">{st?.prenom} {st?.nom}</p>
                        <p className="text-[10px] font-mono text-slate-400">{st?.matricule || 'N/A'}</p>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-700">{item.filiere_code || 'IG1'}</td>
                      <td className="px-6 py-4 font-medium text-slate-600">{anneeText}</td>
                      <td className="px-6 py-4 text-gray-600 font-medium">{item.type_frais}</td>
                      <td className="px-6 py-4 font-bold text-emerald-600 font-mono text-sm">
                        {item.montant_paye.toLocaleString()} FCFA
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg font-semibold text-[11px]">
                          {item.mode_paiement}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          item.statut === 'Complet' || (item.reste_a_payer !== undefined && item.reste_a_payer <= 0)
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {item.statut || 'Partiel'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button type="button"
                            onClick={() => { setViewingReceipt(item); setIsReceiptModalOpen(true); }}
                            className="p-2 bg-blue-50 hover:bg-blue-100 text-[#0066FF] rounded-[10px] text-xs font-bold transition-colors"
                            title="Consulter / Imprimer le reçu officiel"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button type="button"
                            onClick={() => handleOpenEditModal(item)}
                            className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-[10px] text-xs font-bold transition-colors"
                            title="Modifier le paiement"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button type="button"
                            onClick={() => setDeletingPaiement(item)}
                            className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-[10px] text-xs font-bold transition-colors"
                            title="Supprimer le paiement"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nouveau / Modification Règlement */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "Modifier le Règlement de Frais" : "Enregistrer un Règlement de Frais Scolaires"}
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <StudentSearchSelect
              etudiants={etudiants}
              selectedStudentId={formData.etudiant_id}
              onSelectStudent={handleSelectStudentInModal}
              label="Étudiant Débiteur *"
            />
          </div>

          {/* Student Financial Context Live Badge */}
          {formData.etudiant_id > 0 && selectedStudent && (
            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1.5 text-xs text-blue-950">
              <div className="flex items-center justify-between font-bold">
                <span>Situation financière de l'étudiant :</span>
                <span className="text-[#0066FF] font-mono">{currentFiliere?.code || 'Filière'}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="bg-white p-2 rounded-lg border border-blue-100">
                  <p className="text-[10px] text-gray-500 font-semibold">Total Annuel</p>
                  <p className="font-mono font-bold text-slate-900">{prixFiliere.toLocaleString()} F</p>
                </div>
                <div className="bg-white p-2 rounded-lg border border-blue-100">
                  <p className="text-[10px] text-gray-500 font-semibold">Déjà Réglé</p>
                  <p className="font-mono font-bold text-emerald-600">{totalDejaPaye.toLocaleString()} F</p>
                </div>
                <div className="bg-white p-2 rounded-lg border border-blue-100">
                  <p className="text-[10px] text-gray-500 font-semibold">Reste Après Ce Versement</p>
                  <p className={`font-mono font-black ${resteAPayer <= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {resteAPayer.toLocaleString()} F
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Filière concernée *</label>
              <select
                value={formData.filiere_id}
                onChange={(e) => {
                  const fid = Number(e.target.value);
                  const fil = filieres.find(f => f.id === fid);
                  setFormData({ ...formData, filiere_id: fid, filiere_code: fil?.code || 'IGL' });
                }}
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] bg-white font-medium"
              >
                {filieres.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.code} - {f.nom} ({(f.frais_scolarite || 0).toLocaleString()} FCFA)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Année Académique *</label>
              <select
                value={formData.annee_academique_id}
                onChange={(e) => setFormData({ ...formData, annee_academique_id: Number(e.target.value) })}
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] bg-white font-medium"
              >
                {annees.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.code.replace('-', ' - ')} {a.est_active ? '(Actuelle)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Type de Frais / Objet *</label>
              <select
                value={formData.type_frais}
                onChange={(e) => setFormData({ ...formData, type_frais: e.target.value as any })}
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] bg-white font-medium"
              >
                <option value="Scolarité">Frais de Scolarité (Formation)</option>
                <option value="Inscription">Frais d'Inscription Administrative</option>
                <option value="Rattrapage">Session de Rattrapage</option>
                <option value="Diplôme">Frais d'Édition du Diplôme</option>
                <option value="Examen">Frais d'Examen</option>
                <option value="Autre">Autre Règlement</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Mode d'Encaissement *</label>
              <select
                value={formData.mode_paiement}
                onChange={(e) => setFormData({ ...formData, mode_paiement: e.target.value as any })}
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] bg-white font-medium"
              >
                <option value="Orange Money">Orange Money Mali</option>
                <option value="Wave">Wave Mali</option>
                <option value="Moov Money">Moov Money</option>
                <option value="Espèces">Espèces (Caisse Comptable)</option>
                <option value="Virement">Virement Bancaire (BDM / BOA)</option>
                <option value="Chèque">Chèque Bancaire</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Montant Réellement Payé (FCFA) *</label>
              <input
                type="number"
                step="5000"
                value={formData.montant_paye}
                onChange={(e) => setFormData({ ...formData, montant_paye: Number(e.target.value) })}
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] font-mono font-bold text-emerald-600 text-sm"
                required
                min={0}
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Date de Paiement *</label>
              <input
                type="date"
                value={formData.date_paiement}
                onChange={(e) => setFormData({ ...formData, date_paiement: e.target.value })}
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] font-medium"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Référence / Observation (optionnel)</label>
            <input
              type="text"
              value={formData.remarque}
              onChange={(e) => setFormData({ ...formData, remarque: e.target.value })}
              placeholder="Ex: Reçu de versement N° 4589 - Tranche 1"
              className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] font-medium"
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="h-[44px] px-5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-[14px]"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-[44px] px-6 bg-[#0066FF] hover:bg-blue-700 text-white font-semibold rounded-[14px] disabled:opacity-50"
            >
              {isSubmitting ? "Enregistrement..." : editingId ? "Enregistrer les modifications" : "Valider le Paiement & Délivrer le Reçu"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Modal Suppression */}
      <Modal
        isOpen={deletingPaiement !== null}
        onClose={() => setDeletingPaiement(null)}
        title="Supprimer le Règlement"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-700 font-medium">
            Êtes-vous sûr de vouloir supprimer définitivement le paiement <strong className="font-mono text-slate-900">{deletingPaiement?.reference_recu}</strong> d'un montant de <strong className="text-emerald-600">{deletingPaiement?.montant_paye.toLocaleString()} FCFA</strong> ?
          </p>
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setDeletingPaiement(null)}
              className="h-[40px] px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-[12px]"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleDeleteConfirm}
              className="h-[40px] px-5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-[12px]"
            >
              Confirmer la suppression
            </button>
          </div>
        </div>
      </Modal>

      {/* Printable Receipt Modal */}
      {viewingReceipt && (
        <Modal
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          title="Reçu de Paiement Officiel"
        >
          <div className="space-y-6 text-xs text-[#1A1A1A] p-6 bg-white rounded-[16px] border border-gray-200">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="font-bold text-[#0066FF] uppercase">{universiteNom}</h3>
                <p className="text-[10px] text-gray-500">Service de la Comptabilité et du Recouvrement</p>
              </div>
              <div className="text-right">
                <span className="font-mono font-bold text-gray-800 text-sm block">{viewingReceipt.reference_recu}</span>
                <span className="text-[10px] text-gray-400 font-mono">{viewingReceipt.date_paiement}</span>
              </div>
            </div>

            {(() => {
              const st = etudiants.find(e => e.id === viewingReceipt.etudiant_id);
              const anneeObj = annees.find(a => a.id === viewingReceipt.annee_academique_id);
              const anneeText = viewingReceipt.annee_libelle || (anneeObj ? anneeObj.code.replace('-', ' - ') : '2025 - 2026');
              return (
                <div className="space-y-3 bg-gray-50 p-4 rounded-[14px]">
                  <p><span className="font-bold">Étudiant :</span> {st?.prenom} {st?.nom} ({st?.matricule})</p>
                  <p><span className="font-bold">Filière :</span> {viewingReceipt.filiere_code || 'IG1'}</p>
                  <p><span className="font-bold">Année Académique :</span> {anneeText}</p>
                  <p><span className="font-bold">Objet du Règlement :</span> {viewingReceipt.type_frais}</p>
                  <p><span className="font-bold">Mode de Paiement :</span> {viewingReceipt.mode_paiement}</p>
                  {viewingReceipt.remarque && (
                    <p><span className="font-bold">Observation :</span> {viewingReceipt.remarque}</p>
                  )}
                  <p className="text-base font-bold text-emerald-600 font-mono mt-2 pt-2 border-t border-gray-200">
                    Montant Encaissé : {viewingReceipt.montant_paye.toLocaleString()} FCFA
                  </p>
                </div>
              );
            })()}

            <div className="flex items-center justify-between pt-4 border-t">
              <button type="button"
                onClick={() => setIsReceiptModalOpen(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 font-semibold rounded-[12px]"
              >
                Fermer
              </button>
              <button type="button"
                onClick={handlePrint}
                className="px-5 py-2.5 bg-[#0066FF] hover:bg-blue-700 text-white font-bold rounded-[12px] flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimer le Reçu</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmModal
        isOpen={!!deletingPaiement}
        title="Confirmer la suppression du paiement"
        message={deletingPaiement ? `Voulez-vous vraiment supprimer le paiement de ${deletingPaiement.montant_paye.toLocaleString()} FCFA (Réf: ${deletingPaiement.reference_recu}) ?` : ''}
        confirmLabel="Oui, supprimer"
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeletingPaiement(null)}
      />

    </div>
  );
};

