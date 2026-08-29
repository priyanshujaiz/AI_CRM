/**
 * Typed client for the Leads API.
 *
 * Contract (stable, maintained by the persist-backend worker):
 *   Base URL: NEXT_PUBLIC_API_URL (fallback http://localhost:5000)
 *   GET  /api/leads?search=&status=&source=&page=&limit= -> { total, page, limit, leads }
 *   GET  /api/leads/:id                                -> Lead (404 when missing)
 *   GET  /api/leads/export?search=&status=&source=     -> CSV download
 */

export type CrmStatus =
  | "GOOD_LEAD_FOLLOW_UP"
  | "DID_NOT_CONNECT"
  | "BAD_LEAD"
  | "SALE_DONE"
  | "";

export type DataSource =
  | "leads_on_demand"
  | "meridian_tower"
  | "eden_park"
  | "varah_swamy"
  | "sarjapur_plots"
  | "";

export interface Lead {
  id: string;
  /** ISO string — modern camelCase field */
  createdAt: string;
  /** Legacy snake_case field (kept for backward compatibility) */
  created_at: string;
  name: string;
  email: string;
  country_code: string;
  mobile_without_country_code: string;
  company: string;
  city: string;
  state: string;
  country: string;
  lead_owner: string;
  crm_status: CrmStatus;
  crm_note: string;
  data_source: DataSource;
  possession_time: string;
  description: string;
}

/** Query params accepted by GET /api/leads and /api/leads/export. */
export interface LeadsQuery {
  search?: string;
  status?: string;
  source?: string;
  page?: number;
  limit?: number;
}

export interface LeadsListResponse {
  total: number;
  page: number;
  limit: number;
  leads: Lead[];
}

const DEFAULT_API_URL = "http://localhost:5000";

/** API base URL with trailing slashes stripped. */
export function getApiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL).replace(/\/+$/, "");
}

function toQueryString(query: LeadsQuery): string {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.status) params.set("status", query.status);
  if (query.source) params.set("source", query.source);
  if (query.page !== undefined && query.page > 0) params.set("page", String(query.page));
  if (query.limit !== undefined && query.limit > 0) params.set("limit", String(query.limit));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/** Builds the URL for the paginated/filtered list endpoint. */
export function buildListUrl(query: LeadsQuery = {}): string {
  return `${getApiBaseUrl()}/api/leads${toQueryString(query)}`;
}

/** Builds the URL for the CSV export endpoint. */
export function buildExportUrl(query: LeadsQuery = {}): string {
  return `${getApiBaseUrl()}/api/leads/export${toQueryString(query)}`;
}

/**
 * Thrown when a lead cannot be found (HTTP 404), so callers can branch
 * between "not found" and generic/network errors.
 */
export class LeadNotFoundError extends Error {
  readonly status = 404;

  constructor(id: string) {
    super(`Lead "${id}" was not found`);
    this.name = "LeadNotFoundError";
  }
}

/** Fetches the paginated list of leads. Pass an AbortSignal to cancel. */
export async function listLeads(
  query: LeadsQuery = {},
  signal?: AbortSignal
): Promise<LeadsListResponse> {
  const res = await fetch(buildListUrl(query), { signal });
  if (!res.ok) {
    throw new Error(`Failed to load leads (HTTP ${res.status})`);
  }
  return (await res.json()) as LeadsListResponse;
}

/** Fetches a single lead. Throws LeadNotFoundError on 404. */
export async function getLead(id: string, signal?: AbortSignal): Promise<Lead> {
  const url = `${getApiBaseUrl()}/api/leads/${encodeURIComponent(id)}`;
  const res = await fetch(url, { signal });
  if (res.status === 404) {
    throw new LeadNotFoundError(id);
  }
  if (!res.ok) {
    throw new Error(`Failed to load lead (HTTP ${res.status})`);
  }
  return (await res.json()) as Lead;
}

/**
 * Downloads the CSV export for the given filters.
 * Fetches the blob then triggers a browser download.
 */
export async function downloadLeadExport(
  query: LeadsQuery = {},
  filename = "leads-export.csv"
): Promise<void> {
  const res = await fetch(buildExportUrl(query));
  if (!res.ok) {
    throw new Error(`Failed to export leads (HTTP ${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
