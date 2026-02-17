export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-3">
      <div className="skeleton h-3 w-32 rounded" />
      <div className="skeleton h-5 w-3/4 rounded" />
      <div className="skeleton h-3 w-full rounded" />
      <div className="skeleton h-3 w-5/6 rounded" />
      <div className="flex gap-2 pt-1">
        <div className="skeleton h-5 w-16 rounded-md" />
        <div className="skeleton h-5 w-14 rounded-md" />
      </div>
    </div>
  );
}

export function SkeletonAI() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Thinking…</span>
      </div>
      <div className="skeleton h-4 w-full rounded" />
      <div className="skeleton h-4 w-5/6 rounded" />
      <div className="skeleton h-4 w-4/6 rounded" />
      <div className="skeleton h-4 w-full rounded mt-4" />
      <div className="skeleton h-4 w-3/4 rounded" />
      <div className="flex gap-2 mt-4">
        <div className="skeleton h-7 w-20 rounded-full" />
        <div className="skeleton h-7 w-24 rounded-full" />
        <div className="skeleton h-7 w-16 rounded-full" />
      </div>
    </div>
  );
}
