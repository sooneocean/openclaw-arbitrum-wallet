import { Contract, isAddress } from "ethers";
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

    // Calculate price from sqrtPriceX96 using BigInt to avoid precision loss.
    // sqrtPriceX96 can be up to 160 bits, so sqrtPriceX96^2 can be 320 bits.
    // JavaScript Number only has 53-bit precision — must use BigInt throughout.
    //
    // price_token0_in_token1 = (sqrtPriceX96^2 / 2^192) * 10^(dec0 - dec1)
    // We scale by PRECISION_FACTOR to maintain decimal precision in BigInt division.

    const Q192 = 2n ** 192n;
    const PRECISION = 10n ** 18n; // 18 decimal places of precision
    const sqrtPriceSq = sqrtPriceX96 * sqrtPriceX96;

    const isTokenAToken0 =
      params.tokenA.toLowerCase() === token0Address.toLowerCase();

    // price0in1 = sqrtPriceSq * 10^dec1 * PRECISION / (Q192 * 10^dec0)
    // This gives us price with 18 decimals of precision in BigInt
    const dec0 = isTokenAToken0 ? decimalsA : decimalsB;
    const dec1 = isTokenAToken0 ? decimalsB : decimalsA;

    let scaledPrice: bigint;
    if (isTokenAToken0) {
      // price of tokenA (token0) in tokenB (token1)
      scaledPrice =
        (sqrtPriceSq * 10n ** BigInt(dec1) * PRECISION) /
        (Q192 * 10n ** BigInt(dec0));
    } else {
      // price of tokenA (token1) in tokenB (token0) = inverse
      // = Q192 * 10^dec0 * PRECISION / (sqrtPriceSq * 10^dec1)
      scaledPrice =
        (Q192 * 10n ** BigInt(dec0) * PRECISION) /
        (sqrtPriceSq * 10n ** BigInt(dec1));
    }

    // Convert BigInt with 18 decimals to string
    const intPart = scaledPrice / PRECISION;
    const fracPart = scaledPrice % PRECISION;
    const fracStr = fracPart.toString().padStart(18, "0");
    const priceStr =
      intPart > 0n
        ? `${intPart}.${fracStr.slice(0, 6)}`
        : `0.${fracStr}`;

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
