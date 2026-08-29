"use client";

import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { StatusBadge } from "@/components/tables/StatusBadge";
import {
  leadCreatedDate,
  formatLeadDate,
  formatPhone,
  dataSourceLabel,
} from "@/lib/leadFormat";
import type { Lead } from "@/lib/leads";

interface LeadsTableProps {
  leads: Lead[];
}

const headerCell =
  "text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-6 py-4 whitespace-nowrap sticky top-0 bg-gray-50 dark:bg-gray-900 z-10";

/** Responsive table of leads with a sticky header. Rows link to the detail page. */
export function LeadsTable({ leads }: LeadsTableProps) {
  const router = useRouter();

  if (leads.length === 0) {
    return null;
  }

  return (
    <div className="overflow-auto max-h-[70vh]">
      <table className="w-full text-left border-collapse min-w-[900px]">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-800">
            <th className={headerCell}>Lead Name</th>
            <th className={headerCell}>Email</th>
            <th className={headerCell}>Contact</th>
            <th className={headerCell}>Date Created</th>
            <th className={headerCell}>Company</th>
            <th className={headerCell}>Status</th>
            <th className={headerCell}>Source</th>
            <th className={`${headerCell} text-right`}>View</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {leads.map((lead) => (
            <tr
              key={lead.id}
              onClick={() => router.push(`/leads/${encodeURIComponent(lead.id)}`)}
              className="hover:bg-gray-50/30 dark:hover:bg-gray-800/10 transition-colors cursor-pointer group"
            >
              <td className="px-6 py-4 text-xs font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                {lead.name || "—"}
              </td>
              <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {lead.email || "—"}
              </td>
              <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {formatPhone(lead)}
              </td>
              <td className="px-6 py-4 text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                {formatLeadDate(leadCreatedDate(lead))}
              </td>
              <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {lead.company || "—"}
              </td>
              <td className="px-6 py-4 text-xs whitespace-nowrap">
                <StatusBadge status={lead.crm_status} />
              </td>
              <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {dataSourceLabel(lead.data_source)}
              </td>
              <td className="px-6 py-4 text-xs text-right whitespace-nowrap">
                <ChevronRight className="inline h-4 w-4 text-gray-300 dark:text-gray-600 group-hover:text-brand transition-colors" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
