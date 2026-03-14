import { createWalletHandler } from "../src/tools/createWallet";

jest.mock("ethers", () => {
  const actual = jest.requireActual("ethers");
  return {
    ...actual,
    Wallet: {
      createRandom: jest.fn(() => ({
        address: "0x1234567890123456789012345678901234567890",
        privateKey:
          "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        mnemonic: { phrase: "word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12" },
      })),
    },
  };
});

describe("createWalletHandler", () => {
  it("returns success with address, privateKey, and mnemonic", async () => {
    const result = await createWalletHandler({});
    expect(result.success).toBe(true);
    expect(result.data?.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(result.data?.privateKey).toMatch(/^0x[0-9a-fA-F]{64}$/);
    expect(result.data?.mnemonic).toContain("word1");
  });

  it("returns error when mnemonic is null (unexpected state)", async () => {
    const { Wallet } = require("ethers");
    (Wallet.createRandom as jest.Mock).mockReturnValueOnce({
      address: "0x1234567890123456789012345678901234567890",
      privateKey:
        "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      mnemonic: null,
    });
    const result = await createWalletHandler({});
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/UnexpectedError/);
  });

  it("returns error on unexpected failure", async () => {
    const { Wallet } = require("ethers");
    (Wallet.createRandom as jest.Mock).mockImplementationOnce(() => {
      throw new Error("something went wrong");
    });
    const result = await createWalletHandler({});
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
