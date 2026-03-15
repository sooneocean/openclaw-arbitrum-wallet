import { verifyMessage } from "ethers";
import {
  VerifySignatureParams,
  VerifySignatureData,
  HandlerResult,
} from "../types.js";

export async function verifySignatureHandler(
  params: VerifySignatureParams
): Promise<HandlerResult<VerifySignatureData>> {
  try {
    const signerAddress = verifyMessage(params.message, params.signature);
    return {
      success: true,
      data: {
        signerAddress,
        isValid: true,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `ValidationError: Invalid signature — ${msg}`,
    };
  }
}
