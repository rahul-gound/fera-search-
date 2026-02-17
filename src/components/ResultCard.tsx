import type { SearchResult } from "../lib/types";

function engineColor(engine: string): string {
  const map: Record<string, string> = {
    google: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    brave: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    duckduckgo: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    startpage: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    bing: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
    wikipedia: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  };
  return map[engine.toLowerCase()] ?? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

interface Props {
  result: SearchResult;
}

export default function ResultCard({ result }: Props) {
  const engines = result.engines ?? (result.engine ? [result.engine] : []);

  return (
    <article className="group rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex gap-4">
        <div className="flex-1 min-w-0">
          {/* URL */}
          <p className="text-xs text-gray-400 dark:text-gray-500 truncate mb-1">
            {getDomain(result.url)}
          </p>

          {/* Title */}
          <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-base sm:text-lg font-semibold text-blue-700 dark:text-blue-400 hover:underline decoration-blue-300 dark:decoration-blue-600 underline-offset-2 leading-snug line-clamp-2 focus:outline-none focus:ring-2 focus:ring-blue-500/40 rounded"
          >
            {result.title || "Untitled"}
          </a>

          {/* Snippet */}
          {result.content && (
            <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-3">
              {result.content}
            </p>
          )}

          {/* Engine badges */}
          {engines.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {engines.map((eng) => (
                <span
                  key={eng}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${engineColor(eng)}`}
                >
                  {eng}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Thumbnail */}
        {(result.thumbnail || result.img_src) && (
          <img
            src={result.thumbnail ?? result.img_src}
            alt=""
            loading="lazy"
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover flex-shrink-0 bg-gray-100 dark:bg-gray-800"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        )}
      </div>
    </article>
  );
}
