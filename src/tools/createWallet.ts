import { Wallet } from "ethers";
import { CreateWalletParams, CreateWalletData, HandlerResult } from "../types";

export async function createWalletHandler(
  _params: CreateWalletParams
): Promise<HandlerResult<CreateWalletData>> {
  try {
    const wallet = Wallet.createRandom();
    if (!wallet.mnemonic) {
      return {
        success: false,
        error: "UnexpectedError: mnemonic is null after createRandom",
      };
    }
    return {
      success: true,
      data: {
        address: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic: wallet.mnemonic.phrase,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `UnexpectedError: ${msg}` };
  }
}
