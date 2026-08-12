import React from 'react';
import { DB } from '../lib/storage';
import {
  GraduationCap,
  UserCheck,
  BookOpen,
  Layers,
  Award,
  Users,
  FileText,
  UserPlus,
  CreditCard,
  FileCheck2,
  TrendingUp,
  Clock,
  ArrowRight
} from 'lucide-react';
import { ActiveTab } from '../components/Sidebar';

interface AdminDashboardViewProps {
  setActiveTab: (tab: ActiveTab) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ setActiveTab }) => {
  const [isGlobalLocked, setIsGlobalLocked] = React.useState(DB.isGlobalStudentLockActive());
  const etudiants = DB.getEtudiants();
  const enseignants = DB.getEnseignants();
  const filieres = DB.getFilieres();
  const classes = DB.getClasses();
  const matieres = DB.getMatieres();
  const inscriptions = DB.getInscriptions();
  const paiements = DB.getPaiements();
  const bulletins = DB.getBulletins();

  const handleToggleGlobalLock = () => {
    const nextState = !isGlobalLocked;
    DB.setGlobalStudentLock(nextState);
    setIsGlobalLocked(nextState);
  };

  // Total Payments this month
  const totalPaiementsMois = paiements.reduce((sum, p) => sum + p.montant_paye, 0);

  const stats = [
    { label: 'Total Étudiants', value: etudiants.length, badge: '+8.2%', icon: GraduationCap, tab: 'etudiants' },
    { label: 'Enseignants', value: enseignants.length, badge: 'Actifs', icon: UserCheck, tab: 'enseignants' },
    { label: 'Filières', value: filieres.length, badge: 'LMD', icon: Layers, tab: 'filieres' },
    { label: 'Classes', value: classes.length, badge: 'Salles', icon: Users, tab: 'classes' },
    { label: 'Matières (UE)', value: matieres.length, badge: 'Modules', icon: FileText, tab: 'matieres' },
    { label: 'Inscriptions', value: inscriptions.length, badge: 'Validées', icon: UserPlus, tab: 'inscriptions' },
    { label: 'Paiements (FCFA)', value: `${(totalPaiementsMois / 1000).toFixed(0)}k`, badge: 'Scolarité', icon: CreditCard, tab: 'paiements' },
    { label: 'Bulletins Édités', value: bulletins.length, badge: 'Générés', icon: FileCheck2, tab: 'bulletins' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* Global Student Access Lock Banner */}
      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
        isGlobalLocked ? 'bg-red-50 border-red-200 text-red-900' : 'bg-slate-900 border-slate-800 text-white shadow-md'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            isGlobalLocked ? 'bg-red-600 text-white' : 'bg-slate-800 text-emerald-400'
          }`}>
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm">
                {isGlobalLocked ? 'ACCÈS ÉTUDIANTS BLOQUÉ (VERROUILLAGE GLOBAL)' : 'Accès Portail Étudiant Actif'}
              </h3>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                isGlobalLocked ? 'bg-red-600 text-white' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                {isGlobalLocked ? 'VERROUILLÉ' : 'ACCÈS AUTORISÉ'}
              </span>
            </div>
            <p className="text-xs opacity-80 mt-0.5">
              {isGlobalLocked
                ? 'Aucun étudiant ne peut actuellement se connecter. Un message d\'accès indisponible est affiché à la connexion.'
                : 'Les étudiants autorisés peuvent se connecter normalement à leur espace personnel.'}
            </p>
          </div>
        </div>

        <button
          onClick={handleToggleGlobalLock}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 shrink-0 ${
            isGlobalLocked
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
        >
          {isGlobalLocked ? 'Réactiver l\'accès Étudiants' : 'Bloquer l\'accès Étudiants'}
        </button>
      </div>
      
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-[20px] border border-[#E5E7EB] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[#1A1A1A]">Tableau de bord Administrateur</h2>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              En direct
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">Aperçu analytique en temps réel du système scolaire universitaire.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('inscriptions')}
            className="h-[38px] px-4 bg-[#0066FF] hover:bg-blue-700 text-white rounded-[12px] text-xs font-semibold transition-colors shadow-xs flex items-center gap-2"
          >
            <UserPlus className="w-3.5 h-3.5" />
            + Nouvelle Inscription
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            className="h-[38px] px-4 bg-white border border-[#E5E7EB] hover:bg-gray-50 text-[#374151] rounded-[12px] text-xs font-semibold transition-colors flex items-center gap-2"
          >
            <FileText className="w-3.5 h-3.5 text-gray-500" />
            + Saisie des Notes
          </button>
        </div>
      </div>

      {/* Ordered & Compact Analytical Overview Grid */}
      <div className="space-y-4">
        {/* Section 1: Effectifs & Structure Académique */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-[#0066FF]" />
              Structure Académique & Community
            </span>
            <span className="text-[10px] text-gray-400 font-medium">4 indicateurs clefs</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Total Étudiants', value: etudiants.length, badge: '+8.2%', icon: GraduationCap, tab: 'etudiants', color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Enseignants', value: enseignants.length, badge: 'Actifs', icon: UserCheck, tab: 'enseignants', color: 'text-indigo-600', bg: 'bg-indigo-50' },
              { label: 'Filières LMD', value: filieres.length, badge: 'Agrées', icon: Layers, tab: 'filieres', color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Classes Salles', value: classes.length, badge: 'Assignées', icon: Users, tab: 'classes', color: 'text-amber-600', bg: 'bg-amber-50' },
            ].map((s, idx) => {
              const Icon = s.icon;
              return (
                <div
                  key={idx}
                  onClick={() => setActiveTab(s.tab as ActiveTab)}
                  className="bg-white p-3.5 rounded-[16px] border border-[#E5E7EB] shadow-2xs hover:border-[#0066FF] hover:shadow-xs transition-all cursor-pointer group flex items-center justify-between min-h-[76px] h-auto w-full"
                >
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
                      {s.label}
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-bold text-[#1A1A1A] tracking-tight">{s.value}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${s.bg} ${s.color}`}>
                        {s.badge}
                      </span>
                    </div>
                  </div>
                  <div className={`p-2 rounded-[10px] ${s.bg} group-hover:scale-105 transition-transform`}>
                    <Icon className={`w-4 h-4 ${s.color}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 2: Performance, Recouvrement & Inscriptions */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              Activités, Examens & Recouvrement Financier
            </span>
            <span className="text-[10px] text-gray-400 font-medium">4 indicateurs en temps réel</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Unités d\'Enseignement', value: matieres.length, badge: 'Modules', icon: FileText, tab: 'matieres', color: 'text-cyan-600', bg: 'bg-cyan-50' },
              { label: 'Inscriptions Validées', value: inscriptions.length, badge: 'Complets', icon: UserPlus, tab: 'inscriptions', color: 'text-purple-600', bg: 'bg-purple-50' },
              { label: 'Scolarité Recouvrée', value: `${(totalPaiementsMois / 1000).toFixed(0)}k FCFA`, badge: 'Comptabilité', icon: CreditCard, tab: 'paiements', color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Bulletins Générés', value: bulletins.length, badge: 'Édités', icon: FileCheck2, tab: 'bulletins', color: 'text-rose-600', bg: 'bg-rose-50' },
            ].map((s, idx) => {
              const Icon = s.icon;
              return (
                <div
                  key={idx}
                  onClick={() => setActiveTab(s.tab as ActiveTab)}
                  className="bg-white p-3.5 rounded-[16px] border border-[#E5E7EB] shadow-2xs hover:border-[#0066FF] hover:shadow-xs transition-all cursor-pointer group flex items-center justify-between min-h-[76px] h-auto w-full"
                >
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">
                      {s.label}
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-bold text-[#1A1A1A] tracking-tight">{s.value}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${s.bg} ${s.color}`}>
                        {s.badge}
                      </span>
                    </div>
                  </div>
                  <div className={`p-2 rounded-[10px] ${s.bg} group-hover:scale-105 transition-transform`}>
                    <Icon className={`w-4 h-4 ${s.color}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
};
