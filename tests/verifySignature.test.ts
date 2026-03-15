import { verifySignatureHandler } from "../src/tools/verifySignature";

jest.mock("ethers", () => ({
  verifyMessage: jest.fn().mockImplementation((message: string, signature: string) => {
    if (signature === "0xbadsig") {
      throw new Error("invalid signature length");
    }
    return "0xRecoveredAddress";
  }),
}));

describe("verifySignatureHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("recovers signer address from valid signature", async () => {
    const result = await verifySignatureHandler({
      message: "Hello World",
      signature: "0x" + "ab".repeat(65),
    });

    expect(result.success).toBe(true);
    expect(result.data?.signerAddress).toBe("0xRecoveredAddress");
    expect(result.data?.isValid).toBe(true);
  });

  it("returns error for invalid signature", async () => {
    const result = await verifySignatureHandler({
      message: "Hello World",
      signature: "0xbadsig",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^ValidationError:/);
  });

  it("handles empty message", async () => {
    const result = await verifySignatureHandler({
      message: "",
      signature: "0x" + "ab".repeat(65),
    });

    expect(result.success).toBe(true);
    expect(result.data?.signerAddress).toBe("0xRecoveredAddress");
  });
});
