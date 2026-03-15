import { createWalletHandler } from "./tools/createWallet.js";
import { getBalanceHandler } from "./tools/getBalance.js";
import { sendTransactionHandler } from "./tools/sendTransaction.js";
import { signMessageHandler } from "./tools/signMessage.js";
import { transferTokenHandler } from "./tools/transferToken.js";
import { getTransactionReceiptHandler } from "./tools/getTransactionReceipt.js";
import { importWalletHandler } from "./tools/importWallet.js";
import { approveTokenHandler } from "./tools/approveToken.js";
import { getAllowanceHandler } from "./tools/getAllowance.js";
import { estimateGasHandler } from "./tools/estimateGas.js";
import { getTokenInfoHandler } from "./tools/getTokenInfo.js";
import { verifySignatureHandler } from "./tools/verifySignature.js";

// Re-export individual handlers for direct import/testing
export { createWalletHandler } from "./tools/createWallet.js";
export { getBalanceHandler } from "./tools/getBalance.js";
export { sendTransactionHandler } from "./tools/sendTransaction.js";
export { signMessageHandler } from "./tools/signMessage.js";
export { transferTokenHandler } from "./tools/transferToken.js";
export { getTransactionReceiptHandler } from "./tools/getTransactionReceipt.js";
export { importWalletHandler } from "./tools/importWallet.js";
export { approveTokenHandler } from "./tools/approveToken.js";
export { getAllowanceHandler } from "./tools/getAllowance.js";
export { estimateGasHandler } from "./tools/estimateGas.js";
export { getTokenInfoHandler } from "./tools/getTokenInfo.js";
export { verifySignatureHandler } from "./tools/verifySignature.js";

/**
 * openclaw skill manifest.
 *
 * Usage from openclaw agent runtime (CommonJS):
 *   const skill = require("openclaw-arbitrum-wallet").default;
 *   // or with ESM interop:
 *   const { default: skill } = require("openclaw-arbitrum-wallet");
 *
 * Each tool handler returns { success, data?, error? } — never throws.
 */
const manifest = {
  name: "arbitrum-wallet",
  version: "1.3.0",
  description: "Arbitrum wallet management tools for openclaw agents",
  tools: [
    {
      name: "create_wallet",
      description:
        "Create a new Arbitrum wallet. Returns address, private key, and mnemonic phrase. The caller is responsible for securely storing the private key.",
      parameters: {
        type: "object",
        properties: {},
        required: [] as string[],
      },
      handler: createWalletHandler,
    },
    {
      name: "get_balance",
      description:
        "Query ETH or ERC20 token balance for an Arbitrum address.",
      parameters: {
        type: "object",
        properties: {
          address: {
            type: "string",
            description: "The Arbitrum address to query (0x-prefixed)",
          },
          tokenAddress: {
            type: "string",
            description:
              "Optional ERC20 token contract address. Omit to query native ETH.",
          },
          rpcUrl: {
            type: "string",
            description:
              "Optional custom RPC URL. Defaults to https://arb1.arbitrum.io/rpc",
          },
        },
        required: ["address"],
      },
      handler: getBalanceHandler,
    },
    {
      name: "send_transaction",
      description:
        "Send ETH on Arbitrum One. Returns txHash immediately after broadcast — does NOT wait for on-chain confirmation. Transaction may still revert on-chain. Check receipt separately if confirmation is required.",
      parameters: {
        type: "object",
        properties: {
          privateKey: {
            type: "string",
            description: "Sender's private key (0x-prefixed hex)",
          },
          to: {
            type: "string",
            description: "Recipient address (0x-prefixed)",
          },
          amount: {
            type: "string",
            description:
              "Amount of ETH to send in human-readable format (e.g. '0.1')",
          },
          rpcUrl: {
            type: "string",
            description:
              "Optional custom RPC URL. Defaults to https://arb1.arbitrum.io/rpc",
          },
        },
        required: ["privateKey", "to", "amount"],
      },
      handler: sendTransactionHandler,
    },
    {
      name: "sign_message",
      description:
        "Sign a message with a private key using EIP-191 personal sign. Returns the signature and signer address.",
      parameters: {
        type: "object",
        properties: {
          privateKey: {
            type: "string",
            description: "Private key to sign with (0x-prefixed hex)",
          },
          message: {
            type: "string",
            description: "The message to sign",
          },
        },
        required: ["privateKey", "message"],
      },
      handler: signMessageHandler,
    },
    {
      name: "transfer_token",
      description:
        "Transfer ERC20 tokens on Arbitrum One. Returns txHash immediately after broadcast — does NOT wait for on-chain confirmation. Requires the token contract address, recipient, and amount in human-readable format.",
      parameters: {
        type: "object",
        properties: {
          privateKey: {
            type: "string",
            description: "Sender's private key (0x-prefixed hex)",
          },
          tokenAddress: {
            type: "string",
            description: "ERC20 token contract address (0x-prefixed)",
          },
          to: {
            type: "string",
            description: "Recipient address (0x-prefixed)",
          },
          amount: {
            type: "string",
            description:
              "Amount of tokens to send in human-readable format (e.g. '100.5')",
          },
          rpcUrl: {
            type: "string",
            description:
              "Optional custom RPC URL. Defaults to https://arb1.arbitrum.io/rpc",
          },
        },
        required: ["privateKey", "tokenAddress", "to", "amount"],
      },
      handler: transferTokenHandler,
    },
    {
      name: "get_transaction_receipt",
      description:
        "Get the receipt of a transaction by its hash. Returns status (success/reverted/pending), block number, gas used, and addresses. Use this to check if a previously sent transaction has been confirmed on-chain.",
      parameters: {
        type: "object",
        properties: {
          txHash: {
            type: "string",
            description:
              "Transaction hash to look up (0x-prefixed, 66 chars)",
          },
          rpcUrl: {
            type: "string",
            description:
              "Optional custom RPC URL. Defaults to https://arb1.arbitrum.io/rpc",
          },
        },
        required: ["txHash"],
      },
      handler: getTransactionReceiptHandler,
    },
    {
      name: "import_wallet",
      description:
        "Import an existing Arbitrum wallet from a private key or mnemonic phrase. Returns the wallet address and private key. Provide exactly one of privateKey or mnemonic.",
      parameters: {
        type: "object",
        properties: {
          privateKey: {
            type: "string",
            description:
              "Private key to import (0x-prefixed hex). Provide this OR mnemonic, not both.",
          },
          mnemonic: {
            type: "string",
            description:
              "Mnemonic phrase to import (12 or 24 words). Provide this OR privateKey, not both.",
          },
        },
        required: [] as string[],
      },
      handler: importWalletHandler,
    },
    {
      name: "approve_token",
      description:
        "Approve a spender to transfer ERC20 tokens on your behalf. Required before interacting with DeFi protocols (DEX swaps, lending deposits, etc.). Use amount 'unlimited' for max approval. Returns txHash immediately (fire-and-forget).",
      parameters: {
        type: "object",
        properties: {
          privateKey: {
            type: "string",
            description: "Token owner's private key (0x-prefixed hex)",
          },
          tokenAddress: {
            type: "string",
            description: "ERC20 token contract address (0x-prefixed)",
          },
          spender: {
            type: "string",
            description:
              "Address to approve as spender (e.g. DEX router, lending pool)",
          },
          amount: {
            type: "string",
            description:
              "Approval amount in human-readable format (e.g. '1000') or 'unlimited' for max uint256",
          },
          rpcUrl: {
            type: "string",
            description:
              "Optional custom RPC URL. Defaults to https://arb1.arbitrum.io/rpc",
          },
        },
        required: ["privateKey", "tokenAddress", "spender", "amount"],
      },
      handler: approveTokenHandler,
    },
    {
      name: "get_allowance",
      description:
        "Query the current ERC20 token allowance for a spender. Returns how many tokens the spender is approved to transfer on behalf of the owner. Use this to check if an approve_token call is needed before a DeFi interaction.",
      parameters: {
        type: "object",
        properties: {
          tokenAddress: {
            type: "string",
            description: "ERC20 token contract address (0x-prefixed)",
          },
          owner: {
            type: "string",
            description: "Token owner address (0x-prefixed)",
          },
          spender: {
            type: "string",
            description: "Spender address to check allowance for (0x-prefixed)",
          },
          rpcUrl: {
            type: "string",
            description:
              "Optional custom RPC URL. Defaults to https://arb1.arbitrum.io/rpc",
          },
        },
        required: ["tokenAddress", "owner", "spender"],
      },
      handler: getAllowanceHandler,
    },
    {
      name: "estimate_gas",
      description:
        "Estimate the gas cost for a transaction before sending it. Returns gas units, gas price in Gwei, and estimated total cost in ETH. Useful for checking if a transaction will succeed and how much it will cost.",
      parameters: {
        type: "object",
        properties: {
          from: {
            type: "string",
            description: "Sender address (0x-prefixed)",
          },
          to: {
            type: "string",
            description: "Recipient or contract address (0x-prefixed)",
          },
          value: {
            type: "string",
            description:
              "Optional ETH value in human-readable format (e.g. '0.1')",
          },
          data: {
            type: "string",
            description: "Optional contract call data (hex-encoded)",
          },
          rpcUrl: {
            type: "string",
            description:
              "Optional custom RPC URL. Defaults to https://arb1.arbitrum.io/rpc",
          },
        },
        required: ["from", "to"],
      },
      handler: estimateGasHandler,
    },
    {
      name: "get_token_info",
      description:
        "Get basic information about an ERC20 token: name, symbol, decimals, and total supply. Useful for discovering token details before interacting with it.",
      parameters: {
        type: "object",
        properties: {
          tokenAddress: {
            type: "string",
            description: "ERC20 token contract address (0x-prefixed)",
          },
          rpcUrl: {
            type: "string",
            description:
              "Optional custom RPC URL. Defaults to https://arb1.arbitrum.io/rpc",
          },
        },
        required: ["tokenAddress"],
      },
      handler: getTokenInfoHandler,
    },
    {
      name: "verify_signature",
      description:
        "Verify an EIP-191 personal signature and recover the signer's address. Use this to confirm who signed a message. Returns the recovered address if the signature is valid.",
      parameters: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description: "The original message that was signed",
          },
          signature: {
            type: "string",
            description: "The EIP-191 signature to verify (hex string)",
          },
        },
        required: ["message", "signature"],
      },
      handler: verifySignatureHandler,
    },
  ],
};

export default manifest;
