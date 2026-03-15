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
