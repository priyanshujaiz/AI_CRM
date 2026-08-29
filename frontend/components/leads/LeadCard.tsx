"use client";

import { useRouter } from "next/navigation";
import { ChevronRight, Mail, Phone } from "lucide-react";
import { StatusBadge } from "@/components/tables/StatusBadge";
import { leadCreatedDate, formatLeadDate, formatPhone, dataSourceLabel } from "@/lib/leadFormat";
import type { Lead } from "@/lib/leads";

interface LeadCardProps {
  lead: Lead;
}

/** Compact lead card used for list rows on small screens. */
export function LeadCard({ lead }: LeadCardProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push(`/leads/${encodeURIComponent(lead.id)}`)}
      className="w-full text-left rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm hover:bg-gray-50/40 dark:hover:bg-gray-800/20 transition-colors cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {lead.name || "—"}
            </h3>
          </div>
          <div className="mt-2 space-y-1">
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" /> {lead.email || "—"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" /> {formatPhone(lead)}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {lead.company || "—"} · {dataSourceLabel(lead.data_source)}
            </p>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600 flex-shrink-0 mt-1" />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <StatusBadge status={lead.crm_status} />
        <span className="text-[11px] text-gray-400 dark:text-gray-500">
          {formatLeadDate(leadCreatedDate(lead))}
        </span>
      </div>
    </button>
  );
}
