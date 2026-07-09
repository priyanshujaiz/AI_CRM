import Papa from "papaparse";

export class CsvService {
  /**
   * Parses a CSV file buffer into an array of objects.
   * Uses the file's own headers as keys for the resulting objects.
   * 
   * @param buffer The file buffer from Multer
   * @returns Array of raw parsed rows
   */
  public static parseCsvBuffer(buffer: Buffer): Promise<Record<string, string>[]> {
    return new Promise((resolve, reject) => {
      // Convert buffer to UTF-8 string
      const csvText = buffer.toString("utf-8");

      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: "greedy",
        complete: (results) => {
          if (results.errors.length > 0 && results.data.length === 0) {
            return reject(new Error("Failed to parse CSV: Invalid or corrupted format."));
          }
          
          resolve(results.data as Record<string, string>[]);
        },
        error: (error: Error) => {
          reject(new Error(`CSV parsing error: ${error.message}`));
        }
      });
    });
  }
}
