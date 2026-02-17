import { useCallback, useRef, useState } from "react";
import { fetchSearch, fetchSummarize } from "../lib/api";
import type {
  SearchResponse,
  SummarizeResponse,
} from "../lib/types";

interface SearchState {
  query: string;
  searchData: SearchResponse | null;
  searchLoading: boolean;
  searchError: string | null;
  aiData: SummarizeResponse | null;
  aiLoading: boolean;
  aiError: string | null;
}

const initial: SearchState = {
  query: "",
  searchData: null,
  searchLoading: false,
  searchError: null,
  aiData: null,
  aiLoading: false,
  aiError: null,
};

export function useSearch() {
  const [state, setState] = useState<SearchState>(initial);
  const searchAbort = useRef<AbortController | null>(null);
  const aiAbort = useRef<AbortController | null>(null);

  const search = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    // Abort previous requests
    searchAbort.current?.abort();
    aiAbort.current?.abort();

    const sCtrl = new AbortController();
    const aCtrl = new AbortController();
    searchAbort.current = sCtrl;
    aiAbort.current = aCtrl;

    setState({
      query: trimmed,
      searchData: null,
      searchLoading: true,
      searchError: null,
      aiData: null,
      aiLoading: true,
      aiError: null,
    });

    // Update URL
    const url = new URL(window.location.href);
    url.searchParams.set("q", trimmed);
    window.history.pushState({}, "", url.toString());

    // 1) Fetch search results first
    try {
      const data = await fetchSearch(trimmed, sCtrl.signal);
      setState((s) => ({ ...s, searchData: data, searchLoading: false }));
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setState((s) => ({
        ...s,
        searchLoading: false,
        searchError: err instanceof Error ? err.message : "Search failed",
      }));
      // Don't try AI if search fails
      setState((s) => ({ ...s, aiLoading: false }));
      return;
    }

    // 2) Then fetch AI summary (non-blocking)
    try {
      const ai = await fetchSummarize(trimmed, aCtrl.signal);
      setState((s) => ({ ...s, aiData: ai, aiLoading: false }));
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setState((s) => ({
        ...s,
        aiLoading: false,
        aiError: err instanceof Error ? err.message : "AI summary failed",
      }));
    }
  }, []);

  const retryAI = useCallback(() => {
    if (state.query) {
      aiAbort.current?.abort();
      const ctrl = new AbortController();
      aiAbort.current = ctrl;
      setState((s) => ({ ...s, aiLoading: true, aiError: null, aiData: null }));
      fetchSummarize(state.query, ctrl.signal)
        .then((ai) => setState((s) => ({ ...s, aiData: ai, aiLoading: false })))
        .catch((err) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setState((s) => ({
            ...s,
            aiLoading: false,
            aiError: err instanceof Error ? err.message : "AI summary failed",
          }));
        });
    }
  }, [state.query]);

  return { ...state, search, retryAI };
}
