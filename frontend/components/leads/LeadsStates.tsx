"use client";

import { AlertTriangle, PackageOpen, RotateCcw } from "lucide-react";

/** Loading skeleton shown while the leads list is being fetched. */
export function LeadsLoadingSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading leads">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm animate-pulse"
        >
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-800 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-40 rounded bg-gray-200 dark:bg-gray-800" />
              <div className="h-3 w-24 rounded bg-gray-100 dark:bg-gray-800" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-6 w-20 rounded-full bg-gray-200 dark:bg-gray-800" />
            <div className="h-6 w-6 rounded bg-gray-200 dark:bg-gray-800" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Empty state shown when the list has no leads for the current filters. */
export function LeadsEmptyState({
  onReset,
  hasFilters,
}: {
  onReset?: () => void;
  hasFilters?: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-500 mb-4">
        <PackageOpen className="h-7 w-7" />
      </div>
      <h3 className="font-bold text-gray-900 dark:text-white text-base">No leads found</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-sm leading-relaxed">
        {hasFilters
          ? "No leads match your current filters. Try adjusting your search or clearing the filters."
          : "There are no leads yet. Leads will appear here once they are imported."}
      </p>
      {hasFilters && onReset && (
        <button
          type="button"
          onClick={onReset}
          className="mt-6 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90 cursor-pointer"
          style={{ backgroundColor: "#0F6E56" }}
        >
          <RotateCcw className="h-4 w-4" />
          Clear filters
        </button>
      )}
    </div>
  );
}

/** Error state shown when a request fails, with a retry button. */
export function LeadsErrorState({
  message,
  onRetry,
}: {
  message?: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 flex items-center justify-center text-red-500 dark:text-red-400 mb-4">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <h3 className="font-bold text-gray-900 dark:text-white text-base">Something went wrong</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-sm leading-relaxed">
        {message ||
          "We could not load your leads. This may be because the leads API is not reachable yet."}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90 cursor-pointer"
        style={{ backgroundColor: "#0F6E56" }}
      >
        <RotateCcw className="h-4 w-4" />
        Retry
      </button>
    </div>
  );
}
