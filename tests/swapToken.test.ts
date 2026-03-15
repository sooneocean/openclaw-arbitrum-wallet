import { swapTokenHandler } from "../src/tools/swapToken";

const mockMulticall = jest.fn();
const mockQuoteStaticCall = jest.fn();
const mockDecimals = jest.fn();
const mockEncodeFunctionData = jest.fn();

const VALID_KEY = "0x" + "ab".repeat(32);
const TOKEN_A = "0x" + "aa".repeat(20);
const TOKEN_B = "0x" + "bb".repeat(20);

jest.mock("ethers", () => ({
  Wallet: jest.fn().mockImplementation((key: string) => {
    if (key === "0xinvalid") {
      throw Object.assign(new Error("invalid private key"), {
        code: "INVALID_ARGUMENT",
      });
    }
    return { address: "0xSenderAddress", provider: {} };
  }),
  Contract: jest.fn().mockImplementation((_addr: string, abi: unknown) => {
    const abiStr = JSON.stringify(abi);
    // QuoterV2
    if (abiStr.includes("quoteExactInputSingle")) {
      return {
        quoteExactInputSingle: { staticCall: mockQuoteStaticCall },
      };
    }
    // SwapRouter
    if (abiStr.includes("exactInputSingle")) {
      return {
        multicall: mockMulticall,
        interface: { encodeFunctionData: mockEncodeFunctionData },
      };
    }
    // ERC20
    return { decimals: mockDecimals };
  }),
  JsonRpcProvider: jest.fn().mockImplementation(() => ({})),
  isAddress: jest
    .fn()
    .mockImplementation(
      (addr: string) => addr.startsWith("0x") && addr.length === 42
    ),
  parseEther: jest
    .fn()
    .mockImplementation(
      (val: string) => BigInt(Math.floor(Number(val) * 1e18))
    ),
  parseUnits: jest
    .fn()
    .mockImplementation(
      (val: string, dec: number) =>
        BigInt(Math.floor(Number(val) * 10 ** dec))
    ),
  formatEther: jest
    .fn()
    .mockImplementation((val: bigint) => (Number(val) / 1e18).toString()),
  formatUnits: jest
    .fn()
    .mockImplementation(
      (val: bigint, dec: number) => (Number(val) / 10 ** dec).toString()
    ),
}));

describe("swapTokenHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDecimals.mockResolvedValue(BigInt(18));
    // Default quote: 1000 tokens out
    mockQuoteStaticCall.mockResolvedValue([1000000000000000000000n]);
    mockMulticall.mockResolvedValue({ hash: "0xSwapHash" });
    mockEncodeFunctionData.mockReturnValue("0xencoded");
  });

  // ========== Happy paths ==========

  it("swaps ETH→Token successfully", async () => {
    const result = await swapTokenHandler({
      privateKey: VALID_KEY,
      tokenIn: "ETH",
      tokenOut: TOKEN_A,
      amountIn: "0.1",
    });

    expect(result.success).toBe(true);
    expect(result.data?.path).toBe("ETH→TOKEN");
    expect(result.data?.txHash).toBe("0xSwapHash");
    expect(result.data?.tokenIn).toBe("ETH");
    expect(result.data?.tokenOut).toBe(TOKEN_A);
    expect(result.data?.fee).toBe(3000);
    // All paths use multicall(deadline, data)
    expect(mockMulticall).toHaveBeenCalled();
  });

  it("swaps Token→ETH successfully via multicall", async () => {
    const result = await swapTokenHandler({
      privateKey: VALID_KEY,
      tokenIn: TOKEN_A,
      tokenOut: "ETH",
      amountIn: "100",
    });

    expect(result.success).toBe(true);
    expect(result.data?.path).toBe("TOKEN→ETH");
    expect(result.data?.txHash).toBe("0xSwapHash");
    // Token→ETH: multicall with 2 encoded calls (exactInputSingle + unwrapWETH9)
    expect(mockEncodeFunctionData).toHaveBeenCalledTimes(2);
  });

  it("swaps Token→Token successfully", async () => {
    const result = await swapTokenHandler({
      privateKey: VALID_KEY,
      tokenIn: TOKEN_A,
      tokenOut: TOKEN_B,
      amountIn: "50",
    });

    expect(result.success).toBe(true);
    expect(result.data?.path).toBe("TOKEN→TOKEN");
    expect(result.data?.txHash).toBe("0xSwapHash");
    expect(mockMulticall).toHaveBeenCalled();
  });

  it("applies slippage correctly", async () => {
    // quote returns 1000e18, slippage 100bps (1%)
    const result = await swapTokenHandler({
      privateKey: VALID_KEY,
      tokenIn: "ETH",
      tokenOut: TOKEN_A,
      amountIn: "1",
      slippageBps: 100,
    });

    expect(result.success).toBe(true);
    // expectedAmountOut should be the full quote
    // amountOutMinimum should be 99% of quote
    expect(result.data?.expectedAmountOut).toBeDefined();
    expect(result.data?.amountOutMinimum).toBeDefined();
  });

  it("uses custom fee tier", async () => {
    const result = await swapTokenHandler({
      privateKey: VALID_KEY,
      tokenIn: "ETH",
      tokenOut: TOKEN_A,
      amountIn: "0.1",
      fee: 500,
    });

    expect(result.success).toBe(true);
    expect(result.data?.fee).toBe(500);
  });

  it("handles case-insensitive ETH", async () => {
    const result = await swapTokenHandler({
      privateKey: VALID_KEY,
      tokenIn: "eth",
      tokenOut: TOKEN_A,
      amountIn: "0.1",
    });

    expect(result.success).toBe(true);
    expect(result.data?.path).toBe("ETH→TOKEN");
  });

  // ========== Validation errors ==========

  it("returns ValidationError for ETH→ETH", async () => {
    const result = await swapTokenHandler({
      privateKey: VALID_KEY,
      tokenIn: "ETH",
      tokenOut: "ETH",
      amountIn: "1",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^ValidationError:.*ETH to ETH/);
  });

  it("returns ValidationError for same token swap", async () => {
    const result = await swapTokenHandler({
      privateKey: VALID_KEY,
      tokenIn: TOKEN_A,
      tokenOut: TOKEN_A,
      amountIn: "100",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^ValidationError:.*swap token to itself/);
  });

  it("returns ValidationError for invalid tokenIn address", async () => {
    const result = await swapTokenHandler({
      privateKey: VALID_KEY,
      tokenIn: "bad-address",
      tokenOut: TOKEN_B,
      amountIn: "100",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^ValidationError:.*tokenIn/);
  });

  it("returns ValidationError for invalid tokenOut address", async () => {
    const result = await swapTokenHandler({
      privateKey: VALID_KEY,
      tokenIn: TOKEN_A,
      tokenOut: "bad-address",
      amountIn: "100",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^ValidationError:.*tokenOut/);
  });

  it("returns ValidationError for invalid fee tier", async () => {
    const result = await swapTokenHandler({
      privateKey: VALID_KEY,
      tokenIn: "ETH",
      tokenOut: TOKEN_A,
      amountIn: "0.1",
      fee: 999,
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^ValidationError:.*fee tier/);
  });

  it("returns ValidationError for slippageBps > 10000", async () => {
    const result = await swapTokenHandler({
      privateKey: VALID_KEY,
      tokenIn: "ETH",
      tokenOut: TOKEN_A,
      amountIn: "0.1",
      slippageBps: 10001,
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^ValidationError:.*slippageBps/);
  });

  it("returns ValidationError for amountIn = 0", async () => {
    const result = await swapTokenHandler({
      privateKey: VALID_KEY,
      tokenIn: "ETH",
      tokenOut: TOKEN_A,
      amountIn: "0",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^ValidationError:.*amountIn/);
  });

  // ========== Error classification ==========

  it("returns InvalidKeyError for bad private key", async () => {
    const result = await swapTokenHandler({
      privateKey: "0xinvalid",
      tokenIn: "ETH",
      tokenOut: TOKEN_A,
      amountIn: "0.1",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^InvalidKeyError:/);
  });

  it("returns SwapError when quote fails", async () => {
    mockQuoteStaticCall.mockRejectedValue(new Error("execution reverted"));

    const result = await swapTokenHandler({
      privateKey: VALID_KEY,
      tokenIn: "ETH",
      tokenOut: TOKEN_A,
      amountIn: "0.1",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^SwapError:.*Quote failed/);
  });

  it("returns InsufficientFundsError when funds are low", async () => {
    mockMulticall.mockRejectedValue(
      Object.assign(new Error("insufficient funds"), {
        code: "INSUFFICIENT_FUNDS",
      })
    );

    const result = await swapTokenHandler({
      privateKey: VALID_KEY,
      tokenIn: "ETH",
      tokenOut: TOKEN_A,
      amountIn: "0.1",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^InsufficientFundsError:/);
  });

  it("returns SwapError for slippage exceeded", async () => {
    mockMulticall.mockRejectedValue(
      new Error("INSUFFICIENT_OUTPUT_AMOUNT")
    );

    const result = await swapTokenHandler({
      privateKey: VALID_KEY,
      tokenIn: "ETH",
      tokenOut: TOKEN_A,
      amountIn: "0.1",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^SwapError:.*Slippage exceeded/);
  });

  it("returns NetworkError for RPC failures", async () => {
    mockQuoteStaticCall.mockRejectedValue(
      Object.assign(new Error("network timeout"), {
        code: "NETWORK_ERROR",
      })
    );

    const result = await swapTokenHandler({
      privateKey: VALID_KEY,
      tokenIn: "ETH",
      tokenOut: TOKEN_A,
      amountIn: "0.1",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^NetworkError:/);
  });

  it("returns SwapError for generic router revert", async () => {
    mockMulticall.mockRejectedValue(
      new Error("execution reverted: some reason")
    );

    const result = await swapTokenHandler({
      privateKey: VALID_KEY,
      tokenIn: "ETH",
      tokenOut: TOKEN_A,
      amountIn: "0.1",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^SwapError:/);
  });
});
