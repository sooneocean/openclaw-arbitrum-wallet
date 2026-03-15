import { estimateGasHandler } from "../src/tools/estimateGas";

const mockEstimateGas = jest.fn();
const mockGetFeeData = jest.fn();

jest.mock("ethers", () => ({
  JsonRpcProvider: jest.fn().mockImplementation(() => ({
    estimateGas: mockEstimateGas,
    getFeeData: mockGetFeeData,
  })),
  isAddress: jest.fn().mockImplementation(
    (addr: string) => addr.startsWith("0x") && addr.length === 42
  ),
  parseEther: jest.fn().mockImplementation(
    (value: string) => BigInt(Math.floor(Number(value) * 1e18))
  ),
  formatEther: jest.fn().mockImplementation(
    (value: bigint) => (Number(value) / 1e18).toString()
  ),
  formatUnits: jest.fn().mockImplementation(
    (value: bigint, unit: string) => {
      if (unit === "gwei") return (Number(value) / 1e9).toString();
      return value.toString();
    }
  ),
}));

describe("estimateGasHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEstimateGas.mockResolvedValue(BigInt(21000));
    mockGetFeeData.mockResolvedValue({
      gasPrice: BigInt(100000000), // 0.1 Gwei
    });
  });

  it("estimates gas for ETH transfer", async () => {
    const result = await estimateGasHandler({
      from: "0x" + "aa".repeat(20),
      to: "0x" + "bb".repeat(20),
      value: "0.1",
    });

    expect(result.success).toBe(true);
    expect(result.data?.gasEstimate).toBe("21000");
    expect(result.data?.gasPriceGwei).toBeDefined();
    expect(result.data?.estimatedCostEth).toBeDefined();
  });

  it("estimates gas for contract call with data", async () => {
    mockEstimateGas.mockResolvedValue(BigInt(65000));

    const result = await estimateGasHandler({
      from: "0x" + "aa".repeat(20),
      to: "0x" + "cc".repeat(20),
      data: "0xa9059cbb",
    });

    expect(result.success).toBe(true);
    expect(result.data?.gasEstimate).toBe("65000");
  });

  it("returns ValidationError for invalid from address", async () => {
    const result = await estimateGasHandler({
      from: "bad",
      to: "0x" + "bb".repeat(20),
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^ValidationError:/);
  });

  it("returns ValidationError for invalid to address", async () => {
    const result = await estimateGasHandler({
      from: "0x" + "aa".repeat(20),
      to: "bad",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^ValidationError:/);
  });

  it("returns NetworkError on RPC failure", async () => {
    mockEstimateGas.mockRejectedValue(
      Object.assign(new Error("timeout"), { code: "NETWORK_ERROR" })
    );

    const result = await estimateGasHandler({
      from: "0x" + "aa".repeat(20),
      to: "0x" + "bb".repeat(20),
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^NetworkError:/);
  });
});
