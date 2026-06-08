import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
} else {
  console.warn("GEMINI_API_KEY is not defined in environment variables.");
}

// Helper to call generateContent with automatic retry and model fail-over on temporary overloads or quota blockages
async function generateContentWithRetry(aiClient: GoogleGenAI, params: any) {
  const maxRetries = 3;
  let delay = 1000;
  let lastError: any = null;

  // Let's copy initial model to use inside retry block
  let currentModel = params.model || "gemini-3.1-flash-lite";

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Create a shallow copy of config to avoid modifying external state directly
      const callParams = {
        ...params,
        model: currentModel
      };
      return await aiClient.models.generateContent(callParams);
    } catch (error: any) {
      lastError = error;
      const errorMessage = error?.message || "";
      const isQuotaExhausted = errorMessage.includes("429") || 
                               errorMessage.includes("RESOURCE_EXHAUSTED") || 
                               errorMessage.includes("quota") || 
                               errorMessage.includes("Quota exceeded");
      
      const isTemporary = isQuotaExhausted ||
                          errorMessage.includes("503") || 
                          errorMessage.includes("UNAVAILABLE") || 
                          errorMessage.includes("high demand") || 
                          errorMessage.includes("Spikes in demand");

      console.warn(`[Gemini Attempt ${attempt}/${maxRetries} failed with model ${currentModel}]:`, errorMessage);

      if (isTemporary && attempt < maxRetries) {
        // Move to the next fallback model in the sequence
        if (currentModel === "gemini-3.5-flash") {
          console.warn("Switching model argument to gemini-3.1-flash-lite as fail-over due to high demand/quota limits on gemini-3.5-flash");
          currentModel = "gemini-3.1-flash-lite";
        } else if (currentModel === "gemini-3.1-flash-lite") {
          console.warn("Switching model argument to gemini-flash-latest as fail-over due to quota/demand limits on gemini-3.1-flash-lite");
          currentModel = "gemini-flash-latest";
        } else if (currentModel === "gemini-flash-latest") {
          console.warn("Switching model argument to gemini-3.5-flash as last resort");
          currentModel = "gemini-3.5-flash";
        }

        console.log(`Retrying after ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 1.5;
      } else {
        throw error;
      }
    }
  }
  throw lastError;
}

// Standardized Indonesian friendly error formatter for AI requests
function handleAiError(error: any, res: any, defaultMessage: string) {
  console.error(defaultMessage, error);
  const errorMessage = error?.message || "";
  const isTemporary = errorMessage.includes("503") || 
                      errorMessage.includes("UNAVAILABLE") || 
                      errorMessage.includes("high demand") || 
                      errorMessage.includes("Spikes in demand") || 
                      errorMessage.includes("Resource exhausted") || 
                      errorMessage.includes("429");

  if (isTemporary) {
    return res.status(503).json({
      error: "Sistem AI saat ini sedang sangat sibuk (High Demand / Spikes). Harap tunggu sekitar 3-5 detik lalu coba klik tombol lagi. Perubahan ini akan membaik sesaat lagi!"
    });
  }

  return res.status(500).json({ error: errorMessage || defaultMessage });
}

// Smart Plot Hole Detector API Endpoint
app.post("/api/detect-plot-holes", async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({ 
        error: "Gemini AI is not configured. Please set your GEMINI_API_KEY in the Secrets panel." 
      });
    }

    const { chapters, characters, worldItems } = req.body;

    if (!chapters || chapters.length === 0) {
      return res.json({
        plotHoles: [],
        message: "Silakan tambahkan beberapa chapter terlebih dahulu agar analisis dapat berjalan."
      });
    }

    const prompt = `You are a professional literary analyst and editor. 
Analyze the following elements of a novel project and detect any plot holes, logical inconsistencies, timeline contradictions, character actions that conflict with their backstory/traits, or world rules that are broken.

CHARACTER BIBLE:
${JSON.stringify(characters.map((c: any) => ({ id: c.id, name: c.name, role: c.role, description: c.description, backstory: c.backstory })), null, 2)}

WORLD & UNIVERSE BIBLE:
${JSON.stringify(worldItems.map((w: any) => ({ id: w.id, name: w.name, category: w.category, description: w.description })), null, 2)}

CHAPTERS LIST:
${JSON.stringify(chapters.map((ch: any) => ({ id: ch.id, title: ch.title, number: ch.number, isProlog: ch.isProlog, isEpilog: ch.isEpilog, summary: ch.summary, contentLength: ch.content?.length || 0, contentExcerpt: ch.content ? ch.content.slice(0, 500) : "" })), null, 2)}

Tasks:
1. Double check dates, physical locations, character traits, and events for direct contradictions.
2. Check if a character suddenly knows something they shouldn't, or fails to use an item/magic system rule defined in the world bible.
3. Identify narrative threads that are left hanging/unresolved.
4. Output a JSON list of logical inconsistency items. If none are found, return an empty array.

Return the findings strictly in the specified JSON format. Ensure all strings are in Indonesian language as the user requested Indonesian interface.`;

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        systemInstruction: "Anda adalah asisten editor novel profesional berbahasa Indonesia. Berikan analisis plot hole yang tajam, logis, terperinci, dan konstruktif berdasarkan data bible karakter, data world-building, serta outline konten chapter.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            plotHoles: {
              type: Type.ARRAY,
              description: "Daftar potensi plot hole atau inkonsistensi yang dideteksi.",
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { 
                    type: Type.STRING, 
                    description: "Judul ringkas plot hole dalam bahasa Indonesia." 
                  },
                  description: { 
                    type: Type.STRING, 
                    description: "Penjelasan mendalam mengapa hal ini merupakan inkonsistensi atau celah logika, sebutkan bukti dari data yang dikirim." 
                  },
                  severity: { 
                    type: Type.STRING, 
                    description: "Tingkat keparahan: harus bernilai 'low', 'medium', atau 'high'." 
                  },
                  suggestions: { 
                    type: Type.STRING, 
                    description: "Saran konkret dan kreatif bagaimana penulis bisa memperbaiki celah plot tersebut." 
                  },
                  chapterIds: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING },
                    description: "Kumpulan ID chapter yang terkait dengan plot hole ini (jika ada)." 
                  },
                  characterIds: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING },
                    description: "Kumpulan ID karakter yang terkait dengan plot hole ini (jika ada)." 
                  }
                },
                required: ["title", "description", "severity", "suggestions"]
              }
            }
          },
          required: ["plotHoles"]
        }
      }
    });

    const resultText = response.text || "{}";
    const data = JSON.parse(resultText);
    return res.json(data);

  } catch (error: any) {
    return handleAiError(error, res, "Gagal melakukan deteksi plot hole.");
  }
});

// Generate Character AI Profile Endpoint
app.post("/api/generate-character-profile", async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({ 
        error: "Gemini AI is not configured. Please set your GEMINI_API_KEY in the Secrets panel." 
      });
    }

    const { character, others = [] } = req.body;
    if (!character || !character.name) {
      return res.status(400).json({ error: "Data karakter tidak valid." });
    }

    const prompt = `Anda adalah asisten editor novel dan profiler karakter profesional berbahasa Indonesia.
Buat ringkasan dan profil AI yang tajam, logis, kreatif dari karakter berikut.

DETAIL DATA KARAKTER:
Nama: ${character.name}
Peran Utama: ${character.role}
Deskripsi/Sifat: ${character.description || "Tidak ada deskripsi."}
Latar Belakang (Backstory): ${character.backstory || "Tidak ada latar belakang."}
Catatan Tambahan/Rahasia: ${character.notes || "Tidak ada catatan tambahan."}

DAFTAR KARAKTER LAIN DI CERITA INI (Gunakan ini untuk menyusun relasi/hubungan karakter secara logis):
${JSON.stringify(others.map((o: any) => ({ name: o.name, role: o.role })))}

Tugas Anda:
Simpulkan, analisis dan diringkas dengan cerdas data di atas ke dalam kolom berikut:
1. usia: Tentukan usia konkret yang logis sesuai deskripsi/latar belakang (misal "17 tahun" atau "Sekitar 32 tahun"). Jangan biarkan kosong.
2. tinggi: Tentukan perkiraan tinggi fisik yang sesuai sifat/peran (misal "165 cm" atau "180 cm").
3. gender: 'Pria', 'Wanita', 'Androgini', atau lainnya yang sesuai.
4. peranNarasi: Peran naratif karakter dalam alur utama cerita (misal: "Mentor yang menyimpan motif terselubung").
5. jabatanCerita: Judul, posisi, status sosial, kelas sosial, atau pekerjaan dalam cerita (misal: "Jenderal Pengasingan", "Penyelundup", "Putri Mahkota").
6. hubunganKarakter: Penjelasan poin-poin relasi karakter ini terhadap daftar karakter lain yang dikirimkan. Jika tidak ada karakter lain, buat asumsi kreatif hubungan sosialnya sehubungan dengan perannya.
7. deskripsiFisik: Detail pakaian, raut wajah, bekas luka atau aura fisik yang paling menggambarkan dirinya secara visual.
8. sifatKarakter: Sifat, kepribadian, nilai moral, tujuan, dan cacat karakter (character flaw).

Semua isian harus dalam Bahasa Indonesia yang formal namun hidup dan memiliki cita rasa sastrawi tinggi. Keluarkan hasil dalam format JSON.`;

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        systemInstruction: "Anda adalah asisten penulisan kreatif novel profesional berbahasa Indonesia. Berikan detail rangkuman profil karakter fiksi yang mendalam, imersif, dan logis.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            usia: { type: Type.STRING, description: "Usia terdeduksi atau estimasi logis." },
            tinggi: { type: Type.STRING, description: "Perkiraan tinggi badan karakter." },
            gender: { type: Type.STRING, description: "Gender fisik karakter." },
            peranNarasi: { type: Type.STRING, description: "Peran utama dalam narasi cerita." },
            jabatanCerita: { type: Type.STRING, description: "Jabatan, pekerjaan, atau status karakter." },
            hubunganKarakter: { type: Type.STRING, description: "Relasi atau hubungan dengan karakter lain." },
            deskripsiFisik: { type: Type.STRING, description: "Ringkasan visual deskripsi fisik unik." },
            sifatKarakter: { type: Type.STRING, description: "Kepribadian utama, sifat, dan flaw." }
          },
          required: ["usia", "tinggi", "gender", "peranNarasi", "jabatanCerita", "hubunganKarakter", "deskripsiFisik", "sifatKarakter"]
        }
      }
    });

    const resultText = response.text || "{}";
    const data = JSON.parse(resultText);
    return res.json(data);

  } catch (error: any) {
    return handleAiError(error, res, "Gagal membuat profil AI karakter.");
  }
});

// Generate World Builder Summary AI Endpoint
app.post("/api/generate-world-profile", async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({ 
        error: "Gemini AI is not configured. Please set your GEMINI_API_KEY in the Secrets panel." 
      });
    }

    const { worldItem } = req.body;
    if (!worldItem || !worldItem.name) {
      return res.status(400).json({ error: "Data world-building tidak valid." });
    }

    const prompt = `Anda adalah asisten world-builder dan editor novel fantasi/fiksi ilmiah profesional berbahasa Indonesia.
Buat ringkasan detail AI dari aturan dunia / setting fiksi berikut.

DETAIL DATA WORLD BUILDING:
Nama Elemen: ${worldItem.name}
Kategori: ${worldItem.category}
Deskripsi/Sejarah: ${worldItem.description || "Tidak ada penjelasan."}
Aturan/Logika/Batasan: ${worldItem.notes || "Tidak ada catatan hukum."}

Tugas Anda:
Simpulkan, susun, dan rancang rangkuman fiksi yang imersif dan terstruktur dengan kolom berikut:
1. definisi: Ringkasan singkat 1-2 kalimat tentang apa elemen setting ini.
2. cakupan: Sejauh mana pengaruh, luas wilayah geografis fiksi, atau siapa saja yang terpengaruh hukum ini.
3. aturanUtama: Hukum-hukum fisik mutlak, batasan logis fiksi, atau aturan sakral yang berlaku terkait elemen ini.
4. sejarah: Catatan asal-usul, mitologi kuno, atau rentetan peristiwa penting yang melandasi eksistensi ini.
5. hubunganCerita: Bagaimana aturan ini menyulut konflik, memengaruhi tindakan para karakter, atau mendorong jalannya plot novel.

Tulis konten dalam Bahasa Indonesia bergaya sastra fantasi/fiksi ilmiah yang memikat. Keluarkan dalam format JSON.`;

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        systemInstruction: "Anda adalah master worldbuilder novel profesional berbahasa Indonesia. Buat ringkasan dan analisis aturan semesta fiktif secara rapi, logis, dan kaya akan lore sastrawi.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            definisi: { type: Type.STRING, description: "Definisi ringkas objek atau setting ini." },
            cakupan: { type: Type.STRING, description: "Cakupan pengaruh fiksi atau kondisi geografis." },
            aturanUtama: { type: Type.STRING, description: "Hukum mutilan, aturan logika, atau keterbatasan fiksi dari objek ini." },
            sejarah: { type: Type.STRING, description: "Mitos, legenda atau sejarah pembentukan singkat." },
            hubunganCerita: { type: Type.STRING, description: "Dampak langsung ke plot cerita novel." }
          },
          required: ["definisi", "cakupan", "aturanUtama", "sejarah", "hubunganCerita"]
        }
      }
    });

    const resultText = response.text || "{}";
    const data = JSON.parse(resultText);
    return res.json(data);

  } catch (error: any) {
    return handleAiError(error, res, "Gagal membuat resume AI aturan dunia.");
  }
});


// Endpoint Auto-detect Bible Items (AI) - Individual and Bulk Modes
app.post("/api/auto-add-bible", async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({ 
        error: "Gemini AI is not configured. Silakan set GEMINI_API_KEY Anda di Settings > Secrets." 
      });
    }

    const { text, type, bulk } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Sila masukkan teks yang ingin dideteksi." });
    }

    if (type !== "character" && type !== "world") {
      return res.status(400).json({ error: "Tipe harus berupa 'character' atau 'world'." });
    }

    let prompt = "";
    let responseSchema: any = {};

    if (type === "character") {
      if (bulk) {
        prompt = `You are a professional novel editor and world builder. Analyze the text pasted by user below. Detect all potential novel characters described in the text and extract their profile details.
TEXT COPIED FROM USER:
"${text}"

Extract multiple active characters and map their details properly to Indonesian. Return the list in the items array. Ensure they have appropriate names and realistic role classifications ('Protagonis' | 'Antagonis' | 'Pendukung' | 'Lainnya').`;

        responseSchema = {
          type: Type.OBJECT,
          properties: {
            items: {
              type: Type.ARRAY,
              description: "Daftar karakter fiksi yang dideteksi dari teks.",
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Nama lengkap karakter." },
                  role: { type: Type.STRING, description: "Peran karakter, wajib bernilai salah satu dari: 'Protagonis', 'Antagonis', 'Pendukung', atau 'Lainnya'." },
                  description: { type: Type.STRING, description: "Sifat kepribadian, penampilan visual, ciri khas utama fiksi." },
                  backstory: { type: Type.STRING, description: "Latar belakang, sejarah lalu terdeduksi atau estimasi dari cerita." },
                  notes: { type: Type.STRING, description: "Relasi atau rahasia utama karakter." }
                },
                required: ["name", "role", "description"]
              }
            }
          },
          required: ["items"]
        };
      } else {
        prompt = `You are a professional novel editor and world builder. Analyze the text pasted by user below. Detect exactly one main character described and extract their details into Indonesian.
TEXT COPIED FROM USER:
"${text}"

Ensure the role is correctly mapped to either 'Protagonis', 'Antagonis', 'Pendukung', or 'Lainnya'. Give creative and complete values if some notes or descriptions are implied rather than stated.`;

        responseSchema = {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "Nama lengkap karakter fiksi." },
            role: { type: Type.STRING, description: "Peran karakter, wajib bernilai salah satu dari: 'Protagonis', 'Antagonis', 'Pendukung', atau 'Lainnya'." },
            description: { type: Type.STRING, description: "Sifat kepribadian, kepribadian, penampilan fisik, ciri visual." },
            backstory: { type: Type.STRING, description: "Latar belakang kehidupan masa lalu karakter." },
            notes: { type: Type.STRING, description: "Relasi rahasia atau rahasia, motivasi, konflik, catatan tambahan." }
          },
          required: ["name", "role", "description"]
        };
      }
    } else {
      // type === 'world'
      if (bulk) {
        prompt = `You are a professional novel editor and world builder. Analyze the text pasted by user below. Detect all potential fictional elements of settings, lore, magic systems, physical items, artifacts, or organizations.
TEXT COPIED FROM USER:
"${text}"

Extract multiple setting elements and map their details properly to Indonesian. Ensure they have appropriate category classifications ('Lokasi' | 'Lore/Sejarah' | 'Sistem Sihir/Fisika' | 'Organisasi' | 'Artefak/Benda' | 'Lainnya').`;

        responseSchema = {
          type: Type.OBJECT,
          properties: {
            items: {
              type: Type.ARRAY,
              description: "Daftar setting semesta fiksi yang dideteksi dari teks.",
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Nama setting, tempat, lore, artefak atau hukum fiksi." },
                  category: { type: Type.STRING, description: "Kategori, wajib bernilai salah satu dari: 'Lokasi', 'Lore/Sejarah', 'Sistem Sihir/Fisika', 'Organisasi', 'Artefak/Benda', 'Lainnya'." },
                  description: { type: Type.STRING, description: "Mitos, tradisi, lore sejarah, penampilan visual mendalam fiksi." },
                  notes: { type: Type.STRING, description: "Batasan fiksi, aturan logika mutlak, aturan sihir, atau hukum semesta." }
                },
                required: ["name", "category", "description"]
              }
            }
          },
          required: ["items"]
        };
      } else {
        prompt = `You are a professional novel editor and world builder. Analyze the text pasted by user below. Detect exactly one world item/setting described and extract details into Indonesian.
TEXT COPIED FROM USER:
"${text}"

Map setting category to either 'Lokasi', 'Lore/Sejarah', 'Sistem Sihir/Fisika', 'Organisasi', 'Artefak/Benda', or 'Lainnya'. Provide rich, detailed lore if implied or stated.`;

        responseSchema = {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "Nama tempat fiksi, mitos, lore, organisasi, sistem kekuatan, atau artefak." },
            category: { type: Type.STRING, description: "Kategori fiksi, wajib bernilai salah satu dari: 'Lokasi', 'Lore/Sejarah', 'Sistem Sihir/Fisika', 'Organisasi', 'Artefak/Benda', 'Lainnya'." },
            description: { type: Type.STRING, description: "Uraian lore fiksi, mitos fiksi, detail sejarah penjelas setting." },
            notes: { type: Type.STRING, description: "Aturan logika/hukum buatan, batasan-batasan hukum fiktif." }
          },
          required: ["name", "category", "description"]
        };
      }
    }

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        systemInstruction: "Anda adalah asisten cerdas penganalisis Alur Alkitab / Bible Karakter & Dunia dari draf mentah penulis. Atur teks acak mana pun menjadi struktur data terklasifikasi rapi dalam Bahasa Indonesia sastrawi yang imersif dan logis.",
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    });

    const resultText = response.text || "{}";
    const data = JSON.parse(resultText);
    return res.json(data);

  } catch (error: any) {
    return handleAiError(error, res, "Gagal memproses deteksi bible via AI.");
  }
});


// Endpoint Auto-detect missing characters and settings in chapter draf
app.post("/api/detect-new-bible-entries", async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({ 
        error: "Gemini AI is not configured. Silakan set GEMINI_API_KEY Anda di Settings > Secrets." 
      });
    }

    const { draftText, existingCharacterNames, existingWorldItemNames } = req.body;
    if (!draftText || !draftText.trim()) {
      return res.json({ newCharacters: [], newWorldItems: [] });
    }

    const prompt = `Anda adalah editor novel profesional dan master worldbuilder. 
Tugas Anda adalah membaca draf naskah bab novel berikut ini, lalu mendeteksi:
1. Karakter fiksi/tokoh baru yg namanya belum ada (atau tidak mirip) di daftar karakter terdaftar saat ini: ${JSON.stringify(existingCharacterNames || [])}.
2. Unsur setting semesta fiksi baru (lokasi, sejarah/lore, mitos, organisasi, artefak, sihir/hukum dunia dsb.) yg belum ada (atau tidak mirip) di daftar world bible saat ini: ${JSON.stringify(existingWorldItemNames || [])}.

PENTING:
- Hanya deteksi nama/istilah baru yang benar-benar muncul dalam draf teks di bawah dan cukup signifikan untuk dimasukkan ke bible cerita. Jangan masukkan nama yang sudah ada atau yang merupakan variasi kecil dari nama yang sudah ada.
- Berikan rincian secara lengkap, imajinatif, dan mendalam dalam Bahasa Indonesia gaya novel/sastra tinggi yang memikat.
- Untuk karakter baru, buat juga bidang 'aiProfile' secara lengkap.
- Untuk world item baru, buat juga bidang 'aiProfile' secara lengkap.

DRAF NASKAH:
"${draftText}"`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        newCharacters: {
          type: Type.ARRAY,
          description: "Daftar karakter baru yang terdeteksi.",
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Nama lengkap karakter fiksi baru." },
              role: { type: Type.STRING, description: "Peran karakter, wajib salah satu dari: 'Protagonis', 'Antagonis', 'Pendukung', 'Lainnya'." },
              description: { type: Type.STRING, description: "Gambaran sifat kepribadian, penampilan visual secara detail fiksi." },
              backstory: { type: Type.STRING, description: "Latar belakang masa lalu yang diestimasi secara puitis dari narasi draf." },
              notes: { type: Type.STRING, description: "Relasi rahasia, motivasi cerita, rahasia terdalam." },
              aiProfile: {
                type: Type.OBJECT,
                properties: {
                  usia: { type: Type.STRING, description: "Saran usia karakter (contoh: '25 tahun')." },
                  tinggi: { type: Type.STRING, description: "Saran tinggi badan (contoh: '180 cm')." },
                  gender: { type: Type.STRING, description: "Gender karakter (contoh: 'Perempuan')." },
                  peranNarasi: { type: Type.STRING, description: "Fungsi/peran naratif dalam novel (contoh: 'Kunci Pengkhianatan')." },
                  jabatanCerita: { type: Type.STRING, description: "Gelar, pekerjaan, atau posisi (contoh: 'Penyair Kelana')." },
                  hubunganKarakter: { type: Type.STRING, description: "Ulasan silsilah atau keterkaitan relasional tokoh." },
                  deskripsiFisik: { type: Type.STRING, description: "Uraian visual fisik secara terperinci." },
                  sifatKarakter: { type: Type.STRING, description: "Karakteristik psikologi, kekuatan tekad, keunikan kepribadian." }
                },
                required: ["usia", "gender", "peranNarasi", "deskripsiFisik", "sifatKarakter"]
              }
            },
            required: ["name", "role", "description", "aiProfile"]
          }
        },
        newWorldItems: {
          type: Type.ARRAY,
          description: "Daftar elemen world-building baru yang terdeteksi.",
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Nama setting, lokasi, mitos, lore, organisasi, sistem kekuatan, benda pusaka baru." },
              category: { type: Type.STRING, description: "Kategori fiksi, wajib salah satu dari: 'Lokasi', 'Lore/Sejarah', 'Sistem Sihir/Fisika', 'Organisasi', 'Artefak/Benda', 'Lainnya'." },
              description: { type: Type.STRING, description: "Penjelasan mitologi, lore sejarah, penampilan visual fisik latar." },
              notes: { type: Type.STRING, description: "Logika mutlak, hukum semesta, batasan mekanika fantasi/fiksi ilmiah." },
              aiProfile: {
                type: Type.OBJECT,
                properties: {
                  definisi: { type: Type.STRING, description: "Uraian definisi mendasar yang tegas." },
                  cakupan: { type: Type.STRING, description: "Pengaruh elemen ini bagi peradaban fiksi tulisan." },
                  aturanUtama: { type: Type.STRING, description: "Prinsip mutlak hukum dunia fiksi yang berlaku." },
                  sejarah: { type: Type.STRING, description: "Mitos kuna pemicu rahasia sejarah purba." },
                  hubunganCerita: { type: Type.STRING, description: "Cara elemen setting ini bersinggungan dengan tokoh utama novel." }
                },
                required: ["definisi", "aturanUtama", "sejarah"]
              }
            },
            required: ["name", "category", "description", "aiProfile"]
          }
        }
      },
      required: ["newCharacters", "newWorldItems"]
    };

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        systemInstruction: "Anda adalah asisten super cerdas master pembaca novel dan pakar worldbuilder. Deteksi draf naskah dengan presisi dan temukan entitas bible baru yang belum dicatat.",
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    });

    const resultText = response.text || '{"newCharacters":[], "newWorldItems":[]}';
    const data = JSON.parse(resultText);
    return res.json(data);

  } catch (error: any) {
    return handleAiError(error, res, "Gagal melacak entitas bible baru via AI.");
  }
});


// Dev & Production serving
const isProd = process.env.NODE_ENV === "production";

async function setupApp() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT} (isProd: ${isProd})`);
  });
}

setupApp();
