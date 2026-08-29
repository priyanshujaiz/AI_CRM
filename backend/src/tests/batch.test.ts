import { describe, it, expect, vi, beforeEach } from "vitest";
import { BatchService } from "../services/batch.js";
import { AiService } from "../services/ai.js";
import type { AiMappedRecord, RawRecord } from "../types/crmRecord.js";

/**
 * BatchService.processAll is the only exported surface of batch.ts. It splits
 * raw records into chunks of 25 internally, then hands each chunk to
 * AiService.mapBatch. We keep the real chunking/validation code and mock only
 * the network boundary (the AI mapper), so these tests never touch OpenAI or
 * the network.
 */
vi.mock("../services/ai.js", () => ({
  AiService: { mapBatch: vi.fn() },
}));

const mapBatchMock = vi.mocked(AiService.mapBatch);

/** Builds a schema-valid AI record anchored to its position in the batch. */
function aiRecord(raw: RawRecord, idx: number): AiMappedRecord {
  return {
    row_index: idx,
    created_at: "2026-05-13 14:20:48",
    name: raw.Name ?? `Lead ${idx}`,
    email: `lead${idx}@example.com`,
    country_code: "+91",
    mobile_without_country_code: "9876543210",
    company: "—",
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    lead_owner: "owner@groweasy.ai",
    crm_status: "GOOD_LEAD_FOLLOW_UP",
    crm_note: "",
    data_source: "leads_on_demand",
    possession_time: "Ready",
    description: "",
  };
}

function rows(count: number): RawRecord[] {
  return Array.from({ length: count }, (_, i) => ({
    Name: `Row ${i}`,
    Email: `row${i}@example.com`,
  }));
}

beforeEach(() => {
  mapBatchMock.mockReset();
  mapBatchMock.mockImplementation(async (batch: RawRecord[]) =>
    batch.map((raw, idx) => aiRecord(raw, idx))
  );
});

describe("BatchService.processAll — chunking", () => {
  it("splits records into batches of 25 with a partial final batch (60 rows → 25/25/10)", async () => {
    const result = await BatchService.processAll(rows(60));

    expect(mapBatchMock).toHaveBeenCalledTimes(3);
    const sizes = mapBatchMock.mock.calls.map(([batch]) => batch.length);
    expect(sizes).toEqual([25, 25, 10]);

    expect(result.imported).toHaveLength(60);
    expect(result.skipped).toHaveLength(0);
  });

  it("keeps a batch of exactly 25 rows as a single batch", async () => {
    const result = await BatchService.processAll(rows(25));

    expect(mapBatchMock).toHaveBeenCalledTimes(1);
    expect(mapBatchMock.mock.calls[0]![0]).toHaveLength(25);
    expect(result.imported).toHaveLength(25);
  });

  it("handles a partial final batch smaller than 25 rows (30 rows → 25/5)", async () => {
    const result = await BatchService.processAll(rows(30));

    expect(mapBatchMock).toHaveBeenCalledTimes(2);
    const sizes = mapBatchMock.mock.calls.map(([batch]) => batch.length);
    expect(sizes).toEqual([25, 5]);
    expect(result.imported).toHaveLength(30);
  });

  it("preserves the total row count across imported and skipped records", async () => {
    // Second row yields an uncontactable record → gets skipped after validation.
    mapBatchMock.mockImplementation(async (batch: RawRecord[]) =>
      batch.map((raw, idx) => {
        const rec = aiRecord(raw, idx);
        if (raw.Skip === "yes") {
          rec.email = "";
          rec.mobile_without_country_code = "";
        }
        return rec;
      })
    );

    const raw = [
      { Name: "A", Email: "a@example.com" },
      { Name: "B", Skip: "yes" },
      { Name: "C", Email: "c@example.com" },
    ];

    const result = await BatchService.processAll(raw);

    // Every input row shows up exactly once, either imported or skipped
    expect(result.imported).toHaveLength(2);
    expect(result.skipped).toHaveLength(1);
    expect(result.imported.length + result.skipped.length).toBe(raw.length);
    expect(result.skipped[0]!.rowIndex).toBe(2);
  });

  it("reports progress through the onProgress callback", async () => {
    const onProgress = vi.fn();
    await BatchService.processAll(rows(60), onProgress);

    expect(onProgress).toHaveBeenCalledTimes(3);
    expect(onProgress.mock.calls.map(([done, total]) => `${done}/${total}`)).toEqual([
      "1/3",
      "2/3",
      "3/3",
    ]);
  });

  it("performs no AI calls and returns an empty result for zero records", async () => {
    const result = await BatchService.processAll([]);

    expect(mapBatchMock).not.toHaveBeenCalled();
    expect(result.imported).toHaveLength(0);
    expect(result.skipped).toHaveLength(0);
  });
});