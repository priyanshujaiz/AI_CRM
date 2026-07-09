import { CrmRecordSchema } from "../types/crmRecord.js";
import type { CrmRecord, RawRecord, SkippedRecord } from "../types/crmRecord.js";

export class ValidationService {
  /**
   * Validates and cleans a list of CRM records returned by the AI.
   * Performs Zod parsing, enforces enums, and verifies contact details.
   * 
   * @param aiRecords Mapped records from the AI completion
   * @param rawBatch The original raw records (for building skipped references)
   * @param batchStartIndex The index offset of this batch within the CSV
   * @returns Cleaned records and skipped records
   */
  public static validateBatch(
    aiRecords: CrmRecord[],
    rawBatch: RawRecord[],
    batchStartIndex: number
  ): { validated: CrmRecord[]; skipped: SkippedRecord[] } {
    const validated: CrmRecord[] = [];
    const skipped: SkippedRecord[] = [];

    // Map original raw rows by index relative to this batch
    // AI might return fewer records if it skipped rows itself, or mismatch rows.
    // We map them one-by-one safely.
    rawBatch.forEach((rawRow, offset) => {
      const globalRowIndex = batchStartIndex + offset + 1; // 1-indexed

      // Find the corresponding AI record. 
      // Typically, AI matches the indices, but we must protect against index mismatch.
      const aiRecord = aiRecords[offset];

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
