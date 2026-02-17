/* Cloud history sync placeholders — wire up with Supabase */

import type { HistoryItem } from "./types";

export async function saveHistory(_item: HistoryItem): Promise<void> {
  // TODO: Supabase insert
  console.info("[sync] saveHistory placeholder");
}

export async function loadHistory(): Promise<HistoryItem[]> {
  // TODO: Supabase select
  console.info("[sync] loadHistory placeholder");
  return [];
}
