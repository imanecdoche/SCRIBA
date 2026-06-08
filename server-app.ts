import express from "express";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();

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

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
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
    console.error("Error detecting plot holes:", error);
    return res.status(500).json({ error: error.message || "Gagal melakukan deteksi plot hole." });
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

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
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
    console.error("Error generating character profile:", error);
    return res.status(500).json({ error: error.message || "Gagal membuat profil AI karakter." });
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

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
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
    console.error("Error generating world profile:", error);
    return res.status(500).json({ error: error.message || "Gagal membuat resume AI aturan dunia." });
  }
});

export default app;
