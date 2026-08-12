import React, { useState } from 'react';
import { DB } from '../lib/storage';
import { Administrateur } from '../types/database';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { Users, Plus, Key, ShieldCheck, UserX, UserCheck, Trash2, Edit, Search, Shield, CheckCircle, XCircle } from 'lucide-react';

export const UtilisateursView: React.FC = () => {
  const [list, setList] = useState<Administrateur[]>(DB.getUtilisateurs());
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('TOUS');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Administrateur | null>(null);
  const [resetPassUser, setResetPassUser] = useState<Administrateur | null>(null);
  const [deleteUserItem, setDeleteUserItem] = useState<Administrateur | null>(null);

  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    mot_de_passe: 'admin123',
    role: 'ADMIN' as string,
    statut: 'Actif' as 'Actif' | 'Inactif'
  });

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormData({
      nom: '',
      prenom: '',
      email: '',
      mot_de_passe: 'admin123',
      role: 'ADMIN',
      statut: 'Actif'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (u: Administrateur) => {
    setEditingUser(u);
    setFormData({
      nom: u.nom || '',
      prenom: u.prenom || '',
      email: u.email || '',
      mot_de_passe: u.mot_de_passe || 'admin123',
      role: u.role || 'ADMIN',
      statut: (u.statut === 'Actif' ? 'Actif' : 'Inactif')
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email.trim() || !formData.nom.trim()) return;

    if (editingUser) {
      DB.saveUtilisateur({
        ...editingUser,
        ...formData
      });
    } else {
      DB.saveUtilisateur({
        ...formData,
        date_creation: new Date().toISOString().split('T')[0]
      });
    }

    setList(DB.getUtilisateurs());
    setIsModalOpen(false);
  };

  const handleToggleStatus = (u: Administrateur) => {
    const newStatus = u.statut === 'Actif' ? 'Inactif' : 'Actif';
    DB.saveUtilisateur({
      ...u,
      statut: newStatus
    });
    DB.logAccess('SECURITE', `Accès au site pour ${u.prenom} ${u.nom} (${u.email}) : ${newStatus === 'Actif' ? 'AUTORISÉ' : 'BLOQUÉ'}`);
    setList(DB.getUtilisateurs());
  };

  const handleResetPassword = (u: Administrateur) => {
    setResetPassUser(u);
  };

  const executeResetPassword = () => {
    if (resetPassUser) {
      DB.saveUtilisateur({
        ...resetPassUser,
        mot_de_passe: 'admin123'
      });
      setList(DB.getUtilisateurs());
      setResetPassUser(null);
    }
  };

  const handleDeleteUser = (u: Administrateur) => {
    setDeleteUserItem(u);
  };

  const executeDeleteUser = () => {
    if (deleteUserItem) {
      DB.moveToCorbeille('UTILISATEUR', deleteUserItem.id, `${deleteUserItem.prenom} ${deleteUserItem.nom}`, `Rôle: ${deleteUserItem.role}`, deleteUserItem);
      DB.deleteUtilisateur(deleteUserItem.id);
      setList(DB.getUtilisateurs());
      setDeleteUserItem(null);
    }
  };

  const filteredList = list.filter((u) => {
    const matchesSearch =
      `${u.prenom} ${u.nom}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.role || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === 'TOUS' || u.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const activeCount = list.filter((u) => u.statut === 'Actif').length;
  const inactiveCount = list.filter((u) => u.statut !== 'Actif').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">Liaison & Gestion des Comptes Utilisateurs / Administrateurs</h2>
          <p className="text-xs text-slate-500 mt-1">
            Gérez les autorisations et autorisez ou bloquez l'accès au site pour chaque utilisateur ou administrateur.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="h-[44px] px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Créer un Compte & Accès</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-2xl font-black text-slate-900">{list.length}</span>
            <span className="text-xs text-slate-500 font-medium">Total Comptes Définis</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-2xl font-black text-emerald-600">{activeCount}</span>
            <span className="text-xs text-slate-500 font-medium">Accès Autorisé au Site (Actifs)</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 bg-red-50 text-red-600 rounded-lg flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-2xl font-black text-red-600">{inactiveCount}</span>
            <span className="text-xs text-slate-500 font-medium">Accès Bloqué (Inactifs)</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center gap-3 justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par nom, email, rôle..."
            className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Rôle :</span>
          {['TOUS', 'SUPER_ADMIN', 'ADMIN', 'SCOLARITE', 'COMPTABILITE'].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                roleFilter === r ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {r === 'TOUS' ? 'Tous' : r}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th className="px-6 py-3.5">Utilisateur / Administrateur</th>
                <th className="px-6 py-3.5">Email Officiel (Identifiant)</th>
                <th className="px-6 py-3.5">Rôle Système</th>
                <th className="px-6 py-3.5">Mot de Passe</th>
                <th className="px-6 py-3.5">Accès au Site</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500 font-medium">
                    Aucun compte utilisateur trouvé.
                  </td>
                </tr>
              ) : (
                filteredList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">
                          {u.prenom ? u.prenom[0] : 'A'}
                        </div>
                        <div>
                          <span className="block font-bold text-slate-900">{u.prenom} {u.nom}</span>
                          <span className="block text-[10px] text-slate-400">ID #{u.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-700 font-mono font-medium">{u.email}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md font-bold text-[11px]">
                        <Shield className="w-3.5 h-3.5" />
                        {u.role || 'ADMIN'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-500">
                      {u.mot_de_passe || '••••••••'}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-all border ${
                          u.statut === 'Actif'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                        }`}
                        title="Cliquer pour changer l'autorisation d'accès"
                      >
                        {u.statut === 'Actif' ? (
                          <>
                            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Accès Autorisé</span>
                          </>
                        ) : (
                          <>
                            <UserX className="w-3.5 h-3.5 text-red-600" />
                            <span>Accès Bloqué</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                          title="Modifier les informations du compte"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Éditer</span>
                        </button>

                        <button
                          onClick={() => handleResetPassword(u)}
                          className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold cursor-pointer"
                          title="Réinitialiser le mot de passe"
                        >
                          Reset MDP
                        </button>

                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-semibold cursor-pointer inline-flex items-center"
                          title="Supprimer le compte"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit Admin */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? `Modifier le compte de ${editingUser.prenom} ${editingUser.nom}` : "Créer un Compte Administrateur / Utilisateur"}
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Prénom *</label>
              <input
                type="text"
                value={formData.prenom}
                onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                placeholder="Oumar"
                className="w-full h-10 px-3 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 font-semibold"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Nom *</label>
              <input
                type="text"
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                placeholder="Coulibaly"
                className="w-full h-10 px-3 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 font-semibold"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Email Officiel / Identifiant de connexion *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="agent@usttb.edu.ml"
              className="w-full h-10 px-3 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 font-semibold font-mono"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Rôle Système</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white font-bold text-slate-800"
              >
                <option value="SUPER_ADMIN">Super Administrateur</option>
                <option value="ADMIN">Administrateur Général</option>
                <option value="SCOLARITE">Agent Scolarité</option>
                <option value="COMPTABILITE">Comptable / Caisse</option>
                <option value="ENSEIGNANT">Enseignant / Formateur</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Mot de passe *</label>
              <input
                type="text"
                value={formData.mot_de_passe}
                onChange={(e) => setFormData({ ...formData, mot_de_passe: e.target.value })}
                className="w-full h-10 px-3 border border-slate-300 rounded-lg font-mono font-bold text-slate-800"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Statut d'Accès au Site *</label>
            <select
              value={formData.statut}
              onChange={(e) => setFormData({ ...formData, statut: e.target.value as 'Actif' | 'Inactif' })}
              className="w-full h-10 px-3 border border-slate-300 rounded-lg bg-white font-bold text-slate-800"
            >
              <option value="Actif">Actif - Accès Autorisé au Site</option>
              <option value="Inactif">Inactif - Accès Bloqué au Site</option>
            </select>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="h-10 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="h-10 px-5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer"
            >
              {editingUser ? 'Enregistrer les Modifications' : 'Créer le Compte & Autoriser'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!resetPassUser}
        title="Réinitialiser le mot de passe"
        message={resetPassUser ? `Voulez-vous réinitialiser le mot de passe de ${resetPassUser.prenom} ${resetPassUser.nom} (${resetPassUser.email}) à 'admin123' ?` : ''}
        confirmLabel="Réinitialiser"
        variant="warning"
        onConfirm={executeResetPassword}
        onClose={() => setResetPassUser(null)}
      />

      <ConfirmModal
        isOpen={!!deleteUserItem}
        title="Confirmer la suppression du compte"
        message={deleteUserItem ? `Voulez-vous vraiment supprimer le compte de ${deleteUserItem.prenom} ${deleteUserItem.nom} (${deleteUserItem.email}) ? Il sera déplacé vers la Corbeille.` : ''}
        confirmLabel="Oui, supprimer"
        onConfirm={executeDeleteUser}
        onClose={() => setDeleteUserItem(null)}
      />

    </div>
  );
};
