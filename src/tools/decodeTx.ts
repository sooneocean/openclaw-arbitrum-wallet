import { Interface } from "ethers";
import { DecodeTxParams, DecodeTxData, HandlerResult } from "../types.js";

export async function decodeTxHandler(
  params: DecodeTxParams
): Promise<HandlerResult<DecodeTxData>> {
  if (!/^0x[0-9a-fA-F]+$/.test(params.data)) {
    return {
      success: false,
      error: `ValidationError: Invalid calldata — must be hex-encoded with 0x prefix`,
    };
  }

  if (params.data.length < 10) {
    return {
      success: false,
      error: `ValidationError: Calldata too short — must include at least a 4-byte function selector`,
    };
  }

  if (!params.abi || params.abi.length === 0) {
    return {
      success: false,
      error: "ValidationError: abi array must not be empty",
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
    const decoded = iface.parseTransaction({ data: params.data });

    if (!decoded) {
      return {
        success: false,
        error: "DecodeError: No matching function found in the provided ABI",
      };
    }

    const args: Record<string, string> = {};
    const fragment = decoded.fragment;
    for (let i = 0; i < fragment.inputs.length; i++) {
      const input = fragment.inputs[i];
      const value = decoded.args[i];
      args[input.name || `arg${i}`] = String(value);
    }

    return {
      success: true,
      data: {
        functionName: decoded.name,
        args,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `DecodeError: ${msg}`,
    };
  }
}
