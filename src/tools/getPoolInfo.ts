import { Contract, isAddress } from "ethers";
import {
  GetPoolInfoParams,
  GetPoolInfoData,
  HandlerResult,
} from "../types.js";
import { isNetworkError } from "../errors.js";
import { getProvider, withRetry } from "../provider.js";
import {
  UNISWAP_V3_FACTORY_ADDRESS,
  FACTORY_ABI,
  POOL_ABI,
  VALID_FEE_TIERS,
} from "../uniswap.js";

const POOL_LIQUIDITY_ABI = [
  "function liquidity() view returns (uint128)",
];

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export async function getPoolInfoHandler(
  params: GetPoolInfoParams
): Promise<HandlerResult<GetPoolInfoData>> {
  const fee = params.fee ?? 3000;

  if (!isAddress(params.tokenA)) {
    return {
      success: false,
      error: `ValidationError: Invalid tokenA address "${params.tokenA}"`,
    };
  }

  if (!isAddress(params.tokenB)) {
    return {
      success: false,
      error: `ValidationError: Invalid tokenB address "${params.tokenB}"`,
    };
  }

  if (params.tokenA.toLowerCase() === params.tokenB.toLowerCase()) {
    return {
      success: false,
      error: "ValidationError: tokenA and tokenB must be different",
    };
  }

  if (!(VALID_FEE_TIERS as readonly number[]).includes(fee)) {
    return {
      success: false,
      error: `ValidationError: Invalid fee tier ${fee}. Must be one of: ${VALID_FEE_TIERS.join(", ")}`,
    };
  }

  const provider = getProvider(params.rpcUrl);

  let poolAddress: string;
  try {
    const factory = new Contract(
      UNISWAP_V3_FACTORY_ADDRESS,
      FACTORY_ABI,
      provider
    );
    poolAddress = await withRetry(() =>
      factory.getPool(params.tokenA, params.tokenB, fee)
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isNetworkError(err)) {
      return { success: false, error: `NetworkError: ${msg}` };
    }
    return { success: false, error: `PoolError: Failed to query factory — ${msg}` };
  }

  if (poolAddress === ZERO_ADDRESS) {
    return {
      success: false,
      error: `PoolError: No Uniswap V3 pool found for the given token pair with fee tier ${fee}`,
    };
  }

  try {
    const pool = new Contract(
      poolAddress,
      [...POOL_ABI, ...POOL_LIQUIDITY_ABI],
      provider
    );

    const [slot0, token0, token1, liquidity] = await Promise.all([
      withRetry(() => pool.slot0()),
      withRetry(() => pool.token0()),
      withRetry(() => pool.token1()),
      withRetry(() => pool.liquidity()),
    ]);

    return {
      success: true,
      data: {
        poolAddress,
        token0,
        token1,
        fee,
        sqrtPriceX96: slot0[0].toString(),
        tick: Number(slot0[1]),
        liquidity: liquidity.toString(),
        unlocked: slot0[6],
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isNetworkError(err)) {
      return { success: false, error: `NetworkError: ${msg}` };
    }
    return { success: false, error: `PoolError: Failed to read pool — ${msg}` };
  }
}
