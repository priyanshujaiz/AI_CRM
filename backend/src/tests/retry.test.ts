import { describe, it, expect, vi } from "vitest";
import { retryWithBackoff } from "../utils/retry.js";

describe("retryWithBackoff", () => {
  it("should return the result immediately if the function succeeds on the first try", async () => {
    const fn = vi.fn().mockResolvedValue("success");

    const result = await retryWithBackoff(fn, 3, 10);

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("should retry and resolve if the function fails initially but succeeds later", async () => {
    let callCount = 0;
    const fn = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount < 3) {
        throw new Error("Temporary failure");
      }
      return "success";
    });

    const result = await retryWithBackoff(fn, 3, 10);

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("should fail and throw an error after all retries are exhausted", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("Persistent failure"));

    await expect(retryWithBackoff(fn, 2, 10)).rejects.toThrow("Persistent failure");
    expect(fn).toHaveBeenCalledTimes(3); // 1 initial call + 2 retries
  });
});
