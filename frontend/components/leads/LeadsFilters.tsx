"use client";

import { Search, X } from "lucide-react";
import {
  CRM_STATUS_OPTIONS,
  DATA_SOURCE_OPTIONS,
  crmStatusLabel,
  dataSourceLabel,
} from "@/lib/leadFormat";

interface LeadsFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  status: string;
  onStatusChange: (value: string) => void;
  source: string;
  onSourceChange: (value: string) => void;
}

/** Toolbar controlling search + CRM status + data source filters. */
export function LeadsFilters({
  search,
  onSearchChange,
  onSearchSubmit,
  status,
  onStatusChange,
  source,
  onSourceChange,
}: LeadsFiltersProps) {
  const selectClass =
    "h-9 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 " +
    "px-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 " +
    "focus:ring-brand focus:border-brand transition-colors";

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      {/* Search */}
      <form
        className="relative w-full lg:max-w-xs"
        onSubmit={(e) => {
          e.preventDefault();
          onSearchSubmit();
        }}
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search leads..."
          className="w-full pl-9 pr-9 py-2 rounded-full border border-gray-200 dark:border-gray-800 text-sm bg-gray-50/50 dark:bg-gray-950/50 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-950 focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-colors"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </form>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <label className="flex flex-col gap-1 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          Status
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            className={selectClass}
          >
            <option value="">All statuses</option>
            {CRM_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {crmStatusLabel(s)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          Source
          <select
            value={source}
            onChange={(e) => onSourceChange(e.target.value)}
            className={selectClass}
          >
            <option value="">All sources</option>
            {DATA_SOURCE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {dataSourceLabel(s)}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
