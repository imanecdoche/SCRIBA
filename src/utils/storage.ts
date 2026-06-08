import { Project, Chapter, CharacterItem, WorldItem, PlotHole } from '../types';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { doc, setDoc, deleteDoc, writeBatch, collection, getDocs, query, where, getDoc } from 'firebase/firestore';

// Helper to generate unique IDs
export const generateId = () => {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
};

// Helper to capitalize first letter of each word
export const capitalizeWords = (str: string): string => {
  if (!str) return '';
  return str
    .split(' ')
    .map(word => {
      if (!word) return '';
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
};

// LocalStorage Keys
const KEYS = {
  PROJECTS: 'novel_workspace_projects',
  CHAPTERS: 'novel_workspace_chapters',
  CHARACTERS: 'novel_workspace_characters',
  WORLD_ITEMS: 'novel_workspace_world_items',
  PLOT_HOLES: 'novel_workspace_plot_holes',
  CURRENT_PROJECT: 'novel_workspace_current_project_id',
};

// Safe wrapper for localStorage
const safeGet = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.error(`Error reading ${key} from localStorage`, e);
    return defaultValue;
  }
};

const safeSet = (key: string, value: any): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error writing ${key} to localStorage`, e);
  }
};

export interface RecoveryResult {
  recoveredProjects: Project[];
  allFoundTitles: { title: string; id: string; userId: string }[];
}

export const storage = {
  // Search for projects by title and claim them to the logged-in user
  searchAndRestoreOldProjects: async (searchTitle: string, currentUserId: string): Promise<RecoveryResult> => {
    try {
      console.log("Mencari proyek dengan filter judul:", searchTitle);
      // Query ALL projects from Firestore (bypass role checked in rules)
      const projectsSnap = await getDocs(collection(db, 'projects'));
      
      const allFoundTitles: { title: string; id: string; userId: string }[] = [];
      projectsSnap.forEach(docSnap => {
        const pData = docSnap.data();
        allFoundTitles.push({
          title: pData.title || 'Tanpa Judul',
          id: docSnap.id,
          userId: pData.userId || ''
        });
      });

      console.log("Daftar naskah di Firestore db:", allFoundTitles);

      const normalizedQuery = searchTitle.toLowerCase().trim();
      const matchedProjectsDocs = projectsSnap.docs.filter(docSnap => {
        const pData = docSnap.data();
        const pTitle = (pData.title || '').toLowerCase().trim();
        return pTitle.includes(normalizedQuery);
      });

      if (matchedProjectsDocs.length === 0) {
        console.log("Tidak ditemukan proyek dengan judul:", searchTitle);
        return { recoveredProjects: [], allFoundTitles };
      }

      console.log(`Ditemukan ${matchedProjectsDocs.length} proyek yang cocok. Memproses pemulihan ke ID: ${currentUserId}...`);
      
      const recoveredProjects: Project[] = [];

      for (const docSnap of matchedProjectsDocs) {
        const rawData = docSnap.data();
        const projectData = rawData as Project;
        const oldProjectId = docSnap.id;
        const oldUserId = rawData.userId || '';

        console.log(`Memulihkan proyek '${projectData.title}' (${oldProjectId}) milik user lama (${oldUserId})`);

        // 1. Fetch chapters belonging to this project
        const chaptersSnap = await getDocs(query(collection(db, 'chapters'), where('projectId', '==', oldProjectId)));
        const chapters = chaptersSnap.docs.map(d => d.data() as Chapter);

        // 2. Fetch characters belonging to this project
        const charactersSnap = await getDocs(query(collection(db, 'characters'), where('projectId', '==', oldProjectId)));
        const characters = charactersSnap.docs.map(d => d.data() as CharacterItem);

        // 3. Fetch worldItems belonging to this project
        const worldItemsSnap = await getDocs(query(collection(db, 'worldItems'), where('projectId', '==', oldProjectId)));
        const worldItems = worldItemsSnap.docs.map(d => d.data() as WorldItem);

        // 4. Fetch plotHoles belonging to this project
        const plotHolesSnap = await getDocs(query(collection(db, 'plotHoles'), where('projectId', '==', oldProjectId)));
        const plotHoles = plotHolesSnap.docs.map(d => d.data() as PlotHole);

        // Now, set each of them to currentUserId and rewrite in Firestore
        const updatedProject = { ...projectData, userId: currentUserId, updatedAt: new Date().toISOString() };
        await setDoc(doc(db, 'projects', oldProjectId), updatedProject);

        for (const ch of chapters) {
          await setDoc(doc(db, 'chapters', ch.id), { ...ch, userId: currentUserId });
        }
        for (const c of characters) {
          await setDoc(doc(db, 'characters', c.id), { ...c, userId: currentUserId });
        }
        for (const w of worldItems) {
          await setDoc(doc(db, 'worldItems', w.id), { ...w, userId: currentUserId });
        }
        for (const p of plotHoles) {
          await setDoc(doc(db, 'plotHoles', p.id), { ...p, userId: currentUserId });
        }

        recoveredProjects.push(updatedProject);
      }

      // Sync local storage so it reflects the newly recovered items
      await storage.syncFromFirestore(currentUserId);

      // If we recovered any projects, auto select the first one!
      if (recoveredProjects.length > 0) {
        storage.setCurrentProjectId(recoveredProjects[0].id);
      }

      return { recoveredProjects, allFoundTitles };
    } catch (err) {
      console.error("Gagal melakukan pencarian dan restorasi proyek:", err);
      // Fallback
      throw err;
    }
  },

  // Save local data to a backup key that is never cleared by clearAll
  backupLocalData: (): void => {
    try {
      const projects = localStorage.getItem(KEYS.PROJECTS);
      const chapters = localStorage.getItem(KEYS.CHAPTERS);
      const characters = localStorage.getItem(KEYS.CHARACTERS);
      const worldItems = localStorage.getItem(KEYS.WORLD_ITEMS);
      const plotHoles = localStorage.getItem(KEYS.PLOT_HOLES);
      
      if (projects && JSON.parse(projects).length > 0) {
        localStorage.setItem('novel_workspace_persistent_backup_projects', projects);
        if (chapters) localStorage.setItem('novel_workspace_persistent_backup_chapters', chapters);
        if (characters) localStorage.setItem('novel_workspace_persistent_backup_characters', characters);
        if (worldItems) localStorage.setItem('novel_workspace_persistent_backup_world_items', worldItems);
        if (plotHoles) localStorage.setItem('novel_workspace_persistent_backup_plot_holes', plotHoles);
        console.log("Local backup saved successfully.");
      }
    } catch (e) {
      console.error("Error backing up local data:", e);
    }
  },

  // Restore local data from backup
  restoreLocalDataFromBackup: (): void => {
    try {
      const projects = localStorage.getItem('novel_workspace_persistent_backup_projects');
      const chapters = localStorage.getItem('novel_workspace_persistent_backup_chapters');
      const characters = localStorage.getItem('novel_workspace_persistent_backup_characters');
      const worldItems = localStorage.getItem('novel_workspace_persistent_backup_world_items');
      const plotHoles = localStorage.getItem('novel_workspace_persistent_backup_plot_holes');
      
      if (projects) {
        const localProjs = JSON.parse(projects) as Project[];
        const currentProjs = safeGet<Project[]>(KEYS.PROJECTS, []);
        const mergedProjs = [...currentProjs];
        for (const lp of localProjs) {
          if (!mergedProjs.some(p => p.id === lp.id)) {
            mergedProjs.push(lp);
          }
        }
        safeSet(KEYS.PROJECTS, mergedProjs);
      }
      
      if (chapters) {
        const localChs = JSON.parse(chapters) as Chapter[];
        const currentChs = safeGet<Chapter[]>(KEYS.CHAPTERS, []);
        const mergedChs = [...currentChs];
        for (const lc of localChs) {
          if (!mergedChs.some(c => c.id === lc.id)) {
            mergedChs.push(lc);
          }
        }
        safeSet(KEYS.CHAPTERS, mergedChs);
      }

      if (characters) {
        const localChas = JSON.parse(characters) as CharacterItem[];
        const currentChas = safeGet<CharacterItem[]>(KEYS.CHARACTERS, []);
        const mergedChas = [...currentChas];
        for (const lc of localChas) {
          if (!mergedChas.some(c => c.id === lc.id)) {
            mergedChas.push(lc);
          }
        }
        safeSet(KEYS.CHARACTERS, mergedChas);
      }

      if (worldItems) {
        const localW = JSON.parse(worldItems) as WorldItem[];
        const currentW = safeGet<WorldItem[]>(KEYS.WORLD_ITEMS, []);
        const mergedW = [...currentW];
        for (const lw of localW) {
          if (!mergedW.some(w => w.id === lw.id)) {
            mergedW.push(lw);
          }
        }
        safeSet(KEYS.WORLD_ITEMS, mergedW);
      }

      if (plotHoles) {
        const localP = JSON.parse(plotHoles) as PlotHole[];
        const currentP = safeGet<PlotHole[]>(KEYS.PLOT_HOLES, []);
        const mergedP = [...currentP];
        for (const lp of localP) {
          if (!mergedP.some(p => p.id === lp.id)) {
            mergedP.push(lp);
          }
        }
        safeSet(KEYS.PLOT_HOLES, mergedP);
      }
      console.log("Local backup restored successfully.");
    } catch (e) {
      console.error("Error restoring local data:", e);
    }
  },

  // Clear all data on logout
  clearAll: (): void => {
    storage.backupLocalData();
    localStorage.removeItem(KEYS.PROJECTS);
    localStorage.removeItem(KEYS.CHAPTERS);
    localStorage.removeItem(KEYS.CHARACTERS);
    localStorage.removeItem(KEYS.WORLD_ITEMS);
    localStorage.removeItem(KEYS.PLOT_HOLES);
    localStorage.removeItem(KEYS.CURRENT_PROJECT);
  },

  // Sync completely from Firestore for a given user ID
  syncFromFirestore: async (userId: string): Promise<void> => {
    try {
      console.log("Memulai sinkronisasi cloud untuk user:", userId);
      const isRecoveryAdmin = auth.currentUser?.email === 'kazokuhairy@gmail.com';
      
      const mergeAndSet = <T extends { id: string }>(key: string, cloudItems: T[]): void => {
        const localItems = safeGet<T[]>(key, []);
        const merged = [...cloudItems];
        for (const local of localItems) {
          if (!merged.some(item => item.id === local.id)) {
            merged.push(local);
          }
        }
        safeSet(key, merged);
      };

      // 1. Fetch Projects
      let projects: Project[] = [];
      try {
        console.log("Mengambil projects...");
        const q = isRecoveryAdmin 
          ? collection(db, 'projects')
          : query(collection(db, 'projects'), where('userId', '==', userId));
        const projectsSnap = await getDocs(q);
        projects = projectsSnap.docs.map(doc => doc.data() as Project);
        console.log(`Mengambil projects berhasil (${projects.length} data)`);
      } catch (err: any) {
        console.error("Gagal mengambil projects:", err);
        throw new Error(`Gagal mengambil data proyek: ${err.message || err}`);
      }
      mergeAndSet(KEYS.PROJECTS, projects);

      // 2. Fetch Chapters
      let chapters: Chapter[] = [];
      try {
        console.log("Mengambil chapters...");
        const q = isRecoveryAdmin
          ? collection(db, 'chapters')
          : query(collection(db, 'chapters'), where('userId', '==', userId));
        const chaptersSnap = await getDocs(q);
        chapters = chaptersSnap.docs.map(doc => doc.data() as Chapter);
        console.log(`Mengambil chapters berhasil (${chapters.length} data)`);
      } catch (err: any) {
        console.error("Gagal mengambil chapters:", err);
        throw new Error(`Gagal mengambil data bab (chapters): ${err.message || err}`);
      }
      mergeAndSet(KEYS.CHAPTERS, chapters);

      // 3. Fetch Characters
      let characters: CharacterItem[] = [];
      try {
        console.log("Mengambil characters...");
        const q = isRecoveryAdmin
          ? collection(db, 'characters')
          : query(collection(db, 'characters'), where('userId', '==', userId));
        const charactersSnap = await getDocs(q);
        characters = charactersSnap.docs.map(doc => doc.data() as CharacterItem);
        console.log(`Mengambil characters berhasil (${characters.length} data)`);
      } catch (err: any) {
        console.error("Gagal mengambil characters:", err);
        throw new Error(`Gagal mengambil data karakter (characters): ${err.message || err}`);
      }
      mergeAndSet(KEYS.CHARACTERS, characters);

      // 4. Fetch World Items
      let world: WorldItem[] = [];
      try {
        console.log("Mengambil worldItems...");
        const q = isRecoveryAdmin
          ? collection(db, 'worldItems')
          : query(collection(db, 'worldItems'), where('userId', '==', userId));
        const worldSnap = await getDocs(q);
        world = worldSnap.docs.map(doc => doc.data() as WorldItem);
        console.log(`Mengambil worldItems berhasil (${world.length} data)`);
      } catch (err: any) {
        console.error("Gagal mengambil worldItems:", err);
        throw new Error(`Gagal mengambil data item dunia (worldItems): ${err.message || err}`);
      }
      mergeAndSet(KEYS.WORLD_ITEMS, world);

      // 5. Fetch Plot Holes
      let plotHoles: PlotHole[] = [];
      try {
        console.log("Mengambil plotHoles...");
        const q = isRecoveryAdmin
          ? collection(db, 'plotHoles')
          : query(collection(db, 'plotHoles'), where('userId', '==', userId));
        const plotHolesSnap = await getDocs(q);
        plotHoles = plotHolesSnap.docs.map(doc => doc.data() as PlotHole);
        console.log(`Mengambil plotHoles berhasil (${plotHoles.length} data)`);
      } catch (err: any) {
        console.error("Gagal mengambil plotHoles:", err);
        throw new Error(`Gagal mengambil data plot holes: ${err.message || err}`);
      }
      mergeAndSet(KEYS.PLOT_HOLES, plotHoles);
      
      console.log("Semua data berhasil disinkronkan dari Firestore.");
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, 'sync_all');
    }
  },

  // --- PROJECTS ---
  getProjects: (): Project[] => safeGet<Project[]>(KEYS.PROJECTS, []),
  saveProjects: (projects: Project[]): void => safeSet(KEYS.PROJECTS, projects),
  
  addProject: (title: string, synopsis: string, type: Project['type'], author?: string): Project => {
    const projects = storage.getProjects();
    const newProject: Project = {
      id: generateId(),
      title: capitalizeWords(title),
      synopsis,
      author: author || '',
      genres: '',
      type,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    projects.push(newProject);
    storage.saveProjects(projects);

    // Online Firestore sync background write
    const uid = auth.currentUser?.uid;
    if (uid) {
      setDoc(doc(db, 'projects', newProject.id), { ...newProject, userId: uid })
        .catch(err => handleFirestoreError(err, OperationType.CREATE, `projects/${newProject.id}`));
    }

    return newProject;
  },

  updateProject: (updated: Project): void => {
    const projects = storage.getProjects();
    const index = projects.findIndex(p => p.id === updated.id);
    if (index !== -1) {
      const updatedProj = {
        ...updated,
        title: capitalizeWords(updated.title),
        updatedAt: new Date().toISOString()
      };
      projects[index] = updatedProj;
      storage.saveProjects(projects);

      // Online Firestore sync
      const uid = auth.currentUser?.uid;
      if (uid) {
        setDoc(doc(db, 'projects', updatedProj.id), { ...updatedProj, userId: uid })
          .catch(err => handleFirestoreError(err, OperationType.UPDATE, `projects/${updatedProj.id}`));
      }
    }
  },

  deleteProject: (projectId: string): void => {
    // Delete project
    const projects = storage.getProjects().filter(p => p.id !== projectId);
    storage.saveProjects(projects);

    const uid = auth.currentUser?.uid;
    if (uid) {
      deleteDoc(doc(db, 'projects', projectId))
        .catch(err => handleFirestoreError(err, OperationType.DELETE, `projects/${projectId}`));
    }

    // Cascade delete related items
    const chaptersToDelete = storage.getAllChapters().filter(c => c.projectId === projectId);
    const chaptersRest = storage.getAllChapters().filter(c => c.projectId !== projectId);
    storage.saveAllChapters(chaptersRest);

    const charactersToDelete = storage.getAllCharacters().filter(c => c.projectId === projectId);
    const charactersRest = storage.getAllCharacters().filter(c => c.projectId !== projectId);
    storage.saveAllCharacters(charactersRest);

    const worldToDelete = storage.getAllWorldItems().filter(w => w.projectId === projectId);
    const worldRest = storage.getAllWorldItems().filter(w => w.projectId !== projectId);
    storage.saveAllWorldItems(worldRest);

    const plotHolesToDelete = storage.getAllPlotHoles().filter(p => p.projectId === projectId);
    const plotHolesRest = storage.getAllPlotHoles().filter(p => p.projectId !== projectId);
    storage.saveAllPlotHoles(plotHolesRest);

    if (uid) {
      // Background delete docs online
      chaptersToDelete.forEach(ch => {
        deleteDoc(doc(db, 'chapters', ch.id)).catch(() => {});
      });
      charactersToDelete.forEach(c => {
        deleteDoc(doc(db, 'characters', c.id)).catch(() => {});
      });
      worldToDelete.forEach(w => {
        deleteDoc(doc(db, 'worldItems', w.id)).catch(() => {});
      });
      plotHolesToDelete.forEach(p => {
        deleteDoc(doc(db, 'plotHoles', p.id)).catch(() => {});
      });
    }

    if (storage.getCurrentProjectId() === projectId) {
      storage.setCurrentProjectId('');
    }
  },

  getCurrentProjectId: (): string => safeGet<string>(KEYS.CURRENT_PROJECT, ''),
  setCurrentProjectId: (id: string): void => safeSet(KEYS.CURRENT_PROJECT, id),

  // --- CHAPTERS ---
  getAllChapters: (): Chapter[] => safeGet<Chapter[]>(KEYS.CHAPTERS, []),
  saveAllChapters: (chapters: Chapter[]): void => safeSet(KEYS.CHAPTERS, chapters),
  
  getChapters: (projectId: string): Chapter[] => {
    return storage.getAllChapters()
      .filter(c => c.projectId === projectId)
      .sort((a, b) => a.number - b.number);
  },

  addChapter: (projectId: string, title: string, isProlog: boolean, isEpilog: boolean): Chapter => {
    const all = storage.getAllChapters();
    const projectChapters = storage.getChapters(projectId);
    
    // Auto calculate chapter number
    let nextNum = projectChapters.length + 1;
    if (isProlog) {
      nextNum = 0; // Prolog is 0, Epilog can be high or we just use sorting
    } else if (isEpilog) {
      nextNum = 999;
    } else {
      // Find maximum non-epilog number
      const standardChapters = projectChapters.filter(c => !c.isProlog && !c.isEpilog);
      const maxNum = standardChapters.length > 0 ? Math.max(...standardChapters.map(c => c.number)) : 0;
      nextNum = maxNum + 1;
    }

    const newChapter: Chapter = {
      id: generateId(),
      projectId,
      title: capitalizeWords(title),
      content: '',
      number: nextNum,
      isProlog,
      isEpilog,
      summary: '',
      createdAt: new Date().toISOString()
    };

    all.push(newChapter);
    storage.saveAllChapters(all);

    // Online Firestore sync background write
    const uid = auth.currentUser?.uid;
    if (uid) {
      setDoc(doc(db, 'chapters', newChapter.id), { ...newChapter, userId: uid })
        .catch(err => handleFirestoreError(err, OperationType.CREATE, `chapters/${newChapter.id}`));
    }

    return newChapter;
  },

  updateChapter: (updated: Chapter): void => {
    const all = storage.getAllChapters();
    const index = all.findIndex(c => c.id === updated.id);
    if (index !== -1) {
      const updatedCh = {
        ...updated,
        title: capitalizeWords(updated.title)
      };
      all[index] = updatedCh;
      storage.saveAllChapters(all);

      // Online Firestore sync
      const uid = auth.currentUser?.uid;
      if (uid) {
        setDoc(doc(db, 'chapters', updatedCh.id), { ...updatedCh, userId: uid })
          .catch(err => handleFirestoreError(err, OperationType.UPDATE, `chapters/${updatedCh.id}`));
      }
    }
  },

  reorderChapters: (projectId: string, orderedChapters: Chapter[]): void => {
    const all = storage.getAllChapters();
    // Remove current project chapters
    const filtered = all.filter(c => c.projectId !== projectId);
    // Add back the ordered ones with updated numbers
    const updated = orderedChapters.map((ch, idx) => {
      let num = idx + 1;
      if (ch.isProlog) num = 0;
      else if (ch.isEpilog) num = 999;
      return { ...ch, number: num };
    });
    storage.saveAllChapters([...filtered, ...updated]);

    // Online batch updates
    const uid = auth.currentUser?.uid;
    if (uid) {
      updated.forEach(ch => {
        setDoc(doc(db, 'chapters', ch.id), { ...ch, userId: uid })
          .catch(err => handleFirestoreError(err, OperationType.UPDATE, `chapters/${ch.id}`));
      });
    }
  },

  deleteChapter: (chapterId: string): void => {
    const all = storage.getAllChapters().filter(c => c.id !== chapterId);
    storage.saveAllChapters(all);

    // Sync online
    const uid = auth.currentUser?.uid;
    if (uid) {
      deleteDoc(doc(db, 'chapters', chapterId))
        .catch(err => handleFirestoreError(err, OperationType.DELETE, `chapters/${chapterId}`));
    }
  },

  // --- CHARACTERS ---
  getAllCharacters: (): CharacterItem[] => safeGet<CharacterItem[]>(KEYS.CHARACTERS, []),
  saveAllCharacters: (characters: CharacterItem[]): void => safeSet(KEYS.CHARACTERS, characters),

  getCharacters: (projectId: string): CharacterItem[] => {
    return storage.getAllCharacters().filter(c => c.projectId === projectId);
  },

  addCharacter: (projectId: string, name: string, role: string, description: string, backstory: string, notes: string): CharacterItem => {
    const all = storage.getAllCharacters();
    const newItem: CharacterItem = {
      id: generateId(),
      projectId,
      name: capitalizeWords(name),
      role,
      description,
      backstory,
      notes,
      createdAt: new Date().toISOString()
    };
    all.push(newItem);
    storage.saveAllCharacters(all);

    // Sync online
    const uid = auth.currentUser?.uid;
    if (uid) {
      setDoc(doc(db, 'characters', newItem.id), { ...newItem, userId: uid })
        .catch(err => handleFirestoreError(err, OperationType.CREATE, `characters/${newItem.id}`));
    }

    return newItem;
  },

  updateCharacter: (updated: CharacterItem): void => {
    const all = storage.getAllCharacters();
    const index = all.findIndex(c => c.id === updated.id);
    if (index !== -1) {
      const updatedChar = {
        ...updated,
        name: capitalizeWords(updated.name)
      };
      all[index] = updatedChar;
      storage.saveAllCharacters(all);

      // Sync online
      const uid = auth.currentUser?.uid;
      if (uid) {
        setDoc(doc(db, 'characters', updatedChar.id), { ...updatedChar, userId: uid })
          .catch(err => handleFirestoreError(err, OperationType.UPDATE, `characters/${updatedChar.id}`));
      }
    }
  },

  deleteCharacter: (characterId: string): void => {
    const all = storage.getAllCharacters().filter(c => c.id !== characterId);
    storage.saveAllCharacters(all);

    // Sync online
    const uid = auth.currentUser?.uid;
    if (uid) {
      deleteDoc(doc(db, 'characters', characterId))
        .catch(err => handleFirestoreError(err, OperationType.DELETE, `characters/${characterId}`));
    }
  },

  // --- WORLD ITEMS ---
  getAllWorldItems: (): WorldItem[] => safeGet<WorldItem[]>(KEYS.WORLD_ITEMS, []),
  saveAllWorldItems: (items: WorldItem[]): void => safeSet(KEYS.WORLD_ITEMS, items),

  getWorldItems: (projectId: string): WorldItem[] => {
    return storage.getAllWorldItems().filter(w => w.projectId === projectId);
  },

  addWorldItem: (projectId: string, name: string, category: string, description: string, notes: string): WorldItem => {
    const all = storage.getAllWorldItems();
    const newItem: WorldItem = {
      id: generateId(),
      projectId,
      name: capitalizeWords(name),
      category,
      description,
      notes,
      createdAt: new Date().toISOString()
    };
    all.push(newItem);
    storage.saveAllWorldItems(all);

    // Sync online
    const uid = auth.currentUser?.uid;
    if (uid) {
      setDoc(doc(db, 'worldItems', newItem.id), { ...newItem, userId: uid })
        .catch(err => handleFirestoreError(err, OperationType.CREATE, `worldItems/${newItem.id}`));
    }

    return newItem;
  },

  updateWorldItem: (updated: WorldItem): void => {
    const all = storage.getAllWorldItems();
    const index = all.findIndex(w => w.id === updated.id);
    if (index !== -1) {
      const updatedWorld = {
        ...updated,
        name: capitalizeWords(updated.name)
      };
      all[index] = updatedWorld;
      storage.saveAllWorldItems(all);

      // Sync online
      const uid = auth.currentUser?.uid;
      if (uid) {
        setDoc(doc(db, 'worldItems', updatedWorld.id), { ...updatedWorld, userId: uid })
          .catch(err => handleFirestoreError(err, OperationType.UPDATE, `worldItems/${updatedWorld.id}`));
      }
    }
  },

  deleteWorldItem: (itemId: string): void => {
    const all = storage.getAllWorldItems().filter(w => w.id !== itemId);
    storage.saveAllWorldItems(all);

    // Sync online
    const uid = auth.currentUser?.uid;
    if (uid) {
      deleteDoc(doc(db, 'worldItems', itemId))
        .catch(err => handleFirestoreError(err, OperationType.DELETE, `worldItems/${itemId}`));
    }
  },

  // --- PLOT HOLES ---
  getAllPlotHoles: (): PlotHole[] => safeGet<PlotHole[]>(KEYS.PLOT_HOLES, []),
  saveAllPlotHoles: (plotHoles: PlotHole[]): void => safeSet(KEYS.PLOT_HOLES, plotHoles),

  getPlotHoles: (projectId: string): PlotHole[] => {
    return storage.getAllPlotHoles().filter(p => p.projectId === projectId);
  },

  addPlotHole: (
    projectId: string,
    title: string,
    description: string,
    severity: PlotHole['severity'],
    chapterIds: string[] = [],
    characterIds: string[] = [],
    detectedByGemini: boolean = false,
    suggestions?: string
  ): PlotHole => {
    const all = storage.getAllPlotHoles();
    const newItem: PlotHole = {
      id: generateId(),
      projectId,
      title,
      description,
      severity,
      status: 'open',
      chapterIds,
      characterIds,
      detectedByGemini,
      suggestions,
      createdAt: new Date().toISOString()
    };
    all.push(newItem);
    storage.saveAllPlotHoles(all);

    // Sync online
    const uid = auth.currentUser?.uid;
    if (uid) {
      setDoc(doc(db, 'plotHoles', newItem.id), { ...newItem, userId: uid })
        .catch(err => handleFirestoreError(err, OperationType.CREATE, `plotHoles/${newItem.id}`));
    }

    return newItem;
  },

  updatePlotHole: (updated: PlotHole): void => {
    const all = storage.getAllPlotHoles();
    const index = all.findIndex(p => p.id === updated.id);
    if (index !== -1) {
      all[index] = updated;
      storage.saveAllPlotHoles(all);

      // Sync online
      const uid = auth.currentUser?.uid;
      if (uid) {
        setDoc(doc(db, 'plotHoles', updated.id), { ...updated, userId: uid })
          .catch(err => handleFirestoreError(err, OperationType.UPDATE, `plotHoles/${updated.id}`));
      }
    }
  },

  deletePlotHole: (plotHoleId: string): void => {
    const all = storage.getAllPlotHoles().filter(p => p.id !== plotHoleId);
    storage.saveAllPlotHoles(all);

    // Sync online
    const uid = auth.currentUser?.uid;
    if (uid) {
      deleteDoc(doc(db, 'plotHoles', plotHoleId))
        .catch(err => handleFirestoreError(err, OperationType.DELETE, `plotHoles/${plotHoleId}`));
    }
  },

  // --- AI USAGE TRACKER ---
  getAiUseCount: (): number => safeGet<number>('novel_workspace_ai_use_count', 0),
  incrementAiUseCount: (): number => {
    let current = safeGet<number>('novel_workspace_ai_use_count', 0);
    current = Math.min(current + 1, 5); // Caps at 5 scans (which equals 100%)
    safeSet('novel_workspace_ai_use_count', current);
    return current;
  }
};
