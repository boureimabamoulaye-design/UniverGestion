import React, { useState, useEffect, useRef } from 'react';
import { DB } from '../lib/storage';
import { SupportCours, AuthUser } from '../types/database';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { BookOpen, Plus, Search, Pencil, Trash2, Download, FileText, Upload, CheckCircle2, X, LayoutGrid, List } from 'lucide-react';

interface SupportsCoursViewProps {
  currentUser: AuthUser;
}

export const SupportsCoursView: React.FC<SupportsCoursViewProps> = ({ currentUser }) => {
  const isAdmin = currentUser.role?.toUpperCase() !== 'ETUDIANT';
  const [list, setList] = useState<SupportCours[]>(DB.getSupportsCours());

  useEffect(() => {
    const handleSync = () => setList(DB.getSupportsCours());
    window.addEventListener('unigestion_db_change', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('unigestion_db_change', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const studentDetail = currentUser.role === 'ETUDIANT' ? (currentUser.etudiantDetail || DB.getEtudiants().find(e => e.id === currentUser.id)) : null;
  const studentEnrollment = studentDetail ? DB.getStudentActiveEnrollment(studentDetail.id) : null;
  const hasActiveInscription = isAdmin || (studentEnrollment && studentEnrollment.hasActiveEnrollment);

  const allMatieres = DB.getMatieres();
  const filieres = DB.getFilieres();
  const allSemestres = DB.getSemestres();

  // For students, filter matieres strictly to their actively enrolled filiere
  const matieres = isAdmin 
    ? allMatieres 
    : allMatieres.filter(m => Number(m.filiere_id) === Number(studentEnrollment?.filiereId));
  
  const semestres = isAdmin
    ? allSemestres
    : allSemestres.filter(s => !studentEnrollment?.niveau?.id || Number(s.niveau_id) === Number(studentEnrollment.niveau.id));

  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SupportCours | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [selectedSemestreFilter, setSelectedSemestreFilter] = useState<string>('all');
  const [selectedMatiereFilter, setSelectedMatiereFilter] = useState<string>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    titre: '',
    matiere_id: matieres[0]?.id || 0,
    filiere_id: filieres[0]?.id || 0,
    type_document: 'PDF' as SupportCours['type_document'],
    fichier_url: '',
    fichier_nom: '',
    description: ''
  });

  const handleOpenModal = (item?: SupportCours) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        titre: item.titre,
        matiere_id: item.matiere_id || 0,
        filiere_id: item.filiere_id || 0,
        type_document: item.type_document || 'PDF',
        fichier_url: item.fichier_url || '',
        fichier_nom: item.titre || '',
        description: item.description || ''
      });
    } else {
      setEditingItem(null);
      setFormData({
        titre: '',
        matiere_id: matieres[0]?.id || 0,
        filiere_id: filieres[0]?.id || 0,
        type_document: 'PDF',
        fichier_url: '',
        fichier_nom: '',
        description: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const fileDataUrl = event.target?.result as string || '';
        const detectedType: SupportCours['type_document'] = 
          (file.name.endsWith('.ppt') || file.name.endsWith('.pptx')) ? 'Diaporama PPT' :
          (file.name.endsWith('.doc') || file.name.endsWith('.docx')) ? 'Fiche TP/TD' : 'PDF';
        
        setFormData(prev => ({
          ...prev,
          fichier_url: fileDataUrl,
          fichier_nom: file.name,
          type_document: detectedType,
          titre: prev.titre || file.name.replace(/\.[^/.]+$/, '')
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMatiereChange = (selectedMatiereId: number) => {
    const foundMatiere = matieres.find(m => m.id === selectedMatiereId);
    setFormData(prev => ({
      ...prev,
      matiere_id: selectedMatiereId,
      filiere_id: foundMatiere ? foundMatiere.filiere_id : prev.filiere_id
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    DB.saveSupportCours({
      ...(editingItem ? { id: editingItem.id } : {}),
      titre: formData.titre || formData.fichier_nom || 'Support sans titre',
      matiere_id: Number(formData.matiere_id) || undefined,
      filiere_id: Number(formData.filiere_id) || undefined,
      type_document: formData.type_document,
      fichier_url: formData.fichier_url,
      description: formData.description,
      publie_par: `${currentUser.prenom} ${currentUser.nom}`,
      date_publication: new Date().toISOString().split('T')[0]
    });

    setList(DB.getSupportsCours());
    setIsModalOpen(false);
  };

  const handleDelete = (id: number) => {
    setDeleteConfirmId(id);
  };

  const executeDeleteSupport = () => {
    if (deleteConfirmId !== null) {
      DB.deleteSupportCours(deleteConfirmId);
      setList(DB.getSupportsCours());
      setDeleteConfirmId(null);
    }
  };

  const handleSecureDownload = async (item: SupportCours) => {
    if (!item.fichier_url) return;
    if (isAdmin) {
      window.open(item.fichier_url, '_blank');
      return;
    }

    try {
      const res = await fetch(`/api/supports-cours/${item.id}/download?etudiant_id=${studentDetail?.id || currentUser.id}`);
      const data = await res.json().catch(() => ({}));
      if (res.status === 403 || data.authorized === false) {
        alert("Accès refusé : ce support de cours n'appartient pas à votre filière d'inscription.");
        return;
      }
      window.open(item.fichier_url, '_blank');
    } catch {
      window.open(item.fichier_url, '_blank');
    }
  };

  const studentFiliereId = studentEnrollment?.filiereId;
  const studentMatiereIds = new Set(matieres.map(m => m.id));

  const filtered = list.filter(item => {
    if (!isAdmin) {
      if (!studentFiliereId) return false;
      const matchesFiliere = !item.filiere_id || Number(item.filiere_id) === Number(studentFiliereId);
      const matchesMatiere = !item.matiere_id || studentMatiereIds.has(Number(item.matiere_id));
      if (!matchesFiliere && !matchesMatiere) return false;
    }

    const matchesSearch = item.titre.toLowerCase().includes(search.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(search.toLowerCase()));
    
    const matchesMatiere = selectedMatiereFilter === 'all' || item.matiere_id === Number(selectedMatiereFilter);

    let matchesSemestre = true;
    if (selectedSemestreFilter !== 'all') {
      const semId = Number(selectedSemestreFilter);
      if (item.matiere_id) {
        const mat = allMatieres.find(m => m.id === item.matiere_id);
        matchesSemestre = mat ? mat.semestre_id === semId : false;
      } else {
        matchesSemestre = true;
      }
    }

    return matchesSearch && matchesMatiere && matchesSemestre;
  });

  if (!isAdmin && !hasActiveInscription) {
    return (
      <div className="bg-white rounded-2xl border border-amber-200 p-8 text-center space-y-4 max-w-xl mx-auto my-8">
        <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto">
          <BookOpen className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">Aucune Inscription Active</h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          Aucune inscription active n'est disponible pour votre dossier. Vous ne pouvez pas accéder aux supports de cours tant que votre inscription dans une filière n'est pas validée par la scolarité.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-[#1A1A1A]">Supports de Cours & Fichiers Pédagogiques</h2>
          <p className="text-xs text-gray-500 mt-0.5">Consultez, téléchargez et téléversez des supports depuis votre galerie/appareil (PDF, PPT, Fiches TP).</p>
        </div>
        {isAdmin && (
          <button type="button"
            onClick={() => handleOpenModal()}
            className="h-[40px] px-3.5 bg-[#0066FF] hover:bg-blue-700 text-white rounded-[12px] text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs shrink-0"
          >
            <Plus className="w-4 h-4" />
            Nouveau Support
          </button>
        )}
      </div>

      {/* Search, Filter & View Toggle */}
      <div className="bg-white p-3 sm:p-3.5 rounded-[16px] border border-[#E5E7EB] shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5">
        {/* Search Bar */}
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un support de cours..."
            className="w-full h-[40px] pl-9 pr-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-[12px] text-xs font-medium focus:outline-none focus:border-[#0066FF] transition-colors"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

        {/* Dropdowns & Mode Switcher in stacked columns on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-center gap-2.5 w-full lg:w-auto">
          {matieres.length > 0 && (
            <div className="w-full lg:w-48">
              <select
                value={selectedMatiereFilter}
                onChange={(e) => setSelectedMatiereFilter(e.target.value)}
                className="w-full h-[40px] bg-[#F9FAFB] border border-[#E5E7EB] rounded-[12px] px-3 text-xs font-semibold text-gray-700 focus:outline-none focus:border-[#0066FF] transition-colors"
              >
                <option value="all">Toutes les Matières</option>
                {matieres.map(m => (
                  <option key={m.id} value={m.id}>{m.code ? `${m.code} - ${m.nom}` : m.nom}</option>
                ))}
              </select>
            </div>
          )}

          {semestres.length > 0 && (
            <div className="w-full lg:w-44">
              <select
                value={selectedSemestreFilter}
                onChange={(e) => setSelectedSemestreFilter(e.target.value)}
                className="w-full h-[40px] bg-[#F9FAFB] border border-[#E5E7EB] rounded-[12px] px-3 text-xs font-semibold text-gray-700 focus:outline-none focus:border-[#0066FF] transition-colors"
              >
                <option value="all">Tous Semestres</option>
                {semestres.map(s => (
                  <option key={s.id} value={s.id}>{s.libelle} ({s.code})</option>
                ))}
              </select>
            </div>
          )}

          {/* Mode Switcher */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-1 flex items-center justify-center gap-1 bg-[#F9FAFB] p-1 border border-[#E5E7EB] rounded-[12px] h-[40px] shrink-0">
            <button type="button"
              onClick={() => setViewMode('grid')}
              className={`flex-1 lg:flex-none px-3 h-full rounded-[8px] text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                viewMode === 'grid' ? 'bg-white text-[#0066FF] shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
              title="Cartes Rectangles Compactes"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Rectangles</span>
            </button>
            <button type="button"
              onClick={() => setViewMode('table')}
              className={`flex-1 lg:flex-none px-3 h-full rounded-[8px] text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                viewMode === 'table' ? 'bg-white text-[#0066FF] shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
              title="Tableau"
            >
              <List className="w-3.5 h-3.5" />
              <span>Tableau</span>
            </button>
          </div>
        </div>
      </div>

      {/* RECTANGULAR CARDS GRID VIEW - ENLARGED & PERFECTLY ALIGNED ON MOBILE */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-4.5">
          {filtered.length > 0 ? (
            filtered.map((item) => {
              const mat = matieres.find(m => m.id === item.matiere_id);
              const fil = filieres.find(f => f.id === item.filiere_id);
              const sem = mat ? semestres.find(s => s.id === mat.semestre_id) : null;

              const getTypeBadge = (type: string) => {
                switch (type) {
                  case 'PDF':
                    return 'bg-red-50 text-red-700 border-red-200';
                  case 'Diaporama PPT':
                    return 'bg-amber-50 text-amber-700 border-amber-200';
                  case 'Fiche TP/TD':
                    return 'bg-blue-50 text-blue-700 border-blue-200';
                  case 'Devoir / Exercice':
                    return 'bg-purple-50 text-purple-700 border-purple-200';
                  default:
                    return 'bg-gray-100 text-gray-700 border-gray-200';
                }
              };

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-[16px] border border-[#E5E7EB] p-4 sm:p-4.5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-3.5 group"
                >
                  {/* Top Bar: Type Badge & Admin Actions */}
                  <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${getTypeBadge(item.type_document)}`}>
                      <FileText className="w-3.5 h-3.5" />
                      <span>{item.type_document}</span>
                    </span>

                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button type="button"
                          onClick={() => handleOpenModal(item)}
                          className="p-1.5 text-gray-400 hover:text-[#0066FF] rounded-lg hover:bg-blue-50 transition-colors"
                          title="Modifier"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button type="button"
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-1.5 flex-1">
                    <h3 className="font-bold text-sm sm:text-xs md:text-sm text-[#1A1A1A] group-hover:text-[#0066FF] transition-colors leading-snug line-clamp-2">
                      {item.titre}
                    </h3>
                    {item.description && (
                      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                        {item.description}
                      </p>
                    )}
                  </div>

                  {/* Metadata Chips - Clean Column / Row Grid */}
                  <div className="space-y-2 pt-2 border-t border-gray-100 text-xs">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-800 font-semibold rounded-lg text-xs truncate max-w-full">
                        {mat?.nom || 'Général'}
                      </span>
                      {sem && (
                        <span className="px-2 py-1 bg-purple-50 text-purple-700 font-bold rounded-lg text-xs shrink-0">
                          {sem.code}
                        </span>
                      )}
                      {fil && (
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 font-semibold rounded-lg text-xs shrink-0">
                          {fil.code}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-400 font-medium pt-0.5">
                      <span className="truncate max-w-[140px]">Par {item.publie_par || 'Enseignant'}</span>
                      <span className="font-mono text-[11px]">{item.date_publication}</span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="pt-1">
                    {item.fichier_url ? (
                      <button
                        type="button"
                        onClick={() => handleSecureDownload(item)}
                        className="w-full h-[38px] bg-[#0066FF] hover:bg-blue-700 text-white rounded-[12px] text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs"
                      >
                        <Download className="w-4 h-4" />
                        <span>Télécharger le Support</span>
                      </button>
                    ) : (
                      <div className="w-full h-[38px] bg-gray-100 text-gray-500 rounded-[12px] text-xs font-semibold flex items-center justify-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span>Document Indisponible</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full bg-white p-8 rounded-[16px] border border-[#E5E7EB] text-center text-gray-400 text-xs font-medium">
              Aucun support de cours disponible pour ce filtre.
            </div>
          )}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  <th className="px-6 py-4">Titre du Support</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Matière / Filière</th>
                  <th className="px-6 py-4">Publié par</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-gray-100">
                {filtered.length > 0 ? (
                  filtered.map((item) => {
                    const mat = allMatieres.find(m => m.id === item.matiere_id);
                    const fil = filieres.find(f => f.id === item.filiere_id);
                    return (
                      <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-[#1A1A1A]">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0066FF] flex items-center justify-center flex-shrink-0">
                              <BookOpen className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="block font-bold text-[#1A1A1A]">{item.titre}</span>
                              {item.description && <span className="text-[11px] text-gray-400 font-normal block">{item.description}</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md font-bold text-[11px]">
                            {item.type_document}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          <span className="font-semibold block text-[#1A1A1A]">{mat?.nom || 'Général'}</span>
                          <span className="text-[10px] text-gray-400 block">{fil?.code || 'Toutes filières'}</span>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{item.publie_par || 'Enseignant'}</td>
                        <td className="px-6 py-4 text-gray-500 font-mono text-[11px]">{item.date_publication}</td>
                        <td className="px-6 py-4 text-right space-x-2">
                          {item.fichier_url ? (
                            <button
                              type="button"
                              onClick={() => handleSecureDownload(item)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 text-[#0066FF] hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Télécharger</span>
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-semibold">
                              <FileText className="w-3.5 h-3.5" />
                              <span>Document</span>
                            </span>
                          )}
                          {isAdmin && (
                            <>
                              <button type="button"
                                onClick={() => handleOpenModal(item)}
                                className="p-1.5 text-gray-400 hover:text-[#0066FF] rounded-lg hover:bg-blue-50 transition-colors"
                                title="Modifier"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button type="button"
                                onClick={() => handleDelete(item.id)}
                                className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                                title="Supprimer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                      Aucun support de cours disponible pour le moment.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Add / Edit */}
      {isAdmin && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingItem ? 'Modifier le Support de Cours' : 'Ajouter un Support de Cours'}
        >
          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-[#1A1A1A] mb-1">Téléverser depuis Galerie / Appareil *</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.zip"
                className="hidden"
                onChange={handleFileSelect}
              />
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full sm:w-auto h-[44px] px-4 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-[#0066FF] rounded-[14px] font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  <span>Choisir un fichier dans la galerie / appareil</span>
                </button>
                {formData.fichier_nom && (
                  <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-[12px] flex items-center gap-2 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span className="truncate max-w-[200px]">{formData.fichier_nom}</span>
                    <button
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, fichier_nom: '', fichier_url: '' }))}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Titre du Support *</label>
              <input
                type="text"
                value={formData.titre}
                onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                placeholder="Ex: Chapitre 1 - Introduction aux Algorithmes.pdf"
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px]"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Type de Document *</label>
                <select
                  value={formData.type_document}
                  onChange={(e) => setFormData({ ...formData, type_document: e.target.value as any })}
                  className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] bg-white font-medium"
                  required
                >
                  <option value="PDF">PDF</option>
                  <option value="Diaporama PPT">Diaporama PPT</option>
                  <option value="Fiche TP/TD">Fiche TP/TD</option>
                  <option value="Devoir / Exercice">Devoir / Exercice</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Matière Associée</label>
                <select
                  value={formData.matiere_id}
                  onChange={(e) => handleMatiereChange(Number(e.target.value))}
                  className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] bg-white font-medium"
                >
                  <option value="0">Aucune / Support Général</option>
                  {matieres.map(m => {
                    const mFil = filieres.find(f => f.id === m.filiere_id);
                    return (
                      <option key={m.id} value={m.id}>
                        {m.code} - {m.nom} {mFil ? `(${mFil.code})` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Filière Cible</label>
              <select
                value={formData.filiere_id}
                onChange={(e) => setFormData({ ...formData, filiere_id: Number(e.target.value) })}
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] bg-white font-medium"
              >
                <option value="0">Toutes les Filières</option>
                {filieres.map(f => (
                  <option key={f.id} value={f.id}>{f.code} - {f.nom}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Lien / URL Web (optionnel si téléversé)</label>
              <input
                type="text"
                value={formData.fichier_url}
                onChange={(e) => setFormData({ ...formData, fichier_url: e.target.value })}
                placeholder="Ex: https://drive.google.com/file/d/... ou lien externe"
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px]"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Description / Objectifs</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Ex: Résumé du cours, objectifs pédagogiques et exercices d'entraînement..."
                className="w-full p-3 border border-[#E5E7EB] rounded-[14px] h-20"
              />
            </div>

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2.5 border border-[#E5E7EB] text-gray-700 rounded-[12px] hover:bg-gray-50 font-semibold"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2.5 bg-[#0066FF] hover:bg-blue-700 text-white rounded-[12px] font-semibold"
              >
                Enregistrer
              </button>
            </div>
          </form>
        </Modal>
      )}

      <ConfirmModal
        isOpen={deleteConfirmId !== null}
        title="Confirmer la suppression du support"
        message="Voulez-vous vraiment supprimer ce support de cours ?"
        confirmLabel="Oui, supprimer"
        onConfirm={executeDeleteSupport}
        onClose={() => setDeleteConfirmId(null)}
      />

    </div>
  );
};
