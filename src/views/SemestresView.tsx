import React, { useState } from 'react';
import { DB } from '../lib/storage';
import { Semestre } from '../types/database';
import { Modal } from '../components/Modal';
import { Calendar, Plus, Search, Pencil, Trash2 } from 'lucide-react';

export const SemestresView: React.FC = () => {
  const [list, setList] = useState<Semestre[]>(DB.getSemestres());
  const niveaux = DB.getNiveaux();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Semestre | null>(null);
  const [search, setSearch] = useState('');
  const [selectedNiveauFilter, setSelectedNiveauFilter] = useState<string>('all');

  const [formData, setFormData] = useState({
    code: '',
    libelle: '',
    niveau_id: niveaux[0]?.id || 1,
    ordre: 1
  });

  const handleOpenModal = (item?: Semestre) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        code: item.code,
        libelle: item.libelle,
        niveau_id: item.niveau_id || niveaux[0]?.id || 1,
        ordre: item.ordre || 1
      });
    } else {
      setEditingItem(null);
      setFormData({
        code: `S${list.length + 1}`,
        libelle: `Semestre ${list.length + 1}`,
        niveau_id: niveaux[0]?.id || 1,
        ordre: list.length + 1
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    DB.saveSemestre({
      ...(editingItem ? { id: editingItem.id } : {}),
      code: formData.code,
      libelle: formData.libelle,
      niveau_id: Number(formData.niveau_id),
      ordre: Number(formData.ordre)
    });

    setList(DB.getSemestres());
    setIsModalOpen(false);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Voulez-vous vraiment supprimer ce semestre ? Il sera déplacé vers la corbeille.')) {
      DB.deleteSemestre(id);
      setList(DB.getSemestres());
    }
  };

  const filtered = list.filter(s => {
    const matchesSearch = s.libelle.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase());
    const matchesNiveau = selectedNiveauFilter === 'all' || s.niveau_id === Number(selectedNiveauFilter);
    return matchesSearch && matchesNiveau;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1A1A1A]">Gestion des Semestres</h2>
          <p className="text-xs text-gray-500 mt-1">
            Organisation semestrielle du cursus LMD. Chaque semestre créé apparait et s'applique automatiquement dans <strong className="text-gray-700">toutes les filières</strong>.
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="h-[44px] px-4 bg-[#0066FF] hover:bg-blue-700 text-white rounded-[14px] text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nouveau Semestre
        </button>
      </div>

      {/* Search & Filter */}
      <div className="bg-white p-4 rounded-[20px] border border-[#E5E7EB] shadow-xs flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un semestre par code ou libellé..."
            className="w-full h-[44px] pl-10 pr-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-[14px] text-xs font-medium focus:outline-none focus:border-[#0066FF]"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        </div>
        <div className="w-full sm:w-64">
          <select
            value={selectedNiveauFilter}
            onChange={(e) => setSelectedNiveauFilter(e.target.value)}
            className="w-full h-[44px] bg-[#F9FAFB] border border-[#E5E7EB] rounded-[14px] px-3 text-xs font-semibold text-gray-700 focus:outline-none focus:border-[#0066FF]"
          >
            <option value="all">Tous les Niveaux</option>
            {niveaux.map(n => (
              <option key={n.id} value={n.id}>{n.code} - {n.nom}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                <th className="px-6 py-4">Code</th>
                <th className="px-6 py-4">Libellé</th>
                <th className="px-6 py-4">Portée / Filières</th>
                <th className="px-6 py-4 text-center">Ordre Chronologique</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-gray-100">
              {filtered.length > 0 ? (
                filtered.map((item) => {
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-[#0066FF]">{item.code}</td>
                      <td className="px-6 py-4 font-semibold text-[#1A1A1A]">{item.libelle}</td>
                      <td className="px-6 py-4 text-gray-600">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-md font-semibold text-xs border border-emerald-200">
                          Toutes les filières
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-gray-700">{item.ordre}</td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenModal(item)}
                          className="p-1.5 text-gray-400 hover:text-[#0066FF] rounded-lg hover:bg-blue-50 transition-colors"
                          title="Modifier"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                    Aucun semestre trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Modifier le Semestre' : 'Ajouter un Semestre'}
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Code Semestre *</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="Ex: S1"
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px]"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Ordre Chronologique *</label>
              <input
                type="number"
                min={1}
                max={20}
                value={formData.ordre}
                onChange={(e) => setFormData({ ...formData, ordre: Number(e.target.value) })}
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Libellé du Semestre *</label>
            <input
              type="text"
              value={formData.libelle}
              onChange={(e) => setFormData({ ...formData, libelle: e.target.value })}
              placeholder="Ex: Semestre 1"
              className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px]"
              required
            />
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-[12px] text-blue-800 text-[11px] leading-relaxed">
            💡 <strong>Remarque :</strong> Les semestres sont universels. Ce semestre sera immédiatement accessible dans <strong>toutes les filières académiques</strong> lors de la création de matières, la saisie des notes et le calcul des bulletins.
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
    </div>
  );
};
