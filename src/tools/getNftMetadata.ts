import { Contract, isAddress } from "ethers";
import {
  GetNftMetadataParams,
  GetNftMetadataData,
  HandlerResult,
  ERC721_ABI,
} from "../types.js";
import { isNetworkError } from "../errors.js";
import { getProvider, withRetry } from "../provider.js";

export async function getNftMetadataHandler(
  params: GetNftMetadataParams
): Promise<HandlerResult<GetNftMetadataData>> {
  if (!isAddress(params.contractAddress)) {
    return {
      success: false,
      error: `ValidationError: Invalid contract address "${params.contractAddress}"`,
    };
  }

  if (!params.tokenId || !/^\d+$/.test(params.tokenId)) {
    return {
      success: false,
      error: `ValidationError: Invalid tokenId "${params.tokenId}". Must be a non-negative integer.`,
    };
  }

  const provider = getProvider(params.rpcUrl);

  try {
    const nft = new Contract(params.contractAddress, ERC721_ABI, provider);

    const [owner, tokenURI, name, symbol] = await Promise.all([
      withRetry(() => nft.ownerOf(params.tokenId)),
      withRetry(() => nft.tokenURI(params.tokenId)).catch(() => ""),
      withRetry(() => nft.name()).catch(() => "UNKNOWN"),
      withRetry(() => nft.symbol()).catch(() => "UNKNOWN"),
    ]);

    return {
      success: true,
      data: {
        contractAddress: params.contractAddress,
        tokenId: params.tokenId,
        owner,
        tokenURI,
        name,
        symbol,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isNetworkError(err)) {
      return { success: false, error: `NetworkError: ${msg}` };
    }
    return { success: false, error: `NftError: ${msg}` };
  }
}
