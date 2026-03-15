import { formatUnits } from "ethers";
import {
  WatchTransactionParams,
  WatchTransactionData,
  HandlerResult,
} from "../types.js";
import { isNetworkError } from "../errors.js";
import { getProvider } from "../provider.js";

export async function watchTransactionHandler(
  params: WatchTransactionParams
): Promise<HandlerResult<WatchTransactionData>> {
  const confirmations = params.confirmations ?? 1;
  const timeoutMs = params.timeoutMs ?? 120000;

  // --- Validation ---

  if (!/^0x[0-9a-fA-F]{64}$/.test(params.txHash)) {
    return {
      success: false,
      error: `ValidationError: Invalid transaction hash "${params.txHash}". Must be 0x-prefixed 66-char hex.`,
    };
  }

  if (confirmations < 1) {
    return {
      success: false,
      error: `ValidationError: confirmations must be at least 1, got ${confirmations}`,
    };
  }

  if (timeoutMs < 1000) {
    return {
      success: false,
      error: `ValidationError: timeoutMs must be at least 1000, got ${timeoutMs}`,
    };
  }

  const provider = getProvider(params.rpcUrl);

  try {
    const receipt = await provider.waitForTransaction(
      params.txHash,
      confirmations,
      timeoutMs
    );

    if (!receipt) {
      return {
        success: false,
        error: "WatchError: Transaction not confirmed within timeout",
      };
    }

    return {
      success: true,
      data: {
        txHash: receipt.hash,
        status: receipt.status === 1 ? "success" : "reverted",
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        effectiveGasPriceGwei: formatUnits(
          receipt.gasPrice ?? 0n,
          "gwei"
        ),
        from: receipt.from,
        to: receipt.to ?? "",
        confirmations,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);

    if (msg.toLowerCase().includes("timeout")) {
      return {
        success: false,
        error: `WatchError: Transaction not confirmed within ${timeoutMs}ms — ${msg}`,
      };
    }

    if (isNetworkError(err)) {
      return { success: false, error: `NetworkError: ${msg}` };
    }

    return { success: false, error: `WatchError: ${msg}` };
  }
}
