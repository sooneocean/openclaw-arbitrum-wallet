import { removeLiquidityHandler } from "../src/tools/removeLiquidity";

const mockPositions = jest.fn();
const mockDecreaseLiquidity = jest.fn();
const mockCollect = jest.fn();

const VALID_KEY = "0x" + "ab".repeat(32);

jest.mock("ethers", () => ({
  Wallet: jest.fn().mockImplementation((key: string) => {
    if (key === "0xinvalid") throw Object.assign(new Error("invalid private key"), { code: "INVALID_ARGUMENT" });
    return { address: "0xSender" };
  }),
  Contract: jest.fn().mockImplementation(() => ({
    positions: mockPositions,
    decreaseLiquidity: mockDecreaseLiquidity,
    collect: mockCollect,
  })),
  JsonRpcProvider: jest.fn().mockImplementation(() => ({})),
}));

describe("removeLiquidityHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // positions returns tuple with liquidity at index 7
    mockPositions.mockResolvedValue([0, "0x", "0xA", "0xB", 3000, -100, 100, 1000000n, 0, 0, 0, 0]);
    mockDecreaseLiquidity.mockResolvedValue({ hash: "0xDecHash" });
    mockCollect.mockResolvedValue({ hash: "0xCollectHash" });
  });

  it("removes liquidity and collects", async () => {
    const result = await removeLiquidityHandler({
      privateKey: VALID_KEY,
      tokenId: "12345",
    });
    expect(result.success).toBe(true);
    expect(result.data?.txHash).toBe("0xCollectHash");
    expect(result.data?.tokenId).toBe("12345");
  });

  it("returns error for zero liquidity position", async () => {
    mockPositions.mockResolvedValue([0, "0x", "0xA", "0xB", 3000, -100, 100, 0n, 0, 0, 0, 0]);
    const result = await removeLiquidityHandler({
      privateKey: VALID_KEY,
      tokenId: "12345",
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/zero liquidity/);
  });

  it("returns ValidationError for invalid tokenId", async () => {
    const result = await removeLiquidityHandler({
      privateKey: VALID_KEY,
      tokenId: "abc",
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^ValidationError/);
  });

  it("returns InvalidKeyError for bad key", async () => {
    const result = await removeLiquidityHandler({
      privateKey: "0xinvalid",
      tokenId: "1",
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^InvalidKeyError/);
  });
});
