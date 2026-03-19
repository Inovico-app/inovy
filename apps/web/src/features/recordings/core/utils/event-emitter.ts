import type { Unsubscribe } from "../recording-session.types";

type EventMap = Record<string, unknown[]>;

export class TypedEventEmitter<T extends EventMap> {
  private listeners = new Map<keyof T, Set<(...args: never[]) => void>>();

  on<K extends keyof T>(
    event: K,
    listener: (...args: T[K]) => void,
  ): Unsubscribe {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const set = this.listeners.get(event)!;
    set.add(listener as (...args: never[]) => void);
    return () => {
      set.delete(listener as (...args: never[]) => void);
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
