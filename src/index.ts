import { createWalletHandler } from "./tools/createWallet.js";
import { getBalanceHandler } from "./tools/getBalance.js";
import { sendTransactionHandler } from "./tools/sendTransaction.js";
import { signMessageHandler } from "./tools/signMessage.js";

// Re-export individual handlers for direct import/testing
export { createWalletHandler } from "./tools/createWallet.js";
export { getBalanceHandler } from "./tools/getBalance.js";
export { sendTransactionHandler } from "./tools/sendTransaction.js";
export { signMessageHandler } from "./tools/signMessage.js";

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
  ],
};

export default manifest;
