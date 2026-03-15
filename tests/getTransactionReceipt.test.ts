import { getTransactionReceiptHandler } from "../src/tools/getTransactionReceipt";

const mockGetTransactionReceipt = jest.fn();

jest.mock("ethers", () => ({
  JsonRpcProvider: jest.fn().mockImplementation(() => ({
    getTransactionReceipt: mockGetTransactionReceipt,
  })),
}));

describe("getTransactionReceiptHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns success for confirmed transaction (status 1)", async () => {
    mockGetTransactionReceipt.mockResolvedValue({
      status: 1,
      blockNumber: 12345,
      gasUsed: BigInt(21000),
      from: "0xSender",
      to: "0xRecipient",
    });

    const result = await getTransactionReceiptHandler({
      txHash: "0x" + "ab".repeat(32),
    });

    expect(result.success).toBe(true);
    expect(result.data?.status).toBe("success");
    expect(result.data?.blockNumber).toBe(12345);
    expect(result.data?.gasUsed).toBe("21000");
    expect(result.data?.from).toBe("0xSender");
    expect(result.data?.to).toBe("0xRecipient");
  });

  it("returns reverted for failed transaction (status 0)", async () => {
    mockGetTransactionReceipt.mockResolvedValue({
      status: 0,
      blockNumber: 12346,
      gasUsed: BigInt(50000),
      from: "0xSender",
      to: "0xContract",
    });

    const result = await getTransactionReceiptHandler({
      txHash: "0x" + "ab".repeat(32),
    });

    expect(result.success).toBe(true);
    expect(result.data?.status).toBe("reverted");
  });

  it("returns pending when receipt is null", async () => {
    mockGetTransactionReceipt.mockResolvedValue(null);

    const result = await getTransactionReceiptHandler({
      txHash: "0x" + "ab".repeat(32),
    });

    expect(result.success).toBe(true);
    expect(result.data?.status).toBe("pending");
    expect(result.data?.blockNumber).toBeNull();
    expect(result.data?.gasUsed).toBeNull();
    expect(result.data?.from).toBeNull();
    expect(result.data?.to).toBeNull();
  });

  it("returns ValidationError for invalid txHash format", async () => {
    const result = await getTransactionReceiptHandler({
      txHash: "not-a-hash",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^ValidationError:/);
  });

  it("returns NetworkError on RPC failure", async () => {
    mockGetTransactionReceipt.mockRejectedValue(
      Object.assign(new Error("connection timeout"), { code: "NETWORK_ERROR" })
    );

    const result = await getTransactionReceiptHandler({
      txHash: "0x" + "ab".repeat(32),
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^NetworkError:/);
  });
});
