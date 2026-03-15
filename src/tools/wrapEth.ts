import { Wallet, Contract, parseEther } from "ethers";
import { WrapEthParams, WrapEthData, HandlerResult } from "../types.js";
import { classifyKeyError, isNetworkError } from "../errors.js";
import { getProvider } from "../provider.js";
import { WETH_ADDRESS } from "../uniswap.js";

const WETH_ABI = [
  "function deposit() payable",
  "function withdraw(uint256 wad)",
];

export async function wrapEthHandler(
  params: WrapEthParams
): Promise<HandlerResult<WrapEthData>> {
  let amount: bigint;
  try {
    amount = parseEther(params.amount);
  } catch {
    return {
      success: false,
      error: `ValidationError: Invalid amount "${params.amount}"`,
    };
  }

  if (amount <= 0n) {
    return {
      success: false,
      error: `ValidationError: amount must be greater than 0, got "${params.amount}"`,
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
    return { success: false, error: `WrapError: ${msg}` };
  }

  try {
    const weth = new Contract(WETH_ADDRESS, WETH_ABI, wallet);
    const tx = await weth.deposit({ value: amount });
    return {
      success: true,
      data: { txHash: tx.hash, amount: params.amount, wethAddress: WETH_ADDRESS },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isNetworkError(err)) {
      return { success: false, error: `NetworkError: ${msg}` };
    }
    return { success: false, error: `WrapError: ${msg}` };
  }
}

export async function unwrapEthHandler(
  params: WrapEthParams
): Promise<HandlerResult<WrapEthData>> {
  let amount: bigint;
  try {
    amount = parseEther(params.amount);
  } catch {
    return {
      success: false,
      error: `ValidationError: Invalid amount "${params.amount}"`,
    };
  }

  if (amount <= 0n) {
    return {
      success: false,
      error: `ValidationError: amount must be greater than 0, got "${params.amount}"`,
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
    return { success: false, error: `WrapError: ${msg}` };
  }

  try {
    const weth = new Contract(WETH_ADDRESS, WETH_ABI, wallet);
    const tx = await weth.withdraw(amount);
    return {
      success: true,
      data: { txHash: tx.hash, amount: params.amount, wethAddress: WETH_ADDRESS },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isNetworkError(err)) {
      return { success: false, error: `NetworkError: ${msg}` };
    }
    return { success: false, error: `WrapError: ${msg}` };
  }
}
