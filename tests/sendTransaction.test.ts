import { sendTransactionHandler } from "../src/tools/sendTransaction";

const mockSendTransaction = jest.fn();
// CR-006: Use a valid checksummed Ethereum address (Hardhat account #0)
const mockAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

jest.mock("ethers", () => {
  const actual = jest.requireActual("ethers");
  return {
    ...actual,
    JsonRpcProvider: jest.fn(() => ({})),
    Wallet: jest.fn(() => ({
      address: mockAddress,
      sendTransaction: mockSendTransaction,
    })),
    parseEther: actual.parseEther,
    isAddress: actual.isAddress,
  };
});

const VALID_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const VALID_TO = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

describe("sendTransactionHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendTransaction.mockResolvedValue({ hash: "0xTxHash123" });
  });

  it("returns txHash on successful transaction", async () => {
    const result = await sendTransactionHandler({
      privateKey: VALID_PRIVATE_KEY,
      to: VALID_TO,
      amount: "0.1",
    });
    expect(result.success).toBe(true);
    expect(result.data?.txHash).toBe("0xTxHash123");
    expect(result.data?.from).toBe(mockAddress);
    expect(result.data?.to).toBe(VALID_TO);
    expect(result.data?.amount).toBe("0.1");
  });

  it("returns ValidationError when amount is 0", async () => {
    const result = await sendTransactionHandler({
      privateKey: VALID_PRIVATE_KEY,
      to: VALID_TO,
      amount: "0",
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/ValidationError/);
  });

  it("returns ValidationError when amount is negative", async () => {
    const result = await sendTransactionHandler({
      privateKey: VALID_PRIVATE_KEY,
      to: VALID_TO,
      amount: "-1",
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/ValidationError/);
  });

  it("returns ValidationError for invalid to address", async () => {
    const result = await sendTransactionHandler({
      privateKey: VALID_PRIVATE_KEY,
      to: "not-an-address",
      amount: "0.1",
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/ValidationError/);
  });

  it("returns InvalidKeyError when private key is invalid (INVALID_ARGUMENT)", async () => {
    const { Wallet } = require("ethers");
    (Wallet as jest.Mock).mockImplementationOnce(() => {
      throw Object.assign(new Error("invalid private key"), {
        code: "INVALID_ARGUMENT",
      });
    });
    const result = await sendTransactionHandler({
      privateKey: "not-a-valid-key",
      to: VALID_TO,
      amount: "0.1",
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/InvalidKeyError/);
  });

  it("returns InvalidKeyError when private key is zero (ethers v6 curve.n error)", async () => {
    const { Wallet } = require("ethers");
    (Wallet as jest.Mock).mockImplementationOnce(() => {
      throw new Error("Expected valid bigint: 0 < bigint < curve.n");
    });
    const result = await sendTransactionHandler({
      privateKey:
        "0x0000000000000000000000000000000000000000000000000000000000000000",
      to: VALID_TO,
      amount: "0.1",
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/InvalidKeyError/);
  });

  it("returns InsufficientFundsError when balance is insufficient", async () => {
    mockSendTransaction.mockRejectedValue(
      Object.assign(new Error("insufficient funds"), {
        code: "INSUFFICIENT_FUNDS",
      })
    );
    const result = await sendTransactionHandler({
      privateKey: VALID_PRIVATE_KEY,
      to: VALID_TO,
      amount: "9999",
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/InsufficientFundsError/);
  });

  it("returns NetworkError on RPC failure", async () => {
    mockSendTransaction.mockRejectedValue(
      Object.assign(new Error("network timeout"), { code: "NETWORK_ERROR" })
    );
    const result = await sendTransactionHandler({
      privateKey: VALID_PRIVATE_KEY,
      to: VALID_TO,
      amount: "0.01",
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/NetworkError/);
  });
});
