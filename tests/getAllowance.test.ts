import { getAllowanceHandler } from "../src/tools/getAllowance";

const mockAllowance = jest.fn();
const mockDecimals = jest.fn();
const mockSymbol = jest.fn();

jest.mock("ethers", () => ({
  Contract: jest.fn().mockImplementation(() => ({
    allowance: mockAllowance,
    decimals: mockDecimals,
    symbol: mockSymbol,
  })),
  JsonRpcProvider: jest.fn().mockImplementation(() => ({})),
  isAddress: jest.fn().mockImplementation(
    (addr: string) => addr.startsWith("0x") && addr.length === 42
  ),
  formatUnits: jest.fn().mockImplementation(
    (value: bigint, decimals: number) => (Number(value) / 10 ** decimals).toString()
  ),
}));

describe("getAllowanceHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDecimals.mockResolvedValue(BigInt(6));
    mockSymbol.mockResolvedValue("USDC");
    mockAllowance.mockResolvedValue(BigInt(1000000000)); // 1000 USDC
  });

  it("returns allowance for owner-spender pair", async () => {
    const result = await getAllowanceHandler({
      tokenAddress: "0x" + "cc".repeat(20),
      owner: "0x" + "aa".repeat(20),
      spender: "0x" + "bb".repeat(20),
    });

    expect(result.success).toBe(true);
    expect(result.data?.allowance).toBe("1000");
    expect(result.data?.symbol).toBe("USDC");
    expect(result.data?.decimals).toBe(6);
    expect(result.data?.raw).toBe("1000000000");
  });

  it("returns zero allowance", async () => {
    mockAllowance.mockResolvedValue(BigInt(0));

    const result = await getAllowanceHandler({
      tokenAddress: "0x" + "cc".repeat(20),
      owner: "0x" + "aa".repeat(20),
      spender: "0x" + "bb".repeat(20),
    });

    expect(result.success).toBe(true);
    expect(result.data?.raw).toBe("0");
  });

  it("returns ValidationError for invalid token address", async () => {
    const result = await getAllowanceHandler({
      tokenAddress: "bad",
      owner: "0x" + "aa".repeat(20),
      spender: "0x" + "bb".repeat(20),
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^ValidationError:/);
  });

  it("returns ValidationError for invalid owner address", async () => {
    const result = await getAllowanceHandler({
      tokenAddress: "0x" + "cc".repeat(20),
      owner: "bad",
      spender: "0x" + "bb".repeat(20),
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^ValidationError:/);
  });

  it("returns ValidationError for invalid spender address", async () => {
    const result = await getAllowanceHandler({
      tokenAddress: "0x" + "cc".repeat(20),
      owner: "0x" + "aa".repeat(20),
      spender: "bad",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^ValidationError:/);
  });

  it("returns NetworkError on RPC failure", async () => {
    mockAllowance.mockRejectedValue(
      Object.assign(new Error("timeout"), { code: "NETWORK_ERROR" })
    );

    const result = await getAllowanceHandler({
      tokenAddress: "0x" + "cc".repeat(20),
      owner: "0x" + "aa".repeat(20),
      spender: "0x" + "bb".repeat(20),
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^NetworkError:/);
  });
});
