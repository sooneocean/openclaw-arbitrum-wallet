import { Contract, isAddress } from "ethers";
import {
  MulticallReadParams,
  MulticallReadData,
  HandlerResult,
} from "../types.js";
import { isNetworkError } from "../errors.js";
import { getProvider, withRetry } from "../provider.js";

// Multicall3 is deployed at the same address on all chains
const MULTICALL3_ADDRESS = "0xcA11bde05977b3631167028862bE2a173976CA11";

const MULTICALL3_ABI = [
  "function aggregate3(tuple(address target, bool allowFailure, bytes callData)[] calls) view returns (tuple(bool success, bytes returnData)[] returnData)",
  "function getBlockNumber() view returns (uint256 blockNumber)",
];

export async function multicallReadHandler(
  params: MulticallReadParams
): Promise<HandlerResult<MulticallReadData>> {
  if (!params.calls || params.calls.length === 0) {
    return {
      success: false,
      error: "ValidationError: calls array must not be empty",
    };
  }

  if (params.calls.length > 100) {
    return {
      success: false,
      error: "ValidationError: calls array exceeds maximum of 100",
    };
  }

  for (let i = 0; i < params.calls.length; i++) {
    const call = params.calls[i];
    if (!isAddress(call.target)) {
      return {
        success: false,
        error: `ValidationError: Invalid target address at index ${i}: "${call.target}"`,
      };
    }
    if (!/^0x[0-9a-fA-F]*$/.test(call.callData)) {
      return {
        success: false,
        error: `ValidationError: Invalid callData at index ${i}: must be hex-encoded`,
      };
    }
  }

  const provider = getProvider(params.rpcUrl);

  try {
    const multicall = new Contract(MULTICALL3_ADDRESS, MULTICALL3_ABI, provider);

    const formattedCalls = params.calls.map((c) => ({
      target: c.target,
      allowFailure: true,
      callData: c.callData,
    }));

    const [results, blockNumber] = await Promise.all([
      withRetry(() => multicall.aggregate3.staticCall(formattedCalls)),
      withRetry(() => multicall.getBlockNumber()),
    ]);

    const formattedResults = results.map(
      (r: { success: boolean; returnData: string }) => ({
        success: r.success,
        returnData: r.returnData,
      })
    );

    return {
      success: true,
      data: {
        results: formattedResults,
        blockNumber: Number(blockNumber),
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isNetworkError(err)) {
      return { success: false, error: `NetworkError: ${msg}` };
    }
    return { success: false, error: `MulticallError: ${msg}` };
  }
}
