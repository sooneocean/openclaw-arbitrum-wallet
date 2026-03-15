import { isAddress, parseEther, formatEther, formatUnits } from "ethers";
import {
  EstimateGasParams,
  EstimateGasData,
  HandlerResult,
} from "../types.js";
import { isNetworkError } from "../errors.js";
import { getProvider, withRetry } from "../provider.js";

export async function estimateGasHandler(
  params: EstimateGasParams
): Promise<HandlerResult<EstimateGasData>> {
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

  try {
    const provider = getProvider(params.rpcUrl);

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
          error: `ValidationError: Invalid data format "${params.data}"`,
        };
      }
      tx.data = params.data;
    }

    const [gasEstimate, feeData] = await Promise.all([
      withRetry(() => provider.estimateGas(tx)),
      withRetry(() => provider.getFeeData()),
    ]);

    const gasPrice = feeData.gasPrice ?? BigInt(0);
    const totalCost = gasEstimate * gasPrice;

    return {
      success: true,
      data: {
        gasEstimate: gasEstimate.toString(),
        gasPriceGwei: formatUnits(gasPrice, "gwei"),
        estimatedCostEth: formatEther(totalCost),
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isNetworkError(err)) {
      return { success: false, error: `NetworkError: ${msg}` };
    }
    return { success: false, error: `EstimateError: ${msg}` };
  }
}
