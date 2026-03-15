import { transferNftHandler } from "../src/tools/transferNft";

const mockSafeTransferFrom = jest.fn();

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
    safeTransferFrom: mockSafeTransferFrom,
  })),
  JsonRpcProvider: jest.fn().mockImplementation(() => ({})),
  isAddress: jest.fn().mockImplementation(
    (addr: string) => addr.startsWith("0x") && addr.length === 42
  ),
}));

const VALID_KEY = "0x" + "ab".repeat(32);
const NFT_ADDR = "0x" + "cc".repeat(20);
const RECIPIENT = "0x" + "dd".repeat(20);

describe("transferNftHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSafeTransferFrom.mockResolvedValue({ hash: "0xNftTxHash" });
  });

  it("transfers NFT successfully", async () => {
    const result = await transferNftHandler({
      privateKey: VALID_KEY,
      contractAddress: NFT_ADDR,
      tokenId: "42",
      to: RECIPIENT,
    });
    expect(result.success).toBe(true);
    expect(result.data?.txHash).toBe("0xNftTxHash");
    expect(result.data?.tokenId).toBe("42");
  });

  it("returns InvalidKeyError for bad key", async () => {
    const result = await transferNftHandler({
      privateKey: "0xinvalid",
      contractAddress: NFT_ADDR,
      tokenId: "1",
      to: RECIPIENT,
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^InvalidKeyError/);
  });

  it("returns ValidationError for invalid contract", async () => {
    const result = await transferNftHandler({
      privateKey: VALID_KEY,
      contractAddress: "bad",
      tokenId: "1",
      to: RECIPIENT,
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^ValidationError/);
  });

  it("returns ValidationError for invalid tokenId", async () => {
    const result = await transferNftHandler({
      privateKey: VALID_KEY,
      contractAddress: NFT_ADDR,
      tokenId: "abc",
      to: RECIPIENT,
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^ValidationError.*tokenId/);
  });

  it("returns NftError when transfer fails", async () => {
    mockSafeTransferFrom.mockRejectedValue(new Error("not owner"));
    const result = await transferNftHandler({
      privateKey: VALID_KEY,
      contractAddress: NFT_ADDR,
      tokenId: "1",
      to: RECIPIENT,
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^NftError/);
  });
});
