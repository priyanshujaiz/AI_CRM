import { Router } from "express";
import type { Request } from "express";
import multer from "multer";
import { LeadsController } from "../controllers/leads.js";
import { PersistenceService } from "../services/persistence.js";
import { jobStore } from "../utils/jobStore.js";
import { Logger } from "../utils/logger.js";
import type { LeadFilters } from "../services/persistence.js";

const router = Router();

// Multer: memory storage, 5MB limit, .csv only
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// POST /api/leads/import — start import job, returns { jobId }
router.post("/import", upload.single("file"), LeadsController.importLeads);

// ─── Query / persistence endpoints ─────────────────────────────────────────────

/**
 * Parse optional query params into LeadFilters, ignoring invalid numeric values.
 * Uses a spread builder so optional keys are simply omitted (exactOptionalPropertyTypes).
 */
function buildLeadFilters(query: Request["query"]): LeadFilters {
  const filters: LeadFilters = {};
  const { search, status, source, page, limit } = query;

  if (typeof search === "string" && search.trim()) filters.search = search.trim();
  if (typeof status === "string" && status) filters.status = status;
  if (typeof source === "string" && source) filters.source = source;

  const parsedPage = typeof page === "string" ? parseInt(page, 10) : NaN;
  const parsedLimit = typeof limit === "string" ? parseInt(limit, 10) : NaN;

  if (!Number.isNaN(parsedPage) && parsedPage > 0) filters.page = parsedPage;
  if (!Number.isNaN(parsedLimit) && parsedLimit > 0) filters.limit = parsedLimit;

  return filters;
}

/**
 * GET /api/leads?search=&status=&source=&page=&limit=
 * Returns { total, page, limit, leads } sorted by createdAt desc.
 */
router.get("/", async (req, res, next) => {
  try {
    const result = await PersistenceService.listLeads(buildLeadFilters(req.query));
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/leads/export?search=&status=&source=
 * Returns a text/csv download of all matching leads (all 15 CRM fields).
 * Declared before GET /:id so "export" is not captured as an id.
 */
router.get("/export", async (req, res, next) => {
  try {
    const leads = await PersistenceService.exportLeads(buildLeadFilters(req.query));

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
    ] as const;

    const rows = leads.map((lead) => headers.map((h) => lead[h] ?? ""));
    const csv =
      headers.join(",") +
      "\n" +
      rows
        .map((row) =>
          row
            .map((cell) => {
              const s = cell == null ? "" : String(cell);
              // Quote cells containing commas, quotes or newlines; escape double quotes.
              return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
            })
            .join(",")
        )
        .join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="leads-${Date.now()}.csv"`
    );
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/leads/:id
 * Returns a single persisted lead, or 404 if not found.
 */
router.get("/:id", async (req, res, next) => {
  try {
    const lead = await PersistenceService.getLead(req.params.id);
    if (!lead) {
      res.status(404).json({ error: "Lead not found." });
      return;
    }
    res.json(lead);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/leads/import/:jobId/progress — Server-Sent Events stream
 *
 * Emits:
 *   event: progress  data: { batchesDone, batchesTotal }
 *   event: done      data: { result: ImportResponse }
 *   event: error     data: { error: string }
 */
router.get("/import/:jobId/progress", (req, res) => {
  const { jobId } = req.params;
  const job = jobStore.get(jobId);

  if (!job) {
    Logger.warn(`SSE request for unknown jobId: ${jobId}`, "SSE");
    res.status(404).json({ error: "Import job not found. It may have expired or the ID is incorrect." });
    return;
  }

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  Logger.info(`SSE client connected for job ${jobId}.`, "SSE");

  const sendEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // If job already finished before client connected, send final state immediately
  if (job.done) {
    if (job.result) {
      sendEvent("done", { result: job.result });
    } else {
      sendEvent("error", { error: job.error || "Job failed." });
    }
    res.end();
    return;
  }

  // Wire up event listeners
  const onProgress = (data: unknown) => sendEvent("progress", data);

  const onDone = (result: unknown) => {
    sendEvent("done", { result });
    cleanup();
    res.end();
  };

  const onError = (error: string) => {
    sendEvent("error", { error });
    cleanup();
    res.end();
  };

  job.emitter.on("progress", onProgress);
  job.emitter.on("done", onDone);
  job.emitter.on("error", onError);

  const cleanup = () => {
    job.emitter.off("progress", onProgress);
    job.emitter.off("done", onDone);
    job.emitter.off("error", onError);
    Logger.info(`SSE client disconnected for job ${jobId}.`, "SSE");
  };

  // Clean up when the client closes the connection
  req.on("close", cleanup);
});

export default router;
