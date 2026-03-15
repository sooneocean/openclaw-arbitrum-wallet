# openclaw-arbitrum-wallet

Multi-chain DeFi wallet skill for [openclaw](https://github.com/sooneocean/openclaw-arbitrum-wallet) agents. **30 tools** covering wallets, tokens, swaps, NFTs, liquidity, and more.

Supports **Arbitrum One**, **Ethereum**, **Base**, and **Optimism**.

## Install

```bash
npm install openclaw-arbitrum-wallet
```

## Usage

```typescript
// CommonJS
const skill = require("openclaw-arbitrum-wallet").default;

// ESM
import skill from "openclaw-arbitrum-wallet";

// Register with openclaw agent runtime
agent.registerSkill(skill);
```

Every handler returns `{ success, data?, error? }` — never throws.

---

## Tools (30)

### Wallet Management

| Tool | Description | Since |
|------|-------------|-------|
| `create_wallet` | Generate new wallet (address + privateKey + mnemonic) | v1.0 |
| `import_wallet` | Import from private key or mnemonic phrase | v1.2 |

### Balance & Token Queries

| Tool | Description | Since |
|------|-------------|-------|
| `get_balance` | Query ETH or ERC20 balance for an address | v1.0 |
| `get_token_info` | Get ERC20 name, symbol, decimals, totalSupply | v1.3 |
| `get_allowance` | Check ERC20 spender allowance | v1.2 |
| `get_portfolio` | Batch query ETH + multiple ERC20 balances | v1.7 |
| `get_token_price` | Real-time price from Uniswap V3 pool slot0 | v1.4 |

### Transactions

| Tool | Description | Since |
|------|-------------|-------|
| `send_transaction` | Send ETH (fire-and-forget) | v1.0 |
| `transfer_token` | Transfer ERC20 tokens (fire-and-forget) | v1.1 |
| `approve_token` | Approve ERC20 spender (fire-and-forget) | v1.2 |
| `estimate_gas` | Estimate gas cost before sending | v1.3 |
| `simulate_transaction` | Dry-run via eth_call — check success/revert before sending | v1.6 |
| `watch_transaction` | Wait for tx confirmation, return full receipt | v1.4 |
| `get_transaction_receipt` | Check tx status (success/reverted/pending) | v1.1 |

### Uniswap V3 / DeFi

| Tool | Description | Since |
|------|-------------|-------|
| `swap_token` | Swap tokens via SwapRouter02 (ETH↔Token, Token↔Token) | v1.4 |
| `add_liquidity` | Mint new LP position with tick range | v1.7 |
| `remove_liquidity` | Remove all liquidity + collect tokens | v1.7 |
| `get_pool_info` | Query pool state (price, tick, liquidity) | v1.5 |
| `wrap_eth` | Wrap ETH → WETH | v1.5 |
| `unwrap_eth` | Unwrap WETH → ETH | v1.5 |

### NFT (ERC721)

| Tool | Description | Since |
|------|-------------|-------|
| `get_nft_metadata` | Query NFT owner, tokenURI, name, symbol | v1.6 |
| `transfer_nft` | Transfer NFT via safeTransferFrom (fire-and-forget) | v1.6 |

### Signing & Verification

| Tool | Description | Since |
|------|-------------|-------|
| `sign_message` | EIP-191 personal sign | v1.0 |
| `verify_signature` | Recover signer address from EIP-191 signature | v1.3 |
| `sign_typed_data` | EIP-712 structured data signing | v1.5 |

### Low-Level & Utilities

| Tool | Description | Since |
|------|-------------|-------|
| `encode_tx` | ABI-encode function call → calldata | v1.7 |
| `decode_tx` | Decode calldata → function name + args | v1.5 |
| `multicall_read` | Batch read-only calls via Multicall3 | v1.5 |
| `get_block` | Query block info (number, hash, timestamp, gas) | v1.7 |
| `get_supported_chains` | List all supported networks | v1.7 |

---

## Multi-Chain Support

All tools default to **Arbitrum One**. Pass `rpcUrl` to use other chains:

```typescript
// Ethereum mainnet
await handler({ address: "0x...", rpcUrl: "https://eth.llamarpc.com" });

// Base
await handler({ address: "0x...", rpcUrl: "https://mainnet.base.org" });

// Optimism
await handler({ address: "0x...", rpcUrl: "https://mainnet.optimism.io" });
```

Use `get_supported_chains` to list all networks with their RPC URLs and Uniswap V3 availability.

| Chain | Chain ID | Uniswap V3 |
|-------|----------|------------|
| Arbitrum One | 42161 | Yes |
| Ethereum | 1 | Yes |
| Base | 8453 | Yes |
| Optimism | 10 | Yes |

---

## Error Handling

All errors return `{ success: false, error: "<ErrorType>: <detail>" }`.

| Error Type | Trigger |
|------------|---------|
| `ValidationError` | Invalid address, amount, txHash format, etc. |
| `InvalidKeyError` | Malformed private key |
| `InsufficientFundsError` | Not enough ETH/tokens |
| `NetworkError` | RPC timeout or connection failure (retried automatically) |
| `SwapError` | Uniswap swap failure (slippage, pool not found) |
| `NftError` | NFT operation failure (not owner, token doesn't exist) |
| `LiquidityError` | Liquidity operation failure |
| `WatchError` | Transaction confirmation timeout |

---

## Security

> **Private keys** are accepted as plain string parameters. They exist only in handler memory during execution and are never logged, cached, or stored.

- Ensure your agent runtime does **not** log tool call inputs
- Use secure environment variables or vaults for private keys
- This skill is fully stateless

---

## Production Usage

Default RPCs are public endpoints with no SLA. For production:

```typescript
await handler({
  address: "0x...",
  rpcUrl: "https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY"
});
```

Providers: [Alchemy](https://alchemy.com), [Infura](https://infura.io), [QuickNode](https://quicknode.com)

---

## Publishing

### GitHub Actions (recommended)

Create a GitHub release → CI automatically runs tests, builds, and publishes to npm with provenance.

Requires `NPM_TOKEN` secret in GitHub repo settings.

### Manual

```bash
npm login
npm publish  # runs build + test automatically via prepublishOnly
```

---

## License

MIT
