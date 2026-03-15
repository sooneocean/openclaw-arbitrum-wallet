# S1 Dev Spec: swap-token

> **階段**: S1 技術分析
> **建立時間**: 2026-03-15
> **工作類型**: new_feature
> **複雜度**: M

---

## 1. 概述

### 1.1 需求參照
> 完整需求見 `s0_brief_spec.md`

新增 `swap_token` tool，透過 Uniswap V3 SwapRouter02 在 Arbitrum One 上執行 exactInputSingle swap，支援三種路徑：ETH→Token、Token→ETH、Token→Token。內部自動 QuoterV2 quote + slippageBps 滑點保護。

### 1.2 技術方案摘要

新增 `src/uniswap.ts`（常數 + ABI）和 `src/tools/swapToken.ts`（handler）。handler 接收 tokenIn/tokenOut（address 或 `'ETH'`）、amountIn、fee、slippageBps 等參數。內部先 call QuoterV2 取得預期輸出量，計算 amountOutMinimum，再透過 SwapRouter02.exactInputSingle 執行 swap。Token→ETH 路徑需要 multicall（exactInputSingle + unwrapWETH9）。遵循現有 handler 模式：`HandlerResult<T>`、`getProvider`、`withRetry`、不 throw。

---

## 2. 影響範圍

### 2.1 受影響檔案

| 檔案 | 變更類型 | FA | 說明 |
|------|---------|-----|------|
| `src/uniswap.ts` | 新增 | FA-2 | SwapRouter02/QuoterV2/WETH 地址 + 最小 ABI |
| `src/tools/swapToken.ts` | 新增 | FA-1 | swap_token handler |
| `src/types.ts` | 修改 | FA-1 | 新增 SwapTokenParams, SwapTokenData |
| `src/index.ts` | 修改 | FA-1 | 註冊 swap_token 到 manifest |
| `tests/swapToken.test.ts` | 新增 | FA-1 | 單元測試 |

### 2.2 不受影響

所有既有 handler、errors.ts、provider.ts、其他測試檔案。

### 2.3 依賴

- **upstream**: ethers v6（Contract, Wallet, parseEther, parseUnits, formatUnits, isAddress）、Uniswap V3 SwapRouter02 + QuoterV2 合約
- **internal**: `getProvider`, `withRetry`, `classifyKeyError`, `isNetworkError`, `HandlerResult`, `ERC20_ABI`
- **downstream**: openclaw agent runtime

---

## 3. 技術設計

### 3.1 Uniswap 常數（src/uniswap.ts）

```typescript
// Arbitrum One 合約地址
export const SWAP_ROUTER_ADDRESS = "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45";
export const QUOTER_V2_ADDRESS = "0x61fFE014bA17989E743c5F6cB21bF9697530B21e";
export const WETH_ADDRESS = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";

// 最小 ABI — 只定義用到的函式
export const SWAP_ROUTER_ABI = [
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) payable returns (uint256 amountOut)",
  "function multicall(bytes[] calldata data) payable returns (bytes[] memory results)",
  "function unwrapWETH9(uint256 amountMinimum, address recipient) payable",
];

export const QUOTER_V2_ABI = [
  "function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96) params) returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)",
];

export const VALID_FEE_TIERS = [100, 500, 3000, 10000] as const;
```

### 3.2 Swap 路徑判斷

```
tokenIn === 'ETH' → ETH→Token（msg.value = amountIn, tokenIn 改為 WETH）
tokenOut === 'ETH' → Token→ETH（multicall: exactInputSingle + unwrapWETH9）
else → Token→Token（標準 exactInputSingle）
```

### 3.3 Token→ETH multicall 細節

SwapRouter02 的 Token→ETH 流程：
1. `exactInputSingle` 把 tokenIn swap 成 WETH（recipient = router 自己 = address(2)）
2. `unwrapWETH9(amountOutMinimum, recipient)` 把 WETH 解包成 ETH 送給 recipient
3. 兩步合成一個 `multicall` 呼叫

```typescript
const swapData = routerInterface.encodeFunctionData("exactInputSingle", [{
  tokenIn, tokenOut: WETH_ADDRESS, fee, recipient: "0x0000000000000000000000000000000000000002",
  amountIn, amountOutMinimum, sqrtPriceLimitX96: 0n
}]);
const unwrapData = routerInterface.encodeFunctionData("unwrapWETH9", [amountOutMinimum, recipientAddress]);
const tx = await routerContract.multicall([swapData, unwrapData]);
```

---

## 4. 任務清單

| # | 任務 | DoD | FA |
|---|------|-----|-----|
| T1 | 建立 `src/uniswap.ts` | 常數 + ABI export，tsc 編譯通過 | FA-2 |
| T2 | 新增型別到 `src/types.ts` | SwapTokenParams + SwapTokenData + type export | FA-1 |
| T3 | 實作 `src/tools/swapToken.ts` | 三種路徑 + quote + slippage + 參數驗證 + 錯誤分類 | FA-1 |
| T4 | 註冊到 `src/index.ts` manifest | import + re-export + manifest entry | FA-1 |
| T5 | 撰寫 `tests/swapToken.test.ts` | 覆蓋三種路徑 happy path + 所有錯誤路徑（≥15 test cases） | FA-1 |
| T6 | npm test + tsc --noEmit 全過 | 0 failures | FA-1 |

---

## 5. 驗收標準

| # | Given | When | Then |
|---|-------|------|------|
| AC1 | agent 有 ETH | 呼叫 swap_token(tokenIn='ETH', tokenOut=USDC, amountIn='0.01') | 回傳 txHash + expectedAmountOut |
| AC2 | agent 有 USDC + approve 完成 | 呼叫 swap_token(tokenIn=USDC, tokenOut='ETH') | 回傳 txHash，路徑為 TOKEN→ETH |
| AC3 | agent 有 USDC + approve 完成 | 呼叫 swap_token(tokenIn=USDC, tokenOut=WBTC) | 回傳 txHash，路徑為 TOKEN→TOKEN |
| AC4 | slippageBps=50 | quote 後計算 | amountOutMinimum = quote * 9950/10000 |
| AC5 | tokenIn == tokenOut | 呼叫 swap_token | ValidationError |
| AC6 | fee = 999 | 呼叫 swap_token | ValidationError: invalid fee tier |
| AC7 | 私鑰無效 | 呼叫 swap_token | InvalidKeyError |
| AC8 | RPC 不可達 | 呼叫 swap_token | NetworkError（withRetry 後） |
| AC9 | router revert INSUFFICIENT_OUTPUT_AMOUNT | swap | SwapError: slippage exceeded |

---

## 6. 風險

| 風險 | 等級 | 緩解 |
|------|------|------|
| QuoterV2 ABI 格式錯誤（tuple param encoding） | High | 使用 ethers v6 human-readable ABI，驗證 staticCall |
| Token→ETH multicall 編碼錯誤 | High | 測試中 mock encodeFunctionData + multicall 呼叫 |
| swap revert 錯誤訊息分類不精確 | Medium | 覆蓋 INSUFFICIENT_OUTPUT_AMOUNT、INSUFFICIENT_FUNDS 等 revert reason |
