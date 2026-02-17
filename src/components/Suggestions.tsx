interface Props {
  suggestions: string[];
  onSearch: (q: string) => void;
}

export default function Suggestions({ suggestions, onSearch }: Props) {
  if (!suggestions.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <span className="text-xs text-gray-400 dark:text-gray-500 self-center mr-1">
        Related:
      </span>
      {suggestions.map((s, i) => (
        <button
          key={i}
          onClick={() => onSearch(s)}
          className="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        >
          {s}
        </button>
      ))}
    </div>
  );
}
