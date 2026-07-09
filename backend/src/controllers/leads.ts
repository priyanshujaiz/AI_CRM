import { randomUUID } from "crypto";
import type { Request, Response, NextFunction } from "express";
import { CsvService } from "../services/csv.js";
import { BatchService } from "../services/batch.js";
import { jobStore } from "../utils/jobStore.js";
import { Logger } from "../utils/logger.js";

export class LeadsController {
  /**
   * POST /api/leads/import
   *
   * Validates the uploaded file, parses the CSV, registers a background job,
   * then immediately returns the jobId (HTTP 202) so the client can subscribe
   * to the SSE progress stream without waiting for the full AI processing.
   *
   * Processing happens in the background; results are emitted via jobStore events.
   */
  public static async importLeads(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const file = req.file;

      if (!file) {
        Logger.warn("Import request received with no file uploaded.", "LeadsController");
        res.status(400).json({ success: false, error: "No file uploaded. Please upload a valid CSV file." });
        return;
      }

      Logger.info(`New import request received: "${file.originalname}" (${file.size} bytes).`, "LeadsController");

      if (file.mimetype !== "text/csv" && !file.originalname.endsWith(".csv")) {
        Logger.warn(`Rejected file "${file.originalname}": invalid type.`, "LeadsController");
        res.status(400).json({ success: false, error: "Invalid file type. Only CSV files (.csv) are accepted." });
        return;
      }

      // Parse CSV synchronously before returning jobId — fast, in-memory only
      Logger.info("Parsing CSV buffer...", "LeadsController");
      const parsedRecords = await CsvService.parseCsvBuffer(file.buffer);

      if (parsedRecords.length === 0) {
        Logger.warn(`CSV "${file.originalname}" has 0 records after parsing.`, "LeadsController");
        res.status(400).json({ success: false, error: "The uploaded CSV file contains no records." });
        return;
      }

      // Register a new background job and return its ID immediately (202 Accepted)
      const jobId = randomUUID();
      jobStore.create(jobId, parsedRecords.length);

      Logger.info(`CSV parsed: ${parsedRecords.length} rows. Starting background job ${jobId}...`, "LeadsController");

      // Return the jobId to the client NOW — don't await the AI processing
      res.status(202).json({ jobId, totalRows: parsedRecords.length });

      // Background processing (not awaited — response already sent)
      BatchService.processAll(parsedRecords, (batchesDone, batchesTotal) => {
        jobStore.emitProgress(jobId, batchesDone, batchesTotal);
      })
        .then((result) => {
          const importResponse = {
            success: true,
            totalRows: parsedRecords.length,
            totalImported: result.imported.length,
            totalSkipped: result.skipped.length,
            imported: result.imported,
            skipped: result.skipped,
          };
          jobStore.emitDone(jobId, importResponse);
          Logger.info(
            `Job ${jobId} finished. Imported: ${result.imported.length} | Skipped: ${result.skipped.length}`,
            "LeadsController"
          );
        })
        .catch((err: any) => {
          const msg = err?.message || "Unknown processing error.";
          jobStore.emitError(jobId, msg);
          Logger.error(`Job ${jobId} failed during background processing.`, "LeadsController", err);
        });
    } catch (error: any) {
      Logger.error("CRITICAL: Failed to initiate import job.", "LeadsController", error);
      next(error);
    }
  }
}
