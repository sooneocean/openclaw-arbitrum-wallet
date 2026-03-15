import { watchTransactionHandler } from "../src/tools/watchTransaction";

const mockWaitForTransaction = jest.fn();

const VALID_TX_HASH =
  "0x" + "ab".repeat(32);

jest.mock("ethers", () => ({
  JsonRpcProvider: jest.fn().mockImplementation(() => ({
    waitForTransaction: mockWaitForTransaction,
  })),
  formatUnits: jest.fn().mockImplementation((val: bigint, unit: string) => {
    if (unit === "gwei") return (Number(val) / 1e9).toString();
    return val.toString();
  }),
}));

describe("watchTransactionHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWaitForTransaction.mockResolvedValue({
      hash: VALID_TX_HASH,
      status: 1,
      blockNumber: 12345,
      gasUsed: 21000n,
      gasPrice: 100000000n, // 0.1 gwei
      from: "0xSender",
      to: "0xRecipient",
    });
  });

  it("returns receipt for confirmed transaction", async () => {
    const result = await watchTransactionHandler({
      txHash: VALID_TX_HASH,
    });

    expect(result.success).toBe(true);
    expect(result.data?.txHash).toBe(VALID_TX_HASH);
    expect(result.data?.status).toBe("success");
    expect(result.data?.blockNumber).toBe(12345);
    expect(result.data?.gasUsed).toBe("21000");
    expect(result.data?.from).toBe("0xSender");
    expect(result.data?.to).toBe("0xRecipient");
    expect(result.data?.confirmations).toBe(1);
  });

  it("returns reverted status for failed transaction", async () => {
    mockWaitForTransaction.mockResolvedValue({
      hash: VALID_TX_HASH,
      status: 0,
      blockNumber: 12345,
      gasUsed: 50000n,
      gasPrice: 100000000n,
      from: "0xSender",
      to: "0xContract",
    });

    const result = await watchTransactionHandler({
      txHash: VALID_TX_HASH,
    });

    expect(result.success).toBe(true);
    expect(result.data?.status).toBe("reverted");
  });

  it("uses custom confirmations", async () => {
    const result = await watchTransactionHandler({
      txHash: VALID_TX_HASH,
      confirmations: 5,
    });

    expect(result.success).toBe(true);
    expect(result.data?.confirmations).toBe(5);
    expect(mockWaitForTransaction).toHaveBeenCalledWith(
      VALID_TX_HASH,
      5,
      120000
    );
  });

  it("uses custom timeout", async () => {
    await watchTransactionHandler({
      txHash: VALID_TX_HASH,
      timeoutMs: 60000,
    });

    expect(mockWaitForTransaction).toHaveBeenCalledWith(
      VALID_TX_HASH,
      1,
      60000
    );
  });

  it("returns WatchError on timeout", async () => {
    mockWaitForTransaction.mockRejectedValue(new Error("timeout exceeded"));

    const result = await watchTransactionHandler({
      txHash: VALID_TX_HASH,
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^WatchError:.*timeout/i);
  });

  it("returns WatchError when receipt is null", async () => {
    mockWaitForTransaction.mockResolvedValue(null);

    const result = await watchTransactionHandler({
      txHash: VALID_TX_HASH,
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^WatchError:.*not confirmed/i);
  });

  it("returns NetworkError on RPC failure", async () => {
    mockWaitForTransaction.mockRejectedValue(
      Object.assign(new Error("connection refused"), {
        code: "NETWORK_ERROR",
      })
    );

    const result = await watchTransactionHandler({
      txHash: VALID_TX_HASH,
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^NetworkError:/);
  });

  it("returns ValidationError for invalid txHash", async () => {
    const result = await watchTransactionHandler({
      txHash: "bad-hash",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^ValidationError:.*hash/i);
  });

  it("returns ValidationError for confirmations < 1", async () => {
    const result = await watchTransactionHandler({
      txHash: VALID_TX_HASH,
      confirmations: 0,
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^ValidationError:.*confirmations/);
  });

  it("returns ValidationError for timeoutMs < 1000", async () => {
    const result = await watchTransactionHandler({
      txHash: VALID_TX_HASH,
      timeoutMs: 500,
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^ValidationError:.*timeoutMs/);
  });
});
