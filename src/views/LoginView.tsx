import React, { useState } from 'react';
import { AuthUser } from '../types/database';
import { DB } from '../lib/storage';
import { safeFetchJson } from '../lib/api';
import { DatabaseErrorBanner } from '../components/DatabaseErrorBanner';
import { GraduationCap, Shield, Lock, ArrowRight, AlertTriangle, Building2, RefreshCw } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: AuthUser) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [selectedPortal, setSelectedPortal] = useState<'ADMIN' | 'ETUDIANT' | null>(null);
  const [role, setRole] = useState<'ADMIN' | 'ETUDIANT'>('ADMIN');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [selectedFiliereId, setSelectedFiliereId] = useState<number | ''>(1);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const filieres = DB.getFilieres();
  const universite = DB.getUniversites()[0];

  const handleSelectPortal = (p: 'ADMIN' | 'ETUDIANT') => {
    setSelectedPortal(p);
    setRole(p);
    setError('');
    setLogin('');
    setPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!login.trim() || !password.trim()) {
      setError('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    if (role === 'ETUDIANT' && !selectedFiliereId) {
      setError('Veuillez obligatoirement sélectionner votre filière d\'études avant de continuer.');
      return;
    }

    setIsLoading(true);

    try {
      const data = await safeFetchJson('/api/mysql/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          login: login.trim(),
          password,
          filiere_id: role === 'ETUDIANT' ? Number(selectedFiliereId) : undefined
        })
      });

      if (data.success && data.user) {
        await DB.syncFromMySQL();
        DB.logAccess('CONNEXION', `Connexion ${role.toLowerCase()} réussie (${login})`, data.user.id);
        onLoginSuccess(data.user);
        return;
      }

      setError(data.message || 'Identifiant ou mot de passe incorrect.');
    } catch (err: any) {
      setError(err?.message || 'Erreur de connexion : Impossible de contacter le serveur backend.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 bg-cover bg-center relative font-sans"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(15, 23, 42, 0.78), rgba(15, 23, 42, 0.90)), url('https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1920&q=80')`
      }}
    >
      <div className="w-[300px] max-w-[300px] bg-white/95 backdrop-blur-md rounded-2xl border border-white/40 shadow-2xl p-5 sm:p-6 relative z-10 my-6 transition-all duration-300">

        {/* Header Branding with Logo - Shown only on initial selection screen */}
        {selectedPortal === null && (
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
        )}

        {/* Initial Portal Selection Screen */}
        {selectedPortal === null ? (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center mb-3">
              <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Veuillez sélectionner votre espace
              </h2>
            </div>

            <div className="flex flex-col gap-2.5">
              {/* Button Administration */}
              <button
                type="button"
                onClick={() => handleSelectPortal('ADMIN')}
                className="w-full px-4 py-2.5 bg-white hover:bg-blue-50/50 text-slate-800 border border-slate-200 hover:border-blue-300 rounded-[15px] flex items-center justify-between transition-all shadow-sm hover:shadow active:scale-[0.98] cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center shadow-xs group-hover:bg-blue-600 group-hover:text-white transition-all shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="block font-black text-xs text-slate-900 uppercase tracking-wide group-hover:text-blue-700 transition-colors">
                      ADMINISTRATION
                    </span>
                    <span className="block text-[10px] text-slate-500 font-medium">
                      Espace Gestion & Staff
                    </span>
                  </div>
                </div>
                <div className="w-6 h-6 bg-slate-100 group-hover:bg-blue-100 rounded-full flex items-center justify-center transition-colors shrink-0">
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-700 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>

              {/* Button Espace Etudiant */}
              <button
                type="button"
                onClick={() => handleSelectPortal('ETUDIANT')}
                className="w-full px-4 py-2.5 bg-white hover:bg-sky-50/50 text-slate-800 border border-slate-200 hover:border-sky-300 rounded-[15px] flex items-center justify-between transition-all shadow-sm hover:shadow active:scale-[0.98] cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-sky-100 text-sky-700 rounded-full flex items-center justify-center shadow-xs group-hover:bg-sky-600 group-hover:text-white transition-all shrink-0">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="block font-black text-xs text-slate-900 uppercase tracking-wide group-hover:text-sky-700 transition-colors">
                      ESPACE ÉTUDIANT
                    </span>
                    <span className="block text-[10px] text-slate-500 font-medium">
                      Consultation des Notes & Bulletins
                    </span>
                  </div>
                </div>
                <div className="w-6 h-6 bg-slate-100 group-hover:bg-sky-100 rounded-full flex items-center justify-center transition-colors shrink-0">
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-700 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            </div>
          </div>
        ) : (
          /* Portal Login Form View */
          <div className="animate-in fade-in duration-200">
            {error && (
              <div className="p-3 bg-red-50 border-l-4 border-red-600 text-red-800 rounded-r-lg text-xs font-semibold mb-4 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed whitespace-pre-line">{error}</span>
              </div>
            )}

            {/* Login Form or Blocked Message */}
            {role === 'ETUDIANT' && DB.isGlobalStudentLockActive() ? (
              <div className="p-5 bg-red-50 border border-red-200 rounded-2xl text-center space-y-3 my-2">
                <div className="w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center mx-auto shadow-inner">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-xs text-red-900 uppercase tracking-tight">Accès Étudiant Bloqué</h3>
                <p className="text-[11px] text-red-700 leading-relaxed font-medium">
                  L'accès à l'espace étudiant est verrouillé.
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedPortal(null)}
                  className="w-full mt-2 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all cursor-pointer"
                >
                  ← Retour
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {role === 'ETUDIANT' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Filière d'études / Spécialité <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedFiliereId}
                      onChange={(e) => setSelectedFiliereId(Number(e.target.value))}
                      className="w-full h-10 bg-white border border-slate-300 rounded-lg px-3 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all"
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
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    {role === 'ADMIN' ? 'Email Administrateur' : 'Matricule Étudiant'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    placeholder={role === 'ADMIN' ? "nom@unigestion.edu.ml" : "Ex: 2026-MAT-101"}
                    className="w-full h-10 bg-white border border-slate-300 rounded-lg px-3 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Mot de passe <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-10 bg-white border border-slate-300 rounded-lg px-3 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-10 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.99] mt-2 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Connexion...</span>
                    </>
                  ) : (
                    <>
                      <span>Se Connecter</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>

                {/* Return Button at the Very Bottom */}
                <div className="pt-2 border-t border-slate-200 text-center">
                  <button
                    type="button"
                    onClick={() => setSelectedPortal(null)}
                    className="w-full py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>← Retour</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
