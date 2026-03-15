import { isAddress, parseEther, formatEther, formatUnits } from "ethers";
import {
  EstimateGasParams,
  EstimateGasData,
  HandlerResult,
} from "../types.js";
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
      tx.value = parseEther(params.value);
    }

    if (params.data) {
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
    return { success: false, error: `NetworkError: ${msg}` };
  }
}
