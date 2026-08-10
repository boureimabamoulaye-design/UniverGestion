import React, { useState } from 'react';
import { AuthUser } from '../types/database';
import { DB } from '../lib/storage';
import { User, Mail, Phone, ShieldCheck, Lock, CheckCircle2 } from 'lucide-react';

interface ProfilAdminViewProps {
  currentUser: AuthUser;
}

export const ProfilAdminView: React.FC<ProfilAdminViewProps> = ({ currentUser }) => {
  const [formData, setFormData] = useState({
    nom: currentUser.nom,
    prenom: currentUser.prenom,
    email: currentUser.email_or_matricule,
    telephone: currentUser.adminDetail?.telephone || '+223 70 00 11 22',
    ancienMotDePasse: '',
    nouveauMotDePasse: ''
  });

  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Update user list if found
    const users = DB.getUtilisateurs();
    const idx = users.findIndex(u => u.email === currentUser.email_or_matricule);
    if (idx !== -1) {
      users[idx] = {
        ...users[idx],
        nom: formData.nom,
        prenom: formData.prenom,
        email: formData.email,
        ...(formData.nouveauMotDePasse ? { mot_de_passe: formData.nouveauMotDePasse } : {})
      };
      // Save updated user via DB helper (in-memory)
      DB.saveUtilisateur(users[idx]);
    }

    setMessage('Votre profil administrateur a été mis à jour avec succès.');
    setTimeout(() => setMessage(null), 4000);
  };

  return (
    <div className="max-w-4xl space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-[#1A1A1A]">Mon Profil Administrateur</h2>
        <p className="text-xs text-gray-500 mt-1">Gérez vos informations personnelles, vos coordonnées et vos accès de sécurité.</p>
      </div>

      {message && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-[16px] text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Profile Card & Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Profile Card Summary */}
        <div className="bg-white p-6 rounded-[20px] border border-[#E5E7EB] shadow-xs flex flex-col items-center text-center space-y-4">
          <div className="w-20 h-20 bg-[#0066FF] text-white rounded-full flex items-center justify-center font-bold text-2xl shadow-md">
            {currentUser?.prenom?.[0] || 'A'}{currentUser?.nom?.[0] || 'D'}
          </div>
          <div>
            <h3 className="font-bold text-base text-[#1A1A1A]">{currentUser.prenom} {currentUser.nom}</h3>
            <span className="inline-block px-2.5 py-1 mt-1 bg-blue-50 text-[#0066FF] rounded-full text-xs font-bold border border-blue-100">
              {currentUser.adminDetail?.role_admin || 'Administrateur Système'}
            </span>
          </div>

          <div className="w-full pt-4 border-t border-gray-100 space-y-2 text-left text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="truncate">{currentUser.email_or_matricule}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-400" />
              <span>{formData.telephone}</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="text-emerald-700 font-semibold">Compte Vérifié & Actif</span>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <div className="md:col-span-2 bg-white p-6 rounded-[20px] border border-[#E5E7EB] shadow-xs">
          <h3 className="font-bold text-base text-[#1A1A1A] mb-4 pb-3 border-b border-gray-100">Modifier Mes Coordonnées</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Prénom *</label>
                <input
                  type="text"
                  value={formData.prenom}
                  onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                  className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] text-xs font-medium"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Nom *</label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] text-xs font-medium"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Adresse Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] text-xs font-medium"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Numéro Téléphone</label>
                <input
                  type="text"
                  value={formData.telephone}
                  onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                  className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] text-xs font-medium"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 space-y-4">
              <h4 className="font-bold text-xs text-gray-800 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-gray-500" />
                Sécurité & Mot de Passe
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Ancien mot de passe</label>
                  <input
                    type="password"
                    value={formData.ancienMotDePasse}
                    onChange={(e) => setFormData({ ...formData, ancienMotDePasse: e.target.value })}
                    placeholder="••••••••"
                    className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Nouveau mot de passe</label>
                  <input
                    type="password"
                    value={formData.nouveauMotDePasse}
                    onChange={(e) => setFormData({ ...formData, nouveauMotDePasse: e.target.value })}
                    placeholder="Laissez vide pour conserver"
                    className="w-full h-[44px] px-3 border border-[#E5E7EB] rounded-[14px] text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                className="h-[44px] px-6 bg-[#0066FF] hover:bg-blue-700 text-white rounded-[14px] text-xs font-bold transition-colors shadow-xs"
              >
                Enregistrer les Modifications
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};
