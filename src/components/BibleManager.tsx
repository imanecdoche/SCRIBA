import React, { useState } from 'react';
import { CharacterItem, WorldItem } from '../types';
import { storage } from '../utils/storage';
import { Plus, Trash2, Edit2, ShieldAlert, User, Globe, Save, X, BookOpen, UserCheck, Map, ChevronDown, ChevronUp, Sparkles, Loader2 } from 'lucide-react';
import AppConfirmationModal from './AppConfirmationModal';
import BibleDetailModal from './BibleDetailModal';

interface BibleManagerProps {
  projectId: string;
  characters: CharacterItem[];
  worldItems: WorldItem[];
  onRefresh: () => void;
}

export default function BibleManager({ projectId, characters, worldItems, onRefresh }: BibleManagerProps) {
  const [activeTab, setActiveTab] = useState<'characters' | 'world'>('characters');
  
  // Custom Confirmation Dialog states
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteType, setConfirmDeleteType] = useState<'character' | 'world' | null>(null);

  // Form edit / additions
  const [editingChar, setEditingChar] = useState<Partial<CharacterItem> | null>(null);
  const [editingWorld, setEditingWorld] = useState<Partial<WorldItem> | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // State to track which items are currently having AI profile auto-generated in background
  const [generatingIds, setGeneratingIds] = useState<Record<string, boolean>>({});

  // Expanded items for showing full bible elements details
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  // AI Detail modal states
  const [selectedChar, setSelectedChar] = useState<CharacterItem | null>(null);
  const [selectedWorld, setSelectedWorld] = useState<WorldItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const openCharDetail = (char: CharacterItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedChar(char);
    setSelectedWorld(null);
    setIsDetailModalOpen(true);
  };

  const openWorldDetail = (item: WorldItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedWorld(item);
    setSelectedChar(null);
    setIsDetailModalOpen(true);
  };

  const toggleExpand = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Trigger Background AI Profiler immediately on creation
  const triggerAutomaticAiProfile = async (item: CharacterItem | WorldItem, type: 'character' | 'world') => {
    const itemId = item.id;
    setGeneratingIds(prev => ({ ...prev, [itemId]: true }));
    try {
      if (type === 'character') {
        const response = await fetch('/api/generate-character-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ character: item, others: characters }),
        });
        if (response.ok) {
          const data = await response.json();
          const withProfile = {
            ...(item as CharacterItem),
            aiProfile: data
          };
          storage.updateCharacter(withProfile);
          onRefresh();
          // If the detail modal is already open with the draft, update the selection state
          if (selectedChar?.id === itemId) {
            setSelectedChar(withProfile);
          }
        }
      } else {
        const response = await fetch('/api/generate-world-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ worldItem: item }),
        });
        if (response.ok) {
          const data = await response.json();
          const withProfile = {
            ...(item as WorldItem),
            aiProfile: data
          };
          storage.updateWorldItem(withProfile);
          onRefresh();
          // If the detail modal is already open with the draft, update the selection state
          if (selectedWorld?.id === itemId) {
            setSelectedWorld(withProfile);
          }
        }
      }
    } catch (e) {
      console.error("Gagal melakukan penulisan profil AI otomatis pasca-buat:", e);
    } finally {
      setGeneratingIds(prev => ({ ...prev, [itemId]: false }));
    }
  };

  // Character Roles & World Categories
  const ROLES = ['Protagonis', 'Antagonis', 'Pendukung', 'Lainnya'];
  const WORLD_CATEGORIES = ['Lokasi', 'Lore/Sejarah', 'Sistem Sihir/Fisika', 'Organisasi', 'Artefak/Benda', 'Lainnya'];

  // Handle Character Save
  const handleSaveCharacter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChar?.name) return;

    if (editingChar.id) {
      // Edit
      storage.updateCharacter(editingChar as CharacterItem);
    } else {
      // Add and trigger automatic AI generation
      const newItem = storage.addCharacter(
        projectId,
        editingChar.name,
        editingChar.role || 'Protagonis',
        editingChar.description || '',
        editingChar.backstory || '',
        editingChar.notes || ''
      );
      triggerAutomaticAiProfile(newItem, 'character');
    }
    setEditingChar(null);
    setIsAddingNew(false);
    onRefresh();
  };

  // Handle World Save
  const handleSaveWorld = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWorld?.name) return;

    if (editingWorld.id) {
      storage.updateWorldItem(editingWorld as WorldItem);
    } else {
      // Add and trigger automatic AI generation
      const newItem = storage.addWorldItem(
        projectId,
        editingWorld.name,
        editingWorld.category || 'Lokasi',
        editingWorld.description || '',
        editingWorld.notes || ''
      );
      triggerAutomaticAiProfile(newItem, 'world');
    }
    setEditingWorld(null);
    setIsAddingNew(false);
    onRefresh();
  };

  const startAddCharacter = () => {
    setEditingChar({
      name: '',
      role: 'Protagonis',
      description: '',
      backstory: '',
      notes: ''
    });
    setEditingWorld(null);
    setIsAddingNew(true);
  };

  const startAddWorld = () => {
    setEditingWorld({
      name: '',
      category: 'Lokasi',
      description: '',
      notes: ''
    });
    setEditingChar(null);
    setIsAddingNew(true);
  };

  const cancelEditing = () => {
    setEditingChar(null);
    setEditingWorld(null);
    setIsAddingNew(false);
  };

  const confirmDeleteCharacter = (id: string) => {
    setConfirmDeleteId(id);
    setConfirmDeleteType('character');
  };

  const confirmDeleteWorld = (id: string) => {
    setConfirmDeleteId(id);
    setConfirmDeleteType('world');
  };

  const executeDeletion = () => {
    if (!confirmDeleteId) return;

    if (confirmDeleteType === 'character') {
      storage.deleteCharacter(confirmDeleteId);
    } else if (confirmDeleteType === 'world') {
      storage.deleteWorldItem(confirmDeleteId);
    }

    setConfirmDeleteId(null);
    setConfirmDeleteType(null);
    onRefresh();
  };

  return (
    <div className="space-y-4">
      {/* Tab Selectors */}
      <div className="flex border-b border-neutral-100 pb-px">
        <button
          type="button"
          onClick={() => { setActiveTab('characters'); cancelEditing(); }}
          className={`flex items-center space-x-1.5 px-4 py-2 border-b-2 text-xs font-semibold tracking-wide uppercase transition cursor-pointer ${
            activeTab === 'characters'
              ? 'border-neutral-900 text-neutral-900'
              : 'border-transparent text-neutral-400 hover:text-neutral-600'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>CHAR BIBLE ({characters.length})</span>
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('world'); cancelEditing(); }}
          className={`flex items-center space-x-1.5 px-4 py-2 border-b-2 text-xs font-semibold tracking-wide uppercase transition cursor-pointer ${
            activeTab === 'world'
              ? 'border-neutral-900 text-neutral-900'
              : 'border-transparent text-neutral-400 hover:text-neutral-600'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>WORLD BIBLE ({worldItems.length})</span>
        </button>
      </div>

      {/* Main Content Area */}
      {!editingChar && !editingWorld ? (
        <div className="space-y-4">
          {/* Cards List */}
          {activeTab === 'characters' ? (
            characters.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center" id="empty-characters-bible">
                <p className="text-xs font-bold text-neutral-400 tracking-wider">Belum ada bible</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {characters.map((char) => {
                  return (
                    <div
                      key={char.id}
                      onClick={() => openCharDetail(char)}
                      className="bg-white border border-neutral-200 hover:border-neutral-900 rounded-xl p-4 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all duration-200 cursor-pointer flex items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[9px] font-black uppercase tracking-widest bg-neutral-950 text-white px-2.5 py-1 rounded">
                            {char.role}
                          </span>
                          {generatingIds[char.id] ? (
                            <span className="flex items-center gap-1 text-[8px] font-bold text-neutral-500 bg-neutral-50 border border-neutral-200 px-1.5 py-0.5 rounded animate-pulse">
                              <Loader2 className="w-2.5 h-2.5 animate-spin" /> Menganalisis...
                            </span>
                          ) : char.aiProfile ? (
                            <span className="flex items-center gap-0.5 text-[8px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded uppercase tracking-wider leading-none">
                              <Sparkles className="w-2.5 h-2.5 text-amber-500" /> AI Resume
                            </span>
                          ) : null}
                        </div>
                        <h4 className="text-sm font-bold text-neutral-900 font-montserrat tracking-tight truncate mt-1">{char.name}</h4>
                      </div>
                      
                      {/* Action buttons with click-propagation stopped */}
                      <div className="flex items-center space-x-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setEditingChar(char)}
                          className="p-1.5 bg-white hover:bg-neutral-900 text-neutral-800 hover:text-white border border-neutral-300 hover:border-neutral-950 rounded-xl transition cursor-pointer shadow-3xs flex items-center justify-center"
                          title={`Edit Karakter ${char.name}`}
                        >
                          <Edit2 className="w-3.5 h-3.5 font-bold" />
                        </button>
                        <button
                          type="button"
                          onClick={() => confirmDeleteCharacter(char.id)}
                          className="p-1.5 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-300 hover:border-red-600 rounded-xl transition cursor-pointer shadow-3xs flex items-center justify-center font-bold"
                          title={`Hapus Karakter ${char.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : worldItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center" id="empty-world-bible">
              <p className="text-xs font-bold text-neutral-400 tracking-wider">Belum ada bible</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {worldItems.map((item) => {
                return (
                  <div
                    key={item.id}
                    onClick={() => openWorldDetail(item)}
                    className="bg-white border border-neutral-200 hover:border-neutral-900 rounded-xl p-4 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all duration-200 cursor-pointer flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9px] font-black uppercase tracking-widest bg-neutral-950 text-white px-2.5 py-1 rounded">
                          {item.category}
                        </span>
                        {generatingIds[item.id] ? (
                          <span className="flex items-center gap-1 text-[8px] font-bold text-neutral-500 bg-neutral-50 border border-neutral-200 px-1.5 py-0.5 rounded animate-pulse">
                            <Loader2 className="w-2.5 h-2.5 animate-spin" /> Menganalisis...
                          </span>
                        ) : item.aiProfile ? (
                          <span className="flex items-center gap-0.5 text-[8px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded uppercase tracking-wider leading-none">
                            <Sparkles className="w-2.5 h-2.5 text-amber-500" /> AI Resume
                          </span>
                        ) : null}
                      </div>
                      <h4 className="text-sm font-bold text-neutral-900 font-montserrat tracking-tight truncate mt-1">{item.name}</h4>
                    </div>
                    
                    {/* Action buttons with click-propagation stopped */}
                    <div className="flex items-center space-x-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setEditingWorld(item)}
                        className="p-1.5 bg-white hover:bg-neutral-900 text-neutral-800 hover:text-white border border-neutral-300 hover:border-neutral-950 rounded-xl transition cursor-pointer shadow-3xs flex items-center justify-center"
                        title={`Edit Aturan ${item.name}`}
                      >
                        <Edit2 className="w-3.5 h-3.5 font-bold" />
                      </button>
                      <button
                        type="button"
                        onClick={() => confirmDeleteWorld(item.id)}
                        className="p-1.5 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-300 hover:border-red-600 rounded-xl transition cursor-pointer shadow-3xs flex items-center justify-center"
                        title={`Hapus Aturan ${item.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5 font-bold" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Floating Action Button (FAB) at Bottom Right */}
          <button
            type="button"
            onClick={activeTab === 'characters' ? startAddCharacter : startAddWorld}
            className="fixed bottom-6 right-6 z-40 w-11 h-11 bg-neutral-950 text-white hover:bg-neutral-800 rounded-full shadow-lg hover:shadow-xl transition-all duration-150 flex items-center justify-center cursor-pointer active:scale-95 border border-neutral-900"
            title={activeTab === 'characters' ? 'Tambah Karakter' : 'Tambah Setting'}
            id="btn-add-bible-fab"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      ) : (
        /* Form Editor Mode */
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-800">
              {editingChar 
                ? (editingChar.id ? 'Edit Karakter' : 'Tambah Karakter Baru')
                : (editingWorld?.id ? 'Edit Setting Dunia' : 'Tambah Aturan/Setting semesta')
              }
            </h4>
            <button
              type="button"
              onClick={cancelEditing}
              className="p-1 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-50 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {editingChar ? (
            /* Character Bible Editor Form */
            <form onSubmit={handleSaveCharacter} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                    Nama Karakter
                  </label>
                  <input
                    type="text"
                    required
                    value={editingChar.name || ''}
                    onChange={(e) => setEditingChar({ ...editingChar, name: e.target.value })}
                    placeholder="Contoh: Cassandra Sterling"
                    className="w-full text-xs px-3 py-2 border border-neutral-200 rounded-xl focus:outline-hidden focus:border-neutral-900 font-sans"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                    Peran Narasi
                  </label>
                  <select
                    value={editingChar.role || 'Protagonis'}
                    onChange={(e) => setEditingChar({ ...editingChar, role: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-neutral-200 rounded-xl focus:outline-hidden focus:border-neutral-900 bg-white"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                  Deskripsi Fisik & Sifat Kepribadian
                </label>
                <textarea
                  value={editingChar.description || ''}
                  onChange={(e) => setEditingChar({ ...editingChar, description: e.target.value })}
                  placeholder="Deskripsikan fitur fisik unik, kecenderungan psikologis, sifat utama moralnya..."
                  rows={3}
                  className="w-full text-xs p-3 border border-neutral-200 rounded-xl focus:outline-hidden focus:border-neutral-900 leading-relaxed"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                  Backstory / Latar Belakang Masa Lalu
                </label>
                <textarea
                  value={editingChar.backstory || ''}
                  onChange={(e) => setEditingChar({ ...editingChar, backstory: e.target.value })}
                  placeholder="Kisah tragis atau sejarah masa kecil yang membentuk tindakan masa kini..."
                  rows={3}
                  className="w-full text-xs p-3 border border-neutral-200 rounded-xl focus:outline-hidden focus:border-neutral-900 leading-relaxed"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                  Catatan Pribadi / Motif / Relasi Rahasia
                </label>
                <textarea
                  value={editingChar.notes || ''}
                  onChange={(e) => setEditingChar({ ...editingChar, notes: e.target.value })}
                  placeholder="Rahasia terdalam, konflik internal, atau hubungannya dengan plot besar..."
                  rows={2}
                  className="w-full text-xs p-3 border border-neutral-200 rounded-xl focus:outline-hidden focus:border-neutral-900 leading-relaxed"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-neutral-50">
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="px-4 py-2 text-xs font-semibold text-neutral-500 hover:bg-neutral-50 border border-neutral-100 rounded-xl transition cursor-pointer"
                >
                  Urungkan
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Bible</span>
                </button>
              </div>
            </form>
          ) : (
            /* World/Universe Bible Editor Form */
            <form onSubmit={handleSaveWorld} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                    Nama Setting / Objek Semesta
                  </label>
                  <input
                    type="text"
                    required
                    value={editingWorld.name || ''}
                    onChange={(e) => setEditingWorld({ ...editingWorld, name: e.target.value })}
                    placeholder="Contoh: Kesultanan Gransyre, Sihir Elemen Aura"
                    className="w-full text-xs px-3 py-2 border border-neutral-200 rounded-xl focus:outline-hidden focus:border-neutral-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                    Kategori Setting
                  </label>
                  <select
                    value={editingWorld.category || 'Lokasi'}
                    onChange={(e) => setEditingWorld({ ...editingWorld, category: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-neutral-200 rounded-xl focus:outline-hidden focus:border-neutral-900 bg-white"
                  >
                    {WORLD_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                  Penjelasan Detil / Tradisi & Mitos
                </label>
                <textarea
                  value={editingWorld.description || ''}
                  onChange={(e) => setEditingWorld({ ...editingWorld, description: e.target.value })}
                  placeholder="Definisikan sejarah tertulis, bentuk arsitektur, geografi fiksi, atau lore legendaris..."
                  rows={4}
                  className="w-full text-xs p-3 border border-neutral-200 rounded-xl focus:outline-hidden focus:border-neutral-900 leading-relaxed"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                  Aturan Logika / Hukum Mutlak / Keterbatasan
                </label>
                <textarea
                  value={editingWorld.notes || ''}
                  onChange={(e) => setEditingWorld({ ...editingWorld, notes: e.target.value })}
                  placeholder="Contoh: Aturan mutlak sihir membutuhkan bahan baku darah, atau Gerbang Gransyre dikunci pada jam 6 malam..."
                  rows={3}
                  className="w-full text-xs p-3 border border-neutral-200 rounded-xl focus:outline-hidden focus:border-neutral-900 leading-relaxed"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-neutral-50">
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="px-4 py-2 text-xs font-semibold text-neutral-500 hover:bg-neutral-50 border border-neutral-100 rounded-xl transition cursor-pointer"
                >
                  Urungkan
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Aturan Dunia</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Internal Custom Deletion Modal mapping the guidelines */}
      <AppConfirmationModal
        isOpen={confirmDeleteId !== null}
        title={confirmDeleteType === 'character' ? 'Hapus Karakter Bible' : 'Hapus Setting Dunia'}
        message={`Apakah Anda yakin ingin menghapus data "${
          confirmDeleteType === 'character' 
            ? characters.find(c => c.id === confirmDeleteId)?.name 
            : worldItems.find(w => w.id === confirmDeleteId)?.name
        }" ini secara permanen dari bible proyek novel Anda?`}
        onConfirm={executeDeletion}
        onCancel={() => { setConfirmDeleteId(null); setConfirmDeleteType(null); }}
      />

      {/* AI Resume and Full Popup Modal */}
      <BibleDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        type={selectedChar ? 'character' : 'world'}
        character={selectedChar || undefined}
        worldItem={selectedWorld || undefined}
        others={characters}
        onSaveCharacter={(updated) => {
          storage.updateCharacter(updated);
          onRefresh();
        }}
        onSaveWorld={(updated) => {
          storage.updateWorldItem(updated);
          onRefresh();
        }}
      />
    </div>
  );
}
