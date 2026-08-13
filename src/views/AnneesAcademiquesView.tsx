import React, { useState } from 'react';
import { DB } from '../lib/storage';
import { AnneeAcademique } from '../types/database';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { Clock, Plus, CheckCircle, Archive, Trash2 } from 'lucide-react';

export const AnneesAcademiquesView: React.FC = () => {
  const [list, setList] = useState<AnneeAcademique[]>(DB.getAnneesAcademiques());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AnneeAcademique | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    libelle: '',
    date_debut: '',
    date_fin: '',
    est_active: false,
    est_archivee: false
  });

  const handleOpenModal = (item?: AnneeAcademique) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        code: item.code,
        libelle: item.libelle,
        date_debut: item.date_debut,
        date_fin: item.date_fin,
        est_active: item.est_active,
        est_archivee: !!item.est_archivee
      });
    } else {
      setEditingItem(null);
      setFormData({
        code: '2025-2026',
        libelle: 'Année Académique 2025 - 2026',
        date_debut: '2025-10-01',
        date_fin: '2026-07-31',
        est_active: false,
        est_archivee: false
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.libelle) return;

    DB.saveAnneeAcademique({
      ...(editingItem ? { id: editingItem.id } : {}),
      ...formData
    });

    setList(DB.getAnneesAcademiques());
    setIsModalOpen(false);
  };

  const handleActivate = (id: number) => {
    DB.setActiveAnneeAcademique(id);
    setList(DB.getAnneesAcademiques());
  };

  const handleDelete = (id: number) => {
    setDeleteConfirmId(id);
  };

  const executeDeleteAnnee = () => {
    if (deleteConfirmId !== null) {
      const item = list.find(a => a.id === deleteConfirmId);
      if (item) {
        DB.deleteAnneeAcademique(deleteConfirmId);
        setList(DB.getAnneesAcademiques());
      }
      setDeleteConfirmId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1A1A1A]">Gestion des Années Académiques</h2>
          <p className="text-xs text-gray-500 mt-1">Gérer les périodes d'études, basculer l'année active et archiver les sessions écoulées.</p>
        </div>
        <button
          type="button"
          onClick={() => handleOpenModal()}
          className="h-[44px] px-5 bg-[#0066FF] hover:bg-blue-700 text-white rounded-[14px] text-xs font-semibold flex items-center gap-2 transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Créer une Année Académique
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                <th className="px-6 py-4">Code</th>
                <th className="px-6 py-4">Libellé Officiel</th>
                <th className="px-6 py-4">Période (Début - Fin)</th>
                <th className="px-6 py-4 text-center">Statut Actif</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-gray-100">
              {list.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-[#0066FF]">{item.code}</td>
                  <td className="px-6 py-4 font-semibold text-[#1A1A1A]">{item.libelle}</td>
                  <td className="px-6 py-4 text-gray-600 font-mono">
                    {item.date_debut} au {item.date_fin}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {item.est_active ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full font-bold text-[10px]">
                        <CheckCircle className="w-3 h-3" />
                        Année En Cours (Active)
                      </span>
                    ) : item.est_archivee ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-500 rounded-full font-medium text-[10px]">
                        <Archive className="w-3 h-3" />
                        Archivée
                      </span>
                    ) : (
                      <span className="text-gray-400 font-medium">Inactive</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    {!item.est_active && (
                      <button
                        type="button"
                        onClick={() => handleActivate(item.id)}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#0066FF] rounded-[10px] text-xs font-semibold"
                      >
                        Rendre Active
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleOpenModal(item)}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-[10px] text-xs font-semibold"
                    >
                      Modifier
                    </button>
                    {!item.est_active && (
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-[10px] text-xs font-semibold inline-flex items-center"
                        title="Supprimer l'année académique"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Modifier l’Année Académique' : 'Créer une Année Académique'}
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Code Année *</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="Ex: 2024-2025"
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px]"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Libellé *</label>
              <input
                type="text"
                value={formData.libelle}
                onChange={(e) => setFormData({ ...formData, libelle: e.target.value })}
                placeholder="Année Académique 2024 - 2025"
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Date de Début *</label>
              <input
                type="date"
                value={formData.date_debut}
                onChange={(e) => setFormData({ ...formData, date_debut: e.target.value })}
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px]"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Date de Fin *</label>
              <input
                type="date"
                value={formData.date_fin}
                onChange={(e) => setFormData({ ...formData, date_fin: e.target.value })}
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px]"
                required
              />
            </div>
          </div>

          <div className="flex items-center gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer font-semibold text-gray-700">
              <input
                type="checkbox"
                checked={formData.est_active}
                onChange={(e) => setFormData({ ...formData, est_active: e.target.checked })}
                className="w-4 h-4 text-[#0066FF] rounded"
              />
              Définir comme année académique active
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-semibold text-gray-700">
              <input
                type="checkbox"
                checked={formData.est_archivee}
                onChange={(e) => setFormData({ ...formData, est_archivee: e.target.checked })}
                className="w-4 h-4 text-gray-600 rounded"
              />
              Archiver cette année
            </label>
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
        message="Voulez-vous vraiment supprimer cette année académique ?"
        confirmLabel="Oui, supprimer"
        onConfirm={executeDeleteAnnee}
        onClose={() => setDeleteConfirmId(null)}
      />

    </div>
  );
};
