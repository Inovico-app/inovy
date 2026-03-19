import type { Unsubscribe } from "../recording-session.types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Listener = (...args: any[]) => void;

export class TypedEventEmitter<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends Record<keyof T, any[]>,
> {
  private listeners = new Map<keyof T, Set<Listener>>();

  on<K extends keyof T>(
    event: K,
    listener: (...args: T[K]) => void,
  ): Unsubscribe {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const set = this.listeners.get(event)!;
    set.add(listener as Listener);
    return () => {
      set.delete(listener as Listener);
    };
  }

  emit<K extends keyof T>(event: K, ...args: T[K]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const listener of set) {
      (listener as (...args: T[K]) => void)(...args);
    }
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}
