interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  signal?: AbortSignal;
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const { maxRetries, baseDelayMs, signal } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      if (signal?.aborted) throw error;

      const delay = baseDelayMs * Math.pow(2, attempt);
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, delay);
        signal?.addEventListener(
          "abort",
          () => {
            clearTimeout(timer);
            reject(new Error("Aborted"));
          },
          { once: true },
        );
      });
    }
  }

  throw new Error("Unreachable");
}
