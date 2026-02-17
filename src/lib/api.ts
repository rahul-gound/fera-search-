import { PROXY_BASE } from "./config";
import type { SearchResponse, SummarizeResponse } from "./types";

export async function fetchSearch(
  query: string,
  signal?: AbortSignal
): Promise<SearchResponse> {
  const url = `${PROXY_BASE}/search?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Search failed (${res.status})`);
  return res.json();
}

export async function fetchSummarize(
  query: string,
  signal?: AbortSignal
): Promise<SummarizeResponse> {
  const url = `${PROXY_BASE}/summarize?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Summarize failed (${res.status})`);
  return res.json();
}
