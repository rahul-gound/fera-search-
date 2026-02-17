import { useEffect, useState } from "react";
import type { HistoryItem } from "../lib/types";
import { getHistory, clearHistory } from "../lib/history";

interface Props {
  open: boolean;
  onClose: () => void;
  onSearch: (q: string) => void;
  historyEnabled: boolean;
  onToggleHistory: () => void;
}

export default function HistoryDrawer({
  open,
  onClose,
  onSearch,
  historyEnabled,
  onToggleHistory,
}: Props) {
  const [items, setItems] = useState<HistoryItem[]>([]);

  useEffect(() => {
    if (open && historyEnabled) {
      getHistory().then(setItems);
    }
  }, [open, historyEnabled]);

  const handleClear = async () => {
    await clearHistory();
    setItems([]);
  };

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-80 max-w-[90vw] bg-white dark:bg-gray-900 shadow-xl transform transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-base font-semibold">History</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto h-[calc(100%-57px)]">
          {/* Toggle */}
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Remember history
            </span>
            <button
              role="switch"
              aria-checked={historyEnabled}
              onClick={onToggleHistory}
              className={`relative w-10 h-6 rounded-full transition-colors ${
                historyEnabled
                  ? "bg-blue-600"
                  : "bg-gray-300 dark:bg-gray-600"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  historyEnabled ? "translate-x-4" : ""
                }`}
              />
            </button>
          </label>

          {!historyEnabled && (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              History is off. No searches are stored locally.
            </p>
          )}

          {historyEnabled && items.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500">
              No history yet.
            </p>
          )}

          {historyEnabled && items.length > 0 && (
            <>
              <button
                onClick={handleClear}
                className="text-xs text-red-500 hover:underline focus:outline-none"
              >
                Clear all
              </button>
              <ul className="space-y-1">
                {items.map((item, i) => (
                  <li key={item.id ?? i}>
                    <button
                      onClick={() => {
                        onSearch(item.query);
                        onClose();
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <span className="text-sm font-medium truncate block">
                        {item.query}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        {new Date(item.time).toLocaleString()}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
            <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed">
              Sign in to sync history across devices (optional).
              All data stays local by default.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
