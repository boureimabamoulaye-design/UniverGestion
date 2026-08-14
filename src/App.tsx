import React, { useState, useEffect, Suspense, lazy } from 'react';
import { AuthUser, NotificationAlerte } from './types/database';
import { DB } from './lib/storage';
import { Header } from './components/Header';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { PHPCodeExporterModal } from './components/PHPCodeExporterModal';
import { ToastContainer } from './components/ToastContainer';
import { EtudiantsSkeleton } from './components/skeletons/EtudiantsSkeleton';
import { NotesSkeleton } from './components/skeletons/NotesSkeleton';
import { TableSkeleton } from './components/skeletons/TableSkeleton';
import { DashboardSkeleton } from './components/skeletons/DashboardSkeleton';

// Views - Lazy Loaded for instant tab responsiveness
import { LoginView } from './views/LoginView';

const AdminDashboardView = lazy(() => import('./views/AdminDashboardView').then(m => ({ default: m.AdminDashboardView })));
const FilieresView = lazy(() => import('./views/FilieresView').then(m => ({ default: m.FilieresView })));
const ClassesView = lazy(() => import('./views/ClassesView').then(m => ({ default: m.ClassesView })));
const EtudiantsView = lazy(() => import('./views/EtudiantsView').then(m => ({ default: m.EtudiantsView })));
const EnseignantsView = lazy(() => import('./views/EnseignantsView').then(m => ({ default: m.EnseignantsView })));
const MatieresView = lazy(() => import('./views/MatieresView').then(m => ({ default: m.MatieresView })));
const SemestresView = lazy(() => import('./views/SemestresView').then(m => ({ default: m.SemestresView })));
const InscriptionsView = lazy(() => import('./views/InscriptionsView').then(m => ({ default: m.InscriptionsView })));
const NotesView = lazy(() => import('./views/NotesView').then(m => ({ default: m.NotesView })));
const AbsencesView = lazy(() => import('./views/AbsencesView').then(m => ({ default: m.AbsencesView })));
const BulletinsView = lazy(() => import('./views/BulletinsView').then(m => ({ default: m.BulletinsView })));
const PaiementsView = lazy(() => import('./views/PaiementsView').then(m => ({ default: m.PaiementsView })));
const AnneesAcademiquesView = lazy(() => import('./views/AnneesAcademiquesView').then(m => ({ default: m.AnneesAcademiquesView })));
const UtilisateursView = lazy(() => import('./views/UtilisateursView').then(m => ({ default: m.UtilisateursView })));
const EtudiantPortalView = lazy(() => import('./views/EtudiantPortalView').then(m => ({ default: m.EtudiantPortalView })));
const CorbeilleView = lazy(() => import('./views/CorbeilleView').then(m => ({ default: m.CorbeilleView })));
const SupportsCoursView = lazy(() => import('./views/SupportsCoursView').then(m => ({ default: m.SupportsCoursView })));
const ProfilAdminView = lazy(() => import('./views/ProfilAdminView').then(m => ({ default: m.ProfilAdminView })));
const ParametresView = lazy(() => import('./views/ParametresView').then(m => ({ default: m.ParametresView })));
const HistoriqueView = lazy(() => import('./views/HistoriqueView').then(m => ({ default: m.HistoriqueView })));

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
      const saved = localStorage.getItem('unigestion_active_tab') as ActiveTab;
      if (saved) return saved;
    } catch {}
    return isStaffOrAdmin ? 'dashboard' : 'bulletins';
  };

  const [activeTab, setActiveTabState] = useState<ActiveTab>(getInitialTab);

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTabState(tab);
    try {
      localStorage.setItem('unigestion_active_tab', tab);
    } catch {}
  };

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
    if (currentUser) {
      const roleLabel = currentUser.role === 'ADMIN' ? 'Administrateur' : 'Étudiant';
      DB.logAccess(
        'DECONNEXION',
        `Déconnexion réussie : ${currentUser.prenom} ${currentUser.nom} (${roleLabel} - ${currentUser.email_or_matricule})`,
        currentUser.role === 'ADMIN' ? currentUser.id : undefined,
        currentUser.role === 'ETUDIANT' ? currentUser.id : undefined
      );
    }
    handleSetCurrentUser(null);
  };

  if (!currentUser) {
    return (
      <>
        <LoginView
          onLoginSuccess={(u) => {
            handleSetCurrentUser(u);
            const isStaff = u.role?.toUpperCase() !== 'ETUDIANT';
            const defaultTab = isStaff ? 'dashboard' : 'bulletins';
            handleTabChange(defaultTab);
          }}
        />
        <ToastContainer />
      </>
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
          <main className="flex-1 p-3.5 sm:p-6 lg:p-10 max-w-7xl w-full mx-auto transition-all duration-200">
            {activeTab === 'dashboard' && isStaffOrAdmin && (
              <Suspense fallback={<DashboardSkeleton />}>
                <AdminDashboardView setActiveTab={handleTabChange} />
              </Suspense>
            )}

            {activeTab === 'profil_admin' && isStaffOrAdmin && (
              <Suspense fallback={<TableSkeleton title="Profil" />}>
                <ProfilAdminView currentUser={currentUser} />
              </Suspense>
            )}

            {activeTab === 'supports_cours' && (
              <Suspense fallback={<TableSkeleton title="Supports de cours" />}>
                <SupportsCoursView currentUser={currentUser} />
              </Suspense>
            )}

            {!isStaffOrAdmin && activeTab !== 'supports_cours' && (
              <Suspense fallback={<DashboardSkeleton />}>
                <EtudiantPortalView user={currentUser} activeTab={activeTab} setActiveTab={handleTabChange} />
              </Suspense>
            )}

            {isStaffOrAdmin && (
              <>
                {activeTab === 'filieres' && (
                  <Suspense fallback={<TableSkeleton title="Filières" />}>
                    <FilieresView />
                  </Suspense>
                )}
                {activeTab === 'classes' && (
                  <Suspense fallback={<TableSkeleton title="Classes" />}>
                    <ClassesView />
                  </Suspense>
                )}
                {activeTab === 'etudiants' && (
                  <Suspense fallback={<EtudiantsSkeleton />}>
                    <EtudiantsView />
                  </Suspense>
                )}
                {activeTab === 'enseignants' && (
                  <Suspense fallback={<TableSkeleton title="Enseignants" />}>
                    <EnseignantsView />
                  </Suspense>
                )}
                {activeTab === 'matieres' && (
                  <Suspense fallback={<TableSkeleton title="Matières" />}>
                    <MatieresView />
                  </Suspense>
                )}
                {activeTab === 'semestres' && (
                  <Suspense fallback={<TableSkeleton title="Semestres" />}>
                    <SemestresView />
                  </Suspense>
                )}
                {activeTab === 'inscriptions' && (
                  <Suspense fallback={<TableSkeleton title="Inscriptions" />}>
                    <InscriptionsView />
                  </Suspense>
                )}
                {activeTab === 'notes' && (
                  <Suspense fallback={<NotesSkeleton />}>
                    <NotesView />
                  </Suspense>
                )}
                {activeTab === 'absences' && (
                  <Suspense fallback={<TableSkeleton title="Absences" />}>
                    <AbsencesView />
                  </Suspense>
                )}
                {activeTab === 'bulletins' && (
                  <Suspense fallback={<TableSkeleton title="Bulletins" />}>
                    <BulletinsView />
                  </Suspense>
                )}
                {activeTab === 'paiements' && (
                  <Suspense fallback={<TableSkeleton title="Paiements" />}>
                    <PaiementsView />
                  </Suspense>
                )}
                {activeTab === 'annees' && (
                  <Suspense fallback={<TableSkeleton title="Années Académiques" />}>
                    <AnneesAcademiquesView />
                  </Suspense>
                )}
                {(activeTab === 'administrateurs' || activeTab === 'utilisateurs') && (
                  <Suspense fallback={<TableSkeleton title="Utilisateurs" />}>
                    <UtilisateursView />
                  </Suspense>
                )}
                {activeTab === 'corbeille' && (
                  <Suspense fallback={<TableSkeleton title="Corbeille" />}>
                    <CorbeilleView />
                  </Suspense>
                )}
                {activeTab === 'historique' && (
                  <Suspense fallback={<TableSkeleton title="Historique" />}>
                    <HistoriqueView />
                  </Suspense>
                )}
                {activeTab === 'parametres' && (
                  <Suspense fallback={<TableSkeleton title="Paramètres" />}>
                    <ParametresView />
                  </Suspense>
                )}
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

      {/* Real-time Toast Notifications for Database actions */}
      <ToastContainer />
    </div>
  );
}
