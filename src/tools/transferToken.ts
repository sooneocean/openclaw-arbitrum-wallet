import { Wallet, Contract, isAddress, parseUnits } from "ethers";
import {
  TransferTokenParams,
  TransferTokenData,
  HandlerResult,
  ERC20_ABI,
} from "../types.js";
import { classifyKeyError, isNetworkError } from "../errors.js";
import { getProvider, withRetry } from "../provider.js";

export async function transferTokenHandler(
  params: TransferTokenParams
): Promise<HandlerResult<TransferTokenData>> {
  if (!isAddress(params.to)) {
    return {
      success: false,
      error: `ValidationError: Invalid recipient address "${params.to}"`,
    };
  }

  if (!isAddress(params.tokenAddress)) {
    return {
      success: false,
      error: `ValidationError: Invalid token address "${params.tokenAddress}"`,
    };
  }

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
    const contract = new Contract(params.tokenAddress, ERC20_ABI, wallet);

    let decimals: number;
    try {
      const decimalsRaw = await withRetry(() => contract.decimals());
      decimals = Number(decimalsRaw);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (isNetworkError(err)) {
        return { success: false, error: `NetworkError: ${msg}` };
      }
      return {
        success: false,
        error: `InvalidContractError: decimals() failed — ${msg}`,
      };
    }

    let parsedAmount: bigint;
    try {
      parsedAmount = parseUnits(params.amount, decimals);
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

    // Fire-and-forget, no withRetry — state-changing operation
    const tx = await contract.transfer(params.to, parsedAmount);

    return {
      success: true,
      data: {
        txHash: tx.hash,
        from: wallet.address,
        to: params.to,
        tokenAddress: params.tokenAddress,
        amount: params.amount,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);

    if (classifyKeyError(err)) {
      return { success: false, error: `InvalidKeyError: ${msg}` };
    }
    if (
      (err as { code?: string }).code === "INSUFFICIENT_FUNDS" ||
      msg.toLowerCase().includes("insufficient funds")
    ) {
      return { success: false, error: `InsufficientFundsError: ${msg}` };
    }
    if (isNetworkError(err)) {
      return { success: false, error: `NetworkError: ${msg}` };
    }
    return { success: false, error: `TransactionError: ${msg}` };
  }
}
