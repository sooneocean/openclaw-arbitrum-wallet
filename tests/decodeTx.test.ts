import { decodeTxHandler } from "../src/tools/decodeTx";

// Use real ethers Interface for decode tests — no mock needed
// jest will use the real ethers since decodeTx doesn't need provider/wallet

describe("decodeTxHandler", () => {
  it("decodes a transfer function call", async () => {
    const { Interface } = require("ethers");
    const iface = new Interface(["function transfer(address to, uint256 amount)"]);
    const data = iface.encodeFunctionData("transfer", [
      "0x" + "dd".repeat(20),
      1000n,
    ]);

    const result = await decodeTxHandler({
      data,
      abi: ["function transfer(address to, uint256 amount)"],
    });

    expect(result.success).toBe(true);
    expect(result.data?.functionName).toBe("transfer");
    expect(result.data?.args.to.toLowerCase()).toBe("0x" + "dd".repeat(20));
  });

  it("returns DecodeError for unmatched selector", async () => {
    const result = await decodeTxHandler({
      data: "0xdeadbeef",
      abi: ["function transfer(address to, uint256 amount)"],
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/DecodeError/);
  });

  it("returns ValidationError for invalid hex data", async () => {
    const result = await decodeTxHandler({
      data: "not-hex",
      abi: ["function transfer(address to, uint256 amount)"],
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^ValidationError/);
  });

  it("returns ValidationError for too-short data", async () => {
    const result = await decodeTxHandler({
      data: "0xab",
      abi: ["function transfer(address to, uint256 amount)"],
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^ValidationError:.*short/);
  });

  it("returns ValidationError for empty abi", async () => {
    const result = await decodeTxHandler({
      data: "0xdeadbeef",
      abi: [],
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^ValidationError:.*abi/);
  });
});
