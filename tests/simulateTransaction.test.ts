import { simulateTransactionHandler } from "../src/tools/simulateTransaction";

const mockCall = jest.fn();
const mockEstimateGas = jest.fn();

jest.mock("ethers", () => ({
  JsonRpcProvider: jest.fn().mockImplementation(() => ({
    call: mockCall,
    estimateGas: mockEstimateGas,
  })),
  isAddress: jest.fn().mockImplementation(
    (addr: string) => addr.startsWith("0x") && addr.length === 42
  ),
  parseEther: jest.fn().mockImplementation(
    (val: string) => BigInt(Math.floor(Number(val) * 1e18))
  ),
  Interface: jest.fn(),
}));

const FROM = "0x" + "aa".repeat(20);
const TO = "0x" + "bb".repeat(20);

describe("simulateTransactionHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCall.mockResolvedValue("0x0001");
    mockEstimateGas.mockResolvedValue(21000n);
  });

  it("simulates a successful transaction", async () => {
    const result = await simulateTransactionHandler({ from: FROM, to: TO });
    expect(result.success).toBe(true);
    expect(result.data?.success).toBe(true);
    expect(result.data?.returnData).toBe("0x0001");
    expect(result.data?.gasEstimate).toBe("21000");
    expect(result.data?.revertReason).toBeNull();
  });

  it("returns revert info when call fails", async () => {
    mockCall.mockRejectedValue(new Error("execution reverted"));
    const result = await simulateTransactionHandler({ from: FROM, to: TO });
    expect(result.success).toBe(true);
    expect(result.data?.success).toBe(false);
    expect(result.data?.revertReason).toContain("execution reverted");
  });

  it("returns ValidationError for invalid from", async () => {
    const result = await simulateTransactionHandler({ from: "bad", to: TO });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^ValidationError/);
  });

  it("returns ValidationError for invalid to", async () => {
    const result = await simulateTransactionHandler({ from: FROM, to: "bad" });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^ValidationError/);
  });

  it("returns NetworkError on RPC failure", async () => {
    mockCall.mockRejectedValue(
      Object.assign(new Error("timeout"), { code: "NETWORK_ERROR" })
    );
    const result = await simulateTransactionHandler({ from: FROM, to: TO });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^NetworkError/);
  });
});
