import { Wallet, Contract, isAddress } from "ethers";
import {
  TransferNftParams,
  TransferNftData,
  HandlerResult,
  ERC721_ABI,
} from "../types.js";
import { classifyKeyError, isNetworkError } from "../errors.js";
import { getProvider } from "../provider.js";

export async function transferNftHandler(
  params: TransferNftParams
): Promise<HandlerResult<TransferNftData>> {
  if (!isAddress(params.contractAddress)) {
    return {
      success: false,
      error: `ValidationError: Invalid contract address "${params.contractAddress}"`,
    };
  }

  if (!isAddress(params.to)) {
    return {
      success: false,
      error: `ValidationError: Invalid recipient address "${params.to}"`,
    };
  }

  if (!params.tokenId || !/^\d+$/.test(params.tokenId)) {
    return {
      success: false,
      error: `ValidationError: Invalid tokenId "${params.tokenId}". Must be a non-negative integer.`,
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
    return { success: false, error: `NftError: ${msg}` };
  }

  try {
    const nft = new Contract(params.contractAddress, ERC721_ABI, wallet);
    const tx = await nft.safeTransferFrom(
      wallet.address,
      params.to,
      params.tokenId
    );

    return {
      success: true,
      data: {
        txHash: tx.hash,
        from: wallet.address,
        to: params.to,
        contractAddress: params.contractAddress,
        tokenId: params.tokenId,
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
    return { success: false, error: `NftError: ${msg}` };
  }
}
