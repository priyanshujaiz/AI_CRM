import { describe, it, expect } from "vitest";
import { ValidationService } from "../services/validation.js";
import { CrmRecordSchema, DEFAULT_LEAD_OWNER } from "../types/crmRecord.js";
import type { CrmRecord } from "../types/crmRecord.js";

/** Minimal valid lead shape — individual tests override the fields they care about. */
const baseAiLead = {
  created_at: "2026-05-13 14:20:48",
  name: "John Doe",
  email: "john@example.com",
  country_code: "+91",
  mobile_without_country_code: "9876543210",
  company: "GrowEasy",
  city: "Mumbai",
  state: "Maharashtra",
  country: "India",
  lead_owner: "owner@ailead.com",
  crm_status: "GOOD_LEAD_FOLLOW_UP",
  crm_note: "Interested in 2BHK",
  data_source: "leads_on_demand",
  possession_time: "Ready",
  description: "Google Ad lead"
};

describe("ValidationService", () => {
  it("should successfully validate valid AI records", () => {
    const aiLeads: CrmRecord[] = [{ ...baseAiLead }];

    const rawBatch = [{ "Full Name": "John Doe", "Contact": "+91 9876543210" }];

    const { validated, skipped } = ValidationService.validateBatch(aiLeads, rawBatch, 0);

    expect(skipped).toHaveLength(0);
    expect(validated).toHaveLength(1);
    expect(validated[0]!.name).toBe("John Doe");
    expect(validated[0]!.crm_status).toBe("GOOD_LEAD_FOLLOW_UP");
  });

  it("should skip records containing neither email nor mobile number", () => {
    const aiLeads: CrmRecord[] = [
      { ...baseAiLead, name: "Anonymous", email: "", mobile_without_country_code: "", crm_status: "" }
    ];

    const rawBatch = [{ "Full Name": "Anonymous", "Contact": "" }];

    const { validated, skipped } = ValidationService.validateBatch(aiLeads, rawBatch, 0);

    expect(validated).toHaveLength(0);
    expect(skipped).toHaveLength(1);
    expect(skipped[0]!.rowIndex).toBe(1);
    expect(skipped[0]!.reason).toContain("does not contain a valid email address or mobile number");
  });

  it("should enforce allowed crm_status enums, falling back to default empty string if invalid", () => {
    const aiLeads: any[] = [
      { ...baseAiLead, name: "Test User", email: "test@mail.com", crm_status: "INVALID_STATUS_HALLUCINATED_BY_AI" }
    ];

    const rawBatch = [{ Name: "Test User", Email: "test@mail.com" }];

    const { validated, skipped } = ValidationService.validateBatch(aiLeads, rawBatch, 0);

    // Zod validator catches validation error for crm_status enum mismatch and falls back to empty string
    expect(skipped).toHaveLength(0);
    expect(validated).toHaveLength(1);
    expect(validated[0]!.crm_status).toBe("");
  });

  it("should fallback invalid dates to current timestamp", () => {
    const aiLeads: CrmRecord[] = [{ ...baseAiLead, created_at: "invalid_date_format_string" }];

    const rawBatch = [{ Name: "John", Email: "john@mail.com" }];

    const { validated, skipped } = ValidationService.validateBatch(aiLeads, rawBatch, 0);

    expect(skipped).toHaveLength(0);
    expect(validated).toHaveLength(1);
    // Invalid date was converted to YYYY-MM-DD HH:mm:ss of today
    expect(validated[0]!.created_at).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });

  it("should align AI records to raw rows via row_index even when the AI reorders rows", () => {
    const aiLeads: any[] = [
      { ...baseAiLead, name: "Jane Smith", email: "jane@example.com", row_index: 1 },
      { ...baseAiLead, name: "John Doe", email: "john@example.com", row_index: 0 }
    ];

    const rawBatch = [{ Name: "John" }, { Name: "Jane" }];

    const { validated, skipped } = ValidationService.validateBatch(aiLeads, rawBatch, 0);

    expect(skipped).toHaveLength(0);
    expect(validated).toHaveLength(2);
    // Row 1 must map to the record that claims row_index 0, not to the first array element
    expect(validated[0]!.name).toBe("John Doe");
    expect(validated[1]!.name).toBe("Jane Smith");
  });

  it("should skip raw rows the AI omitted and keep the remaining rows aligned", () => {
    const aiLeads: any[] = [
      { ...baseAiLead, name: "Alice", email: "alice@example.com", row_index: 0 }
    ];

    const rawBatch = [{ Name: "Alice" }, { Name: "Bob" }];

    const { validated, skipped } = ValidationService.validateBatch(aiLeads, rawBatch, 0);

    expect(validated).toHaveLength(1);
    expect(validated[0]!.name).toBe("Alice");
    expect(skipped).toHaveLength(1);
    expect(skipped[0]!.rowIndex).toBe(2);
    expect(skipped[0]!.reason).toContain("AI omitted");
  });

  it("should strip row_index from the final validated record", () => {
    const aiLeads: any[] = [{ ...baseAiLead, row_index: 0 }];

    const rawBatch = [{ Name: "John" }];

    const { validated } = ValidationService.validateBatch(aiLeads, rawBatch, 0);

    expect(validated).toHaveLength(1);
    expect(validated[0]!).not.toHaveProperty("row_index");
  });

  it("should apply the shared default lead owner when the AI omits it", () => {
    const aiLeads: any[] = [{ ...baseAiLead, lead_owner: undefined, row_index: 0 }];

    const rawBatch = [{ Name: "John" }];

    const { validated, skipped } = ValidationService.validateBatch(aiLeads, rawBatch, 0);

    expect(skipped).toHaveLength(0);
    expect(validated[0]!.lead_owner).toBe(DEFAULT_LEAD_OWNER);
  });
});

describe("CrmRecordSchema.created_at", () => {
  it("treats date-only YYYY-MM-DD as local midnight, not UTC", () => {
    expect(CrmRecordSchema.parse({ created_at: "2026-05-13" }).created_at).toBe("2026-05-13 00:00:00");
  });

  it("interprets day-first when the day is unambiguous (31/05/2026)", () => {
    expect(CrmRecordSchema.parse({ created_at: "31/05/2026" }).created_at).toBe("2026-05-31 00:00:00");
  });

  it("interprets month-first when the month slot is unambiguous (05/31/2026)", () => {
    expect(CrmRecordSchema.parse({ created_at: "05/31/2026" }).created_at).toBe("2026-05-31 00:00:00");
  });

  it("uses the documented day-first rule for ambiguous dates (05/06/2026 → 6 May)", () => {
    expect(CrmRecordSchema.parse({ created_at: "05/06/2026" }).created_at).toBe("2026-06-05 00:00:00");
  });

  it("supports dashed dates with two-digit years (13-05-26 → 2026-05-13)", () => {
    expect(CrmRecordSchema.parse({ created_at: "13-05-26" }).created_at).toBe("2026-05-13 00:00:00");
  });

  it("preserves a datetime parsed as local time (2026-05-13 14:20:48)", () => {
    expect(CrmRecordSchema.parse({ created_at: "2026-05-13 14:20:48" }).created_at).toBe("2026-05-13 14:20:48");
  });

  it("rejects rollover dates like 31/02/2026 and falls back to the current timestamp", () => {
    const rec = CrmRecordSchema.parse({ created_at: "31/02/2026" });
    expect(rec.created_at).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });
});