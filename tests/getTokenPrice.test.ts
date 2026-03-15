import { getTokenPriceHandler } from "../src/tools/getTokenPrice";

const mockGetPool = jest.fn();
const mockSlot0 = jest.fn();
const mockToken0 = jest.fn();
const mockDecimals = jest.fn();

const TOKEN_A = "0x" + "aa".repeat(20);
const TOKEN_B = "0x" + "bb".repeat(20);
const POOL_ADDR = "0x" + "cc".repeat(20);
const ZERO_ADDR = "0x" + "00".repeat(20);

jest.mock("ethers", () => ({
  Contract: jest.fn().mockImplementation((_addr: string, abi: unknown) => {
    const abiStr = JSON.stringify(abi);
    if (abiStr.includes("getPool")) {
      return { getPool: mockGetPool };
    }
    if (abiStr.includes("slot0")) {
      return { slot0: mockSlot0, token0: mockToken0 };
    }
    // ERC20
    return { decimals: mockDecimals };
  }),
  JsonRpcProvider: jest.fn().mockImplementation(() => ({})),
  isAddress: jest
    .fn()
    .mockImplementation(
      (addr: string) => addr.startsWith("0x") && addr.length === 42
    ),
  formatUnits: jest.fn().mockImplementation((val: bigint, dec: number) =>
    (Number(val) / 10 ** dec).toString()
  ),
}));

describe("getTokenPriceHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPool.mockResolvedValue(POOL_ADDR);
    mockToken0.mockResolvedValue(TOKEN_A);
    mockDecimals.mockResolvedValue(BigInt(18));
    // sqrtPriceX96 for price = 1.0 when both tokens are 18 decimals:
    // sqrtPrice = sqrt(1) * 2^96 = 2^96
    const sqrtPriceX96 = 2n ** 96n;
    mockSlot0.mockResolvedValue([sqrtPriceX96, 0, 0, 0, 0, 0, true]);
  });

  it("returns price for a valid token pair", async () => {
    const result = await getTokenPriceHandler({
      tokenA: TOKEN_A,
      tokenB: TOKEN_B,
    });

    expect(result.success).toBe(true);
    expect(result.data?.tokenA).toBe(TOKEN_A);
    expect(result.data?.tokenB).toBe(TOKEN_B);
    expect(result.data?.poolAddress).toBe(POOL_ADDR);
    expect(result.data?.fee).toBe(3000);
    expect(parseFloat(result.data?.price ?? "0")).toBeCloseTo(1.0, 4);
  });

  it("uses custom fee tier", async () => {
    const result = await getTokenPriceHandler({
      tokenA: TOKEN_A,
      tokenB: TOKEN_B,
      fee: 500,
    });

    expect(result.success).toBe(true);
    expect(result.data?.fee).toBe(500);
  });

  it("calculates inverse price when tokenA is token1", async () => {
    // tokenA is token1 (not token0)
    mockToken0.mockResolvedValue(TOKEN_B);
    // sqrtPriceX96 = sqrt(2) * 2^96 → price of token0 in token1 = 2
    // So price of token1 (tokenA) in token0 (tokenB) = 0.5
    const sqrtPriceX96 =
      (2n ** 96n * 14142135623730951n) / 10000000000000000n; // ~sqrt(2) * 2^96
    mockSlot0.mockResolvedValue([sqrtPriceX96, 0, 0, 0, 0, 0, true]);

    const result = await getTokenPriceHandler({
      tokenA: TOKEN_A,
      tokenB: TOKEN_B,
    });

    expect(result.success).toBe(true);
    expect(parseFloat(result.data?.price ?? "0")).toBeCloseTo(0.5, 1);
  });

  it("returns PriceError when pool does not exist", async () => {
    mockGetPool.mockResolvedValue(ZERO_ADDR);

    const result = await getTokenPriceHandler({
      tokenA: TOKEN_A,
      tokenB: TOKEN_B,
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^PriceError:.*[Nn]o.*pool found/i);
  });

  it("returns ValidationError for invalid tokenA", async () => {
    const result = await getTokenPriceHandler({
      tokenA: "bad",
      tokenB: TOKEN_B,
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^ValidationError:.*tokenA/);
  });

  it("returns ValidationError for invalid tokenB", async () => {
    const result = await getTokenPriceHandler({
      tokenA: TOKEN_A,
      tokenB: "bad",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^ValidationError:.*tokenB/);
  });

  it("returns ValidationError when tokenA == tokenB", async () => {
    const result = await getTokenPriceHandler({
      tokenA: TOKEN_A,
      tokenB: TOKEN_A,
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^ValidationError:.*different/);
  });

  it("returns ValidationError for invalid fee tier", async () => {
    const result = await getTokenPriceHandler({
      tokenA: TOKEN_A,
      tokenB: TOKEN_B,
      fee: 999,
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^ValidationError:.*fee tier/);
  });

  it("returns NetworkError on RPC failure", async () => {
    mockGetPool.mockRejectedValue(
      Object.assign(new Error("network timeout"), { code: "NETWORK_ERROR" })
    );

    const result = await getTokenPriceHandler({
      tokenA: TOKEN_A,
      tokenB: TOKEN_B,
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^NetworkError:/);
  });
});
