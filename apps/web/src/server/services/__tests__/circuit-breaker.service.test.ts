import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CircuitBreaker, CircuitOpenError } from "../circuit-breaker.service";

vi.mock("@/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@sentry/nextjs", () => ({
  addBreadcrumb: vi.fn(),
}));

describe("CircuitBreaker", () => {
  let cb: CircuitBreaker;

  beforeEach(() => {
    vi.useFakeTimers();
    cb = new CircuitBreaker("test-provider", {
      failureThreshold: 3,
      failureWindowMs: 10_000,
      resetTimeoutMs: 1_000,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts in closed state", () => {
    expect(cb.getState()).toBe("closed");
  });

  it("allows operations in closed state", async () => {
    const result = await cb.execute(() => Promise.resolve("ok"));
    expect(result).toBe("ok");
  });

  it("stays closed below failure threshold", async () => {
    const failOp = () => Promise.reject(new Error("fail"));
    await expect(cb.execute(failOp)).rejects.toThrow("fail");
    await expect(cb.execute(failOp)).rejects.toThrow("fail");
    expect(cb.getState()).toBe("closed");
  });

  it("opens after reaching failure threshold", async () => {
    const failOp = () => Promise.reject(new Error("fail"));
    for (let i = 0; i < 3; i++) {
      await expect(cb.execute(failOp)).rejects.toThrow("fail");
    }
    expect(cb.getState()).toBe("open");
  });

  it("rejects immediately when open", async () => {
    const failOp = () => Promise.reject(new Error("fail"));
    for (let i = 0; i < 3; i++) {
      await expect(cb.execute(failOp)).rejects.toThrow("fail");
    }
    await expect(cb.execute(() => Promise.resolve("ok"))).rejects.toThrow(
      CircuitOpenError,
    );
  });

  it("transitions to half_open after reset timeout", async () => {
    const failOp = () => Promise.reject(new Error("fail"));
    for (let i = 0; i < 3; i++) {
      await expect(cb.execute(failOp)).rejects.toThrow("fail");
    }
    expect(cb.getState()).toBe("open");
    vi.advanceTimersByTime(1_000);
    expect(cb.getState()).toBe("half_open");
  });

  it("closes on success in half_open state", async () => {
    const failOp = () => Promise.reject(new Error("fail"));
    for (let i = 0; i < 3; i++) {
      await expect(cb.execute(failOp)).rejects.toThrow("fail");
    }
    vi.advanceTimersByTime(1_000);
    expect(cb.getState()).toBe("half_open");
    await cb.execute(() => Promise.resolve("ok"));
    expect(cb.getState()).toBe("closed");
  });

  it("reopens on failure in half_open state", async () => {
    const failOp = () => Promise.reject(new Error("fail"));
    for (let i = 0; i < 3; i++) {
      await expect(cb.execute(failOp)).rejects.toThrow("fail");
    }
    vi.advanceTimersByTime(1_000);
    expect(cb.getState()).toBe("half_open");
    await expect(cb.execute(failOp)).rejects.toThrow("fail");
    expect(cb.getState()).toBe("open");
  });

  it("ignores failures outside the sliding window", async () => {
    const failOp = () => Promise.reject(new Error("fail"));
    await expect(cb.execute(failOp)).rejects.toThrow("fail");
    await expect(cb.execute(failOp)).rejects.toThrow("fail");
    vi.advanceTimersByTime(11_000);
    await expect(cb.execute(failOp)).rejects.toThrow("fail");
    expect(cb.getState()).toBe("closed");
  });

  it("resets failure count on transition to closed", async () => {
    const failOp = () => Promise.reject(new Error("fail"));
    for (let i = 0; i < 3; i++) {
      await expect(cb.execute(failOp)).rejects.toThrow("fail");
    }
    expect(cb.getState()).toBe("open");
    vi.advanceTimersByTime(1_000);
    await cb.execute(() => Promise.resolve("ok"));
    expect(cb.getState()).toBe("closed");
    await expect(cb.execute(failOp)).rejects.toThrow("fail");
    await expect(cb.execute(failOp)).rejects.toThrow("fail");
    expect(cb.getState()).toBe("closed");
  });
});
