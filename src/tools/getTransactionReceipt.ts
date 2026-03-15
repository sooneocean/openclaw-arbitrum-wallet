import {
  GetTransactionReceiptParams,
  GetTransactionReceiptData,
  HandlerResult,
} from "../types.js";
import { getProvider, withRetry } from "../provider.js";

export async function getTransactionReceiptHandler(
  params: GetTransactionReceiptParams
): Promise<HandlerResult<GetTransactionReceiptData>> {
  // Validate txHash format (0x + 64 hex chars)
  if (!/^0x[0-9a-fA-F]{64}$/.test(params.txHash)) {
    return {
      success: false,
      error: `ValidationError: Invalid transaction hash "${params.txHash}"`,
    };
  }

  try {
    const provider = getProvider(params.rpcUrl);
    const receipt = await withRetry(() =>
      provider.getTransactionReceipt(params.txHash)
    );

    if (!receipt) {
      // Transaction not yet mined
      return {
        success: true,
        data: {
          txHash: params.txHash,
          status: "pending",
          blockNumber: null,
          gasUsed: null,
          from: null,
          to: null,
        },
      };
    }

    return {
      success: true,
      data: {
        txHash: params.txHash,
        status: receipt.status === 1 ? "success" : "reverted",
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        from: receipt.from,
        to: receipt.to,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `NetworkError: ${msg}` };
  }
}
