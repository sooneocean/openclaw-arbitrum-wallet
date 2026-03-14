# S5 Code Review Report: architecture-refactor

> **階段**: S5 Code Review
> **審查時間**: 2026-03-15
> **審查模式**: Full Spec（R1 Short-Circuit — 無 P0/P1，跳過 R2/R3）

---

## 審查摘要

| 指標 | 數值 |
|------|------|
| R1 Findings | 3 |
| P0 | 0 |
| P1 | 0 |
| P2 | 3 |
| Gate 結論 | **pass** |

## R1 Findings

| ID | 嚴重度 | 摘要 |
|----|--------|------|
| CR-001 | P2 | sdd_context 標記 createWallet.ts 為 unchanged，但實際加了 .js import extension |
| CR-002 | P2 | tsconfig.esm.json moduleResolution 建議改為 node16（非阻斷） |
| CR-003 | P2 | withRetry 末尾 throw lastError 是 dead code（TypeScript 型別系統需要，可接受） |

---

## Spec 對照驗證

### S0 成功標準

| # | 標準 | 結果 | 證據 |
|---|------|------|------|
| 1 | classifyKeyError 只存在 src/errors.ts | ✅ | grep 驗證：只在 errors.ts 出現 |
| 2 | 既有 22 個測試 100% 通過 | ✅ | npm test: 38 passed (22 既有 + 16 新增) |
| 3 | Provider 快取重用驗證 | ✅ | tests/provider.test.ts: cached instance for same rpcUrl |
| 4 | retry 機制驗證 | ✅ | tests/provider.test.ts: retries on network error / does not retry non-retryable |
| 5 | CJS + ESM 雙格式載入驗證 | ✅ | CJS: arbitrum-wallet / ESM: arbitrum-wallet |

**通過率**: 5/5 = 100%

### S1 影響範圍一致性

| 層級 | 預期 | 實際 | 差異 |
|------|------|------|------|
| 新增 | errors.ts, provider.ts, tsconfig.cjs.json, tsconfig.esm.json | +tests/errors.test.ts, +tests/provider.test.ts | ⚠️ 測試檔案未列在 S1 new_files（但 S2 已改為必須） |
| 修改 | sendTransaction.ts, signMessage.ts, getBalance.ts, package.json | +createWallet.ts, +index.ts, +jest.config.js | ⚠️ 3 個額外修改（.js extension + moduleNameMapper） |
| 不動 | createWallet.ts, index.ts, types.ts | types.ts | ⚠️ createWallet.ts 和 index.ts 有修改 |

**說明**: 額外修改是 ESM .js 副檔名需求造成的，屬於 ESM 支援的必要變更，非 scope creep。

### AC 驗收標準

| AC | 描述 | 結果 | 證據 |
|----|------|------|------|
| AC-1 | classifyKeyError 單一來源 | ✅ | grep: 只在 errors.ts |
| AC-2 | 既有測試全數通過 | ✅ | 38/38 pass |
| AC-3 | 五條件保留 | ✅ | errors.ts 逐字比對 + tests/errors.test.ts 6 案例 |
| AC-4 | Provider 快取重用 | ✅ | tests/provider.test.ts: === true |
| AC-5 | withRetry 網路錯誤重試 | ✅ | tests/provider.test.ts: fn 呼叫 2 次 |
| AC-6 | withRetry 業務錯誤不重試 | ✅ | tests/provider.test.ts: fn 呼叫 1 次 |
| AC-7 | sendTransaction 不 retry | ✅ | sendTransaction.ts 無 withRetry import/呼叫 |
| AC-8 | CJS require 成功 | ✅ | node require: arbitrum-wallet |
| AC-9 | ESM import 成功 | ✅ | node import: arbitrum-wallet |
| AC-10 | 版本 1.1.0 | ✅ | package.json + manifest.version |

**通過率**: 10/10 = 100%

---

## 結論

**Gate: PASS** — 所有 AC 通過，0 P0/P1，3 P2 不阻斷。可進入 S6 測試。
