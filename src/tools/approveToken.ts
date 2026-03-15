import { Wallet, Contract, isAddress, parseUnits, MaxUint256 } from "ethers";
import {
  ApproveTokenParams,
  ApproveTokenData,
  HandlerResult,
  ERC20_ABI,
} from "../types.js";
import { classifyKeyError, isNetworkError } from "../errors.js";
import { getProvider, withRetry } from "../provider.js";

export async function approveTokenHandler(
  params: ApproveTokenParams
): Promise<HandlerResult<ApproveTokenData>> {
  if (!isAddress(params.tokenAddress)) {
    return {
      success: false,
      error: `ValidationError: Invalid token address "${params.tokenAddress}"`,
    };
  }

  if (!isAddress(params.spender)) {
    return {
      success: false,
      error: `ValidationError: Invalid spender address "${params.spender}"`,
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

    let approvalAmount: bigint;

    if (params.amount === "unlimited") {
      approvalAmount = MaxUint256;
    } else {
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

      try {
        approvalAmount = parseUnits(params.amount, decimals);
      } catch {
        return {
          success: false,
          error: `ValidationError: Invalid amount "${params.amount}"`,
        };
      }

      if (approvalAmount <= 0n) {
        return {
          success: false,
          error: `ValidationError: amount must be greater than 0, got "${params.amount}"`,
        };
      }
    }

    // Fire-and-forget, no withRetry — state-changing operation
    const tx = await contract.approve(params.spender, approvalAmount);

    return {
      success: true,
      data: {
        txHash: tx.hash,
        owner: wallet.address,
        spender: params.spender,
        tokenAddress: params.tokenAddress,
        amount: params.amount,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);

    if (classifyKeyError(err)) {
      return { success: false, error: `InvalidKeyError: ${msg}` };
    }
    if (isNetworkError(err)) {
      return { success: false, error: `NetworkError: ${msg}` };
    }
    return { success: false, error: `TransactionError: ${msg}` };
  }
}
