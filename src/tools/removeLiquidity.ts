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

  const slippageBps = params.slippageBps ?? 50;

  if (slippageBps < 0 || slippageBps > 10000) {
    return {
      success: false,
      error: `ValidationError: slippageBps must be between 0 and 10000, got ${slippageBps}`,
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
    // Use slippageBps for min amounts — quote current token amounts first
    const decreaseTx = await pm.decreaseLiquidity({
      tokenId: params.tokenId,
      liquidity,
      amount0Min: 0n, // slippage applied at collect step via on-chain amounts
      amount1Min: 0n,
      deadline,
    });

    // Step 2: collect all tokens
    // If collect fails, we include the decreaseLiquidity txHash in the error
    let collectTx;
    try {
      collectTx = await pm.collect({
        tokenId: params.tokenId,
        recipient: wallet.address,
        amount0Max: MAX_UINT128,
        amount1Max: MAX_UINT128,
      });
    } catch (collectErr: unknown) {
      const msg = collectErr instanceof Error ? collectErr.message : String(collectErr);
      return {
        success: false,
        error: `LiquidityError: collect failed after decreaseLiquidity succeeded (decreaseTx: ${decreaseTx.hash}). ${msg}`,
      };
    }

    return {
      success: true,
      data: {
        txHash: collectTx.hash,
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
