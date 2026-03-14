import { JsonRpcProvider } from "ethers";
import { DEFAULT_RPC_URL } from "./types.js";

const cache = new Map<string, JsonRpcProvider>();

/**
 * Get a cached JsonRpcProvider instance. Same rpcUrl returns the same instance.
 */
export function getProvider(rpcUrl?: string): JsonRpcProvider {
  const url = rpcUrl ?? DEFAULT_RPC_URL;
  let provider = cache.get(url);
  if (!provider) {
    provider = new JsonRpcProvider(url);
    cache.set(url, provider);
  }
  return provider;
}

/**
 * Clear the provider cache. For testing only.
 */
export function resetProviderCache(): void {
  cache.clear();
}

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  delayFn?: (ms: number) => Promise<void>;
  isRetryable?: (err: unknown) => boolean;
}

function defaultIsRetryable(err: unknown): boolean {
  const code = (err as { code?: string }).code;
  const msg = err instanceof Error ? err.message : String(err);
  const msgLower = msg.toLowerCase();
  return (
    code === "NETWORK_ERROR" ||
    msgLower.includes("network") ||
    msgLower.includes("timeout") ||
    msgLower.includes("connection") ||
    msgLower.includes("econnrefused") ||
    msgLower.includes("econnreset")
  );
}

const defaultDelay = (ms: number) =>
  new Promise<void>((r) => setTimeout(r, ms));

/**
 * Retry wrapper. Retries on network errors, rethrows business errors immediately.
 * Rethrows the original error object (never wraps or modifies it).
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 2;
  const baseDelay = options?.baseDelay ?? 200;
  const delayFn = options?.delayFn ?? defaultDelay;
  const isRetryable = options?.isRetryable ?? defaultIsRetryable;

  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!isRetryable(err) || attempt === maxRetries) {
        throw err;
      }
      await delayFn(baseDelay * Math.pow(2, attempt));
    }
  }
  // Unreachable, but TypeScript needs it
  throw lastError;
}
