import { useEffect, useState, useCallback } from "react";
import Header from "./components/Header";
import SearchBar from "./components/SearchBar";
import ResultCard from "./components/ResultCard";
import AIPanel from "./components/AIPanel";
import Infobox from "./components/Infobox";
import Suggestions from "./components/Suggestions";
import HistoryDrawer from "./components/HistoryDrawer";
import SignInModal from "./components/SignInModal";
import { SkeletonCard } from "./components/Skeletons";
import { useTheme } from "./hooks/useTheme";
import { useSearch } from "./hooks/useSearch";
import { addHistoryItem } from "./lib/history";

export default function App() {
  const { theme, toggle } = useTheme();
  const {
    query,
    searchData,
    searchLoading,
    searchError,
    aiData,
    aiLoading,
    aiError,
    search,
    retryAI,
  } = useSearch();

  const [historyOpen, setHistoryOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [historyEnabled, setHistoryEnabled] = useState(() => {
    return localStorage.getItem("fera-history") === "on";
  });
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);

  // Toggle history preference
  const toggleHistory = useCallback(() => {
    setHistoryEnabled((prev) => {
      const next = !prev;
      localStorage.setItem("fera-history", next ? "on" : "off");
      return next;
    });
  }, []);

  // Handle search and save history
  const handleSearch = useCallback(
    (q: string) => {
      search(q);
    },
    [search]
  );

  // Save to history when search completes
  useEffect(() => {
    if (historyEnabled && searchData && query) {
      const top3 = searchData.data.results.slice(0, 3).map((r) => ({
        title: r.title,
        url: r.url,
      }));
      addHistoryItem({ query, time: Date.now(), top3 });
    }
  }, [searchData, query, historyEnabled]);

  // Auto-open AI drawer on mobile when AI loads
  useEffect(() => {
    if (aiData && !aiLoading && window.innerWidth < 768) {
      setAiDrawerOpen(true);
    }
  }, [aiData, aiLoading]);

  // Read initial query from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    if (q) handleSearch(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const results = searchData?.data?.results ?? [];
  const infoboxes = searchData?.data?.infoboxes ?? [];
  const suggestions = searchData?.data?.suggestions ?? [];
  const hasQuery = query.length > 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        theme={theme}
        onToggle={toggle}
        onHistoryOpen={() => setHistoryOpen(true)}
        onSignIn={() => setSignInOpen(true)}
      />

      {/* Search bar area */}
      <div className="px-4 sm:px-6 pt-6 pb-4 max-w-7xl mx-auto w-full">
        <SearchBar initialQuery={query} onSearch={handleSearch} />
      </div>

      {/* Main content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 pb-8">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left panel — Results (70%) */}
          <div className="w-full md:w-[70%] space-y-4">
            {/* Infoboxes */}
            {infoboxes.map((ib, i) => (
              <Infobox key={i} infobox={ib} />
            ))}

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <Suggestions suggestions={suggestions} onSearch={handleSearch} />
            )}

            {/* Loading skeletons */}
            {searchLoading && (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            )}

            {/* Error */}
            {searchError && (
              <div className="rounded-2xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20 p-5 text-center space-y-3">
                <p className="text-sm text-red-600 dark:text-red-400">
                  Something went wrong. Please try again.
                </p>
                <button
                  onClick={() => handleSearch(query)}
                  className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500/40 rounded"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Results */}
            {!searchLoading && !searchError && results.length > 0 && (
              <div className="space-y-3">
                {results.map((r, i) => (
                  <ResultCard key={`${r.url}-${i}`} result={r} />
                ))}
              </div>
            )}

            {/* Empty state */}
            {!searchLoading && !searchError && hasQuery && results.length === 0 && searchData && (
              <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 text-center">
                <p className="text-gray-400 dark:text-gray-500 text-sm">
                  No results found for "{query}"
                </p>
              </div>
            )}

            {/* Welcome state */}
            {!hasQuery && (
              <div className="text-center py-16 space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 mx-auto flex items-center justify-center">
                  <span className="text-white font-bold text-2xl">F</span>
                </div>
                <h1 className="text-2xl font-semibold">
                  Search privately with <span className="text-blue-600 dark:text-blue-400">Fera</span>
                </h1>
                <p className="text-gray-400 dark:text-gray-500 text-sm max-w-md mx-auto">
                  Fast metasearch with AI-powered summaries.
                  No tracking, no personal data collected.
                </p>
              </div>
            )}
          </div>

          {/* Right panel — AI (30%) — hidden on mobile, use drawer */}
          <aside className="hidden md:block w-full md:w-[30%] md:sticky md:top-20 md:self-start">
            <AIPanel
              hasQuery={hasQuery}
              loading={aiLoading}
              error={aiError}
              data={aiData}
              onRetry={retryAI}
              onSearch={handleSearch}
            />
          </aside>
        </div>
      </main>

      {/* Mobile AI drawer toggle */}
      {hasQuery && (
        <div className="md:hidden fixed bottom-4 left-4 right-4 z-30">
          <button
            onClick={() => setAiDrawerOpen(!aiDrawerOpen)}
            className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium shadow-lg transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.381z" />
            </svg>
            AI Summary
            {aiLoading && (
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            )}
          </button>
        </div>
      )}

      {/* Mobile AI drawer */}
      {aiDrawerOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/20 dark:bg-black/40 backdrop-blur-sm"
            onClick={() => setAiDrawerOpen(false)}
          />
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 max-h-[80vh] overflow-y-auto rounded-t-3xl bg-white dark:bg-gray-900 shadow-xl p-5 pb-8">
            <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-700 mx-auto mb-4" />
            <AIPanel
              hasQuery={hasQuery}
              loading={aiLoading}
              error={aiError}
              data={aiData}
              onRetry={retryAI}
              onSearch={(q) => {
                setAiDrawerOpen(false);
                handleSearch(q);
              }}
            />
          </div>
        </>
      )}

      {/* History drawer */}
      <HistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onSearch={handleSearch}
        historyEnabled={historyEnabled}
        onToggleHistory={toggleHistory}
      />

      {/* Sign in modal */}
      <SignInModal open={signInOpen} onClose={() => setSignInOpen(false)} />
    </div>
  );
}
