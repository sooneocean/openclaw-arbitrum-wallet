# openclaw-arbitrum-wallet

Arbitrum wallet management skill for [openclaw](https://github.com/sooneocean/openclaw-arbitrum-wallet) agents.

Provides nine tools for Arbitrum One: create/import wallets, query balances, send ETH, transfer ERC20 tokens, check transaction receipts, and sign messages.

## Install

```bash
npm install openclaw-arbitrum-wallet
```

## Usage

```typescript
const skill = require("openclaw-arbitrum-wallet").default;

// Register with openclaw agent runtime
agent.registerSkill(skill);
```

Each tool handler returns `{ success, data?, error? }` — never throws.

---

## Tools

### `create_wallet`

Create a new Arbitrum wallet (address + private key + mnemonic).

```typescript
const result = await skill.tools[0].handler({});
if (result.success) {
  const { address, privateKey, mnemonic } = result.data;
  // ⚠️ Store privateKey securely — it will NOT be stored by this skill
}
```

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `address` | `string` | 0x-prefixed 42-char Ethereum address |
| `privateKey` | `string` | 0x-prefixed 66-char hex private key |
| `mnemonic` | `string` | 12-word BIP39 mnemonic phrase |

---

### `get_balance`

Query ETH or ERC20 token balance for an address.

```typescript
// ETH balance
const eth = await skill.tools[1].handler({
  address: "0xYourAddress",
});

// ERC20 balance (e.g. USDC on Arbitrum)
const usdc = await skill.tools[1].handler({
  address: "0xYourAddress",
  tokenAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
});
```

**Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `address` | ✅ | Arbitrum address to query |
| `tokenAddress` | ❌ | ERC20 contract address. Omit for native ETH |
| `rpcUrl` | ❌ | Custom RPC URL (see Production Usage below) |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `balance` | `string` | Human-readable balance (e.g. `"1.5"`) |
| `symbol` | `string` | `"ETH"` or token symbol |
| `decimals` | `number` | 18 for ETH, or token decimals |
| `raw` | `string` | Raw wei/smallest-unit value |

---

### `send_transaction`

Send ETH from a private key-controlled account.

> ⚠️ **Fire-and-forget**: returns `txHash` immediately after broadcast. Does **not** wait for on-chain confirmation. The transaction may still revert. Check the receipt separately if you need confirmation.

```typescript
const result = await skill.tools[2].handler({
  privateKey: "0xYourPrivateKey",
  to: "0xRecipientAddress",
  amount: "0.01", // ETH, human-readable
});
if (result.success) {
  console.log("txHash:", result.data.txHash);
}
```

**Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `privateKey` | ✅ | Sender's private key (0x-prefixed hex) |
| `to` | ✅ | Recipient address (0x-prefixed) |
| `amount` | ✅ | ETH amount in human-readable format (e.g. `"0.1"`) |
| `rpcUrl` | ❌ | Custom RPC URL |

---

### `sign_message`

Sign a message using EIP-191 personal sign.

```typescript
const result = await skill.tools[3].handler({
  privateKey: "0xYourPrivateKey",
  message: "I agree to the terms",
});
if (result.success) {
  const { signature, address } = result.data;
  // Verify: ethers.verifyMessage("I agree to the terms", signature) === address
}
```

**Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `privateKey` | ✅ | Private key (0x-prefixed hex) |
| `message` | ✅ | Message text to sign |

---

### `transfer_token`

Transfer ERC20 tokens from a private key-controlled account.

> ⚠️ **Fire-and-forget**: returns `txHash` immediately after broadcast. Does **not** wait for on-chain confirmation.

```typescript
const result = await skill.tools[4].handler({
  privateKey: "0xYourPrivateKey",
  tokenAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // USDC
  to: "0xRecipientAddress",
  amount: "100", // token amount, human-readable
});
```

**Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `privateKey` | ✅ | Sender's private key (0x-prefixed hex) |
| `tokenAddress` | ✅ | ERC20 token contract address |
| `to` | ✅ | Recipient address (0x-prefixed) |
| `amount` | ✅ | Token amount in human-readable format (e.g. `"100.5"`) |
| `rpcUrl` | ❌ | Custom RPC URL |

---

### `get_transaction_receipt`

Check the on-chain status of a previously sent transaction.

```typescript
const result = await skill.tools[5].handler({
  txHash: "0xYourTxHash...",
});
if (result.success) {
  // result.data.status: "success" | "reverted" | "pending"
  console.log(result.data.status, result.data.blockNumber);
}
```

**Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `txHash` | ✅ | Transaction hash (0x-prefixed, 66 chars) |
| `rpcUrl` | ❌ | Custom RPC URL |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `status` | `string` | `"success"`, `"reverted"`, or `"pending"` |
| `blockNumber` | `number \| null` | Block number (null if pending) |
| `gasUsed` | `string \| null` | Gas used (null if pending) |
| `from` | `string \| null` | Sender address |
| `to` | `string \| null` | Recipient address |

---

### `import_wallet`

Import an existing wallet from a private key or mnemonic phrase.

```typescript
// From private key
const result = await skill.tools[6].handler({
  privateKey: "0xYourExistingPrivateKey",
});

// From mnemonic
const result2 = await skill.tools[6].handler({
  mnemonic: "abandon abandon abandon ...",
});
```

**Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `privateKey` | ❌* | Private key (0x-prefixed hex) |
| `mnemonic` | ❌* | Mnemonic phrase (12 or 24 words) |

\* Provide exactly one of `privateKey` or `mnemonic`.

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `address` | `string` | 0x-prefixed wallet address |
| `privateKey` | `string` | 0x-prefixed private key |

---

### `approve_token`

Approve a spender to transfer ERC20 tokens on your behalf. Required before DeFi interactions (DEX swaps, lending deposits).

> ⚠️ **Fire-and-forget**: returns `txHash` immediately after broadcast.

```typescript
// Approve 1000 USDC for a DEX router
const result = await skill.tools[7].handler({
  privateKey: "0xYourPrivateKey",
  tokenAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // USDC
  spender: "0xDEXRouterAddress",
  amount: "1000", // or "unlimited" for max approval
});
```

**Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `privateKey` | ✅ | Token owner's private key (0x-prefixed hex) |
| `tokenAddress` | ✅ | ERC20 token contract address |
| `spender` | ✅ | Address to approve (e.g. DEX router) |
| `amount` | ✅ | Approval amount (human-readable) or `"unlimited"` |
| `rpcUrl` | ❌ | Custom RPC URL |

---

### `get_allowance`

Query the current ERC20 token allowance for a spender. Use before DeFi interactions to check if `approve_token` is needed.

```typescript
const result = await skill.tools[8].handler({
  tokenAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // USDC
  owner: "0xYourAddress",
  spender: "0xDEXRouterAddress",
});
if (result.success) {
  console.log(result.data.allowance, result.data.symbol); // e.g. "1000" "USDC"
}
```

**Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `tokenAddress` | ✅ | ERC20 token contract address |
| `owner` | ✅ | Token owner address |
| `spender` | ✅ | Spender address to check |
| `rpcUrl` | ❌ | Custom RPC URL |

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `allowance` | `string` | Human-readable allowance |
| `symbol` | `string` | Token symbol |
| `decimals` | `number` | Token decimals |
| `raw` | `string` | Raw allowance value |

---

## Error Handling

All errors return `{ success: false, error: "<ErrorType>: <detail>" }`.

| Error Type | Trigger |
|------------|---------|
| `ValidationError` | Invalid address, amount ≤ 0, invalid txHash format |
| `InvalidKeyError` | Malformed private key |
| `InsufficientFundsError` | Not enough ETH for value + gas |
| `NetworkError` | RPC timeout or connection failure |
| `InvalidContractError` | ERC20 address is not a valid contract |
| `TransactionError` | Other on-chain error |
| `UnexpectedError` | Internal or unclassified failure |

---

## Security

> ⚠️ **Critical**: `send_transaction`, `transfer_token`, `approve_token`, `sign_message`, and `import_wallet` accept `privateKey` as a plain string parameter. This means **the private key appears in the tool call's JSON input**, which may be logged by your agent runtime, conversation history, or middleware.

**Your responsibility as the caller:**
- Ensure your agent runtime does **not** log tool call inputs to persistent storage
- Never hardcode private keys — use secure environment variables or vaults
- This skill does NOT store, cache, or log private keys internally

**This skill's guarantees:**
- Private key only exists in handler memory scope during execution
- No `console.log` of any private key or sensitive data
- Fully stateless — no singleton, no cache, no side effects

---

## Production Usage

The default RPC (`https://arb1.arbitrum.io/rpc`) is a public endpoint with **no SLA** and may have rate limits. For production agents with high call volume, use a private RPC:

```typescript
// Using Alchemy
await handler({ address: "0x...", rpcUrl: "https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY" });

// Using Infura
await handler({ address: "0x...", rpcUrl: "https://arbitrum-mainnet.infura.io/v3/YOUR_KEY" });
```

Providers: [Alchemy](https://alchemy.com), [Infura](https://infura.io), [QuickNode](https://quicknode.com)

---

## Publishing

This package is published to npm under the `openclaw-arbitrum-wallet` name. If you are contributing and need to publish a new version, follow these steps:

### Manual publish

1. **Authenticate with npm:**

   ```bash
   npm login
   ```

   This opens a browser login flow. After completing it, your credentials are stored locally.

   For CI/CD or non-interactive environments, set the `NPM_TOKEN` environment variable in your shell or GitHub Secrets instead:

   ```bash
   export NPM_TOKEN=your_npm_token_here
   ```

   Then create or update `~/.npmrc`:

   ```
   //registry.npmjs.org/:_authToken=${NPM_TOKEN}
   ```

2. **Run tests manually (optional — prepublishOnly enforces this):**

   ```bash
   npm test
   ```

3. **Publish:**

   ```bash
   npm publish
   ```

   The `prepublishOnly` script will automatically run `npm run build && npm test` before publishing. The publish will abort if either step fails.

### CI/CD (GitHub Actions)

If you want to automate publishing on release, add a `.github/workflows/publish.yml` workflow and store your npm token as a GitHub Secret named `NPM_TOKEN`. The workflow can then run `npm publish` with the token injected via the `NODE_AUTH_TOKEN` environment variable.

---

## License

MIT
