import { transferTokenHandler } from "../src/tools/transferToken";

// Mock ethers before any imports that use it
const mockTransfer = jest.fn();
const mockDecimals = jest.fn();
const mockWait = jest.fn();

jest.mock("ethers", () => ({
  Wallet: jest.fn().mockImplementation((key: string) => {
    // Simulate invalid key detection
    if (key === "0xinvalid") {
      throw Object.assign(new Error("invalid private key"), {
        code: "INVALID_ARGUMENT",
      });
    }
    return { address: "0xSenderAddress" };
  }),
  Contract: jest.fn().mockImplementation(() => ({
    transfer: mockTransfer,
    decimals: mockDecimals,
  })),
  JsonRpcProvider: jest.fn().mockImplementation(() => ({})),
  isAddress: jest.fn().mockImplementation((addr: string) => addr.startsWith("0x") && addr.length === 42),
  parseUnits: jest.fn().mockImplementation((value: string, decimals: number) => {
    if (isNaN(Number(value))) throw new Error(`invalid decimal value: ${value}`);
    return BigInt(Math.floor(Number(value) * 10 ** decimals));
  }),
}));

describe("transferTokenHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDecimals.mockResolvedValue(BigInt(18));
    mockTransfer.mockResolvedValue({ hash: "0xTxHash123" });
  });

  it("transfers ERC20 token successfully", async () => {
    const result = await transferTokenHandler({
      privateKey: "0x" + "ab".repeat(32),
      tokenAddress: "0x" + "cc".repeat(20),
      to: "0x" + "dd".repeat(20),
      amount: "100",
    });

    expect(result.success).toBe(true);
    expect(result.data?.txHash).toBe("0xTxHash123");
    expect(result.data?.from).toBe("0xSenderAddress");
    expect(result.data?.tokenAddress).toBe("0x" + "cc".repeat(20));
    expect(result.data?.amount).toBe("100");
  });

  it("returns ValidationError for invalid recipient address", async () => {
    const result = await transferTokenHandler({
      privateKey: "0x" + "ab".repeat(32),
      tokenAddress: "0x" + "cc".repeat(20),
      to: "not-an-address",
      amount: "100",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^ValidationError:/);
  });

  it("returns ValidationError for invalid token address", async () => {
    const result = await transferTokenHandler({
      privateKey: "0x" + "ab".repeat(32),
      tokenAddress: "bad-token",
      to: "0x" + "dd".repeat(20),
      amount: "100",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^ValidationError:/);
  });

  it("returns ValidationError for invalid amount", async () => {
    const ethers = require("ethers");
    const originalParseUnits = ethers.parseUnits;
    ethers.parseUnits = jest.fn().mockImplementation(() => {
      throw new Error("invalid decimal value");
    });

    const result = await transferTokenHandler({
      privateKey: "0x" + "ab".repeat(32),
      tokenAddress: "0x" + "cc".repeat(20),
      to: "0x" + "dd".repeat(20),
      amount: "not-a-number",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^ValidationError:/);

    // Restore original mock
    ethers.parseUnits = originalParseUnits;
  });

  it("returns InvalidKeyError for bad private key", async () => {
    const result = await transferTokenHandler({
      privateKey: "0xinvalid",
      tokenAddress: "0x" + "cc".repeat(20),
      to: "0x" + "dd".repeat(20),
      amount: "100",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^InvalidKeyError:/);
  });

  it("returns TransactionError when transfer call fails", async () => {
    mockTransfer.mockRejectedValue(new Error("execution reverted"));

    const result = await transferTokenHandler({
      privateKey: "0x" + "ab".repeat(32),
      tokenAddress: "0x" + "cc".repeat(20),
      to: "0x" + "dd".repeat(20),
      amount: "100",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^TransactionError:/);
  });

  it("returns NetworkError for network failures", async () => {
    mockDecimals.mockRejectedValue(
      Object.assign(new Error("network timeout"), { code: "NETWORK_ERROR" })
    );

    const result = await transferTokenHandler({
      privateKey: "0x" + "ab".repeat(32),
      tokenAddress: "0x" + "cc".repeat(20),
      to: "0x" + "dd".repeat(20),
      amount: "100",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^NetworkError:/);
  });

  it("fire-and-forget: returns txHash without waiting for receipt", async () => {
    mockTransfer.mockResolvedValue({ hash: "0xFireAndForget" });

    const result = await transferTokenHandler({
      privateKey: "0x" + "ab".repeat(32),
      tokenAddress: "0x" + "cc".repeat(20),
      to: "0x" + "dd".repeat(20),
      amount: "50",
    });

    expect(result.success).toBe(true);
    expect(result.data?.txHash).toBe("0xFireAndForget");
    expect(mockWait).not.toHaveBeenCalled();
  });
});
