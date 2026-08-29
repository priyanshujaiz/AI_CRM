import { describe, it, expect } from "vitest";
import { CsvService } from "../services/csv.js";

describe("CsvService", () => {
  it("should successfully parse a valid CSV buffer into JSON records", async () => {
    const csvContent = "Lead Name,Email Address,Phone\nJohn Doe,john@test.com,9876543210\nJane Smith,jane@test.com,9876543211";
    const buffer = Buffer.from(csvContent, "utf-8");

    const parsed = await CsvService.parseCsvBuffer(buffer);

    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toEqual({
      "Lead Name": "John Doe",
      "Email Address": "john@test.com",
      "Phone": "9876543210"
    });
    expect(parsed[1]).toEqual({
      "Lead Name": "Jane Smith",
      "Email Address": "jane@test.com",
      "Phone": "9876543211"
    });
  });

  it("should skip empty lines correctly", async () => {
    const csvContent = "Name,Email\nJohn,\n\n\nJane,jane@test.com";
    const buffer = Buffer.from(csvContent, "utf-8");

    const parsed = await CsvService.parseCsvBuffer(buffer);

    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toEqual({ Name: "John", Email: "" });
    expect(parsed[1]).toEqual({ Name: "Jane", Email: "jane@test.com" });
  });

  it("should reject an empty buffer as invalid format", async () => {
    await expect(CsvService.parseCsvBuffer(Buffer.alloc(0))).rejects.toThrow(/Invalid or corrupted format/);
  });

  it("should reject a CSV with parse errors instead of silently dropping rows", async () => {
    // Unclosed quote — Papa emits a MissingQuotes error and corrupts everything after it
    const csvContent = 'Name,Email\n"Unclosed quote,value@x.com\nJane,jane@test.com';
    const buffer = Buffer.from(csvContent, "utf-8");

    await expect(CsvService.parseCsvBuffer(buffer)).rejects.toThrow(/parse error/i);
  });

  it("should strip a UTF-8 byte order mark from the first header", async () => {
    const content = "Name,Email\nJohn,john@test.com\n";
    const withBom = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(content, "utf-8")]);

    const parsed = await CsvService.parseCsvBuffer(withBom);

    expect(parsed).toHaveLength(1);
    expect(parsed[0]!).toHaveProperty("Name");
    expect(parsed[0]!.Name).toBe("John");
  });

  it("should decode Windows-1252 encoded files (common with Excel)", async () => {
    // "Café" with é = 0xE9 in cp1252 — a lone 0xE9 is invalid UTF-8, forcing detection
    const bytes = Buffer.concat([
      Buffer.from("Name,City\n", "utf-8"),
      Buffer.from("Caf", "utf-8"),
      Buffer.from([0xe9]),
      Buffer.from(",Paris\n", "utf-8"),
    ]);

    const parsed = await CsvService.parseCsvBuffer(bytes);

    expect(parsed).toHaveLength(1);
    expect(parsed[0]!.Name).toBe("Café");
  });

  it("should decode UTF-16LE files with a BOM", async () => {
    const content = "Name,Email\nAlice,alice@test.com\n";
    const withBom = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(content, "utf16le")]);

    const parsed = await CsvService.parseCsvBuffer(withBom);

    expect(parsed).toHaveLength(1);
    expect(parsed[0]!.Email).toBe("alice@test.com");
  });
});