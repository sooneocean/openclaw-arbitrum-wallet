import { signMessageHandler } from "../src/tools/signMessage";

const mockSignMessage = jest.fn();
const mockAddress = "0xSigner0000000000000000000000000000000001";

jest.mock("ethers", () => {
  const actual = jest.requireActual("ethers");
  return {
    ...actual,
    Wallet: jest.fn(() => ({
      address: mockAddress,
      signMessage: mockSignMessage,
    })),
  };
});

const VALID_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

describe("signMessageHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignMessage.mockResolvedValue("0xSignature123abc");
  });

  it("returns signature and signer address", async () => {
    const result = await signMessageHandler({
      privateKey: VALID_PRIVATE_KEY,
      message: "hello world",
    });
    expect(result.success).toBe(true);
    expect(result.data?.signature).toBe("0xSignature123abc");
    expect(result.data?.address).toBe(mockAddress);
  });

  it("returns InvalidKeyError when Wallet construction fails", async () => {
    const { Wallet } = require("ethers");
    (Wallet as jest.Mock).mockImplementationOnce(() => {
      throw Object.assign(new Error("invalid private key"), {
        code: "INVALID_ARGUMENT",
      });
    });
    const result = await signMessageHandler({
      privateKey: "not-a-valid-key",
      message: "hello",
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/InvalidKeyError/);
  });

  it("returns error on unexpected sign failure", async () => {
    mockSignMessage.mockRejectedValue(new Error("sign failed unexpectedly"));
    const result = await signMessageHandler({
      privateKey: VALID_PRIVATE_KEY,
      message: "test",
    });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
