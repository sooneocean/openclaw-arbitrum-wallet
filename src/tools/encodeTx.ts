import { Interface } from "ethers";
import { EncodeTxParams, EncodeTxData, HandlerResult } from "../types.js";

export async function encodeTxHandler(
  params: EncodeTxParams
): Promise<HandlerResult<EncodeTxData>> {
  if (!params.abi || params.abi.length === 0) {
    return {
      success: false,
      error: "ValidationError: abi array must not be empty",
    };
  }

  if (!params.functionName) {
    return {
      success: false,
      error: "ValidationError: functionName must not be empty",
    };
  }

  let iface: Interface;
  try {
    iface = new Interface(params.abi);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `ValidationError: Invalid ABI — ${msg}`,
    };
  }

  try {
    const data = iface.encodeFunctionData(params.functionName, params.args ?? []);
    const fragment = iface.getFunction(params.functionName);
    const functionSignature = fragment ? fragment.format("sighash") : params.functionName;

    return {
      success: true,
      data: {
        data,
        functionSignature,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `EncodeError: ${msg}`,
    };
  }
}
