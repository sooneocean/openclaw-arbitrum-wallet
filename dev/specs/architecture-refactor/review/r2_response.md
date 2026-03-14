# R2 Defense: architecture-refactor dev_spec

> **角色**: R2 防禦者 (architect)
> **日期**: 2026-03-15
> **對象**: S1 dev_spec (`s1_dev_spec.md`)
> **R1 來源**: S2 對抗式審查 R1 findings

---

## 逐條回應

### SR-009 [P0]: ESM .mjs rename 策略導致 import resolution 失敗

**處置**: Accept

**R1 主張**: tsc 編譯出的 import 路徑指向 `.js`，rename 後檔案叫 `.mjs`，Node.js ESM 不會自動解析。

**驗證**: R1 正確。tsc 在 ESM mode 編譯時，內部 `import { classifyKeyError } from "../errors"` 會被解析為 `../errors.js`。如果把 `.js` rename 成 `.mjs`，但 import 語句仍指向 `.js`，Node.js ESM 嚴格模式下會 ERR_MODULE_NOT_FOUND。這是一個確定的 P0 問題。

**證據**:
- `s1_dev_spec.md` L389: `搭配 post-build rename .js → .mjs`
- `s1_dev_spec.md` L395-399: build script 使用 rename 策略
- TypeScript 不會在 emit 時把 `.js` 改成 `.mjs`，import specifier 會維持 `.js`

**修正方案**: 採用 R1 建議的 `dist/esm/package.json + {"type": "module"}` 方案。具體：
1. ESM tsconfig 輸出到 `dist/esm/`，副檔名保持 `.js`
2. 新增 `dist/esm/package.json`，內容為 `{"type": "module"}`
3. package.json exports 改為 `"import": "./dist/esm/index.js"`
4. 移除所有 rename script 邏輯
5. build script 加入 `echo '{"type":"module"}' > dist/esm/package.json`

---

### SR-001 [P1]: 錯誤分類集中化範圍不完整

**處置**: Partial Accept

**R1 主張**: S0 要求集中「所有」錯誤分類，但 dev_spec 只集中 `classifyKeyError`。`sendTransaction.ts` 的 `InsufficientFundsError` 和 `NetworkError` string matching 仍 inline。

**驗證**: 看 S0 原文：

- `s0_brief_spec.md` L106: `src/errors.ts export classifyKeyError(err) + classifyNetworkError(err) + classifyTransactionError(err)`

S0 確實提了三個函式。但 dev_spec 降級為只處理 `classifyKeyError`。

然而，看實際程式碼：
- `sendTransaction.ts` L85-101: `InsufficientFundsError` 和 `NetworkError` 判定是 sendTransaction **獨有**的邏輯（getBalance、signMessage 完全沒有這些判定）。
- 這些 inline 判定只出現一處，**沒有重複問題**。S0 的核心痛點是 classifyKeyError 的重複（兩個檔案完全相同的 11 行）。

**結論**: R1 的觀察事實正確（S0 與 dev_spec 範圍不一致），但影響不是 P1。這些 inline 判定無重複問題，集中化的 ROI 低。正確做法是在 dev_spec 中 descope 並記錄原因。

**修正方案**: 在 dev_spec 新增 descope 說明：
> `InsufficientFundsError` 和 `NetworkError` 的 inline 判定（`sendTransaction.ts` L85-101）僅存在於單一檔案，無重複問題。本次不集中化。若未來其他 handler 也需要相同判定再提取。S0 §4.2.1 中 `classifyNetworkError` / `classifyTransactionError` 降為 future scope。

---

### SR-002 [P1]: withRetry isRetryable 與 sendTransaction NetworkError 判定不一致

**處置**: Partial Accept

**R1 主張**: `withRetry` 的 `isRetryable` 多了 `econnrefused`/`econnreset`，與 `sendTransaction` 的 NetworkError 判定不完全一致。

**驗證**:
- dev_spec `isRetryable` (L343-350): `NETWORK_ERROR | network | timeout | connection | econnrefused | econnreset`
- `sendTransaction.ts` L94-99: `NETWORK_ERROR | network | timeout | connection`（4 條件，無 econnrefused/econnreset）

R1 正確指出差異存在。但這不是 bug — `withRetry` 的 `isRetryable` 是「哪些錯誤值得重試」的判定，而 sendTransaction 的是「哪些錯誤歸類為 NetworkError」。兩者語義不同。

不過，有一個隱含問題值得記錄：如果 `econnrefused` 被 `withRetry` 重試，最終仍失敗後 throw 出來，在 sendTransaction 的 catch 中會命中 `connection` 條件（因為 `econnrefused` 包含 `connect` 子字串...不對，它匹配的是 `connection`），我再確認 — `"econnrefused".includes("connection")` = false。所以如果有 econnrefused 錯誤直接到 sendTransaction catch（sendTransaction 不用 withRetry），它不會被歸類為 NetworkError，而是 fallthrough 到 TransactionError。

但 sendTransaction 本來就不用 withRetry，所以 `isRetryable` 的條件對 sendTransaction 無影響。`isRetryable` 只用在 getBalance 的 `withRetry` 包裝中。

**修正方案**: 在 dev_spec T3 描述中加一句：
> `isRetryable` 的判定範圍有意大於 sendTransaction 的 NetworkError 分類。`econnrefused`/`econnreset` 是 Node.js 底層錯誤，在 retry 語境下應該重試，但不影響 sendTransaction 的錯誤分類（sendTransaction 不使用 withRetry）。

---

### SR-004 [P1]: getBalance 外層 catch-all 加 withRetry 後行為邊界不清

**處置**: Accept

**R1 主張**: getBalance 外層 catch-all 一律回傳 NetworkError，加 `withRetry` 後 error message 可能不同（帶 retry 計數資訊？），需定義「零行為變更」精確邊界。

**驗證**: 看 `getBalance.ts` L84-87:
```typescript
} catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `NetworkError: ${msg}` };
}
```

目前外層 catch-all 把所有未處理例外都歸為 NetworkError。加 `withRetry` 後：
1. ETH path: `provider.getBalance()` 被包 `withRetry`。若 retry 最終失敗，`withRetry` 會 rethrow 原始錯誤。只要 `withRetry` rethrow 的是原始 error object（不包裝），則 `msg` 不變，行為不變。
2. ERC20 path: `contract.balanceOf()` 如果也包 `withRetry`，retry 最終失敗的 error 被 L57-65 的 inner catch 捕獲為 `InvalidContractError`。

**關鍵**: `withRetry` 必須 rethrow 原始 error，不得包裝新的 Error 物件。這一點 dev_spec 沒有明確寫。

**修正方案**: 在 dev_spec T3 的 `withRetry` 設計中加入：
> **不變式**: `withRetry` 在所有 retry 耗盡後，必須 rethrow 最後一次嘗試的原始 error object（不做包裝、不修改 message）。這確保下游 catch 的 error 分類行為不變。

---

### SR-006 [P1]: build script 缺少 rm -rf dist 清理

**處置**: Accept

**R1 主張**: dist 結構從 `dist/*.js` 變為 `dist/cjs/` + `dist/esm/`，但 build script 沒有先 `rm -rf dist`，舊 `dist/index.js` 殘留可能造成混亂。

**驗證**: `package.json` L18: `"build": "tsc"`。改為雙 tsconfig 後，舊的 `dist/index.js` 確實會殘留（tsc 不會清理其他目錄的產出）。

**修正方案**: T5 build script 改為：
```
"build": "rm -rf dist && tsc -p tsconfig.cjs.json && tsc -p tsconfig.esm.json && echo '{\"type\":\"module\"}' > dist/esm/package.json"
```

---

### SR-012 [P1]: 新增測試標為「建議」而非「必須」

**處置**: Accept

**R1 主張**: AC-4/5/6/7 缺自動化驗證。dev_spec 7.3 節將新增測試標為「建議 S4 階段加入」。

**驗證**: dev_spec L486-488 確實用了「建議」。但 AC-4（Provider 快取重用）、AC-5（retry 網路錯誤）、AC-6（業務錯誤不重試）、AC-7（sendTransaction 不 retry）這四個是 P0/P1 等級的驗收標準，靠「手動驗證」不可接受。

**修正方案**:
1. 將 7.3 節「建議」改為「**必須**」
2. T3 DoD 加入：`tests/provider.test.ts` 必須涵蓋 AC-4/5/6
3. T4 DoD 加入：`tests/sendTransaction.test.ts` 或 `tests/provider.test.ts` 必須涵蓋 AC-7
4. T1 DoD 加入：`tests/errors.test.ts` 必須涵蓋 AC-3 五個條件 + 非 key error 回傳 false

---

### SR-PRE-003 [P1]: T5 exports 範例順序與架構決策 6.1 矛盾

**處置**: Accept

**R1 主張**: T5 描述中 exports 範例順序是 `import → require → types`，但架構決策 6.1 明確選擇 `types → import → require`。

**驗證**:
- dev_spec L394: `"exports": { ".": { "import": "...", "require": "...", "types": "..." } }`（import 第一位）
- dev_spec L443: 架構決策表明確選擇 B: `types → import → require`

確實矛盾。TypeScript handbook 要求 `types` 在第一位。

**修正方案**: 修正 T5 描述中的 exports 範例為：
```json
"exports": {
  ".": {
    "types": "./dist/cjs/index.d.ts",
    "import": "./dist/esm/index.js",
    "require": "./dist/cjs/index.js"
  }
}
```

---

### SR-003 [P2]: withRetry 在 getBalance ERC20 path 的包裝粒度問題

**處置**: Partial Accept (升級為 P1 記錄)

**R1 主張**: `balanceOf` 加 `withRetry` 後，retry 最終失敗會被 L57-65 inner catch 捕獲為 `InvalidContractError` 而非 `NetworkError`。

**驗證**: `getBalance.ts` L57-65:
```typescript
try {
    rawBalance = await contract.balanceOf(params.address);
} catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `InvalidContractError: balanceOf failed — ${msg}` };
}
```

如果 `withRetry(() => contract.balanceOf(...))` 在 retry 耗盡後 rethrow 網路錯誤，這個 catch 會把它歸為 `InvalidContractError`。而目前（無 retry），同樣的網路錯誤也會被這個 catch 歸為 `InvalidContractError`。所以 **行為沒變** — before 和 after 都是 `InvalidContractError`。

但更深層問題是：這裡存在一個 **pre-existing 的錯誤分類不精確**（網路錯誤被歸為 InvalidContractError）。但這是既有行為，本次重構目標是零行為變更，不應修。

**修正方案**: 在 dev_spec 風險矩陣新增記錄：
> `getBalance` ERC20 path 的 `balanceOf` catch-all 會將網路錯誤歸為 `InvalidContractError`。此為 pre-existing 行為，零行為變更原則下本次不修。`withRetry` 加在 `balanceOf` 上不改變此行為（retry 耗盡仍 rethrow，被同一個 catch 捕獲）。

---

### SR-005 [P2]: .npmignore 防禦性更新

**處置**: Reject

**R1 主張**: 防禦性在 `.npmignore` 加上 `tsconfig.*.json`。

**驗證**: `package.json` L13-16:
```json
"files": ["dist", "README.md"]
```

`files` 是 allowlist。只有 `dist` 和 `README.md` 會被 `npm pack` 包含。`tsconfig.*.json` 不在 allowlist 中，不會被打包。`.npmignore` 在有 `files` 的情況下是冗餘的。

**理由**: 這是純粹的防禦性冗餘。有 `files` allowlist 就夠了。加 `.npmignore` 反而增加維護負擔（兩處管同一件事）。

---

### SR-007 [P2]: Provider cache + jest.mock 交互分析需加深

**處置**: Reject

**R1 主張**: 需要更深入說明 Provider cache 與 jest.mock 的交互。

**驗證**: dev_spec L452-454 已說明：
> `jest.mock("ethers")` 攔截的是 ethers 模組，不受內部 import 路徑變更影響。`provider.ts` 的 Map cache 需要 `resetProviderCache()` 配合 `jest.clearAllMocks()` 防止測試間殘留，但既有測試不需修改（因為 mock 了整個 JsonRpcProvider constructor）。

看測試程式碼：
- `sendTransaction.test.ts` L7-19: `jest.mock("ethers", () => { ... JsonRpcProvider: jest.fn(() => ({})) ... })`
- `getBalance.test.ts` L8-21: 同樣 mock 整個 `ethers` 模組

`provider.ts` 的 `getProvider` 會 `import { JsonRpcProvider } from "ethers"`，而 Jest 的 module mock 會攔截這個 import，所以 `new JsonRpcProvider()` 實際建構的是 mock。Provider cache Map 中存的是 mock 實例。每個 test file 有獨立的 module scope（Jest 的 `jest.clearAllMocks()` + module isolation），不會互相污染。

dev_spec 現有說明已足夠。P2 建議不需要額外行動。

---

### SR-008 [P1→降為記錄]: createWallet.ts S0 描述不精確

**處置**: Accept (作為記錄)

**R1 主張**: S0 提到 createWallet.ts 要「微調」但 dev_spec 確認不需修改。

**驗證**:
- `s0_brief_spec.md` L79: `createWallet.ts # 微調（使用 errors.ts）`
- `s1_dev_spec.md` L35: `createWallet.ts | 不動 | - | 無 RPC 呼叫、無 classifyKeyError，不需修改`
- `createWallet.ts` 源碼確認：無 `classifyKeyError`、無 `JsonRpcProvider`、所有錯誤都歸為 `UnexpectedError`。

dev_spec 的判斷正確。S0 的描述確實不精確。

**修正方案**: 在 dev_spec 2.1 表格 `createWallet.ts` 行加註：
> S0 原標記為「微調」，經 S1 分析確認不需修改（無 classifyKeyError 使用、無 RPC 呼叫）。

---

### SR-010 [P2]: manifest.version 應同步為 1.1.0

**處置**: Accept

**驗證**: `src/index.ts` L24: `version: "1.0.0"` — 確實需要與 package.json 同步更新。

**修正方案**: T5 DoD 新增：
> `src/index.ts` manifest.version 更新為 "1.1.0"。

---

### SR-PRE-001/002 [P2]: classifyKeyError 行號引用少一行

**處置**: Accept

**驗證**:
- `sendTransaction.ts` 的 `classifyKeyError` 是 L9-20（含 closing brace），非 L9-19
- `signMessage.ts` 的 `classifyKeyError` 是 L4-15（含 closing brace），非 L4-14

**修正方案**: 修正 dev_spec L287-288 行號：
- `sendTransaction.ts L9-20`
- `signMessage.ts L4-15`

---

## 修正清單（合併）

### P0 修正

| # | Finding | 修正內容 |
|---|---------|---------|
| 1 | SR-009 | ESM 策略改為 `dist/esm/package.json + {"type":"module"}`。移除所有 `.js → .mjs` rename 邏輯。更新 T5 描述、DoD、exports 範例。 |

### P1 修正

| # | Finding | 修正內容 |
|---|---------|---------|
| 2 | SR-001 | 新增 descope 說明：InsufficientFundsError/NetworkError inline 判定無重複，本次不集中化。 |
| 3 | SR-002 | T3 加入 isRetryable 與 sendTransaction NetworkError 判定差異的設計說明。 |
| 4 | SR-004 | T3 withRetry 設計加入不變式：rethrow 原始 error object，不得包裝。 |
| 5 | SR-006 | T5 build script 加入 `rm -rf dist` 前置清理步驟。 |
| 6 | SR-012 | 7.3 節「建議」改為「必須」；T1/T3/T4 DoD 加入對應測試要求。 |
| 7 | SR-PRE-003 | T5 exports 範例順序修正為 types → import → require。 |

### P2 修正

| # | Finding | 修正內容 |
|---|---------|---------|
| 8 | SR-003 | 風險矩陣加入 ERC20 balanceOf 錯誤分類 pre-existing 行為記錄。 |
| 9 | SR-008 | createWallet.ts 表格加註 S0 與 S1 差異說明。 |
| 10 | SR-010 | T5 DoD 加入 src/index.ts manifest.version 更新。 |
| 11 | SR-PRE-001/002 | 修正行號引用。 |

### Rejected

| # | Finding | 理由 |
|---|---------|------|
| 12 | SR-005 | `files` allowlist 已足夠，`.npmignore` 為冗餘。 |
| 13 | SR-007 | dev_spec 現有說明已充分覆蓋 mock 交互。 |

---

## 統計

| 類型 | 數量 |
|------|------|
| Accept | 8 (SR-009, SR-006, SR-012, SR-PRE-003, SR-008, SR-010, SR-PRE-001/002, SR-004) |
| Partial Accept | 3 (SR-001, SR-002, SR-003) |
| Reject | 2 (SR-005, SR-007) |
