import React, { useState } from 'react';
import { DB } from '../lib/storage';
import { Filiere } from '../types/database';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { Layers, Plus, Search } from 'lucide-react';

export const FilieresView: React.FC = () => {
  const [list, setList] = useState<Filiere[]>(DB.getFilieres());
  const classes = DB.getClasses();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Filiere | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const [formData, setFormData] = useState({
    code: '',
    nom: '',
    description: '',
    domaine: 'Sciences & Technologies',
    duree_annees: 3,
    frais_scolarite: 350000,
    statut: 'Actif' as 'Actif' | 'Inactif'
  });

  const handleOpenModal = (item?: Filiere) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        code: item.code,
        nom: item.nom,
        description: item.description || '',
        domaine: item.domaine || 'Sciences & Technologies',
        duree_annees: item.duree_annees || 3,
        frais_scolarite: item.frais_scolarite || 350000,
        statut: item.statut || 'Actif'
      });
    } else {
      setEditingItem(null);
      setFormData({
        code: '',
        nom: '',
        description: '',
        domaine: 'Sciences & Technologies',
        duree_annees: 3,
        frais_scolarite: 350000,
        statut: 'Actif'
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.nom) return;

    DB.saveFiliere({
      ...(editingItem ? { id: editingItem.id } : {}),
      ...formData,
      faculte_id: 1,
      duree_annees: Number(formData.duree_annees),
      frais_scolarite: Number(formData.frais_scolarite) || 0,
      statut: formData.statut
    });

    setList(DB.getFilieres());
    setIsModalOpen(false);
  };

  const handleDelete = (id: number) => {
    setDeleteConfirmId(id);
  };

  const executeDeleteFiliere = () => {
    if (deleteConfirmId !== null) {
      const item = list.find(f => f.id === deleteConfirmId);
      if (item) {
        DB.moveToCorbeille('FILIERE', item.id, `${item.code} - ${item.nom}`, `Filière Domaine: ${item.domaine}`, item);
        DB.deleteFiliere(deleteConfirmId);
        setList(DB.getFilieres());
      }
      setDeleteConfirmId(null);
    }
  };

  const filtered = list.filter(f =>
    f.nom.toLowerCase().includes(search.toLowerCase()) ||
    f.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1A1A1A]">Gestion des Filières de Formation</h2>
          <p className="text-xs text-gray-500 mt-1">Parcours académiques, spécialités LMD et départements d'études.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="h-[44px] px-5 bg-[#0066FF] hover:bg-blue-700 text-white rounded-[14px] text-xs font-semibold flex items-center gap-2 transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Ajouter une Filière
        </button>
      </div>

      {/* Filter */}
      <div className="bg-white p-4 rounded-[20px] border border-[#E5E7EB] shadow-xs flex items-center gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une filière par code, nom..."
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
                <th className="px-6 py-4">Filière / Spécialité</th>
                <th className="px-6 py-4">Prix / Frais (FCFA)</th>
                <th className="px-6 py-4">Classes Rattachées</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-gray-100">
              {filtered.map((item) => {
                const connectedClasses = classes.filter(c => c.filiere_id === item.id);
                return (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-[#0066FF]">{item.code}</td>
                    <td className="px-6 py-4 font-semibold text-[#1A1A1A] max-w-[280px]">
                      {item.nom}
                      {item.description && <p className="text-[11px] text-gray-400 font-normal mt-0.5">{item.description}</p>}
                    </td>
                    <td className="px-6 py-4 font-bold text-emerald-600 font-mono">
                      {(item.frais_scolarite || 0).toLocaleString()} FCFA
                    </td>
                    <td className="px-6 py-4">
                      {connectedClasses.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {connectedClasses.map(c => (
                            <span key={c.id} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-mono font-bold border border-emerald-200 rounded text-[10px]">
                              {c.code}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 font-italic text-[11px]">Aucune classe</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenModal(item)}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-[10px] text-xs font-semibold"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-[10px] text-xs font-semibold"
                      >
                        Supprimer
                      </button>
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
        title={editingItem ? 'Modifier la Filière' : 'Ajouter une Filière'}
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Code Filière *</label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="Ex: INFO"
              className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px]"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Nom de la Filière *</label>
            <input
              type="text"
              value={formData.nom}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              placeholder="Ex: Génie Informatique & Systèmes"
              className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px]"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Prix / Frais de la filière (FCFA) *</label>
            <input
              type="number"
              value={formData.frais_scolarite}
              onChange={(e) => setFormData({ ...formData, frais_scolarite: Number(e.target.value) })}
              placeholder="Ex: 350000"
              className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px]"
              required
              min={0}
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Description / Objectifs de la formation</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full p-3 border border-[#E5E7EB] rounded-[14px]"
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
        message="Voulez-vous vraiment supprimer cette filière ? Elle sera envoyée dans la Corbeille."
        confirmLabel="Oui, supprimer"
        onConfirm={executeDeleteFiliere}
        onClose={() => setDeleteConfirmId(null)}
      />

    </div>
  );
};
