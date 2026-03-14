import { getBalanceHandler } from "../src/tools/getBalance";

const mockGetBalance = jest.fn();
const mockBalanceOf = jest.fn();
const mockDecimals = jest.fn();
const mockSymbol = jest.fn();

jest.mock("ethers", () => {
  const actual = jest.requireActual("ethers");
  return {
    ...actual,
    JsonRpcProvider: jest.fn(() => ({
      getBalance: mockGetBalance,
    })),
    Contract: jest.fn(() => ({
      balanceOf: mockBalanceOf,
      decimals: mockDecimals,
      symbol: mockSymbol,
    })),
  };
});

describe("getBalanceHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns ETH balance correctly", async () => {
    mockGetBalance.mockResolvedValue(BigInt("1500000000000000000"));
    const result = await getBalanceHandler({
      address: "0x1234567890123456789012345678901234567890",
    });
    expect(result.success).toBe(true);
    expect(result.data?.balance).toBe("1.5");
    expect(result.data?.symbol).toBe("ETH");
    expect(result.data?.decimals).toBe(18);
    expect(result.data?.raw).toBe("1500000000000000000");
  });

  it("returns ERC20 token balance correctly", async () => {
    mockBalanceOf.mockResolvedValue(BigInt("100000000")); // 100 USDC (6 decimals)
    mockDecimals.mockResolvedValue(BigInt(6));
    mockSymbol.mockResolvedValue("USDC");
    const result = await getBalanceHandler({
      address: "0x1234567890123456789012345678901234567890",
      tokenAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    });
    expect(result.success).toBe(true);
    expect(result.data?.symbol).toBe("USDC");
    expect(result.data?.decimals).toBe(6);
    expect(result.data?.raw).toBe("100000000");
  });

  it("falls back decimals to 18 when decimals() fails", async () => {
    mockBalanceOf.mockResolvedValue(BigInt("1000000000000000000"));
    mockDecimals.mockRejectedValue(new Error("revert"));
    mockSymbol.mockResolvedValue("TKN");
    const result = await getBalanceHandler({
      address: "0x1234567890123456789012345678901234567890",
      tokenAddress: "0xdeadbeef00000000000000000000000000000001",
    });
    expect(result.success).toBe(true);
    expect(result.data?.decimals).toBe(18);
  });

  it("falls back symbol to UNKNOWN when symbol() fails", async () => {
    mockBalanceOf.mockResolvedValue(BigInt("1000000000000000000"));
    mockDecimals.mockResolvedValue(BigInt(18));
    mockSymbol.mockRejectedValue(new Error("revert"));
    const result = await getBalanceHandler({
      address: "0x1234567890123456789012345678901234567890",
      tokenAddress: "0xdeadbeef00000000000000000000000000000002",
    });
    expect(result.success).toBe(true);
    expect(result.data?.symbol).toBe("UNKNOWN");
  });

  it("returns NetworkError when RPC fails", async () => {
    mockGetBalance.mockRejectedValue(new Error("connection refused"));
    const result = await getBalanceHandler({
      address: "0x1234567890123456789012345678901234567890",
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/NetworkError/);
  });

  it("returns InvalidContractError when ERC20 balanceOf fails", async () => {
    mockBalanceOf.mockRejectedValue(new Error("call revert exception"));
    mockDecimals.mockResolvedValue(BigInt(18));
    mockSymbol.mockResolvedValue("BAD");
    const result = await getBalanceHandler({
      address: "0x1234567890123456789012345678901234567890",
      tokenAddress: "0x0000000000000000000000000000000000000001",
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/InvalidContractError/);
  });

  it("returns ValidationError for invalid address", async () => {
    const result = await getBalanceHandler({ address: "not-an-address" });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/ValidationError/);
  });
});
