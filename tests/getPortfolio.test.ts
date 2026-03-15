import { getPortfolioHandler } from "../src/tools/getPortfolio";

const mockGetBalance = jest.fn();
const mockBalanceOf = jest.fn();
const mockDecimals = jest.fn();
const mockSymbol = jest.fn();

const ADDR = "0x" + "aa".repeat(20);
const TOKEN = "0x" + "bb".repeat(20);

jest.mock("ethers", () => ({
  Contract: jest.fn().mockImplementation(() => ({
    balanceOf: mockBalanceOf,
    decimals: mockDecimals,
    symbol: mockSymbol,
  })),
  JsonRpcProvider: jest.fn().mockImplementation(() => ({
    getBalance: mockGetBalance,
  })),
  isAddress: jest.fn().mockImplementation(
    (addr: string) => addr.startsWith("0x") && addr.length === 42
  ),
  formatEther: jest.fn().mockImplementation(
    (val: bigint) => (Number(val) / 1e18).toString()
  ),
  formatUnits: jest.fn().mockImplementation(
    (val: bigint, dec: number) => (Number(val) / 10 ** dec).toString()
  ),
}));

describe("getPortfolioHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetBalance.mockResolvedValue(1000000000000000000n); // 1 ETH
    mockBalanceOf.mockResolvedValue(500000000n); // 500 USDC (6 dec)
    mockDecimals.mockResolvedValue(BigInt(6));
    mockSymbol.mockResolvedValue("USDC");
  });

  it("returns ETH balance without tokens", async () => {
    const result = await getPortfolioHandler({ address: ADDR });
    expect(result.success).toBe(true);
    expect(result.data?.ethBalance).toBe("1");
    expect(result.data?.tokens).toHaveLength(0);
  });

  it("returns ETH + token balances", async () => {
    const result = await getPortfolioHandler({
      address: ADDR,
      tokenAddresses: [TOKEN],
    });
    expect(result.success).toBe(true);
    expect(result.data?.ethBalance).toBe("1");
    expect(result.data?.tokens).toHaveLength(1);
    expect(result.data?.tokens[0].symbol).toBe("USDC");
  });

  it("returns ValidationError for invalid address", async () => {
    const result = await getPortfolioHandler({ address: "bad" });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^ValidationError/);
  });

  it("skips failed token queries", async () => {
    mockBalanceOf.mockRejectedValue(new Error("not a token"));
    const result = await getPortfolioHandler({
      address: ADDR,
      tokenAddresses: [TOKEN],
    });
    expect(result.success).toBe(true);
    expect(result.data?.tokens).toHaveLength(0);
  });
});
