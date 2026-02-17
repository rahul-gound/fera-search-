import type { SummarizeResponse } from "../lib/types";
import { SkeletonAI } from "./Skeletons";

interface Props {
  hasQuery: boolean;
  loading: boolean;
  error: string | null;
  data: SummarizeResponse | null;
  onRetry: () => void;
  onSearch: (q: string) => void;
}

export default function AIPanel({
  hasQuery,
  loading,
  error,
  data,
  onRetry,
  onSearch,
}: Props) {
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 sm:p-6">
      <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
        <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.381z" />
        </svg>
        AI Summary
      </h2>

      {/* Idle state */}
      {!hasQuery && (
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Search to see an AI summary
        </p>
      )}

      {/* Loading */}
      {hasQuery && loading && <SkeletonAI />}

      {/* Error */}
      {hasQuery && !loading && error && (
        <div className="space-y-3">
          <p className="text-sm text-red-500 dark:text-red-400">AI not available</p>
          <button
            onClick={onRetry}
            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500/40 rounded"
          >
            Retry
          </button>
        </div>
      )}

      {/* Success */}
      {hasQuery && !loading && !error && data?.ai && (
        <div className="space-y-5 text-sm">
          {/* Summary */}
          <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
            {data.ai.summary}
          </div>

          {/* Key points */}
          {data.ai.key_points?.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                Key Points
              </h3>
              <div className="flex flex-wrap gap-2">
                {data.ai.key_points.map((point, i) => (
                  <span
                    key={i}
                    className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                  >
                    {point}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Best sources */}
          {data.ai.best_sources?.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                Best Sources
              </h3>
              <ul className="space-y-1.5">
                {data.ai.best_sources.map((src, i) => (
                  <li key={i}>
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline underline-offset-2 truncate block"
                    >
                      {src.title || src.url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Follow-up queries */}
          {data.ai.follow_up_queries?.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                Related Searches
              </h3>
              <div className="flex flex-wrap gap-2">
                {data.ai.follow_up_queries.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => onSearch(q)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Privacy label */}
          <p className="text-[11px] text-gray-400 dark:text-gray-500 pt-2 border-t border-gray-100 dark:border-gray-800">
            Generated from top results (no personal tracking)
          </p>
        </div>
      )}
    </div>
  );
}
