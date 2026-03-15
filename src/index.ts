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
import { swapTokenHandler } from "./tools/swapToken.js";
import { getTokenPriceHandler } from "./tools/getTokenPrice.js";
import { watchTransactionHandler } from "./tools/watchTransaction.js";
import { wrapEthHandler, unwrapEthHandler } from "./tools/wrapEth.js";
import { multicallReadHandler } from "./tools/multicallRead.js";
import { getPoolInfoHandler } from "./tools/getPoolInfo.js";
import { decodeTxHandler } from "./tools/decodeTx.js";
import { signTypedDataHandler } from "./tools/signTypedData.js";
import { simulateTransactionHandler } from "./tools/simulateTransaction.js";
import { getNftMetadataHandler } from "./tools/getNftMetadata.js";
import { transferNftHandler } from "./tools/transferNft.js";

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
export { swapTokenHandler } from "./tools/swapToken.js";
export { getTokenPriceHandler } from "./tools/getTokenPrice.js";
export { watchTransactionHandler } from "./tools/watchTransaction.js";
export { wrapEthHandler, unwrapEthHandler } from "./tools/wrapEth.js";
export { multicallReadHandler } from "./tools/multicallRead.js";
export { getPoolInfoHandler } from "./tools/getPoolInfo.js";
export { decodeTxHandler } from "./tools/decodeTx.js";
export { signTypedDataHandler } from "./tools/signTypedData.js";
export { simulateTransactionHandler } from "./tools/simulateTransaction.js";
export { getNftMetadataHandler } from "./tools/getNftMetadata.js";
export { transferNftHandler } from "./tools/transferNft.js";

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
  version: "1.6.0",
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
    {
      name: "swap_token",
      description:
        "Swap tokens on Uniswap V3 (Arbitrum One). Supports ETH→Token, Token→ETH, and Token→Token swaps using exactInputSingle. Automatically quotes via QuoterV2 and applies slippage protection. For Token→Token or Token→ETH, the caller must approve the SwapRouter02 (0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45) first using approve_token. Returns txHash immediately (fire-and-forget).",
      parameters: {
        type: "object",
        properties: {
          privateKey: {
            type: "string",
            description: "Sender's private key (0x-prefixed hex)",
          },
          tokenIn: {
            type: "string",
            description:
              "Token to swap from: ERC20 contract address (0x-prefixed) or 'ETH' for native ETH",
          },
          tokenOut: {
            type: "string",
            description:
              "Token to swap to: ERC20 contract address (0x-prefixed) or 'ETH' for native ETH",
          },
          amountIn: {
            type: "string",
            description:
              "Amount of tokenIn in human-readable format (e.g. '0.1')",
          },
          fee: {
            type: "number",
            description:
              "Uniswap V3 pool fee tier: 100 (0.01%), 500 (0.05%), 3000 (0.3%), or 10000 (1%). Default: 3000",
          },
          slippageBps: {
            type: "number",
            description:
              "Slippage tolerance in basis points (e.g. 50 = 0.5%). Default: 50",
          },
          deadline: {
            type: "number",
            description:
              "Transaction deadline as unix timestamp. Default: now + 30 minutes",
          },
          rpcUrl: {
            type: "string",
            description:
              "Optional custom RPC URL. Defaults to https://arb1.arbitrum.io/rpc",
          },
        },
        required: ["privateKey", "tokenIn", "tokenOut", "amountIn"],
      },
      handler: swapTokenHandler,
    },
    {
      name: "get_token_price",
      description:
        "Get the current price of a token pair from Uniswap V3 on Arbitrum One. Reads the pool's slot0 sqrtPriceX96 and calculates the human-readable price. View-only call, no gas cost. Use this before swap_token to know current market prices.",
      parameters: {
        type: "object",
        properties: {
          tokenA: {
            type: "string",
            description:
              "Base token ERC20 address (0x-prefixed). Price will be expressed as: 1 tokenA = X tokenB",
          },
          tokenB: {
            type: "string",
            description: "Quote token ERC20 address (0x-prefixed)",
          },
          fee: {
            type: "number",
            description:
              "Uniswap V3 pool fee tier: 100 (0.01%), 500 (0.05%), 3000 (0.3%), or 10000 (1%). Default: 3000",
          },
          rpcUrl: {
            type: "string",
            description:
              "Optional custom RPC URL. Defaults to https://arb1.arbitrum.io/rpc",
          },
        },
        required: ["tokenA", "tokenB"],
      },
      handler: getTokenPriceHandler,
    },
    {
      name: "watch_transaction",
      description:
        "Wait for a transaction to be confirmed on-chain and return the full receipt. Unlike other tools, this is NOT fire-and-forget — it blocks until the transaction is mined with the requested number of confirmations or the timeout is reached. Use this after send_transaction, swap_token, or any state-changing operation to verify the outcome.",
      parameters: {
        type: "object",
        properties: {
          txHash: {
            type: "string",
            description:
              "Transaction hash to watch (0x-prefixed, 66 chars)",
          },
          confirmations: {
            type: "number",
            description:
              "Number of block confirmations to wait for. Default: 1",
          },
          timeoutMs: {
            type: "number",
            description:
              "Timeout in milliseconds. Default: 120000 (2 minutes)",
          },
          rpcUrl: {
            type: "string",
            description:
              "Optional custom RPC URL. Defaults to https://arb1.arbitrum.io/rpc",
          },
        },
        required: ["txHash"],
      },
      handler: watchTransactionHandler,
    },
    {
      name: "wrap_eth",
      description:
        "Wrap native ETH into WETH (Wrapped ETH) on Arbitrum One. Many DeFi protocols require WETH instead of native ETH. Returns txHash immediately (fire-and-forget).",
      parameters: {
        type: "object",
        properties: {
          privateKey: {
            type: "string",
            description: "Private key (0x-prefixed hex)",
          },
          amount: {
            type: "string",
            description: "Amount of ETH to wrap (e.g. '0.1')",
          },
          rpcUrl: {
            type: "string",
            description: "Optional custom RPC URL",
          },
        },
        required: ["privateKey", "amount"],
      },
      handler: wrapEthHandler,
    },
    {
      name: "unwrap_eth",
      description:
        "Unwrap WETH back to native ETH on Arbitrum One. Returns txHash immediately (fire-and-forget).",
      parameters: {
        type: "object",
        properties: {
          privateKey: {
            type: "string",
            description: "Private key (0x-prefixed hex)",
          },
          amount: {
            type: "string",
            description: "Amount of WETH to unwrap (e.g. '0.1')",
          },
          rpcUrl: {
            type: "string",
            description: "Optional custom RPC URL",
          },
        },
        required: ["privateKey", "amount"],
      },
      handler: unwrapEthHandler,
    },
    {
      name: "multicall_read",
      description:
        "Batch multiple read-only contract calls into a single RPC request using Multicall3. Returns all results atomically at the same block. Useful for fetching multiple balances, prices, or states efficiently.",
      parameters: {
        type: "object",
        properties: {
          calls: {
            type: "array",
            description:
              "Array of call descriptors, each with target (contract address) and callData (ABI-encoded hex)",
            items: {
              type: "object",
              properties: {
                target: {
                  type: "string",
                  description: "Contract address (0x-prefixed)",
                },
                callData: {
                  type: "string",
                  description: "ABI-encoded function call data (hex)",
                },
              },
              required: ["target", "callData"],
            },
          },
          rpcUrl: {
            type: "string",
            description: "Optional custom RPC URL",
          },
        },
        required: ["calls"],
      },
      handler: multicallReadHandler,
    },
    {
      name: "get_pool_info",
      description:
        "Query Uniswap V3 pool state on Arbitrum One. Returns pool address, token ordering, current price (sqrtPriceX96), tick, liquidity, and lock status. Use this to evaluate pool depth before swapping.",
      parameters: {
        type: "object",
        properties: {
          tokenA: {
            type: "string",
            description: "First token ERC20 address (0x-prefixed)",
          },
          tokenB: {
            type: "string",
            description: "Second token ERC20 address (0x-prefixed)",
          },
          fee: {
            type: "number",
            description:
              "Uniswap V3 pool fee tier: 100, 500, 3000, or 10000. Default: 3000",
          },
          rpcUrl: {
            type: "string",
            description: "Optional custom RPC URL",
          },
        },
        required: ["tokenA", "tokenB"],
      },
      handler: getPoolInfoHandler,
    },
    {
      name: "decode_tx",
      description:
        "Decode ABI-encoded transaction calldata into human-readable function name and arguments. Provide the ABI of the target contract to decode. Useful for understanding what a transaction does before or after execution.",
      parameters: {
        type: "object",
        properties: {
          data: {
            type: "string",
            description: "ABI-encoded calldata to decode (0x-prefixed hex)",
          },
          abi: {
            type: "array",
            description:
              'Human-readable ABI array (e.g. ["function transfer(address to, uint256 amount)"])',
            items: { type: "string" },
          },
        },
        required: ["data", "abi"],
      },
      handler: decodeTxHandler,
    },
    {
      name: "sign_typed_data",
      description:
        "Sign structured data using EIP-712 (typed data signing). Required for gasless approvals (Permit2), meta-transactions, and protocol-specific signatures. Returns the signature and signer address.",
      parameters: {
        type: "object",
        properties: {
          privateKey: {
            type: "string",
            description: "Private key (0x-prefixed hex)",
          },
          domain: {
            type: "object",
            description:
              "EIP-712 domain with optional fields: name, version, chainId, verifyingContract",
          },
          types: {
            type: "object",
            description:
              "EIP-712 types object (excluding EIP712Domain). Maps type name to array of {name, type} fields.",
          },
          value: {
            type: "object",
            description: "The structured data to sign",
          },
        },
        required: ["privateKey", "domain", "types", "value"],
      },
      handler: signTypedDataHandler,
    },
    {
      name: "simulate_transaction",
      description:
        "Simulate a transaction using eth_call without broadcasting it. Returns whether it would succeed or revert, the return data, estimated gas, and decoded revert reason. Use this before sending real transactions to verify they will succeed.",
      parameters: {
        type: "object",
        properties: {
          from: { type: "string", description: "Sender address (0x-prefixed)" },
          to: { type: "string", description: "Target address (0x-prefixed)" },
          value: { type: "string", description: "Optional ETH value (e.g. '0.1')" },
          data: { type: "string", description: "Optional contract calldata (hex)" },
          rpcUrl: { type: "string", description: "Optional custom RPC URL" },
        },
        required: ["from", "to"],
      },
      handler: simulateTransactionHandler,
    },
    {
      name: "get_nft_metadata",
      description:
        "Get metadata for an ERC721 NFT: owner, tokenURI, collection name, and symbol. Use this to inspect NFTs before transferring or to verify ownership.",
      parameters: {
        type: "object",
        properties: {
          contractAddress: { type: "string", description: "ERC721 contract address (0x-prefixed)" },
          tokenId: { type: "string", description: "Token ID (numeric string)" },
          rpcUrl: { type: "string", description: "Optional custom RPC URL" },
        },
        required: ["contractAddress", "tokenId"],
      },
      handler: getNftMetadataHandler,
    },
    {
      name: "transfer_nft",
      description:
        "Transfer an ERC721 NFT to another address using safeTransferFrom. Returns txHash immediately (fire-and-forget). The sender must own the NFT.",
      parameters: {
        type: "object",
        properties: {
          privateKey: { type: "string", description: "Sender's private key (0x-prefixed hex)" },
          contractAddress: { type: "string", description: "ERC721 contract address (0x-prefixed)" },
          tokenId: { type: "string", description: "Token ID to transfer (numeric string)" },
          to: { type: "string", description: "Recipient address (0x-prefixed)" },
          rpcUrl: { type: "string", description: "Optional custom RPC URL" },
        },
        required: ["privateKey", "contractAddress", "tokenId", "to"],
      },
      handler: transferNftHandler,
    },
  ],
};

export default manifest;
