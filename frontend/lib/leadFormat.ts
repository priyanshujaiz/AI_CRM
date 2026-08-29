import type { CrmStatus, DataSource, Lead } from "./leads";

/** Friendly, human-readable labels for CRM status values. */
export const CRM_STATUS_LABELS: Record<CrmStatus, string> = {
  GOOD_LEAD_FOLLOW_UP: "Good Lead",
  DID_NOT_CONNECT: "Not Connected",
  BAD_LEAD: "Bad Lead",
  SALE_DONE: "Sale Done",
  "": "Not Set",
};

/** Friendly labels for data sources. */
export const DATA_SOURCE_LABELS: Record<DataSource, string> = {
  leads_on_demand: "Leads on Demand",
  meridian_tower: "Meridian Tower",
  eden_park: "Eden Park",
  varah_swamy: "Varah Swamy",
  sarjapur_plots: "Sarjapur Plots",
  "": "Not Set",
};

/** Full list of CRM status values for filter dropdowns (excluding empty). */
export const CRM_STATUS_OPTIONS: CrmStatus[] = [
  "GOOD_LEAD_FOLLOW_UP",
  "DID_NOT_CONNECT",
  "BAD_LEAD",
  "SALE_DONE",
];

/** Full list of data source values for filter dropdowns (excluding empty). */
export const DATA_SOURCE_OPTIONS: DataSource[] = [
  "leads_on_demand",
  "meridian_tower",
  "eden_park",
  "varah_swamy",
  "sarjapur_plots",
];

export function dataSourceLabel(source: DataSource | undefined | null): string {
  if (!source) return "Not Set";
  return DATA_SOURCE_LABELS[source] ?? source;
}

export function crmStatusLabel(status: CrmStatus | undefined | null): string {
  if (!status) return "Not Set";
  return CRM_STATUS_LABELS[status] ?? status;
}

/** Formats an ISO/legacy date string for display. */
export function formatLeadDate(value: string | undefined | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Compacts the two date fields, preferring the ISO createdAt. */
export function leadCreatedDate(lead: Lead): string {
  return lead.createdAt || lead.created_at;
}

/** Combines country code + number into a single phone string. */
export function formatPhone(lead: Lead): string {
  const cc = lead.country_code || "";
  const num = lead.mobile_without_country_code || "";
  if (!cc && !num) return "—";
  return `${cc} ${num}`.trim();
}

/** Returns a deterministic metadata row for a lead detail view. */
export interface LeadField {
  label: string;
  value: string;
  /** Optional kind for special styling (e.g. a highlighted note). */
  kind?: "note" | "default";
}

export function buildLeadFields(lead: Lead): LeadField[] {
  return [
    { label: "Name", value: lead.name || "—" },
    { label: "Email", value: lead.email || "—" },
    { label: "Phone", value: formatPhone(lead) },
    { label: "Company", value: lead.company || "—" },
    { label: "City", value: lead.city || "—" },
    { label: "State", value: lead.state || "—" },
    { label: "Country", value: lead.country || "—" },
    { label: "Lead Owner", value: lead.lead_owner || "—" },
    { label: "Source", value: dataSourceLabel(lead.data_source) },
    { label: "Possession Time", value: lead.possession_time || "—" },
  ];
}
