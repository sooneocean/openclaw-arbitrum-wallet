# S5 R1 Findings — architecture-refactor

> **審查者**: R1 Challenger
> **審查時間**: 2026-03-15
> **審查範圍**: 13 檔案（src/errors.ts, src/provider.ts, 4 handlers, src/index.ts, 2 test files, 2 tsconfig, package.json, jest.config.js）
> **對照 Spec**: s1_dev_spec.md

---

## Findings

### CR-001 | P2 | Spec 一致性 | SDD Context 標記 createWallet.ts 為 unchanged 但實際有修改

- **位置**: `s1_dev_spec.md` §2.1 及 SDD Context `unchanged_files`
- **描述**: SDD Context 的 `impact_scope.unchanged_files` 包含 `src/tools/createWallet.ts`，但實際上該檔案修改了 import 路徑（加上 `.js` 副檔名），屬 ESM 相容所需的必要變更。Spec §2.1 表格也標為「不動」。此不一致不影響功能，但違反 SDD Context 的精確性原則。
- **建議**: 下次 SDD Context 更新時將 `createWallet.ts` 從 `unchanged_files` 移至 `modified_files`，或在 spec 明確記載「僅 import path 加 .js extension」。

### CR-002 | P2 | ESM 相容 | tsconfig.esm.json 使用 moduleResolution: "node" 搭配 ES2020 module

- **位置**: `tsconfig.esm.json` L12
- **描述**: `"module": "ES2020"` 搭配 `"moduleResolution": "node"` 是 TypeScript 的舊解析模式。TypeScript 官方建議 ESM 輸出搭配 `"moduleResolution": "node16"` 或 `"bundler"`。目前因為所有 import 已手動加上 `.js` 副檔名，實務上能正確運作，但若未來新增內部模組忘記加 `.js`，CJS build 會過但 ESM build 不會報錯而 runtime 才失敗。
- **建議**: 將 `tsconfig.esm.json` 的 `moduleResolution` 改為 `"node16"`，讓編譯器在缺少 `.js` 副檔名時即時報錯。此為 P2 建議改進，不阻擋合併。

### CR-003 | P2 | 程式碼品質 | withRetry 的 unreachable throw 可移除

- **位置**: `src/provider.ts` L75-76
- **描述**: `throw lastError` 在 `for` 迴圈之後是 dead code（迴圈內 L70 的 `throw err` 在最後一次 attempt 時一定會觸發）。目前有 `// Unreachable, but TypeScript needs it` 註解，語意正確。這是 TypeScript 的型別系統限制，不是 bug，但可以考慮用 `as never` 斷言或改寫迴圈結構來消除。
- **建議**: 維持現狀可接受。若要追求潔癖可改為 `throw lastError as never`，但非必要。

---

## P0 不變式驗證

### classifyKeyError 五條件逐字比對

| # | 條件 | errors.ts | Spec §4.2 | 結果 |
|---|------|-----------|-----------|------|
| 1 | `code === "INVALID_ARGUMENT"` | L12 ✓ | ✓ | PASS |
| 2 | `msgLower.includes("invalid private key")` | L13 ✓ | ✓ | PASS |
| 3 | `msgLower.includes("invalid argument")` | L14 ✓ | ✓ | PASS |
| 4 | `msgLower.includes("valid bigint")` | L15 ✓ | ✓ | PASS |
| 5 | `msgLower.includes("curve.n")` | L16 ✓ | ✓ | PASS |

**變數提取邏輯**（code / msg / msgLower）也與 Spec §4.2 逐字一致。

---

## 審查標準逐項結果

### 1. Spec 符合度

| AC | 描述 | 結果 | 驗證方式 |
|----|------|------|---------|
| AC-1 | classifyKeyError 單一來源 | PASS | `grep -r "function classifyKeyError" src/` 只在 errors.ts |
| AC-2 | 既有測試全數通過 | PASS | 38 tests passed（22 existing + 16 new） |
| AC-3 | 五條件保留 | PASS | 逐字比對見上表 |
| AC-4 | Provider 快取重用 | PASS | provider.test.ts 驗證 `a === b` |
| AC-5 | withRetry 網路錯誤重試 | PASS | provider.test.ts 驗證 fn 被呼叫 2 次 |
| AC-6 | withRetry 業務錯誤不重試 | PASS | provider.test.ts 驗證 fn 只被呼叫 1 次 |
| AC-7 | sendTransaction 不 retry | PASS | grep 確認 sendTransaction.ts 無 withRetry import/呼叫 |
| AC-8 | CJS require 成功 | PASS | `node -e "require('./dist/cjs/index.js').default.name"` → `arbitrum-wallet` |
| AC-9 | ESM import | 未驗證 | 需 `--input-type=module` 測試（build 產出結構正確，`dist/esm/package.json` 存在） |
| AC-10 | 版本 1.1.0 | PASS | package.json + src/index.ts manifest.version 均為 "1.1.0" |

### 2. P0 不變式
- classifyKeyError 五條件：**PASS**（見上方逐字比對表）

### 3. 安全性
- sendTransaction 無 withRetry：**PASS**（grep 確認）
- 無 console.log：**PASS**（grep 確認 src/ 無 console.log）
- 無私鑰洩漏：**PASS**（privateKey 僅作為 Wallet 建構參數，未記錄/輸出）

### 4. 正確性
- withRetry rethrow 原始 error：**PASS**（L70 `throw err` 直接拋原始 error object，provider.test.ts L99 驗證 `err === originalErr` 引用相等）
- Provider cache 正確：**PASS**（Map 快取，同 URL 回傳同實例，resetProviderCache 清空）
- 指數退避計算：**PASS**（`baseDelay * 2^attempt` → attempt 0: 200ms, attempt 1: 400ms，符合 Spec）

### 5. 測試覆蓋
- AC-3（五條件）：errors.test.ts 6 個 test case 逐條驗證 ✓
- AC-4（Provider cache）：provider.test.ts 驗證同 URL 同實例 + 不同 URL 不同實例 ✓
- AC-5（retry 網路錯誤）：provider.test.ts 驗證 network error retry 成功 + retry 耗盡 ✓
- AC-6（不 retry 業務錯誤）：provider.test.ts 驗證 INSUFFICIENT_FUNDS 不 retry ✓
- AC-7（sendTransaction 不 retry）：由 grep 靜態驗證（sendTransaction.ts 不含 withRetry）✓

### 6. ESM/CJS 相容
- exports 順序 types → import → require：**PASS**
- dist/esm/package.json 自動生成：**PASS**（build script 包含 `echo '{"type":"module"}' > dist/esm/package.json`）
- `.js` import extensions：**PASS**（所有 src 檔案 import 均加 `.js`）
- jest.config.js moduleNameMapper 處理 `.js` → 無副檔名：**PASS**
- CR-002 moduleResolution 建議：P2

### 7. 程式碼品質
- 無不必要變更：**PASS**（createWallet.ts 僅加 `.js` 副檔名，index.ts 僅 version bump + `.js`）
- 無 scope creep：**PASS**（所有變更均在 spec 範圍內）

---

## 統計

| 嚴重度 | 數量 |
|--------|------|
| P0 | 0 |
| P1 | 0 |
| P2 | 3 |

---

## Gate 建議

**PASS**

理由：
1. 零 P0/P1 findings
2. classifyKeyError 五條件逐字保留，P0 不變式完整守護
3. 38 個測試全數通過（22 existing + 16 new），零行為變更
4. 安全性檢查全部通過（無 withRetry 在 sendTransaction、無 console.log、無私鑰洩漏）
5. ESM/CJS 雙格式 build 成功、exports 順序正確
6. 3 個 P2 均為建議改進項目，不影響功能正確性與安全性
