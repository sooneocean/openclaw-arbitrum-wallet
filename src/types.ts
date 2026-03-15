/**
 * openclaw-arbitrum-wallet — Shared Types
 * All handler params, response data, and error types.
 */

// ============================================================
// Shared
// ============================================================

/** Standard handler return format */
export interface HandlerResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/** Default Arbitrum One RPC */
export const DEFAULT_RPC_URL = "https://arb1.arbitrum.io/rpc";

/** ERC20 minimal human-readable ABI */
export const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function name() view returns (string)",
  "function totalSupply() view returns (uint256)",
];

// ============================================================
// FA1: create_wallet
// ============================================================

/** create_wallet requires no input */
export interface CreateWalletParams {}

export interface CreateWalletData {
  /** 0x-prefixed 42-char hex address */
  address: string;
  /** 0x-prefixed 66-char hex private key */
  privateKey: string;
  /** 12-word mnemonic phrase */
  mnemonic: string;
}

export type CreateWalletHandler = (
  params: CreateWalletParams
) => Promise<HandlerResult<CreateWalletData>>;

// ============================================================
// FA2: get_balance
// ============================================================

export interface GetBalanceParams {
  /** Arbitrum address to query */
  address: string;
  /** Optional ERC20 contract address; omit to query native ETH */
  tokenAddress?: string;
  /** Optional custom RPC URL */
  rpcUrl?: string;
}

export interface GetBalanceData {
  address: string;
  /** Human-readable balance (decimals applied) */
  balance: string;
  /** "ETH" or token symbol */
  symbol: string;
  /** 18 for ETH, or token decimals */
  decimals: number;
  /** Raw wei / smallest-unit value as string (no precision loss) */
  raw: string;
}

export type GetBalanceHandler = (
  params: GetBalanceParams
) => Promise<HandlerResult<GetBalanceData>>;

// ============================================================
// FA3: send_transaction
// ============================================================

export interface SendTransactionParams {
  /** Sender's private key (0x-prefixed hex) */
  privateKey: string;
  /** Recipient address (0x-prefixed) */
  to: string;
  /** ETH amount in human-readable format, e.g. "0.1" */
  amount: string;
  /** Optional custom RPC URL */
  rpcUrl?: string;
}

export interface SendTransactionData {
  /** Transaction hash */
  txHash: string;
  /** Sender address */
  from: string;
  /** Recipient address */
  to: string;
  /** ETH amount sent */
  amount: string;
}

export type SendTransactionHandler = (
  params: SendTransactionParams
) => Promise<HandlerResult<SendTransactionData>>;

// ============================================================
// FA4: sign_message
// ============================================================

export interface SignMessageParams {
  /** Private key to sign with (0x-prefixed hex) */
  privateKey: string;
  /** Message text to sign */
  message: string;
}

export interface SignMessageData {
  /** EIP-191 signature hex string */
  signature: string;
  /** Signer address (for verification convenience) */
  address: string;
}

export type SignMessageHandler = (
  params: SignMessageParams
) => Promise<HandlerResult<SignMessageData>>;

// ============================================================
// FA5: transfer_token
// ============================================================

export interface TransferTokenParams {
  /** Sender's private key (0x-prefixed hex) */
  privateKey: string;
  /** ERC20 token contract address (0x-prefixed) */
  tokenAddress: string;
  /** Recipient address (0x-prefixed) */
  to: string;
  /** Token amount in human-readable format (e.g. "100.5") */
  amount: string;
  /** Optional custom RPC URL */
  rpcUrl?: string;
}

export interface TransferTokenData {
  /** Transaction hash */
  txHash: string;
  /** Sender address */
  from: string;
  /** Recipient address */
  to: string;
  /** Token contract address */
  tokenAddress: string;
  /** Token amount sent (human-readable) */
  amount: string;
}

export type TransferTokenHandler = (
  params: TransferTokenParams
) => Promise<HandlerResult<TransferTokenData>>;

// ============================================================
// FA6: get_transaction_receipt
// ============================================================

export interface GetTransactionReceiptParams {
  /** Transaction hash (0x-prefixed) */
  txHash: string;
  /** Optional custom RPC URL */
  rpcUrl?: string;
}

export interface GetTransactionReceiptData {
  /** Transaction hash */
  txHash: string;
  /** "success" (status 1), "reverted" (status 0), or "pending" (not mined yet) */
  status: "success" | "reverted" | "pending";
  /** Block number (null if pending) */
  blockNumber: number | null;
  /** Gas used (null if pending) */
  gasUsed: string | null;
  /** Sender address (null if pending) */
  from: string | null;
  /** Recipient address (null if pending) */
  to: string | null;
}

export type GetTransactionReceiptHandler = (
  params: GetTransactionReceiptParams
) => Promise<HandlerResult<GetTransactionReceiptData>>;

// ============================================================
// FA7: import_wallet
// ============================================================

export interface ImportWalletParams {
  /** Private key to import (0x-prefixed hex). Provide either this or mnemonic, not both. */
  privateKey?: string;
  /** Mnemonic phrase to import (12 or 24 words). Provide either this or privateKey, not both. */
  mnemonic?: string;
}

export interface ImportWalletData {
  /** 0x-prefixed 42-char hex address */
  address: string;
  /** 0x-prefixed 66-char hex private key */
  privateKey: string;
}

export type ImportWalletHandler = (
  params: ImportWalletParams
) => Promise<HandlerResult<ImportWalletData>>;

// ============================================================
// FA8: approve_token
// ============================================================

export interface ApproveTokenParams {
  /** Owner's private key (0x-prefixed hex) */
  privateKey: string;
  /** ERC20 token contract address (0x-prefixed) */
  tokenAddress: string;
  /** Spender address to approve (0x-prefixed) */
  spender: string;
  /** Approval amount in human-readable format (e.g. "1000"). Use "unlimited" for max uint256. */
  amount: string;
  /** Optional custom RPC URL */
  rpcUrl?: string;
}

export interface ApproveTokenData {
  /** Transaction hash */
  txHash: string;
  /** Token owner address */
  owner: string;
  /** Approved spender address */
  spender: string;
  /** Token contract address */
  tokenAddress: string;
  /** Approved amount (human-readable) */
  amount: string;
}

export type ApproveTokenHandler = (
  params: ApproveTokenParams
) => Promise<HandlerResult<ApproveTokenData>>;

// ============================================================
// FA9: get_allowance
// ============================================================

export interface GetAllowanceParams {
  /** ERC20 token contract address (0x-prefixed) */
  tokenAddress: string;
  /** Token owner address (0x-prefixed) */
  owner: string;
  /** Spender address to check allowance for (0x-prefixed) */
  spender: string;
  /** Optional custom RPC URL */
  rpcUrl?: string;
}

export interface GetAllowanceData {
  /** Token owner address */
  owner: string;
  /** Spender address */
  spender: string;
  /** Token contract address */
  tokenAddress: string;
  /** Human-readable allowance (decimals applied) */
  allowance: string;
  /** Token symbol */
  symbol: string;
  /** Token decimals */
  decimals: number;
  /** Raw allowance value as string */
  raw: string;
}

export type GetAllowanceHandler = (
  params: GetAllowanceParams
) => Promise<HandlerResult<GetAllowanceData>>;

// ============================================================
// FA10: estimate_gas
// ============================================================

export interface EstimateGasParams {
  /** Sender address (0x-prefixed) */
  from: string;
  /** Recipient or contract address (0x-prefixed) */
  to: string;
  /** Optional ETH value in human-readable format (e.g. "0.1") */
  value?: string;
  /** Optional contract call data (hex-encoded) */
  data?: string;
  /** Optional custom RPC URL */
  rpcUrl?: string;
}

export interface EstimateGasData {
  /** Estimated gas units */
  gasEstimate: string;
  /** Current gas price in Gwei */
  gasPriceGwei: string;
  /** Estimated total cost in ETH */
  estimatedCostEth: string;
}

export type EstimateGasHandler = (
  params: EstimateGasParams
) => Promise<HandlerResult<EstimateGasData>>;

// ============================================================
// FA11: get_token_info
// ============================================================

export interface GetTokenInfoParams {
  /** ERC20 token contract address (0x-prefixed) */
  tokenAddress: string;
  /** Optional custom RPC URL */
  rpcUrl?: string;
}

export interface GetTokenInfoData {
  /** Token contract address */
  tokenAddress: string;
  /** Token name (e.g. "USD Coin") */
  name: string;
  /** Token symbol (e.g. "USDC") */
  symbol: string;
  /** Token decimals */
  decimals: number;
  /** Total supply (human-readable) */
  totalSupply: string;
  /** Total supply raw value */
  totalSupplyRaw: string;
}

export type GetTokenInfoHandler = (
  params: GetTokenInfoParams
) => Promise<HandlerResult<GetTokenInfoData>>;

// ============================================================
// FA12: verify_signature
// ============================================================

export interface VerifySignatureParams {
  /** The original message that was signed */
  message: string;
  /** The EIP-191 signature to verify (hex string) */
  signature: string;
}

export interface VerifySignatureData {
  /** Recovered signer address */
  signerAddress: string;
  /** Whether the signature is valid (always true if recovery succeeds) */
  isValid: boolean;
}

export type VerifySignatureHandler = (
  params: VerifySignatureParams
) => Promise<HandlerResult<VerifySignatureData>>;

// ============================================================
// FA13: swap_token
// ============================================================

export interface SwapTokenParams {
  /** Sender's private key (0x-prefixed hex) */
  privateKey: string;
  /** Token to swap from: ERC20 address (0x-prefixed) or 'ETH' for native ETH */
  tokenIn: string;
  /** Token to swap to: ERC20 address (0x-prefixed) or 'ETH' for native ETH */
  tokenOut: string;
  /** Amount of tokenIn in human-readable format (e.g. '0.1') */
  amountIn: string;
  /** Uniswap V3 pool fee tier: 100, 500, 3000, or 10000. Default: 3000 */
  fee?: number;
  /** Slippage tolerance in basis points. Default: 50 (0.5%) */
  slippageBps?: number;
  /** Transaction deadline as unix timestamp. Default: now + 1800 (30 min) */
  deadline?: number;
  /** Optional custom RPC URL */
  rpcUrl?: string;
}

export interface SwapTokenData {
  /** Transaction hash */
  txHash: string;
  /** Token swapped from (address or 'ETH') */
  tokenIn: string;
  /** Token swapped to (address or 'ETH') */
  tokenOut: string;
  /** Amount of tokenIn (human-readable) */
  amountIn: string;
  /** Expected output amount from quoter (human-readable) */
  expectedAmountOut: string;
  /** Minimum accepted output after slippage (human-readable) */
  amountOutMinimum: string;
  /** Pool fee tier used */
  fee: number;
  /** Swap path description */
  path: "ETH→TOKEN" | "TOKEN→ETH" | "TOKEN→TOKEN";
}

export type SwapTokenHandler = (
  params: SwapTokenParams
) => Promise<HandlerResult<SwapTokenData>>;

// ============================================================
// FA14: get_token_price
// ============================================================

export interface GetTokenPriceParams {
  /** Base token ERC20 address (0x-prefixed) */
  tokenA: string;
  /** Quote token ERC20 address (0x-prefixed) */
  tokenB: string;
  /** Uniswap V3 pool fee tier: 100, 500, 3000, or 10000. Default: 3000 */
  fee?: number;
  /** Optional custom RPC URL */
  rpcUrl?: string;
}

export interface GetTokenPriceData {
  /** Base token address */
  tokenA: string;
  /** Quote token address */
  tokenB: string;
  /** Human-readable price: how many tokenB per 1 tokenA */
  price: string;
  /** Pool fee tier */
  fee: number;
  /** Uniswap V3 pool address */
  poolAddress: string;
}

export type GetTokenPriceHandler = (
  params: GetTokenPriceParams
) => Promise<HandlerResult<GetTokenPriceData>>;

// ============================================================
// FA15: watch_transaction
// ============================================================

export interface WatchTransactionParams {
  /** Transaction hash to watch (0x-prefixed, 66 chars) */
  txHash: string;
  /** Number of block confirmations to wait for. Default: 1 */
  confirmations?: number;
  /** Timeout in milliseconds. Default: 120000 (2 minutes) */
  timeoutMs?: number;
  /** Optional custom RPC URL */
  rpcUrl?: string;
}

export interface WatchTransactionData {
  /** Transaction hash */
  txHash: string;
  /** "success" (status 1) or "reverted" (status 0) */
  status: "success" | "reverted";
  /** Block number where tx was mined */
  blockNumber: number;
  /** Gas used */
  gasUsed: string;
  /** Effective gas price in Gwei */
  effectiveGasPriceGwei: string;
  /** Sender address */
  from: string;
  /** Recipient/contract address */
  to: string;
  /** Number of confirmations achieved */
  confirmations: number;
}

export type WatchTransactionHandler = (
  params: WatchTransactionParams
) => Promise<HandlerResult<WatchTransactionData>>;

// ============================================================
// FA16: wrap_eth / unwrap_eth
// ============================================================

export interface WrapEthParams {
  /** Private key (0x-prefixed hex) */
  privateKey: string;
  /** Amount of ETH to wrap in human-readable format (e.g. '0.1') */
  amount: string;
  /** Optional custom RPC URL */
  rpcUrl?: string;
}

export interface WrapEthData {
  txHash: string;
  amount: string;
  wethAddress: string;
}

export interface UnwrapEthParams {
  /** Private key (0x-prefixed hex) */
  privateKey: string;
  /** Amount of WETH to unwrap in human-readable format (e.g. '0.1') */
  amount: string;
  /** Optional custom RPC URL */
  rpcUrl?: string;
}

export interface UnwrapEthData {
  txHash: string;
  amount: string;
  wethAddress: string;
}

// ============================================================
// FA17: multicall_read
// ============================================================

export interface MulticallReadParams {
  /** Array of call descriptors */
  calls: {
    /** Contract address (0x-prefixed) */
    target: string;
    /** ABI-encoded calldata (hex) */
    callData: string;
  }[];
  /** Optional custom RPC URL */
  rpcUrl?: string;
}

export interface MulticallReadData {
  /** Results array, one per call */
  results: {
    success: boolean;
    returnData: string;
  }[];
  /** Block number at which the multicall was executed */
  blockNumber: number;
}

// ============================================================
// FA18: get_pool_info
// ============================================================

export interface GetPoolInfoParams {
  /** Token A address (0x-prefixed) */
  tokenA: string;
  /** Token B address (0x-prefixed) */
  tokenB: string;
  /** Pool fee tier. Default: 3000 */
  fee?: number;
  /** Optional custom RPC URL */
  rpcUrl?: string;
}

export interface GetPoolInfoData {
  poolAddress: string;
  token0: string;
  token1: string;
  fee: number;
  sqrtPriceX96: string;
  tick: number;
  liquidity: string;
  unlocked: boolean;
}

// ============================================================
// FA19: decode_tx
// ============================================================

export interface DecodeTxParams {
  /** ABI-encoded calldata to decode (hex) */
  data: string;
  /** Human-readable ABI array for the target contract */
  abi: string[];
}

export interface DecodeTxData {
  /** Decoded function name */
  functionName: string;
  /** Decoded function arguments */
  args: Record<string, string>;
}

// ============================================================
// FA20: sign_typed_data
// ============================================================

export interface SignTypedDataParams {
  /** Private key (0x-prefixed hex) */
  privateKey: string;
  /** EIP-712 domain */
  domain: {
    name?: string;
    version?: string;
    chainId?: number;
    verifyingContract?: string;
  };
  /** EIP-712 types (excluding EIP712Domain) */
  types: Record<string, { name: string; type: string }[]>;
  /** The data to sign */
  value: Record<string, unknown>;
}

export interface SignTypedDataData {
  /** EIP-712 signature hex string */
  signature: string;
  /** Signer address */
  address: string;
}

// ============================================================
// FA21: simulate_transaction
// ============================================================

export interface SimulateTransactionParams {
  /** Sender address (0x-prefixed) */
  from: string;
  /** Target address (0x-prefixed) */
  to: string;
  /** Optional ETH value in human-readable format */
  value?: string;
  /** Optional contract calldata (hex) */
  data?: string;
  /** Optional custom RPC URL */
  rpcUrl?: string;
}

export interface SimulateTransactionData {
  /** Whether the call would succeed */
  success: boolean;
  /** Return data (hex) if success, revert reason if failed */
  returnData: string;
  /** Estimated gas that would be used */
  gasEstimate: string;
  /** Decoded revert reason if available */
  revertReason: string | null;
}

// ============================================================
// FA22-24: NFT tools
// ============================================================

export interface GetNftMetadataParams {
  /** NFT contract address (0x-prefixed) */
  contractAddress: string;
  /** Token ID */
  tokenId: string;
  /** Optional custom RPC URL */
  rpcUrl?: string;
}

export interface GetNftMetadataData {
  contractAddress: string;
  tokenId: string;
  owner: string;
  tokenURI: string;
  name: string;
  symbol: string;
}

export interface TransferNftParams {
  /** Sender's private key (0x-prefixed hex) */
  privateKey: string;
  /** NFT contract address (0x-prefixed) */
  contractAddress: string;
  /** Token ID to transfer */
  tokenId: string;
  /** Recipient address (0x-prefixed) */
  to: string;
  /** Optional custom RPC URL */
  rpcUrl?: string;
}

export interface TransferNftData {
  txHash: string;
  from: string;
  to: string;
  contractAddress: string;
  tokenId: string;
}

// ============================================================
// FA25: encode_tx
// ============================================================

export interface EncodeTxParams {
  /** Human-readable ABI array */
  abi: string[];
  /** Function name to encode */
  functionName: string;
  /** Arguments to pass (as strings or values) */
  args: unknown[];
}

export interface EncodeTxData {
  /** ABI-encoded calldata (hex) */
  data: string;
  /** Function signature */
  functionSignature: string;
}

// ============================================================
// FA26: get_block
// ============================================================

export interface GetBlockParams {
  /** Block number, "latest", "pending", or "earliest". Default: "latest" */
  block?: string | number;
  /** Optional custom RPC URL */
  rpcUrl?: string;
}

export interface GetBlockData {
  number: number;
  hash: string;
  timestamp: number;
  gasUsed: string;
  gasLimit: string;
  baseFeePerGas: string | null;
  transactionCount: number;
  miner: string;
}

// ============================================================
// FA27: get_portfolio
// ============================================================

export interface GetPortfolioParams {
  /** Address to query (0x-prefixed) */
  address: string;
  /** Optional list of ERC20 token addresses to check */
  tokenAddresses?: string[];
  /** Optional custom RPC URL */
  rpcUrl?: string;
}

export interface GetPortfolioData {
  address: string;
  ethBalance: string;
  tokens: {
    address: string;
    symbol: string;
    decimals: number;
    balance: string;
    raw: string;
  }[];
}

/** Minimal ERC721 ABI */
export const ERC721_ABI = [
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function safeTransferFrom(address from, address to, uint256 tokenId)",
  "function balanceOf(address owner) view returns (uint256)",
];
