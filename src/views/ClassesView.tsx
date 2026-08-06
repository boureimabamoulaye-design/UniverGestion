import React, { useState } from 'react';
import { DB } from '../lib/storage';
import { Classe } from '../types/database';
import { Modal } from '../components/Modal';
import { Users, Plus, Search } from 'lucide-react';

export const ClassesView: React.FC = () => {
  const [list, setList] = useState<Classe[]>(DB.getClasses());
  const filieres = DB.getFilieres();
  const activeAnnee = DB.getActiveAnneeAcademique();
  const etudiants = DB.getEtudiants();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Classe | null>(null);
  const [search, setSearch] = useState('');
  const [selectedFiliereFilter, setSelectedFiliereFilter] = useState<string>('all');

  const [formData, setFormData] = useState({
    code: '',
    nom: '',
    filiere_id: filieres[0]?.id || 1,
    capacite: 60
  });

  const handleOpenModal = (item?: Classe) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        code: item.code,
        nom: item.nom,
        filiere_id: item.filiere_id || filieres[0]?.id || 1,
        capacite: item.capacite || 60
      });
    } else {
      setEditingItem(null);
      setFormData({
        code: '',
        nom: '',
        filiere_id: filieres[0]?.id || 1,
        capacite: 60
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.nom) return;

    DB.saveClasse({
      ...(editingItem ? { id: editingItem.id } : {}),
      ...formData,
      filiere_id: Number(formData.filiere_id),
      niveau_id: 1,
      annee_academique_id: activeAnnee.id,
      capacite: Number(formData.capacite)
    });

    setList(DB.getClasses());
    setIsModalOpen(false);
  };

  const handleDelete = (id: number) => {
    if (confirm('Voulez-vous supprimer cette classe ?')) {
      DB.deleteClasse(id);
      setList(DB.getClasses());
    }
  };

  const filtered = list.filter(c => {
    const matchesSearch = c.nom.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase());
    const matchesFiliere = selectedFiliereFilter === 'all' || c.filiere_id === Number(selectedFiliereFilter);
    return matchesSearch && matchesFiliere;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1A1A1A]">Gestion des Classes & Promotions</h2>
          <p className="text-xs text-gray-500 mt-1">Groupes d'étudiants rattachés aux filières ({activeAnnee.code}).</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="h-[44px] px-5 bg-[#0066FF] hover:bg-blue-700 text-white rounded-[14px] text-xs font-semibold flex items-center gap-2 transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Créer une Classe
        </button>
      </div>

      {/* Filter */}
      <div className="bg-white p-4 rounded-[20px] border border-[#E5E7EB] shadow-xs flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une classe par code, nom..."
            className="w-full h-[44px] bg-[#F9FAFB] border border-[#E5E7EB] rounded-[14px] pl-10 pr-4 text-sm focus:outline-none focus:border-[#0066FF]"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        </div>
        <div className="w-full sm:w-64">
          <select
            value={selectedFiliereFilter}
            onChange={(e) => setSelectedFiliereFilter(e.target.value)}
            className="w-full h-[44px] bg-[#F9FAFB] border border-[#E5E7EB] rounded-[14px] px-3 text-xs font-semibold text-gray-700 focus:outline-none focus:border-[#0066FF]"
          >
            <option value="all">Toutes les Filières</option>
            {filieres.map(f => (
              <option key={f.id} value={f.id}>{f.code} - {f.nom}</option>
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
                <th className="px-6 py-4">Nom de la Classe</th>
                <th className="px-6 py-4">Filière Rattachée</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-gray-100">
              {filtered.map((item) => {
                const fil = filieres.find(f => f.id === item.filiere_id);
                return (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-[#0066FF]">{item.code}</td>
                    <td className="px-6 py-4 font-semibold text-[#1A1A1A]">{item.nom}</td>
                    <td className="px-6 py-4 font-medium text-gray-700">
                      {fil ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-[#0066FF] rounded-md font-semibold text-xs border border-blue-100">
                          {fil.code} - {fil.nom}
                        </span>
                      ) : (
                        <span className="text-gray-400 font-italic">Non rattachée</span>
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
        title={editingItem ? 'Modifier la Classe' : 'Créer une Classe'}
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Filière Rattachée *</label>
            <select
              value={formData.filiere_id}
              onChange={(e) => setFormData({ ...formData, filiere_id: Number(e.target.value) })}
              className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] bg-white font-medium"
              required
            >
              {filieres.map(f => (
                <option key={f.id} value={f.id}>{f.code} - {f.nom}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Code Classe *</label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="Ex: L1-INFO-A"
              className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px]"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Intitulé de la Classe *</label>
            <input
              type="text"
              value={formData.nom}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              placeholder="Ex: Licence 1 Informatique - Section A"
              className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px]"
              required
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

    </div>
  );
};
