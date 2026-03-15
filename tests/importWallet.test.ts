import { importWalletHandler } from "../src/tools/importWallet";

jest.mock("ethers", () => ({
  Wallet: jest.fn().mockImplementation((key: string) => {
    if (key === "0xinvalid") {
      throw Object.assign(new Error("invalid private key"), {
        code: "INVALID_ARGUMENT",
      });
    }
    return {
      address: "0xFromPrivateKey",
      privateKey: key,
    };
  }),
  HDNodeWallet: {
    fromPhrase: jest.fn().mockImplementation((phrase: string) => {
      if (phrase === "bad mnemonic") {
        throw new Error("invalid mnemonic");
      }
      return {
        address: "0xFromMnemonic",
        privateKey: "0x" + "ab".repeat(32),
      };
    }),
  },
}));

describe("importWalletHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("imports wallet from privateKey", async () => {
    const result = await importWalletHandler({
      privateKey: "0x" + "ab".repeat(32),
    });

    expect(result.success).toBe(true);
    expect(result.data?.address).toBe("0xFromPrivateKey");
    expect(result.data?.privateKey).toBe("0x" + "ab".repeat(32));
  });

  it("imports wallet from mnemonic", async () => {
    const result = await importWalletHandler({
      mnemonic: "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
    });

    expect(result.success).toBe(true);
    expect(result.data?.address).toBe("0xFromMnemonic");
    expect(result.data?.privateKey).toBe("0x" + "ab".repeat(32));
  });

  it("returns ValidationError when both privateKey and mnemonic provided", async () => {
    const result = await importWalletHandler({
      privateKey: "0x" + "ab".repeat(32),
      mnemonic: "some mnemonic phrase",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^ValidationError:/);
  });

  it("returns ValidationError when neither privateKey nor mnemonic provided", async () => {
    const result = await importWalletHandler({});

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^ValidationError:/);
  });

  it("returns InvalidKeyError for invalid privateKey", async () => {
    const result = await importWalletHandler({
      privateKey: "0xinvalid",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^InvalidKeyError:/);
  });

  it("returns InvalidKeyError for invalid mnemonic", async () => {
    const result = await importWalletHandler({
      mnemonic: "bad mnemonic",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^InvalidKeyError:/);
  });
});
