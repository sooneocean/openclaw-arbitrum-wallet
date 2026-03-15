import { Contract, isAddress, formatUnits } from "ethers";
import {
  GetTokenPriceParams,
  GetTokenPriceData,
  HandlerResult,
  ERC20_ABI,
} from "../types.js";
import { isNetworkError } from "../errors.js";
import { getProvider, withRetry } from "../provider.js";
import {
  UNISWAP_V3_FACTORY_ADDRESS,
  FACTORY_ABI,
  POOL_ABI,
  VALID_FEE_TIERS,
} from "../uniswap.js";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export async function getTokenPriceHandler(
  params: GetTokenPriceParams
): Promise<HandlerResult<GetTokenPriceData>> {
  const fee = params.fee ?? 3000;

  // --- Validation ---

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

  // --- Get pool address ---

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
    return { success: false, error: `PriceError: Failed to query factory — ${msg}` };
  }

  if (poolAddress === ZERO_ADDRESS) {
    return {
      success: false,
      error: `PriceError: No Uniswap V3 pool found for the given token pair with fee tier ${fee}`,
    };
  }

  // --- Read slot0 and token ordering ---

  try {
    const pool = new Contract(poolAddress, POOL_ABI, provider);

    const [slot0Result, token0Address] = await Promise.all([
      withRetry(() => pool.slot0()),
      withRetry(() => pool.token0()),
    ]);

    const sqrtPriceX96: bigint = slot0Result[0];

    // Get decimals for both tokens
    const tokenAContract = new Contract(params.tokenA, ERC20_ABI, provider);
    const tokenBContract = new Contract(params.tokenB, ERC20_ABI, provider);

    const [decimalsA, decimalsB] = await Promise.all([
      withRetry(() => tokenAContract.decimals()).then(Number),
      withRetry(() => tokenBContract.decimals()).then(Number),
    ]);

    // Calculate price from sqrtPriceX96
    // price_token0_in_token1 = (sqrtPriceX96 / 2^96)^2 * 10^(decimals0 - decimals1)
    // We use high-precision math to avoid floating point issues

    const Q96 = 2n ** 96n;
    const numerator = sqrtPriceX96 * sqrtPriceX96;
    const denominator = Q96 * Q96;

    // token0/token1 price with decimal adjustment
    const isTokenAToken0 =
      params.tokenA.toLowerCase() === token0Address.toLowerCase();

    let price: number;
    if (isTokenAToken0) {
      // price of tokenA in tokenB = (sqrtPrice/2^96)^2 * 10^(decA - decB)
      price =
        (Number(numerator) / Number(denominator)) *
        10 ** (decimalsA - decimalsB);
    } else {
      // tokenA is token1, so we need inverse
      // price of token1 in token0 = 1 / ((sqrtPrice/2^96)^2 * 10^(dec0 - dec1))
      price =
        1 /
        ((Number(numerator) / Number(denominator)) *
          10 ** (decimalsB - decimalsA));
    }

    // Format to reasonable precision
    const priceStr =
      price < 0.000001
        ? price.toExponential(6)
        : price < 1
          ? price.toPrecision(6)
          : price < 1000000
            ? price.toFixed(6)
            : price.toExponential(6);

    return {
      success: true,
      data: {
        tokenA: params.tokenA,
        tokenB: params.tokenB,
        price: priceStr,
        fee,
        poolAddress,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isNetworkError(err)) {
      return { success: false, error: `NetworkError: ${msg}` };
    }
    return {
      success: false,
      error: `PriceError: Failed to read pool data — ${msg}`,
    };
  }
}
