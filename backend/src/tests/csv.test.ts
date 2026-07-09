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
});
