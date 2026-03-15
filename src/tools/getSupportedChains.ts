import { HandlerResult } from "../types.js";
import { CHAINS, ChainConfig } from "../chains.js";

export interface GetSupportedChainsData {
  chains: {
    chainId: number;
    name: string;
    hasUniswap: boolean;
  }[];
}

export async function getSupportedChainsHandler(): Promise<
  HandlerResult<GetSupportedChainsData>
> {
  const chains = Object.values(CHAINS).map((c: ChainConfig) => ({
    chainId: c.chainId,
    name: c.name,
    hasUniswap: !!c.uniswapV3,
  }));

  return {
    success: true,
    data: { chains },
  };
}
