"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
}

/**
 * Numeric pagination control. Renders prev/next plus a compact
 * page-number window. Disables itself when there is nothing to paginate.
 */
export function Pagination({ page, limit, total, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const current = Math.min(Math.max(1, page), totalPages);

  if (totalPages <= 1) {
    return null;
  }

  const goTo = (p: number) => {
    const next = Math.min(Math.max(1, p), totalPages);
    if (next !== current) onPageChange(next);
  };

  // Build a small window of page numbers around the current page.
  const windowSize = 5;
  const start = Math.max(1, current - Math.floor(windowSize / 2));
  const end = Math.min(totalPages, start + windowSize - 1);
  const visible = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  const navBtn = cn(
    "inline-flex h-8 min-w-8 items-center justify-center rounded-lg border text-sm font-medium transition-colors cursor-pointer",
    "border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400",
    "hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-white",
    "disabled:pointer-events-none disabled:opacity-40"
  );

  return (
    <nav
      className="flex items-center justify-between gap-3 flex-wrap"
      aria-label="Pagination"
    >
      <p className="text-xs text-gray-400 dark:text-gray-500" aria-live="polite">
        Showing{" "}
        <span className="font-semibold text-gray-700 dark:text-gray-300">
          {total === 0 ? 0 : (current - 1) * limit + 1}–
          {Math.min(current * limit, total)}
        </span>{" "}
        of{" "}
        <span className="font-semibold text-gray-700 dark:text-gray-300">{total}</span>
      </p>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => goTo(current - 1)}
          disabled={current <= 1}
          className={navBtn}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {start > 1 && (
          <>
            <button type="button" onClick={() => goTo(1)} className={navBtn}>
              1
            </button>
            {start > 2 && <span className="px-1 text-xs text-gray-400">…</span>}
          </>
        )}

        {visible.map((p) => {
          const active = p === current;
          return (
            <button
              key={p}
              type="button"
              onClick={() => goTo(p)}
              aria-current={active ? "page" : undefined}
              className={cn(
                navBtn,
                active
                  ? "text-white border-transparent"
                  : "bg-white dark:bg-gray-900"
              )}
              style={active ? { backgroundColor: "#0F6E56" } : {}}
            >
              {p}
            </button>
          );
        })}

        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="px-1 text-xs text-gray-400">…</span>}
            <button type="button" onClick={() => goTo(totalPages)} className={navBtn}>
              {totalPages}
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => goTo(current + 1)}
          disabled={current >= totalPages}
          className={navBtn}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
}
