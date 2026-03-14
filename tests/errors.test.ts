import { classifyKeyError } from "../src/errors";

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
