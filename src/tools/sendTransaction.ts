import { Wallet, parseEther, isAddress } from "ethers";
import {
  SendTransactionParams,
  SendTransactionData,
  HandlerResult,
} from "../types.js";
import { classifyKeyError, isNetworkError, isInsufficientFundsError } from "../errors.js";
import { getProvider } from "../provider.js";

export async function sendTransactionHandler(
  params: SendTransactionParams
): Promise<HandlerResult<SendTransactionData>> {
  // Parameter validation
  if (!isAddress(params.to)) {
    return {
      success: false,
      error: `ValidationError: Invalid recipient address "${params.to}"`,
    };
  }

  let parsedAmount: bigint;
  try {
    parsedAmount = parseEther(params.amount);
  } catch {
    return {
      success: false,
      error: `ValidationError: Invalid amount "${params.amount}"`,
    };
  }

  if (parsedAmount <= 0n) {
    return {
      success: false,
      error: `ValidationError: amount must be greater than 0, got "${params.amount}"`,
    };
  }

  // Separate Wallet construction from sendTransaction so that key errors
  // are always classified as InvalidKeyError, not TransactionError.
  let wallet: Wallet;
  try {
    const provider = getProvider(params.rpcUrl);
    wallet = new Wallet(params.privateKey, provider);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (classifyKeyError(err)) {
      return { success: false, error: `InvalidKeyError: ${msg}` };
    }
    return { success: false, error: `TransactionError: ${msg}` };
  }

  try {
    const tx = await wallet.sendTransaction({
      to: params.to,
      value: parsedAmount,
    });

    // Fire-and-forget: return txHash immediately after broadcast.
    // Does not await tx.wait(). Transaction may still revert on-chain.
    return {
      success: true,
      data: {
        txHash: tx.hash,
        from: wallet.address,
        to: params.to,
        amount: params.amount,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);

    if (isInsufficientFundsError(err)) {
      return { success: false, error: `InsufficientFundsError: ${msg}` };
    }
    if (classifyKeyError(err)) {
      return { success: false, error: `InvalidKeyError: ${msg}` };
    }
    if (isNetworkError(err)) {
      return { success: false, error: `NetworkError: ${msg}` };
    }
    return { success: false, error: `TransactionError: ${msg}` };
  }
}
