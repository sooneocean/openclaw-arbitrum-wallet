/**
 * Classify whether an error is a private-key-related error.
 * Extracted from sendTransaction.ts / signMessage.ts (identical logic).
 *
 * P0 invariant: the five conditions below must be preserved verbatim.
 */
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
