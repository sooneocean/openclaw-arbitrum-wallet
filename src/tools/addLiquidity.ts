import { Wallet, Contract, isAddress, parseUnits } from "ethers";
import {
  AddLiquidityParams,
  AddLiquidityData,
  HandlerResult,
  ERC20_ABI,
} from "../types.js";
import { classifyKeyError, isNetworkError } from "../errors.js";
import { getProvider, withRetry } from "../provider.js";
import {
  NONFUNGIBLE_POSITION_MANAGER_ADDRESS,
  POSITION_MANAGER_ABI,
  VALID_FEE_TIERS,
} from "../uniswap.js";

export async function addLiquidityHandler(
  params: AddLiquidityParams
): Promise<HandlerResult<AddLiquidityData>> {
  const slippageBps = params.slippageBps ?? 50;

  if (!isAddress(params.token0)) {
    return { success: false, error: `ValidationError: Invalid token0 address "${params.token0}"` };
  }
  if (!isAddress(params.token1)) {
    return { success: false, error: `ValidationError: Invalid token1 address "${params.token1}"` };
  }
  if (params.token0.toLowerCase() === params.token1.toLowerCase()) {
    return { success: false, error: "ValidationError: token0 and token1 must be different" };
  }
  if (!(VALID_FEE_TIERS as readonly number[]).includes(params.fee)) {
    return { success: false, error: `ValidationError: Invalid fee tier ${params.fee}` };
  }
  if (params.tickLower >= params.tickUpper) {
    return { success: false, error: "ValidationError: tickLower must be less than tickUpper" };
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

  const provider = wallet.provider!;

  // Get decimals
  let dec0 = 18, dec1 = 18;
  try {
    const c0 = new Contract(params.token0, ERC20_ABI, provider);
    const c1 = new Contract(params.token1, ERC20_ABI, provider);
    [dec0, dec1] = await Promise.all([
      withRetry(() => c0.decimals()).then(Number),
      withRetry(() => c1.decimals()).then(Number),
    ]);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isNetworkError(err)) return { success: false, error: `NetworkError: ${msg}` };
    return { success: false, error: `LiquidityError: Failed to get decimals — ${msg}` };
  }

  const amount0Desired = parseUnits(params.amount0Desired, dec0);
  const amount1Desired = parseUnits(params.amount1Desired, dec1);
  const amount0Min = (amount0Desired * BigInt(10000 - slippageBps)) / 10000n;
  const amount1Min = (amount1Desired * BigInt(10000 - slippageBps)) / 10000n;
  const deadline = Math.floor(Date.now() / 1000) + 1800;

  try {
    const pm = new Contract(
      NONFUNGIBLE_POSITION_MANAGER_ADDRESS,
      POSITION_MANAGER_ABI,
      wallet
    );

    const tx = await pm.mint({
      token0: params.token0,
      token1: params.token1,
      fee: params.fee,
      tickLower: params.tickLower,
      tickUpper: params.tickUpper,
      amount0Desired,
      amount1Desired,
      amount0Min,
      amount1Min,
      recipient: wallet.address,
      deadline,
    });

    return {
      success: true,
      data: {
        txHash: tx.hash,
        tokenId: "pending",
        liquidity: "pending",
        amount0: params.amount0Desired,
        amount1: params.amount1Desired,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (classifyKeyError(err)) return { success: false, error: `InvalidKeyError: ${msg}` };
    if (isNetworkError(err)) return { success: false, error: `NetworkError: ${msg}` };
    return { success: false, error: `LiquidityError: ${msg}` };
  }
}
