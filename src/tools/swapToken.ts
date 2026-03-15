import {
  Wallet,
  Contract,
  isAddress,
  parseEther,
  parseUnits,
  formatUnits,
  formatEther,
} from "ethers";
import {
  SwapTokenParams,
  SwapTokenData,
  HandlerResult,
  ERC20_ABI,
} from "../types.js";
import { classifyKeyError, isNetworkError } from "../errors.js";
import { getProvider, withRetry } from "../provider.js";
import {
  SWAP_ROUTER_ADDRESS,
  QUOTER_V2_ADDRESS,
  WETH_ADDRESS,
  SWAP_ROUTER_ABI,
  QUOTER_V2_ABI,
  VALID_FEE_TIERS,
} from "../uniswap.js";

function isEth(token: string): boolean {
  return token.toUpperCase() === "ETH";
}

export async function swapTokenHandler(
  params: SwapTokenParams
): Promise<HandlerResult<SwapTokenData>> {
  const fee = params.fee ?? 3000;
  const slippageBps = params.slippageBps ?? 50;
  const deadline = params.deadline ?? Math.floor(Date.now() / 1000) + 1800;

  // --- Parameter validation ---

  const tokenInIsEth = isEth(params.tokenIn);
  const tokenOutIsEth = isEth(params.tokenOut);

  if (tokenInIsEth && tokenOutIsEth) {
    return {
      success: false,
      error: 'ValidationError: cannot swap ETH to ETH',
    };
  }

  if (!tokenInIsEth && !isAddress(params.tokenIn)) {
    return {
      success: false,
      error: `ValidationError: Invalid tokenIn address "${params.tokenIn}"`,
    };
  }

  if (!tokenOutIsEth && !isAddress(params.tokenOut)) {
    return {
      success: false,
      error: `ValidationError: Invalid tokenOut address "${params.tokenOut}"`,
    };
  }

  if (
    !tokenInIsEth &&
    !tokenOutIsEth &&
    params.tokenIn.toLowerCase() === params.tokenOut.toLowerCase()
  ) {
    return {
      success: false,
      error: 'ValidationError: cannot swap token to itself',
    };
  }

  if (!(VALID_FEE_TIERS as readonly number[]).includes(fee)) {
    return {
      success: false,
      error: `ValidationError: Invalid fee tier ${fee}. Must be one of: ${VALID_FEE_TIERS.join(", ")}`,
    };
  }

  if (slippageBps < 0 || slippageBps > 10000) {
    return {
      success: false,
      error: `ValidationError: slippageBps must be between 0 and 10000, got ${slippageBps}`,
    };
  }

  if (deadline <= Math.floor(Date.now() / 1000)) {
    return {
      success: false,
      error: 'ValidationError: deadline already expired',
    };
  }

  // Parse amountIn
  let amountIn: bigint;
  try {
    amountIn = tokenInIsEth
      ? parseEther(params.amountIn)
      : parseUnits(params.amountIn, 18); // placeholder, will re-parse with actual decimals
  } catch {
    return {
      success: false,
      error: `ValidationError: Invalid amountIn "${params.amountIn}"`,
    };
  }

  if (amountIn <= 0n) {
    return {
      success: false,
      error: `ValidationError: amountIn must be greater than 0, got "${params.amountIn}"`,
    };
  }

  // --- Build wallet ---

  let wallet: Wallet;
  try {
    const provider = getProvider(params.rpcUrl);
    wallet = new Wallet(params.privateKey, provider);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (classifyKeyError(err)) {
      return { success: false, error: `InvalidKeyError: ${msg}` };
    }
    return { success: false, error: `SwapError: ${msg}` };
  }

  const provider = wallet.provider!;

  // --- Resolve actual tokenIn/tokenOut addresses and decimals ---

  const actualTokenIn = tokenInIsEth ? WETH_ADDRESS : params.tokenIn;
  const actualTokenOut = tokenOutIsEth ? WETH_ADDRESS : params.tokenOut;

  // Get tokenIn decimals and re-parse amountIn
  let tokenInDecimals = 18;
  if (!tokenInIsEth) {
    try {
      const tokenContract = new Contract(params.tokenIn, ERC20_ABI, provider);
      const dec = await withRetry(() => tokenContract.decimals());
      tokenInDecimals = Number(dec);
      amountIn = parseUnits(params.amountIn, tokenInDecimals);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (isNetworkError(err)) {
        return { success: false, error: `NetworkError: ${msg}` };
      }
      return {
        success: false,
        error: `SwapError: Failed to get tokenIn decimals — ${msg}`,
      };
    }
  }

  // Get tokenOut decimals for formatting output
  let tokenOutDecimals = 18;
  if (!tokenOutIsEth) {
    try {
      const tokenContract = new Contract(params.tokenOut, ERC20_ABI, provider);
      const dec = await withRetry(() => tokenContract.decimals());
      tokenOutDecimals = Number(dec);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (isNetworkError(err)) {
        return { success: false, error: `NetworkError: ${msg}` };
      }
      return {
        success: false,
        error: `SwapError: Failed to get tokenOut decimals — ${msg}`,
      };
    }
  }

  // --- Quote ---

  let quotedAmountOut: bigint;
  try {
    const quoter = new Contract(QUOTER_V2_ADDRESS, QUOTER_V2_ABI, provider);
    const quoteResult = await withRetry(() =>
      quoter.quoteExactInputSingle.staticCall({
        tokenIn: actualTokenIn,
        tokenOut: actualTokenOut,
        amountIn,
        fee,
        sqrtPriceLimitX96: 0n,
      })
    );
    quotedAmountOut = quoteResult[0];
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isNetworkError(err)) {
      return { success: false, error: `NetworkError: ${msg}` };
    }
    return {
      success: false,
      error: `SwapError: Quote failed — ${msg}`,
    };
  }

  // Calculate amountOutMinimum with slippage
  const amountOutMinimum =
    (quotedAmountOut * BigInt(10000 - slippageBps)) / 10000n;

  // Determine path
  const path: SwapTokenData["path"] = tokenInIsEth
    ? "ETH→TOKEN"
    : tokenOutIsEth
      ? "TOKEN→ETH"
      : "TOKEN→TOKEN";

  // Format output amounts
  const expectedAmountOut = tokenOutIsEth
    ? formatEther(quotedAmountOut)
    : formatUnits(quotedAmountOut, tokenOutDecimals);
  const amountOutMinStr = tokenOutIsEth
    ? formatEther(amountOutMinimum)
    : formatUnits(amountOutMinimum, tokenOutDecimals);

  // --- Execute swap ---

  try {
    const router = new Contract(
      SWAP_ROUTER_ADDRESS,
      SWAP_ROUTER_ABI,
      wallet
    );

    let tx;

    if (tokenOutIsEth) {
      // Token→ETH: multicall(exactInputSingle + unwrapWETH9)
      const iface = router.interface;
      const swapData = iface.encodeFunctionData("exactInputSingle", [
        {
          tokenIn: actualTokenIn,
          tokenOut: WETH_ADDRESS,
          fee,
          // recipient = address(2) = router holds WETH temporarily
          recipient: "0x0000000000000000000000000000000000000002",
          amountIn,
          amountOutMinimum,
          sqrtPriceLimitX96: 0n,
        },
      ]);
      const unwrapData = iface.encodeFunctionData("unwrapWETH9", [
        amountOutMinimum,
        wallet.address,
      ]);
      tx = await router.multicall(deadline, [swapData, unwrapData]);
    } else if (tokenInIsEth) {
      // ETH→Token: multicall(deadline, [exactInputSingle]) with msg.value
      const iface = router.interface;
      const swapData = iface.encodeFunctionData("exactInputSingle", [
        {
          tokenIn: WETH_ADDRESS,
          tokenOut: actualTokenOut,
          fee,
          recipient: wallet.address,
          amountIn,
          amountOutMinimum,
          sqrtPriceLimitX96: 0n,
        },
      ]);
      tx = await router.multicall(deadline, [swapData], { value: amountIn });
    } else {
      // Token→Token: multicall(deadline, [exactInputSingle])
      const iface = router.interface;
      const swapData = iface.encodeFunctionData("exactInputSingle", [
        {
          tokenIn: actualTokenIn,
          tokenOut: actualTokenOut,
          fee,
          recipient: wallet.address,
          amountIn,
          amountOutMinimum,
          sqrtPriceLimitX96: 0n,
        },
      ]);
      tx = await router.multicall(deadline, [swapData]);
    }

    return {
      success: true,
      data: {
        txHash: tx.hash,
        tokenIn: params.tokenIn,
        tokenOut: params.tokenOut,
        amountIn: params.amountIn,
        expectedAmountOut,
        amountOutMinimum: amountOutMinStr,
        fee,
        path,
      },
    };
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    const msg = err instanceof Error ? err.message : String(err);
    const msgLower = msg.toLowerCase();

    if (
      code === "INSUFFICIENT_FUNDS" ||
      msgLower.includes("insufficient funds")
    ) {
      return { success: false, error: `InsufficientFundsError: ${msg}` };
    }
    if (
      msgLower.includes("insufficient_output_amount") ||
      msgLower.includes("too little received")
    ) {
      return {
        success: false,
        error: `SwapError: Slippage exceeded — output below minimum. ${msg}`,
      };
    }
    if (classifyKeyError(err)) {
      return { success: false, error: `InvalidKeyError: ${msg}` };
    }
    if (isNetworkError(err)) {
      return { success: false, error: `NetworkError: ${msg}` };
    }
    return { success: false, error: `SwapError: ${msg}` };
  }
}
