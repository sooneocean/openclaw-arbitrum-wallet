import { Contract, isAddress, formatEther, formatUnits } from "ethers";
import {
  GetPortfolioParams,
  GetPortfolioData,
  HandlerResult,
  ERC20_ABI,
} from "../types.js";
import { isNetworkError } from "../errors.js";
import { getProvider, withRetry } from "../provider.js";

export async function getPortfolioHandler(
  params: GetPortfolioParams
): Promise<HandlerResult<GetPortfolioData>> {
  if (!isAddress(params.address)) {
    return {
      success: false,
      error: `ValidationError: Invalid address "${params.address}"`,
    };
  }

  if (params.tokenAddresses) {
    for (let i = 0; i < params.tokenAddresses.length; i++) {
      if (!isAddress(params.tokenAddresses[i])) {
        return {
          success: false,
          error: `ValidationError: Invalid token address at index ${i}: "${params.tokenAddresses[i]}"`,
        };
      }
    }
  }

  const provider = getProvider(params.rpcUrl);

  try {
    // Get ETH balance
    const ethRaw = await withRetry(() => provider.getBalance(params.address));
    const ethBalance = formatEther(ethRaw);

    // Get token balances
    const tokens: GetPortfolioData["tokens"] = [];

    if (params.tokenAddresses && params.tokenAddresses.length > 0) {
      const results = await Promise.allSettled(
        params.tokenAddresses.map(async (addr) => {
          const contract = new Contract(addr, ERC20_ABI, provider);
          const [rawBalance, decimalsRaw, symbol] = await Promise.all([
            withRetry(() => contract.balanceOf(params.address)),
            withRetry(() => contract.decimals()).catch(() => BigInt(18)),
            withRetry(() => contract.symbol()).catch(() => "UNKNOWN"),
          ]);
          const decimals = Number(decimalsRaw);
          return {
            address: addr,
            symbol: symbol as string,
            decimals,
            balance: formatUnits(rawBalance, decimals),
            raw: rawBalance.toString(),
          };
        })
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          tokens.push(result.value);
        }
      }
    }

    return {
      success: true,
      data: {
        address: params.address,
        ethBalance,
        tokens,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isNetworkError(err)) {
      return { success: false, error: `NetworkError: ${msg}` };
    }
    return { success: false, error: `PortfolioError: ${msg}` };
  }
}
