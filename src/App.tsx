import React, { useState, useEffect } from 'react';
import { AuthUser, NotificationAlerte } from './types/database';
import { DB } from './lib/storage';
import { Header } from './components/Header';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { PHPCodeExporterModal } from './components/PHPCodeExporterModal';
import { MySQLConfigModal } from './components/MySQLConfigModal';

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
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<NotificationAlerte[]>(DB.getNotifications());
  const [isPHPExporterOpen, setIsPHPExporterOpen] = useState(false);
  const [isMySQLConfigOpen, setIsMySQLConfigOpen] = useState(false);

  useEffect(() => {
    // Purge browser LocalStorage to guarantee zero client-side persistence
    try {
      localStorage.clear();
    } catch {}
    // Sync live MySQL database into volatile active session memory
    DB.syncFromMySQL();
  }, []);

  const activeAnnee = DB.getActiveAnneeAcademique();


  const handleMarkNotificationRead = (id: number) => {
    DB.markNotificationRead(id);
    setNotifications(DB.getNotifications());
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  if (!currentUser) {
    return <LoginView onLoginSuccess={(u) => { setCurrentUser(u); setActiveTab(u.role === 'ADMIN' ? 'dashboard' : 'bulletins'); }} />;
  }

  return (
    <div className="min-h-screen bg-[#F5F7F9] text-[#1A1A1A] flex flex-col font-sans antialiased selection:bg-[#0066FF] selection:text-white">
      <div className="flex flex-1 min-h-screen">
        
        {/* Left Sidebar */}
        <Sidebar
          user={currentUser}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
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
            onOpenMySQLConfig={() => setIsMySQLConfigOpen(true)}
            onLogout={handleLogout}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          />

          {/* Tab Views Router */}
          <main className="flex-1 p-3.5 sm:p-6 lg:p-10 max-w-7xl w-full mx-auto">
            {activeTab === 'dashboard' && currentUser.role === 'ADMIN' && (
              <AdminDashboardView setActiveTab={setActiveTab} />
            )}

            {activeTab === 'profil_admin' && currentUser.role === 'ADMIN' && (
              <ProfilAdminView currentUser={currentUser} />
            )}

            {activeTab === 'supports_cours' && (
              <SupportsCoursView currentUser={currentUser} />
            )}

            {currentUser.role === 'ETUDIANT' && activeTab !== 'supports_cours' && (
              <EtudiantPortalView user={currentUser} activeTab={activeTab} setActiveTab={setActiveTab} />
            )}

            {currentUser.role === 'ADMIN' && (
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
                {activeTab === 'utilisateurs' && <UtilisateursView />}
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

      {/* MySQL Config & Status Modal */}
      <MySQLConfigModal
        isOpen={isMySQLConfigOpen}
        onClose={() => setIsMySQLConfigOpen(false)}
      />
    </div>
  );
}
