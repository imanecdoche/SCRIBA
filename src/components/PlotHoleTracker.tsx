import React, { useState } from 'react';
import { PlotHole, Chapter, CharacterItem, WorldItem } from '../types';
import { storage } from '../utils/storage';
import { 
  Plus, AlertTriangle, CheckCircle, Trash2, Edit2, Sparkles, HelpCircle, 
  RefreshCw, CornerDownRight, Milestone, AlertOctagon, X, SearchCheck, CheckCheck 
} from 'lucide-react';
import AppConfirmationModal from './AppConfirmationModal';
import CustomSelect, { DropdownOption } from './CustomSelect';

interface PlotHoleTrackerProps {
  projectId: string;
  plotHoles: PlotHole[];
  chapters: Chapter[];
  characters: CharacterItem[];
  worldItems: WorldItem[];
  onRefresh: () => void;
}

const SEVERITY_OPTIONS: DropdownOption[] = [
  { value: 'low', label: 'Kecil / Low', description: 'Tidak Terlalu Mengganggu' },
  { value: 'medium', label: 'Sedang / Medium', description: 'Mengganggu Logika' },
  { value: 'high', label: 'Besar / High', description: 'Merusak Seluruh Alur Cerita' }
];

export default function PlotHoleTracker({
  projectId,
  plotHoles,
  chapters,
  characters,
  worldItems,
  onRefresh,
}: PlotHoleTrackerProps) {
  const [activeTab, setActiveTab] = useState<'open' | 'resolved'>('open');
  
  // Creation / Editing manual plot hole states
  const [isAdding, setIsAdding] = useState(false);
  const [editingPlotHole, setEditingPlotHole] = useState<Partial<PlotHole> | null>(null);

  // Link components selection
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([]);

  // Resolution Notes Modal state
  const [resolvePlotHole, setResolvePlotHole] = useState<PlotHole | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  // AI loading and error states
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiLoadingMessage, setAiLoadingMessage] = useState('');
  const [aiError, setAiError] = useState<string | null>(null);

  // Custom Delete confirmation Dialog states
  const [deletePlotHoleId, setDeletePlotHoleId] = useState<string | null>(null);

  // Filtered Plot Holes
  const currentPlotHoles = plotHoles.filter((p) => p.status === activeTab);

  const startAddPlotHole = () => {
    setEditingPlotHole({
      title: '',
      description: '',
      severity: 'medium',
    });
    setSelectedChapters([]);
    setSelectedCharacters([]);
    setIsAdding(true);
  };

  const handleSavePlotHole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlotHole?.title) return;

    if (editingPlotHole.id) {
      // Update existing
      const updated: PlotHole = {
        ...editingPlotHole as PlotHole,
        chapterIds: selectedChapters,
        characterIds: selectedCharacters,
      };
      storage.updatePlotHole(updated);
    } else {
      // Add new manual
      storage.addPlotHole(
        projectId,
        editingPlotHole.title,
        editingPlotHole.description || '',
        editingPlotHole.severity || 'medium',
        selectedChapters,
        selectedCharacters,
        false // Not detected by Gemini
      );
    }

    setEditingPlotHole(null);
    setIsAdding(false);
    onRefresh();
  };

  const startEditPlotHole = (p: PlotHole) => {
    setEditingPlotHole(p);
    setSelectedChapters(p.chapterIds || []);
    setSelectedCharacters(p.characterIds || []);
    setIsAdding(true);
  };

  const handleResolveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvePlotHole) return;

    const updated: PlotHole = {
      ...resolvePlotHole,
      status: 'resolved',
      resolutionNotes: resolutionNotes,
    };

    storage.updatePlotHole(updated);
    setResolvePlotHole(null);
    setResolutionNotes('');
    onRefresh();
  };

  const handleReopen = (p: PlotHole) => {
    const updated: PlotHole = {
      ...p,
      status: 'open',
      resolutionNotes: '',
    };
    storage.updatePlotHole(updated);
    onRefresh();
  };

  const confirmDelete = (id: string) => {
    setDeletePlotHoleId(id);
  };

  const executeDelete = () => {
    if (!deletePlotHoleId) return;
    storage.deletePlotHole(deletePlotHoleId);
    setDeletePlotHoleId(null);
    onRefresh();
  };

  // Run Smart AI Plot Hole Detector using Gemini backend
  const runAiDetector = async () => {
    setIsAiLoading(true);
    setAiError(null);
    
    const messages = [
      "Mengumpulkan data naskah, karakter, dan setting dunia...",
      "Membaca dan memetakan garis waktu (timeline) cerita Anda...",
      "Menganalisis anomali tindakan karakter fiksi...",
      "Memeriksa apakah ada aturan dunia atau hukum sihir fiksi yang patah...",
      "Penulisan hasil analisis plot hole oleh Gemini AI..."
    ];

    let msgIdx = 0;
    setAiLoadingMessage(messages[0]);
    const timer = setInterval(() => {
      msgIdx = (msgIdx + 1) % messages.length;
      setAiLoadingMessage(messages[msgIdx]);
    }, 2800);

    try {
      const res = await fetch("/api/detect-plot-holes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapters,
          characters,
          worldItems,
        }),
      });

      if (!res.ok) {
        throw new Error("Gagal terhubung dengan server pengolah Gemini AI.");
      }

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }

      const incomingHoles = data.plotHoles || [];
      storage.incrementAiUseCount(); // Increment the AI usage counter
      if (incomingHoles.length === 0) {
        setAiError("Hebat! Gemini AI tidak menemukan satu pun plot hole atau inkonsistensi yang jelas dalam cerita Anda saat ini.");
      } else {
        // Safe batch inject to storage
        incomingHoles.forEach((hole: any) => {
          storage.addPlotHole(
            projectId,
            hole.title,
            hole.description,
            hole.severity || 'medium',
            hole.chapterIds || [],
            hole.characterIds || [],
            true, // Detected by Gemini
            hole.suggestions
          );
        });
        onRefresh();
      }
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || "Gagal melakukan scan analisis plot hole novel.");
    } finally {
      clearInterval(timer);
      setIsAiLoading(false);
    }
  };

  const toggleSelectChapter = (id: string) => {
    setSelectedChapters((prev) =>
      prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id]
    );
  };

  const toggleSelectCharacter = (id: string) => {
    setSelectedCharacters((prev) =>
      prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Controller Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-white p-3 border border-neutral-200/80 rounded-xl shadow-3xs">
        <div className="flex border border-neutral-200 rounded-lg overflow-hidden p-0.5 bg-neutral-50 self-start">
          <button
            type="button"
            onClick={() => setActiveTab('open')}
            className={`px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider transition ${
              activeTab === 'open'
                ? 'bg-white text-neutral-900 shadow-3xs'
                : 'text-neutral-400 hover:text-neutral-600'
            }`}
          >
            Masalah Terbuka ({plotHoles.filter((p) => p.status === 'open').length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('resolved')}
            className={`px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider transition ${
              activeTab === 'resolved'
                ? 'bg-white text-neutral-900 shadow-3xs'
                : 'text-neutral-400 hover:text-neutral-600'
            }`}
          >
            Telah Diselesaikan ({plotHoles.filter((p) => p.status === 'resolved').length})
          </button>
        </div>

        {/* Action icons */}
        <div className="flex items-center space-x-2 self-end sm:self-auto">
          {!isAdding && !resolvePlotHole && (
            <>
              <button
                type="button"
                onClick={runAiDetector}
                disabled={isAiLoading}
                className="px-3 py-1.5 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-xs font-semibold text-neutral-800 transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                title="Jalankan Detektor Plot Hole AI (Memindai semua data chapter & bible novel)"
              >
                <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-500" />
                <span>Scan Plot Hole AI</span>
              </button>
              <button
                type="button"
                onClick={startAddPlotHole}
                className="p-1.5 rounded-xl border border-neutral-200 bg-neutral-900 text-white hover:bg-neutral-800 transition cursor-pointer"
                title="Catat Plot Hole Manual"
              >
                <Plus className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* AI Search Loading / Error Feedback panel inline */}
      {isAiLoading && (
        <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-6 flex flex-col items-center justify-center text-center animate-fade-in spacing-y-2">
          <RefreshCw className="w-6 h-6 text-neutral-500 animate-spin mb-3" />
          <h4 className="text-xs font-semibold uppercase text-neutral-700 tracking-wider">
            Detektor Plot Hole AI Sedang Bekerja...
          </h4>
          <p className="text-[11px] text-neutral-400 italic max-w-sm">
            "{aiLoadingMessage}"
          </p>
        </div>
      )}

      {aiError && (
        <div className="bg-neutral-100/50 border border-neutral-200 rounded-xl p-4 flex justify-between items-start text-xs text-neutral-700">
          <div className="flex space-x-2">
            <SearchCheck className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{aiError}</p>
          </div>
          <button
            type="button"
            onClick={() => setAiError(null)}
            className="text-neutral-400 hover:text-neutral-600 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Adding / Editing Form Mode */}
      {isAdding && editingPlotHole ? (
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-800">
              {editingPlotHole.id ? 'Edit Plot Hole Tracker' : 'Catat Potensi Plot Hole Baru'}
            </h4>
            <button
              type="button"
              onClick={() => { setIsAdding(false); setEditingPlotHole(null); }}
              className="p-1 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-50 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSavePlotHole} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                  Nama Isu / Inkonsistensi Plot
                </label>
                <input
                  type="text"
                  required
                  value={editingPlotHole.title || ''}
                  onChange={(e) => setEditingPlotHole({ ...editingPlotHole, title: e.target.value })}
                  placeholder="Contoh: Timeline Jam Malam Gerbang Gransyre Konflik"
                  className="w-full text-xs px-3 py-2 border border-neutral-200 rounded-xl focus:outline-hidden focus:border-neutral-900"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                  Tingkat Kepayahan (Severity)
                </label>
                <CustomSelect
                  value={editingPlotHole.severity || 'medium'}
                  onChange={(val) => setEditingPlotHole({ ...editingPlotHole, severity: val as any })}
                  options={SEVERITY_OPTIONS}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                Penjelasan Logika & Masalah
              </label>
              <textarea
                required
                value={editingPlotHole.description || ''}
                onChange={(e) => setEditingPlotHole({ ...editingPlotHole, description: e.target.value })}
                placeholder="Deskripsikan dengan detail inkonsistensi yang Anda temukan atau pikirkan..."
                rows={3}
                className="w-full text-xs p-3 border border-neutral-200 rounded-xl focus:outline-hidden focus:border-neutral-900 leading-relaxed"
              />
            </div>

            {/* Linking to Chapters & Characters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">
                  Kaitkan dengan Chapter Terkait
                </label>
                <div className="max-h-36 overflow-y-auto border border-neutral-200 rounded-xl p-2.5 space-y-1">
                  {chapters.length === 0 ? (
                    <span className="text-[10px] text-neutral-400">Belum ada chapter terdaftar.</span>
                  ) : (
                    chapters.map((ch) => (
                      <label key={ch.id} className="flex items-center space-x-2 text-[11px] text-neutral-600 block cursor-pointer hover:bg-neutral-50 px-1 py-0.5 rounded">
                        <input
                          type="checkbox"
                          checked={selectedChapters.includes(ch.id)}
                          onChange={() => toggleSelectChapter(ch.id)}
                          className="rounded border-neutral-200"
                        />
                        <span className="truncate">{ch.isProlog ? 'Prolog' : ch.isEpilog ? 'Epilog' : `CH ${ch.number}`}: {ch.title}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">
                  Kaitkan dengan Karakter Bible Terlibat
                </label>
                <div className="max-h-36 overflow-y-auto border border-neutral-200 rounded-xl p-2.5 space-y-1">
                  {characters.length === 0 ? (
                    <span className="text-[10px] text-neutral-400">Belum ada karakter terdaftar.</span>
                  ) : (
                    characters.map((c) => (
                      <label key={c.id} className="flex items-center space-x-2 text-[11px] text-neutral-600 block cursor-pointer hover:bg-neutral-50 px-1 py-0.5 rounded">
                        <input
                          type="checkbox"
                          checked={selectedCharacters.includes(c.id)}
                          onChange={() => toggleSelectCharacter(c.id)}
                          className="rounded border-neutral-200"
                        />
                        <span className="truncate">{c.name} ({c.role})</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-neutral-50">
              <button
                type="button"
                onClick={() => { setIsAdding(false); setEditingPlotHole(null); }}
                className="px-4 py-2 text-xs font-semibold text-neutral-500 hover:bg-neutral-50 border border-neutral-100 rounded-xl transition cursor-pointer"
              >
                Urungkan
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl transition cursor-pointer"
              >
                Simpan Draft
              </button>
            </div>
          </form>
        </div>
      ) : resolvePlotHole ? (
        /* Resolution Notes Form Mode */
        <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-800">
              Selesaikan / Resolve Isu Plot Hole
            </h4>
            <button
              type="button"
              onClick={() => { setResolvePlotHole(null); setResolutionNotes(''); }}
              className="p-1 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-50 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleResolveSubmit} className="space-y-4">
            <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200/50">
              <span className="text-[10px] font-bold text-neutral-400 tracking-wide uppercase">Isu Plot:</span>
              <p className="text-xs font-semibold text-neutral-800 mt-1">{resolvePlotHole.title}</p>
              <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">{resolvePlotHole.description}</p>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                Catatan Langkah Penyelesaian Penulis
              </label>
              <textarea
                required
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Sejalan dengan bab baru, Cassandra Sterling ternyata diam-diam sudah mendapat ijin khusus... / Mengubah waktu di CH 2 dari jam 6 malam menjadi jam 8 malam."
                rows={3}
                className="w-full text-xs p-3 border border-neutral-200 rounded-xl focus:outline-hidden focus:border-neutral-900 leading-relaxed"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-neutral-50">
              <button
                type="button"
                onClick={() => { setResolvePlotHole(null); setResolutionNotes(''); }}
                className="px-4 py-2 text-xs font-semibold text-neutral-500 hover:bg-neutral-50 border border-neutral-100 rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl transition flex items-center space-x-1 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5 mr-1" />
                <span>Tandai Selesai</span>
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Standard Dashboard rendering plot holes */
        <div className="space-y-3">
          {currentPlotHoles.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 border border-dashed border-neutral-200 rounded-2xl bg-neutral-50/50">
              <Milestone className="w-8 h-8 text-neutral-300 mb-2" />
              <p className="text-xs font-medium text-neutral-400">
                {activeTab === 'open' 
                  ? 'Yay! Belum ada pot isi plot hole terbuka untuk dilacak.' 
                  : 'Belum ada masalah plot hole yang diselesaikan.'}
              </p>
              {activeTab === 'open' && (
                <button
                  type="button"
                  onClick={startAddPlotHole}
                  className="mt-3 px-3 py-1.5 text-[10px] uppercase tracking-wider font-semibold border border-neutral-200 rounded-lg hover:bg-white transition text-neutral-700 bg-neutral-50 cursor-pointer"
                >
                  Catat Plot Hole Pertama
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {currentPlotHoles.map((ph) => {
                let severityColor = 'bg-neutral-100 text-neutral-600';
                if (ph.severity === 'high') severityColor = 'bg-red-50 text-red-700 border-red-100';
                else if (ph.severity === 'medium') severityColor = 'bg-amber-50 text-amber-700 border-amber-100';

                return (
                  <div
                    key={ph.id}
                    className="bg-white border border-neutral-200 rounded-xl p-4 shadow-3xs hover:shadow-xs transition hover:border-neutral-300"
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-1 flex-1 mr-4">
                        <div className="flex items-center space-x-2">
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm border ${severityColor}`}>
                            {ph.severity.toUpperCase()}
                          </span>
                          {ph.detectedByGemini && (
                            <span className="text-[9px] font-bold uppercase tracking-wider bg-violet-50 text-violet-700 px-1.5 py-0.5 rounded-sm border border-violet-100 flex items-center space-x-1">
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>Gemini AI</span>
                            </span>
                          )}
                          <span className="text-[10px] text-neutral-400">
                            Terbuat: {new Date(ph.createdAt).toLocaleDateString('id-ID')}
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-neutral-900 pt-1">
                          {ph.title}
                        </h4>
                      </div>

                      {/* Manual Action Tools */}
                      <div className="flex items-center space-x-1.5 shrink-0">
                        {ph.status === 'open' ? (
                          <button
                            type="button"
                            onClick={() => setResolvePlotHole(ph)}
                            className="p-1.5 bg-green-50 border border-green-300 text-green-700 hover:bg-green-600 hover:text-white rounded-xl transition cursor-pointer shadow-3xs flex items-center justify-center"
                            title="Tandai Selesai"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleReopen(ph)}
                            className="p-1.5 bg-neutral-100 border border-neutral-300 text-neutral-700 hover:bg-neutral-900 hover:text-white rounded-xl transition cursor-pointer shadow-3xs flex items-center justify-center"
                            title="Buka Kembali"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => startEditPlotHole(ph)}
                          className="p-1.5 bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-900 hover:text-white rounded-xl transition cursor-pointer shadow-3xs flex items-center justify-center"
                          title="Edit Catatan"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => confirmDelete(ph.id)}
                          className="p-1.5 bg-red-50 border border-red-300 text-red-700 hover:bg-red-600 hover:text-white rounded-xl transition cursor-pointer shadow-3xs flex items-center justify-center"
                          title="Hapus Catatan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-neutral-600 mt-2 leading-relaxed">
                      {ph.description}
                    </p>

                    {/* Gemini AI Remedial suggestions and advice formatting inside block */}
                    {ph.suggestions && (
                      <div className="bg-neutral-50/50 hover:bg-neutral-50/80 transition rounded-lg border border-neutral-100 p-3 mt-3 space-y-1 text-xs">
                        <span className="font-semibold text-neutral-800 flex items-center space-x-1 font-montserrat tracking-tight">
                          <AlertOctagon className="w-3.5 h-3.5 text-neutral-400" />
                          <span>Saran Analisis Gemini AI:</span>
                        </span>
                        <p className="text-neutral-500 leading-relaxed italic">{ph.suggestions}</p>
                      </div>
                    )}

                    {/* Displays linked elements */}
                    {(ph.chapterIds?.length > 0 || ph.characterIds?.length > 0) && (
                      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-neutral-100 text-[10px]">
                        {ph.chapterIds?.map((cid) => {
                          const name = chapters.find((ch) => ch.id === cid);
                          if (!name) return null;
                          return (
                            <span key={cid} className="bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-md">
                              Chapter: {name.title}
                            </span>
                          );
                        })}
                        {ph.characterIds?.map((cid) => {
                          const name = characters.find((c) => c.id === cid);
                          if (!name) return null;
                          return (
                            <span key={cid} className="bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-md">
                              Karakter: {name.name}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {ph.status === 'resolved' && ph.resolutionNotes && (
                      <div className="mt-3 pt-3 border-t border-neutral-100/80 bg-neutral-50/20 p-2.5 rounded-lg text-xs text-neutral-500">
                        <span className="font-bold text-neutral-800 block">Solusi Penulis:</span>
                        <p className="mt-1 leading-relaxed">{ph.resolutionNotes}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Confirmation of Delete plot hole */}
      <AppConfirmationModal
        isOpen={deletePlotHoleId !== null}
        title="Hapus Catatan Isu Plot Hole"
        message="Isu plot hole yang dihapus tidak akan dapat dipulihkan kembali. Tindakan ini aman dan tidak akan merusak draf cerita naskah Anda. Lanjutkan?"
        onConfirm={executeDelete}
        onCancel={() => setDeletePlotHoleId(null)}
      />
    </div>
  );
}
