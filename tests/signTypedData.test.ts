import { signTypedDataHandler } from "../src/tools/signTypedData";

const mockSignTypedData = jest.fn();

jest.mock("ethers", () => ({
  Wallet: jest.fn().mockImplementation((key: string) => {
    if (key === "0xinvalid") {
      throw Object.assign(new Error("invalid private key"), {
        code: "INVALID_ARGUMENT",
      });
    }
    return {
      address: "0xSignerAddress",
      signTypedData: mockSignTypedData,
    };
  }),
}));

const VALID_KEY = "0x" + "ab".repeat(32);
const DOMAIN = { name: "Test", version: "1", chainId: 42161 };
const TYPES = { Message: [{ name: "content", type: "string" }] };
const VALUE = { content: "hello" };

describe("signTypedDataHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignTypedData.mockResolvedValue("0xSignature");
  });

  it("signs typed data successfully", async () => {
    const result = await signTypedDataHandler({
      privateKey: VALID_KEY,
      domain: DOMAIN,
      types: TYPES,
      value: VALUE,
    });

    expect(result.success).toBe(true);
    expect(result.data?.signature).toBe("0xSignature");
    expect(result.data?.address).toBe("0xSignerAddress");
  });

  it("returns InvalidKeyError for bad key", async () => {
    const result = await signTypedDataHandler({
      privateKey: "0xinvalid",
      domain: DOMAIN,
      types: TYPES,
      value: VALUE,
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^InvalidKeyError/);
  });

  it("returns ValidationError for empty domain", async () => {
    const result = await signTypedDataHandler({
      privateKey: VALID_KEY,
      domain: {},
      types: TYPES,
      value: VALUE,
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^ValidationError:.*domain/);
  });

  it("returns ValidationError for empty types", async () => {
    const result = await signTypedDataHandler({
      privateKey: VALID_KEY,
      domain: DOMAIN,
      types: {},
      value: VALUE,
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^ValidationError:.*types/);
  });

  it("returns ValidationError for empty value", async () => {
    const result = await signTypedDataHandler({
      privateKey: VALID_KEY,
      domain: DOMAIN,
      types: TYPES,
      value: {},
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^ValidationError:.*value/);
  });

  it("returns SignError when signing fails", async () => {
    mockSignTypedData.mockRejectedValue(new Error("encoding error"));

    const result = await signTypedDataHandler({
      privateKey: VALID_KEY,
      domain: DOMAIN,
      types: TYPES,
      value: VALUE,
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^SignError/);
  });
});
