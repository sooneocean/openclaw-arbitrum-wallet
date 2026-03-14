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
