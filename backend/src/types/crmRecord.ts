import { z } from "zod";

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

// Zod Schema to validate and clean AI output
export const CrmRecordSchema = z.object({
  created_at: z.string().transform((val) => {
    const cleaned = val.trim();
    if (!cleaned) {
      const now = new Date();
      return now.toISOString().replace("T", " ").substring(0, 19);
    }

    // 1. Try standard new Date()
    let parsedDate = new Date(cleaned);

    // 2. If invalid, try DD/MM/YYYY or DD-MM-YYYY formats
    if (isNaN(parsedDate.getTime())) {
      const dmyMatch = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
      if (dmyMatch) {
        const day = parseInt(dmyMatch[1] || "", 10);
        const month = parseInt(dmyMatch[2] || "", 10) - 1; // 0-indexed in JS
        const year = parseInt(dmyMatch[3] || "", 10);
        const hour = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0;
        const minute = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
        const second = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;

        parsedDate = new Date(year, month, day, hour, minute, second);
      }
    }

    // 3. Fallback to current time if still invalid
    if (isNaN(parsedDate.getTime())) {
      const now = new Date();
      return now.toISOString().replace("T", " ").substring(0, 19);
    }

    // 4. Return unified format YYYY-MM-DD HH:mm:ss
    const yyyy = parsedDate.getFullYear();
    const mm = String(parsedDate.getMonth() + 1).padStart(2, "0");
    const dd = String(parsedDate.getDate()).padStart(2, "0");
    const hh = String(parsedDate.getHours()).padStart(2, "0");
    const min = String(parsedDate.getMinutes()).padStart(2, "0");
    const ss = String(parsedDate.getSeconds()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
  }),
  name: z.string().default("—"),
  email: z.string().email().catch(""),
  country_code: z.string().default(""),
  mobile_without_country_code: z.string().default(""),
  company: z.string().default("—"),
  city: z.string().default("—"),
  state: z.string().default("—"),
  country: z.string().default("—"),
  lead_owner: z.string().email().catch("owner@ailead.com"),
  crm_status: z.enum(CRM_STATUS_ENUM).catch(""),
  crm_note: z.string().default(""),
  data_source: z.enum(DATA_SOURCE_ENUM).catch(""),
  possession_time: z.string().default("—"),
  description: z.string().default("—"),
});

export type CrmRecord = z.infer<typeof CrmRecordSchema>;

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
