import { approveTokenHandler } from "../src/tools/approveToken";

const mockApprove = jest.fn();
const mockDecimals = jest.fn();

jest.mock("ethers", () => ({
  Wallet: jest.fn().mockImplementation((key: string) => {
    if (key === "0xinvalid") {
      throw Object.assign(new Error("invalid private key"), {
        code: "INVALID_ARGUMENT",
      });
    }
    return { address: "0xOwnerAddress" };
  }),
  Contract: jest.fn().mockImplementation(() => ({
    approve: mockApprove,
    decimals: mockDecimals,
  })),
  JsonRpcProvider: jest.fn().mockImplementation(() => ({})),
  isAddress: jest.fn().mockImplementation(
    (addr: string) => addr.startsWith("0x") && addr.length === 42
  ),
  parseUnits: jest.fn().mockImplementation(
    (value: string, decimals: number) => BigInt(Math.floor(Number(value) * 10 ** decimals))
  ),
  MaxUint256: BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"),
}));

describe("approveTokenHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDecimals.mockResolvedValue(BigInt(18));
    mockApprove.mockResolvedValue({ hash: "0xApproveHash" });
  });

  it("approves spender with specific amount", async () => {
    const result = await approveTokenHandler({
      privateKey: "0x" + "ab".repeat(32),
      tokenAddress: "0x" + "cc".repeat(20),
      spender: "0x" + "dd".repeat(20),
      amount: "1000",
    });

    expect(result.success).toBe(true);
    expect(result.data?.txHash).toBe("0xApproveHash");
    expect(result.data?.owner).toBe("0xOwnerAddress");
    expect(result.data?.spender).toBe("0x" + "dd".repeat(20));
    expect(result.data?.amount).toBe("1000");
  });

  it("approves unlimited (max uint256) when amount is 'unlimited'", async () => {
    const { MaxUint256 } = require("ethers");
    const result = await approveTokenHandler({
      privateKey: "0x" + "ab".repeat(32),
      tokenAddress: "0x" + "cc".repeat(20),
      spender: "0x" + "dd".repeat(20),
      amount: "unlimited",
    });

    expect(result.success).toBe(true);
    expect(mockApprove).toHaveBeenCalledWith("0x" + "dd".repeat(20), MaxUint256);
    expect(result.data?.amount).toBe("unlimited");
  });

  it("returns ValidationError for invalid spender address", async () => {
    const result = await approveTokenHandler({
      privateKey: "0x" + "ab".repeat(32),
      tokenAddress: "0x" + "cc".repeat(20),
      spender: "bad-address",
      amount: "1000",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^ValidationError:/);
  });

  it("returns ValidationError for invalid token address", async () => {
    const result = await approveTokenHandler({
      privateKey: "0x" + "ab".repeat(32),
      tokenAddress: "bad-token",
      spender: "0x" + "dd".repeat(20),
      amount: "1000",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^ValidationError:/);
  });

  it("returns InvalidKeyError for bad private key", async () => {
    const result = await approveTokenHandler({
      privateKey: "0xinvalid",
      tokenAddress: "0x" + "cc".repeat(20),
      spender: "0x" + "dd".repeat(20),
      amount: "1000",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^InvalidKeyError:/);
  });

  it("returns TransactionError when approve call fails", async () => {
    mockApprove.mockRejectedValue(new Error("execution reverted"));

    const result = await approveTokenHandler({
      privateKey: "0x" + "ab".repeat(32),
      tokenAddress: "0x" + "cc".repeat(20),
      spender: "0x" + "dd".repeat(20),
      amount: "1000",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^TransactionError:/);
  });
});
