import { Contract, isAddress, formatUnits } from "ethers";
import {
  GetTokenInfoParams,
  GetTokenInfoData,
  HandlerResult,
  ERC20_ABI,
} from "../types.js";
import { isNetworkError } from "../errors.js";
import { getProvider, withRetry } from "../provider.js";

export async function getTokenInfoHandler(
  params: GetTokenInfoParams
): Promise<HandlerResult<GetTokenInfoData>> {
  if (!isAddress(params.tokenAddress)) {
    return {
      success: false,
      error: `ValidationError: Invalid token address "${params.tokenAddress}"`,
    };
  }

  try {
    const provider = getProvider(params.rpcUrl);
    const contract = new Contract(params.tokenAddress, ERC20_ABI, provider);

    const [name, symbol, decimalsRaw, totalSupplyRaw] = await Promise.all([
      withRetry(() => contract.name()).catch(() => "UNKNOWN"),
      withRetry(() => contract.symbol()).catch(() => "UNKNOWN"),
      withRetry(() => contract.decimals()),
      withRetry(() => contract.totalSupply()),
    ]);

    const decimals = Number(decimalsRaw);

    return {
      success: true,
      data: {
        tokenAddress: params.tokenAddress,
        name,
        symbol,
        decimals,
        totalSupply: formatUnits(totalSupplyRaw, decimals),
        totalSupplyRaw: totalSupplyRaw.toString(),
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isNetworkError(err)) {
      return { success: false, error: `NetworkError: ${msg}` };
    }
    return { success: false, error: `TokenInfoError: ${msg}` };
  }
}
