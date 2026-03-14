import { Wallet } from "ethers";
import { SignMessageParams, SignMessageData, HandlerResult } from "../types";

function classifyKeyError(err: unknown): boolean {
  const code = (err as { code?: string }).code;
  const msg = err instanceof Error ? err.message : String(err);
  const msgLower = msg.toLowerCase();
  return (
    code === "INVALID_ARGUMENT" ||
    msgLower.includes("invalid private key") ||
    msgLower.includes("invalid argument") ||
    msgLower.includes("valid bigint") ||
    msgLower.includes("curve.n")
  );
}

export async function signMessageHandler(
  params: SignMessageParams
): Promise<HandlerResult<SignMessageData>> {
  // Separate Wallet construction so key errors are always InvalidKeyError,
  // not masked by the signMessage catch block.
  let wallet: Wallet;
  try {
    wallet = new Wallet(params.privateKey);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (classifyKeyError(err)) {
      return { success: false, error: `InvalidKeyError: ${msg}` };
    }
    return { success: false, error: `UnexpectedError: ${msg}` };
  }

  try {
    const signature = await wallet.signMessage(params.message);
    return {
      success: true,
      data: {
        signature,
        address: wallet.address,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `UnexpectedError: ${msg}` };
  }
}
