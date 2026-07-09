import { Router } from "express";
import multer from "multer";
import { LeadsController } from "../controllers/leads.js";
import { jobStore } from "../utils/jobStore.js";
import { Logger } from "../utils/logger.js";

const router = Router();

// Multer: memory storage, 5MB limit, .csv only
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// POST /api/leads/import — start import job, returns { jobId }
router.post("/import", upload.single("file"), LeadsController.importLeads);

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
