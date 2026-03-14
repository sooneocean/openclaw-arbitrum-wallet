import { Wallet, JsonRpcProvider, parseEther, isAddress } from "ethers";
import {
  SendTransactionParams,
  SendTransactionData,
  HandlerResult,
  DEFAULT_RPC_URL,
} from "../types";

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
    const provider = new JsonRpcProvider(params.rpcUrl ?? DEFAULT_RPC_URL);
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
    const code = (err as { code?: string }).code;
    const msg = err instanceof Error ? err.message : String(err);

    if (
      code === "INSUFFICIENT_FUNDS" ||
      msg.toLowerCase().includes("insufficient funds")
    ) {
      return { success: false, error: `InsufficientFundsError: ${msg}` };
    }
    if (classifyKeyError(err)) {
      return { success: false, error: `InvalidKeyError: ${msg}` };
    }
    if (
      code === "NETWORK_ERROR" ||
      msg.toLowerCase().includes("network") ||
      msg.toLowerCase().includes("timeout") ||
      msg.toLowerCase().includes("connection")
    ) {
      return { success: false, error: `NetworkError: ${msg}` };
    }
    return { success: false, error: `TransactionError: ${msg}` };
  }
}
