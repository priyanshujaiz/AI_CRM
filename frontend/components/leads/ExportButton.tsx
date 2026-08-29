"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { downloadLeadExport, type LeadsQuery } from "@/lib/leads";
import { cn } from "@/lib/utils";

interface ExportButtonProps {
  query: LeadsQuery;
  disabled?: boolean;
  className?: string;
}

/**
 * Downloads the current lead list (respecting active filters) as a CSV.
 * Falls back to a plain navigation when blob download is unavailable.
 */
export function ExportButton({ query, disabled = false, className }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    if (isExporting) return;
    setError(null);
    setIsExporting(true);
    try {
      await downloadLeadExport(query);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={cn("inline-flex flex-col items-end gap-1", className)}>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || isExporting}
        className={cn(
          "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold",
          "border transition-colors cursor-pointer disabled:pointer-events-none disabled:opacity-40",
          "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900",
          "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
        )}
      >
        {isExporting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        Export CSV
      </button>
      {error && (
        <span className="text-[11px] text-red-500 dark:text-red-400" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
