import { Wallet } from "ethers";
import {
  SignTypedDataParams,
  SignTypedDataData,
  HandlerResult,
} from "../types.js";
import { classifyKeyError } from "../errors.js";

export async function signTypedDataHandler(
  params: SignTypedDataParams
): Promise<HandlerResult<SignTypedDataData>> {
  if (!params.domain || Object.keys(params.domain).length === 0) {
    return {
      success: false,
      error: "ValidationError: domain must not be empty",
    };
  }

  if (!params.types || Object.keys(params.types).length === 0) {
    return {
      success: false,
      error: "ValidationError: types must not be empty",
    };
  }

  if (!params.value || Object.keys(params.value).length === 0) {
    return {
      success: false,
      error: "ValidationError: value must not be empty",
    };
  }

  let wallet: Wallet;
  try {
    wallet = new Wallet(params.privateKey);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (classifyKeyError(err)) {
      return { success: false, error: `InvalidKeyError: ${msg}` };
    }
    return { success: false, error: `SignError: ${msg}` };
  }

  try {
    const signature = await wallet.signTypedData(
      params.domain,
      params.types,
      params.value
    );

    return {
      success: true,
      data: {
        signature,
        address: wallet.address,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `SignError: ${msg}` };
  }
}
