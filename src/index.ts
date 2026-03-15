import { createWalletHandler } from "./tools/createWallet.js";
import { getBalanceHandler } from "./tools/getBalance.js";
import { sendTransactionHandler } from "./tools/sendTransaction.js";
import { signMessageHandler } from "./tools/signMessage.js";
import { transferTokenHandler } from "./tools/transferToken.js";
import { getTransactionReceiptHandler } from "./tools/getTransactionReceipt.js";
import { importWalletHandler } from "./tools/importWallet.js";

// Re-export individual handlers for direct import/testing
export { createWalletHandler } from "./tools/createWallet.js";
export { getBalanceHandler } from "./tools/getBalance.js";
export { sendTransactionHandler } from "./tools/sendTransaction.js";
export { signMessageHandler } from "./tools/signMessage.js";
export { transferTokenHandler } from "./tools/transferToken.js";
export { getTransactionReceiptHandler } from "./tools/getTransactionReceipt.js";
export { importWalletHandler } from "./tools/importWallet.js";

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
  version: "1.1.0",
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
  ],
};

export default manifest;
