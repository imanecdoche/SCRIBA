import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileText, CheckCircle2, Sliders, Eye, BookOpen, Download, User, SlidersHorizontal, Layers, Check } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Project, Chapter } from '../types';
import { storage } from '../utils/storage';

interface ExportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
}

type FontOption = 'serif' | 'sans-serif' | 'monospace';
type PaperColor = 'white' | 'cream' | 'sepia' | 'slate';
type SpacingPreset = 'compact' | 'standard' | 'double';
type AlignmentPreset = 'left' | 'justify';

export default function ExportPdfModal({ isOpen, onClose, project }: ExportPdfModalProps) {
  // Styling settings states
  const [selectedFont, setSelectedFont] = useState<FontOption>('serif');
  const [paperColor, setPaperColor] = useState<PaperColor>('cream');
  const [spacing, setSpacing] = useState<SpacingPreset>('standard');
  const [alignment, setAlignment] = useState<AlignmentPreset>('justify');
  const [fontSize, setFontSize] = useState<number>(11); // Range 9 - 14
  const [includeCover, setIncludeCover] = useState(true);
  const [includeHeader, setIncludeHeader] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  
  // Interactive preview state: Allows user to toggle between previewing 'Cover' or 'Chapter Content'
  const [previewTab, setPreviewTab] = useState<'cover' | 'content'>('cover');

  // Chapters list to export
  const chapters: Chapter[] = storage.getChapters(project.id);

  // Style configurations
  const colorsMap = {
    white: { bg: 'bg-white', text: 'text-neutral-900', border: 'border-neutral-200', hex: '#FFFFFF', textHex: '#111111' },
    cream: { bg: 'bg-[#FCF8F2]', text: 'text-stone-900', border: 'border-stone-200', hex: '#FCF8F2', textHex: '#1C1917' },
    sepia: { bg: 'bg-[#F2E8D5]', text: 'text-amber-950', border: 'border-amber-200', hex: '#F2E8D5', textHex: '#2E1A05' },
    slate: { bg: 'bg-[#F8FAFC]', text: 'text-slate-900', border: 'border-slate-200', hex: '#F8FAFC', textHex: '#0F172A' },
  };

  const fontStyle = {
    serif: 'font-serif tracking-normal',
    'sans-serif': 'font-sans tracking-tight',
    monospace: 'font-mono tracking-wide',
  };

  // Convert font settings to jsPDF core fonts
  const getPdfFontFamily = (opt: FontOption) => {
    switch (opt) {
      case 'serif': return 'times';
      case 'sans-serif': return 'helvetica';
      case 'monospace': return 'courier';
    }
  };

  // Function to execute jspdf export
  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      try {
        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
        });

        const pdfFont = getPdfFontFamily(selectedFont);
        const pageWidth = doc.internal.pageSize.getWidth(); // A4: 210mm
        const pageHeight = doc.internal.pageSize.getHeight(); // A4: 297mm
        const marginLeft = 20;
        const marginRight = 20;
        const printWidth = pageWidth - marginLeft - marginRight;
        const marginTop = 20;
        const marginBottom = 20;

        // Cover page setup
        if (includeCover) {
          // Fill background color
          const rgbHex = colorsMap[paperColor].hex;
          doc.setFillColor(rgbHex);
          doc.rect(0, 0, pageWidth, pageHeight, 'F');

          // Large book title
          doc.setFont(pdfFont, 'bold');
          doc.setFontSize(28);
          doc.setTextColor(colorsMap[paperColor].textHex);
          
          const splitTitle = doc.splitTextToSize(project.title, printWidth);
          let titleY = pageHeight / 2.5;
          splitTitle.forEach((line: string) => {
            doc.text(line, pageWidth / 2, titleY, { align: 'center' });
            titleY += 12;
          });

          // Elegant line separator
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.4);
          doc.line(pageWidth / 4, titleY + 6, (pageWidth * 3) / 4, titleY + 6);

          // Author display
          doc.setFont(pdfFont, 'italic');
          doc.setFontSize(14);
          const authorName = project.author || 'Anonim';
          doc.text(`Ditulis Oleh: ${authorName}`, pageWidth / 2, titleY + 16, { align: 'center' });

          // Genre/Type display near page bottom
          doc.setFont(pdfFont, 'normal');
          doc.setFontSize(10);
          const projectTypeLabel = project.type === 'solo' 
            ? 'Novel Lengkap' 
            : project.type === 'series' 
            ? 'Seri Novel Sekuel' 
            : 'Mini Novel / Novelet';
          doc.text(projectTypeLabel.toUpperCase(), pageWidth / 2, pageHeight - 30, { align: 'center' });

          doc.addPage();
        }

        // Draw Chapters
        let currentY = marginTop + (includeHeader ? 10 : 0);
        const fontColorHex = colorsMap[paperColor].textHex;

        // Custom paragraph spacing & leading based on preset
        let lineSpacingMm = 7;
        let paragraphExtraSpacingMm = 5;
        if (spacing === 'compact') {
          lineSpacingMm = 5.5;
          paragraphExtraSpacingMm = 3;
        } else if (spacing === 'double') {
          lineSpacingMm = 9.5;
          paragraphExtraSpacingMm = 8;
        }

        if (chapters.length === 0) {
          // Empty draft page
          doc.setFillColor(colorsMap[paperColor].hex);
          doc.rect(0, 0, pageWidth, pageHeight, 'F');
          
          doc.setFont(pdfFont, 'italic');
          doc.setFontSize(11);
          doc.setTextColor(colorsMap[paperColor].textHex);
          doc.text('Draf naskah ini belum memiliki chapter atau konten tulisan.', pageWidth / 2, pageHeight / 2, { align: 'center' });
        } else {
          chapters.forEach((ch, idx) => {
            // Draw chapter title
            if (currentY + 30 > pageHeight - marginBottom) {
              doc.addPage();
              currentY = marginTop + (includeHeader ? 10 : 0);
            }

            doc.setFont(pdfFont, 'bold');
            doc.setFontSize(fontSize + 5);
            doc.setTextColor(fontColorHex);
            
            const positionLabel = ch.isProlog ? 'Prolog' : ch.isEpilog ? 'Epilog' : `Chapter ${ch.number}`;
            const fullTitle = `${positionLabel}: ${ch.title}`;
            const splitChapterTitle = doc.splitTextToSize(fullTitle, printWidth);
            
            splitChapterTitle.forEach((line: string) => {
              doc.text(line, marginLeft, currentY);
              currentY += 8;
            });

            currentY += 4; // Spacing after title

            // Print paragraphs
            const textContent = ch.content || 'Draf chapter masih kosong...';
            const paragraphs = textContent.split(/\r?\n\n?/);

            doc.setFont(pdfFont, 'normal');
            doc.setFontSize(fontSize);

            paragraphs.forEach((pText) => {
              if (!pText.trim()) return;

              const cleanText = pText.trim();
              const formattedLine = cleanText;
              
              const lines = doc.splitTextToSize(formattedLine, printWidth);

              lines.forEach((line: string) => {
                if (currentY + 6 > pageHeight - marginBottom) {
                  doc.addPage();
                  currentY = marginTop + (includeHeader ? 10 : 0);
                }
                
                doc.setFont(pdfFont, 'normal');
                doc.setFontSize(fontSize);
                doc.setTextColor(fontColorHex);
                
                doc.text(line, marginLeft, currentY, { 
                  align: alignment === 'justify' ? 'justify' : 'left' 
                });
                currentY += lineSpacingMm;
              });

              currentY += paragraphExtraSpacingMm; // Spacer between paragraphs
            });

            // Chapter break adds a page if it's not the last chapter
            if (idx < chapters.length - 1) {
              doc.addPage();
              currentY = marginTop + (includeHeader ? 10 : 0);
            }
          });
        }

        // Draw headers, backgrounds and page numbers over all pages
        const pagesCount = doc.getNumberOfPages();
        for (let i = 1; i <= pagesCount; i++) {
          doc.setPage(i);
          
          if (i === 1 && includeCover) {
            continue; 
          }
          
          // Header title line
          if (includeHeader && i > 1) {
            doc.setFont(pdfFont, 'italic');
            doc.setFontSize(8.5);
            doc.setTextColor(110, 110, 110);
            doc.text(project.title, pageWidth / 2, marginTop - 10, { align: 'center' });
            
            // Soft line divider
            doc.setDrawColor(210, 210, 210);
            doc.setLineWidth(0.2);
            doc.line(marginLeft, marginTop - 7, pageWidth - marginRight, marginTop - 7);
          }

          // Centered page numbering footer
          const paginationText = includeCover ? (i - 1).toString() : i.toString();
          doc.setFont(pdfFont, 'normal');
          doc.setFontSize(9);
          doc.setTextColor(110, 110, 110);
          doc.text(paginationText, pageWidth / 2, pageHeight - marginBottom + 8, { align: 'center' });
        }

        // Save generated file
        const cleanFileName = project.title.toLowerCase().replace(/[^a-z0-9]/g, '_');
        doc.save(`${cleanFileName}_read_ready_book.pdf`);
      } catch (err) {
        console.error("PDF Export error: ", err);
      } finally {
        setIsExporting(false);
      }
    }, 700);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-55 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full max-w-6xl bg-white border border-neutral-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]"
          >
            {/* Elegant Header */}
            <div className="flex items-center justify-between border-b border-neutral-100 p-4 sm:p-5 bg-neutral-50/70">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-neutral-950 text-white rounded-xl shadow-xs">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold tracking-wider uppercase text-neutral-800 font-montserrat">
                    Export Read-Ready PDF Buku
                  </h3>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Konfigurasi tata letak manuskrip novel Anda dengan gaya cetak profesional dan nyaman dibaca.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 transition cursor-pointer"
                title="Tutup Menu Export"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Split Grid Panel */}
            <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-0">
              {/* Left Column: Form & Control Inputs (5 cols) */}
              <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-neutral-150 p-4 sm:p-5 overflow-y-auto space-y-5 bg-white scrollbar-thin">
                
                {/* 1. Author Metadata Widget */}
                <div className="space-y-2 p-4 bg-neutral-50/50 border border-neutral-150 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex items-center space-x-1.5">
                      <User className="w-3.5 h-3.5" />
                      <span>IDENTITAS PENULIS</span>
                    </span>
                    <span className="text-[8px] bg-neutral-950 text-white px-2 py-0.5 rounded-md font-bold uppercase tracking-widest scale-90">
                      Sinkron
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <input
                      type="text"
                      value={project.author || ''}
                      placeholder="Masukkan nama pena (contoh: Tere Liye, Dee Lestari)"
                      className="w-full text-xs px-3.5 py-2.5 border border-neutral-200 bg-white rounded-xl focus:outline-hidden focus:border-neutral-950 focus:ring-1 focus:ring-neutral-900 shadow-3xs transition"
                      onChange={(e) => {
                        const val = e.target.value;
                        storage.updateProject({
                          ...project,
                          author: val
                        });
                        // Dispatch event so that underlying view updates smoothly
                        window.dispatchEvent(new Event('project-list-updated'));
                      }}
                    />
                    <p className="text-[9px] text-neutral-400">
                      Nama ini akan dicetak di halaman sampul utama PDF dan disimpan di workspace.
                    </p>
                  </div>
                </div>

                {/* 2. Typography Custom Selection */}
                <div className="space-y-2.5">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex items-center space-x-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Gaya Tipografi Kertas (Font)</span>
                  </span>
                  
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'serif', name: 'Times Serif', sample: 'Times New Roman', desc: 'Sastra & Fiksi Klasik' },
                      { id: 'sans-serif', name: 'Modern Sans', sample: 'Helvetica-Style', desc: 'Minimalis & Bersih' },
                      { id: 'monospace', name: 'Typewriter', sample: 'Courier Mono', desc: 'Rancangan Draf Klasik' },
                    ].map((fo) => (
                      <button
                        key={fo.id}
                        type="button"
                        onClick={() => setSelectedFont(fo.id as FontOption)}
                        className={`p-3 border rounded-xl text-left transition cursor-pointer flex flex-col justify-between h-[84px] ${
                          selectedFont === fo.id
                            ? 'border-neutral-950 bg-neutral-950 text-white shadow-sm'
                            : 'border-neutral-200 bg-white hover:border-neutral-350 text-neutral-800'
                        }`}
                      >
                        <span className={`text-sm font-bold ${fo.id === 'serif' ? 'font-serif' : fo.id === 'sans-serif' ? 'font-sans' : 'font-mono'}`}>
                          Aa
                        </span>
                        <div>
                          <p className="text-[10px] font-bold leading-tight">{fo.name}</p>
                          <p className={`text-[8px] leading-tight ${selectedFont === fo.id ? 'text-neutral-300' : 'text-neutral-400'}`}>
                            {fo.desc}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Spacing & Font Size Layout Parameter */}
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                      Ukuran Huruf & Tinggi Baris
                    </span>
                    <span className="text-[10px] font-mono text-neutral-600 font-bold">
                      {fontSize}pt / Spasi {spacing === 'compact' ? 'Rapat' : spacing === 'double' ? 'Ganda' : 'Standar'}
                    </span>
                  </div>

                  {/* Size slider */}
                  <div className="p-3 bg-neutral-50/60 rounded-xl border border-neutral-150 space-y-2">
                    <div className="flex justify-between text-[9px] text-neutral-400 font-bold uppercase tracking-wider">
                      <span>Kecil (9pt)</span>
                      <span>Sedang (11pt)</span>
                      <span>Besar (14pt)</span>
                    </div>
                    <input
                      type="range"
                      min="9"
                      max="14"
                      step="1"
                      value={fontSize}
                      onChange={(e) => setFontSize(parseInt(e.target.value))}
                      className="w-full h-1 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-neutral-950"
                    />
                  </div>

                  {/* Heights Selection buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'compact', name: 'Rapat (1.15)', desc: 'Padat & Ekonomis' },
                      { id: 'standard', name: 'Nyaman (1.50)', desc: 'Publikasi Novel' },
                      { id: 'double', name: 'Ganda (2.00)', desc: 'Ulasan Naskah' },
                    ].map((sp) => (
                      <button
                        key={sp.id}
                        type="button"
                        onClick={() => setSpacing(sp.id as SpacingPreset)}
                        className={`p-2.5 border rounded-xl text-left transition cursor-pointer flex flex-col justify-between h-[70px] ${
                          spacing === sp.id
                            ? 'border-neutral-950 bg-neutral-50/50 focus:ring-1 focus:ring-neutral-950'
                            : 'border-neutral-200 bg-white hover:border-neutral-350'
                        }`}
                      >
                        <div className="flex flex-col space-y-0.5 py-0.5">
                          <div className="h-0.5 bg-neutral-400 w-6" />
                          <div className={`h-0.5 bg-neutral-400 w-6 ${sp.id === 'compact' ? 'mt-0.5' : sp.id === 'standard' ? 'mt-1' : 'mt-1.5'}`} />
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-neutral-850">{sp.name}</p>
                          <p className="text-[8px] text-neutral-400">{sp.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Color theme / Paper simulation */}
                <div className="space-y-2.5">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                    Warna Latar Kertas Pratinjau
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'white', name: 'Hvs Putih', bg: 'bg-white', text: '#FFFFFF' },
                      { id: 'cream', name: 'Kertas Novel', bg: 'bg-[#FCF8F2]', text: '#FCF8F2' },
                      { id: 'sepia', name: 'Kertas Klasik', bg: 'bg-[#F2E8D5]', text: '#F2E8D5' },
                      { id: 'slate', name: 'Slate Gray', bg: 'bg-[#F8FAFC]', text: '#F8FAFC' },
                    ].map((pap) => (
                      <button
                        key={pap.id}
                        type="button"
                        onClick={() => setPaperColor(pap.id as PaperColor)}
                        className={`p-2.5 border rounded-xl transition cursor-pointer flex flex-col items-center text-center space-y-2 ${
                          paperColor === pap.id
                            ? 'border-neutral-950 bg-neutral-50/40 font-bold'
                            : 'border-neutral-200 bg-white hover:border-neutral-300'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-full ${pap.bg} border border-neutral-300/80 shadow-3xs relative flex items-center justify-center`}>
                          {paperColor === pap.id && <Check className="w-3.5 h-3.5 text-neutral-800" />}
                        </div>
                        <span className="text-[9px] font-semibold text-neutral-700 leading-none">{pap.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 5. Logical Document switches */}
                <div className="space-y-2.5">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex items-center space-x-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Struktur & Layouting Halaman</span>
                  </span>
                  
                  <div className="space-y-2">
                    <label className="flex items-center space-x-3 p-3 border border-neutral-150 rounded-xl hover:bg-neutral-50/50 cursor-pointer transition">
                      <input
                        type="checkbox"
                        checked={includeCover}
                        onChange={(e) => setIncludeCover(e.target.checked)}
                        className="rounded-md border-neutral-250 focus:ring-neutral-950 w-4 h-4"
                      />
                      <div className="space-y-0.5">
                        <p className="font-bold text-neutral-800 text-[11px]">Halaman Sampul Depan (Cover Page)</p>
                        <p className="text-[9px] text-neutral-400">Judul besar di tengah, rincian buku & nama author.</p>
                      </div>
                    </label>

                    <label className="flex items-center space-x-3 p-3 border border-neutral-150 rounded-xl hover:bg-neutral-50/55 cursor-pointer transition">
                      <input
                        type="checkbox"
                        checked={includeHeader}
                        onChange={(e) => setIncludeHeader(e.target.checked)}
                        className="rounded-md border-neutral-250 focus:ring-neutral-950 w-4 h-4"
                      />
                      <div className="space-y-0.5">
                        <p className="font-bold text-neutral-800 text-[11px]">Gunakan Running Header</p>
                        <p className="text-[9px] text-neutral-400">Menampilkan judul tipis di atas tiap halaman & garis pembatas.</p>
                      </div>
                    </label>

                    <div className="flex items-center justify-between p-3 border border-neutral-150 rounded-xl bg-neutral-50/25">
                      <div className="space-y-0.5">
                        <p className="font-bold text-neutral-800 text-[11px]">Format Penataan Paragraf</p>
                        <p className="text-[9px] text-neutral-400">Align perataan draf tulisan di PDF</p>
                      </div>
                      <div className="flex bg-neutral-200/80 p-0.5 rounded-lg border border-neutral-300">
                        <button
                          type="button"
                          onClick={() => setAlignment('left')}
                          className={`px-3 py-1 text-[9px] font-bold rounded-md uppercase tracking-wider cursor-pointer transition ${
                            alignment === 'left' ? 'bg-white shadow-3xs text-neutral-900 border border-neutral-250/20' : 'text-neutral-500 hover:text-neutral-900'
                          }`}
                        >
                          Rata Kiri
                        </button>
                        <button
                          type="button"
                          onClick={() => setAlignment('justify')}
                          className={`px-3 py-1 text-[9px] font-bold rounded-md uppercase tracking-wider cursor-pointer transition ${
                            alignment === 'justify' ? 'bg-white shadow-3xs text-neutral-900 border border-neutral-250/20' : 'text-neutral-500 hover:text-neutral-900'
                          }`}
                        >
                          Justify
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Column: Dynamic Live Preview Sheet (7 cols) */}
              <div className="lg:col-span-7 bg-neutral-100 p-4 sm:p-5 flex flex-col items-center justify-between min-h-[450px] lg:min-h-0 relative">
                
                {/* Preview Controls on Top bar */}
                <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2 pb-3.5 z-10">
                  <div className="flex items-center space-x-1.5 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                    <Eye className="w-4 h-4" />
                    <span>Pratinjau Kertas Komposisi</span>
                  </div>

                  {/* Interactive toggle for Cover vs Chapter contents draft */}
                  <div className="flex bg-white border border-neutral-200 p-0.5 rounded-xl shadow-3xs max-w-xs">
                    <button
                      type="button"
                      disabled={!includeCover}
                      onClick={() => setPreviewTab('cover')}
                      className={`px-3 py-1.5 text-[10px] font-bold rounded-lg uppercase tracking-wider transition cursor-pointer disabled:opacity-40 ${
                        previewTab === 'cover' && includeCover
                          ? 'bg-neutral-950 text-white shadow-xs' 
                          : 'text-neutral-500 hover:text-neutral-850'
                      }`}
                    >
                      Halaman Sampul
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTab('content')}
                      className={`px-3 py-1.5 text-[10px] font-bold rounded-lg uppercase tracking-wider transition cursor-pointer ${
                        previewTab === 'content' || !includeCover
                          ? 'bg-neutral-950 text-white shadow-xs' 
                          : 'text-neutral-500 hover:text-neutral-850'
                      }`}
                    >
                      Halaman Isi Naskah
                    </button>
                  </div>
                </div>

                {/* Animated Mock Sheet Paper Frame */}
                <div className="flex-1 w-full flex items-center justify-center py-2">
                  <motion.div 
                    layout
                    className={`w-full max-w-sm aspect-[1/1.41] shadow-2xl rounded-sm p-7 sm:p-9 flex flex-col justify-between transition-all duration-300 ${colorsMap[paperColor].bg} ${colorsMap[paperColor].text}`}
                    style={{ fontSize: `${fontSize}px` }}
                  >
                    <div className="space-y-4">
                      {/* Simulated Running Header for Content Tab */}
                      {includeHeader && (previewTab === 'content' || !includeCover) && (
                        <div className="flex flex-col space-y-1 pb-1 border-b border-neutral-300 text-center opacity-70 shrink-0 select-none">
                          <span className="text-[8px] tracking-wider uppercase font-bold truncate px-6">
                            {project.title}
                          </span>
                        </div>
                      )}

                      {/* Cover Design render inside Mock Paper */}
                      {includeCover && previewTab === 'cover' ? (
                        <div className="py-14 sm:py-20 flex flex-col items-center justify-center text-center space-y-6 h-full select-none">
                          <div className="space-y-2">
                            <h1 className={`text-base sm:text-lg font-bold tracking-tight text-balance leading-snug line-clamp-3 ${fontStyle[selectedFont]}`}>
                              {project.title}
                            </h1>
                            <div className="w-12 h-0.5 bg-neutral-400 mx-auto" />
                          </div>
                          <span className={`text-[11px] italic text-neutral-600 block ${fontStyle[selectedFont]}`}>
                            Ditulis Oleh: <strong className="font-semibold text-neutral-900 not-italic">{project.author || 'Pena Jurnalis'}</strong>
                          </span>
                          
                          <div className="pt-8 text-[8px] font-mono tracking-widest text-neutral-400 block uppercase">
                            FORMAT: {project.type === 'solo' ? 'NOVEL TUNGGAL' : project.type === 'series' ? 'SERI SEKUEL' : 'NOVELETTE'}
                          </div>
                        </div>
                      ) : (
                        // Content Pages render inside Mock Paper
                        <div className="space-y-3 pt-1 select-none">
                          <h2 className={`text-xs sm:text-sm font-bold border-b border-neutral-200 pb-1.5 ${fontStyle[selectedFont]}`}>
                            {chapters.length > 0 
                              ? `${chapters[0].isProlog ? 'Prolog' : `Chapter 1`}: ${chapters[0].title}`
                              : 'Chapter 1: Judul Chapter Anda'
                            }
                          </h2>
                          
                          <div className={`text-[10px] select-none leading-relaxed text-justify space-y-3 ${fontStyle[selectedFont]} ${
                            spacing === 'compact' ? 'space-y-2.5 leading-snug' : spacing === 'double' ? 'space-y-4.5 leading-loose' : 'space-y-3 leading-relaxed'
                          }`}>
                            <p className="indent-4 leading-relaxed text-justify">
                              {chapters[0]?.content 
                                ? chapters[0].content.slice(0, 310) + '...'
                                : 'Udara dingin malam itu menusuk tulang ketika pemuda berbaju hitam menginjakkan kakinya di jembatan kastil kuno Gransyre. Di balik bayangan kabut, terdengar suara gemerisik daun purba yang menceritakan takdir terlupakan masa lalu kisah pahlawan...'
                              }
                            </p>
                            <p className="indent-4 leading-relaxed text-justify">
                              Langkah kakinya tegas dan konstan. Tidak ada ketakutan tersirat di wajahnya yang bersisik tipis, hanya sebuah tekad yang membara laksana lentera di dalam nisan dada yang dingin laksana salju abadi...
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Centered page numbering footer inside Mock Paper */}
                    <div className="text-center text-[8px] font-mono text-neutral-400 shrink-0 opacity-80 pt-4">
                      {includeCover && previewTab === 'cover' ? "Halaman 1 (Cover)" : includeCover ? "Halaman 2 (Isi)" : "Halaman 1 (Isi)"}
                    </div>
                  </motion.div>
                </div>

                {/* Subtle hints for paper margins & layout */}
                <div className="flex items-center space-x-1 text-[9px] text-neutral-400 select-none pt-1">
                  <span>Margin PDF: 20mm (Kiri-Kanan-Atas-Bawah) | Cetak ukuran A4 Potret standar</span>
                </div>
              </div>
            </div>

            {/* Bottom Panel Actions Footer */}
            <div className="border-t border-neutral-150 p-4 bg-neutral-50/70 flex flex-col sm:flex-row gap-3 items-center justify-between text-xs">
              <div className="flex items-center space-x-2 text-neutral-500 text-[11px]">
                <BookOpen className="w-4 h-4 text-neutral-400" />
                <span>
                  <strong>{chapters.length} Chapter</strong> draf tulisan terdeteksi untuk dikompilasi ke format cetak PDF.
                </span>
              </div>
              
              <div className="flex space-x-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-bold uppercase text-neutral-500 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 hover:text-neutral-850 shadow-3xs cursor-pointer transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={isExporting}
                  className="flex-1 sm:flex-none px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-neutral-950 hover:bg-neutral-900 rounded-xl shadow-xs hover:shadow-md transition-all duration-150 inline-flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  {isExporting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/55 border-t-white rounded-full animate-spin" />
                      <span>Menyusun Dokumen PDF...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Unduh PDF Naskah</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
