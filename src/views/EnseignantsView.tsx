import React, { useState } from 'react';
import { DB } from '../lib/storage';
import { Enseignant } from '../types/database';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { UserCheck, Plus, Search } from 'lucide-react';

export const EnseignantsView: React.FC = () => {
  const [list, setList] = useState<Enseignant[]>(DB.getEnseignants());
  const universites = DB.getUniversites();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Enseignant | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const [formData, setFormData] = useState({
    matricule: '',
    nom: '',
    prenom: '',
    titre: 'Professeur Titulaire',
    email: '',
    telephone: '',
    specialite: '',
    universite_id: universites[0]?.id || 1
  });

  const handleOpenModal = (item?: Enseignant) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        matricule: item.matricule,
        nom: item.nom,
        prenom: item.prenom,
        titre: item.titre || 'Docteur',
        email: item.email,
        telephone: item.telephone || '',
        specialite: item.specialite || '',
        universite_id: item.universite_id
      });
    } else {
      setEditingItem(null);
      setFormData({
        matricule: '',
        nom: '',
        prenom: '',
        titre: 'Docteur',
        email: '',
        telephone: '',
        specialite: '',
        universite_id: universites[0]?.id || 1
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nom || !formData.prenom || !formData.email) return;

    DB.saveEnseignant({
      ...(editingItem ? { id: editingItem.id } : {}),
      ...formData,
      universite_id: Number(formData.universite_id)
    });

    setList(DB.getEnseignants());
    setIsModalOpen(false);
  };

  const handleDelete = (id: number) => {
    setDeleteConfirmId(id);
  };

  const executeDeleteEnseignant = () => {
    if (deleteConfirmId !== null) {
      const ens = list.find(e => e.id === deleteConfirmId);
      if (ens) {
        DB.moveToCorbeille('ENSEIGNANT', ens.id, `${ens.titre} ${ens.prenom} ${ens.nom}`, `Spécialité: ${ens.specialite}`, ens);
        DB.deleteEnseignant(deleteConfirmId);
        setList(DB.getEnseignants());
      }
      setDeleteConfirmId(null);
    }
  };

  const filtered = list.filter(e =>
    e.nom.toLowerCase().includes(search.toLowerCase()) ||
    e.prenom.toLowerCase().includes(search.toLowerCase()) ||
    e.matricule.toLowerCase().includes(search.toLowerCase()) ||
    e.specialite.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1A1A1A]">Gestion du Corps Enseignant</h2>
          <p className="text-xs text-gray-500 mt-1">Professeurs, maîtres de conférences, docteurs et vacataires universitaires.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="h-[44px] px-5 bg-[#0066FF] hover:bg-blue-700 text-white rounded-[14px] text-xs font-semibold flex items-center gap-2 transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Ajouter un Enseignant
        </button>
      </div>

      {/* Filter */}
      <div className="bg-white p-4 rounded-[20px] border border-[#E5E7EB] shadow-xs flex items-center gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un enseignant par nom, spécialité, matricule..."
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
                <th className="px-6 py-4">Matricule</th>
                <th className="px-6 py-4">Nom & Prénom</th>
                <th className="px-6 py-4">Titre / Spécialité</th>
                <th className="px-6 py-4">Email / Téléphone</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-gray-100">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-[#0066FF]">{item.matricule}</td>
                  <td className="px-6 py-4 font-semibold text-[#1A1A1A]">
                    {item.prenom} {item.nom}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    <span className="font-semibold block text-[#1A1A1A]">{item.titre}</span>
                    <span className="text-[11px] text-gray-400">{item.specialite}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    <div>{item.email}</div>
                    <div className="text-[11px] text-gray-400">{item.telephone}</div>
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Modifier l’Enseignant' : 'Ajouter un Enseignant'}
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Titre Académique</label>
              <select
                value={formData.titre}
                onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] bg-white"
              >
                <option value="Professeur Titulaire">Professeur Titulaire</option>
                <option value="Maître de Conférences">Maître de Conférences</option>
                <option value="Docteur">Docteur</option>
                <option value="Assistant / Vacataire">Assistant / Vacataire</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Prénom *</label>
              <input
                type="text"
                value={formData.prenom}
                onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                placeholder="Ex: Ibrahima"
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
                placeholder="Ex: Sissoko"
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="enseignant@usttb.edu.ml"
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px]"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Téléphone</label>
              <input
                type="text"
                value={formData.telephone}
                onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                placeholder="+223 76 00 00 00"
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px]"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Spécialité / Discipline de Recherche</label>
            <input
              type="text"
              value={formData.specialite}
              onChange={(e) => setFormData({ ...formData, specialite: e.target.value })}
              placeholder="Ex: Base de données, Réseaux, Algorithmique"
              className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px]"
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
        message="Voulez-vous vraiment supprimer cet enseignant ? Il sera envoyé dans la Corbeille."
        confirmLabel="Oui, supprimer"
        onConfirm={executeDeleteEnseignant}
        onClose={() => setDeleteConfirmId(null)}
      />

    </div>
  );
};
