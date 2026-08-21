import React from 'react';
import {
  LayoutDashboard,
  Building2,
  BookOpen,
  GraduationCap,
  Layers,
  Users,
  UserCheck,
  FileText,
  Calendar,
  UserPlus,
  Award,
  AlertCircle,
  FileCheck2,
  CreditCard,
  History,
  Settings,
  Code,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Clock,
  Trash2,
  User,
  X,
  Lock,
  ShieldCheck
} from 'lucide-react';
import { AuthUser } from '../types/database';
import { DB } from '../lib/storage';

export type ActiveTab =
  | 'dashboard'
  | 'profil_admin'
  | 'supports_cours'
  | 'filieres'
  | 'classes'
  | 'etudiants'
  | 'enseignants'
  | 'matieres'
  | 'semestres'
  | 'inscriptions'
  | 'notes'
  | 'absences'
  | 'examen'
  | 'paiements'
  | 'annees'
  | 'administrateurs'
  | 'utilisateurs'
  | 'corbeille'
  | 'historique'
  | 'parametres'
  | 'profil_etudiant';

interface SidebarProps {
  user: AuthUser;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isCollapsed: boolean;
  setIsCollapsed: (v: boolean) => void;
  onLogout: () => void;
  isMobileOpen?: boolean;
  setIsMobileOpen?: (v: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  activeTab,
  setActiveTab,
  isCollapsed,
  setIsCollapsed,
  onLogout,
  isMobileOpen = false,
  setIsMobileOpen
}) => {
  const isAdmin = user.role?.toUpperCase() !== 'ETUDIANT';
  const universite = DB.getUniversites()[0];

  const adminNav = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'filieres', label: 'Filières', icon: Layers },
    { id: 'classes', label: 'Classes', icon: Users },
    { id: 'etudiants', label: 'Étudiants', icon: GraduationCap },
    { id: 'enseignants', label: 'Enseignants', icon: UserCheck },
    { id: 'matieres', label: 'Matières', icon: FileText },
    { id: 'semestres', label: 'Semestres', icon: Calendar },
    { id: 'inscriptions', label: 'Inscriptions', icon: UserPlus },
    { id: 'notes', label: 'Saisie des Notes', icon: Award },
    { id: 'absences', label: 'Absences & Alertes', icon: AlertCircle },
    { id: 'paiements', label: 'Paiements', icon: CreditCard },
    { id: 'annees', label: 'Années Académiques', icon: Clock },
    { id: 'utilisateurs', label: 'Utilisateurs & Accès', icon: ShieldCheck },
    { id: 'corbeille', label: 'Corbeille', icon: Trash2 },
    { id: 'historique', label: 'Historique', icon: History },
    { id: 'profil_admin', label: 'Mon Profil', icon: User },
    { id: 'parametres', label: 'Paramètres', icon: Settings },
  ];

  const isStudentBlocked = !isAdmin && (
    DB.isGlobalStudentLockActive() ||
    user?.etudiantDetail?.statut_compte === 'Bloqué' ||
    user?.etudiantDetail?.est_bloque ||
    user?.etudiantDetail?.statut === 'Bloqué' ||
    (user?.etudiantDetail?.statut as string) === 'Suspendu'
  );

  const studentNav = isStudentBlocked ? [
    { id: 'profil_etudiant', label: 'Accès Bloqué', icon: Lock },
  ] : [
    { id: 'profil_etudiant', label: 'Mon Profil', icon: GraduationCap },
    { id: 'supports_cours', label: 'Supports de cours', icon: BookOpen },
    { id: 'examen', label: 'Examen & Notes', icon: Award },
    { id: 'absences', label: 'Absences', icon: AlertCircle },
    { id: 'paiements', label: 'Mes Paiements', icon: CreditCard },
  ];

  const navItems = isAdmin ? adminNav : studentNav;

  const handleTabClick = (tabId: ActiveTab) => {
    setActiveTab(tabId);
    if (setIsMobileOpen) {
      setIsMobileOpen(false);
    }
  };

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside
        className={`hidden lg:flex ${
          isCollapsed ? 'w-[80px]' : 'w-[260px]'
        } h-screen bg-white border-r border-[#E5E7EB] flex-col transition-all duration-200 sticky top-0 z-30 select-none flex-shrink-0`}
      >
        {/* Brand Header */}
        <div className="p-6 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            {universite?.logo_url ? (
              <div className="w-10 h-10 bg-white rounded-[12px] border border-slate-200 flex items-center justify-center p-1 flex-shrink-0 shadow-xs overflow-hidden">
                <img
                  src={universite.logo_url}
                  alt="Logo"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="w-10 h-10 bg-[#0066FF] rounded-[12px] flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                U
              </div>
            )}
            {!isCollapsed && (
              <div className="overflow-hidden">
                <span className="font-bold tracking-tight text-sm text-[#1A1A1A] block truncate max-w-[140px]" title={universite?.nom || 'UniGestion'}>
                  {universite?.nom ? (universite.nom.length > 18 ? universite.nom.substring(0, 18) + '...' : universite.nom) : 'UniGestion'}
                </span>
                <span className="text-[10px] text-blue-600 uppercase font-bold tracking-wider block">
                  UniGestion ML
                </span>
              </div>
            )}
          </div>

          <button type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-[10px] text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title={isCollapsed ? 'Déplier le menu' : 'Rétracter le menu'}
          >
            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto py-2">
          {!isCollapsed && (
            <div className="px-3 py-2 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider">
              {isAdmin ? 'Administration' : 'Portail Étudiant'}
            </div>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleTabClick(item.id as ActiveTab)}
                title={isCollapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-[14px] text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[#F0F7FF] text-[#0066FF] font-semibold shadow-xs'
                    : 'text-[#6B7280] hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-[#0066FF]' : 'text-gray-400'}`} />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* User Footer Profile */}
        <div className="p-4 border-t border-gray-100">
          <div className="bg-[#F9FAFB] rounded-[20px] p-3 flex items-center gap-3 border border-[#F3F4F6]">
            <div className="w-9 h-9 bg-gray-200 text-[#0066FF] font-bold rounded-full flex items-center justify-center text-sm flex-shrink-0">
              {user?.prenom?.[0] || 'U'}
              {user?.nom?.[0] || 'N'}
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden flex-1">
                <p className="text-xs font-bold text-[#1A1A1A] truncate">
                  {user.prenom} {user.nom}
                </p>
                <p className="text-[10px] text-gray-500 truncate">
                  {isAdmin ? 'Administrateur' : `Mat: ${user.etudiantDetail?.matricule}`}
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* MOBILE OVERLAY DRAWER */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileOpen && setIsMobileOpen(false)}
          />

          {/* Slide-over Menu Panel */}
          <div className="relative w-[280px] max-w-[82vw] bg-white h-full flex flex-col z-50 shadow-2xl animate-in slide-in-from-left duration-250">
            {/* Mobile Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3 overflow-hidden">
                {universite?.logo_url ? (
                  <div className="w-9 h-9 bg-white rounded-[10px] border border-slate-200 flex items-center justify-center p-1 flex-shrink-0 shadow-xs overflow-hidden">
                    <img
                      src={universite.logo_url}
                      alt="Logo"
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className="w-9 h-9 bg-[#0066FF] rounded-[10px] flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    U
                  </div>
                )}
                <div className="overflow-hidden">
                  <span className="font-bold text-sm text-[#1A1A1A] block truncate max-w-[150px]">{universite?.nom || 'UniGestion'}</span>
                  <span className="text-[10px] text-blue-600 uppercase font-bold">UniGestion ML</span>
                </div>
              </div>
              <button type="button"
                onClick={() => setIsMobileOpen && setIsMobileOpen(false)}
                className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Nav Links */}
            <nav className="flex-1 px-3 space-y-1 overflow-y-auto py-3">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wider">
                {isAdmin ? 'Administration' : 'Portail Étudiant'}
              </div>

              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleTabClick(item.id as ActiveTab)}
                    className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-[12px] text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-[#F0F7FF] text-[#0066FF] font-semibold shadow-xs'
                        : 'text-[#6B7280] hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-[#0066FF]' : 'text-gray-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Mobile User Profile Footer */}
            <div className="p-4 border-t border-gray-100">
              <div className="bg-[#F9FAFB] rounded-[16px] p-3 flex items-center gap-3 border border-[#F3F4F6]">
                <div className="w-9 h-9 bg-gray-200 text-[#0066FF] font-bold rounded-full flex items-center justify-center text-sm flex-shrink-0">
                  {user?.prenom?.[0] || 'U'}
                  {user?.nom?.[0] || 'N'}
                </div>
                <div className="overflow-hidden flex-1">
                  <p className="text-xs font-bold text-[#1A1A1A] truncate">
                    {user.prenom} {user.nom}
                  </p>
                  <p className="text-[10px] text-gray-500 truncate">
                    {isAdmin ? 'Administrateur' : `Mat: ${user.etudiantDetail?.matricule}`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

