import { formatUnits } from "ethers";
import { GetBlockParams, GetBlockData, HandlerResult } from "../types.js";
import { isNetworkError } from "../errors.js";
import { getProvider, withRetry } from "../provider.js";

export async function getBlockHandler(
  params: GetBlockParams
): Promise<HandlerResult<GetBlockData>> {
  const blockTag = params.block ?? "latest";

  const provider = getProvider(params.rpcUrl);

  try {
    const block = await withRetry(() => provider.getBlock(blockTag));

    if (!block) {
      return {
        success: false,
        error: `BlockError: Block "${blockTag}" not found`,
      };
    }

    return {
      success: true,
      data: {
        number: block.number,
        hash: block.hash ?? "",
        timestamp: block.timestamp,
        gasUsed: block.gasUsed.toString(),
        gasLimit: block.gasLimit.toString(),
        baseFeePerGas: block.baseFeePerGas
          ? formatUnits(block.baseFeePerGas, "gwei")
          : null,
        transactionCount: block.transactions.length,
        miner: block.miner,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isNetworkError(err)) {
      return { success: false, error: `NetworkError: ${msg}` };
    }
    return { success: false, error: `BlockError: ${msg}` };
  }
}
