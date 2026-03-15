import { wrapEthHandler, unwrapEthHandler } from "../src/tools/wrapEth";

const mockDeposit = jest.fn();
const mockWithdraw = jest.fn();

jest.mock("ethers", () => ({
  Wallet: jest.fn().mockImplementation((key: string) => {
    if (key === "0xinvalid") {
      throw Object.assign(new Error("invalid private key"), {
        code: "INVALID_ARGUMENT",
      });
    }
    return { address: "0xSender" };
  }),
  Contract: jest.fn().mockImplementation(() => ({
    deposit: mockDeposit,
    withdraw: mockWithdraw,
  })),
  JsonRpcProvider: jest.fn().mockImplementation(() => ({})),
  parseEther: jest.fn().mockImplementation((val: string) => {
    const n = Number(val);
    if (isNaN(n)) throw new Error("invalid");
    return BigInt(Math.floor(n * 1e18));
  }),
}));

const VALID_KEY = "0x" + "ab".repeat(32);

describe("wrapEthHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDeposit.mockResolvedValue({ hash: "0xWrapHash" });
  });

  it("wraps ETH to WETH", async () => {
    const result = await wrapEthHandler({ privateKey: VALID_KEY, amount: "1.0" });
    expect(result.success).toBe(true);
    expect(result.data?.txHash).toBe("0xWrapHash");
    expect(result.data?.amount).toBe("1.0");
  });

  it("returns ValidationError for amount 0", async () => {
    const result = await wrapEthHandler({ privateKey: VALID_KEY, amount: "0" });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^ValidationError/);
  });

  it("returns InvalidKeyError for bad key", async () => {
    const result = await wrapEthHandler({ privateKey: "0xinvalid", amount: "1" });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^InvalidKeyError/);
  });
});

describe("unwrapEthHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWithdraw.mockResolvedValue({ hash: "0xUnwrapHash" });
  });

  it("unwraps WETH to ETH", async () => {
    const result = await unwrapEthHandler({ privateKey: VALID_KEY, amount: "0.5" });
    expect(result.success).toBe(true);
    expect(result.data?.txHash).toBe("0xUnwrapHash");
  });

  it("returns ValidationError for amount 0", async () => {
    const result = await unwrapEthHandler({ privateKey: VALID_KEY, amount: "0" });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^ValidationError/);
  });
});
