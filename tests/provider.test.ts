import { getProvider, resetProviderCache, withRetry } from "../src/provider";

jest.mock("ethers", () => ({
  JsonRpcProvider: jest.fn().mockImplementation((url: string) => ({
    _url: url,
  })),
}));

describe("getProvider", () => {
  beforeEach(() => {
    resetProviderCache();
    jest.clearAllMocks();
  });

  it("returns cached instance for same rpcUrl", () => {
    const a = getProvider("https://rpc1.example.com");
    const b = getProvider("https://rpc1.example.com");
    expect(a).toBe(b);
  });

  it("returns different instance for different rpcUrl", () => {
    const a = getProvider("https://rpc1.example.com");
    const b = getProvider("https://rpc2.example.com");
    expect(a).not.toBe(b);
  });

  it("uses default rpcUrl when none provided", () => {
    const { JsonRpcProvider } = require("ethers");
    getProvider();
    expect(JsonRpcProvider).toHaveBeenCalledWith(
      "https://arb1.arbitrum.io/rpc"
    );
  });
});

describe("resetProviderCache", () => {
  it("clears cached providers", () => {
    const a = getProvider("https://rpc1.example.com");
    resetProviderCache();
    const b = getProvider("https://rpc1.example.com");
    expect(a).not.toBe(b);
  });
});

describe("withRetry", () => {
  const noDelay = () => Promise.resolve();

  it("returns result on first success", async () => {
    const fn = jest.fn().mockResolvedValue("ok");
    const result = await withRetry(fn, { delayFn: noDelay });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on network error and succeeds", async () => {
    const networkErr = Object.assign(new Error("timeout"), {
      code: "NETWORK_ERROR",
    });
    const fn = jest
      .fn()
      .mockRejectedValueOnce(networkErr)
      .mockResolvedValue("ok");
    const result = await withRetry(fn, { delayFn: noDelay });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("throws after max retries exhausted", async () => {
    const networkErr = Object.assign(new Error("connection refused"), {
      code: "NETWORK_ERROR",
    });
    const fn = jest.fn().mockRejectedValue(networkErr);
    await expect(withRetry(fn, { maxRetries: 2, delayFn: noDelay })).rejects.toThrow(
      "connection refused"
    );
    expect(fn).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  it("does not retry non-retryable errors", async () => {
    const bizErr = Object.assign(new Error("insufficient funds"), {
      code: "INSUFFICIENT_FUNDS",
    });
    const fn = jest.fn().mockRejectedValue(bizErr);
    await expect(withRetry(fn, { delayFn: noDelay })).rejects.toThrow(
      "insufficient funds"
    );
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("rethrows original error object (not wrapped)", async () => {
    const originalErr = Object.assign(new Error("insufficient funds"), {
      code: "INSUFFICIENT_FUNDS",
    });
    const fn = jest.fn().mockRejectedValue(originalErr);
    try {
      await withRetry(fn, { delayFn: noDelay });
      fail("should have thrown");
    } catch (err) {
      expect(err).toBe(originalErr); // exact same reference
    }
  });

  it("respects custom isRetryable", async () => {
    const customErr = new Error("custom retryable");
    const fn = jest
      .fn()
      .mockRejectedValueOnce(customErr)
      .mockResolvedValue("ok");
    const result = await withRetry(fn, {
      delayFn: noDelay,
      isRetryable: () => true,
    });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
