import { getTokenInfoHandler } from "../src/tools/getTokenInfo";

const mockName = jest.fn();
const mockSymbol = jest.fn();
const mockDecimals = jest.fn();
const mockTotalSupply = jest.fn();

jest.mock("ethers", () => ({
  Contract: jest.fn().mockImplementation(() => ({
    name: mockName,
    symbol: mockSymbol,
    decimals: mockDecimals,
    totalSupply: mockTotalSupply,
  })),
  JsonRpcProvider: jest.fn().mockImplementation(() => ({})),
  isAddress: jest.fn().mockImplementation(
    (addr: string) => addr.startsWith("0x") && addr.length === 42
  ),
  formatUnits: jest.fn().mockImplementation(
    (value: bigint, decimals: number) => (Number(value) / 10 ** decimals).toString()
  ),
}));

describe("getTokenInfoHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockName.mockResolvedValue("USD Coin");
    mockSymbol.mockResolvedValue("USDC");
    mockDecimals.mockResolvedValue(BigInt(6));
    mockTotalSupply.mockResolvedValue(BigInt(1000000000000)); // 1M USDC
  });

  it("returns full token info", async () => {
    const result = await getTokenInfoHandler({
      tokenAddress: "0x" + "cc".repeat(20),
    });

    expect(result.success).toBe(true);
    expect(result.data?.name).toBe("USD Coin");
    expect(result.data?.symbol).toBe("USDC");
    expect(result.data?.decimals).toBe(6);
    expect(result.data?.totalSupplyRaw).toBe("1000000000000");
  });

  it("falls back gracefully when name() fails", async () => {
    mockName.mockRejectedValue(new Error("not implemented"));

    const result = await getTokenInfoHandler({
      tokenAddress: "0x" + "cc".repeat(20),
    });

    expect(result.success).toBe(true);
    expect(result.data?.name).toBe("UNKNOWN");
  });

  it("returns ValidationError for invalid token address", async () => {
    const result = await getTokenInfoHandler({
      tokenAddress: "bad",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^ValidationError:/);
  });

  it("returns NetworkError on RPC failure", async () => {
    mockDecimals.mockRejectedValue(
      Object.assign(new Error("timeout"), { code: "NETWORK_ERROR" })
    );
    mockSymbol.mockRejectedValue(
      Object.assign(new Error("timeout"), { code: "NETWORK_ERROR" })
    );
    mockTotalSupply.mockRejectedValue(
      Object.assign(new Error("timeout"), { code: "NETWORK_ERROR" })
    );
    mockName.mockRejectedValue(
      Object.assign(new Error("timeout"), { code: "NETWORK_ERROR" })
    );

    const result = await getTokenInfoHandler({
      tokenAddress: "0x" + "cc".repeat(20),
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^NetworkError:/);
  });
});
