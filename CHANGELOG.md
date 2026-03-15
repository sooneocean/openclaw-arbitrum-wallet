# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.8.0] - 2026-03-15

### Changed
- Rewrote README with complete documentation for all 30 tools
- Updated package.json with keywords, repository, homepage, and author metadata
- Updated description to reflect multi-chain and 30-tool scope

### Added
- This CHANGELOG file

## [1.7.0] - 2026-03-15

### Added
- `encode_tx` — ABI-encode function calls (inverse of decode_tx)
- `get_block` — query block info (number, hash, timestamp, gas, tx count)
- `get_portfolio` — batch ETH + ERC20 balances for an address
- `get_supported_chains` — list all supported blockchain networks
- `add_liquidity` — mint Uniswap V3 LP position with tick range
- `remove_liquidity` — full remove + collect for a position NFT
- `simulate_transaction` — dry-run via eth_call before sending
- `get_nft_metadata` — query ERC721 owner, tokenURI, name, symbol
- `transfer_nft` — ERC721 safeTransferFrom (fire-and-forget)
- Multi-chain registry: Arbitrum One, Ethereum, Base, Optimism
- `getProvider()` now accepts `chainId` for auto RPC resolution
- GitHub Actions CI (Node 18/20/22) and npm publish workflow

### Fixed
- 5 handlers unconditionally returned `NetworkError` — now properly classify non-network errors
- Added 8 unit tests for `isNetworkError()` (previously zero coverage)

## [1.6.0] - 2026-03-15

### Added
- `simulate_transaction` — dry-run transactions via eth_call
- `get_nft_metadata` — ERC721 metadata queries
- `transfer_nft` — ERC721 safeTransferFrom
- GitHub Actions CI/CD workflows

## [1.5.0] - 2026-03-15

### Added
- `wrap_eth` / `unwrap_eth` — WETH conversion
- `multicall_read` — batch read-only contract calls via Multicall3
- `get_pool_info` — Uniswap V3 pool state query
- `decode_tx` — decode ABI-encoded calldata
- `sign_typed_data` — EIP-712 structured signing

## [1.4.0] - 2026-03-15

### Added
- `swap_token` — Uniswap V3 exactInputSingle (ETH↔Token, Token↔Token)
- `get_token_price` — real-time price from Uniswap V3 pool slot0
- `watch_transaction` — wait for tx confirmation with timeout

### Fixed
- `provider.ts` DRY violation: `defaultIsRetryable` replaced with `isNetworkError`

## [1.3.0] - 2026-03-14

### Added
- `estimate_gas` — transaction gas cost estimation
- `get_token_info` — ERC20 metadata queries
- `verify_signature` — EIP-191 signature verification

### Changed
- Centralized `isNetworkError` in errors.ts
- Cross-validated all handlers for consistent error classification

## [1.2.0] - 2026-03-14

### Added
- `import_wallet` — import from private key or mnemonic
- `approve_token` — ERC20 spender approval
- `get_allowance` — ERC20 allowance query

## [1.1.0] - 2026-03-14

### Added
- `transfer_token` — ERC20 token transfers
- `get_transaction_receipt` — transaction status check

## [1.0.0] - 2026-03-14

### Added
- Initial release with 4 core tools
- `create_wallet` — generate new Arbitrum wallet
- `get_balance` — query ETH/ERC20 balance
- `send_transaction` — send ETH (fire-and-forget)
- `sign_message` — EIP-191 personal sign
- TypeScript + ethers v6 + Jest test suite
- CJS + ESM dual format output
