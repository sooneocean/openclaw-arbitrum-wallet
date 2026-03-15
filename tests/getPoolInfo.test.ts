import { getPoolInfoHandler } from "../src/tools/getPoolInfo";

const mockGetPool = jest.fn();
const mockSlot0 = jest.fn();
const mockToken0 = jest.fn();
const mockToken1 = jest.fn();
const mockLiquidity = jest.fn();

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
    return {
      slot0: mockSlot0,
      token0: mockToken0,
      token1: mockToken1,
      liquidity: mockLiquidity,
    };
  }),
  JsonRpcProvider: jest.fn().mockImplementation(() => ({})),
  isAddress: jest
    .fn()
    .mockImplementation(
      (addr: string) => addr.startsWith("0x") && addr.length === 42
    ),
}));

describe("getPoolInfoHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPool.mockResolvedValue(POOL_ADDR);
    mockSlot0.mockResolvedValue([
      2n ** 96n, // sqrtPriceX96
      0,         // tick
      0, 0, 0, 0,
      true,      // unlocked
    ]);
    mockToken0.mockResolvedValue(TOKEN_A);
    mockToken1.mockResolvedValue(TOKEN_B);
    mockLiquidity.mockResolvedValue(1000000000000000000n);
  });

  it("returns pool info for valid pair", async () => {
    const result = await getPoolInfoHandler({ tokenA: TOKEN_A, tokenB: TOKEN_B });

    expect(result.success).toBe(true);
    expect(result.data?.poolAddress).toBe(POOL_ADDR);
    expect(result.data?.token0).toBe(TOKEN_A);
    expect(result.data?.token1).toBe(TOKEN_B);
    expect(result.data?.fee).toBe(3000);
    expect(result.data?.unlocked).toBe(true);
  });

  it("returns PoolError when pool not found", async () => {
    mockGetPool.mockResolvedValue(ZERO_ADDR);
    const result = await getPoolInfoHandler({ tokenA: TOKEN_A, tokenB: TOKEN_B });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^PoolError/);
  });

  it("returns ValidationError for same tokens", async () => {
    const result = await getPoolInfoHandler({ tokenA: TOKEN_A, tokenB: TOKEN_A });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^ValidationError/);
  });

  it("returns ValidationError for invalid fee", async () => {
    const result = await getPoolInfoHandler({
      tokenA: TOKEN_A, tokenB: TOKEN_B, fee: 999,
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^ValidationError:.*fee/);
  });
});
