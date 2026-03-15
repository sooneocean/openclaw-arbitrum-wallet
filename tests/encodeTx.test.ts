import { encodeTxHandler } from "../src/tools/encodeTx";

describe("encodeTxHandler", () => {
  it("encodes a transfer call", async () => {
    const result = await encodeTxHandler({
      abi: ["function transfer(address to, uint256 amount)"],
      functionName: "transfer",
      args: ["0x" + "dd".repeat(20), "1000"],
    });
    expect(result.success).toBe(true);
    expect(result.data?.data).toMatch(/^0x/);
    expect(result.data?.data.length).toBeGreaterThan(10);
  });

  it("returns ValidationError for empty abi", async () => {
    const result = await encodeTxHandler({
      abi: [],
      functionName: "transfer",
      args: [],
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^ValidationError/);
  });

  it("returns ValidationError for empty functionName", async () => {
    const result = await encodeTxHandler({
      abi: ["function transfer(address to, uint256 amount)"],
      functionName: "",
      args: [],
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^ValidationError/);
  });

  it("returns EncodeError for wrong args", async () => {
    const result = await encodeTxHandler({
      abi: ["function transfer(address to, uint256 amount)"],
      functionName: "transfer",
      args: ["not-enough-args"],
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/EncodeError/);
  });
});
