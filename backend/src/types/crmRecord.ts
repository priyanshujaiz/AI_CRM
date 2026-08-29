import { z } from "zod";

// Default lead owner email used whenever a row has no assignee.
// Single source of truth shared by the prompt, the Zod schema, and the few-shot examples.
export const DEFAULT_LEAD_OWNER = "owner@groweasy.ai";

// CRM Status Allowed Enums
export const CRM_STATUS_ENUM = [
  "GOOD_LEAD_FOLLOW_UP",
  "DID_NOT_CONNECT",
  "BAD_LEAD",
  "SALE_DONE",
  ""
] as const;

// Data Source Allowed Enums
export const DATA_SOURCE_ENUM = [
  "leads_on_demand",
  "meridian_tower",
  "eden_park",
  "varah_swamy",
  "sarjapur_plots",
  ""
] as const;

/**
 * Formats a Date as "YYYY-MM-DD HH:mm:ss" using LOCAL time.
 * Used everywhere so the output never silently shifts between UTC and local time.
 */
function formatLocalDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

/**
 * Parses slash/dash/dot separated numeric dates: 13/05/2026, 13-05-26, 13.05.2026.
 * Optionally accepts a trailing time: "13/05/2026 14:20:00".
 *
 * Disambiguation rules (documented, deterministic):
 *  - If only one of the two leading numbers can be a month, use the other as the day
 *    (e.g. 31/05/2026 → day-first, 05/31/2026 → month-first).
 *  - If both numbers are ≤ 12 the format is ambiguous → interpreted day-first (DD/MM/YYYY).
 *
 * Returns Date(NaN) when the pattern matches but the values are invalid (e.g. 31/02/2026).
 */
function parseNumericDate(cleaned: string): Date {
  const match = cleaned.match(
    /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (!match) return new Date(NaN);

  const first = Number(match[1]);
  const second = Number(match[2]);
  const yearRaw = match[3] ?? "";
  const hour = match[4] ? Number(match[4]) : 0;
  const minute = match[5] ? Number(match[5]) : 0;
  const sec = match[6] ? Number(match[6]) : 0;

  if (hour > 23 || minute > 59 || sec > 59) return new Date(NaN);

  const year = yearRaw.length === 2 ? 2000 + Number(yearRaw) : Number(yearRaw);

  let day: number;
  let month: number;
  if (first > 12 && second <= 12) {
    day = first;
    month = second; // e.g. 31/05/2026 — definitely DD/MM
  } else if (second > 12 && first <= 12) {
    day = second;
    month = first; // e.g. 05/31/2026 — definitely MM/DD
  } else {
    day = first;
    month = second; // ambiguous (both ≤ 12) → documented day-first rule
  }

  const date = new Date(year, month - 1, day, hour, minute, sec);

  // Reject rollovers (31/02 → Mar 3) and out-of-range month/day values
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return new Date(NaN);
  }
  return date;
}

// Zod Schema to validate and clean AI output
export const CrmRecordSchema = z.object({
  created_at: z.string().transform((val) => {
    const cleaned = val.trim();
    if (!cleaned) {
      return formatLocalDate(new Date());
    }

    // 1. Date-only YYYY-MM-DD / YYYY/MM/DD → local midnight.
    //    Avoids `new Date()` interpreting the bare string as UTC and shifting the day.
    const dateOnly = cleaned.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
    if (dateOnly) {
      const year = Number(dateOnly[1]);
      const month = Number(dateOnly[2]);
      const day = Number(dateOnly[3]);
      const dt = new Date(year, month - 1, day);
      if (dt.getFullYear() === year && dt.getMonth() === month - 1 && dt.getDate() === day) {
        return formatLocalDate(dt);
      }
      return formatLocalDate(new Date());
    }

    // 2. Explicit numeric dates (DD/MM/YYYY, MM/DD/YYYY, DD-MM-YY, ...) — deterministic rules
    const numeric = parseNumericDate(cleaned);
    if (!isNaN(numeric.getTime())) {
      return formatLocalDate(numeric);
    }

    // 3. Everything else (ISO strings, "May 13 2026", "13 May 2026", date-time strings)
    const parsedDate = new Date(cleaned);

    // 4. Fallback to current time if still invalid
    if (isNaN(parsedDate.getTime())) {
      return formatLocalDate(new Date());
    }

    // 5. Unified local-time format YYYY-MM-DD HH:mm:ss
    return formatLocalDate(parsedDate);
  }),
  name: z.string().default("—"),
  email: z.string().email().catch(""),
  country_code: z.string().default(""),
  mobile_without_country_code: z.string().default(""),
  company: z.string().default("—"),
  city: z.string().default("—"),
  state: z.string().default("—"),
  country: z.string().default("—"),
  lead_owner: z.string().email().catch(DEFAULT_LEAD_OWNER),
  crm_status: z.enum(CRM_STATUS_ENUM).catch(""),
  crm_note: z.string().default(""),
  data_source: z.enum(DATA_SOURCE_ENUM).catch(""),
  possession_time: z.string().default("—"),
  description: z.string().default("—"),
});

export type CrmRecord = z.infer<typeof CrmRecordSchema>;

/**
 * A record as returned by the AI mapper, before validation.
 * `row_index` anchors each lead to its original position in the input batch so that
 * validation can stay aligned even if the AI reorders or omits rows.
 * It is stripped by the Zod schema (unknown key) and never reaches the CRM output.
 */
export interface AiMappedRecord extends CrmRecord {
  row_index?: number;
}

export interface RawRecord {
  [key: string]: string;
}

export interface SkippedRecord {
  rowIndex: number;
  raw: RawRecord;
  reason: string;
}

export interface ImportBatchResult {
  imported: CrmRecord[];
  skipped: SkippedRecord[];
}

export interface ImportResponse {
  success: boolean;
  totalRows: number;
  totalImported: number;
  totalSkipped: number;
  imported: CrmRecord[];
  skipped: SkippedRecord[];
}
