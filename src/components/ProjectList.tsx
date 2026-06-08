import React, { useState, useEffect } from 'react';
import { Project, ProjectType } from '../types';
import { storage } from '../utils/storage';
import { Plus, Trash2, BookOpen, Layers, Milestone, AlignLeft, ArrowRight, FolderKanban, Check, Sparkles, Database, Loader2, RefreshCw, CheckCircle2, Copy } from 'lucide-react';
import AppConfirmationModal from './AppConfirmationModal';
import { auth } from '../utils/firebase';
import CustomSelect, { DropdownOption } from './CustomSelect';

const PROJECT_TYPE_OPTIONS: DropdownOption[] = [
  { value: 'solo', label: 'Solo Novel', description: 'Buku Mandiri Tunggal' },
  { value: 'series', label: 'Series / Duologi / Trilogi', description: 'Multi Buku' },
  { value: 'mini', label: 'Mini Novel', description: 'Novelet / Cerita Pendek Padat' }
];

interface ProjectListProps {
  onSelectProject: (projectId: string) => void;
  onRefresh: () => void;
  projects: Project[];
  currentProjectId: string;
}

export default function ProjectList({ onSelectProject, onRefresh, projects, currentProjectId }: ProjectListProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSynopsis, setNewSynopsis] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newType, setNewType] = useState<ProjectType>('solo');

  // Deletion Custom Dialog confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; projectId: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const handleCloseMenu = () => {
      setContextMenu(null);
    };
    window.addEventListener('click', handleCloseMenu);
    window.addEventListener('contextmenu', handleCloseMenu);
    return () => {
      window.removeEventListener('click', handleCloseMenu);
      window.removeEventListener('contextmenu', handleCloseMenu);
    };
  }, []);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const created = storage.addProject(newTitle, newSynopsis, newType, newAuthor);
    setNewTitle('');
    setNewSynopsis('');
    setNewAuthor('');
    setNewType('solo');
    setShowAddModal(false);
    onRefresh();
    // Auto select the new project!
    onSelectProject(created.id);
  };

  const confirmDeleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering project selection!
    setConfirmDeleteId(id);
  };

  const executeDelete = () => {
    if (!confirmDeleteId) return;
    storage.deleteProject(confirmDeleteId);
    setConfirmDeleteId(null);
    onRefresh();
  };

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="flex justify-between items-center py-2" id="library-header-wrapper">
        <h2 className="text-2xl font-montserrat font-black tracking-widest text-neutral-905 uppercase">
          PUSTAKA
        </h2>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="p-2.5 rounded-xl bg-neutral-950 text-white hover:bg-neutral-850 transition cursor-pointer flex items-center justify-center shadow-3xs"
          title="Buat Proyek Novel Baru"
          id="btn-add-project"
        >
          <Plus className="w-5 h-5 font-bold" />
        </button>
      </div>

      {/* Grid of Projects */}
      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed border-neutral-200 bg-neutral-50/50 rounded-2xl">
          <BookOpen className="w-10 h-10 text-neutral-300 mb-2" />
          <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            Pustaka Kosong
          </h4>
          <p className="text-[11px] text-neutral-400 mt-1 max-w-xs text-center leading-relaxed">
            Mulai petualangan kepenulisan Anda dengan melahirkan proyek novel pertama Anda sekarang.
          </p>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="mt-4 px-3.5 py-2 text-xs font-semibold uppercase tracking-wider bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl transition"
          >
            Mulai Proyek Baru
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((proj) => {
            const isActive = proj.id === currentProjectId;
            
            // Generate visual styles representing different project formats
            let typeBadge = '';
            let typeDesc = '';
            if (proj.type === 'solo') {
              typeBadge = 'Solo Novel';
              typeDesc = 'Buku tunggal mandiri';
            } else if (proj.type === 'series') {
              typeBadge = 'Series / Trilogi';
              typeDesc = 'Multi sekuel bercabang';
            } else {
              typeBadge = 'Mini Novel (Novelet)';
              typeDesc = 'Cerita pendek padat';
            }

            return (
              <div
                key={proj.id}
                onClick={() => onSelectProject(proj.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setContextMenu({
                    x: e.clientX,
                    y: e.clientY,
                    projectId: proj.id
                  });
                }}
                className={`group relative flex flex-col justify-between bg-white border rounded-2xl p-5 shadow-3xs cursor-pointer transition ${
                  isActive
                    ? 'border-neutral-950 ring-1 ring-neutral-950'
                    : 'border-neutral-200 hover:border-neutral-400/80 hover:shadow-xs'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-md">
                      {typeBadge}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => confirmDeleteProject(proj.id, e)}
                      className={`p-1.5 rounded-lg border transition cursor-pointer shadow-3xs flex items-center justify-center shrink-0 ${
                        isActive
                          ? 'bg-red-900/95 border-red-750 text-white hover:bg-red-800'
                          : 'bg-red-55 border-red-300 text-red-700 hover:bg-red-600 hover:text-white'
                      }`}
                      title="Hapus Proyek"
                    >
                      <Trash2 className="w-3.5 h-3.5 font-bold" />
                    </button>
                  </div>

                  <h3 className="text-sm font-bold text-neutral-900 mt-3 font-sans group-hover:text-neutral-950 line-clamp-1">
                    {proj.title}
                  </h3>
                  
                  <p className="text-[10px] text-neutral-500 font-bold mb-1 uppercase tracking-wide">
                    Penulis: {proj.author || 'Anonim'}
                  </p>
                  
                  <p className="text-xs text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
                    {proj.synopsis || 'Belum ada sinopsis tertulis untuk naskah ini...'}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-neutral-100 flex items-center justify-between text-[10px] text-neutral-400">
                  <span className="italic">
                    Edited: {new Date(proj.updatedAt).toLocaleDateString('id-ID')}
                  </span>
                  
                  <div className="flex items-center space-x-1 font-semibold text-neutral-800">
                    <span>Kelola Naskah</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
                  </div>
                </div>

                {isActive && (
                  <div className="absolute -top-1 -right-1 bg-neutral-950 text-white p-0.5 rounded-full shadow-md">
                    <Check className="w-3 h-3" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Novel project creation modal dialog */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-neutral-200 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-xs font-semibold tracking-wider text-neutral-800 uppercase">
              Buat Proyek Novel Baru
            </h3>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-neutral-400 uppercase">
                  Judul Novel / Naskah
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Contoh: Takdir Gransyre"
                  className="w-full text-xs px-3 py-2 border border-neutral-200 rounded-xl focus:outline-hidden focus:border-neutral-900"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-neutral-400 uppercase">
                  Nama Penulis / Author
                </label>
                <input
                  type="text"
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                  placeholder="Contoh: Alexander Graham"
                  className="w-full text-xs px-3 py-2 border border-neutral-200 rounded-xl focus:outline-hidden focus:border-neutral-900"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-neutral-400 uppercase">
                  Kategori Format Proyek
                </label>
                <CustomSelect
                  value={newType}
                  onChange={(val) => setNewType(val as ProjectType)}
                  options={PROJECT_TYPE_OPTIONS}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-neutral-400 uppercase">
                  Sinopsis / Ide Garis Besar
                </label>
                <textarea
                  value={newSynopsis}
                  onChange={(e) => setNewSynopsis(e.target.value)}
                  placeholder="Ceritakan core konflik utama cerita novel Anda (premise, motif karakter, dan klimaks umum)..."
                  rows={3}
                  className="w-full text-xs p-3 border border-neutral-200 rounded-xl focus:outline-hidden focus:border-neutral-900 leading-relaxed"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-neutral-50">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-500 hover:bg-neutral-50 border border-neutral-100 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl transition cursor-pointer"
                >
                  Mulai Proyek
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Internal Cust Confirmation Dialog */}
      <AppConfirmationModal
        isOpen={confirmDeleteId !== null}
        title="Hapus Proyek Novel"
        message="Menghapus proyek ini akan menghapus ALL data terkait (chapter draf, karakter bible, setting, serta daftar plot hole terkait) secara permanen. Tindakan ini tidak dapat diurungkan!"
        onConfirm={executeDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />

      {/* Reusable Context Menu for Project Cards */}
      {contextMenu && (
        <div
          id="project-context-menu"
          className="fixed z-50 bg-white border border-neutral-200/90 rounded-xl shadow-lg p-1.5 w-48 animate-scale-up font-sans"
          style={{
            left: `${Math.max(10, Math.min(window.innerWidth - 202, contextMenu.x))}px`,
            top: `${Math.max(10, Math.min(window.innerHeight - 130, contextMenu.y))}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              onSelectProject(contextMenu.projectId);
              setContextMenu(null);
            }}
            className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 hover:text-neutral-950 rounded-lg transition text-left cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-neutral-500" />
            <span>Buka Proyek</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const id = contextMenu.projectId;
              navigator.clipboard.writeText(id).then(() => {
                setCopiedId(id);
                setTimeout(() => setCopiedId(null), 1250);
              });
              setContextMenu(null);
            }}
            className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 hover:text-neutral-950 rounded-lg transition text-left cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-neutral-500" />
            <span>{copiedId === contextMenu.projectId ? 'Tersalin!' : 'Salin Kode ID'}</span>
          </button>

          <div className="h-px bg-neutral-100 my-1" />

          <button
            type="button"
            onClick={() => {
              setConfirmDeleteId(contextMenu.projectId);
              setContextMenu(null);
            }}
            className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg transition text-left cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
            <span>Hapus Proyek</span>
          </button>
        </div>
      )}
    </div>
  );
}
