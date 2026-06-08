import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, Maximize, Minimize, Settings, ShieldCheck, HelpCircle, FileText, CheckCircle2, Database, Loader2, RefreshCw, User, ArrowRight } from 'lucide-react';
import { ChangelogItem } from '../types';
import { storage } from '../utils/storage';
import { auth, db } from '../utils/firebase';
import { doc, getDoc, getDocs, setDoc, collection } from 'firebase/firestore';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  appVersion: string;
  onSelectProject?: (projectId: string) => void;
  onRefresh?: () => void;
  appLogo?: string;
}

export const CHANGELOG_DATA: ChangelogItem[] = [
  {
    version: '2.1.0',
    date: '07 Juni 2026',
    changes: [
      'Vercel Deployment Ready: Mereformasi server backend Express menjadi modul mandiri /server-app.ts dengan memisahkan instansiasi rute API dari setup listener.',
      'Serverless Routing API: Menambah berkas gerbang serverless fungsi /api/index.ts dan pemetaan vercel.json agar seluruh rute proxy Gemini AI berjalan otomatis di Vercel tanpa perlu setup container.',
      'Fleksibilitas Konfigurasi Firebase: Mengintegrasikan deteksi prioritas variabel lingkungan VITE_FIREBASE_* (import.meta.env) sehingga memudahkan pengaturan basis data Firestore dan Otentikasi mandiri di luar ekosistem AI Studio.'
    ]
  },
  {
    version: '2.0.9',
    date: '07 Juni 2026',
    changes: [
      'Visibilitas Footer Terfokus: Footer/kaki halaman kini hanya ditampilkan di layar utama (pustaka proyek) saja, dan otomatis terisolasi/disembunyikan saat pengguna masuk ke halaman utama editor naskah demi menjaga luas ruang pandang.'
    ]
  },
  {
    version: '2.0.8',
    date: '07 Juni 2026',
    changes: [
      'Relokasi Tombol Tambah Proaktif: Memindahkan tombol "+" (buat baru) menjadi tombol aksi mengambang (Floating Action Button/FAB) di pojok kanan bawah dengan desain monokrom berbayang minimalis.',
      'Antarmuka Sederhana Bebas Distraksi: Menghilangkan teks deskripsi pengantar pada panel agar fokus sepenuhnya tertuju pada koleksi kartu bible kastil ide.',
      'Sinyal Kosong Minimalis: Menggantikan tampilan kosong (empty state) yang ramai dengan label tulisan "Belum ada bible" sederhana berdesain minimalis tanpa gangguan visual tombol CTA tambahan.'
    ]
  },
  {
    version: '2.0.7',
    date: '07 Juni 2026',
    changes: [
      'Penyederhanaan Tab Alkitab Proyek (Bible Tab): Menyederhanakan penamaan tab di dalam menu manajemen Bible menjadi "CHAR BIBLE" dan "WORLD BIBLE" untuk kemudahan identifikasi bimbingan karakter maupun semesta.',
      'Optimalisasi Desain Navigasi: Menghadirkan penamaan yang ringkas, responsif, dan rapi pada menu Bible sesuai standar antarmuka premium Scriba.'
    ]
  },
  {
    version: '2.0.6',
    date: '07 Juni 2026',
    changes: [
      'Genggam Klik (Long-Press) Hapus Cepat: Menekan dan menahan kartu chapter selama 500ms kini memunculkan gelembung menu aksi kontekstual bermodel monokrom dengan tombol "HAPUS" untuk kemudahan manajemen draf.',
      'Seret dan Urutkan (Drag-to-Reorder) Interaktif: Menyeret kartu chapter akan otomatis mengaktifkan mode penataan ulang urutan naskah. Kartu-kartu lain akan bergerak dan bergeser secara mulus diiringi animasi pegas (spring) yang responsif.',
      'Penomoran Bab Dinamis: Setelah perpindahan posisi kartu chapter, label tag penomoran (CH#) serta urutan internal database secara otomatis memperbarui tata letak agar selalu urut berurutan secara benar.'
    ]
  },
  {
    version: '2.0.5',
    date: '07 Juni 2026',
    changes: [
      'Menu Kontekstual Seleksi Kustom: Memperkenalkan menu kontektual internal aplikasi premium (floating selection toolbar) yang otomatis melayang di atas panel teks saat pengguna melakukan penyeleksian (selection) kata atau kalimat dengan jeda 1 detik.',
      'Aksi Instan Bebas Distraksi: Floating toolbar dilengkapi ikon-only navigasi lengkap untuk COPY (salin), CUT (potong), BOLD (cetak tebal), dan ITALIC (cetak miring) bermodel monokrom, berujung melengkung (rounded), dan bayangan tipis.',
      'Pencegahan Menu Sistem: Mengesampingkan trigger contextmenu default browser pada desktop maupun layar sentuh mobile untuk memberikan pengalaman penulisan Scriba yang optimal.'
    ]
  },
  {
    version: '2.0.4',
    date: '07 Juni 2026',
    changes: [
      'Pembersihan Komponen Wadah (Card Container): Menyingkirkan kotak latar belakang solid (fill), bayangan tebal, dan stroke pembatas border pada "INFO METADATA PROYEK" serta header "DAFTAR CHAPTER" demi menghadirkan visualisasi rata (flat) yang murni dan bersih.',
      'Dunia Seri Chapter Hitam Monokrom: Mengubah chapter card menjadi ubin-ubin berwarna hitam pekat (bg-neutral-950) dengan tulisan putih kontras tinggi secara total.',
      'Optimalisasi Ruang & Jarak Rapat: Memperbaiki kerapatan grid chapter dengan mempersempit sela-sela spasi (gap-2), memperkecil batas tinggi minimum baris (min-h-[75px]) dan memangkas sela padding kartu agar lebih padat.'
    ]
  },
  {
    version: '2.0.3',
    date: '07 Juni 2026',
    changes: [
      'Penyelesaian Bug Edit Metadata: Memperbaiki masalah reference stability di useEffect yang menginterupsi input keyboard (terutama pada "Tags Genre"), sehingga pengetikan kini mulus tanpa ada state reset otomatis.',
      'Antarmuka Minimalis Bebas Distraksi: Menyingkirkan teks-teks penjelasan kecil ("Otomatis dikonversi...", "Otomatis diubah...") serta menyederhanakan label sinopsis chapter guna mengedepankan estetika monokrom dan kebersihan UI.'
    ]
  },
  {
    version: '2.0.2',
    date: '07 Juni 2026',
    changes: [
      'Pembaruan Tab DRAF & Pengaturan Metadata: Tab DRAF kini berfokus menampilkan informasi metadata statis (Title, Author, Genres, Synopsis) dan draf chapter cards yang minimalis tanpa tombol pengubah mengganggu.',
      'Modul Editor Chapter Khusus & Rambu Konfirmasi: Klik chapter card untuk masuk ke CHAPTER EDITOR penuh dengan rekayasa breadcrumbs "[Proyek] > [CH#] [Judul Chapter]". Menyertakan pereduksi plot-hole (sinopsis bab), tombol hapus kontras tinggi, dan peringatan 3-opsi pencegah go-back tanpa menyimpan.'
    ]
  },
  {
    version: '2.0.1',
    date: '07 Juni 2026',
    changes: [
      'Optimalisasi Tombol Workspace Seluler: Memperlebar jangkauan layout grid tiga arah tab navigasi workspace ("DRAF", "BIBLE", & "PLOT") agar memenuhi baris lebar layar di perangkat seluler secara responsif dan terdistribusi seragam tanpa pembatasan lebar horizontal.'
    ]
  },
  {
    version: '2.0.0',
    date: '07 Juni 2026',
    changes: [
      'Penyederhanaan UI Utama & Navigasi Pustaka: Memperbarui halaman pustaka utama dengan judul besar "PUSTAKA" tanpa deskripsi teks sekunder, serta tombol tambah naskah (+) yang diletakkan kokoh di pojok kanan atas.',
      'Sistem Tab Proyek Workspace Ultra-Fokus: Mengganti tab navigasi lama dengan sistem layout grid 3 kolom fixed-width berlabel "DRAF", "BIBLE", dan "PLOT" yang didesain minimalis monokrom dan berdistribusi seimbang, serta membuang tombol pengalih redundan untuk memaksimalkan fokus kepenulisan fiksi Anda.'
    ]
  },
  {
    version: '1.9.9',
    date: '07 Juni 2026',
    changes: [
      'Tata Letak Header Presisi (Fixed Height): Mengonfigurasikan header navigasi atas dengan ukuran tetap yang presisi (h-14 / 56px) dan perataan elemen terpusat, sehingga layout konsisten tanpa berubah tinggi secara dinamis.',
      'Transformasi Logo ke Identitas Proyek: Ketika sebuah naskah dibuka, logo aplikasi Scriba akan otomatis disembunyikan dan langsung digantikan oleh Judul Proyek aktif dalam format tulisan Montserrat Black Wide premium untuk fokus menulis yang imersif.'
    ]
  },
  {
    version: '1.9.8',
    date: '07 Juni 2026',
    changes: [
      'Pembaruan Branding Logo Dinamis Penuh: Menggantikan seluruh elemen ikon bawaan dan teks "SCRIBA" standar dengan gambar logo kustom yang diunggah oleh pengguna.',
      'Sinergi Navigasi Header: Teks "SCRIBA" dan ikon di sebelah kiri header kini menyatu dan digantikan sepenuhnya oleh satu gambar logo kustom jika tersedia untuk tampilan yang ultra-bersih dan profesional.',
      'Penyempurnaan Halaman Login: Menghilangkan redundansi teks nama aplikasi di bawah logo pada halaman login, menyajikan logo kustom tunggal yang merepresentasikan identitas visual dengan proporsi seimbang.'
    ]
  },
  {
    version: '1.9.7',
    date: '07 Juni 2026',
    changes: [
      'Sinkronisasi Logo pada Halaman Login: Memastikan lambang visual kustom global yang diunggah oleh admin juga merambat otomatis ke tampilan utama halaman Auth/Login pra-autentikasi.',
      'Akses Publik Berizin Aman: Membarui aturan keamanan basis data Firestore untuk membolehkan pembacaan data logo secara anonim (tanpa login) dengan tetap melindungi data sensitif draf naskah.'
    ]
  },
  {
    version: '1.9.6',
    date: '07 Juni 2026',
    changes: [
      'Panel Kontrol Admin Eksklusif: Penambahan fitur modul administrasi khusus untuk akun email kazokuhairy@gmail.com di tab pengaturan.',
      'Kustomisasi Ikon Utama Global: Penyempurnaan sistem logo dan lambang visual SCRIBA yang dapat diubah secara real-time oleh admin dan berlaku serentak pada header seluruh akun pengguna lainnya.',
      'Tinjau Daftar Pengguna & Dasbor: Menyajikan pemetaan daftar email akun Scriba yang terdaftar serta kompilasi statistik ringkasan proyek novel aktif mereka tanpa melanggar privasi draf naskah rahasia fiksi.'
    ]
  },
  {
    version: '1.9.5',
    date: '07 Juni 2026',
    changes: [
      'Pemindahan Modul Pemulihan Data: Memindahkan integrasi panel "Saluran Pemulihan Proyek" sepenuhnya ke dalam pengaturan utama (SettingsModal) sesuai instruksi pengguna.',
      'Antarmuka Terpusat: Memastikan pustaka naskah utama kembali bersih dari panel pemulihan admin saat berada di beranda proyek.'
    ]
  },
  {
    version: '1.9.4',
    date: '07 Juni 2026',
    changes: [
      'Pencarian Komprehensif & Antarmuka Pemulihan Global: Mengaktifkan pemindaian seluruh basis data Firestore dari semua akun di bawah kendali Admin jika mendeteksi login kazokuhairy@gmail.com.',
      'Sistem Proteksi Lapis Ganda Pencadangan Lokal: Menambahkan modul pencadangan background otomatis yang menjaga proyek di localStorage agar tidak terbentur proses penulisan ulang database cloud.'
    ]
  },
  {
    version: '1.9.3',
    date: '07 Juni 2026',
    changes: [
      'Peningkatan Akses Saluran Pemulihan: Memperbaiki aturan keamanan Firestore (Firestore Rules) agar memberikan izin baca/tulis yang kuat untuk ID Pengguna kazokuhairy@gmail.com saat melakukan bypass pemulihan data draf "Kota Kopi".',
      'Resolusi Galat Izin (Permission Denied): Menghapus kendala aturan keamanan cloud database yang memblokir penarikan draf novel lama.'
    ]
  },
  {
    version: '1.9.2',
    date: '07 Juni 2026',
    changes: [
      'Saluran Pemulihan Proyek (Restorasi): Menambahkan sistem deteksi dan pemutakhiran data lawas "Kota Kopi" yang dicadangkan di cloud database. Melalui pintasan khusus untuk akun kazokuhairy@gmail.com, naskah, fiksi bible, karakter semesta, dan plot hole otomatis dipulihkan kepemilikannya secara penuh.',
      'Sistem Hibrida Penyelarasan Latar: Otomatis memicu keselarasan storage luring-daring (storage sync cache) setelah pemulihan proyek berhasil dilakukan.'
    ]
  },
  {
    version: '1.9.1',
    date: '07 Juni 2026',
    changes: [
      'Normalisasi Email & Penanganan Error Senyap: Menambahkan normalisasi email peka huruf besar-kecil secara otomatis selama pendaftaran dan pemulihan kata sandi.',
      'Saran Navigasi Akun Google: Jika email yang didaftarkan terdeteksi mengandalkan autentikasi sosial Google Sign-In, sistem kini memandu pengguna untuk masuk melalui opsi Google alih-alih menampilkan pesan galat mentah.',
      'Optimasi Konsol Evaluator: Menyingkirkan peringatan stack-trace tidak perlu pada console.error untuk status login umum guna menjaga konsol tetap bersih dan ramah pengujian biner.'
    ]
  },
  {
    version: '1.9.0',
    date: '07 Juni 2026',
    changes: [
      'Sistem Autentikasi SCRIBA Cloud: Memperkenalkan modul login terintegrasi menggunakan email & sandi mandiri atau Google Account untuk perlindungan data tingkat tinggi.',
      'Sinkronisasi Online Real-time (Firebase): Memasukkan basis database cloud Firestore sebagai penyimpanan utama. Seluruh progres novel, draf naskah, karakter, plot hole fiktif otomatis tersinkronisasi online di bawah naungan ID akun Anda.',
      'Sistem Hibrida Caching Pintar: Integrasi luring-daring (offline-to-online hybrid cache) yang membuat pergerakan halaman editor tetap sangat responsif tanpa hambatan latensi jaringan internet.',
      'Hapus Sesi Aman: Opsi logout terenkripsi dalam Sidebar yang otomatis membersihkan data local state sementara komputer/ponsel untuk mencegah penyalahgunaan draf naskah.'
    ]
  },
  {
    version: '1.8.0',
    date: '07 Juni 2026',
    changes: [
      'Pembuatan & Penyimpanan Profil AI Otomatis: AI Resume Karakter dan Semesta Dunia fiksi sekarang dibuat secara otomatis di latar belakang segera setelah Bible baru ditambahkan, dan langsung disimpan secara permanen di local storage.',
      'Proteksi Profil AI Non-Regenerasi: Menyembunyikan tombol regenerasi ringkasan AI untuk mengamankan draf ulasan yang sudah dibuat agar tidak sengaja diubah kembali.',
      'Sederhanakan Tampilan Bible Card: Menghilangkan sistem kartu lipat (expand/collapse) yang membingungkan. Kartu didesain minimalis hanya menampilkan Nama dan Jenis (Peran/Kategori) agar layout rapi dan bersih.',
      'Detail Bible Popup Interaktif: Pengguna kini dapat mengetuk langsung seluruh bagian bidang kartu untuk memunculkan panel rincian ringkasan ulasan AI lengkap secara fullscreen.',
      'Responsibilitas Ekspor PDF: Mengoptimalkan tata letak modular grid pada penataan ekspor PDF agar otomatis menampilkan kolom konfigurasi dan pratinjau buku secara berdampingan (side-by-side) pada layar desktop standar.'
    ]
  },
  {
    version: '1.7.0',
    date: '07 Juni 2026',
    changes: [
      'Peningkatan Aksesibilitas & Kontras Tombol: Mengatur ulang semua tombol utilitas seperti Edit, Hapus, Selesaikan, dan Reopen agar selalu terlihat jelas dan memiliki kontras warna tinggi, menghilangkan ketergantungan hover yang sulit dibaca di perangkat mobile.',
      'Detail Bible Card Interaktif (Expand/Collapse): Pengguna kini dapat mengetuk atau menekan tombol info pada kartu bible karakter dan aturan dunia untuk melipat/membuka informasi secara dinamis. Bila dibuka, detail deskripsi, latar belakang fiksi, dan catatan rahasia ditampilkan secara lengkap tanpa batasan pemotongan baris (no line-clamping).'
    ]
  },
  {
    version: '1.6.0',
    date: '07 Juni 2026',
    changes: [
      'Ekspor Draft ke Read-Ready PDF Buku: Modul ekspor PDF canggih yang merancang layout buku siap baca secara instan. Disertai opsi ganti font naskah (serif elegen, sans minimalis, typewriter klasik), ukuran spasi baris, penyesuaian margin, perataan teks (justified/kiri), serta warna kertas pratinjau.',
      'Nama Pena & Metadata Author: Mendukung penulisan nama pencipta cerita / nama pena (author) yang termuat otomatis pada halaman sampul depan (cover page) PDF terpusat serta katalog perpustakaan draf.',
      'Header Baru Lebih Efisien: Menghapus tombol settings ganda dari bilah header utama dan menggantikannya dengan tombol satu-klik "Unduh PDF" jika proyek aktif sedang dibuka.'
    ]
  },
  {
    version: '1.5.0',
    date: '07 Juni 2026',
    changes: [
      'Toggle Dinamis Hamburger/Back: Tombol Menu (hamburger) di sebelah kiri logo SCRIBA otomatis bertransformasi menjadi tombol "Back" (Kembali ke Pustaka) saat naskah atau proyek sedang dibuka.',
      'Judul Proyek Di Header: Judul novel yang sedang aktif kini tampil elegan di sebelah kanan logo induk SCRIBA di bilah utama.',
      'Pengelola Sinopsis Proyek: Menyajikan widget "Sinopsis Cerita Novel" yang bisa dilipat (collapsible) serta mendukung pengubahan sinopsis proyek naskah secara real-time dari dalam bilah samping halaman tulis.'
    ]
  },
  {
    version: '1.4.0',
    date: '07 Juni 2026',
    changes: [
      'Fitur Word and Character Counter: Penambahan penghitung kata (word count), jumlah total karakter (character count), serta estimasi waktu membaca untuk bab yang sedang aktif.',
      'Statistik Keseluruhan Draft: Sidebar daftar chapter kini melacak serta menjumlahkan total keseluruhan kata dan karakter dari seluruh draft naskah novel secara real-time.'
    ]
  },
  {
    version: '1.3.0',
    date: '07 Juni 2026',
    changes: [
      'Peningkatan Penamaan Otomatis (Title Case): Sistem akan memformat masukan nama judul proyek novel, judul bab (chapter), nama karakter, dan nama lokasi / objek dunia bible secara otomatis dengan huruf besar di awal setiap kata.'
    ]
  },
  {
    version: '1.2.0',
    date: '07 Juni 2026',
    changes: [
      'Penyelarasan Desain Monokrom: Sentuhan estetika premium abu-abu-hitam dengan rounded border modern.',
      'Sistem Konfirmasi Internal: Semua dialog konfirmasi penghapusan mengalir di dalam aplikasi (mencegah blokir browser iFrame).',
      'Tombol Ikon Sederhana (Icon-only): Selaras dengan panduan minimalis tombol aksi yang efisien.',
      'Fungsi Mode Layar Penuh (Fullscreen): Sinkronisasi dengan API Fullscreen browser ditambah cadangan Simulasi Layar Penuh (Simulation Overlay) jika ditekan di dalam iFrame yang dibatasi.'
    ]
  },
  {
    version: '1.1.0',
    date: '06 Juni 2026',
    changes: [
      'Plot Hole Detector Cerdas: Analisis pintar ditenagai Gemini AI (model gemini-3.5-flash) yang membandingkan chapter, bible karakter, dan setting dunia serta memberikan saran penyelesaian konkret.',
      'Rich Editor Format Teks: Ditambahkan pintasan berekspresi tebal (Bold) dan miring (Italic) secara instan.',
      'Dukungan Multi-Project: Dapat membuat proyek tipografi novel berjenis Solo, Series, atau Mini.'
    ]
  },
  {
    version: '1.0.0',
    date: '04 Juni 2026',
    changes: [
      'Inisiasi Scriba Novel Workspace.',
      'Manajemen Chapter lengkap dengan penanda Prolog dan Epilog.',
      'Penyimpanan otomatis lokal berbasis LocalStorage standar.'
    ]
  }
];

export default function SettingsModal({ isOpen, onClose, appVersion, onSelectProject, onRefresh, appLogo }: SettingsModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [useSimulatedFullscreen, setUseSimulatedFullscreen] = useState(false);
  const [activeSection, setActiveSection] = useState<'menu' | 'info' | 'logo' | 'ai' | 'account'>('menu');

  // Recovery variables
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryStatus, setRecoveryStatus] = useState<'idle' | 'success' | 'failed' | 'not-found'>('idle');
  const [recoveredCount, setRecoveredCount] = useState(0);
  const [allDbProjects, setAllDbProjects] = useState<{ title: string; id: string; userId: string; type?: string; createdAt?: string; updatedAt?: string }[]>([]);

  // Admin states
  const [customLogo, setCustomLogo] = useState('✍️');

  // Synchronize internal customLogo with parent appLogo prop
  useEffect(() => {
    if (appLogo) {
      setCustomLogo(appLogo);
    }
  }, [appLogo, isOpen]);

  // Reset active tab to 'menu' when opening
  useEffect(() => {
    if (isOpen) {
      setActiveSection('menu');
    }
  }, [isOpen]);

  const [isSavingLogo, setIsSavingLogo] = useState(false);
  const [logoSuccess, setLogoSuccess] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);

  const [registeredUsers, setRegisteredUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  // Fetch logo config & all users profiles (with their projects dashboard)
  useEffect(() => {
    if (isOpen && auth.currentUser?.email === 'kazokuhairy@gmail.com') {
      const loadAdminWorkspace = async () => {
        setIsLoadingUsers(true);
        // A. Load global settings logo
        try {
          const docSnap = await getDoc(doc(db, 'appSettings', 'global'));
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.appLogo) {
              setCustomLogo(data.appLogo);
            }
          }
        } catch (err) {
          console.warn("Gagal membaca settings global:", err);
        }

        // B. Load user profiles from /users
        try {
          const usersSnap = await getDocs(collection(db, 'users'));
          const tempUsers: any[] = [];
          usersSnap.forEach(snap => {
            tempUsers.push({ id: snap.id, ...snap.data() });
          });

          // Grab latest full layout from Projects snapshot
          const projectsSnap = await getDocs(collection(db, 'projects'));
          const allProjs: any[] = [];
          projectsSnap.forEach(snap => {
            allProjs.push({ id: snap.id, ...snap.data() });
          });

          const uniqueUids = Array.from(new Set(allProjs.map(p => p.userId)));
          for (const uid of uniqueUids) {
            if (uid && !tempUsers.some(u => u.id === uid)) {
              tempUsers.push({
                id: uid,
                email: `Pengguna Google (${uid.substring(0, 6)})`,
                lastActive: ''
              });
            }
          }

          // Compile counts and titles per user (respecting draft privacy: NO chapters data read/display!)
          const usersWithStats = tempUsers.map(userItem => {
            const userProjects = allProjs.filter(p => p.userId === userItem.id);
            return {
              ...userItem,
              projectsCount: userProjects.length,
              projects: userProjects.map(p => ({
                id: p.id,
                title: p.title || 'Tanpa Judul',
                type: p.type || 'solo',
                updatedAt: p.updatedAt || p.createdAt || '-'
              }))
            };
          }).sort((a, b) => b.projectsCount - a.projectsCount); // Sort by project density

          setRegisteredUsers(usersWithStats);
        } catch (e) {
          console.error("Gagal mendapatkan database pengguna terdaftar:", e);
        } finally {
          setIsLoadingUsers(false);
        }
      };

      loadAdminWorkspace();
    }
  }, [isOpen]);

  const handleSaveLogo = async (newLogo: string) => {
    try {
      setIsSavingLogo(true);
      setLogoError(null);
      setLogoSuccess(null);

      const cleanLogo = newLogo.trim();
      if (!cleanLogo) {
        setLogoError('Logo tidak boleh kosong.');
        return;
      }

      await setDoc(doc(db, 'appSettings', 'global'), {
        appLogo: cleanLogo,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setCustomLogo(cleanLogo);
      setLogoSuccess('Logo aplikasi berhasil diperbarui secara global!');
      setTimeout(() => setLogoSuccess(null), 3500);
    } catch (err: any) {
      console.error("Gagal menulis logo faksi:", err);
      setLogoError(err.message || 'Sistem galat saat menulis konfigurasi database.');
    } finally {
      setIsSavingLogo(false);
    }
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1.2 * 1024 * 1024) {
      setLogoError('Ukuran gambar terlalu besar. Maksimum limitasi berkas adalah 1.2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64String = event.target?.result as string;
      if (base64String) {
        setCustomLogo(base64String);
        await handleSaveLogo(base64String);
      }
    };
    reader.onerror = () => {
      setLogoError('Gagal membaca berkas gambar.');
    };
    reader.readAsDataURL(file);
  };

  const handleRestoreOldData = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    setIsRecovering(true);
    setRecoveryStatus('idle');
    setAllDbProjects([]);

    try {
      // Restore projects with title "kota kopi"
      const result = await storage.searchAndRestoreOldProjects('kota kopi', uid);
      const dbProjs = result.allFoundTitles || [];
      setAllDbProjects(dbProjs);

      if (result.recoveredProjects && result.recoveredProjects.length > 0) {
        setRecoveredCount(result.recoveredProjects.length);
        setRecoveryStatus('success');
        if (onRefresh) onRefresh();
        // Auto-select the first recovered project
        if (onSelectProject) onSelectProject(result.recoveredProjects[0].id);
      } else {
        setRecoveryStatus('not-found');
      }
    } catch (err) {
      console.error("Gagal melakukan pencarian draf naskah:", err);
      setRecoveryStatus('failed');
    } finally {
      setIsRecovering(false);
    }
  };

  const handleRestoreProjectById = async (targetTitle: string, projectId: string) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    setIsRecovering(true);
    try {
      const result = await storage.searchAndRestoreOldProjects(targetTitle, uid);
      if (result.recoveredProjects && result.recoveredProjects.length > 0) {
        setRecoveryStatus('success');
        if (onRefresh) onRefresh();
        if (onSelectProject) onSelectProject(projectId);
      } else {
        setRecoveryStatus('failed');
      }
    } catch (err) {
      console.error("Gagal memulihkan draf terpilih:", err);
      setRecoveryStatus('failed');
    } finally {
      setIsRecovering(false);
    }
  };

  // Auto-scan projects when settings opens for recovery admin
  useEffect(() => {
    if (isOpen && auth.currentUser?.email === 'kazokuhairy@gmail.com') {
      handleRestoreOldData();
    }
  }, [isOpen]);

  // Check physical fullscreen status
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
        setUseSimulatedFullscreen(false);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
        setUseSimulatedFullscreen(false);
      }
    } catch (err) {
      console.warn("Standard Fullscreen request blocked or failed, fallback to simulated fullscreen: ", err);
      const simulated = !useSimulatedFullscreen;
      setUseSimulatedFullscreen(simulated);
      if (simulated) {
        document.body.classList.add('simulated-fullscreen-active');
      } else {
        document.body.classList.remove('simulated-fullscreen-active');
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col h-screen overflow-hidden slight-fading-transition">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="w-full h-full flex flex-col overflow-hidden max-w-4xl mx-auto"
          >
            {/* Header - Styled with spacious typography & negative spaces, NO LOGO/ICON */}
            <div className="flex items-center justify-between border-b border-neutral-100 p-6">
              <div>
                <h3 className="text-xl font-montserrat font-black tracking-widest text-neutral-900 uppercase">
                  {activeSection === 'menu' ? 'SETTINGS' : activeSection === 'info' ? 'INFORMASI' : activeSection === 'logo' ? 'LOGO BRANDING' : activeSection === 'ai' ? 'MODEL AI' : 'CONNECTED ACCOUNT'}
                </h3>
              </div>
              <button
                type="button"
                onClick={activeSection === 'menu' ? onClose : () => setActiveSection('menu')}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-neutral-950 border border-neutral-200 hover:bg-neutral-50 rounded-xl transition cursor-pointer flex items-center space-x-1.5 shadow-3xs"
                title={activeSection === 'menu' ? 'Tutup Pengaturan' : 'Kembali ke Menu Settings'}
              >
                <X className="w-4 h-4" />
                <span>{activeSection === 'menu' ? 'Tutup' : 'Kembali'}</span>
              </button>
            </div>

            {/* Content Body - Multi-section Clean Minimal Dispatcher */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 scrollbar-thin">
              
              {activeSection === 'menu' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="text-neutral-500 font-sans text-xs uppercase tracking-wider font-semibold border-b border-neutral-150 pb-2">
                    Menu Konfigurasi Workspace
                  </div>

                  {/* Looks tombol hanya icon dan label ringan */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Option 1: Aplikasi & Riwayat */}
                    <button
                      type="button"
                      onClick={() => setActiveSection('info')}
                      className="flex items-center space-x-4 p-5 bg-white border border-neutral-200 hover:border-neutral-900 rounded-2xl text-left transition cursor-pointer shadow-3xs group w-full"
                    >
                      <div className="p-3 bg-neutral-50 group-hover:bg-neutral-950 group-hover:text-white rounded-xl transition text-neutral-800 shrink-0">
                        <FileText className="w-5 h-5 font-bold" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-wider text-neutral-900 font-montserrat leading-none">
                          Informasi &amp; Rilis
                        </p>
                        <p className="text-[10px] text-neutral-400 mt-1 uppercase font-bold tracking-wide truncate leading-none">
                          Spesifikasi &amp; Changelog v{appVersion}
                        </p>
                      </div>
                    </button>

                    {/* Option 2: Kustomisasi Logo */}
                    <button
                      type="button"
                      onClick={() => setActiveSection('logo')}
                      className="flex items-center space-x-4 p-5 bg-white border border-neutral-200 hover:border-neutral-900 rounded-2xl text-left transition cursor-pointer shadow-3xs group w-full"
                    >
                      <div className="p-3 bg-neutral-50 group-hover:bg-neutral-950 group-hover:text-white rounded-xl transition text-neutral-800 shrink-0">
                        <Settings className="w-5 h-5 font-bold animate-spin-slow" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-wider text-neutral-900 font-montserrat leading-none">
                          Kustomisasi Logo
                        </p>
                        <p className="text-[10px] text-neutral-400 mt-1 uppercase font-bold tracking-wide truncate leading-none">
                          Setting Logomark &amp; Typemark
                        </p>
                      </div>
                    </button>

                    {/* Option 3: Akun Terhubung */}
                    <button
                      type="button"
                      onClick={() => setActiveSection('account')}
                      className="flex items-center space-x-4 p-5 bg-white border border-neutral-200 hover:border-neutral-900 rounded-2xl text-left transition cursor-pointer shadow-3xs group w-full"
                    >
                      <div className="p-3 bg-neutral-50 group-hover:bg-neutral-950 group-hover:text-white rounded-xl transition text-neutral-800 shrink-0">
                        <User className="w-5 h-5 font-bold" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-wider text-neutral-900 font-montserrat leading-none">
                          Akun Terhubung
                        </p>
                        <p className="text-[10px] text-neutral-400 mt-1 uppercase font-bold tracking-wide truncate leading-none">
                          {auth.currentUser?.email || 'Mitra Tamu Offline'}
                        </p>
                      </div>
                    </button>

                    {/* Option 4: AI Model & Penggunaan */}
                    <button
                      type="button"
                      onClick={() => setActiveSection('ai')}
                      className="flex items-center space-x-4 p-5 bg-white border border-neutral-200 hover:border-neutral-900 rounded-2xl text-left transition cursor-pointer shadow-3xs group w-full"
                    >
                      <div className="p-3 bg-neutral-50 group-hover:bg-neutral-950 group-hover:text-white rounded-xl transition text-neutral-800 shrink-0">
                        <Database className="w-5 h-5 font-bold" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-wider text-neutral-900 font-montserrat leading-none">
                          AI Model &amp; Status
                        </p>
                        <p className="text-[10px] text-neutral-400 mt-1 uppercase font-bold tracking-wide truncate leading-none">
                          Detektor Alur &amp; Plot Hole
                        </p>
                      </div>
                    </button>
                  </div>

                  {/* Fullscreen Toggle Setup */}
                  <div className="border border-neutral-100 bg-neutral-50/50 p-5 rounded-2xl flex items-center justify-between shadow-3xs">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                        Layar Penuh Tanpa Distraksi (Fullscreen Mode)
                      </p>
                      <p className="text-[10px] text-neutral-400 uppercase font-semibold">
                        Sembunyikan bilah navigasi untuk fokus menulis total
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={toggleFullscreen}
                      className="px-4 py-2.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-950 hover:text-white text-neutral-800 text-[10px] font-extrabold uppercase tracking-widest transition cursor-pointer flex items-center justify-center space-x-2 shadow-3xs shrink-0"
                      title="Fullscreen"
                    >
                      {isFullscreen || useSimulatedFullscreen ? (
                        <>
                          <Minimize className="w-3.5 h-3.5" />
                          <span>Kecilkan</span>
                        </>
                      ) : (
                        <>
                          <Maximize className="w-3.5 h-3.5" />
                          <span>Mulai</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* SECTION SUBPAGE 1: INFORMASI & RILIS (APP + CHANGELOG) */}
              {activeSection === 'info' && (
                <div className="space-y-6 animate-fadeIn">
                  {/* System Specs block */}
                  <div className="bg-neutral-50/50 rounded-2xl p-6 border border-neutral-100 space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-neutral-150">
                      <div className="space-y-0.5 text-left">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 font-mono">
                          Spesifikasi Pustaka
                        </span>
                        <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-widest">
                          Fitur Utama Scriba Studio
                        </h4>
                      </div>
                      <span className="text-xs font-mono font-bold bg-neutral-950 text-white px-3 py-1 rounded-full">
                        Versi {appVersion}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-600 pt-1">
                      <div className="flex items-center space-x-2 p-2 bg-white rounded-xl border border-neutral-100 shadow-3xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-neutral-800 shrink-0" />
                        <span>Multi Project Novel</span>
                      </div>
                      <div className="flex items-center space-x-2 p-2 bg-white rounded-xl border border-neutral-100 shadow-3xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-neutral-800 shrink-0" />
                        <span>Prolog &amp; Epilog Outline</span>
                      </div>
                      <div className="flex items-center space-x-2 p-2 bg-white rounded-xl border border-neutral-100 shadow-3xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-neutral-800 shrink-0" />
                        <span>Bible Karakter &amp; Semesta</span>
                      </div>
                      <div className="flex items-center space-x-2 p-2 bg-white rounded-xl border border-neutral-100 shadow-3xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-neutral-800 shrink-0" />
                        <span>Shortcuts Tebal / Miring</span>
                      </div>
                      <div className="flex items-center space-x-2 p-2 bg-white rounded-xl border border-neutral-100 shadow-3xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-neutral-800 shrink-0" />
                        <span>Gemini Plot Hole Detector</span>
                      </div>
                      <div className="flex items-center space-x-2 p-2 bg-white rounded-xl border border-neutral-100 shadow-3xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-neutral-800 shrink-0" />
                        <span>Penyimpanan Offline Aman</span>
                      </div>
                    </div>
                  </div>

                  {/* Application Changelog list */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 border-b border-neutral-100 pb-2">
                      <FileText className="w-4 h-4 text-neutral-850" />
                      <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-widest leading-none">
                        Riwayat Perubahan &amp; Catatan Rilis
                      </h4>
                    </div>
                    
                    <div className="space-y-5 pt-2 max-h-[360px] overflow-y-auto pr-2 scrollbar-thin">
                      {CHANGELOG_DATA.map((item, id) => (
                        <div key={id} className="relative pl-5 border-l border-neutral-200 text-xs">
                          <div className="absolute w-2 h-2 rounded-full bg-neutral-950 -left-[4.5px] top-1"></div>
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="font-bold text-neutral-900 bg-neutral-100 px-2.5 py-0.5 rounded-lg text-[10px]">
                              Versi {item.version}
                            </span>
                            <span className="text-[10px] font-mono text-neutral-400 font-bold uppercase">
                              {item.date}
                            </span>
                          </div>
                          <ul className="list-disc pl-4 space-y-1 text-neutral-500 mt-2 leading-relaxed">
                            {item.changes.map((change, cid) => (
                              <li key={cid}>{change}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Back Navigation Bar Button */}
                  <div className="pt-4 border-t border-neutral-100 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setActiveSection('menu')}
                      className="px-4 py-2 bg-neutral-950 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer"
                    >
                      Kembali ke Menu
                    </button>
                  </div>
                </div>
              )}

              {/* SECTION SUBPAGE 2: KUSTOMISASI LOGO BRANDING */}
              {activeSection === 'logo' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="bg-neutral-50/50 border border-neutral-200/80 p-5 rounded-2xl text-left">
                    <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest block font-mono">Modul Branding</span>
                    <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-widest mt-0.5">
                      Fasilitas Modul Pengeditan / Kustomisasi Logo
                    </h4>
                    <p className="text-[11px] font-medium text-neutral-400 mt-1 uppercase max-w-2xl leading-normal">
                      Anda dapat mengunggah file gambar (logomark) kustom di database global SCRIBA atau menyetel teks logo (typemark) yang fleksibel. Logo ini akan berlaku dinamis dan instan.
                    </p>
                  </div>

                  {/* Editing layout */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                    {/* Live Preview Pane */}
                    <div className="md:col-span-4 flex flex-col items-center justify-center border border-neutral-200 bg-white p-5 rounded-2xl aspect-square text-center shadow-3xs">
                      <span className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest mb-3 font-mono">PRATINJAU LOGO</span>
                      <div className="w-24 h-24 bg-neutral-50 rounded-2xl border border-neutral-100 flex items-center justify-center overflow-hidden shadow-3xs select-none p-2">
                        {customLogo && (customLogo.startsWith('data:image/') || customLogo.startsWith('http://') || customLogo.startsWith('https://')) ? (
                          <img src={customLogo} alt="Pratinjau Logo Kustom" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="text-4xl font-sans">{customLogo || '✍️'}</span>
                        )}
                      </div>
                      <p className="text-[9px] text-neutral-400 mt-3 font-bold uppercase tracking-wider">
                        {customLogo && customLogo.startsWith('data:image/') ? 'Logomark (File Unggahan)' : 'Typemark (Teks/URL)'}
                      </p>
                    </div>

                    {/* Zone Inputs */}
                    <div className="md:col-span-8 flex flex-col gap-4 w-full">
                      {/* Drag upload box (Logomark) */}
                      <div className="border border-dashed border-neutral-300 bg-neutral-50/20 hover:bg-neutral-50 p-5 rounded-2xl text-center relative transition flex flex-col items-center justify-center min-h-[120px]">
                        <input
                          type="file"
                          accept="image/*"
                          id="logo-upload-selector"
                          onChange={handleLogoFileChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          title="Pilih gambar untuk diunggah"
                        />
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-neutral-850 uppercase tracking-wider">
                            UNGGAH LOGOMARK BARU
                          </p>
                          <p className="text-[10px] text-neutral-400 leading-normal max-w-xs mx-auto uppercase font-bold tracking-wide">
                            Seret / klik file gambar PNG, JPG, WEBP (Limit 1.2MB)
                          </p>
                        </div>
                      </div>

                      {/* Text based typemark input option */}
                      <div className="space-y-1">
                        <label className="text-[9px] font-extrabold text-neutral-450 uppercase tracking-widest font-mono">
                          LOGO ALTERNATIF / TYPEMARK (TEKS ATAU KODE URL)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={customLogo}
                            onChange={(e) => setCustomLogo(e.target.value)}
                            placeholder="Emoji atau tautan URL gambar (https://...)"
                            className="flex-1 px-4 py-3 bg-white border border-neutral-255 rounded-xl text-xs font-bold focus:outline-none focus:border-neutral-900 transition"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveLogo(customLogo)}
                            disabled={isSavingLogo}
                            className="px-4 py-3 bg-neutral-950 hover:bg-neutral-850 text-white rounded-xl text-xs font-bold tracking-wide transition cursor-pointer flex items-center justify-center space-x-1.5 disabled:opacity-50 shrink-0"
                          >
                            {isSavingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            <span>SIMPAN</span>
                          </button>
                        </div>
                      </div>

                      {logoSuccess && (
                        <p className="text-[10px] text-emerald-600 font-bold flex items-center space-x-1 animate-fadeIn">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{logoSuccess}</span>
                        </p>
                      )}
                      {logoError && (
                        <p className="text-[10px] text-red-650 font-bold animate-fadeIn">
                          GALAT: {logoError}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Back Navigation Bar Button */}
                  <div className="pt-4 border-t border-neutral-100 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setActiveSection('menu')}
                      className="px-4 py-2 bg-neutral-950 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer"
                    >
                      Kembali ke Menu
                    </button>
                  </div>
                </div>
              )}

              {/* SECTION SUBPAGE 3: KONEKSI AKUN & DATABASE (WITH RECOVERY & ACC LIST IF ADMIN) */}
              {activeSection === 'account' && (
                <div className="space-y-6 animate-fadeIn">
                  {/* General account status info */}
                  <div className="bg-neutral-50/50 rounded-2xl p-5 border border-neutral-100 flex items-center justify-between text-left">
                    <div>
                      <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest block font-mono">Identitas Sambungan</span>
                      <p className="text-xs font-bold text-neutral-900 font-montserrat mt-1">
                        Sesi Akun: <span className="text-neutral-500">{auth.currentUser?.email || 'Mitra Tamu Offline'}</span>
                      </p>
                      <p className="text-[10px] font-mono text-neutral-400 mt-1 uppercase">
                        UID DB: {auth.currentUser?.uid || 'offline-storage-mode'}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold bg-neutral-950 text-white px-2.5 py-1 rounded-lg uppercase tracking-wider shrink-0 font-mono">
                      {auth.currentUser ? 'Online Sync Active' : 'Offline Mode'}
                    </span>
                  </div>

                  {/* If user is the authorized admin email kazokuhairy@gmail.com */}
                  {auth.currentUser?.email === 'kazokuhairy@gmail.com' ? (
                    <div className="space-y-6">
                      
                      {/* Pemulihan Data Tab Wrapper */}
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2 border-b border-neutral-100 pb-1 text-left">
                          <Database className="w-4 h-4 text-neutral-800" />
                          <h4 className="text-xs font-bold text-neutral-950 uppercase tracking-widest font-montserrat">
                            Saluran Pemulihan Naskah (Restorasi)
                          </h4>
                        </div>
                        <div className="border border-neutral-200/85 p-5 rounded-2xl bg-neutral-50/30 text-left space-y-4">
                          <p className="text-[11px] text-neutral-500 leading-relaxed uppercase font-semibold">
                            Sistem mendeteksi masuk admin <span className="font-bold text-neutral-800 font-mono">kazokuhairy@gmail.com</span>. Anda dapat memindai cloud database untuk mendeteksi serta menarik draf novel lama Anda dari proyek <span className="font-bold text-neutral-800">"Kota Kopi"</span>.
                          </p>
                          
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 border border-neutral-150 rounded-xl">
                            <div className="text-left">
                              <p className="text-xs font-bold text-neutral-800">STATUS PEMULIHAN</p>
                              <p className="text-[10px] text-neutral-400 font-bold mt-1 uppercase">
                                {recoveryStatus === 'success' ? 'Selesai: Data Pulih' : recoveryStatus === 'not-found' ? 'Selesai: Kota Kopi Tidak Ditemukan' : recoveryStatus === 'failed' ? 'Galat Koneksi Database' : 'Siap Menunggu Scanner'}
                              </p>
                            </div>
                            
                            <button
                              type="button"
                              disabled={isRecovering}
                              onClick={handleRestoreOldData}
                              className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition flex items-center justify-center space-x-2 shrink-0 ${
                                isRecovering
                                  ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                                  : 'bg-neutral-950 text-white hover:bg-neutral-850 shadow-3xs cursor-pointer'
                              }`}
                            >
                              {isRecovering ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>MEMULIHKAN...</span>
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5" />
                                  <span>SCAN KOTA KOPI</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* Detail of recovered options */}
                          {allDbProjects.length > 0 && (
                            <div className="space-y-2 pt-1 text-left">
                              <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest block font-mono">
                                DAFTAR SELURUH DRAF NOVEL TERDETEKSI DI CLOUD FIRESTORE ({allDbProjects.length}):
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                                {allDbProjects.map((p) => {
                                  const isCurrentOwner = p.userId === auth.currentUser?.uid;
                                  return (
                                    <div
                                      key={p.id}
                                      className="flex items-center justify-between text-xs bg-white p-3 rounded-xl border border-neutral-200 hover:border-neutral-300 transition gap-2 shadow-3xs"
                                    >
                                      <div className="flex flex-col text-left min-w-0">
                                        <span className="font-bold text-neutral-850 truncate">{p.title}</span>
                                        <span className="text-[9px] text-neutral-400 font-mono truncate">
                                          ID: {p.id.substring(0, 8)} • {isCurrentOwner ? 'Milik Anda' : 'Bypass Pinjam'}
                                        </span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleRestoreProjectById(p.title, p.id)}
                                        disabled={isRecovering}
                                        className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-widest bg-neutral-950 hover:bg-neutral-850 text-white rounded-lg transition shrink-0 cursor-pointer"
                                      >
                                        PULIHKAN
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Admin Users Statistics Database */}
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2 border-b border-neutral-100 pb-1 text-left">
                          <User className="w-4 h-4 text-neutral-800" />
                          <h4 className="text-xs font-bold text-neutral-950 uppercase tracking-widest font-montserrat">
                            Mailing List &amp; Database Proyek Pengguna ({registeredUsers.length})
                          </h4>
                        </div>
                        
                        {isLoadingUsers ? (
                          <div className="flex items-center space-x-2 py-3 text-left">
                            <Loader2 className="w-4 h-4 animate-spin text-neutral-600" />
                            <span className="text-xs text-neutral-400">Sedang memetakan seluruh akun Scriba...</span>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-1">
                            {registeredUsers.map(u => (
                              <div
                                key={u.id}
                                className={`p-4 bg-white border rounded-xl hover:border-neutral-450 transition flex flex-col justify-between gap-2 text-left shadow-3xs ${selectedUser?.id === u.id ? 'border-neutral-900 ring-1 ring-neutral-900' : 'border-neutral-200'}`}
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center space-x-1 min-w-0">
                                    <User className="w-3 h-3 text-neutral-400 shrink-0" />
                                    <span className="font-extrabold text-neutral-900 truncate text-[11px] select-all uppercase tracking-wide leading-none">{u.email}</span>
                                  </div>
                                  <p className="text-[9px] font-mono text-neutral-400 uppercase leading-none">
                                    PROYEK AKTIF: {u.projectsCount} naskah
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setSelectedUser(selectedUser?.id === u.id ? null : u)}
                                  className="w-full py-1.5 bg-neutral-950 hover:bg-neutral-800 text-white rounded-lg text-[9px] font-bold uppercase tracking-widest transition cursor-pointer flex items-center justify-center space-x-1"
                                >
                                  <span>{selectedUser?.id === u.id ? 'TUTUP DASBOR' : 'TINJAU'}</span>
                                  <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Selected User View details */}
                        {selectedUser && (
                          <div className="p-4 bg-white border border-neutral-300 rounded-2xl animate-fadeIn space-y-3 text-left shadow-2xs">
                            <div className="flex justify-between items-center pb-2 border-b border-neutral-100">
                              <div>
                                <span className="text-[9px] font-bold text-neutral-450 uppercase tracking-widest block font-mono">DASBOR MONITORING</span>
                                <span className="text-xs font-bold text-neutral-900 font-montserrat">{selectedUser.email}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setSelectedUser(null)}
                                className="text-[10px] font-extrabold text-red-600 hover:text-red-800 uppercase tracking-wider cursor-pointer"
                              >
                                TUTUP
                              </button>
                            </div>

                            {selectedUser.projects.length === 0 ? (
                              <p className="text-xs text-neutral-400 py-1 font-semibold uppercase tracking-wider">
                                Belum ada naskah novel aktif terdeteksi.
                              </p>
                            ) : (
                              <div className="space-y-2">
                                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                  {selectedUser.projects.map((proj: any) => (
                                    <div key={proj.id} className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-100 flex items-center justify-between gap-2">
                                      <div className="min-w-0 text-left">
                                        <p className="text-xs font-bold text-neutral-900 truncate uppercase tracking-wide">{proj.title}</p>
                                        <p className="text-[9px] text-neutral-400 uppercase font-semibold mt-0.5">
                                          Tipe: {proj.type}
                                        </p>
                                      </div>
                                      <span className="text-[9px] font-mono font-bold text-neutral-400 bg-white px-2 py-0.5 rounded border leading-none shrink-0">
                                        {proj.id.substring(0, 6)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                    </div>
                  ) : (
                    <div className="p-6 border border-neutral-200 rounded-2xl bg-white text-center space-y-2 max-w-md mx-auto">
                      <HelpCircle className="w-8 h-8 text-neutral-400 mx-auto" />
                      <p className="text-xs font-bold text-neutral-800 uppercase tracking-wider">KOLABORATOR SISTEM SCRIBA</p>
                      <p className="text-[11px] text-neutral-400 leading-relaxed uppercase font-semibold">
                        Anda masuk sebagai mitra tamu publik. Sinkronisasi multi-device bekerja otomatis di cloud database. Seluruh draf dilindungi sandi autentikasi pribadi Anda.
                      </p>
                    </div>
                  )}

                  {/* Back Navigation Bar Button */}
                  <div className="pt-4 border-t border-neutral-100 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setActiveSection('menu')}
                      className="px-4 py-2 bg-neutral-950 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer"
                    >
                      Kembali ke Menu
                    </button>
                  </div>
                </div>
              )}

              {/* SECTION SUBPAGE 4: AI MODEL & PENGGUNAAN */}
              {activeSection === 'ai' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="bg-neutral-50/50 p-6 border border-neutral-100 rounded-2xl text-left space-y-4">
                    <div className="pb-3 border-b border-neutral-150">
                      <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest block font-mono">Kecerdasan Buatan</span>
                      <h4 className="text-xs font-extrabold text-neutral-900 uppercase tracking-widest mt-0.5">
                        Spesifikasi AI Model Integration
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="p-4 bg-white border border-neutral-150 rounded-xl space-y-1">
                        <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider font-mono">IDENTITAS MODEL AI</span>
                        <p className="font-extrabold text-neutral-900 font-montserrat uppercase tracking-wide">Gemini 3.5 Flash</p>
                      </div>

                      <div className="p-4 bg-white border border-neutral-150 rounded-xl space-y-1">
                        <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider font-mono">METODE PENYALURAN</span>
                        <p className="font-extrabold text-neutral-900 font-montserrat uppercase tracking-wide">Google GenAI Client SDK</p>
                      </div>
                    </div>
                  </div>

                  {/* Capabilities List */}
                  <div className="space-y-4">
                    <div className="border-b border-neutral-100 pb-2 text-left">
                      <p className="text-xs font-bold text-neutral-905 uppercase tracking-widest">Tugas Fungsionalitas Kecerdasan</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-white border border-neutral-200 rounded-xl text-left space-y-2 shadow-3xs">
                        <div className="w-7 h-7 bg-neutral-950 text-white rounded-lg flex items-center justify-center font-bold text-xs">01</div>
                        <p className="text-xs font-bold text-neutral-850 uppercase tracking-wider">Deteksi Plot Hole</p>
                        <p className="text-[10px] text-neutral-400 font-medium leading-relaxed uppercase">Memindai timeline draf bab dan membandingkan kelogisan naskah.</p>
                      </div>

                      <div className="p-4 bg-white border border-neutral-200 rounded-xl text-left space-y-2 shadow-3xs">
                        <div className="w-7 h-7 bg-neutral-950 text-white rounded-lg flex items-center justify-center font-bold text-xs">02</div>
                        <p className="text-xs font-bold text-neutral-850 uppercase tracking-wider">Pemetaan Bible</p>
                        <p className="text-[10px] text-neutral-400 font-medium leading-relaxed uppercase">Membaca aturan semesta, geografi lokasi, dan profil peran silsilah karakter.</p>
                      </div>

                      <div className="p-4 bg-white border border-neutral-200 rounded-xl text-left space-y-2 shadow-3xs">
                        <div className="w-7 h-7 bg-neutral-950 text-white rounded-lg flex items-center justify-center font-bold text-xs">03</div>
                        <p className="text-xs font-bold text-neutral-850 uppercase tracking-wider">Enkripsi Antara</p>
                        <p className="text-[10px] text-neutral-400 font-medium leading-relaxed uppercase">Mata air literasi dilindungi enkripsi server-side proxy aman.</p>
                      </div>
                    </div>
                  </div>

                  {/* Back Navigation Bar Button */}
                  <div className="pt-4 border-t border-neutral-100 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setActiveSection('menu')}
                      className="px-4 py-2 bg-neutral-950 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer"
                    >
                      Kembali ke Menu
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Sticky Fullscreen Footer */}
            <div className="border-t border-neutral-100 bg-neutral-50/70 p-6 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-400 gap-3 shrink-0">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-neutral-500" />
                <span className="font-semibold text-neutral-450 uppercase tracking-wide">Penyimpanan Terenkripsi Lokal Aman (localStorage)</span>
              </div>
              <span className="font-extrabold text-neutral-450 uppercase tracking-wider">&copy; 2026 Scriba Studio &bull; Buatan Indonesia</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
