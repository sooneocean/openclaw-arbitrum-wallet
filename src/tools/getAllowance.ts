import { Contract, isAddress, formatUnits } from "ethers";
import {
  GetAllowanceParams,
  GetAllowanceData,
  HandlerResult,
  ERC20_ABI,
} from "../types.js";
import { getProvider, withRetry } from "../provider.js";

export async function getAllowanceHandler(
  params: GetAllowanceParams
): Promise<HandlerResult<GetAllowanceData>> {
  if (!isAddress(params.tokenAddress)) {
    return {
      success: false,
      error: `ValidationError: Invalid token address "${params.tokenAddress}"`,
    };
  }

  if (!isAddress(params.owner)) {
    return {
      success: false,
      error: `ValidationError: Invalid owner address "${params.owner}"`,
    };
  }

  if (!isAddress(params.spender)) {
    return {
      success: false,
      error: `ValidationError: Invalid spender address "${params.spender}"`,
    };
  }

  try {
    const provider = getProvider(params.rpcUrl);
    const contract = new Contract(params.tokenAddress, ERC20_ABI, provider);

    const [rawAllowance, decimalsRaw, symbol] = await Promise.all([
      withRetry(() => contract.allowance(params.owner, params.spender)),
      withRetry(() => contract.decimals()).catch(() => BigInt(18)),
      withRetry(() => contract.symbol()).catch(() => "UNKNOWN"),
    ]);

    const decimals = Number(decimalsRaw);

    return {
      success: true,
      data: {
        owner: params.owner,
        spender: params.spender,
        tokenAddress: params.tokenAddress,
        allowance: formatUnits(rawAllowance, decimals),
        symbol,
        decimals,
        raw: rawAllowance.toString(),
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `NetworkError: ${msg}` };
  }
}
