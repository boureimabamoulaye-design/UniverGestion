import React, { useState } from 'react';
import { AuthUser } from '../types/database';
import { DB } from '../lib/storage';
import { GraduationCap, Shield, Lock, Mail, ArrowRight } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: AuthUser) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [role, setRole] = useState<'ADMIN' | 'ETUDIANT'>('ADMIN');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [selectedFiliereId, setSelectedFiliereId] = useState<number | ''>(1);
  const [error, setError] = useState('');

  const filieres = DB.getFilieres();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!login.trim() || !password.trim()) {
      setError('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    if (role === 'ADMIN') {
      const users = DB.getUtilisateurs();
      const user = users.find(u => u.email.toLowerCase() === login.toLowerCase().trim());
      
      // Default demo login or user match
      if ((login.toLowerCase() === 'admin@unigestion.edu.ml' && password === 'admin123') || (user && user.mot_de_passe === password)) {
        const adminDetail = DB.getAdministrateurs()[0];
        const universite = DB.getUniversites()[0];
        
        DB.logAccess('CONNEXION', `Connexion administrateur réussie (${login})`, user?.id || 1);

        onLoginSuccess({
          id: user?.id || 1,
          nom: user?.nom || 'Diakité',
          prenom: user?.prenom || 'Sékou',
          email_or_matricule: login,
          role: 'ADMIN',
          adminDetail,
          universite_nom: universite?.nom
        });
        return;
      } else {
        setError('Email administrateur ou mot de passe incorrect.');
      }
    } else {
      // ETUDIANT
      if (!selectedFiliereId) {
        setError('Veuillez obligatoirement sélectionner votre filière d\'études avant de continuer.');
        return;
      }

      const etudiants = DB.getEtudiants();
      const etudiant = etudiants.find(e => e.matricule.toLowerCase() === login.toLowerCase().trim());

      if ((login === '2024-USTTB-001' && password === 'etudiant123') || (etudiant && etudiant.mot_de_passe === password)) {
        const baseStudent = etudiant || etudiants[0] || {
          id: 1,
          matricule: '2024-USTTB-001',
          nom: 'Traoré',
          prenom: 'Mamadou',
          email: 'm.traore@usttb.edu.ml',
          telephone: '+223 76 00 11 22',
          adresse: 'Bamako, Mali',
          date_naissance: '2003-05-12',
          lieu_naissance: 'Bamako',
          genre: 'M' as const,
          statut: 'Actif' as const,
          nationalite: 'Malienne',
          filiere_id: Number(selectedFiliereId) || 1,
          niveau_id: 1,
          classe_id: 1,
          date_inscription: '2025-10-01'
        };
        const targetStudent = { ...baseStudent, filiere_id: Number(selectedFiliereId) };
        const universite = DB.getUniversites()[0];

        DB.logAccess('CONNEXION', `Connexion étudiant réussie (Matricule: ${targetStudent.matricule}, Filière ID: ${selectedFiliereId})`, undefined, targetStudent.id);

        onLoginSuccess({
          id: targetStudent.id,
          nom: targetStudent.nom,
          prenom: targetStudent.prenom,
          email_or_matricule: targetStudent.matricule,
          role: 'ETUDIANT',
          etudiantDetail: targetStudent,
          universite_nom: universite?.nom
        });
        return;
      } else {
        setError('Matricule étudiant ou mot de passe incorrect. Ex: 2024-USTTB-001');
      }
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F5F7F9] text-[#1A1A1A] flex items-center justify-center p-4">
      <div className="w-full max-w-[440px] bg-white rounded-[20px] border border-[#E5E7EB] shadow-xl p-8 lg:p-10">
        
        {/* Logo */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-[#0066FF] text-white font-bold text-2xl rounded-[14px] flex items-center justify-center shadow-xs">
            U
          </div>
          <div>
            <h1 className="font-bold text-lg text-[#1A1A1A] leading-tight">UniGestion Mali</h1>
            <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Portail Universitaire</span>
          </div>
        </div>

        <p className="text-xs text-gray-500 mb-6">
          Connectez-vous pour accéder au système de gestion scolaire universitaire.
        </p>

        {error && (
          <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-[14px] text-xs font-semibold mb-6">
            {error}
          </div>
        )}

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-2 gap-1 bg-[#F3F4F6] p-1.5 rounded-[16px] mb-6">
          <button
            type="button"
            onClick={() => { setRole('ADMIN'); setError(''); setLogin('admin@unigestion.edu.ml'); setPassword('admin123'); }}
            className={`py-2.5 rounded-[12px] text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              role === 'ADMIN' ? 'bg-white text-[#0066FF] shadow-xs' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Shield className="w-4 h-4" />
            Administrateur
          </button>
          <button
            type="button"
            onClick={() => { setRole('ETUDIANT'); setError(''); setLogin('2024-USTTB-001'); setPassword('etudiant123'); }}
            className={`py-2.5 rounded-[12px] text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              role === 'ETUDIANT' ? 'bg-white text-[#0066FF] shadow-xs' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            Espace Étudiant
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {role === 'ETUDIANT' && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Filière d'études / Spécialité <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedFiliereId}
                onChange={(e) => setSelectedFiliereId(Number(e.target.value))}
                className="w-full h-[48px] bg-white border border-[#E5E7EB] rounded-[14px] px-4 text-sm font-medium text-[#1A1A1A] focus:outline-none focus:border-[#0066FF] transition-colors"
                required
              >
                <option value="">-- Choisir votre filière --</option>
                {filieres.map(f => (
                  <option key={f.id} value={f.id}>{f.code} - {f.nom}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              {role === 'ADMIN' ? 'Email Administrateur' : 'Matricule Étudiant'}
            </label>
            <div className="relative">
              <input
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder={role === 'ADMIN' ? "admin@unigestion.edu.ml" : "2024-USTTB-001"}
                className="w-full h-[48px] bg-white border border-[#E5E7EB] rounded-[14px] px-4 text-sm font-medium text-[#1A1A1A] placeholder-gray-400 focus:outline-none focus:border-[#0066FF] transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-[48px] bg-white border border-[#E5E7EB] rounded-[14px] px-4 text-sm font-medium text-[#1A1A1A] placeholder-gray-400 focus:outline-none focus:border-[#0066FF] transition-colors"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full h-[48px] bg-[#0066FF] hover:bg-blue-700 text-white rounded-[14px] text-sm font-bold flex items-center justify-center gap-2 transition-colors mt-2"
          >
            <span>Se Connecter</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Demo Credentials Help */}
        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
            Comptes Démo Pré-remplis
          </p>
          <div className="text-xs text-gray-500 space-y-1">
            <p><span className="font-semibold text-gray-700">Admin:</span> admin@unigestion.edu.ml / admin123</p>
            <p><span className="font-semibold text-gray-700">Étudiant:</span> 2024-USTTB-001 / etudiant123</p>
          </div>
        </div>

      </div>
    </div>
  );
};
