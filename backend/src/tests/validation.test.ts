import { describe, it, expect } from "vitest";
import { ValidationService } from "../services/validation.js";
import type { CrmRecord } from "../types/crmRecord.js";

describe("ValidationService", () => {
  it("should successfully validate valid AI records", () => {
    const aiLeads: CrmRecord[] = [
      {
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
      }
    ];

    const rawBatch = [{ "Full Name": "John Doe", "Contact": "+91 9876543210" }];

    const { validated, skipped } = ValidationService.validateBatch(aiLeads, rawBatch, 0);

    expect(skipped).toHaveLength(0);
    expect(validated).toHaveLength(1);
    expect(validated[0]!.name).toBe("John Doe");
    expect(validated[0]!.crm_status).toBe("GOOD_LEAD_FOLLOW_UP");
  });

  it("should skip records containing neither email nor mobile number", () => {
    const aiLeads: CrmRecord[] = [
      {
        created_at: "2026-05-13 14:20:48",
        name: "Anonymous",
        email: "",
        country_code: "",
        mobile_without_country_code: "",
        company: "—",
        city: "—",
        state: "—",
        country: "—",
        lead_owner: "owner@ailead.com",
        crm_status: "",
        crm_note: "Omitted contact info",
        data_source: "",
        possession_time: "—",
        description: "—"
      }
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
      {
        created_at: "2026-05-13 14:20:48",
        name: "Test User",
        email: "test@mail.com",
        country_code: "",
        mobile_without_country_code: "",
        company: "—",
        city: "—",
        state: "—",
        country: "—",
        lead_owner: "owner@ailead.com",
        crm_status: "INVALID_STATUS_HALLUCINATED_BY_AI", // Invalid status
        crm_note: "",
        data_source: "eden_park",
        possession_time: "—",
        description: "—"
      }
    ];

    const rawBatch = [{ Name: "Test User", Email: "test@mail.com" }];

    const { validated, skipped } = ValidationService.validateBatch(aiLeads, rawBatch, 0);

    // Zod validator catches validation error for crm_status enum mismatch and falls back to empty string
    expect(skipped).toHaveLength(0);
    expect(validated).toHaveLength(1);
    expect(validated[0]!.crm_status).toBe("");
  });

  it("should fallback invalid dates to current timestamp", () => {
    const aiLeads: CrmRecord[] = [
      {
        created_at: "invalid_date_format_string",
        name: "John",
        email: "john@mail.com",
        country_code: "",
        mobile_without_country_code: "",
        company: "—",
        city: "—",
        state: "—",
        country: "—",
        lead_owner: "owner@ailead.com",
        crm_status: "",
        crm_note: "",
        data_source: "",
        possession_time: "—",
        description: "—"
      }
    ];

    const rawBatch = [{ Name: "John", Email: "john@mail.com" }];

    const { validated, skipped } = ValidationService.validateBatch(aiLeads, rawBatch, 0);

    expect(skipped).toHaveLength(0);
    expect(validated).toHaveLength(1);
    // Invalid date was converted to YYYY-MM-DD HH:mm:ss of today
    expect(validated[0]!.created_at).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });
});
