import React, { useState, useRef } from 'react';
import { DB } from '../lib/storage';
import { Matiere } from '../types/database';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { FileText, Plus, Search, Upload, Download, CheckCircle2, X } from 'lucide-react';

export const MatieresView: React.FC = () => {
  const [list, setList] = useState<Matiere[]>(DB.getMatieres());
  const filieres = DB.getFilieres();
  const semestres = DB.getSemestres();
  const enseignants = DB.getEnseignants();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Matiere | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    code: '',
    nom: '',
    filiere_id: filieres[0]?.id || 1,
    semestre_id: semestres[0]?.id || 1,
    enseignant_nom: '',
    ue_type: 'Majeure' as 'Majeure' | 'Mineure',
    credits: 3,
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
        semestre_id: item.semestre_id,
        enseignant_nom: defaultEnsNom,
        ue_type: item.ue_type || 'Majeure',
        credits: item.credits || 3,
        support_fichier_nom: item.support_fichier_nom || '',
        support_fichier_url: item.support_fichier_url || ''
      });
    } else {
      setEditingItem(null);
      setFormData({
        code: '',
        nom: '',
        filiere_id: filieres[0]?.id || 1,
        semestre_id: semestres[0]?.id || 1,
        enseignant_nom: '',
        ue_type: 'Majeure',
        credits: 3,
        support_fichier_nom: '',
        support_fichier_url: ''
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
        setFormData(prev => ({
          ...prev,
          support_fichier_nom: file.name,
          support_fichier_url: fileDataUrl
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.nom) return;

    const savedMatiere = DB.saveMatiere({
      ...(editingItem ? { id: editingItem.id } : {}),
      ...formData,
      filiere_id: Number(formData.filiere_id),
      niveau_id: 1,
      semestre_id: Number(formData.semestre_id),
      enseignant_nom: formData.enseignant_nom,
      ue_type: formData.ue_type,
      credits: Number(formData.credits)
    });

    // Auto sync with SupportsCours database if support file exists
    if (formData.support_fichier_nom || formData.support_fichier_url) {
      DB.saveSupportCours({
        titre: `Support - ${formData.nom}`,
        type_document: 'PDF',
        matiere_id: savedMatiere.id,
        filiere_id: Number(formData.filiere_id),
        fichier_url: formData.support_fichier_url || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        description: `Support de cours associé à l'unité d'enseignement ${formData.code} (${formData.nom}).`,
        publie_par: 'Enseignant Titulaire',
        date_publication: new Date().toISOString().split('T')[0]
      });
    }

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

  const filtered = list.filter(m =>
    m.nom.toLowerCase().includes(search.toLowerCase()) ||
    m.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1A1A1A]">Gestion des Matières & Unités d'Enseignement (UE)</h2>
          <p className="text-xs text-gray-500 mt-1">Modules, crédits ECTS/LMD et enseignants responsables.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="h-[44px] px-5 bg-[#0066FF] hover:bg-blue-700 text-white rounded-[14px] text-xs font-semibold flex items-center gap-2 transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Ajouter une Matière
        </button>
      </div>

      {/* Filter */}
      <div className="bg-white p-4 rounded-[20px] border border-[#E5E7EB] shadow-xs flex items-center gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une matière par code, nom..."
            className="w-full h-[44px] bg-[#F9FAFB] border border-[#E5E7EB] rounded-[14px] pl-10 pr-4 text-sm focus:outline-none focus:border-[#0066FF]"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
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
                <th className="px-6 py-4">Filière / Semestre</th>
                <th className="px-6 py-4">Enseignant Titulaire</th>
                <th className="px-6 py-4 text-center">Crédits (ECTS)</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-gray-100">
              {filtered.map((item) => {
                const fil = filieres.find(f => f.id === item.filiere_id);
                const sem = semestres.find(s => s.id === item.semestre_id);
                const ens = enseignants.find(e => e.id === item.enseignant_id);
                const displayTeacher = item.enseignant_nom || (ens ? `${ens.titre} ${ens.prenom} ${ens.nom}` : 'Non assigné');
                const isMineure = item.ue_type === 'Mineure';

                return (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-[#0066FF]">{item.code}</td>
                    <td className="px-6 py-4 font-semibold text-[#1A1A1A] max-w-[220px]">
                      <div>{item.nom}</div>
                      <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-bold rounded-md border ${
                        isMineure
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-blue-50 text-[#0066FF] border-blue-200'
                      }`}>
                        UE {item.ue_type || 'Majeure'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <span className="font-semibold block text-[#1A1A1A]">{fil?.code || 'INFO'}</span>
                      <span className="text-[10px] text-gray-400">{sem?.libelle || 'Semestre 1'}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-700 font-medium">
                      {displayTeacher}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-bold text-emerald-600 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-md">{item.credits} Crédits ECTS</span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenModal(item)}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-[10px] text-xs font-semibold shrink-0"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-[10px] text-xs font-semibold shrink-0"
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Modifier la Matière' : 'Ajouter une Matière'}
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
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px]"
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
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] focus:outline-none focus:border-[#0066FF]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Filière *</label>
              <select
                value={formData.filiere_id}
                onChange={(e) => setFormData({ ...formData, filiere_id: Number(e.target.value) })}
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] bg-white focus:outline-none focus:border-[#0066FF]"
              >
                {filieres.map(f => (
                  <option key={f.id} value={f.id}>{f.code} - {f.nom}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Semestre *</label>
              <select
                value={formData.semestre_id}
                onChange={(e) => setFormData({ ...formData, semestre_id: Number(e.target.value) })}
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] bg-white focus:outline-none focus:border-[#0066FF]"
              >
                {semestres.map(s => (
                  <option key={s.id} value={s.id}>{s.libelle}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Enseignant Titulaire</label>
            <input
              type="text"
              value={formData.enseignant_nom}
              onChange={(e) => setFormData({ ...formData, enseignant_nom: e.target.value })}
              placeholder="Ex: Dr. Martin KOFFI"
              className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] focus:outline-none focus:border-[#0066FF]"
            />
          </div>

          {/* Section Upload Support de Cours depuis Galerie / Appareil */}
          <div className="p-3.5 bg-gray-50 border border-[#E5E7EB] rounded-[16px] space-y-2">
            <label className="block font-semibold text-[#1A1A1A]">Support de Cours (Prendre depuis Galerie / Appareil)</label>
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
                className="w-full sm:w-auto h-[40px] px-4 bg-white border border-[#0066FF] text-[#0066FF] hover:bg-blue-50 rounded-[12px] font-bold flex items-center justify-center gap-2 transition-colors text-xs"
              >
                <Upload className="w-4 h-4" />
                <span>Sélectionner dans la galerie / fichiers</span>
              </button>
              {formData.support_fichier_nom && (
                <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-[10px] flex items-center gap-2 font-medium text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span className="truncate max-w-[200px]">{formData.support_fichier_nom}</span>
                  <button
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, support_fichier_nom: '', support_fichier_url: '' }))}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
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
              Enregistrer
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={deleteConfirmId !== null}
        title="Confirmer la suppression"
        message="Voulez-vous vraiment supprimer cette matière ? Elle sera envoyée dans la Corbeille."
        confirmLabel="Oui, supprimer"
        onConfirm={executeDeleteMatiere}
        onClose={() => setDeleteConfirmId(null)}
      />

    </div>
  );
};
