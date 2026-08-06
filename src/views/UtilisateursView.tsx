import React, { useState } from 'react';
import { DB } from '../lib/storage';
import { Utilisateur } from '../types/database';
import { Modal } from '../components/Modal';
import { Users, Plus, Key, ShieldCheck, UserX, UserCheck } from 'lucide-react';

export const UtilisateursView: React.FC = () => {
  const [list, setList] = useState<Utilisateur[]>(DB.getUtilisateurs());
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    mot_de_passe: 'admin123',
    role: 'ADMIN' as 'SUPER_ADMIN' | 'ADMIN' | 'SCOLARITE' | 'COMPTABILITE'
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.nom) return;

    DB.saveUtilisateur({
      ...formData,
      statut: 'Actif',
      date_creation: new Date().toISOString().split('T')[0]
    });

    setList(DB.getUtilisateurs());
    setIsModalOpen(false);
  };

  const handleToggleStatus = (u: Utilisateur) => {
    DB.saveUtilisateur({
      ...u,
      statut: u.statut === 'Actif' ? 'Inactif' : 'Actif'
    });
    setList(DB.getUtilisateurs());
  };

  const handleResetPassword = (u: Utilisateur) => {
    if (confirm(`Réinitialiser le mot de passe de ${u.prenom} ${u.nom} à 'admin123' ?`)) {
      DB.saveUtilisateur({
        ...u,
        mot_de_passe: 'admin123'
      });
      alert('Mot de passe réinitialisé à admin123 !');
      setList(DB.getUtilisateurs());
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1A1A1A]">Gestion des Comptes & Droits d'Accès</h2>
          <p className="text-xs text-gray-500 mt-1">Comptes administrateurs, agents de scolarité, comptables et accès système.</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="h-[44px] px-5 bg-[#0066FF] hover:bg-blue-700 text-white rounded-[14px] text-xs font-semibold flex items-center gap-2 transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter un Administrateur</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[20px] border border-[#E5E7EB] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                <th className="px-6 py-4">Utilisateur</th>
                <th className="px-6 py-4">Email Officiel</th>
                <th className="px-6 py-4">Rôle Système</th>
                <th className="px-6 py-4">Statut Compte</th>
                <th className="px-6 py-4 text-right">Actions Sécurité</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-gray-100">
              {list.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-[#1A1A1A]">{u.prenom} {u.nom}</td>
                  <td className="px-6 py-4 text-gray-600 font-mono">{u.email}</td>
                  <td className="px-6 py-4 font-bold text-[#0066FF]">{u.role}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      u.statut === 'Actif' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                    }`}>
                      {u.statut}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => handleResetPassword(u)}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-[10px] text-xs font-semibold"
                    >
                      Réinitialiser MDP
                    </button>
                    <button
                      onClick={() => handleToggleStatus(u)}
                      className={`px-3 py-1.5 rounded-[10px] text-xs font-semibold ${
                        u.statut === 'Actif'
                          ? 'bg-red-50 text-red-600 hover:bg-red-100'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      {u.statut === 'Actif' ? 'Désactiver' : 'Activer'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add Admin */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Créer un Compte Administrateur / Agent"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Prénom *</label>
              <input
                type="text"
                value={formData.prenom}
                onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                placeholder="Oumar"
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
                placeholder="Coulibaly"
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Email Officiel *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="agent@usttb.edu.ml"
              className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px]"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Rôle Système</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] bg-white font-bold"
              >
                <option value="SUPER_ADMIN">Super Administrateur</option>
                <option value="ADMIN">Administrateur Général</option>
                <option value="SCOLARITE">Agent Scolarité</option>
                <option value="COMPTABILITE">Comptable / Caisse</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Mot de passe Initial</label>
              <input
                type="text"
                value={formData.mot_de_passe}
                onChange={(e) => setFormData({ ...formData, mot_de_passe: e.target.value })}
                className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] font-mono"
                required
              />
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
              Créer le Compte
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
