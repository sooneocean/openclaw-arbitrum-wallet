import { Wallet, JsonRpcProvider, parseEther, isAddress } from "ethers";
import {
  SendTransactionParams,
  SendTransactionData,
  HandlerResult,
  DEFAULT_RPC_URL,
} from "../types";

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

  try {
    const provider = new JsonRpcProvider(params.rpcUrl ?? DEFAULT_RPC_URL);
    const wallet = new Wallet(params.privateKey, provider);

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
    if (
      code === "INVALID_ARGUMENT" ||
      msg.toLowerCase().includes("invalid private key") ||
      msg.toLowerCase().includes("invalid argument")
    ) {
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
