import React, { useState } from 'react';
import { AuthUser } from '../types/database';
import { DB } from '../lib/storage';
import { GraduationCap, Shield, Lock, Mail, ArrowRight, AlertTriangle, Building2 } from 'lucide-react';

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
  const universite = DB.getUniversites()[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!login.trim() || !password.trim()) {
      setError('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    if (role === 'ADMIN') {
      const users = DB.getUtilisateurs();
      const user = users.find(u => 
        u.email.toLowerCase() === login.toLowerCase().trim() && 
        u.mot_de_passe === password
      );

      if (user) {
        if (user.statut === 'Inactif') {
          setError('Ce compte administrateur est inactif. Veuillez contacter le super administrateur.');
          return;
        }

        const adminDetail = DB.getAdministrateurs().find(a => a.utilisateur_id === user.id) || DB.getAdministrateurs()[0];

        DB.logAccess('CONNEXION', `Connexion administrateur réussie (${login})`, user.id);

        onLoginSuccess({
          id: user.id,
          nom: user.nom,
          prenom: user.prenom,
          email_or_matricule: user.email,
          role: 'ADMIN',
          adminDetail,
          universite_nom: universite?.nom || 'USTTB Bamako'
        });
        return;
      } else {
        setError('Email administrateur ou mot de passe incorrect.');
      }
    } else {
      // ETUDIANT
      if (DB.isGlobalStudentLockActive()) {
        setError('Accès temporairement indisponible. Aucun étudiant ne peut accéder à la plateforme pour le moment. Veuillez réessayer ultérieurement ou contacter l\'administration.');
        return;
      }

      if (!selectedFiliereId) {
        setError('Veuillez obligatoirement sélectionner votre filière d\'études avant de continuer.');
        return;
      }

      const etudiants = DB.getEtudiants();
      const etudiant = etudiants.find(e => 
        (e.matricule.toLowerCase() === login.toLowerCase().trim() || (e.email && e.email.toLowerCase() === login.toLowerCase().trim())) && 
        (e.mot_de_passe ? e.mot_de_passe === password : password === 'etudiant123')
      );

      if (etudiant) {
        // Check Individual Student Account Lock
        if (etudiant.statut_compte === 'Bloqué' || etudiant.est_bloque || etudiant.statut === 'Suspendu' as any) {
          setError('Votre compte étudiant est actuellement bloqué ou inaccessible. Veuillez contacter le service académique de l\'administration.');
          return;
        }

        // Check Filière Access Rights
        const isAuth = DB.isStudentAuthorizedForFiliere(etudiant.id, Number(selectedFiliereId));
        if (!isAuth) {
          setError(`Accès refusé : Vous n'êtes pas officiellement inscrit dans cette filière. Votre accès est restreint aux filières autorisées.`);
          return;
        }

        const targetStudent = { ...etudiant, filiere_id: Number(selectedFiliereId) };

        DB.logAccess('CONNEXION', `Connexion étudiant réussie (Matricule: ${targetStudent.matricule}, Filière ID: ${selectedFiliereId})`, undefined, targetStudent.id);

        onLoginSuccess({
          id: targetStudent.id,
          nom: targetStudent.nom,
          prenom: targetStudent.prenom,
          email_or_matricule: targetStudent.matricule,
          role: 'ETUDIANT',
          etudiantDetail: targetStudent,
          universite_nom: universite?.nom || 'USTTB Bamako'
        });
        return;
      } else {
        setError('Matricule étudiant ou mot de passe incorrect.');
      }
    }
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 bg-cover bg-center relative font-sans"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(15, 23, 42, 0.75), rgba(15, 23, 42, 0.88)), url('https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1920&q=80')`
      }}
    >
      <div className="w-full max-w-[460px] bg-white/95 backdrop-blur-md rounded-2xl border border-white/40 shadow-2xl p-6 sm:p-8 relative z-10 my-6">

        {/* Header Branding with Logo */}
        <div className="flex flex-col items-center text-center mb-6 pb-4 border-b border-slate-200/80">
          {universite?.logo_url ? (
            <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-lg mb-3 border-2 border-slate-200/80 p-2 overflow-hidden">
              <img
                src={universite.logo_url}
                alt={`Logo ${universite.nom}`}
                className="w-full h-full object-contain rounded-xl"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg mb-3 border-2 border-white/50">
              <GraduationCap className="w-9 h-9 text-blue-400" />
            </div>
          )}
          <h1 className="font-black text-xl text-slate-900 tracking-tight leading-snug">
            {universite?.nom || 'Université des Sciences et des Techniques de Bamako'}
          </h1>
          <p className="text-xs text-blue-600 font-bold tracking-wide uppercase mt-1 flex items-center gap-1 justify-center">
            <Building2 className="w-3.5 h-3.5" />
            Portail Officiel d'Accès UniGestion ML
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-red-50 border-l-4 border-red-600 text-red-800 rounded-r-lg text-xs font-semibold mb-5 flex items-start gap-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1.5 rounded-xl mb-6 border border-slate-200">
          <button
            type="button"
            onClick={() => { setRole('ADMIN'); setError(''); setLogin(''); setPassword(''); }}
            className={`py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              role === 'ADMIN' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-4 h-4 text-blue-600" />
            Administrateur
          </button>
          <button
            type="button"
            onClick={() => { setRole('ETUDIANT'); setError(''); setLogin(''); setPassword(''); }}
            className={`py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              role === 'ETUDIANT' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GraduationCap className="w-4 h-4 text-emerald-600" />
            Espace Étudiant
          </button>
        </div>

        {/* Login Form or Blocked Message */}
        {role === 'ETUDIANT' && DB.isGlobalStudentLockActive() ? (
          <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-center space-y-3 my-2 animate-in fade-in">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-sm text-red-900 uppercase tracking-tight">Accès Étudiant Bloqué</h3>
            <p className="text-xs text-red-700 leading-relaxed font-medium">
              L'accès à l'espace étudiant est actuellement verrouillé par l'administration. Les formulaires de connexion et les colonnes de données sont désactivés.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {role === 'ETUDIANT' && (
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Filière d'études / Spécialité <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedFiliereId}
                  onChange={(e) => setSelectedFiliereId(Number(e.target.value))}
                  className="w-full h-11 bg-white border border-slate-300 rounded-xl px-3.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all"
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
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                {role === 'ADMIN' ? 'Email Administrateur' : 'Matricule Étudiant'} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  placeholder={role === 'ADMIN' ? "nom@unigestion.edu.ml" : "Ex: 2026-MAT-101"}
                  className="w-full h-11 bg-white border border-slate-300 rounded-xl px-3.5 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Mot de passe <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-11 bg-white border border-slate-300 rounded-xl px-3.5 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.99] mt-3 cursor-pointer"
            >
              <span>Se Connecter</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
