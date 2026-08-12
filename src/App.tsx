import React, { useState, useEffect } from 'react';
import { AuthUser, NotificationAlerte } from './types/database';
import { DB } from './lib/storage';
import { Header } from './components/Header';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { PHPCodeExporterModal } from './components/PHPCodeExporterModal';

// Views
import { LoginView } from './views/LoginView';
import { AdminDashboardView } from './views/AdminDashboardView';
import { FilieresView } from './views/FilieresView';
import { ClassesView } from './views/ClassesView';
import { EtudiantsView } from './views/EtudiantsView';
import { EnseignantsView } from './views/EnseignantsView';
import { MatieresView } from './views/MatieresView';
import { SemestresView } from './views/SemestresView';
import { InscriptionsView } from './views/InscriptionsView';
import { NotesView } from './views/NotesView';
import { AbsencesView } from './views/AbsencesView';
import { BulletinsView } from './views/BulletinsView';
import { PaiementsView } from './views/PaiementsView';
import { AnneesAcademiquesView } from './views/AnneesAcademiquesView';
import { UtilisateursView } from './views/UtilisateursView';
import { EtudiantPortalView } from './views/EtudiantPortalView';
import { CorbeilleView } from './views/CorbeilleView';
import { SupportsCoursView } from './views/SupportsCoursView';
import { ProfilAdminView } from './views/ProfilAdminView';
import { ParametresView } from './views/ParametresView';
import { HistoriqueView } from './views/HistoriqueView';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem('unigestion_active_user') || sessionStorage.getItem('unigestion_active_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const isStaffOrAdmin = currentUser ? currentUser.role?.toUpperCase() !== 'ETUDIANT' : false;

  const getInitialTab = (): ActiveTab => {
    try {
      const hash = window.location.hash.replace(/^#\/?/, '').trim() as ActiveTab;
      if (hash) return hash;
      const saved = localStorage.getItem('unigestion_active_tab') as ActiveTab;
      if (saved) return saved;
    } catch {}
    return isStaffOrAdmin ? 'dashboard' : 'bulletins';
  };

  const [activeTab, setActiveTabState] = useState<ActiveTab>(getInitialTab);

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTabState(tab);
    try {
      window.location.hash = tab;
      localStorage.setItem('unigestion_active_tab', tab);
    } catch {}
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '').trim() as ActiveTab;
      if (hash) {
        setActiveTabState(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<NotificationAlerte[]>(DB.getNotifications());
  const [isPHPExporterOpen, setIsPHPExporterOpen] = useState(false);

  useEffect(() => {
    // Initialize storage from localStorage, backend JSON file, and MySQL pool if available
    DB.initStorage();
  }, []);

  const handleSetCurrentUser = (user: AuthUser | null) => {
    setCurrentUser(user);
    try {
      if (user) {
        localStorage.setItem('unigestion_active_user', JSON.stringify(user));
        sessionStorage.setItem('unigestion_active_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('unigestion_active_user');
        sessionStorage.removeItem('unigestion_active_user');
      }
    } catch {}
  };

  const activeAnnee = DB.getActiveAnneeAcademique();

  const handleMarkNotificationRead = (id: number) => {
    DB.markNotificationRead(id);
    setNotifications(DB.getNotifications());
  };

  const handleLogout = () => {
    handleSetCurrentUser(null);
  };

  if (!currentUser) {
    return (
      <LoginView
        onLoginSuccess={(u) => {
          handleSetCurrentUser(u);
          const isStaff = u.role?.toUpperCase() !== 'ETUDIANT';
          const defaultTab = isStaff ? 'dashboard' : 'bulletins';
          handleTabChange(defaultTab);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7F9] text-[#1A1A1A] flex flex-col font-sans antialiased selection:bg-[#0066FF] selection:text-white">
      <div className="flex flex-1 min-h-screen">
        
        {/* Left Sidebar */}
        <Sidebar
          user={currentUser}
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
          onLogout={handleLogout}
          isMobileOpen={isMobileMenuOpen}
          setIsMobileOpen={setIsMobileMenuOpen}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* Top Sticky Header */}
          <Header
            user={currentUser}
            activeAnnee={activeAnnee}
            notifications={notifications}
            onMarkNotificationRead={handleMarkNotificationRead}
            onOpenPHPExporter={() => setIsPHPExporterOpen(true)}
            onLogout={handleLogout}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          />

          {/* Tab Views Router */}
          <main className="flex-1 p-3.5 sm:p-6 lg:p-10 max-w-7xl w-full mx-auto">
            {activeTab === 'dashboard' && isStaffOrAdmin && (
              <AdminDashboardView setActiveTab={handleTabChange} />
            )}

            {activeTab === 'profil_admin' && isStaffOrAdmin && (
              <ProfilAdminView currentUser={currentUser} />
            )}

            {activeTab === 'supports_cours' && (
              <SupportsCoursView currentUser={currentUser} />
            )}

            {!isStaffOrAdmin && activeTab !== 'supports_cours' && (
              <EtudiantPortalView user={currentUser} activeTab={activeTab} setActiveTab={handleTabChange} />
            )}

            {isStaffOrAdmin && (
              <>
                {activeTab === 'filieres' && <FilieresView />}
                {activeTab === 'classes' && <ClassesView />}
                {activeTab === 'etudiants' && <EtudiantsView />}
                {activeTab === 'enseignants' && <EnseignantsView />}
                {activeTab === 'matieres' && <MatieresView />}
                {activeTab === 'semestres' && <SemestresView />}
                {activeTab === 'inscriptions' && <InscriptionsView />}
                {activeTab === 'notes' && <NotesView />}
                {activeTab === 'absences' && <AbsencesView />}
                {activeTab === 'bulletins' && <BulletinsView />}
                {activeTab === 'paiements' && <PaiementsView />}
                {activeTab === 'annees' && <AnneesAcademiquesView />}
                {(activeTab === 'administrateurs' || activeTab === 'utilisateurs') && <UtilisateursView />}
                {activeTab === 'corbeille' && <CorbeilleView />}
                {activeTab === 'historique' && <HistoriqueView />}
                {activeTab === 'parametres' && <ParametresView />}
              </>
            )}
          </main>
        </div>

      </div>

      {/* PHP Code Exporter Modal */}
      <PHPCodeExporterModal
        isOpen={isPHPExporterOpen}
        onClose={() => setIsPHPExporterOpen(false)}
      />
    </div>
  );
}
