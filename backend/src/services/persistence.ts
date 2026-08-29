import { Prisma } from "@prisma/client";
import { getPrisma } from "./prismaClient.js";
import { Logger } from "../utils/logger.js";
import type { CrmRecord, SkippedRecord } from "../types/crmRecord.js";

// ─── Enum mapping ──────────────────────────────────────────────────────────────
// SQLite cannot store '' in an enum column, so empty values are stored as the
// EMPTY_STRING sentinel and mapped back to '' when serializing to the API.

const CRM_STATUS_EMPTY = "EMPTY_STRING" as const;
const DATA_SOURCE_EMPTY = "EMPTY_STRING" as const;

export type PersistedCrmStatus =
  | "GOOD_LEAD_FOLLOW_UP"
  | "DID_NOT_CONNECT"
  | "BAD_LEAD"
  | "SALE_DONE"
  | typeof CRM_STATUS_EMPTY;

export type PersistedDataSource =
  | "leads_on_demand"
  | "meridian_tower"
  | "eden_park"
  | "varah_swamy"
  | "sarjapur_plots"
  | typeof DATA_SOURCE_EMPTY;

export interface SaveImportJobInput {
  jobId: string;
  status: "PROCESSING" | "DONE" | "FAILED";
  totalRows: number;
  imported: CrmRecord[];
  skipped: SkippedRecord[];
}

/**
 * Serialized Lead shape exposed by the API.
 * camelCase keys, except id, createdAt (ISO) and the 15 CRM fields which stay
 * snake_case exactly as defined in the Prisma schema.
 */
export interface ApiLead {
  id: string;
  jobId: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  // ── The 15 CRM fields (snake_case, always present) ──
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
  crm_status: string; // '' when empty
  crm_note: string;
  data_source: string; // '' when empty
  possession_time: string;
  description: string;
}

export interface LeadFilters {
  search?: string;
  status?: string;
  source?: string;
  page?: number;
  limit?: number;
}

export interface LeadListResult {
  total: number;
  page: number;
  limit: number;
  leads: ApiLead[];
}

type DbLead = Prisma.LeadGetPayload<Record<string, never>>;

function mapCrmStatusToDb(status: string): PersistedCrmStatus {
  return (status === "" ? CRM_STATUS_EMPTY : status) as PersistedCrmStatus;
}

function mapDataSourceToDb(source: string): PersistedDataSource {
  return (source === "" ? DATA_SOURCE_EMPTY : source) as PersistedDataSource;
}

function mapDbToApiLead(row: DbLead): ApiLead {
  return {
    id: row.id,
    jobId: row.jobId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    created_at: row.created_at.toISOString(),
    name: row.name,
    email: row.email,
    country_code: row.country_code,
    mobile_without_country_code: row.mobile_without_country_code,
    company: row.company,
    city: row.city,
    state: row.state,
    country: row.country,
    lead_owner: row.lead_owner,
    crm_status: row.crm_status === CRM_STATUS_EMPTY ? "" : row.crm_status,
    crm_note: row.crm_note,
    data_source: row.data_source === DATA_SOURCE_EMPTY ? "" : row.data_source,
    possession_time: row.possession_time,
    description: row.description,
  };
}

export class PersistenceService {
  /**
   * Persist an import job (its status, imported leads and skipped rows) best-effort.
   * Never throws — callers (the import SSE flow) rely on this staying silent.
   */
  public static async saveImportJob(input: SaveImportJobInput): Promise<void> {
    try {
      const prisma = getPrisma();

      const leadData = input.imported.map((lead) => {
        const created = new Date(lead.created_at);
        return {
          jobId: input.jobId,
          created_at: Number.isNaN(created.getTime()) ? new Date() : created,
          name: lead.name,
          email: lead.email,
          country_code: lead.country_code,
          mobile_without_country_code: lead.mobile_without_country_code,
          company: lead.company,
          city: lead.city,
          state: lead.state,
          country: lead.country,
          lead_owner: lead.lead_owner,
          crm_status: mapCrmStatusToDb(lead.crm_status),
          crm_note: lead.crm_note,
          data_source: mapDataSourceToDb(lead.data_source),
          possession_time: lead.possession_time,
          description: lead.description,
        } satisfies Prisma.LeadUncheckedCreateInput;
      });

      await prisma.$transaction(async (tx) => {
        const job = await tx.importJob.upsert({
          where: { id: input.jobId },
          update: {
            status: input.status,
            total_rows: input.totalRows,
            total_imported: input.imported.length,
            total_skipped: input.skipped.length,
            skipped: input.skipped as unknown as Prisma.InputJsonValue,
          },
          create: {
            id: input.jobId,
            status: input.status,
            total_rows: input.totalRows,
            total_imported: input.imported.length,
            total_skipped: input.skipped.length,
            skipped: input.skipped as unknown as Prisma.InputJsonValue,
          },
        });

        if (leadData.length > 0) {
          await tx.lead.createMany({ data: leadData });
        }
      });

      Logger.info(
        `Persisted job ${input.jobId}: status=${input.status} imported=${input.imported.length} skipped=${input.skipped.length}`,
        "PersistenceService"
      );
    } catch (error: any) {
      Logger.warn(
        `Failed to persist import job ${input.jobId}. Leads remain in-memory only.`,
        "PersistenceService",
        error
      );
    }
  }

  /** Build the WHERE clause shared by list & export. */
  private static buildWhere(filters: LeadFilters): Prisma.LeadWhereInput {
    const and: Prisma.LeadWhereInput[] = [];

    if (filters.search && filters.search.trim()) {
      const term = filters.search.trim();
      and.push({
        OR: [
          { name: { contains: term } },
          { email: { contains: term } },
          { company: { contains: term } },
        ],
      });
    }

    if (filters.status) {
      and.push({ crm_status: mapCrmStatusToDb(filters.status) });
    }

    if (filters.source) {
      and.push({ data_source: mapDataSourceToDb(filters.source) });
    }

    return and.length ? { AND: and } : {};
  }

  public static async listLeads(filters: LeadFilters = {}): Promise<LeadListResult> {
    const prisma = getPrisma();

    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit ? Math.min(Math.max(filters.limit, 1), 100) : 25;

    const where = this.buildWhere(filters);

    const [total, rows] = await prisma.$transaction([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      total,
      page,
      limit,
      leads: rows.map(mapDbToApiLead),
    };
  }

  public static async getLead(id: string): Promise<ApiLead | null> {
    const prisma = getPrisma();
    const row = await prisma.lead.findUnique({ where: { id } });
    return row ? mapDbToApiLead(row) : null;
  }

  /** All matching leads (no pagination), ordered by createdAt desc. */
  public static async exportLeads(filters: LeadFilters = {}): Promise<ApiLead[]> {
    const prisma = getPrisma();
    const rows = await prisma.lead.findMany({
      where: this.buildWhere(filters),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    return rows.map(mapDbToApiLead);
  }
}
