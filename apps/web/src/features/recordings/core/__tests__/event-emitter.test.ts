import { TypedEventEmitter } from "../utils/event-emitter";

interface TestEvents {
  data: [value: string];
  error: [err: Error];
  empty: [];
}

describe("TypedEventEmitter", () => {
  let emitter: TypedEventEmitter<TestEvents>;

  beforeEach(() => {
    emitter = new TypedEventEmitter();
  });

  it("calls listeners when event is emitted", () => {
    const listener = vi.fn();
    emitter.on("data", listener);
    emitter.emit("data", "hello");
    expect(listener).toHaveBeenCalledWith("hello");
  });

  it("supports multiple listeners", () => {
    const a = vi.fn();
    const b = vi.fn();
    emitter.on("data", a);
    emitter.on("data", b);
    emitter.emit("data", "test");
    expect(a).toHaveBeenCalledWith("test");
    expect(b).toHaveBeenCalledWith("test");
  });

  it("returns unsubscribe function", () => {
    const listener = vi.fn();
    const unsub = emitter.on("data", listener);
    unsub();
    emitter.emit("data", "ignored");
    expect(listener).not.toHaveBeenCalled();
  });

  it("handles events with no arguments", () => {
    const listener = vi.fn();
    emitter.on("empty", listener);
    emitter.emit("empty");
    expect(listener).toHaveBeenCalled();
  });

  it("removeAllListeners clears everything", () => {
    const a = vi.fn();
    const b = vi.fn();
    emitter.on("data", a);
    emitter.on("error", b);
    emitter.removeAllListeners();
    emitter.emit("data", "ignored");
    emitter.emit("error", new Error("ignored"));
    expect(a).not.toHaveBeenCalled();
    expect(b).not.toHaveBeenCalled();
  });
});
