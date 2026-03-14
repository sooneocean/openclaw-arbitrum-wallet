import {
  JsonRpcProvider,
  Contract,
  formatEther,
  formatUnits,
  isAddress,
} from "ethers";
import {
  GetBalanceParams,
  GetBalanceData,
  HandlerResult,
  DEFAULT_RPC_URL,
  ERC20_ABI,
} from "../types";

export async function getBalanceHandler(
  params: GetBalanceParams
): Promise<HandlerResult<GetBalanceData>> {
  if (!isAddress(params.address)) {
    return {
      success: false,
      error: `ValidationError: Invalid address "${params.address}"`,
    };
  }

  try {
    const provider = new JsonRpcProvider(params.rpcUrl ?? DEFAULT_RPC_URL);

    if (!params.tokenAddress) {
      // ETH path
      const raw = await provider.getBalance(params.address);
      return {
        success: true,
        data: {
          address: params.address,
          balance: formatEther(raw),
          symbol: "ETH",
          decimals: 18,
          raw: raw.toString(),
        },
      };
    }

    // ERC20 path — individual .catch() for per-field fallback
    const contract = new Contract(params.tokenAddress, ERC20_ABI, provider);

    let rawBalance: bigint;
    try {
      rawBalance = await contract.balanceOf(params.address);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: `InvalidContractError: balanceOf failed — ${msg}`,
      };
    }

    const [decimalsRaw, symbol] = await Promise.all([
      contract.decimals().catch(() => BigInt(18)),
      contract.symbol().catch(() => "UNKNOWN"),
    ]);

    const decimals = Number(decimalsRaw);

    return {
      success: true,
      data: {
        address: params.address,
        balance: formatUnits(rawBalance, decimals),
        symbol,
        decimals,
        raw: rawBalance.toString(),
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `NetworkError: ${msg}` };
  }
}
