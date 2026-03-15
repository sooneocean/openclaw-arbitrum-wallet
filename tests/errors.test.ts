import { classifyKeyError, isNetworkError, isInsufficientFundsError } from "../src/errors";

describe("classifyKeyError", () => {
  it("returns true for error.code === INVALID_ARGUMENT", () => {
    const err = Object.assign(new Error("some error"), {
      code: "INVALID_ARGUMENT",
    });
    expect(classifyKeyError(err)).toBe(true);
  });

  it('returns true for "invalid private key" in message', () => {
    const err = new Error("invalid private key length");
    expect(classifyKeyError(err)).toBe(true);
  });

  it('returns true for "invalid argument" in message', () => {
    const err = new Error("Invalid Argument provided");
    expect(classifyKeyError(err)).toBe(true);
  });

  it('returns true for "valid bigint" in message', () => {
    const err = new Error("Expected valid bigint: 0 < bigint < curve.n");
    expect(classifyKeyError(err)).toBe(true);
  });

  it('returns true for "curve.n" in message', () => {
    const err = new Error("value exceeds curve.n");
    expect(classifyKeyError(err)).toBe(true);
  });

  it("returns false for non-key error", () => {
    const err = new Error("insufficient funds for gas");
    expect(classifyKeyError(err)).toBe(false);
  });
});

describe("isNetworkError", () => {
  it("returns true for error.code === NETWORK_ERROR", () => {
    const err = Object.assign(new Error("some error"), {
      code: "NETWORK_ERROR",
    });
    expect(isNetworkError(err)).toBe(true);
  });

  it('returns true for "network" in message', () => {
    expect(isNetworkError(new Error("network error occurred"))).toBe(true);
  });

  it('returns true for "timeout" in message', () => {
    expect(isNetworkError(new Error("request timeout"))).toBe(true);
  });

  it('returns true for "connection" in message', () => {
    expect(isNetworkError(new Error("connection refused"))).toBe(true);
  });

  it('returns true for "econnrefused" in message', () => {
    expect(isNetworkError(new Error("ECONNREFUSED 127.0.0.1:8545"))).toBe(true);
  });

  it('returns true for "econnreset" in message', () => {
    expect(isNetworkError(new Error("ECONNRESET by peer"))).toBe(true);
  });

  it("returns false for business errors", () => {
    expect(isNetworkError(new Error("insufficient funds"))).toBe(false);
    expect(isNetworkError(new Error("execution reverted"))).toBe(false);
    expect(isNetworkError(new Error("invalid private key"))).toBe(false);
  });

  it("handles non-Error objects", () => {
    expect(isNetworkError("network failure")).toBe(true);
    expect(isNetworkError("some string")).toBe(false);
    expect(isNetworkError({ code: "NETWORK_ERROR" })).toBe(true);
  });
});

describe("isInsufficientFundsError", () => {
  it("returns true for INSUFFICIENT_FUNDS code", () => {
    const err = Object.assign(new Error("not enough"), { code: "INSUFFICIENT_FUNDS" });
    expect(isInsufficientFundsError(err)).toBe(true);
  });

  it("returns true for 'insufficient funds' in message", () => {
    expect(isInsufficientFundsError(new Error("insufficient funds for gas"))).toBe(true);
  });

  it("returns false for unrelated errors", () => {
    expect(isInsufficientFundsError(new Error("execution reverted"))).toBe(false);
    expect(isInsufficientFundsError(new Error("network timeout"))).toBe(false);
  });
});
