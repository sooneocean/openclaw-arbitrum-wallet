import { getNftMetadataHandler } from "../src/tools/getNftMetadata";

const mockOwnerOf = jest.fn();
const mockTokenURI = jest.fn();
const mockName = jest.fn();
const mockSymbol = jest.fn();

jest.mock("ethers", () => ({
  Contract: jest.fn().mockImplementation(() => ({
    ownerOf: mockOwnerOf,
    tokenURI: mockTokenURI,
    name: mockName,
    symbol: mockSymbol,
  })),
  JsonRpcProvider: jest.fn().mockImplementation(() => ({})),
  isAddress: jest.fn().mockImplementation(
    (addr: string) => addr.startsWith("0x") && addr.length === 42
  ),
}));

const NFT_ADDR = "0x" + "cc".repeat(20);

describe("getNftMetadataHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOwnerOf.mockResolvedValue("0xOwner");
    mockTokenURI.mockResolvedValue("https://example.com/1.json");
    mockName.mockResolvedValue("TestNFT");
    mockSymbol.mockResolvedValue("TNFT");
  });

  it("returns metadata for valid NFT", async () => {
    const result = await getNftMetadataHandler({
      contractAddress: NFT_ADDR,
      tokenId: "42",
    });
    expect(result.success).toBe(true);
    expect(result.data?.owner).toBe("0xOwner");
    expect(result.data?.tokenURI).toBe("https://example.com/1.json");
    expect(result.data?.name).toBe("TestNFT");
    expect(result.data?.tokenId).toBe("42");
  });

  it("returns ValidationError for invalid contract address", async () => {
    const result = await getNftMetadataHandler({
      contractAddress: "bad",
      tokenId: "1",
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^ValidationError/);
  });

  it("returns ValidationError for invalid tokenId", async () => {
    const result = await getNftMetadataHandler({
      contractAddress: NFT_ADDR,
      tokenId: "abc",
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^ValidationError.*tokenId/);
  });

  it("returns NftError when ownerOf fails", async () => {
    mockOwnerOf.mockRejectedValue(new Error("token does not exist"));
    const result = await getNftMetadataHandler({
      contractAddress: NFT_ADDR,
      tokenId: "999",
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^NftError/);
  });
});
