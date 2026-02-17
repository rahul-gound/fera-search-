/* ---------- Search API ---------- */

export interface SearchResult {
  title: string;
  url: string;
  content?: string;
  engine?: string;
  engines?: string[];
  thumbnail?: string;
  img_src?: string;
  parsed_url?: string[];
  category?: string;
  score?: number;
}

export interface Infobox {
  infobox: string;
  id?: string;
  content?: string;
  img_src?: string;
  urls?: { title: string; url: string }[];
  engine?: string;
  engines?: string[];
}

export interface SearchData {
  results: SearchResult[];
  infoboxes?: Infobox[];
  suggestions?: string[];
}

export interface SearchResponse {
  query: string;
  upstream: string;
  data: SearchData;
}

/* ---------- AI Summary API ---------- */

export interface AISummary {
  summary: string;
  key_points: string[];
  best_sources: { title: string; url: string }[];
  follow_up_queries: string[];
}

export interface SummarizeResponse {
  query: string;
  upstream: string;
  ai: AISummary;
}

/* ---------- History ---------- */

export interface HistoryItem {
  id?: number;
  query: string;
  time: number;
  top3: { title: string; url: string }[];
}
