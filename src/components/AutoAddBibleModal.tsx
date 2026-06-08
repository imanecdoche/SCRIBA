import React, { useState } from 'react';
import { Sparkles, X, Loader2 } from 'lucide-react';
import { storage } from '../utils/storage';

interface AutoAddBibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'character' | 'world';
  bulk: boolean;
  projectId: string;
  onRefresh: () => void;
  onDetectSingle?: (data: any) => void;
  triggerAutomaticAiProfile: (item: any, type: 'character' | 'world') => void;
}

export default function AutoAddBibleModal({
  isOpen,
  onClose,
  type,
  bulk,
  projectId,
  onRefresh,
  onDetectSingle,
  triggerAutomaticAiProfile
}: AutoAddBibleModalProps) {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDetect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) {
      setError('Harap isi draf teks terlebih dahulu.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auto-add-bible', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputText,
          type,
          bulk
        }),
      });

      let result: any;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const textData = await response.text();
        try {
          result = JSON.parse(textData);
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
        throw new Error(result?.error || 'Terjadi kesalahan saat memproses data.');
      }

      if (bulk) {
        // Mode Keseluruhan: Detect multiple and save to storage immediately
        const items = result.items || [];
        if (items.length === 0) {
          throw new Error('Sistem AI tidak dapat mengidentifikasi elemen apa pun dari teks yang dimasukkan.');
        }

        if (type === 'character') {
          items.forEach((item: any) => {
            const added = storage.addCharacter(
              projectId,
              item.name || 'Karakter Tanpa Nama',
              item.role || 'Protagonis',
              item.description || '',
              item.backstory || '',
              item.notes || ''
            );
            // Trigger automatic background profile gen
            triggerAutomaticAiProfile(added, 'character');
          });
        } else {
          items.forEach((item: any) => {
            const added = storage.addWorldItem(
              projectId,
              item.name || 'Setting Tanpa Nama',
              item.category || 'Lokasi',
              item.description || '',
              item.notes || ''
            );
            // Trigger automatic background profile gen
            triggerAutomaticAiProfile(added, 'world');
          });
        }
        onRefresh();
        onClose();
        setInputText('');
      } else {
        // Mode Individu: Populate the single-item form
        if (!result.name) {
          throw new Error('Sistem AI tidak dapat mengidentifikasi nama elemen dari teks yang dimasukkan.');
        }
        if (onDetectSingle) {
          onDetectSingle(result);
        }
        onClose();
        setInputText('');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal memproses data via AI.');
    } finally {
      setIsLoading(false);
    }
  };

  const title = bulk 
    ? (type === 'character' ? 'Auto Deteksi & Tambah Banyak Karakter (AI)' : 'Auto Deteksi & Tambah Banyak Aturan Dunia (AI)')
    : (type === 'character' ? 'Deteksi & Isi Karakter otomatis (AI)' : 'Deteksi & Isi Aturan/Setting otomatis (AI)');

  const hint = bulk
    ? `Salin dan tempel semua coretan, draf cerita, atau deskripsi beberapa ${type === 'character' ? 'karakter' : 'aturan/tempat'} di sini. AI akan mendeteksi dan mendaftarkannya satu per satu secara otomatis.`
    : `Salin dan tempel draf atau deskripsi mentah tentang ${type === 'character' ? 'karakter' : 'aturan/tempat'} ini di sini. AI akan mengisi semua kolom form di bawah secara otomatis.`;

  return (
    <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-neutral-100 shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-neutral-100">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-800">{title}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-50 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleDetect} className="flex-1 overflow-y-auto p-6 flex flex-col space-y-4">
          <p className="text-neutral-500 text-[11px] leading-relaxed">
            {hint}
          </p>

          <div className="flex-1 min-h-[160px] flex flex-col space-y-1">
            <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
              Teks / Coretan Mentah Anda
            </label>
            <textarea
              required
              disabled={isLoading}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={type === 'character'
                ? "Contoh:\nCassandra adalah prajurit wanita berumur 24 tahun yang memiliki sifat dingin tapi setia kawan. Dia adalah tangan kanan antagonis Lord Malakor...\n\nJack adalah pemuda ceria berambut perak yang sering melontarkan lelucon..."
                : "Contoh:\nPura Kristal adalah kuil suci di atas awan tempat para pendeta menyembah dewa langit. Hukumnya melarang pertumpahan darah...\n\nSihir Pembiasan Cahaya adalah sub-elemen sihir yang langka..."
              }
              className="flex-1 w-full text-xs p-3.5 border border-neutral-200 rounded-xl focus:outline-hidden focus:border-neutral-900 leading-relaxed font-sans resize-none"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end space-x-2 pt-2 border-t border-neutral-100 shrink-0">
            <button
              type="button"
              disabled={isLoading}
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-neutral-500 hover:bg-neutral-50 border border-neutral-100 rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-80"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menganalisis...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                  <span>Mulai Deteksi AI</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
