export type ProjectType = 'solo' | 'series' | 'mini';
export type PlotHoleSeverity = 'low' | 'medium' | 'high';
export type PlotHoleStatus = 'open' | 'resolved';

export interface Project {
  id: string;
  title: string;
  synopsis: string;
  author?: string;
  genres?: string; // Comma-separated genre tags
  type: ProjectType;
  createdAt: string;
  updatedAt: string;
}

export interface Chapter {
  id: string;
  projectId: string;
  title: string;
  content: string;
  number: number;
  isProlog: boolean;
  isEpilog: boolean;
  summary: string; // Brief point summary for AI detection
  createdAt: string;
}

export interface CharacterAiProfile {
  usia: string;
  tinggi: string;
  gender: string;
  peranNarasi: string;
  jabatanCerita: string;
  hubunganKarakter: string;
  deskripsiFisik: string;
  sifatKarakter: string;
}

export interface CharacterItem {
  id: string;
  projectId: string;
  name: string;
  role: string; // 'Protagonist' | 'Antagonist' | 'Supporting' | etc.
  description: string;
  backstory: string;
  notes: string;
  aiProfile?: CharacterAiProfile;
  createdAt: string;
}

export interface WorldAiProfile {
  definisi: string;
  cakupan: string;
  aturanUtama: string;
  sejarah: string;
  hubunganCerita: string;
}

export interface WorldItem {
  id: string;
  projectId: string;
  name: string;
  category: string; // 'Location' | 'Lore' | 'Magic System' | 'Organization' | 'Other'
  description: string;
  notes: string;
  aiProfile?: WorldAiProfile;
  createdAt: string;
}

export interface PlotHole {
  id: string;
  projectId: string;
  title: string;
  description: string;
  severity: PlotHoleSeverity;
  status: PlotHoleStatus;
  resolutionNotes?: string;
  chapterIds: string[];
  characterIds: string[];
  detectedByGemini: boolean;
  suggestions?: string;
  createdAt: string;
}

export interface ChangelogItem {
  version: string;
  date: string;
  changes: string[];
}
