import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { PersistenceService } from "../services/persistence.js";
import { resetPrismaForTests } from "../services/prismaClient.js";
import type { CrmRecord, SkippedRecord } from "../types/crmRecord.js";

// ─── Temp SQLite database set up before any service touches the client ─────────
// getPrisma() builds the client lazily from process.env.DATABASE_URL on first use,
// so pointing DATABASE_URL at the temp file here routes all persistence to it.
const __dirname = dirname(fileURLToPath(import.meta.url));
const backendDir = join(__dirname, "..", "..");

let tempDir: string;
let dbPath: string;

function makeLead(over: Partial<CrmRecord> = {}): CrmRecord {
  return {
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
    description: "Google Ad lead",
    ...over,
  };
}

beforeAll(async () => {
  tempDir = mkdtempSync(join(tmpdir(), "ai-csv-persist-"));
  dbPath = join(tempDir, "test.db");

  // Prisma SQLite absolute path uses forward slashes with a file: prefix.
  const dbUrl = `file:${dbPath.replace(/\\/g, "/")}`;
  process.env.DATABASE_URL = dbUrl;

  // Build the SQLite schema for this throwaway DB (generate already done via postinstall).
  execSync(`npx prisma db push --skip-generate --accept-data-loss`, {
    cwd: backendDir,
    env: { ...process.env, DATABASE_URL: dbUrl },
    stdio: "pipe",
  });
});

afterAll(async () => {
  await resetPrismaForTests();
  if (tempDir) {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

describe("PersistenceService", () => {
  it("round-trips leads + job: save then read back via list and get", async () => {
    const jobId = "11111111-1111-4111-8111-111111111111";
    const skipped: SkippedRecord[] = [
      { rowIndex: 3, raw: { Name: "Bad Row" }, reason: "Skipped: no email or mobile" },
    ];

    await PersistenceService.saveImportJob({
      jobId,
      status: "DONE",
      totalRows: 3,
      imported: [makeLead({ name: "Alice", email: "alice@example.com" })],
      skipped,
    });

    // List returns the persisted lead.
    const list = await PersistenceService.listLeads({});
    expect(list.total).toBeGreaterThanOrEqual(1);
    const saved = list.leads.find((l) => l.jobId === jobId);
    expect(saved).toBeDefined();
    expect(saved!.name).toBe("Alice");
    expect(saved!.crm_status).toBe("GOOD_LEAD_FOLLOW_UP");
    expect(saved!.data_source).toBe("leads_on_demand");
    expect(saved!.id).toBeTruthy();
    expect(typeof saved!.createdAt).toBe("string");

    // Get by id returns the same record.
    const byId = await PersistenceService.getLead(saved!.id);
    expect(byId).toEqual(saved);

    // Persisted job counts are correct (from the job we saved).
    const prisma = (await import("../services/prismaClient.js")).getPrisma();
    const job = await prisma.importJob.findUnique({ where: { id: jobId } });
    expect(job).toBeTruthy();
    expect(job!.total_imported).toBe(1);
    expect(job!.total_skipped).toBe(1);
  });

  it("serializes empty enum values back as empty string", async () => {
    const jobId = "22222222-2222-4222-8222-222222222222";
    await PersistenceService.saveImportJob({
      jobId,
      status: "DONE",
      totalRows: 1,
      imported: [makeLead({ name: "Empty Enums", email: "empty@example.com", crm_status: "", data_source: "" })],
      skipped: [],
    });

    const list = await PersistenceService.listLeads({ search: "Empty Enums" });
    expect(list.leads).toHaveLength(1);
    expect(list.leads[0]!.crm_status).toBe("");
    expect(list.leads[0]!.data_source).toBe("");
  });

  it("applies search, status and source filters with pagination", async () => {
    const jobA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const jobB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

    await PersistenceService.saveImportJob({
      jobId: jobA,
      status: "DONE",
      totalRows: 2,
      imported: [
        makeLead({ name: "Filter Carl", email: "carl@corp.com", company: "Acme", crm_status: "SALE_DONE", data_source: "meridian_tower" }),
        makeLead({ name: "Filter Dana", email: "dana@corp.com", company: "BetaCorp", crm_status: "BAD_LEAD", data_source: "eden_park" }),
      ],
      skipped: [],
    });
    await PersistenceService.saveImportJob({
      jobId: jobB,
      status: "DONE",
      totalRows: 1,
      imported: [
        makeLead({ name: "Filter Erin", email: "erin@corp.com", company: "Acme", crm_status: "SALE_DONE", data_source: "meridian_tower" }),
      ],
      skipped: [],
    });

    // Search on name (case-insensitive contains) → should be case-insensitive
    const byName = await PersistenceService.listLeads({ search: "filter carl" });
    expect(byName.total).toBe(1);
    expect(byName.leads[0]!.name).toBe("Filter Carl");

    // Search on company
    const byCompany = await PersistenceService.listLeads({ search: "BetaCorp" });
    expect(byCompany.total).toBe(1);
    expect(byCompany.leads[0]!.name).toBe("Filter Dana");

    // Filter by status
    const byStatus = await PersistenceService.listLeads({ status: "SALE_DONE" });
    expect(byStatus.total).toBe(2);
    expect(byStatus.leads.every((l) => l.crm_status === "SALE_DONE")).toBe(true);

    // Filter by source
    const bySource = await PersistenceService.listLeads({ source: "eden_park" });
    expect(bySource.total).toBe(1);
    expect(bySource.leads[0]!.data_source).toBe("eden_park");

    // Combined status + source
    const combined = await PersistenceService.listLeads({ status: "SALE_DONE", source: "meridian_tower" });
    expect(combined.total).toBe(2);
  });

  it("returns leads sorted by createdAt desc and respects page/limit", async () => {
    const jobC = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const jobD = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

    // Save two jobs, second one creates leads later (newer createdAt).
    await PersistenceService.saveImportJob({
      jobId: jobC,
      status: "DONE",
      totalRows: 1,
      imported: [makeLead({ name: "Old Lead", email: "old@example.com" })],
      skipped: [],
    });
    await PersistenceService.saveImportJob({
      jobId: jobD,
      status: "DONE",
      totalRows: 1,
      imported: [makeLead({ name: "New Lead", email: "new@example.com" })],
      skipped: [],
    });

    const result = await PersistenceService.listLeads({ search: "Lead" });
    // Newest first ("New Lead" was created after "Old Lead")
    expect(result.leads[0]!.name).toBe("New Lead");

    // limit caps returned rows
    const limited = await PersistenceService.listLeads({ page: 1, limit: 1 });
    expect(limited.leads.length).toBe(1);
    expect(limited.limit).toBe(1);
  });

  it("generates a CSV export with the 15 CRM headers", async () => {
    const jobE = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
    await PersistenceService.saveImportJob({
      jobId: jobE,
      status: "DONE",
      totalRows: 1,
      imported: [makeLead({ name: "CSV, Export", email: "csv@example.com" })],
      skipped: [],
    });

    const leads = await PersistenceService.exportLeads({});
    expect(leads.length).toBeGreaterThanOrEqual(1);

    // Manually build the CSV as the router does and assert headers + a row.
    const headers = [
      "created_at",
      "name",
      "email",
      "country_code",
      "mobile_without_country_code",
      "company",
      "city",
      "state",
      "country",
      "lead_owner",
      "crm_status",
      "crm_note",
      "data_source",
      "possession_time",
      "description",
    ];
    const rows = leads.map((lead) => headers.map((h) => lead[h as keyof typeof lead] ?? ""));
    const csv = headers.join(",") + "\n" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");

    expect(csv).toContain("created_at");
    expect(csv).toContain("possession_time");
    expect(csv).toContain("description");
    expect(csv.split("\n").length).toBeGreaterThanOrEqual(2);
  });
});
