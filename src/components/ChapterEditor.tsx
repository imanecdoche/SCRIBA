import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Chapter, Project } from '../types';
import { storage, capitalizeWords } from '../utils/storage';
import { 
  Plus, Trash2, Edit3, Bold, Italic, BookOpen, Save, FileText, 
  ChevronRight, ArrowLeft, Eye, Edit, HelpCircle, Copy, Scissors
} from 'lucide-react';
import AppConfirmationModal from './AppConfirmationModal';

interface ChapterEditorProps {
  projectId: string;
  chapters: Chapter[];
  onRefresh: () => void;
}

export default function ChapterEditor({ projectId, chapters, onRefresh }: ChapterEditorProps) {
  // Navigation states: 
  // 'dashboard' - shows project metadata info and list of chapter cards
  // 'project-metadata' - separate module to edit project metadata
  // 'editor' - dedicated chapter writing canvas (Chapter Editor)
  const [activeSubView, setActiveSubView] = useState<'dashboard' | 'project-metadata' | 'editor'>('dashboard');
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);

  // Load and manage Project synopsis/metadata state
  const project = storage.getProjects().find((p) => p.id === projectId);

  // Input states for Project Metadata Editor screen
  const [tempTitle, setTempTitle] = useState('');
  const [tempAuthor, setTempAuthor] = useState('');
  const [tempGenres, setTempGenres] = useState('');
  const [tempSynopsis, setTempSynopsis] = useState('');

  // Extract primitive fields to avoid reference stability issues from storage.getProjects()
  const pTitle = project?.title;
  const pAuthor = project?.author;
  const pGenres = project?.genres;
  const pSynopsis = project?.synopsis;

  // Sync temp state with active project when entering project-metadata view
  useEffect(() => {
    if (activeSubView === 'project-metadata') {
      setTempTitle(pTitle || '');
      setTempAuthor(pAuthor || '');
      setTempGenres(pGenres || '');
      setTempSynopsis(pSynopsis || '');
    }
  }, [activeSubView, pTitle, pAuthor, pGenres, pSynopsis]);

  // For adding a new chapter
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newIsProlog, setNewIsProlog] = useState(false);
  const [newIsEpilog, setNewIsEpilog] = useState(false);

  // Editor vs Preview toggle in Chapter Editor
  const [editorMode, setEditorMode] = useState<'edit' | 'preview'>('edit');

  // Input bindings for active chapter in Chapter Editor
  const [activeContent, setActiveContent] = useState('');
  const [activeTitle, setActiveTitle] = useState('');
  const [activeSummary, setActiveSummary] = useState(''); // description/plot of chapter
  const [activeIsProlog, setActiveIsProlog] = useState(false);
  const [activeIsEpilog, setActiveIsEpilog] = useState(false);

  // Track if current chapter has unsaved changes
  const [isDirty, setIsDirty] = useState(false);

  // Back confirmation modal state
  const [showUnsavedBackModal, setShowUnsavedBackModal] = useState(false);

  // References for selection in custom text formatting
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Confirmation Delete modal state
  const [deleteChapterId, setDeleteChapterId] = useState<string | null>(null);

  // State for Custom Floating Contextual Menu
  const [showSelectionMenu, setShowSelectionMenu] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [selStart, setSelStart] = useState<number>(0);
  const [selEnd, setSelEnd] = useState<number>(0);
  const [menuCoords, setMenuCoords] = useState({ x: 0, y: 0 });
  const [copiedIndicator, setCopiedIndicator] = useState(false);

  const selectionTimeoutRef = useRef<number | null>(null);
  const pointerCoords = useRef({ x: 0, y: 0 });

  // --- STATE & HELPER FOR LONG-PRESS AND DRAG-TO-REORDER NOVEL CHAPTER CARDS ---
  const [localChapters, setLocalChapters] = useState<Chapter[]>([]);
  const [showCardPopupId, setShowCardPopupId] = useState<string | null>(null);
  const [popupCoords, setPopupCoords] = useState<{ x: number; y: number } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const longPressTimerRef = useRef<number | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingActiveRef = useRef<boolean>(false);

  // Sync state with incoming props chapters
  useEffect(() => {
    setLocalChapters(chapters);
  }, [chapters]);

  // Clean hold timers on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  const swapChapters = (draggedId: string, targetId: string) => {
    setLocalChapters((prev) => {
      const draggedIdx = prev.findIndex(item => item.id === draggedId);
      const targetIdx = prev.findIndex(item => item.id === targetId);
      if (draggedIdx === -1 || targetIdx === -1 || draggedIdx === targetIdx) return prev;
      
      const nextList = [...prev];
      const [draggedItem] = nextList.splice(draggedIdx, 1);
      nextList.splice(targetIdx, 0, draggedItem);
      return nextList;
    });
  };

  // Desktop Mouse Interactions
  const handleCardMouseDown = (e: React.MouseEvent, chId: string) => {
    if (e.button !== 0) return; // Left click only
    setShowCardPopupId(null);
    touchStartPosRef.current = { x: e.clientX, y: e.clientY };
    isDraggingActiveRef.current = false;

    longPressTimerRef.current = window.setTimeout(() => {
      if (!isDraggingActiveRef.current) {
        setShowCardPopupId(chId);
        // Position the context modal bubble slightly above pointer
        setPopupCoords({ x: e.clientX, y: e.clientY });
      }
    }, 500);
  };

  const handleCardMouseMove = (e: React.MouseEvent, chId: string) => {
    if (longPressTimerRef.current) {
      const dx = e.clientX - touchStartPosRef.current.x;
      const dy = e.clientY - touchStartPosRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 10) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
        isDraggingActiveRef.current = true;
        setDraggingId(chId);
      }
    }
  };

  const handleCardMouseUp = (e: React.MouseEvent, chId: string) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (!isDraggingActiveRef.current && !showCardPopupId) {
      setSelectedChapterId(chId);
      setActiveSubView('editor');
    }

    isDraggingActiveRef.current = false;
  };

  // Touch Screen Mobile Interactions
  const handleCardTouchStart = (e: React.TouchEvent, chId: string) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    
    setShowCardPopupId(null);
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    isDraggingActiveRef.current = false;

    longPressTimerRef.current = window.setTimeout(() => {
      if (!isDraggingActiveRef.current) {
        setShowCardPopupId(chId);
        setPopupCoords({ x: touch.clientX, y: touch.clientY });
      }
    }, 500);
  };

  const handleCardTouchMove = (e: React.TouchEvent, chId: string) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];

    const dx = touch.clientX - touchStartPosRef.current.x;
    const dy = touch.clientY - touchStartPosRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 10) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      isDraggingActiveRef.current = true;
      setDraggingId(chId);
    }

    if (isDraggingActiveRef.current && draggingId) {
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      const targetCard = element?.closest('[data-drag-chapter-id]');
      if (targetCard) {
        const targetId = targetCard.getAttribute('data-drag-chapter-id');
        if (targetId && targetId !== draggingId) {
          swapChapters(draggingId, targetId);
        }
      }
    }
  };

  const handleCardTouchEnd = (e: React.TouchEvent, chId: string) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (isDraggingActiveRef.current && draggingId) {
      storage.reorderChapters(projectId, localChapters);
      onRefresh();
    } else if (!isDraggingActiveRef.current && !showCardPopupId) {
      setSelectedChapterId(chId);
      setActiveSubView('editor');
    }

    setDraggingId(null);
    isDraggingActiveRef.current = false;
  };

  // Cleanup selection timer on change of editor subview
  useEffect(() => {
    return () => {
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }
    };
  }, [activeSubView, selectedChapterId]);

  // Handle outside clicks to dismiss the custom selection menu and the card hold-press popup
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const menuEl = document.getElementById('selection-floating-menu');
      if (menuEl && !menuEl.contains(e.target as Node)) {
        setShowSelectionMenu(false);
      }
      const cardPopupEl = document.getElementById('chapter-card-hold-popup');
      if (cardPopupEl && !cardPopupEl.contains(e.target as Node)) {
        setShowCardPopupId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  const handlePointerUpdate = (
    e: React.MouseEvent<HTMLTextAreaElement> | React.TouchEvent<HTMLTextAreaElement>
  ) => {
    let clientX = 0;
    let clientY = 0;
    if ('touches' in e) {
      if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if (e.changedTouches && e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
      }
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    if (clientX && clientY) {
      pointerCoords.current = { x: clientX, y: clientY };
    }
  };

  const handleSelectTextarea = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    if (start !== end) {
      const text = textarea.value.substring(start, end);
      setSelStart(start);
      setSelEnd(end);
      setSelectedText(text);

      // Reset existing timer
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }

      // Start 1-second delay context menu trigger
      selectionTimeoutRef.current = window.setTimeout(() => {
        const rect = textarea.getBoundingClientRect();
        
        let posX = rect.left + rect.width / 2;
        let posY = rect.top - 45;

        if (pointerCoords.current.x && pointerCoords.current.y) {
          posX = pointerCoords.current.x;
          posY = pointerCoords.current.y - 45;
        }

        const safeX = Math.max(16, Math.min(window.innerWidth - 180, posX - 80));
        const safeY = Math.max(16, Math.min(window.innerHeight - 60, posY));

        setMenuCoords({ x: safeX, y: safeY });
        setShowSelectionMenu(true);
      }, 1000);
    } else {
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }
      setShowSelectionMenu(false);
    }
  };

  const handleTextAreaContextMenu = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const textarea = e.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    if (start !== end) {
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }
      const text = textarea.value.substring(start, end);
      setSelStart(start);
      setSelEnd(end);
      setSelectedText(text);

      const posX = e.clientX;
      const posY = e.clientY - 45;

      const safeX = Math.max(16, Math.min(window.innerWidth - 180, posX - 80));
      const safeY = Math.max(16, Math.min(window.innerHeight - 60, posY));

      setMenuCoords({ x: safeX, y: safeY });
      setShowSelectionMenu(true);
    }
  };

  const handleMenuCopy = () => {
    if (!selectedText) return;
    navigator.clipboard.writeText(selectedText)
      .then(() => {
        setCopiedIndicator(true);
        setTimeout(() => {
          setCopiedIndicator(false);
          setShowSelectionMenu(false);
        }, 800);
      })
      .catch((err) => {
        console.error('Clipboard copy failed:', err);
        setShowSelectionMenu(false);
      });
  };

  const handleMenuCut = () => {
    if (!selectedText) return;
    navigator.clipboard.writeText(selectedText)
      .then(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const newContent = activeContent.substring(0, selStart) + activeContent.substring(selEnd);
        setActiveContent(newContent);
        setIsDirty(true);

        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(selStart, selStart);
        }, 50);

        setShowSelectionMenu(false);
      })
      .catch((err) => {
        console.error('Clipboard cut failed:', err);
        setShowSelectionMenu(false);
      });
  };

  const handleMenuBold = () => {
    const textarea = textareaRef.current;
    if (!textarea || !selectedText) return;

    const replacement = `**${selectedText}**`;
    const newContent = activeContent.substring(0, selStart) + replacement + activeContent.substring(selEnd);
    setActiveContent(newContent);
    setIsDirty(true);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(selStart + 2, selStart + 2 + selectedText.length);
    }, 50);

    setShowSelectionMenu(false);
  };

  const handleMenuItalic = () => {
    const textarea = textareaRef.current;
    if (!textarea || !selectedText) return;

    const replacement = `*${selectedText}*`;
    const newContent = activeContent.substring(0, selStart) + replacement + activeContent.substring(selEnd);
    setActiveContent(newContent);
    setIsDirty(true);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(selStart + 1, selStart + 1 + selectedText.length);
    }, 50);

    setShowSelectionMenu(false);
  };

  const activeChapter = chapters.find((c) => c.id === selectedChapterId);

  // Load chapter details when selectedChapterId / activeChapter changes
  useEffect(() => {
    if (activeChapter) {
      setActiveContent(activeChapter.content || '');
      setActiveTitle(activeChapter.title || '');
      setActiveSummary(activeChapter.summary || '');
      setActiveIsProlog(activeChapter.isProlog || false);
      setActiveIsEpilog(activeChapter.isEpilog || false);
      setIsDirty(false);
    } else {
      setActiveContent('');
      setActiveTitle('');
      setActiveSummary('');
      setActiveIsProlog(false);
      setActiveIsEpilog(false);
      setIsDirty(false);
    }
  }, [selectedChapterId, activeChapter]);

  // Handle saving project metadata
  const handleSaveMetadata = (e: React.FormEvent) => {
    e.preventDefault();
    if (project) {
      const formattedAuthor = capitalizeWords(tempAuthor);
      const formattedGenres = tempGenres
        .split(',')
        .map((g) => g.trim().toUpperCase())
        .filter(Boolean)
        .join(', ');

      storage.updateProject({
        ...project,
        title: capitalizeWords(tempTitle),
        author: formattedAuthor,
        genres: formattedGenres,
        synopsis: tempSynopsis,
      });

      onRefresh();
      setActiveSubView('dashboard');
    }
  };

  // Handle creating a new chapter
  const handleCreateChapter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const created = storage.addChapter(projectId, newTitle, newIsProlog, newIsEpilog);
    setNewTitle('');
    setNewIsProlog(false);
    setNewIsEpilog(false);
    setShowAddModal(false);
    onRefresh();
    
    // Auto-select and navigate directly to the new chapter editor
    setSelectedChapterId(created.id);
    setActiveSubView('editor');
  };

  // Handle saving active chapter content
  const handleSaveActive = () => {
    if (!activeChapter) return;
    const formattedTitle = capitalizeWords(activeTitle);
    setActiveTitle(formattedTitle);
    const updated: Chapter = {
      ...activeChapter,
      title: formattedTitle,
      content: activeContent,
      summary: activeSummary,
      isProlog: activeIsProlog,
      isEpilog: activeIsEpilog
    };
    storage.updateChapter(updated);
    setIsDirty(false);
    onRefresh();
  };

  // Custom text formatting function for markdown shortcuts
  const applyFormat = (formatType: 'bold' | 'italic') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    const selectedText = text.substring(start, end);
    let replacement = '';

    if (formatType === 'bold') {
      replacement = `**${selectedText}**`;
    } else if (formatType === 'italic') {
      replacement = `*${selectedText}*`;
    }

    const newContent = text.substring(0, start) + replacement + text.substring(end);
    setActiveContent(newContent);
    setIsDirty(true);

    setTimeout(() => {
      textarea.focus();
      const offset = formatType === 'bold' ? 2 : 1;
      textarea.setSelectionRange(start + offset, start + offset + selectedText.length);
    }, 50);
  };

  const confirmDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteChapterId(id);
  };

  const executeDelete = () => {
    if (!deleteChapterId) return;
    storage.deleteChapter(deleteChapterId);
    setDeleteChapterId(null);
    setIsDirty(false);
    setActiveSubView('dashboard');
    onRefresh();
  };

  const handleBackFromEditor = () => {
    if (isDirty) {
      setShowUnsavedBackModal(true);
    } else {
      setActiveSubView('dashboard');
    }
  };

  // Custom Renderer parsing bold (**) and italic (*)
  const renderFormattedPreview = (raw: string) => {
    if (!raw) return <p className="text-neutral-400 text-xs italic">Tulis draf petualangan novel Anda di tab edit...</p>;

    const lines = raw.split('\n');
    return lines.map((line, idx) => {
      if (!line.trim()) return <div key={idx} className="h-4" />;

      const boldRegex = /\*\*(.*?)\*\*/g;
      const italicRegex = /\*(.*?)\*/g;

      const htmlString = line
        .replace(boldRegex, '<strong class="font-bold text-neutral-900">$1</strong>')
        .replace(italicRegex, '<em class="italic text-neutral-800">$1</em>');

      return (
        <p
          key={idx}
          className="text-sm text-neutral-700 leading-relaxed indent-6 tracking-wide mb-3"
          dangerouslySetInnerHTML={{ __html: htmlString }}
        />
      );
    });
  };

  return (
    <div className="w-full transition-all duration-300">
      {/* 1. DASHBOARD VIEW (Metadata and Chapters list layout) */}
      {activeSubView === 'dashboard' && (
        <div className="space-y-6 animate-fade-in-down">
          {/* Metadata Proyek Card (Flat, Borderless & Clean) */}
          <div className="space-y-4 px-1 py-1" id="project-metadata-card">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[9px] font-extrabold tracking-widest text-neutral-450 uppercase">
                  Info Metadata Proyek
                </span>
                <h3 className="text-xl font-montserrat font-black tracking-wider text-neutral-900 uppercase">
                  {project?.title || 'Draf Tanpa Judul'}
                </h3>
              </div>
              
              {/* Edit metadata button - icon only */}
              <button
                type="button"
                onClick={() => setActiveSubView('project-metadata')}
                className="p-2 bg-neutral-950 text-white hover:bg-neutral-850 rounded-xl transition cursor-pointer shadow-3xs flex items-center justify-center shrink-0"
                title="Edit Info & Metadata Novel"
                id="btn-edit-metadata"
              >
                <Edit3 className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-neutral-200/60">
              <div className="space-y-0.5">
                <span className="text-[9px] font-extrabold text-neutral-450 uppercase tracking-widest block">Penulis / Author</span>
                <p className="text-xs font-bold text-neutral-850">
                  {project?.author ? capitalizeWords(project.author) : '-'}
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[9px] font-extrabold text-neutral-450 uppercase tracking-widest block">Tags Genre</span>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {project?.genres ? (
                    project.genres.split(',').map((g, idx) => (
                      <span key={idx} className="bg-neutral-100 text-neutral-800 text-[9px] uppercase font-bold px-2 py-0.5 rounded border border-neutral-200/50">
                        {g.trim().toUpperCase()}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-neutral-400 italic">Belum disetel</span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-1 pt-3 border-t border-neutral-200/60">
              <span className="text-[9px] font-extrabold text-neutral-450 uppercase tracking-widest block font-sans">Sinopsis Cerita Novel</span>
              <p className="text-xs text-neutral-600 leading-relaxed font-sans max-h-36 overflow-y-auto scrollbar-thin whitespace-pre-wrap">
                {project?.synopsis || 'Sinopsis cerita draf naskah Anda kosong. Definisikan outline naskah Anda agar terstruktur dari awal.'}
              </p>
            </div>
          </div>

          {/* Chapters Section */}
          <div className="space-y-3 pt-2" id="chapters-grid-container">
            <div className="flex justify-between items-center py-2 px-1" id="chapters-dashboard-hdr">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-neutral-900 flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-neutral-600" />
                <span>DAFTAR CHAPTER ({chapters.length})</span>
              </h4>
              
              {/* Tambah chapter button - icon only */}
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="p-2 bg-neutral-950 text-white hover:bg-neutral-800 rounded-xl transition cursor-pointer shadow-3xs flex items-center justify-center shrink-0"
                title="Sematkan Chapter Baru"
                id="btn-add-chapter"
              >
                <Plus className="w-4 h-4 font-bold" />
              </button>
            </div>

            {chapters.length === 0 ? (
              <div className="border border-dashed border-neutral-200/80 rounded-2xl flex flex-col items-center justify-center p-12 text-center bg-white shadow-3xs">
                <BookOpen className="w-8 h-8 text-neutral-300 mb-2" />
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-wide">Pustaka Draf Kosong</span>
                <p className="text-[10px] text-neutral-400 mt-1 max-w-xs leading-relaxed">
                  Mulailah jalinan draf baru Anda dengan menambahkan draf chapter pertama.
                </p>
              </div>
            ) : (
              /* Grid of Chapter Cards - Monochromatic dynamic black cards with white text and clean snug gap styling */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 select-none" id="chapters-deck">
                {(() => {
                  let standardCount = 0;
                  return localChapters.map((ch) => {
                    let badgeTag = '';
                    if (ch.isProlog) {
                      badgeTag = 'CH0';
                    } else if (ch.isEpilog) {
                      badgeTag = 'CH999';
                    } else {
                      standardCount++;
                      badgeTag = `CH${standardCount}`;
                    }

                    const isDraggingThis = draggingId === ch.id;

                    return (
                      <motion.div
                        key={ch.id}
                        layout
                        transition={{
                          type: "spring",
                          stiffness: 450,
                          damping: 35
                        }}
                        data-drag-chapter-id={ch.id}
                        draggable={true}
                        onDragStart={(e) => {
                          if (longPressTimerRef.current) {
                            clearTimeout(longPressTimerRef.current);
                            longPressTimerRef.current = null;
                          }
                          setDraggingId(ch.id);
                          setShowCardPopupId(null);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (draggingId && draggingId !== ch.id) {
                            swapChapters(draggingId, ch.id);
                          }
                        }}
                        onDragEnd={() => {
                          if (draggingId) {
                            storage.reorderChapters(projectId, localChapters);
                            onRefresh();
                          }
                          setDraggingId(null);
                        }}
                        onMouseDown={(e) => handleCardMouseDown(e, ch.id)}
                        onMouseMove={(e) => handleCardMouseMove(e, ch.id)}
                        onMouseUp={(e) => handleCardMouseUp(e, ch.id)}
                        onTouchStart={(e) => handleCardTouchStart(e, ch.id)}
                        onTouchMove={(e) => handleCardTouchMove(e, ch.id)}
                        onTouchEnd={(e) => handleCardTouchEnd(e, ch.id)}
                        className={`group bg-neutral-950 border ${
                          isDraggingThis ? 'border-neutral-500 scale-95 opacity-50 z-30' : 'border-neutral-900 hover:border-neutral-800'
                        } rounded-xl p-3 cursor-pointer transition-all duration-150 shadow-3xs hover:shadow-2xs flex flex-col justify-between min-h-[75px] touch-none`}
                        id={`chapter-card-${ch.id}`}
                      >
                        <span className="text-[9px] font-black tracking-widest text-neutral-400 group-hover:text-neutral-200 transition duration-150 mb-1 block">
                          {badgeTag}
                        </span>
                        <h5 className="text-[11px] font-bold text-white group-hover:text-neutral-100 transition duration-150 line-clamp-2 leading-tight">
                          {ch.title}
                        </h5>
                      </motion.div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. PROJECT METADATA EDITOR MODULE */}
      {activeSubView === 'project-metadata' && (
        <div className="bg-white border border-neutral-200/80 rounded-2xl p-6 shadow-3xs space-y-6 max-w-2xl mx-auto animate-fade-in-down" id="metadata-editor-module">
          <div className="flex items-center space-x-3 pb-3 border-b border-neutral-100">
            {/* Back to dashboard button - icon only */}
            <button
              type="button"
              onClick={() => setActiveSubView('dashboard')}
              className="p-2 border border-neutral-200 hover:bg-neutral-50 rounded-xl text-neutral-600 transition cursor-pointer shadow-3xs"
              title="Kembali ke Draf"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <span className="text-[10px] font-bold tracking-widest text-neutral-400 uppercase block">
                Metadata Proyek
              </span>
              <h2 className="text-sm font-black uppercase font-montserrat tracking-wider text-neutral-800">
                PENGATURAN NASKAH FILOSOFI
              </h2>
            </div>
          </div>

          <form onSubmit={handleSaveMetadata} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">
                Nama Proyek Novel
              </label>
              <input
                type="text"
                required
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                placeholder="Misal: Mahakarya Kota Tenggelam..."
                className="w-full text-xs px-3 py-2 border border-neutral-250 bg-white rounded-xl focus:outline-hidden focus:border-neutral-900 font-sans"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">
                  Penulis / Author
                </label>
                <input
                  type="text"
                  value={tempAuthor}
                  onChange={(e) => setTempAuthor(e.target.value)}
                  placeholder="Nama pena atau nama Anda..."
                  className="w-full text-xs px-3 py-2 border border-neutral-250 bg-white rounded-xl focus:outline-hidden focus:border-neutral-900 font-sans"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">
                  Tags Genre (Pisahkan dengan koma)
                </label>
                <input
                  type="text"
                  value={tempGenres}
                  onChange={(e) => setTempGenres(e.target.value)}
                  placeholder="Aksi, Fantasi, Romansa, Thriller..."
                  className="w-full text-xs px-3 py-2 border border-neutral-250 bg-white rounded-xl focus:outline-hidden focus:border-neutral-900 font-sans"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">
                Sinopsis Cerita Novel Utama
              </label>
              <textarea
                value={tempSynopsis}
                onChange={(e) => setTempSynopsis(e.target.value)}
                placeholder="Petakan klimaks, premise, motif protagonist dan alur dasar novel Anda..."
                rows={6}
                className="w-full text-xs p-3 border border-neutral-255 bg-white rounded-xl focus:outline-hidden focus:border-neutral-900 leading-relaxed font-sans resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setActiveSubView('dashboard')}
                className="px-4 py-2 text-xs font-semibold text-neutral-500 hover:bg-neutral-50 border border-neutral-200 rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              {/* Highly visible save metadata button */}
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-neutral-950 hover:bg-neutral-850 rounded-xl transition cursor-pointer shadow-3xs"
              >
                Simpan Metadata
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. CHAPTER EDITOR MODULE */}
      {activeSubView === 'editor' && activeChapter && (
        <div className="bg-white border border-neutral-200/85 rounded-2xl p-5 shadow-3xs space-y-4 animate-fade-in-down" id="chapter-editor-module">
          {/* Editor Header: Breadcrumbs & Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-neutral-100 pb-3">
            <div className="flex items-center space-x-3 overflow-hidden">
              {/* Back to dashboard button - icon only */}
              <button
                type="button"
                onClick={handleBackFromEditor}
                className="p-2 border border-neutral-200 hover:bg-neutral-50 text-neutral-700 rounded-xl transition cursor-pointer shadow-3xs flex items-center justify-center shrink-0"
                title="Keluar dari Editor Chapter"
                id="btn-back-to-chapters"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              
              {/* Breadcrumb path: [nama projek] > [CH#] [nama chapter] */}
              <div className="flex flex-wrap items-center gap-1 text-[11px] sm:text-xs text-neutral-400 font-medium overflow-hidden">
                <span 
                  className="hover:text-neutral-600 transition cursor-pointer truncate font-extrabold max-w-[120px]" 
                  onClick={handleBackFromEditor}
                  title={`Kembali ke Draf ${project?.title}`}
                >
                  {project?.title || 'Proyek'}
                </span>
                <ChevronRight className="w-3 h-3 text-neutral-350 shrink-0" />
                <span className="font-bold text-neutral-800 tracking-tight shrink-0">
                  {activeChapter.isProlog ? 'CH0' : (activeChapter.isEpilog ? 'EPILOG' : `CH${activeChapter.number}`)}
                </span>
                <ChevronRight className="w-3 h-3 text-neutral-350 shrink-0" />
                <span className="font-bold text-neutral-900 truncate tracking-wide max-w-[150px]">
                  {activeTitle || 'Tanpa Judul'}
                </span>
              </div>
            </div>

            {/* Quick Action Buttons in Chapter Editor */}
            <div className="flex items-center space-x-1.5 self-end sm:self-auto shrink-0">
              {isDirty && (
                <span className="text-[9px] bg-amber-50 text-amber-700 px-2 py-1 rounded-md font-extrabold border border-amber-100 mr-1.5 animate-pulse uppercase tracking-wide">
                  Draf Belum Disimpan
                </span>
              )}

              {/* Edit / Preview Toggle Buttons - Icons only */}
              <div className="flex border border-neutral-200 rounded-lg overflow-hidden p-0.5 bg-neutral-50 mr-1">
                <button
                  type="button"
                  onClick={() => setEditorMode('edit')}
                  className={`p-1.5 rounded-md transition ${
                    editorMode === 'edit'
                      ? 'bg-white text-neutral-900 shadow-3xs font-medium'
                      : 'text-neutral-400 hover:text-neutral-700'
                  }`}
                  title="Tulis Draf Bab"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditorMode('preview')}
                  className={`p-1.5 rounded-md transition ${
                    editorMode === 'preview'
                      ? 'bg-white text-neutral-900 shadow-3xs font-medium'
                      : 'text-neutral-400 hover:text-neutral-700'
                  }`}
                  title="Pratinjau Layout Buku"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Save Button - Icon only */}
              <button
                type="button"
                onClick={handleSaveActive}
                disabled={!isDirty}
                className={`p-2 border transition cursor-pointer rounded-xl flex items-center justify-center ${
                  isDirty
                    ? 'bg-neutral-950 hover:bg-neutral-800 border-neutral-950 text-white shadow-3xs'
                    : 'bg-neutral-50 text-neutral-300 border-neutral-200 cursor-not-allowed'
                }`}
                title="Amankan Perubahan Penulisan"
                id="btn-save-chapter"
              >
                <Save className="w-4 h-4" />
              </button>

              {/* Highly visible HAPUS Button for contrasts - Icon only */}
              <button
                type="button"
                onClick={(e) => confirmDelete(activeChapter.id, e)}
                className="p-2 bg-red-650 hover:bg-red-750 border border-red-650 hover:border-red-750 text-white rounded-xl transition cursor-pointer shadow-3xs flex items-center justify-center"
                title="HAPUS CHAPTER PERMANEN"
                id="btn-delete-chapter"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chapter Title & Prolog/Epilog Toggle Row */}
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between pb-1">
            <div className="w-full md:max-w-md">
              <input
                type="text"
                value={activeTitle}
                onChange={(e) => {
                  setActiveTitle(e.target.value);
                  setIsDirty(true);
                }}
                className="w-full text-base font-bold text-neutral-900 border-b border-neutral-100 hover:border-neutral-350 focus:border-neutral-900 bg-transparent p-1 focus:outline-hidden tracking-tight font-sans"
                placeholder="Ubah Judul Chapter..."
              />
            </div>

            <div className="flex items-center space-x-3 shrink-0">
              <label className="flex items-center space-x-1.5 text-xs text-neutral-500 font-medium select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeIsProlog}
                  onChange={(e) => {
                    setActiveIsProlog(e.target.checked);
                    if (e.target.checked) setActiveIsEpilog(false);
                    setIsDirty(true);
                  }}
                  className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                />
                <span>Prolog (CH0)</span>
              </label>

              <label className="flex items-center space-x-1.5 text-xs text-neutral-500 font-medium select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeIsEpilog}
                  onChange={(e) => {
                    setActiveIsEpilog(e.target.checked);
                    if (e.target.checked) setActiveIsProlog(false);
                    setIsDirty(true);
                  }}
                  className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                />
                <span>Epilog (CH999)</span>
              </label>
            </div>
          </div>

          {/* Chapter Synopsis & Plot Outline Area */}
          <div className="bg-neutral-50/50 rounded-xl p-3 border border-neutral-200/50 space-y-1">
            <span className="text-[9px] font-black uppercase tracking-wider text-neutral-400 block font-sans">
              SINOPSIS & PLOTLINE CHAPTER
            </span>
            <textarea
              value={activeSummary}
              onChange={(e) => {
                setActiveSummary(e.target.value);
                setIsDirty(true);
              }}
              className="w-full text-xs border border-neutral-200 bg-white rounded-lg p-2.5 focus:outline-hidden focus:border-neutral-950 font-sans leading-relaxed resize-none"
              rows={2}
              placeholder="Tuliskan 1-3 poin kunci bab ini (Misal: Cassandra menyusup ke perpustakaan agung kota di malam hari, diam-diam mencari catatan sejarah legiun ke-5...)"
            />
          </div>

          {/* Workspace Area: Draft Canvas & Word Count */}
          <div className="flex-1 flex flex-col justify-stretch">
            {editorMode === 'edit' ? (
              <div className="flex-1 flex flex-col space-y-2">
                {/* Floating formatting action bar and stat indicators */}
                <div className="flex items-center justify-between bg-neutral-50/80 border border-neutral-200 rounded-lg p-1">
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => applyFormat('bold')}
                      className="p-1 px-2 rounded hover:bg-neutral-200/80 text-neutral-700 transition"
                      title="Suku kata tebal (Bold md)"
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => applyFormat('italic')}
                      className="p-1 px-2 rounded hover:bg-neutral-200/80 text-neutral-700 transition"
                      title="Suku kata miring (Italic md)"
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Novel indicators */}
                  <div className="flex items-center space-x-2 text-[10px] font-mono text-neutral-500 font-bold uppercase px-2">
                    <span title="Draf Bab">Kata: {activeContent.trim() ? activeContent.trim().split(/\s+/).filter(Boolean).length : 0}</span>
                    <span className="text-neutral-300">|</span>
                    <span title="Estimasi membaca">~{Math.max(1, Math.ceil((activeContent.trim() ? activeContent.trim().split(/\s+/).filter(Boolean).length : 0) / 200))} mnt baca</span>
                  </div>
                </div>

                <textarea
                  ref={textareaRef}
                  value={activeContent}
                  onChange={(e) => {
                    setActiveContent(e.target.value);
                    setIsDirty(true);
                  }}
                  onSelect={handleSelectTextarea}
                  onMouseMove={handlePointerUpdate}
                  onMouseUp={handlePointerUpdate}
                  onTouchMove={handlePointerUpdate}
                  onTouchEnd={handlePointerUpdate}
                  onContextMenu={handleTextAreaContextMenu}
                  placeholder="Ketik rincian kisah dan dialog novel Anda di sini... Gunakan formatting toolbar di atas untuk mempercantik draf naskah."
                  className="w-full flex-1 min-h-[300px] text-xs p-4 border border-neutral-250 bg-white rounded-xl focus:outline-hidden focus:border-neutral-900 leading-relaxed font-sans scroll-smooth"
                />
              </div>
            ) : (
              /* Beautiful reader mode viewport */
              <div className="flex-1 bg-neutral-50/20 border border-neutral-200 rounded-xl p-6 overflow-y-auto max-h-[450px]">
                <h2 className="text-center font-bold text-neutral-900 text-lg mb-6 tracking-wide uppercase font-montserrat border-b border-neutral-100 pb-3">
                  {activeTitle || 'Chapter Tanpa Judul'}
                </h2>
                <div className="prose prose-sm max-w-none text-justify font-sans">
                  {renderFormattedPreview(activeContent)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Internal Custom App Confirmation deletion Modal */}
      <AppConfirmationModal
        isOpen={deleteChapterId !== null}
        title="Hapus Dokumen Chapter"
        message="Menghapus chapter ini akan membuang semua draf naskah cerita dan deskripsi plotline di dalamnya secara permanen. Tindakan ini tidak dapat dibatalkan. Apakah Anda yakin?"
        onConfirm={executeDelete}
        onCancel={() => setDeleteChapterId(null)}
        confirmText="Hapus Chapter"
        cancelText="Batal"
      />

      {/* Internal Unsaved Draft Back Confirmation Modal (Always customized internally inside app to prevent iFrame bloque) */}
      {showUnsavedBackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs transition-opacity duration-300">
          <div className="w-full max-w-md bg-white border border-neutral-200 rounded-2xl shadow-xl overflow-hidden p-6 space-y-4 animate-fade-in-down" id="unsaved-back-modal">
            <h3 className="text-base font-extrabold tracking-widest text-neutral-900 uppercase font-sans">
              AMANKAN DRAF PERUBAHAN?
            </h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Anda memiliki draf kisah baru pada chapter yang belum disimpan. Apakah Anda ingin menyimpannya terlebih dahulu sebelum kembali?
            </p>
            
            <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setShowUnsavedBackModal(false)}
                className="px-4 py-2 border border-neutral-200 text-neutral-600 rounded-xl hover:bg-neutral-50 text-xs font-semibold cursor-pointer text-center"
              >
                Urungkan & Tetap Tulis
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsDirty(false);
                  setShowUnsavedBackModal(false);
                  setActiveSubView('dashboard');
                }}
                className="px-4 py-2 border border-red-200 text-red-650 rounded-xl hover:bg-red-50 text-xs font-semibold cursor-pointer text-center"
              >
                Pergi Tanpa Menyimpan
              </button>
              <button
                type="button"
                onClick={() => {
                  handleSaveActive();
                  setIsDirty(false);
                  setShowUnsavedBackModal(false);
                  setActiveSubView('dashboard');
                }}
                className="px-4 py-2 bg-neutral-950 text-white hover:bg-neutral-850 rounded-xl text-xs font-semibold cursor-pointer text-center shadow-3xs"
              >
                Simpan & Kembali
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Standard Dialog for Adding Chapter */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-neutral-200 rounded-2xl p-6 shadow-xl space-y-4 animate-scale-up" id="add-chapter-dialog">
            <h3 className="text-xs font-black tracking-widest text-neutral-800 uppercase">
              Rancang Chapter Baru
            </h3>
            
            <form onSubmit={handleCreateChapter} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">
                  Judul/Nama Chapter
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Contoh: Menembus Batas Kota Tenggelam..."
                  className="w-full text-xs px-3 py-2.5 border border-neutral-250 rounded-xl focus:outline-hidden focus:border-neutral-900"
                />
              </div>

              <div className="flex gap-4 items-center pt-1">
                <label className="flex items-center space-x-1.5 text-xs text-neutral-600 font-medium select-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newIsProlog}
                    onChange={(e) => {
                      setNewIsProlog(e.target.checked);
                      if (e.target.checked) setNewIsEpilog(false);
                    }}
                    className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                  />
                  <span>Sebagai Prolog (CH0)</span>
                </label>

                <label className="flex items-center space-x-1.5 text-xs text-neutral-600 font-medium select-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newIsEpilog}
                    onChange={(e) => {
                      setNewIsEpilog(e.target.checked);
                      if (e.target.checked) setNewIsProlog(false);
                    }}
                    className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                  />
                  <span>Sebagai Epilog (CH999)</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-50">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-500 hover:bg-neutral-50 border border-neutral-150 rounded-xl transition cursor-pointer"
                >
                  Urungkan
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-neutral-950 hover:bg-neutral-850 rounded-xl transition cursor-pointer shadow-3xs"
                >
                  Tambahkan Chapter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Hold Chapter Card Context offering HAPUS option */}
      {showCardPopupId && popupCoords && (
        <div 
          className="fixed z-50 bg-neutral-950 text-white border border-neutral-850 rounded-xl px-2 py-1 shadow-md text-xs font-bold font-sans flex items-center space-x-1 animate-scale-up"
          style={{
            left: `${popupCoords.x}px`,
            top: `${popupCoords.y - 45}px`,
            transform: 'translateX(-50%)',
          }}
          id="chapter-card-hold-popup"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteChapterId(showCardPopupId);
              setShowCardPopupId(null);
            }}
            className="flex items-center space-x-1 px-2.5 py-1.5 hover:bg-neutral-800/80 rounded-lg text-red-400 hover:text-red-300 transition cursor-pointer font-extrabold uppercase tracking-wider text-[10px]"
            id="btn-popup-delete-chapter"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>HAPUS</span>
          </button>
          
          <div className="w-[1px] h-3 bg-neutral-800" />
          
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowCardPopupId(null);
            }}
            className="px-2.5 py-1.5 hover:bg-neutral-800/80 rounded-lg text-neutral-400 hover:text-white transition cursor-pointer text-[10px] uppercase tracking-wider font-extrabold"
            id="btn-popup-cancel-delete"
          >
            Batal
          </button>
        </div>
      )}

      {/* Custom Floating Context Selection Toolbar (replacing system context menu) */}
      {showSelectionMenu && (
        <div
          id="selection-floating-menu"
          style={{
            position: 'fixed',
            left: `${menuCoords.x}px`,
            top: `${menuCoords.y}px`,
          }}
          className="z-55 bg-white border border-neutral-200 shadow-md rounded-xl flex items-center p-1 space-x-1 transition-all duration-200 animate-scale-up"
        >
          {copiedIndicator ? (
            <span className="text-[10px] font-bold text-neutral-800 px-3 py-1 font-sans uppercase tracking-wider">
              Tersalin!
            </span>
          ) : (
            <>
              {/* COPY */}
              <button
                type="button"
                onClick={handleMenuCopy}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition active:scale-95"
                title="Salin Kata (Copy)"
                id="btn-ctx-copy"
              >
                <Copy className="w-4 h-4" />
              </button>
              
              {/* CUT */}
              <button
                type="button"
                onClick={handleMenuCut}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition active:scale-95"
                title="Potong Kata (Cut)"
                id="btn-ctx-cut"
              >
                <Scissors className="w-4 h-4" />
              </button>

              <div className="w-[1px] h-4 bg-neutral-200 self-center" />

              {/* BOLD */}
              <button
                type="button"
                onClick={handleMenuBold}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition active:scale-95"
                title="Tebalkan Kata (Bold)"
                id="btn-ctx-bold"
              >
                <Bold className="w-4 h-4" />
              </button>

              {/* ITALIC */}
              <button
                type="button"
                onClick={handleMenuItalic}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition active:scale-95"
                title="Miringkan Kata (Italic)"
                id="btn-ctx-italic"
              >
                <Italic className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
