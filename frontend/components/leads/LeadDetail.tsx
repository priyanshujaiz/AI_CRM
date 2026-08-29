"use client";

import { Mail, Phone, Building2, User2, Layers } from "lucide-react";
import { StatusBadge } from "@/components/tables/StatusBadge";
import {
  buildLeadFields,
  dataSourceLabel,
  crmStatusLabel,
  leadCreatedDate,
  formatLeadDate,
  formatPhone,
} from "@/lib/leadFormat";
import type { Lead } from "@/lib/leads";

interface LeadDetailProps {
  lead: Lead;
}

const labelClass =
  "text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block";

const valueClass =
  "text-sm text-gray-800 dark:text-gray-200 mt-1 block break-words font-medium";

/** Full detail layout for a single lead — all contract fields. */
export function LeadDetail({ lead }: LeadDetailProps) {
  const fields = buildLeadFields(lead);

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {lead.name || "Untitled Lead"}
              </h2>
              <StatusBadge status={lead.crm_status} />
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 text-sm text-gray-600 dark:text-gray-300">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                <span className="break-all">{lead.email || "—"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                <span>{formatPhone(lead)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                <span>{lead.company || "—"}</span>
              </div>
              <div className="flex items-center gap-2">
                <User2 className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                <span>{lead.lead_owner || "—"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                <span>{dataSourceLabel(lead.data_source)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-1 text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
            <span>
              Created:{" "}
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                {formatLeadDate(leadCreatedDate(lead))}
              </span>
            </span>
            <span>
              Lead ID: <span className="font-mono">{lead.id}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Fields grid */}
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Lead Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {fields.map((field) => (
            <div
              key={field.label}
              className="rounded-xl border border-gray-100 dark:border-gray-800 p-3"
            >
              <span className={labelClass}>{field.label}</span>
              <span className={valueClass}>{field.value}</span>
            </div>
          ))}

          <div className="rounded-xl border border-gray-100 dark:border-gray-800 p-3">
            <span className={labelClass}>Location</span>
            <span className={valueClass}>
              {[lead.city, lead.state, lead.country].filter(Boolean).join(", ") || "—"}
            </span>
          </div>

          <div className="rounded-xl border border-gray-100 dark:border-gray-800 p-3">
            <span className={labelClass}>CRM Status</span>
            <span className="mt-1 block">
              <StatusBadge status={lead.crm_status} />
            </span>
            <span className="mt-1 block text-xs text-gray-400 dark:text-gray-500">
              {crmStatusLabel(lead.crm_status)}
            </span>
          </div>
        </div>
      </div>

      {/* Notes & description */}
      {(lead.crm_note || lead.description) && (
        <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm space-y-4">
          {lead.crm_note && (
            <div className="rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 p-4">
              <span className={labelClass}>CRM Note</span>
              <p className="mt-1.5 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                {lead.crm_note}
              </p>
            </div>
          )}
          {lead.description && (
            <div className="rounded-xl border border-gray-100 dark:border-gray-800 p-4">
              <span className={labelClass}>Description</span>
              <p className="mt-1.5 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                {lead.description}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
