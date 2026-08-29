import Papa from "papaparse";
import iconv from "iconv-lite";
import { detect } from "chardet";

export class CsvService {
  /**
   * Parses a CSV file buffer into an array of objects.
   * Uses the file's own headers as keys for the resulting objects.
   *
   * The buffer is decoded with encoding detection first (BOM, then UTF-8
   * validity, then a heuristic sniff with a Windows-1252 fallback) so files
   * exported by Excel or other single-byte tools are not garbled.
   *
   * @param buffer The file buffer from Multer
   * @returns Array of raw parsed rows
   * @throws If the CSV has parse errors (rows would otherwise be silently lost)
   *         or the buffer contains no parseable records.
   */
  public static parseCsvBuffer(buffer: Buffer): Promise<Record<string, string>[]> {
    return new Promise((resolve, reject) => {
      const encoding = CsvService.detectEncoding(buffer);

      let csvText: string;
      try {
        csvText = iconv.decode(buffer, encoding).replace(/^\uFEFF/, "");
      } catch {
        // Never crash the request on an exotic encoding — fall back to a raw decode
        csvText = buffer.toString("utf-8").replace(/^\uFEFF/, "");
      }

      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: "greedy",
        complete: (results) => {
          // Empty buffer / corrupt file: no records at all → invalid format.
          // (A header-only file has no data AND no errors, and resolves to [] so the
          // controller can answer "contains no records" — preserving its behavior.)
          if (results.data.length === 0) {
            if (results.errors.length > 0) {
              return reject(new Error("Failed to parse CSV: Invalid or corrupted format."));
            }
            return resolve([]);
          }

          // Reject on ANY parse error instead of silently dropping corrupt rows.
          // Papa emits errors for e.g. unclosed quotes, which corrupt every row after them.
          if (results.errors.length > 0) {
            const first = results.errors[0]!; // present because errors.length > 0
            const rowInfo = typeof first.row === "number" ? ` at row ${first.row}` : "";
            return reject(
              new Error(
                `Failed to parse CSV: ${results.errors.length} parse error(s)${rowInfo} (${first.message}). ` +
                  `Please fix the file and try again.`
              )
            );
          }

          resolve(results.data as Record<string, string>[]);
        },
        error: (error: Error) => {
          reject(new Error(`CSV parsing error: ${error.message}`));
        }
      });
    });
  }

  /**
   * Detects the character encoding of a CSV buffer.
   * Order: BOM sniff → valid UTF-8 → heuristic detector → Windows-1252 fallback
   * (the default single-byte encoding used by Excel exports).
   */
  private static detectEncoding(buffer: Buffer): string {
    // Byte Order Mark — authoritative when present
    if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
      return "utf-8";
    }
    if (buffer.length >= 4 && buffer[0] === 0x00 && buffer[1] === 0x00 && buffer[2] === 0xfe && buffer[3] === 0xff) {
      return "utf-32be";
    }
    if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xfe && buffer[2] === 0x00 && buffer[3] === 0x00) {
      return "utf-32le";
    }
    if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
      return "utf-16le";
    }
    if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
      return "utf-16be";
    }

    // No BOM: valid UTF-8 is by far the most common case
    if (CsvService.isValidUtf8(buffer)) {
      return "utf-8";
    }

    // Odd byte sequences: sniff, then fall back to Windows-1252
    const detected = detect(buffer);
    return detected && iconv.encodingExists(detected) ? detected : "windows-1252";
  }

  /**
   * Returns true when the whole buffer decodes as strict UTF-8.
   * Uses the WHATWG TextDecoder (same primitive as the frontend preview) so the
   * backend and the browser agree on what counts as valid UTF-8.
   */
  private static isValidUtf8(buffer: Buffer): boolean {
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(buffer);
      return true;
    } catch {
      return false;
    }
  }
}