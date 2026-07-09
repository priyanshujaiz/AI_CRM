import pLimit from "p-limit";
import { AiService } from "./ai.js";
import { ValidationService } from "./validation.js";
import { retryWithBackoff } from "../utils/retry.js";
import { Logger } from "../utils/logger.js";
import type { RawRecord, CrmRecord, SkippedRecord, ImportBatchResult } from "../types/crmRecord.js";

export class BatchService {
  private static BATCH_SIZE = 25; // Optimum size for speed, LLM context, and error boundaries
  private static CONCURRENCY_LIMIT = 3; // Limit simultaneous OpenAI requests to avoid rate limits

  /**
   * Processes all raw CSV records by splitting them into batches,
   * sending them to the AI, validating their outputs, and returning the aggregated counts.
   * 
   * @param rawRecords Array of parsed key-value rows from the CSV
   * @returns Mapped imports and list of skipped rows with reasons
   */
  public static async processAll(
    rawRecords: RawRecord[],
    onProgress?: (batchesDone: number, batchesTotal: number) => void
  ): Promise<ImportBatchResult> {
    const totalRecords = rawRecords.length;
    const batches: RawRecord[][] = [];
    let batchesDone = 0;

    // Slice records into chunks
    for (let i = 0; i < totalRecords; i += this.BATCH_SIZE) {
      batches.push(rawRecords.slice(i, i + this.BATCH_SIZE));
    }

    Logger.info(
      `Starting batch processing: ${totalRecords} raw rows partitioned into ${batches.length} batches of size ${this.BATCH_SIZE}. Concurrency limit: ${this.CONCURRENCY_LIMIT}.`,
      "Batch-Service"
    );

    const limit = pLimit(this.CONCURRENCY_LIMIT);
    
    // Set up parallel task executions with concurrency control
    const tasks = batches.map((batch, batchIndex) => {
      const startIndex = batchIndex * this.BATCH_SIZE;

      return limit(async (): Promise<ImportBatchResult> => {
        const batchNum = batchIndex + 1;
        const totalBatches = batches.length;
        const rowRange = `Rows ${startIndex + 1} to ${Math.min(startIndex + this.BATCH_SIZE, totalRecords)}`;

        try {
          Logger.info(`[Batch ${batchNum}/${totalBatches}] Processing range: ${rowRange}...`, "Batch-Service");

          // 1. Call OpenAI API wrapped in retry handler (up to 3 attempts)
          const aiOutput = await retryWithBackoff(
            () => AiService.mapBatch(batch),
            3,
            1500,
            `Batch-${batchNum}`
          );

          // 2. Validate and clean AI results
          const { validated, skipped } = ValidationService.validateBatch(
            aiOutput,
            batch,
            startIndex
          );

          Logger.info(
            `[Batch ${batchNum}/${totalBatches}] Mapped successfully. Validated: ${validated.length} | Skipped: ${skipped.length} records.`,
            "Batch-Service"
          );

          // Fire progress tick after successful batch
          batchesDone++;
          onProgress?.(batchesDone, batches.length);

          return { imported: validated, skipped };
        } catch (error: any) {
          Logger.error(
            `[Batch ${batchNum}/${totalBatches}] CRITICAL: Batch processing failed after all retry attempts. Skipping range ${rowRange}.`,
            "Batch-Service",
            error
          );
          
          // Graceful Degradation: map all rows in failed batch to skipped
          const skippedBatch: SkippedRecord[] = batch.map((rawRow, offset) => ({
            rowIndex: startIndex + offset + 1,
            raw: rawRow,
            reason: `AI processing failed: ${error.message || "Unknown OpenAI error"}`
          }));

          // Still fire progress tick so bar keeps moving
          batchesDone++;
          onProgress?.(batchesDone, batches.length);

          return { imported: [], skipped: skippedBatch };
        }
      });
    });

    // Wait for all concurrent tasks to finish
    const results = await Promise.all(tasks);

    // Merge and aggregate outputs
    const aggregatedImported: CrmRecord[] = [];
    const aggregatedSkipped: SkippedRecord[] = [];

    results.forEach((res) => {
      aggregatedImported.push(...res.imported);
      aggregatedSkipped.push(...res.skipped);
    });

    // Re-sort skipped records by original row index to keep the report ordered
    aggregatedSkipped.sort((a, b) => a.rowIndex - b.rowIndex);

    Logger.info(
      `Ingestion completed. Total parsed: ${totalRecords} | Mapped: ${aggregatedImported.length} | Skipped: ${aggregatedSkipped.length}.`,
      "Batch-Service"
    );

    return {
      imported: aggregatedImported,
      skipped: aggregatedSkipped
    };
  }
}
