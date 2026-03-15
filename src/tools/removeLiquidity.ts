import { Wallet, Contract } from "ethers";
import {
  RemoveLiquidityParams,
  RemoveLiquidityData,
  HandlerResult,
} from "../types.js";
import { classifyKeyError, isNetworkError } from "../errors.js";
import { getProvider, withRetry } from "../provider.js";
import {
  NONFUNGIBLE_POSITION_MANAGER_ADDRESS,
  POSITION_MANAGER_ABI,
} from "../uniswap.js";

const MAX_UINT128 = (1n << 128n) - 1n;

export async function removeLiquidityHandler(
  params: RemoveLiquidityParams
): Promise<HandlerResult<RemoveLiquidityData>> {
  if (!params.tokenId || !/^\d+$/.test(params.tokenId)) {
    return {
      success: false,
      error: `ValidationError: Invalid tokenId "${params.tokenId}"`,
    };
  }

  let wallet: Wallet;
  try {
    const provider = getProvider(params.rpcUrl);
    wallet = new Wallet(params.privateKey, provider);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (classifyKeyError(err)) return { success: false, error: `InvalidKeyError: ${msg}` };
    return { success: false, error: `LiquidityError: ${msg}` };
  }

  try {
    const pm = new Contract(
      NONFUNGIBLE_POSITION_MANAGER_ADDRESS,
      POSITION_MANAGER_ABI,
      wallet
    );

    // Read position to get current liquidity
    const position = await withRetry(() => pm.positions(params.tokenId));
    const liquidity: bigint = position[7]; // index 7 = liquidity

    if (liquidity === 0n) {
      return {
        success: false,
        error: "LiquidityError: Position has zero liquidity",
      };
    }

    const deadline = Math.floor(Date.now() / 1000) + 1800;

    // Step 1: decreaseLiquidity (remove all)
    await pm.decreaseLiquidity({
      tokenId: params.tokenId,
      liquidity,
      amount0Min: 0n,
      amount1Min: 0n,
      deadline,
    });

    // Step 2: collect all tokens
    const tx = await pm.collect({
      tokenId: params.tokenId,
      recipient: wallet.address,
      amount0Max: MAX_UINT128,
      amount1Max: MAX_UINT128,
    });

    return {
      success: true,
      data: {
        txHash: tx.hash,
        tokenId: params.tokenId,
        amount0: "collected",
        amount1: "collected",
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (classifyKeyError(err)) return { success: false, error: `InvalidKeyError: ${msg}` };
    if (isNetworkError(err)) return { success: false, error: `NetworkError: ${msg}` };
    return { success: false, error: `LiquidityError: ${msg}` };
  }
}
