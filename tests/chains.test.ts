import { resolveRpcUrl, getFallbackRpcUrls, getChainConfig, SUPPORTED_CHAIN_IDS } from "../src/chains";
import { getSupportedChainsHandler } from "../src/tools/getSupportedChains";

describe("chain registry", () => {
  it("resolves Arbitrum One by default", () => {
    expect(resolveRpcUrl()).toContain("arb1");
  });

  it("resolves Ethereum by chainId", () => {
    expect(resolveRpcUrl(undefined, 1)).toContain("eth");
  });

  it("resolves Base by chainId", () => {
    expect(resolveRpcUrl(undefined, 8453)).toContain("base");
  });

  it("resolves Optimism by chainId", () => {
    expect(resolveRpcUrl(undefined, 10)).toContain("optimism");
  });

  it("explicit rpcUrl takes precedence over chainId", () => {
    expect(resolveRpcUrl("https://custom.rpc", 1)).toBe("https://custom.rpc");
  });

  it("falls back to Arbitrum for unknown chainId", () => {
    expect(resolveRpcUrl(undefined, 99999)).toContain("arb1");
  });

  it("getChainConfig returns config for known chain", () => {
    const config = getChainConfig(42161);
    expect(config?.name).toBe("Arbitrum One");
    expect(config?.uniswapV3?.factory).toBeDefined();
  });

  it("getChainConfig returns undefined for unknown chain", () => {
    expect(getChainConfig(99999)).toBeUndefined();
  });

  it("returns fallback URLs for default chain", () => {
    const fallbacks = getFallbackRpcUrls();
    expect(fallbacks.length).toBeGreaterThanOrEqual(2);
    expect(fallbacks[0]).not.toContain("arb1.arbitrum.io"); // not primary
  });

  it("returns empty fallbacks for explicit rpcUrl", () => {
    expect(getFallbackRpcUrls("https://custom.rpc")).toEqual([]);
  });

  it("SUPPORTED_CHAIN_IDS includes all 4 chains", () => {
    expect(SUPPORTED_CHAIN_IDS).toContain(1);
    expect(SUPPORTED_CHAIN_IDS).toContain(10);
    expect(SUPPORTED_CHAIN_IDS).toContain(8453);
    expect(SUPPORTED_CHAIN_IDS).toContain(42161);
  });
});

describe("getSupportedChainsHandler", () => {
  it("returns all supported chains", async () => {
    const result = await getSupportedChainsHandler();
    expect(result.success).toBe(true);
    expect(result.data?.chains.length).toBe(4);
    expect(result.data?.chains.every((c) => c.hasUniswap)).toBe(true);
  });
});
