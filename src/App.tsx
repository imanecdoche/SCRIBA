import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, Users, Globe, HelpCircle, Menu, Download,
  ChevronLeft, Layout, Library, Compass, Landmark, LayoutGrid, CheckSquare, Loader2
} from 'lucide-react';
import { storage } from './utils/storage';
import { Project, Chapter, CharacterItem, WorldItem, PlotHole } from './types';
import ProjectList from './components/ProjectList';
import ChapterEditor from './components/ChapterEditor';
import BibleManager from './components/BibleManager';
import PlotHoleTracker from './components/PlotHoleTracker';
import Sidebar from './components/Sidebar';
import SettingsModal from './components/SettingsModal';
import ExportPdfModal from './components/ExportPdfModal';
import AuthScreen from './components/AuthScreen';
import { auth, db } from './utils/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

const APP_VERSION = '2.0.9';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [syncingCloud, setSyncingCloud] = useState(false);
  const [appLogo, setAppLogo] = useState(() => {
    return localStorage.getItem('scriba_global_logo') || '✍️';
  });

  // Real-time subscription to global appSettings
  useEffect(() => {
    const settingsRef = doc(db, 'appSettings', 'global');
    const unsubscribeLogo = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.appLogo) {
          setAppLogo(data.appLogo);
          localStorage.setItem('scriba_global_logo', data.appLogo);
        }
      }
    }, (err) => {
      console.warn("Gagal berlangganan pengaturan logo:", err);
    });
    return () => unsubscribeLogo();
  }, []);

  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string>('');
  
  // Scope items
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [characters, setCharacters] = useState<CharacterItem[]>([]);
  const [worldItems, setWorldItems] = useState<WorldItem[]>([]);
  const [plotHoles, setPlotHoles] = useState<PlotHole[]>([]);

  // Monitor auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setAuthLoading(true);
      if (currentUser) {
        setSyncingCloud(true);
        try {
          // Load data from firestore online
          await storage.syncFromFirestore(currentUser.uid);
        } catch (e) {
          console.error("Gagal melakukan penyelarasan awal cloud: ", e);
        }

        // Save session/user profile info to Firestore /users for admin lists
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          await setDoc(userRef, {
            email: currentUser.email || 'Akun Google',
            lastActive: new Date().toISOString()
          }, { merge: true });
        } catch (err) {
          console.error("Gagal menyimpan profil pengguna ke database:", err);
        }

        setSyncingCloud(false);
        setUser(currentUser);
        
        // Reload layout
        const allProjs = storage.getProjects();
        setProjects(allProjs);
        const activeId = storage.getCurrentProjectId();
        setCurrentProjectId(activeId);
        if (activeId) {
          setChapters(storage.getChapters(activeId));
          setCharacters(storage.getCharacters(activeId));
          setWorldItems(storage.getWorldItems(activeId));
          setPlotHoles(storage.getPlotHoles(activeId));
        }
      } else {
        setUser(null);
        storage.clearAll();
        // Clear state
        setProjects([]);
        setCurrentProjectId('');
        setChapters([]);
        setCharacters([]);
        setWorldItems([]);
        setPlotHoles([]);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Sub tab tracking inside the active project
  const [activeWidget, setActiveWidget] = useState<'chapters' | 'bible' | 'plotholes'>('chapters');

  // Sidebar and Settings controls
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExportPdfOpen, setIsExportPdfOpen] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // Global Refresh operation
  const refreshWorkspace = () => {
    // Reload Projects
    const allProjs = storage.getProjects();
    setProjects(allProjs);

    // Reload active project id
    const activeId = storage.getCurrentProjectId();
    setCurrentProjectId(activeId);

    if (activeId) {
      setChapters(storage.getChapters(activeId));
      setCharacters(storage.getCharacters(activeId));
      setWorldItems(storage.getWorldItems(activeId));
      setPlotHoles(storage.getPlotHoles(activeId));
    } else {
      setChapters([]);
      setCharacters([]);
      setWorldItems([]);
      setPlotHoles([]);
    }
  };

  // Run initial loading
  useEffect(() => {
    storage.restoreLocalDataFromBackup();
    refreshWorkspace();
  }, [currentProjectId]);

  const handleSelectProject = (id: string) => {
    storage.setCurrentProjectId(id);
    setCurrentProjectId(id);
    setActiveWidget('chapters'); // Default back to editor on swap!
  };

  const handleCloseProject = () => {
    storage.setCurrentProjectId('');
    setCurrentProjectId('');
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Gagal keluar akun: ", e);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-neutral-50/50 flex flex-col justify-center items-center gap-3">
        <Loader2 className="w-8 h-8 text-neutral-900 animate-spin" />
        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">Memeriksa Sesi Masuk...</p>
      </div>
    );
  }

  if (syncingCloud) {
    return (
      <div className="min-h-screen bg-neutral-50/50 flex flex-col justify-center items-center gap-3">
        <Loader2 className="w-8 h-8 text-neutral-900 animate-spin" />
        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 font-sans">Menyelaraskan dengan Cloud...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen appLogo={appLogo} />;
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diffX = touchEndX - touchStartX;

    // Geser ke kiri (swipe left) -> Tutup sidebar
    if (diffX < -50) {
      setIsSidebarOpen(false);
    }
    // Geser ke kanan (swipe right) -> Buka sidebar
    else if (diffX > 50) {
      setIsSidebarOpen(true);
    }
    setTouchStartX(null);
  };

  const activeProject = projects.find((p) => p.id === currentProjectId);

  return (
    <div 
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="min-h-screen bg-neutral-50/50 text-neutral-900 flex flex-col slight-fading-transition"
    >
      {/* Top Navigation Frame Header */}
      <header className="bg-white border-b border-neutral-200/80 sticky top-0 z-40 px-4 h-14 flex items-center shrink-0 shadow-3xs">
        <div className="max-w-8xl mx-auto flex items-center justify-between w-full">
          <div className="flex items-center space-x-2 min-w-0">
            {currentProjectId ? (
              <button
                type="button"
                onClick={handleCloseProject}
                className="p-1.5 rounded-xl text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 transition mr-1 cursor-pointer flex items-center justify-center shrink-0"
                title="Kembali ke Pustaka Proyek"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className="p-1.5 rounded-xl text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 transition mr-1 cursor-pointer flex items-center justify-center shrink-0"
                title="Buka Control Panel & Pengaturan"
              >
                <Menu className="w-4.5 h-4.5" />
              </button>
            )}
            
            {/* Logo or Active Project Title area */}
            <div className="flex items-center min-w-0">
              {activeProject ? (
                <span className="font-montserrat font-black tracking-wide text-sm sm:text-base text-neutral-900 uppercase truncate max-w-[180px] sm:max-w-[320px] md:max-w-[480px]">
                  {activeProject.title}
                </span>
              ) : (
                <>
                  {appLogo && (appLogo.startsWith('data:image/') || appLogo.startsWith('http://') || appLogo.startsWith('https://')) ? (
                    <div className="flex items-center select-none shrink-0">
                      <img src={appLogo} alt="Scriba" className="h-7 w-auto object-contain max-w-[150px]" referrerPolicy="no-referrer" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="flex items-center justify-center select-none leading-none w-6 h-6 shrink-0" id="app-logo-emblem">
                        <span className="text-base">{appLogo || '✍️'}</span>
                      </span>
                      <span className="font-montserrat font-black tracking-wide text-sm text-neutral-900">
                        SCRIBA
                      </span>
                    </div>
                  )}
                  
                  <span className="border-r border-neutral-200 h-6 mx-2 shrink-0"></span>

                  <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 font-sans hidden sm:inline shrink-0">
                    Novel Draft Workspace
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {activeProject && (
              <div className="hidden md:flex items-center mr-3 border-r border-neutral-200 pr-3">
                <span className="text-[9px] bg-neutral-100 text-neutral-500 rounded-lg px-2.5 py-1 uppercase tracking-wider font-extrabold">
                  {activeProject.type === 'solo' ? 'Solo Project' : activeProject.type === 'series' ? 'Series Draft' : 'Mini Novel'}
                </span>
              </div>
            )}

            {/* Icon-only Export to Read-Ready PDF action button replacing Settings */}
            {activeProject && (
              <button
                type="button"
                onClick={() => setIsExportPdfOpen(true)}
                className="p-2 rounded-xl text-neutral-400 hover:text-neutral-850 hover:bg-neutral-50 transition cursor-pointer flex items-center justify-center border border-neutral-200 bg-white shadow-3xs"
                title="Ekspor ke Read-Ready PDF Buku"
              >
                <Download className="w-4.5 h-4.5 text-neutral-800" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container Layout */}
      <main className="flex-1 max-w-8xl w-full mx-auto px-4 md:px-6 py-6">
        <AnimatePresence mode="wait">
          {!currentProjectId ? (
            /* Catalog Section */
            <motion.div
              key="catalog"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <ProjectList
                onSelectProject={handleSelectProject}
                onRefresh={refreshWorkspace}
                projects={projects}
                currentProjectId={currentProjectId}
              />
            </motion.div>
          ) : (
            /* Active Project Workspace Workspace Dashboard */
            <motion.div
              key="workspace"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="flex flex-col md:flex-row gap-6 items-start">
                {/* PROJECT SIDEBAR: Desktop only (always appears inside the opened project) */}
                <aside className="hidden md:flex flex-col w-60 shrink-0 bg-white border border-neutral-200/85 rounded-2xl p-4.5 shadow-3xs space-y-5 sticky top-20" id="project-desktop-sidebar">
                  <div className="border-b border-neutral-100 pb-3">
                    <span className="text-[10px] font-bold tracking-widest text-neutral-400 uppercase block mb-1">
                      KONSOL PROYEK
                    </span>
                    <h3 className="text-xs font-black uppercase tracking-wider text-neutral-850 font-montserrat truncate">
                      {activeProject?.title || 'Draft Workspace'}
                    </h3>
                  </div>

                  <nav className="flex flex-col space-y-1.5" id="project-sidebar-navigation-list">
                    <button
                      type="button"
                      onClick={() => setActiveWidget('chapters')}
                      className={`w-full flex items-center space-x-3 px-4.5 py-3 text-xs font-bold uppercase tracking-widest transition cursor-pointer rounded-xl text-left ${
                        activeWidget === 'chapters'
                          ? 'bg-neutral-950 text-white shadow-3xs'
                          : 'bg-white text-neutral-450 hover:bg-neutral-50 hover:text-neutral-800 border border-neutral-150'
                      }`}
                      title="Buka Draf Naskah Bab"
                    >
                      <BookOpen className="w-4 h-4 shrink-0 text-neutral-400 group-hover:text-neutral-600" />
                      <span>DRAF</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveWidget('bible')}
                      className={`w-full flex items-center space-x-3 px-4.5 py-3 text-xs font-bold uppercase tracking-widest transition cursor-pointer rounded-xl text-left ${
                        activeWidget === 'bible'
                          ? 'bg-neutral-950 text-white shadow-3xs'
                          : 'bg-white text-neutral-455 hover:bg-neutral-50 hover:text-neutral-800 border border-neutral-150'
                      }`}
                      title="Buka Bible Karakter & Dunia"
                    >
                      <Library className="w-4 h-4 shrink-0 text-neutral-400 group-hover:text-neutral-600" />
                      <span>BIBLE</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveWidget('plotholes')}
                      className={`w-full flex items-center space-x-3 px-4.5 py-3 text-xs font-bold uppercase tracking-widest transition cursor-pointer rounded-xl text-left ${
                        activeWidget === 'plotholes'
                          ? 'bg-neutral-950 text-white shadow-3xs'
                          : 'bg-white text-neutral-455 hover:bg-neutral-50 hover:text-neutral-800 border border-neutral-150'
                      }`}
                      title="Buka Detektor Plot Hole"
                    >
                      <CheckSquare className="w-4 h-4 shrink-0 text-neutral-400 group-hover:text-neutral-600" />
                      <span>PLOT</span>
                    </button>
                  </nav>

                  <div className="bg-neutral-50/50 rounded-xl p-3.5 border border-neutral-100 text-[10px] space-y-2.5 font-sans text-neutral-500">
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold uppercase tracking-wider text-[9px] text-neutral-400">INFO STATUS KARYA</span>
                      <span className="bg-neutral-200/60 text-neutral-700 px-1.5 py-0.5 rounded-md font-bold text-[8px]">AKTIF</span>
                    </div>
                    <div className="h-px bg-neutral-200/40" />
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span>Total Bab:</span>
                        <span className="font-bold text-neutral-800">{chapters.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Karakter Alur:</span>
                        <span className="font-bold text-neutral-800">{characters.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Deteksi Plot Hole:</span>
                        <span className="font-bold text-neutral-800">{plotHoles.length}</span>
                      </div>
                    </div>
                  </div>
                </aside>

                {/* MAIN CONTENT AREA: Flexible layout */}
                <div className="flex-1 w-full space-y-6">
                  {/* Internal responsive navigation bar tabs scoped to selected project (Mobile / Non-desktop only) */}
                  <div className="md:hidden border-b border-neutral-200 pb-3" id="project-workspace-navigation">
                    <div className="grid grid-cols-3 gap-2 w-full sm:max-w-md p-0.5" id="project-nav-tabs">
                      <button
                        type="button"
                        onClick={() => setActiveWidget('chapters')}
                        className={`h-10 text-xs font-extrabold uppercase tracking-widest transition cursor-pointer rounded-xl flex items-center justify-center ${
                          activeWidget === 'chapters'
                            ? 'bg-neutral-950 text-white shadow-3xs'
                            : 'bg-white text-neutral-450 hover:text-neutral-800 border border-neutral-200/80'
                        }`}
                        title="Buka Draf Naskah Bab"
                      >
                        DRAF
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveWidget('bible')}
                        className={`h-10 text-xs font-extrabold uppercase tracking-widest transition cursor-pointer rounded-xl flex items-center justify-center ${
                          activeWidget === 'bible'
                            ? 'bg-neutral-950 text-white shadow-3xs'
                            : 'bg-white text-neutral-455 hover:text-neutral-800 border border-neutral-200/80'
                        }`}
                        title="Buka Bible Karakter & Dunia"
                      >
                        BIBLE
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveWidget('plotholes')}
                        className={`h-10 text-xs font-extrabold uppercase tracking-widest transition cursor-pointer rounded-xl flex items-center justify-center ${
                          activeWidget === 'plotholes'
                            ? 'bg-neutral-950 text-white shadow-3xs'
                            : 'bg-white text-neutral-455 hover:text-neutral-800 border border-neutral-200/80'
                        }`}
                        title="Buka Detektor Plot Hole"
                      >
                        PLOT
                      </button>
                    </div>
                  </div>

                  {/* View Widget Dispatching */}
                  <div className="min-h-[400px]">
                    {activeWidget === 'chapters' && (
                      <ChapterEditor
                        projectId={currentProjectId}
                        chapters={chapters}
                        onRefresh={refreshWorkspace}
                      />
                    )}

                    {activeWidget === 'bible' && (
                      <BibleManager
                        projectId={currentProjectId}
                        characters={characters}
                        worldItems={worldItems}
                        onRefresh={refreshWorkspace}
                      />
                    )}

                    {activeWidget === 'plotholes' && (
                      <PlotHoleTracker
                        projectId={currentProjectId}
                        plotHoles={plotHoles}
                        chapters={chapters}
                        characters={characters}
                        worldItems={worldItems}
                        onRefresh={refreshWorkspace}
                      />
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Slide-out Sidebar Control Panel */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        appVersion={APP_VERSION}
        onOpenSettings={() => setIsSettingsOpen(true)}
        user={user}
        onLogout={handleLogout}
      />

      {/* Fullscreen Settings view overlay */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        appVersion={APP_VERSION}
        onSelectProject={handleSelectProject}
        onRefresh={refreshWorkspace}
        appLogo={appLogo}
      />

      {/* Export to Ready-Ready PDF Modal */}
      {activeProject && (
        <ExportPdfModal
          isOpen={isExportPdfOpen}
          onClose={() => {
            setIsExportPdfOpen(false);
            refreshWorkspace();
          }}
          project={activeProject}
        />
      )}

      {/* Aesthetic human literal minimal footer - only on main screen */}
      {!currentProjectId && (
        <footer className="py-6 bg-white border-t border-neutral-200/80 mt-12 text-center text-[10px] text-neutral-400 font-sans tracking-wide">
          <div className="max-w-8xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>Novel Draft Workspace v{APP_VERSION} &copy; 2026. Semua draf tersimpan aman dalam peramban Anda.</span>
            <span className="font-semibold text-neutral-500 uppercase tracking-widest text-[9px] font-montserrat">
              MAHAKARYA ANDA DIMULAI DARI SINI
            </span>
          </div>
        </footer>
      )}
    </div>
  );
}
