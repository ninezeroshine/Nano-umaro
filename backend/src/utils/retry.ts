const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function isRetryableStatus(status?: number): boolean {
  return status === 408 || status === 429 || status === 502 || status === 503;
}

export async function withRetry<T>(fn: () => Promise<T>, retries = 3, initialDelayMs = 600): Promise<T> {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      const status = error?.status ?? error?.response?.status;
      if (attempt >= retries || !isRetryableStatus(status)) {
        throw error;
      }
      const delay = initialDelayMs * Math.pow(2, attempt - 1);
      const jitter = delay * 0.2 * Math.random();
      await sleep(delay + jitter);
    }
  }
  throw new Error('Max retries reached');
}


