import { isAddress, parseEther, Interface } from "ethers";
import {
  SimulateTransactionParams,
  SimulateTransactionData,
  HandlerResult,
} from "../types.js";
import { isNetworkError } from "../errors.js";
import { getProvider, withRetry } from "../provider.js";

export async function simulateTransactionHandler(
  params: SimulateTransactionParams
): Promise<HandlerResult<SimulateTransactionData>> {
  if (!isAddress(params.from)) {
    return {
      success: false,
      error: `ValidationError: Invalid from address "${params.from}"`,
    };
  }

  if (!isAddress(params.to)) {
    return {
      success: false,
      error: `ValidationError: Invalid to address "${params.to}"`,
    };
  }

  const tx: Record<string, unknown> = {
    from: params.from,
    to: params.to,
  };

  if (params.value) {
    try {
      tx.value = parseEther(params.value);
    } catch {
      return {
        success: false,
        error: `ValidationError: Invalid value "${params.value}"`,
      };
    }
  }

  if (params.data) {
    if (!/^0x[0-9a-fA-F]*$/.test(params.data)) {
      return {
        success: false,
        error: `ValidationError: Invalid data format`,
      };
    }
    tx.data = params.data;
  }

  const provider = getProvider(params.rpcUrl);

  try {
    // eth_call to simulate
    const returnData = await withRetry(() => provider.call(tx));

    // Also estimate gas
    let gasEstimate = "0";
    try {
      const gas = await withRetry(() => provider.estimateGas(tx));
      gasEstimate = gas.toString();
    } catch {
      // If estimateGas fails but call succeeded, gas is unknown
      gasEstimate = "unknown";
    }

    return {
      success: true,
      data: {
        success: true,
        returnData,
        gasEstimate,
        revertReason: null,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);

    if (isNetworkError(err)) {
      return { success: false, error: `NetworkError: ${msg}` };
    }

    // Try to extract revert reason
    let revertReason: string | null = null;
    const revertMatch = msg.match(/reverted with reason string '(.+?)'/);
    if (revertMatch) {
      revertReason = revertMatch[1];
    } else if (msg.includes("execution reverted")) {
      revertReason = "execution reverted (no reason)";
    }

    // Simulation "succeeded" in the sense that we got a result — it just reverted
    return {
      success: true,
      data: {
        success: false,
        returnData: "",
        gasEstimate: "0",
        revertReason: revertReason ?? msg,
      },
    };
  }
}
