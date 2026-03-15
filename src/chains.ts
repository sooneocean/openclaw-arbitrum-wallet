/**
 * Chain registry — maps chainId to RPC URLs (with fallbacks) and Uniswap contract addresses.
 */

export interface ChainConfig {
  name: string;
  chainId: number;
  rpcUrls: string[];
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
    rpcUrls: [
      "https://arb1.arbitrum.io/rpc",
      "https://arbitrum.llamarpc.com",
      "https://1rpc.io/arb",
    ],
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
    rpcUrls: [
      "https://eth.llamarpc.com",
      "https://1rpc.io/eth",
      "https://rpc.ankr.com/eth",
    ],
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
    rpcUrls: [
      "https://mainnet.base.org",
      "https://1rpc.io/base",
      "https://base.llamarpc.com",
    ],
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
    rpcUrls: [
      "https://mainnet.optimism.io",
      "https://1rpc.io/op",
      "https://optimism.llamarpc.com",
    ],
    weth: "0x4200000000000000000000000000000000000006",
    uniswapV3: {
      factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
      swapRouter02: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
      quoterV2: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
    },
  },
};

/** Backward compat: get primary RPC URL */
function primaryRpcUrl(chainId: number): string {
  return CHAINS[chainId]?.rpcUrls[0] ?? CHAINS[42161].rpcUrls[0];
}

/**
 * Resolve RPC URL from chainId or explicit rpcUrl.
 * Explicit rpcUrl always takes precedence.
 */
export function resolveRpcUrl(rpcUrl?: string, chainId?: number): string {
  if (rpcUrl) return rpcUrl;
  if (chainId && CHAINS[chainId]) return primaryRpcUrl(chainId);
  return primaryRpcUrl(42161); // default: Arbitrum One
}

/**
 * Get fallback RPC URLs for a chain. Returns empty array for explicit rpcUrl.
 */
export function getFallbackRpcUrls(rpcUrl?: string, chainId?: number): string[] {
  if (rpcUrl) return []; // explicit URL = no fallbacks
  const id = chainId ?? 42161;
  const urls = CHAINS[id]?.rpcUrls ?? CHAINS[42161].rpcUrls;
  return urls.slice(1); // skip primary, return fallbacks
}

/**
 * Get chain config by chainId. Returns undefined if not supported.
 */
export function getChainConfig(chainId: number): ChainConfig | undefined {
  return CHAINS[chainId];
}

/** All supported chain IDs */
export const SUPPORTED_CHAIN_IDS = Object.keys(CHAINS).map(Number);
