/**
 * Classify whether an error is a private-key-related error.
 * Extracted from sendTransaction.ts / signMessage.ts (identical logic).
 *
 * P0 invariant: the five conditions below must be preserved verbatim.
 */
/**
 * Classify whether an error is a network/connectivity error.
 * Centralized to ensure all handlers use the same conditions.
 */
export function isNetworkError(err: unknown): boolean {
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

export function isInsufficientFundsError(err: unknown): boolean {
  const code = (err as { code?: string }).code;
  const msg = err instanceof Error ? err.message : String(err);
  return (
    code === "INSUFFICIENT_FUNDS" ||
    msg.toLowerCase().includes("insufficient funds")
  );
}

export function classifyKeyError(err: unknown): boolean {
  const code = (err as { code?: string }).code;
  const msg = err instanceof Error ? err.message : String(err);
  const msgLower = msg.toLowerCase();
  return (
    code === "INVALID_ARGUMENT" ||
    msgLower.includes("invalid private key") ||
    msgLower.includes("invalid argument") ||
    msgLower.includes("valid bigint") ||
    msgLower.includes("curve.n")
  );
}
