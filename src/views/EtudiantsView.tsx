import React, { useState } from 'react';
import { DB } from '../lib/storage';
import { Etudiant } from '../types/database';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import {
  GraduationCap,
  Plus,
  Search,
  Upload,
  Download,
  Printer,
  FileSpreadsheet,
  Eye,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Lock,
  Unlock,
  ShieldAlert,
  UserCheck
} from 'lucide-react';

export const EtudiantsView: React.FC = () => {
  const [list, setList] = useState<Etudiant[]>(DB.getEtudiants());

  React.useEffect(() => {
    const handleSync = () => {
      setList(DB.getEtudiants());
    };
    window.addEventListener('unigestion_db_change', handleSync);
    return () => window.removeEventListener('unigestion_db_change', handleSync);
  }, []);

  const classes = DB.getClasses();
  const filieres = DB.getFilieres();
  const notes = DB.getNotes();
  const paiements = DB.getPaiements();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const [editingItem, setEditingItem] = useState<Etudiant | null>(null);
  const [viewingItem, setViewingItem] = useState<Etudiant | null>(null);
  const [deleteConfirmStudent, setDeleteConfirmStudent] = useState<Etudiant | null>(null);

  // Search & Filters - Empty search by default (Requirement 9)
  const [search, setSearch] = useState('');
  const [filterFiliere, setFilterFiliere] = useState<string>('all');
  const [filterClasse, setFilterClasse] = useState<string>('all');

  const [formData, setFormData] = useState({
    matricule: '',
    nom: '',
    prenom: '',
    date_naissance: '',
    lieu_naissance: '',
    sexe: 'M' as 'M' | 'F',
    nationalite: '',
    adresse: '',
    telephone: '',
    email: '',
    classe_id: classes[0]?.id || 1,
    statut: 'Inscrit' as 'Régulier' | 'Inscrit' | 'Suspendu' | 'Diplômé',
    // Tutor info (Requirement 1)
    tuteur_nom: '',
    tuteur_prenom: '',
    tuteur_telephone: '',
    // Account lock status (Requirement 7)
    statut_compte: 'Actif' as 'Actif' | 'Inactif' | 'Bloqué',
    est_bloque: false,
    mot_de_passe: 'etudiant123'
  });

  const handleOpenModal = (item?: Etudiant) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        matricule: item.matricule,
        nom: item.nom,
        prenom: item.prenom,
        date_naissance: item.date_naissance,
        lieu_naissance: item.lieu_naissance || '',
        sexe: item.sexe,
        nationalite: item.nationalite || '',
        adresse: item.adresse || '',
        telephone: item.telephone || '',
        email: item.email,
        classe_id: item.classe_id,
        statut: item.statut,
        tuteur_nom: item.tuteur_nom || '',
        tuteur_prenom: item.tuteur_prenom || '',
        tuteur_telephone: item.tuteur_telephone || '',
        statut_compte: item.statut_compte || (item.est_bloque ? 'Bloqué' : 'Actif'),
        est_bloque: item.est_bloque || item.statut_compte === 'Bloqué',
        mot_de_passe: item.mot_de_passe || 'etudiant123'
      });
    } else {
      setEditingItem(null);
      const randomMat = `2024-USTTB-${String(list.length + 1).padStart(3, '0')}`;
      setFormData({
        matricule: randomMat,
        nom: '',
        prenom: '',
        date_naissance: '',
        lieu_naissance: '',
        sexe: 'M',
        nationalite: '',
        adresse: '',
        telephone: '',
        email: '',
        classe_id: classes[0]?.id || 1,
        statut: 'Inscrit',
        tuteur_nom: '',
        tuteur_prenom: '',
        tuteur_telephone: '',
        statut_compte: 'Actif',
        est_bloque: false,
        mot_de_passe: 'etudiant123'
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nom || !formData.prenom || !formData.matricule) return;

    DB.saveEtudiant({
      ...(editingItem ? { id: editingItem.id } : {}),
      ...formData,
      classe_id: Number(formData.classe_id),
      mot_de_passe: formData.mot_de_passe || 'etudiant123',
      date_inscription: editingItem ? editingItem.date_inscription : new Date().toISOString().split('T')[0],
      est_bloque: formData.statut_compte === 'Bloqué'
    });

    setList(DB.getEtudiants());
    setIsModalOpen(false);
  };

  // Quick toggle student account lock (Requirement 7)
  const handleToggleStudentLock = (student: Etudiant, newStatus: 'Actif' | 'Inactif' | 'Bloqué') => {
    DB.saveEtudiant({
      ...student,
      statut_compte: newStatus,
      est_bloque: newStatus === 'Bloqué'
    });
    DB.logAccess('SECURITE', `Modification statut compte étudiant ${student.prenom} ${student.nom} (#${student.matricule}) -> ${newStatus}`);
    setList(DB.getEtudiants());
  };

  const handleDelete = (id: number) => {
    const student = list.find(e => e.id === id);
    if (!student) return;
    setDeleteConfirmStudent(student);
  };

  const executeDeleteStudent = () => {
    if (!deleteConfirmStudent) return;
    DB.moveToCorbeille(
      'ETUDIANT',
      deleteConfirmStudent.id,
      `${deleteConfirmStudent.prenom} ${deleteConfirmStudent.nom} (${deleteConfirmStudent.matricule})`,
      `Étudiant ${deleteConfirmStudent.statut} - Classe ID #${deleteConfirmStudent.classe_id}`,
      deleteConfirmStudent,
      'Administrateur'
    );
    DB.deleteEtudiant(deleteConfirmStudent.id);
    setList(DB.getEtudiants());
    setDeleteConfirmStudent(null);
  };

  // Export List
  const handleExportCSV = () => {
    const headers = ["ID", "Matricule", "Nom", "Prénom", "Sexe", "Email", "Téléphone", "Tuteur Nom", "Tuteur Téléphone", "Statut Compte"];
    const rows = filtered.map(e => [
      e.id,
      e.matricule,
      e.nom,
      e.prenom,
      e.sexe,
      e.email,
      e.telephone,
      e.tuteur_nom || '',
      e.tuteur_telephone || '',
      e.statut_compte || (e.est_bloque ? 'Bloqué' : 'Actif')
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `liste_etudiants_mali_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  // Filter Logic
  const filtered = list.filter(e => {
    const matchesSearch =
      !search.trim() ||
      e.nom.toLowerCase().includes(search.toLowerCase().trim()) ||
      e.prenom.toLowerCase().includes(search.toLowerCase().trim()) ||
      e.matricule.toLowerCase().includes(search.toLowerCase().trim()) ||
      e.email.toLowerCase().includes(search.toLowerCase().trim()) ||
      `${e.prenom} ${e.nom}`.toLowerCase().includes(search.toLowerCase().trim());

    const studentClass = classes.find(c => c.id === e.classe_id);
    const matchesFiliere = filterFiliere === 'all' || studentClass?.filiere_id === Number(filterFiliere);
    const matchesClasse = filterClasse === 'all' || e.classe_id === Number(filterClasse);

    return matchesSearch && matchesFiliere && matchesClasse;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-[#1A1A1A]">Gestion des Étudiants</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Effectif total : <span className="font-bold text-[#0066FF]">{list.length} étudiants inscrits</span>
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-wrap items-center gap-2 w-full lg:w-auto">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="h-[40px] sm:h-[44px] px-3 sm:px-4 bg-white border border-[#E5E7EB] hover:bg-gray-50 text-gray-700 rounded-[12px] sm:rounded-[14px] text-xs font-semibold flex items-center justify-center gap-1.5 sm:gap-2 transition-colors w-full sm:w-auto"
          >
            <Upload className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Importer (Excel)</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="h-[40px] sm:h-[44px] px-3 sm:px-4 bg-white border border-[#E5E7EB] hover:bg-gray-50 text-gray-700 rounded-[12px] sm:rounded-[14px] text-xs font-semibold flex items-center justify-center gap-1.5 sm:gap-2 transition-colors w-full sm:w-auto"
          >
            <FileSpreadsheet className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Exporter Excel</span>
          </button>

          <button
            onClick={handlePrint}
            className="h-[40px] sm:h-[44px] px-3 sm:px-4 bg-white border border-[#E5E7EB] hover:bg-gray-50 text-gray-700 rounded-[12px] sm:rounded-[14px] text-xs font-semibold flex items-center justify-center gap-1.5 sm:gap-2 transition-colors w-full sm:w-auto"
          >
            <Printer className="w-4 h-4 text-gray-600 shrink-0" />
            <span>Imprimer</span>
          </button>

          <button
            onClick={() => handleOpenModal()}
            className="h-[40px] sm:h-[44px] px-4 sm:px-5 bg-[#0066FF] hover:bg-blue-700 text-white rounded-[12px] sm:rounded-[14px] text-xs font-semibold flex items-center justify-center gap-1.5 sm:gap-2 transition-colors shadow-xs w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Nouveau Étudiant</span>
          </button>
        </div>
      </div>

      {/* Multicriteria Search & Filters Bar (Requirement 9: Empty placeholder search) */}
      <div className="bg-white p-3 sm:p-4 rounded-[16px] sm:rounded-[20px] border border-[#E5E7EB] shadow-xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="relative sm:col-span-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un étudiant..."
            className="w-full h-[40px] sm:h-[44px] bg-[#F9FAFB] border border-[#E5E7EB] rounded-[12px] sm:rounded-[14px] pl-9 pr-3 text-xs sm:text-sm focus:outline-none focus:border-[#0066FF]"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

        <div>
          <select
            value={filterFiliere}
            onChange={(e) => setFilterFiliere(e.target.value)}
            className="w-full h-[40px] sm:h-[44px] bg-[#F9FAFB] border border-[#E5E7EB] rounded-[12px] sm:rounded-[14px] px-3 text-xs font-medium focus:outline-none focus:border-[#0066FF]"
          >
            <option value="all">Toutes les filières</option>
            {filieres.map(f => (
              <option key={f.id} value={f.id}>{f.nom} ({f.code})</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={filterClasse}
            onChange={(e) => setFilterClasse(e.target.value)}
            className="w-full h-[40px] sm:h-[44px] bg-[#F9FAFB] border border-[#E5E7EB] rounded-[12px] sm:rounded-[14px] px-3 text-xs font-medium focus:outline-none focus:border-[#0066FF]"
          >
            <option value="all">Toutes les classes</option>
            {classes
              .filter(c => filterFiliere === 'all' || c.filiere_id === Number(filterFiliere))
              .map(c => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-[16px] sm:rounded-[20px] border border-[#E5E7EB] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[720px]">
            <thead>
              <tr className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                <th className="px-4 sm:px-6 py-3.5">Matricule</th>
                <th className="px-4 sm:px-6 py-3.5">Nom & Prénom</th>
                <th className="px-4 sm:px-6 py-3.5">Classe</th>
                <th className="px-4 sm:px-6 py-3.5">Tuteur</th>
                <th className="px-4 sm:px-6 py-3.5">Statut Compte</th>
                <th className="px-4 sm:px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400">
                    Aucun étudiant ne correspond à votre recherche.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const cls = classes.find(c => c.id === item.classe_id);
                  const isBlocked = item.est_bloque || item.statut_compte === 'Bloqué';
                  const isInactive = item.statut_compte === 'Inactif';

                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 sm:px-6 py-3.5 font-mono font-bold text-[#0066FF] whitespace-nowrap">{item.matricule}</td>
                      <td className="px-4 sm:px-6 py-3.5 font-semibold text-[#1A1A1A]">
                        <div className="truncate max-w-[160px] sm:max-w-none">{item.prenom} {item.nom}</div>
                        <div className="text-[10px] text-gray-400">{item.email}</div>
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 font-medium text-gray-700 whitespace-nowrap">{cls?.nom || 'Section A'}</td>
                      <td className="px-4 sm:px-6 py-3.5 text-gray-600">
                        {item.tuteur_nom ? (
                          <div>
                            <span className="font-semibold">{item.tuteur_prenom} {item.tuteur_nom}</span>
                            <div className="text-[10px] text-gray-400 font-mono">{item.tuteur_telephone}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Non renseigné</span>
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          isBlocked
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : isInactive
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {isBlocked ? (
                            <>
                              <Lock className="w-3 h-3 text-red-600" />
                              Accès Bloqué
                            </>
                          ) : isInactive ? (
                            <>
                              <XCircle className="w-3 h-3 text-amber-600" />
                              Désactivé
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              Compte Actif
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 text-right whitespace-nowrap space-x-1">
                        {/* Quick Lock / Unlock Buttons */}
                        {isBlocked ? (
                          <button
                            onClick={() => handleToggleStudentLock(item, 'Actif')}
                            title="Débloquer le compte étudiant"
                            className="p-1.5 bg-emerald-50 text-emerald-700 rounded-[8px] hover:bg-emerald-100 transition-colors inline-flex items-center justify-center gap-1"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleStudentLock(item, 'Bloqué')}
                            title="Bloquer l'accès étudiant"
                            className="p-1.5 bg-red-50 text-red-600 rounded-[8px] hover:bg-red-100 transition-colors inline-flex items-center justify-center gap-1"
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => { setViewingItem(item); setIsDetailModalOpen(true); }}
                          title="Consulter la fiche complète"
                          className="p-1.5 bg-blue-50 text-[#0066FF] rounded-[8px] hover:bg-blue-100 transition-colors inline-flex items-center justify-center"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenModal(item)}
                          title="Modifier"
                          className="p-1.5 bg-gray-100 text-gray-700 rounded-[8px] hover:bg-gray-200 transition-colors inline-flex items-center justify-center"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          title="Supprimer"
                          className="p-1.5 bg-red-50 text-red-600 rounded-[8px] hover:bg-red-100 transition-colors"
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

      {/* Modal Add / Edit Student (Requirements 1 & 7) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Modifier la Fiche Étudiant' : 'Inscrire un Nouvel Étudiant'}
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Matricule Unique *</label>
              <input
                type="text"
                value={formData.matricule}
                onChange={(e) => setFormData({ ...formData, matricule: e.target.value })}
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] font-mono font-bold"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Classe / Promotion *</label>
              <select
                value={formData.classe_id}
                onChange={(e) => setFormData({ ...formData, classe_id: Number(e.target.value) })}
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] bg-white font-medium"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Prénom *</label>
              <input
                type="text"
                value={formData.prenom}
                onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                placeholder="Ex: Modibo"
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px]"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Nom *</label>
              <input
                type="text"
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                placeholder="Ex: Sidibé"
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px]"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Sexe *</label>
              <select
                value={formData.sexe}
                onChange={(e) => setFormData({ ...formData, sexe: e.target.value as 'M' | 'F' })}
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] bg-white"
              >
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Date de Naissance *</label>
              <input
                type="date"
                value={formData.date_naissance}
                onChange={(e) => setFormData({ ...formData, date_naissance: e.target.value })}
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px]"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Lieu de Naissance</label>
              <input
                type="text"
                value={formData.lieu_naissance}
                onChange={(e) => setFormData({ ...formData, lieu_naissance: e.target.value })}
                placeholder="Bamako, Mali"
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px]"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Nationalité</label>
              <input
                type="text"
                value={formData.nationalite}
                onChange={(e) => setFormData({ ...formData, nationalite: e.target.value })}
                placeholder="Malienne"
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Email Personnel *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="etudiant@usttb.edu.ml"
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px]"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Téléphone Mobile</label>
              <input
                type="text"
                value={formData.telephone}
                onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                placeholder="+223 70 00 00 00"
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px]"
              />
            </div>
          </div>

          {/* SECTION TUTEUR DE L'ÉTUDIANT (Requirement 1) */}
          <div className="p-3.5 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-3">
            <h4 className="font-bold text-xs text-blue-900 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-blue-600" />
              Informations du Tuteur / Responsable Légal
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nom du Tuteur</label>
                <input
                  type="text"
                  value={formData.tuteur_nom}
                  onChange={(e) => setFormData({ ...formData, tuteur_nom: e.target.value })}
                  placeholder="Nom du tuteur"
                  className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Prénom du Tuteur</label>
                <input
                  type="text"
                  value={formData.tuteur_prenom}
                  onChange={(e) => setFormData({ ...formData, tuteur_prenom: e.target.value })}
                  placeholder="Prénom du tuteur"
                  className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Téléphone du Tuteur</label>
                <input
                  type="text"
                  value={formData.tuteur_telephone}
                  onChange={(e) => setFormData({ ...formData, tuteur_telephone: e.target.value })}
                  placeholder="+223 66 00 11 22"
                  className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl font-mono"
                />
              </div>
            </div>
          </div>

          {/* SECTION MOT DE PASSE DU COMPTE */}
          <div className="p-3.5 bg-amber-50/60 rounded-2xl border border-amber-200/80 space-y-2">
            <h4 className="font-bold text-xs text-amber-900 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-amber-600" />
              Mot de Passe de Connexion de l'Étudiant
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1 text-xs">Mot de passe de l'étudiant *</label>
                <input
                  type="text"
                  value={formData.mot_de_passe || ''}
                  onChange={(e) => setFormData({ ...formData, mot_de_passe: e.target.value })}
                  placeholder="Mot de passe..."
                  className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl font-mono text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-600"
                  required
                />
              </div>
              <div className="flex items-center">
                <p className="text-[11px] text-amber-800 leading-tight">
                  L'étudiant utilisera ce mot de passe pour se connecter à son portail avec son matricule (ex: <b>{formData.matricule}</b>) ou son email.
                </p>
              </div>
            </div>
          </div>

          {/* SECTION STATUT ET ACCÈS DU COMPTE (Requirement 7) */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <label className="block font-bold text-xs text-slate-800">
              Statut du Compte / Accès à la Plateforme (Individuel)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, statut_compte: 'Actif', est_bloque: false })}
                className={`py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                  formData.statut_compte === 'Actif'
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Activer le Compte
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, statut_compte: 'Inactif', est_bloque: false })}
                className={`py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                  formData.statut_compte === 'Inactif'
                    ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <XCircle className="w-3.5 h-3.5" />
                Désactiver le Compte
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, statut_compte: 'Bloqué', est_bloque: true })}
                className={`py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                  formData.statut_compte === 'Bloqué'
                    ? 'bg-red-600 text-white border-red-700 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                Bloquer l'Accès
              </button>
            </div>
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
              className="h-[44px] px-6 bg-[#0066FF] hover:bg-blue-700 text-white font-semibold rounded-[14px]"
            >
              Enregistrer
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Fiche Détaillée Étudiant */}
      {viewingItem && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Fiche Étudiant : ${viewingItem.prenom} ${viewingItem.nom}`}
        >
          <div className="space-y-6 text-xs text-[#1A1A1A]">
            <div className="p-4 bg-gray-50 rounded-[16px] border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="px-2.5 py-0.5 bg-blue-100 text-[#0066FF] rounded-full text-[10px] font-bold font-mono">
                  {viewingItem.matricule}
                </span>
                <h3 className="text-base font-bold mt-1 text-[#1A1A1A]">
                  {viewingItem.prenom} {viewingItem.nom}
                </h3>
                <p className="text-gray-500">Né(e) le {viewingItem.date_naissance} à {viewingItem.lieu_naissance}</p>
              </div>
              <div className="text-right">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                  viewingItem.est_bloque || viewingItem.statut_compte === 'Bloqué'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}>
                  Compte : {viewingItem.statut_compte || (viewingItem.est_bloque ? 'Bloqué' : 'Actif')}
                </span>
                <span className="text-[10px] text-gray-400 mt-1 block font-medium">Inscrit le {viewingItem.date_inscription}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-[16px] border border-gray-100">
              <div>
                <span className="text-gray-400 block font-semibold">Email :</span>
                <span className="font-medium text-[#1A1A1A]">{viewingItem.email}</span>
              </div>
              <div>
                <span className="text-gray-400 block font-semibold">Téléphone :</span>
                <span className="font-medium text-[#1A1A1A]">{viewingItem.telephone || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-400 block font-semibold">Nom & Tél du Tuteur :</span>
                <span className="font-bold text-[#1A1A1A]">
                  {viewingItem.tuteur_nom ? `${viewingItem.tuteur_prenom} ${viewingItem.tuteur_nom} (${viewingItem.tuteur_telephone})` : 'Non renseigné'}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block font-semibold">Adresse :</span>
                <span className="font-medium text-[#1A1A1A]">{viewingItem.adresse}</span>
              </div>
            </div>

            {/* Financial summary */}
            <div>
              <h4 className="font-bold text-sm text-[#1A1A1A] mb-2">Historique des Paiements</h4>
              <div className="space-y-2">
                {paiements.filter(p => p.etudiant_id === viewingItem.id).map(p => (
                  <div key={p.id} className="p-3 bg-gray-50 rounded-[12px] flex items-center justify-between border border-gray-200">
                    <div>
                      <p className="font-bold">{p.type_frais} - {p.filiere_nom || p.filiere_code || 'Scolarité'}</p>
                      <p className="text-[10px] text-gray-400">{p.mode_paiement} • Réf: {p.reference_recu}</p>
                    </div>
                    <span className="font-bold text-emerald-600">{p.montant_paye.toLocaleString()} FCFA</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 font-semibold rounded-[12px]"
              >
                Fermer
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirm Modal */}
      <ConfirmModal
        isOpen={!!deleteConfirmStudent}
        title="Confirmer la suppression"
        message={deleteConfirmStudent ? `Voulez-vous vraiment supprimer l'étudiant ${deleteConfirmStudent.prenom} ${deleteConfirmStudent.nom} (${deleteConfirmStudent.matricule}) ? Il sera déplacé vers la Corbeille.` : ''}
        confirmLabel="Oui, supprimer"
        onConfirm={executeDeleteStudent}
        onClose={() => setDeleteConfirmStudent(null)}
      />

    </div>
  );
};
