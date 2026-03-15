/**
 * Chain registry — maps chainId to RPC URL and Uniswap contract addresses.
 */

export interface ChainConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
  weth: string;
  uniswapV3?: {
    factory: string;
    swapRouter02: string;
    quoterV2: string;
  };
}

export const CHAINS: Record<number, ChainConfig> = {
  42161: {
    name: "Arbitrum One",
    chainId: 42161,
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    weth: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    uniswapV3: {
      factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
      swapRouter02: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
      quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    },
  },
  1: {
    name: "Ethereum",
    chainId: 1,
    rpcUrl: "https://eth.llamarpc.com",
    weth: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    uniswapV3: {
      factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
      swapRouter02: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
      quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    },
  },
  8453: {
    name: "Base",
    chainId: 8453,
    rpcUrl: "https://mainnet.base.org",
    weth: "0x4200000000000000000000000000000000000006",
    uniswapV3: {
      factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
      swapRouter02: "0x2626664c2603336E57B271c5C0b26F421741e481",
      quoterV2: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a",
    },
  },
  10: {
    name: "Optimism",
    chainId: 10,
    rpcUrl: "https://mainnet.optimism.io",
    weth: "0x4200000000000000000000000000000000000006",
    uniswapV3: {
      factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
      swapRouter02: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
      quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    },
  },
};

/**
 * Resolve RPC URL from chainId or explicit rpcUrl.
 * Explicit rpcUrl always takes precedence.
 */
export function resolveRpcUrl(rpcUrl?: string, chainId?: number): string {
  if (rpcUrl) return rpcUrl;
  if (chainId && CHAINS[chainId]) return CHAINS[chainId].rpcUrl;
  return CHAINS[42161].rpcUrl; // default: Arbitrum One
}

/**
 * Get chain config by chainId. Returns undefined if not supported.
 */
export function getChainConfig(chainId: number): ChainConfig | undefined {
  return CHAINS[chainId];
}

/** All supported chain IDs */
export const SUPPORTED_CHAIN_IDS = Object.keys(CHAINS).map(Number);
