import { CrmRecordSchema } from "../types/crmRecord.js";
import type { CrmRecord, RawRecord, SkippedRecord, AiMappedRecord } from "../types/crmRecord.js";

export class ValidationService {
  /**
   * Validates and cleans a list of CRM records returned by the AI.
   * Performs Zod parsing, enforces enums, and verifies contact details.
   * 
   * Records are aligned to their raw source rows via the AI-provided `row_index`
   * (0-based position within the batch). If `row_index` is missing (e.g. mocks or
   * older test fixtures), positional alignment is used as a fallback.
   * 
   * @param aiRecords Mapped records from the AI completion
   * @param rawBatch The original raw records (for building skipped references)
   * @param batchStartIndex The index offset of this batch within the CSV
   * @returns Cleaned records and skipped records
   */
  public static validateBatch(
    aiRecords: AiMappedRecord[],
    rawBatch: RawRecord[],
    batchStartIndex: number
  ): { validated: CrmRecord[]; skipped: SkippedRecord[] } {
    const validated: CrmRecord[] = [];
    const skipped: SkippedRecord[] = [];

    // Map AI records to their original row positions:
    // - Preferred: the explicit row_index the AI returns (stable even if it drops or reorders rows).
    // - Fallback (records without row_index): positional alignment.
    const recordsByRowIndex = new Map<number, AiMappedRecord>();
    aiRecords.forEach((record, position) => {
      const idx = typeof record.row_index === "number" ? record.row_index : position;
      if (!recordsByRowIndex.has(idx)) {
        recordsByRowIndex.set(idx, record);
      }
    });

    rawBatch.forEach((rawRow, offset) => {
      const globalRowIndex = batchStartIndex + offset + 1; // 1-indexed

      // Find the corresponding AI record by its original position in the batch.
      const aiRecord = recordsByRowIndex.get(offset);

      if (!aiRecord) {
        skipped.push({
          rowIndex: globalRowIndex,
          raw: rawRow,
          reason: "AI omitted or failed to map this record during batch processing."
        });
        return;
      }

      // Rule: Skip if neither email nor mobile is present/valid
      const email = (aiRecord.email || "").trim();
      const mobile = (aiRecord.mobile_without_country_code || "").trim();

      // Email format check (must match standard email regex pattern)
      const hasValidEmail = email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      // Mobile format check: must contain at least 7 digits to be considered a mobile number
      const digitsCount = mobile.replace(/\D/g, "").length;
      const hasValidMobile = mobile && digitsCount >= 7;

      if (!hasValidEmail && !hasValidMobile) {
        skipped.push({
          rowIndex: globalRowIndex,
          raw: rawRow,
          reason: "Skipped: Record does not contain a valid email address or mobile number."
        });
        return;
      }

      // Zod parse validation (enforces enums, checks dates, sets defaults)
      const parsedResult = CrmRecordSchema.safeParse(aiRecord);

      if (!parsedResult.success) {
        // Collect Zod validation error messages
        const errorMsg = parsedResult.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", ");
          
        skipped.push({
          rowIndex: globalRowIndex,
          raw: rawRow,
          reason: `Validation failed: ${errorMsg}`
        });
      } else {
        validated.push(parsedResult.data);
      }
    });

    return { validated, skipped };
  }
}
