import { multicallReadHandler } from "../src/tools/multicallRead";

const mockAggregate3 = { staticCall: jest.fn() };
const mockGetBlockNumber = jest.fn();

jest.mock("ethers", () => ({
  Contract: jest.fn().mockImplementation(() => ({
    aggregate3: mockAggregate3,
    getBlockNumber: mockGetBlockNumber,
  })),
  JsonRpcProvider: jest.fn().mockImplementation(() => ({})),
  isAddress: jest
    .fn()
    .mockImplementation(
      (addr: string) => addr.startsWith("0x") && addr.length === 42
    ),
}));

const TARGET = "0x" + "aa".repeat(20);

describe("multicallReadHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAggregate3.staticCall.mockResolvedValue([
      { success: true, returnData: "0x0001" },
    ]);
    mockGetBlockNumber.mockResolvedValue(BigInt(12345));
  });

  it("returns results for valid calls", async () => {
    const result = await multicallReadHandler({
      calls: [{ target: TARGET, callData: "0xabcdef" }],
    });

    expect(result.success).toBe(true);
    expect(result.data?.results).toHaveLength(1);
    expect(result.data?.results[0].success).toBe(true);
    expect(result.data?.blockNumber).toBe(12345);
  });

  it("returns ValidationError for empty calls", async () => {
    const result = await multicallReadHandler({ calls: [] });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^ValidationError:.*empty/);
  });

  it("returns ValidationError for invalid target", async () => {
    const result = await multicallReadHandler({
      calls: [{ target: "bad", callData: "0xab" }],
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^ValidationError:.*target/);
  });

  it("returns ValidationError for invalid callData", async () => {
    const result = await multicallReadHandler({
      calls: [{ target: TARGET, callData: "not-hex" }],
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^ValidationError:.*callData/);
  });

  it("returns NetworkError on RPC failure", async () => {
    mockAggregate3.staticCall.mockRejectedValue(
      Object.assign(new Error("timeout"), { code: "NETWORK_ERROR" })
    );
    const result = await multicallReadHandler({
      calls: [{ target: TARGET, callData: "0xab" }],
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^NetworkError/);
  });
});
