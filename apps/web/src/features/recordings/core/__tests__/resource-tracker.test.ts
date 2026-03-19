import { ResourceTracker } from "../utils/resource-tracker";
import type { Disposable } from "../recording-session.types";

describe("ResourceTracker", () => {
  it("disposes all tracked resources in reverse order", () => {
    const tracker = new ResourceTracker();
    const order: number[] = [];
    const a: Disposable = { dispose: () => order.push(1) };
    const b: Disposable = { dispose: () => order.push(2) };
    const c: Disposable = { dispose: () => order.push(3) };
    tracker.track(a);
    tracker.track(b);
    tracker.track(c);
    tracker.disposeAll();
    expect(order).toEqual([3, 2, 1]);
  });

  it("clears tracked resources after dispose", () => {
    const tracker = new ResourceTracker();
    const disposeFn = vi.fn();
    tracker.track({ dispose: disposeFn });
    tracker.disposeAll();
    tracker.disposeAll();
    expect(disposeFn).toHaveBeenCalledTimes(1);
  });

  it("continues disposing even if one throws", () => {
    const tracker = new ResourceTracker();
    const order: number[] = [];
    tracker.track({
      dispose: () => order.push(1),
    });
    tracker.track({
      dispose: () => {
        throw new Error("boom");
      },
    });
    tracker.track({ dispose: () => order.push(3) });
    tracker.disposeAll();
    expect(order).toEqual([3, 1]);
  });
});
