import { retryWithBackoff } from "../utils/retry";

describe("retryWithBackoff", () => {
  it("returns result on first success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await retryWithBackoff(fn, {
      maxRetries: 3,
      baseDelayMs: 10,
    });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on failure and succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValue("ok");
    const result = await retryWithBackoff(fn, {
      maxRetries: 3,
      baseDelayMs: 10,
    });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("throws after max retries exhausted", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("always fails"));
    await expect(
      retryWithBackoff(fn, { maxRetries: 2, baseDelayMs: 10 }),
    ).rejects.toThrow("always fails");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("respects abort signal", async () => {
    const controller = new AbortController();
    const fn = vi.fn().mockRejectedValue(new Error("fail"));
    controller.abort();
    await expect(
      retryWithBackoff(fn, {
        maxRetries: 3,
        baseDelayMs: 10,
        signal: controller.signal,
      }),
    ).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
