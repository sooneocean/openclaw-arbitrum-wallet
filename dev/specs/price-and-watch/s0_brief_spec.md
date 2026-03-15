# S0 Brief Spec — price-and-watch

**版本**: 1.0.0
**日期**: 2026-03-15
**work_type**: new_feature
**spec_mode**: Quick

---

## §1 一句話描述

新增 `get_token_price` 和 `watch_transaction` 兩個 tool，補齊 agent 自主交易的兩個關鍵缺口：幣價查詢與交易確認。

---

## §2 背景與痛點

- agent 做交易決策需要幣價，目前沒有任何方式查詢
- 所有交易（send_transaction, swap_token 等）都是 fire-and-forget，agent 不知道交易最終結果
- get_transaction_receipt 只能查已確認的 tx，對 pending tx 需要手動輪詢

---

## §3 目標與成功標準

**成功標準**：
- [ ] `get_token_price` 從 Uniswap V3 pool 的 slot0 讀取即時價格
- [ ] `get_token_price` 回傳 human-readable 的價格（tokenA per tokenB）
- [ ] `watch_transaction` 等待 tx 鏈上確認，回傳完整 receipt
- [ ] `watch_transaction` 支援 timeout（預設 120s）和 confirmations（預設 1）
- [ ] Jest 測試覆蓋 happy path + 錯誤路徑
- [ ] npm test 全過

---

## §4 功能區拆解

| FA ID | 名稱 | 一句話描述 | 獨立性 |
|-------|------|-----------|--------|
| FA-1 | get_token_price | 從 Uniswap V3 pool slot0 讀取即時價格 | 高 |
| FA-2 | watch_transaction | 等待 tx 確認，回傳 receipt | 高 |

**拆解策略**: `single_sop_fa_labeled`

---

## §4.1 FA-1: get_token_price

### 參數

```typescript
interface GetTokenPriceParams {
  tokenA: string;          // ERC20 address (base token)
  tokenB: string;          // ERC20 address (quote token)
  fee?: number;            // pool fee tier, default 3000
  rpcUrl?: string;
}
```

### 回傳

```typescript
interface GetTokenPriceData {
  tokenA: string;
  tokenB: string;
  price: string;           // human-readable: "1 tokenA = X tokenB"
  priceRaw: string;        // high precision price string
  fee: number;
  poolAddress: string;     // computed pool address
}
```

### 技術方案

1. 用 Uniswap V3 Factory `getPool(tokenA, tokenB, fee)` 取得 pool address
2. 讀 pool 的 `slot0()` 取得 `sqrtPriceX96`
3. 計算 price = (sqrtPriceX96 / 2^96)^2，再依 token decimals 調整
4. 純 view call，不消耗 gas

### Uniswap V3 合約

| 合約 | 地址（Arbitrum One） |
|------|---------------------|
| Factory | `0x1F98431c8aD98523631AE4a59f267346ea31F984` |
| Pool ABI | `slot0()` → `(uint160 sqrtPriceX96, int24 tick, ...)` |

### 例外情境

| 情境 | 處理 |
|------|------|
| pool 不存在（getPool 返回 0x0） | SwapError: Pool not found |
| token address 無效 | ValidationError |
| tokenA == tokenB | ValidationError |
| RPC 失敗 | NetworkError（withRetry） |

---

## §4.2 FA-2: watch_transaction

### 參數

```typescript
interface WatchTransactionParams {
  txHash: string;
  confirmations?: number;  // default: 1
  timeoutMs?: number;      // default: 120000 (2 min)
  rpcUrl?: string;
}
```

### 回傳

```typescript
interface WatchTransactionData {
  txHash: string;
  status: "success" | "reverted";
  blockNumber: number;
  gasUsed: string;
  effectiveGasPrice: string;
  from: string;
  to: string;
  confirmations: number;
}
```

### 技術方案

1. `provider.waitForTransaction(txHash, confirmations, timeoutMs)`
2. ethers v6 會自動輪詢直到 tx 被挖出並達到指定 confirmations
3. 若 timeout 到了還沒確認，返回 `WatchError: Transaction not confirmed within timeout`
4. receipt.status === 0 表示 reverted

### 例外情境

| 情境 | 處理 |
|------|------|
| txHash 格式錯誤 | ValidationError |
| timeout | WatchError: not confirmed within timeout |
| tx reverted | 正常回傳 status: "reverted" |
| RPC 失敗 | NetworkError |

---

## §5 範圍

**In Scope**: get_token_price handler, watch_transaction handler, 型別, 測試, manifest 註冊

**Out of Scope**: 歷史價格, K線, 多 pool 最優價格, WebSocket 事件監聽, pending tx 的 mempool 監控

---

## §6 約束

- 不新增 runtime dependencies
- 遵循現有 handler 模式
- get_token_price 是 view only
- watch_transaction **不是** fire-and-forget（例外，因為等待確認是它的核心功能）
