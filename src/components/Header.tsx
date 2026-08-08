import React from 'react';
import { Search, LogOut, Menu, Database } from 'lucide-react';
import { AuthUser, NotificationAlerte, AnneeAcademique } from '../types/database';

interface HeaderProps {
  user: AuthUser;
  activeAnnee: AnneeAcademique;
  notifications: NotificationAlerte[];
  onMarkNotificationRead: (id: number) => void;
  onOpenPHPExporter?: () => void;
  onOpenMySQLConfig?: () => void;
  onLogout: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  activeAnnee,
  onOpenMySQLConfig,
  onLogout,
  searchQuery,
  setSearchQuery,
  onToggleMobileMenu
}) => {

  return (
    <header className="h-[70px] lg:h-[80px] bg-white border-b border-[#E5E7EB] flex items-center justify-between px-4 sm:px-6 lg:px-10 sticky top-0 z-20">
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Hamburger Menu Toggle (Mobile) */}
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-[12px] transition-colors -ml-1"
            title="Ouvrir le menu de navigation"
            aria-label="Ouvrir le menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        )}

        <div className="min-w-0 flex-1">
          <h1 className="text-xs sm:text-base lg:text-xl font-bold text-[#1A1A1A] truncate max-w-xs sm:max-w-md lg:max-w-none leading-snug">
            {user.role === 'ADMIN' 
              ? (user.universite_nom || 'Université des Sciences, des Techniques et des Technologies de Bamako')
              : 'Espace Étudiant Mali'}
          </h1>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-0.5">
            <span className="px-2.5 py-0.5 bg-gray-100 text-[#6B7280] rounded-full text-[10px] sm:text-xs font-semibold whitespace-nowrap">
              {activeAnnee.libelle || 'Année Académique 2024-2025'}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-[#0066FF] rounded-full text-[10px] sm:text-xs font-medium whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0066FF]"></span>
              Active
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 lg:gap-6">
        {/* Global Search */}
        <div className="relative hidden md:block">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={user.role === 'ADMIN' ? "Rechercher étudiant, matricule, classe..." : "Rechercher matière, note..."}
            className="w-[200px] lg:w-[300px] h-[40px] lg:h-[44px] bg-[#F9FAFB] border border-[#E5E7EB] rounded-[14px] pl-10 pr-4 text-xs lg:text-sm text-[#1A1A1A] placeholder-gray-400 focus:outline-none focus:border-[#0066FF] focus:bg-white transition-all"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        </div>

        {/* Logout button */}
        <button
          onClick={onLogout}
          title="Déconnexion"
          className="w-[40px] h-[40px] lg:w-[44px] lg:h-[44px] flex items-center justify-center text-red-600 border border-red-100 rounded-[14px] hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};

