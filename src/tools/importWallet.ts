import { Wallet, HDNodeWallet } from "ethers";
import {
  ImportWalletParams,
  ImportWalletData,
  HandlerResult,
} from "../types.js";
import { classifyKeyError } from "../errors.js";

export async function importWalletHandler(
  params: ImportWalletParams
): Promise<HandlerResult<ImportWalletData>> {
  const hasKey = !!params.privateKey;
  const hasMnemonic = !!params.mnemonic;

  if (hasKey && hasMnemonic) {
    return {
      success: false,
      error:
        "ValidationError: Provide either privateKey or mnemonic, not both",
    };
  }

  if (!hasKey && !hasMnemonic) {
    return {
      success: false,
      error:
        "ValidationError: Must provide either privateKey or mnemonic",
    };
  }

  try {
    if (hasKey) {
      const wallet = new Wallet(params.privateKey!);
      return {
        success: true,
        data: {
          address: wallet.address,
          privateKey: wallet.privateKey,
        },
      };
    }

    // Mnemonic path
    const wallet = HDNodeWallet.fromPhrase(params.mnemonic!);
    return {
      success: true,
      data: {
        address: wallet.address,
        privateKey: wallet.privateKey,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (classifyKeyError(err)) {
      return { success: false, error: `InvalidKeyError: ${msg}` };
    }
    // Mnemonic errors also classified as InvalidKeyError (invalid input credential)
    return { success: false, error: `InvalidKeyError: ${msg}` };
  }
}
