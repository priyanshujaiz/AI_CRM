import { describe, it, expect } from "vitest";
import { CsvService } from "../services/csv.js";

/**
 * Case-insensitive lookup helper — the parser keeps the file's exact header
 * casing as record keys, so consumers query fields case-insensitively.
 */
function lookup(row: Record<string, string>, field: string): string | undefined {
  const entry = Object.entries(row).find(
    ([key]) => key.toLowerCase() === field.toLowerCase()
  );
  return entry?.[1];
}

describe("CsvService — encoding & quoting edge cases", () => {
  it("preserves header casing and supports case-insensitive field lookup", async () => {
    const csv = "Full Name,Email Address,Phone Number\nJohn Doe,john@test.com,9876543210\n";
    const parsed = await CsvService.parseCsvBuffer(Buffer.from(csv, "utf-8"));

    expect(parsed).toHaveLength(1);
    const row = parsed[0]!;

    // Keys keep the exact header casing from the file
    expect(Object.keys(row)).toEqual(["Full Name", "Email Address", "Phone Number"]);

    // Consumers can look values up regardless of the file's casing
    expect(lookup(row, "EMAIL ADDRESS")).toBe("john@test.com");
    expect(lookup(row, "full name")).toBe("John Doe");
  });

  it("keeps headers that differ only in case as separate keys", async () => {
    const csv = "Name,name\nAlice,alice-r\n";
    const parsed = await CsvService.parseCsvBuffer(Buffer.from(csv, "utf-8"));

    expect(parsed).toHaveLength(1);
    expect(Object.keys(parsed[0]!)).toEqual(["Name", "name"]);
  });

  it("strips a UTF-8 BOM and parses CRLF line endings", async () => {
    const content = "Name,Email\r\nJohn,john@test.com\r\nJane,jane@test.com\r\n";
    const withBom = Buffer.concat([
      Buffer.from([0xef, 0xbb, 0xbf]),
      Buffer.from(content, "utf-8"),
    ]);

    const parsed = await CsvService.parseCsvBuffer(withBom);

    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toEqual({ Name: "John", Email: "john@test.com" });
    // No stray \r contaminates the record keys
    expect(Object.keys(parsed[0]!)).toEqual(["Name", "Email"]);
  });

  it("parses fields containing quoted commas", async () => {
    const csv = 'Name,Notes\n"Smith, John","calls at 9am, then 5pm"\n';
    const parsed = await CsvService.parseCsvBuffer(Buffer.from(csv, "utf-8"));

    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toEqual({
      Name: "Smith, John",
      Notes: "calls at 9am, then 5pm",
    });
  });

  it("parses fields containing quoted newlines", async () => {
    const csv = 'Name,Notes\n"Jane","First line\nSecond line"\n';
    const parsed = await CsvService.parseCsvBuffer(Buffer.from(csv, "utf-8"));

    expect(parsed).toHaveLength(1);
    expect(parsed[0]!.Notes).toBe("First line\nSecond line");
  });

  it("parses a quoted field containing commas and newlines in one record", async () => {
    const csv = 'Name,City,Remarks\n"Jose","Austin, TX","Call Mon.\nFollow up Tue."\n';
    const parsed = await CsvService.parseCsvBuffer(Buffer.from(csv, "utf-8"));

    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toEqual({
      Name: "Jose",
      City: "Austin, TX",
      Remarks: "Call Mon.\nFollow up Tue.",
    });
  });

  it("handles a UTF-16LE BOM combined with CRLF and quoted commas", async () => {
    const content = 'Name,Email\r\n"Jane, Doe",jane@test.com\r\n';
    const withBom = Buffer.concat([
      Buffer.from([0xff, 0xfe]),
      Buffer.from(content, "utf16le"),
    ]);

    const parsed = await CsvService.parseCsvBuffer(withBom);

    expect(parsed).toHaveLength(1);
    expect(parsed[0]!.Name).toBe("Jane, Doe");
    expect(lookup(parsed[0]!, "email")).toBe("jane@test.com");
  });
});