import type { Disposable } from "../recording-session.types";

export class ResourceTracker {
  private resources: Disposable[] = [];

  track(resource: Disposable): void {
    this.resources.push(resource);
  }

  disposeAll(): void {
    const toDispose = [...this.resources].reverse();
    this.resources = [];
    for (const resource of toDispose) {
      try {
        resource.dispose();
      } catch {
        // Continue disposing remaining resources
      }
    }
  }
}
