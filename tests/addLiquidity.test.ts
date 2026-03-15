import { addLiquidityHandler } from "../src/tools/addLiquidity";

const mockMint = jest.fn();
const mockDecimals = jest.fn();

const TOKEN_0 = "0x" + "aa".repeat(20);
const TOKEN_1 = "0x" + "bb".repeat(20);
const VALID_KEY = "0x" + "ab".repeat(32);

jest.mock("ethers", () => ({
  Wallet: jest.fn().mockImplementation((key: string) => {
    if (key === "0xinvalid") throw Object.assign(new Error("invalid private key"), { code: "INVALID_ARGUMENT" });
    return { address: "0xSender", provider: {} };
  }),
  Contract: jest.fn().mockImplementation((_addr: string, abi: unknown) => {
    const s = JSON.stringify(abi);
    if (s.includes("mint")) return { mint: mockMint };
    return { decimals: mockDecimals };
  }),
  JsonRpcProvider: jest.fn().mockImplementation(() => ({})),
  isAddress: jest.fn().mockImplementation((a: string) => a.startsWith("0x") && a.length === 42),
  parseUnits: jest.fn().mockImplementation((v: string, d: number) => BigInt(Math.floor(Number(v) * 10 ** d))),
}));

describe("addLiquidityHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDecimals.mockResolvedValue(BigInt(18));
    mockMint.mockResolvedValue({ hash: "0xMintHash" });
  });

  it("mints a new position", async () => {
    const result = await addLiquidityHandler({
      privateKey: VALID_KEY, token0: TOKEN_0, token1: TOKEN_1,
      fee: 3000, tickLower: -887220, tickUpper: 887220,
      amount0Desired: "1.0", amount1Desired: "1000",
    });
    expect(result.success).toBe(true);
    expect(result.data?.txHash).toBe("0xMintHash");
  });

  it("returns ValidationError for same tokens", async () => {
    const result = await addLiquidityHandler({
      privateKey: VALID_KEY, token0: TOKEN_0, token1: TOKEN_0,
      fee: 3000, tickLower: -100, tickUpper: 100,
      amount0Desired: "1", amount1Desired: "1",
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^ValidationError/);
  });

  it("returns ValidationError for tickLower >= tickUpper", async () => {
    const result = await addLiquidityHandler({
      privateKey: VALID_KEY, token0: TOKEN_0, token1: TOKEN_1,
      fee: 3000, tickLower: 100, tickUpper: 100,
      amount0Desired: "1", amount1Desired: "1",
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^ValidationError.*tick/);
  });

  it("returns InvalidKeyError for bad key", async () => {
    const result = await addLiquidityHandler({
      privateKey: "0xinvalid", token0: TOKEN_0, token1: TOKEN_1,
      fee: 3000, tickLower: -100, tickUpper: 100,
      amount0Desired: "1", amount1Desired: "1",
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^InvalidKeyError/);
  });
});
