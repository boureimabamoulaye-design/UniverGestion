import React, { useState, useRef } from 'react';
import { DB } from '../lib/storage';
import { Matiere } from '../types/database';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { FileText, Plus, Search, Upload, CheckCircle2, X, ExternalLink, BookOpen, Layers, Calendar } from 'lucide-react';

export const MatieresView: React.FC = () => {
  const [list, setList] = useState<Matiere[]>(DB.getMatieres());
  const filieres = DB.getFilieres();
  const semestres = DB.getSemestres();
  const enseignants = DB.getEnseignants();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Matiere | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [selectedFiliereFilter, setSelectedFiliereFilter] = useState<string>('all');
  const [selectedSemestreFilter, setSelectedSemestreFilter] = useState<string>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    code: '',
    nom: '',
    filiere_id: filieres[0]?.id || 1,
    semestre_id: semestres[0]?.id || 1,
    enseignant_nom: '',
    ue_type: 'Majeure' as 'Majeure' | 'Mineure',
    credits: 3,
    support_titre: '',
    support_type_document: 'PDF' as 'PDF' | 'Diaporama PPT' | 'Fiche TP/TD' | 'Devoir / Exercice',
    support_description: '',
    support_fichier_nom: '',
    support_fichier_url: ''
  });

  const handleOpenModal = (item?: Matiere) => {
    if (item) {
      setEditingItem(item);
      const ens = enseignants.find(e => e.id === item.enseignant_id);
      const defaultEnsNom = item.enseignant_nom || (ens ? `${ens.titre} ${ens.prenom} ${ens.nom}` : '');
      setFormData({
        code: item.code,
        nom: item.nom,
        filiere_id: item.filiere_id,
        semestre_id: item.semestre_id || semestres[0]?.id || 1,
        enseignant_nom: defaultEnsNom,
        ue_type: item.ue_type || 'Majeure',
        credits: item.credits || 3,
        support_titre: item.support_titre || '',
        support_type_document: (item.support_type_document as any) || 'PDF',
        support_description: item.support_description || '',
        support_fichier_nom: item.support_fichier_nom || '',
        support_fichier_url: item.support_fichier_url || ''
      });
    } else {
      setEditingItem(null);
      // Auto-select based on active filters if set
      const defaultFiliereId = selectedFiliereFilter !== 'all' ? Number(selectedFiliereFilter) : (filieres[0]?.id || 1);
      const defaultSemestreId = selectedSemestreFilter !== 'all' ? Number(selectedSemestreFilter) : (semestres[0]?.id || 1);

      setFormData({
        code: '',
        nom: '',
        filiere_id: defaultFiliereId,
        semestre_id: defaultSemestreId,
        enseignant_nom: '',
        ue_type: 'Majeure',
        credits: 3,
        support_titre: '',
        support_type_document: 'PDF',
        support_description: '',
        support_fichier_nom: '',
        support_fichier_url: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isPpt = file.name.endsWith('.ppt') || file.name.endsWith('.pptx');
      const isDoc = file.name.endsWith('.doc') || file.name.endsWith('.docx');
      const detectedType = isPpt ? 'Diaporama PPT' : (isDoc ? 'Fiche TP/TD' : 'PDF');

      const reader = new FileReader();
      reader.onload = (event) => {
        const fileDataUrl = event.target?.result as string || '';
        setFormData(prev => ({
          ...prev,
          support_fichier_nom: file.name,
          support_fichier_url: fileDataUrl,
          support_type_document: prev.support_type_document || detectedType,
          support_titre: prev.support_titre || `Polycopié : ${file.name.replace(/\.[^/.]+$/, "")}`
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.nom) return;

    DB.saveMatiere({
      ...(editingItem ? { id: editingItem.id } : {}),
      ...formData,
      filiere_id: Number(formData.filiere_id),
      niveau_id: 1,
      semestre_id: Number(formData.semestre_id),
      enseignant_nom: formData.enseignant_nom,
      ue_type: formData.ue_type,
      credits: Number(formData.credits)
    });

    setList(DB.getMatieres());
    setIsModalOpen(false);
  };

  const handleDelete = (id: number) => {
    setDeleteConfirmId(id);
  };

  const executeDeleteMatiere = () => {
    if (deleteConfirmId !== null) {
      const mat = list.find(m => m.id === deleteConfirmId);
      if (mat) {
        DB.moveToCorbeille('MATIERE', mat.id, `${mat.code} - ${mat.nom}`, `Crédits: ${mat.credits}`, mat);
        DB.deleteMatiere(deleteConfirmId);
        setList(DB.getMatieres());
      }
      setDeleteConfirmId(null);
    }
  };

  const handleOpenSupportFile = (url?: string) => {
    if (url) {
      window.open(url, '_blank');
    }
  };

  const filtered = list.filter(m => {
    const matchesSearch = m.nom.toLowerCase().includes(search.toLowerCase()) ||
      m.code.toLowerCase().includes(search.toLowerCase());
    const matchesFiliere = selectedFiliereFilter === 'all' || Number(m.filiere_id) === Number(selectedFiliereFilter);
    const matchesSemestre = selectedSemestreFilter === 'all' || Number(m.semestre_id) === Number(selectedSemestreFilter);
    return matchesSearch && matchesFiliere && matchesSemestre;
  });

  // Calculate semester distribution stats for active filiere
  const filiereMatieres = list.filter(m => selectedFiliereFilter === 'all' || Number(m.filiere_id) === Number(selectedFiliereFilter));

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1A1A1A]">Gestion des Matières & Programmes Semestriels</h2>
          <p className="text-xs text-gray-500 mt-1">Chaque semestre regroupe ses propres matières, crédits ECTS et supports pédagogiques rattachés.</p>
        </div>
        <button
          type="button"
          onClick={() => handleOpenModal()}
          className="h-[44px] px-5 bg-[#0066FF] hover:bg-blue-700 text-white rounded-[14px] text-xs font-semibold flex items-center gap-2 transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Ajouter une Matière
        </button>
      </div>

      {/* Semester Scoping Informative Banner & Quick Semester Tabs */}
      <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-200/80 rounded-[18px] p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0066FF] text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-xs text-slate-900">Organisation Pédagogique Semestre par Semestre</h3>
              <p className="text-[11px] text-slate-600">Filtrer ou ajouter les matières spécifiques à chaque semestre du parcours.</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedSemestreFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedSemestreFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Tous les semestres ({filiereMatieres.length})
            </button>
            {semestres.map(s => {
              const count = filiereMatieres.filter(m => Number(m.semestre_id) === Number(s.id)).length;
              const totalCredits = filiereMatieres
                .filter(m => Number(m.semestre_id) === Number(s.id))
                .reduce((acc, curr) => acc + (curr.credits || 0), 0);
              const isActive = selectedSemestreFilter === String(s.id);

              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedSemestreFilter(String(s.id))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <span>{s.libelle}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {count} mat. ({totalCredits} ECTS)
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="bg-white p-4 rounded-[20px] border border-[#E5E7EB] shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une matière par code, intitulé..."
            className="w-full h-[44px] bg-[#F9FAFB] border border-[#E5E7EB] rounded-[14px] pl-10 pr-4 text-sm focus:outline-none focus:border-[#0066FF]"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        </div>

        <div className="w-full sm:w-56">
          <select
            value={selectedFiliereFilter}
            onChange={(e) => setSelectedFiliereFilter(e.target.value)}
            className="w-full h-[44px] bg-[#F9FAFB] border border-[#E5E7EB] rounded-[14px] px-3 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#0066FF] cursor-pointer"
          >
            <option value="all">Toutes les Filières</option>
            {filieres.map(f => (
              <option key={f.id} value={f.id}>{f.code} - {f.nom}</option>
            ))}
          </select>
        </div>

        <div className="w-full sm:w-52">
          <select
            value={selectedSemestreFilter}
            onChange={(e) => setSelectedSemestreFilter(e.target.value)}
            className="w-full h-[44px] bg-[#F9FAFB] border border-[#E5E7EB] rounded-[14px] px-3 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#0066FF] cursor-pointer"
          >
            <option value="all">Tous les Semestres</option>
            {semestres.map(s => (
              <option key={s.id} value={s.id}>{s.libelle} ({s.code})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                <th className="px-6 py-4">Code</th>
                <th className="px-6 py-4">Nom de la Matière / UE</th>
                <th className="px-6 py-4">Semestre Dédié</th>
                <th className="px-6 py-4">Filière</th>
                <th className="px-6 py-4">Enseignant Titulaire</th>
                <th className="px-6 py-4">Support de Cours</th>
                <th className="px-6 py-4 text-center">Crédits (ECTS)</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-400 font-medium">
                    Aucune matière trouvée pour cette sélection de semestre et filière.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const fil = filieres.find(f => f.id === item.filiere_id);
                  const sem = semestres.find(s => s.id === item.semestre_id);
                  const ens = enseignants.find(e => e.id === item.enseignant_id);
                  const displayTeacher = item.enseignant_nom || (ens ? `${ens.titre} ${ens.prenom} ${ens.nom}` : 'Non assigné');
                  const isMineure = item.ue_type === 'Mineure';
                  const hasSupport = !!(item.support_fichier_nom || item.support_fichier_url);

                  const isS1 = item.semestre_id === 1 || sem?.code === 'S1';
                  const isS2 = item.semestre_id === 2 || sem?.code === 'S2';

                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-[#0066FF]">{item.code}</td>
                      <td className="px-6 py-4 font-semibold text-[#1A1A1A] max-w-[200px]">
                        <div>{item.nom}</div>
                        <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-bold rounded-md border ${
                          isMineure
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-blue-50 text-[#0066FF] border-blue-200'
                        }`}>
                          UE {item.ue_type || 'Majeure'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold text-xs border ${
                          isS1
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : isS2
                              ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                              : 'bg-purple-50 text-purple-800 border-purple-200'
                        }`}>
                          <Calendar className="w-3.5 h-3.5 opacity-70" />
                          <span>{sem?.libelle || `Semestre ${item.semestre_id || 1}`}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        <span className="font-bold block text-slate-900">{fil?.code || 'Filière'}</span>
                        <span className="text-[11px] text-gray-500">{fil?.nom}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-700 font-medium">
                        {displayTeacher}
                      </td>
                      <td className="px-6 py-4">
                        {hasSupport ? (
                          <div className="flex flex-col items-start gap-1">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-[11px] font-bold max-w-[220px]">
                              <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="truncate" title={item.support_titre || item.support_fichier_nom || 'Support disponible'}>
                                {item.support_titre || item.support_fichier_nom || 'Support disponible'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {item.support_type_document && (
                                <span className="text-[10px] text-emerald-700 bg-emerald-100/60 px-1.5 py-0.2 rounded font-medium">
                                  {item.support_type_document}
                                </span>
                              )}
                              {item.support_fichier_url && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenSupportFile(item.support_fichier_url)}
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-[#0066FF] hover:underline"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>Aperçu</span>
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenModal(item)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-slate-500 hover:text-[#0066FF] rounded-lg text-[11px] font-medium transition-colors"
                          >
                            <Upload className="w-3 h-3" />
                            <span>+ Joindre un support</span>
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-bold text-emerald-600 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-md">{item.credits} Crédits ECTS</span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleOpenModal(item)}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-[10px] text-xs font-semibold shrink-0"
                          >
                            Modifier
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-[10px] text-xs font-semibold shrink-0"
                          >
                            Supprimer
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

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Modifier la Matière & Programme' : 'Ajouter une Matière à un Semestre'}
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Code Matière *</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="Ex: INF101"
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] font-mono font-bold text-slate-800"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Intitulé de la Matière / UE *</label>
              <input
                type="text"
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                placeholder="Ex: Algorithmique et Programmation C"
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Filière Rattachée *</label>
              <select
                value={formData.filiere_id}
                onChange={(e) => setFormData({ ...formData, filiere_id: Number(e.target.value) })}
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] bg-white focus:outline-none focus:border-[#0066FF] font-semibold text-slate-800"
              >
                {filieres.map(f => (
                  <option key={f.id} value={f.id}>{f.code} - {f.nom}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Semestre d'Appartenance *</label>
              <select
                value={formData.semestre_id}
                onChange={(e) => setFormData({ ...formData, semestre_id: Number(e.target.value) })}
                className="w-full h-[44px] px-3 border border-[#0066FF] bg-blue-50/50 rounded-[14px] focus:outline-none font-bold text-blue-900"
              >
                {semestres.map(s => (
                  <option key={s.id} value={s.id}>{s.libelle} ({s.code})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Type d'Unité d'Enseignement (UE) *</label>
              <select
                value={formData.ue_type}
                onChange={(e) => setFormData({ ...formData, ue_type: e.target.value as 'Majeure' | 'Mineure' })}
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] bg-white font-medium focus:outline-none focus:border-[#0066FF]"
              >
                <option value="Majeure">UE Majeure</option>
                <option value="Mineure">UE Mineure</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Crédits ECTS *</label>
              <input
                type="number"
                min={1}
                max={30}
                value={formData.credits}
                onChange={(e) => setFormData({ ...formData, credits: Number(e.target.value) })}
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] focus:outline-none focus:border-[#0066FF] font-bold text-slate-800"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Enseignant Titulaire</label>
            <input
              type="text"
              value={formData.enseignant_nom}
              onChange={(e) => setFormData({ ...formData, enseignant_nom: e.target.value })}
              placeholder="Ex: Dr. Sékou KONATÉ"
              className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] focus:outline-none focus:border-[#0066FF]"
            />
          </div>

          {/* Section Support de Cours Rattaché */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-[18px] space-y-3">
            <div className="flex items-center justify-between">
              <label className="block font-bold text-slate-800 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-[#0066FF]" />
                <span>Support de Cours & Polycopié (Espace Étudiant)</span>
              </label>
              {formData.filiere_id && (
                <span className="text-[10px] font-bold text-[#0066FF] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                  Visible pour : {filieres.find(f => f.id === Number(formData.filiere_id))?.code || 'Filière'} - {semestres.find(s => s.id === Number(formData.semestre_id))?.libelle || 'Semestre'}
                </span>
              )}
            </div>

            <p className="text-[11px] text-gray-500">
              Rattachez un polycopié, diaporama ou support pédagogique. Dès l'enregistrement, il sera <strong>automatiquement visible et téléchargeable</strong> dans l'Espace Étudiant pour tous les inscrits de cette filière et de ce semestre.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Titre du Support</label>
                <input
                  type="text"
                  value={formData.support_titre}
                  onChange={(e) => setFormData({ ...formData, support_titre: e.target.value })}
                  placeholder="Ex: Polycopié Chapitres 1 à 6"
                  className="w-full h-[40px] px-3 bg-white border border-[#E5E7EB] rounded-[12px] focus:outline-none focus:border-[#0066FF]"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Type de Document</label>
                <select
                  value={formData.support_type_document}
                  onChange={(e) => setFormData({ ...formData, support_type_document: e.target.value as any })}
                  className="w-full h-[40px] px-3 bg-white border border-[#E5E7EB] rounded-[12px] focus:outline-none focus:border-[#0066FF] font-medium"
                >
                  <option value="PDF">Document PDF</option>
                  <option value="Diaporama PPT">Diaporama PPT / Présentation</option>
                  <option value="Fiche TP/TD">Fiche TP / TD / Exercices</option>
                  <option value="Devoir / Exercice">Devoir / Évaluation continue</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Description / Recommandations aux étudiants</label>
              <textarea
                rows={2}
                value={formData.support_description}
                onChange={(e) => setFormData({ ...formData, support_description: e.target.value })}
                placeholder="Ex: Polycopié de référence à lire avant chaque séance de travaux dirigés..."
                className="w-full p-2.5 bg-white border border-[#E5E7EB] rounded-[12px] focus:outline-none focus:border-[#0066FF] text-xs resize-none"
              />
            </div>

            {/* File Upload & File link */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.zip"
              className="hidden"
              onChange={handleFileSelect}
            />
            
            <div className="space-y-2 pt-1">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-[42px] px-4 bg-white border border-[#0066FF] text-[#0066FF] hover:bg-blue-50 rounded-[12px] font-bold flex items-center justify-center gap-2 transition-colors text-xs shadow-2xs shrink-0"
                >
                  <Upload className="w-4 h-4" />
                  <span>Choisir un fichier (appareil / galerie)</span>
                </button>

                {formData.support_fichier_nom && (
                  <div className="px-3.5 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-[12px] flex items-center justify-between gap-2 font-medium text-xs flex-1">
                    <div className="flex items-center gap-2 truncate">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span className="truncate font-semibold">{formData.support_fichier_nom}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, support_fichier_nom: '', support_fichier_url: '' }))}
                      className="text-gray-400 hover:text-red-500 p-1"
                      title="Retirer ce fichier"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {!formData.support_fichier_nom && (
                <div className="pt-1">
                  <span className="text-[10px] text-gray-400 block mb-1">Ou saisir l'URL directe d'un document / drive en ligne :</span>
                  <input
                    type="url"
                    value={formData.support_fichier_url}
                    onChange={(e) => setFormData({ ...formData, support_fichier_url: e.target.value, support_fichier_nom: formData.support_fichier_nom || 'Support Web' })}
                    placeholder="https://..."
                    className="w-full h-[38px] px-3 bg-white border border-[#E5E7EB] rounded-[10px] text-xs focus:outline-none focus:border-[#0066FF]"
                  />
                </div>
              )}
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
              Enregistrer la Matière & Support
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={deleteConfirmId !== null}
        title="Confirmer la suppression"
        message="Voulez-vous vraiment supprimer cette matière ? Elle sera envoyée dans la Corbeille avec ses supports rattachés."
        confirmLabel="Oui, supprimer"
        onConfirm={executeDeleteMatiere}
        onClose={() => setDeleteConfirmId(null)}
      />

    </div>
  );
};


