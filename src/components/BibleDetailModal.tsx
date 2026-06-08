import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CharacterItem, WorldItem, CharacterAiProfile, WorldAiProfile } from '../types';
import { 
  X, 
  Sparkles, 
  Calendar, 
  Ruler, 
  User, 
  BookOpen, 
  Briefcase, 
  Users, 
  Eye, 
  Brain, 
  Info, 
  RefreshCw,
  Loader2,
  Bookmark,
  Compass,
  Scroll,
  Globe
} from 'lucide-react';

interface BibleDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'character' | 'world';
  character?: CharacterItem;
  worldItem?: WorldItem;
  others?: CharacterItem[];
  onSaveCharacter?: (updated: CharacterItem) => void;
  onSaveWorld?: (updated: WorldItem) => void;
}

export default function BibleDetailModal({
  isOpen,
  onClose,
  type,
  character,
  worldItem,
  others = [],
  onSaveCharacter,
  onSaveWorld,
}: BibleDetailModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derive title 
  const titleName = type === 'character' ? character?.name : worldItem?.name;
  const subtitleCategory = type === 'character' ? character?.role : worldItem?.category;

  // AI Profile states
  const [charProfile, setCharProfile] = useState<CharacterAiProfile | null>(null);
  const [worldProfile, setWorldProfile] = useState<WorldAiProfile | null>(null);

  // Sync state with props
  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (type === 'character' && character) {
        setCharProfile(character.aiProfile || null);
      } else if (type === 'world' && worldItem) {
        setWorldProfile(worldItem.aiProfile || null);
      }
    }
  }, [isOpen, type, character, worldItem]);

  // Call API to generate character AI profile
  const generateCharProfile = async () => {
    if (!character) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/generate-character-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ character, others }),
      });

      let data: any;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const textData = await response.text();
        try {
          data = JSON.parse(textData);
        } catch (e) {
          throw new Error('Gagal memproses respon dari server (Format JSON tidak valid).');
        }
      } else {
        const textError = await response.text();
        const cleanError = textError.includes('<!DOCTYPE') || textError.includes('<!doctype')
          ? `Terjadi kendala teknis (${response.status}). Silakan coba sesaat lagi.`
          : textError || `Server error: ${response.status}`;
        throw new Error(cleanError);
      }

      if (!response.ok) {
        throw new Error(data?.error || 'Server error.');
      }

      setCharProfile(data);
      
      // Persist to parent context
      if (onSaveCharacter) {
        onSaveCharacter({
          ...character,
          aiProfile: data
        });
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Gagal menghasilkan resume AI dari server.');
    } finally {
      setLoading(false);
    }
  };

  // Call API to generate world AI profile
  const generateWorldProfile = async () => {
    if (!worldItem) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/generate-world-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ worldItem }),
      });

      let data: any;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const textData = await response.text();
        try {
          data = JSON.parse(textData);
        } catch (e) {
          throw new Error('Gagal memproses respon dari server (Format JSON tidak valid).');
        }
      } else {
        const textError = await response.text();
        const cleanError = textError.includes('<!DOCTYPE') || textError.includes('<!doctype')
          ? `Terjadi kendala teknis (${response.status}). Silakan coba sesaat lagi.`
          : textError || `Server error: ${response.status}`;
        throw new Error(cleanError);
      }

      if (!response.ok) {
        throw new Error(data?.error || 'Server error.');
      }

      setWorldProfile(data);
      
      // Persist to parent context
      if (onSaveWorld) {
        onSaveWorld({
          ...worldItem,
          aiProfile: data
        });
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Gagal menghasilkan kronik AI dari server.');
    } finally {
      setLoading(false);
    }
  };

  // Auto trigger if not exists
  useEffect(() => {
    if (isOpen) {
      if (type === 'character' && character && !character.aiProfile) {
        generateCharProfile();
      } else if (type === 'world' && worldItem && !worldItem.aiProfile) {
        generateWorldProfile();
      }
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="w-full max-w-2xl bg-white border border-neutral-300 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 bg-neutral-900 text-white rounded-xl">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black font-montserrat uppercase tracking-wider text-neutral-900">
                    Preview & AI Resume
                  </h3>
                  <p className="text-[10px] text-neutral-450 font-sans">
                    Diringkas dan diorganisasi otomatis dengan kecerdasan Gemini AI
                  </p>
                </div>
              </div>

              {/* Icon-Only Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 hover:bg-neutral-900 border border-neutral-300 hover:border-neutral-950 text-neutral-650 hover:text-white rounded-xl transition duration-150 cursor-pointer shadow-3xs"
                title="Tutup Detil"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body / Scrollable Info */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 font-sans">
              {/* Header Card Element Info */}
              <div className="bg-neutral-950 text-white p-4.5 rounded-2xl shadow-sm relative overflow-hidden">
                <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4 font-montserrat text-6xl font-black select-none">
                  {type === 'character' ? 'CHAR' : 'WORLD'}
                </div>
                
                <span className="text-[9px] font-black uppercase tracking-widest bg-white/20 text-white px-2.5 py-1 rounded-md mb-2 inline-block">
                  {subtitleCategory || 'UNASSIGNED'}
                </span>
                <h4 className="text-xl font-bold font-montserrat tracking-tight leading-none text-white">
                  {titleName}
                </h4>
                
                {/* Source details snippet */}
                {type === 'character' && character?.description && (
                  <p className="text-xs text-neutral-300 line-clamp-2 mt-2 leading-relaxed">
                    {character.description}
                  </p>
                )}
                {type === 'world' && worldItem?.description && (
                  <p className="text-xs text-neutral-300 line-clamp-2 mt-2 leading-relaxed">
                    {worldItem.description}
                  </p>
                )}
              </div>

              {/* Status and Error Alerts */}
              {error && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs leading-relaxed space-y-1">
                  <p className="font-bold flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    Terjadi Kendala Teknis
                  </p>
                  <p className="text-neutral-600">{error}</p>
                </div>
              )}

              {/* Main Contents Loader */}
              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-8 h-8 text-neutral-900 animate-spin" />
                  <div className="text-center space-y-1">
                    <p className="text-xs font-semibold text-neutral-700">Menganalisis draf bible...</p>
                    <p className="text-[10px] text-neutral-400">Gemini sedang menstrukturkan karakteristik narasi dan fiksi</p>
                  </div>
                </div>
              ) : (
                <>
                  {type === 'character' && (
                    <div className="space-y-4">
                      {charProfile ? (
                        <>
                          {/* 3-Column Quick Metrics Grid */}
                          <div className="grid grid-cols-3 gap-3">
                            <div className="bg-neutral-50/50 border border-neutral-150 p-3 rounded-xl flex items-center space-x-2.5">
                              <Calendar className="w-4 h-4 text-neutral-500 shrink-0" />
                              <div>
                                <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block leading-none">Usia</span>
                                <span className="text-xs font-bold text-neutral-800">{charProfile.usia}</span>
                              </div>
                            </div>
                            <div className="bg-neutral-50/50 border border-neutral-150 p-3 rounded-xl flex items-center space-x-2.5">
                              <Ruler className="w-4 h-4 text-neutral-500 shrink-0" />
                              <div>
                                <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block leading-none">Tinggi</span>
                                <span className="text-xs font-bold text-neutral-800">{charProfile.tinggi}</span>
                              </div>
                            </div>
                            <div className="bg-neutral-50/50 border border-neutral-150 p-3 rounded-xl flex items-center space-x-2.5">
                              <User className="w-4 h-4 text-neutral-500 shrink-0" />
                              <div>
                                <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block leading-none">Gender</span>
                                <span className="text-xs font-bold text-neutral-800">{charProfile.gender}</span>
                              </div>
                            </div>
                          </div>

                          {/* Detail fields bento grids */}
                          <div className="space-y-3.5">
                            {/* Role / Jabatan */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="border border-neutral-200 p-3.5 rounded-xl bg-white space-y-1 hover:border-neutral-350 transition">
                                <label className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest flex items-center gap-1">
                                  <BookOpen className="w-3.5 h-3.5" /> Peran Narasi
                                </label>
                                <p className="text-xs text-neutral-800 leading-relaxed font-semibold">
                                  {charProfile.peranNarasi}
                                </p>
                              </div>

                              <div className="border border-neutral-200 p-3.5 rounded-xl bg-white space-y-1 hover:border-neutral-350 transition">
                                <label className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest flex items-center gap-1">
                                  <Briefcase className="w-3.5 h-3.5" /> Jabatan / Status Cerita
                                </label>
                                <p className="text-xs text-neutral-800 leading-relaxed font-semibold">
                                  {charProfile.jabatanCerita}
                                </p>
                              </div>
                            </div>

                            {/* Deskripsi Fisik */}
                            <div className="border border-neutral-200 p-4 rounded-xl space-y-1.5 bg-white hover:border-neutral-350 transition">
                              <label className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest flex items-center gap-1">
                                <Eye className="w-3.5 h-3.5" /> Deskripsi Fisik & Visual
                              </label>
                              <p className="text-xs text-neutral-700 leading-relaxed whitespace-pre-wrap">
                                {charProfile.deskripsiFisik}
                              </p>
                            </div>

                            {/* Sifat Karakter */}
                            <div className="border border-neutral-200 p-4 rounded-xl space-y-1.5 bg-white hover:border-neutral-350 transition">
                              <label className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest flex items-center gap-1">
                                <Brain className="w-3.5 h-3.5" /> Sifat Kepribadian & Flaw
                              </label>
                              <p className="text-xs text-neutral-700 leading-relaxed whitespace-pre-wrap">
                                {charProfile.sifatKarakter}
                              </p>
                            </div>

                            {/* Hubungan karakter */}
                            <div className="border border-neutral-200 p-4 rounded-xl space-y-1.5 bg-white hover:border-neutral-350 transition">
                              <label className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest flex items-center gap-1">
                                <Users className="w-3.5 h-3.5" /> Hubungan & Jaringan Relasi
                              </label>
                              <p className="text-xs text-neutral-700 leading-relaxed whitespace-pre-wrap">
                                {charProfile.hubunganKarakter}
                              </p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="p-8 border border-dashed border-neutral-200 rounded-2xl text-center bg-neutral-50/20">
                          <p className="text-xs text-neutral-500 mb-3">Tidak ada resume AI yang disimpan.</p>
                          <button
                            type="button"
                            onClick={generateCharProfile}
                            className="inline-flex items-center space-x-1.5 bg-neutral-900 text-white text-xs px-4 py-2 rounded-xl transition cursor-pointer hover:bg-neutral-800"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                            <span>Mulai Analisis AI Sekarang</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {type === 'world' && (
                    <div className="space-y-4">
                      {worldProfile ? (
                        <div className="space-y-4">
                          {/* Definisi Singkat */}
                          <div className="border border-neutral-200 p-4 rounded-xl bg-white space-y-1.5 hover:border-neutral-350 transition">
                            <label className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest flex items-center gap-1">
                              <Bookmark className="w-3.5 h-3.5" /> Ringkasan Definisi fiksi
                            </label>
                            <p className="text-xs text-neutral-800 leading-relaxed font-medium">
                              {worldProfile.definisi}
                            </p>
                          </div>

                          {/* Cakupan Pengaruh */}
                          <div className="border border-neutral-200 p-4 rounded-xl bg-white space-y-1.5 hover:border-neutral-350 transition">
                            <label className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest flex items-center gap-1">
                              <Compass className="w-3.5 h-3.5" /> Ruang Lingkup & Cakupan Pengaruh
                            </label>
                            <p className="text-xs text-neutral-700 leading-relaxed font-semibold">
                              {worldProfile.cakupan}
                            </p>
                          </div>

                          {/* Aturan utama */}
                          <div className="border border-neutral-200 p-4 rounded-xl bg-white space-y-1.5 hover:border-neutral-350 transition">
                            <label className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest flex items-center gap-1">
                              <Scroll className="w-3.5 h-3.5" /> Aturan Logis & Keterbatasan Hukum Semesta
                            </label>
                            <p className="text-xs text-neutral-700 leading-relaxed whitespace-pre-wrap">
                              {worldProfile.aturanUtama}
                            </p>
                          </div>

                          {/* Sejarah Lore */}
                          <div className="border border-neutral-200 p-4 rounded-xl bg-white space-y-1.5 hover:border-neutral-350 transition">
                            <label className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest flex items-center gap-1">
                              <Globe className="w-3.5 h-3.5" /> Lore Sejarah & Mitologi Kuno
                            </label>
                            <p className="text-xs text-neutral-700 leading-relaxed whitespace-pre-wrap">
                              {worldProfile.sejarah}
                            </p>
                          </div>

                          {/* Implikasi Plot Novel */}
                          <div className="border border-neutral-200 p-4 rounded-xl bg-white space-y-1.5 hover:border-neutral-350 transition">
                            <label className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5" /> Implikasi Terhadap Alur & Konflik Plot
                            </label>
                            <p className="text-xs text-neutral-700 leading-relaxed whitespace-pre-wrap font-medium">
                              {worldProfile.hubunganCerita}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="p-8 border border-dashed border-neutral-200 rounded-2xl text-center bg-neutral-50/20">
                          <p className="text-xs text-neutral-500 mb-3">Tidak ada resume fiksi AI yang disimpan.</p>
                          <button
                            type="button"
                            onClick={generateWorldProfile}
                            className="inline-flex items-center space-x-1.5 bg-neutral-900 text-white text-xs px-4 py-2 rounded-xl transition cursor-pointer hover:bg-neutral-800"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                            <span>Rangkum Dunia Penting dengan AI</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="px-5 py-3 border-t border-neutral-100 flex items-center justify-end bg-neutral-50/50">
              {/* Tutup trigger button */}
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl transition duration-155 cursor-pointer shadow-3xs"
              >
                Tutup Ringkasan
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
