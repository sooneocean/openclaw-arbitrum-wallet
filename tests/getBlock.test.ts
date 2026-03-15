import { getBlockHandler } from "../src/tools/getBlock";

const mockGetBlock = jest.fn();

jest.mock("ethers", () => ({
  JsonRpcProvider: jest.fn().mockImplementation(() => ({
    getBlock: mockGetBlock,
  })),
  formatUnits: jest.fn().mockImplementation((val: bigint) =>
    (Number(val) / 1e9).toString()
  ),
}));

describe("getBlockHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetBlock.mockResolvedValue({
      number: 12345,
      hash: "0xBlockHash",
      timestamp: 1700000000,
      gasUsed: 1000000n,
      gasLimit: 30000000n,
      baseFeePerGas: 100000000n,
      transactions: ["0xtx1", "0xtx2"],
      miner: "0xMiner",
    });
  });

  it("returns block info for latest", async () => {
    const result = await getBlockHandler({});
    expect(result.success).toBe(true);
    expect(result.data?.number).toBe(12345);
    expect(result.data?.transactionCount).toBe(2);
    expect(result.data?.miner).toBe("0xMiner");
  });

  it("returns BlockError when block not found", async () => {
    mockGetBlock.mockResolvedValue(null);
    const result = await getBlockHandler({ block: "99999999" });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^BlockError/);
  });

  it("returns NetworkError on RPC failure", async () => {
    mockGetBlock.mockRejectedValue(
      Object.assign(new Error("timeout"), { code: "NETWORK_ERROR" })
    );
    const result = await getBlockHandler({});
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^NetworkError/);
  });
});
