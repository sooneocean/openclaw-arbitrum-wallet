import { Wallet } from "ethers";
import { SignMessageParams, SignMessageData, HandlerResult } from "../types";

export async function signMessageHandler(
  params: SignMessageParams
): Promise<HandlerResult<SignMessageData>> {
  try {
    const wallet = new Wallet(params.privateKey);
    const signature = await wallet.signMessage(params.message);
    return {
      success: true,
      data: {
        signature,
        address: wallet.address,
      },
    };
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    const msg = err instanceof Error ? err.message : String(err);

    if (
      code === "INVALID_ARGUMENT" ||
      msg.toLowerCase().includes("invalid private key") ||
      msg.toLowerCase().includes("invalid argument")
    ) {
      return { success: false, error: `InvalidKeyError: ${msg}` };
    }
    return { success: false, error: `UnexpectedError: ${msg}` };
  }
}
