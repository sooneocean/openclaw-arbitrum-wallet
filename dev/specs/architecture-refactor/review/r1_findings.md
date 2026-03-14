# R1 Findings: architecture-refactor dev_spec

> **審查者**: R1 Challenger
> **審查對象**: `dev/specs/architecture-refactor/s1_dev_spec.md`
> **審查時間**: 2026-03-15
> **對照文件**: `s0_brief_spec.md`, 原始碼 (`sendTransaction.ts`, `signMessage.ts`, `getBalance.ts`, `createWallet.ts`, `index.ts`), `package.json`, `tsconfig.json`, `.npmignore`

---

## Findings

### SR-001 [P1 / 完整性] S0 要求集中「所有」錯誤分類，但 dev_spec 只集中了 classifyKeyError

**位置**: s1_dev_spec.md 4.1 介面、Task T1/T2

**描述**:

S0 brief_spec 4.2.1 明確寫道 `src/errors.ts` 應該 export `classifyKeyError(err)` + `classifyNetworkError(err)` + `classifyTransactionError(err)`，且 S0 §4.2 全局流程圖列出了五種錯誤類型的集中分類路徑（InvalidKeyError / NetworkError / InsufficientFundsError / InvalidContractError / UnexpectedError）。

但 dev_spec 的 `src/errors.ts` 介面（4.1 節）只 export 了 `classifyKeyError`。以下分散在各 handler 的錯誤分類邏輯完全沒有被納入集中化範圍：

1. **sendTransaction.ts L85-101**: `InsufficientFundsError` 分類（`code === "INSUFFICIENT_FUNDS" || msg.includes("insufficient funds")`）和 `NetworkError` 分類（`code === "NETWORK_ERROR" || msg.includes("network") || msg.includes("timeout") || msg.includes("connection")`）仍然 inline。
2. **getBalance.ts L84-87**: 最外層 catch 一律回傳 `NetworkError`，沒有任何分類邏輯，但也代表「什麼是 NetworkError」的判定隱含在 try/catch 的結構中。

S0 的痛點明確提到「4 個 handler 各自做 try/catch + string matching，新增錯誤類型需要改多處」。如果只抽 `classifyKeyError`，那 `InsufficientFundsError` 的 string matching 仍然散落在 sendTransaction.ts 中，跟 S0 的目標不一致。

**建議修正方向**:

二選一：
- (A) 擴展 `errors.ts` 的範圍，將 `classifyNetworkError` 和 `classifyInsufficientFundsError` 也集中進去，與 S0 一致。
- (B) 如果刻意限縮範圍只做 classifyKeyError（因為它是唯一有重複定義的），則需要在 dev_spec 中明確說明 S0 的 `classifyNetworkError` / `classifyTransactionError` 被 **descoped** 並給出理由，避免 S5 審查時被視為需求遺漏。

---

### SR-002 [P1 / 正確性] withRetry 的 isRetryable 預設條件與 sendTransaction.ts 現有 NetworkError 判定不完全一致

**位置**: s1_dev_spec.md T3 isRetryable 預設實作 vs sendTransaction.ts L94-99

**描述**:

dev_spec T3 定義的 `isRetryable` 預設條件：
```
code === "NETWORK_ERROR" ||
msgLower.includes("network") ||
msgLower.includes("timeout") ||
msgLower.includes("connection") ||
msgLower.includes("econnrefused") ||
msgLower.includes("econnreset")
```

sendTransaction.ts 現有的 NetworkError 判定（L94-99）：
```
code === "NETWORK_ERROR" ||
msg.toLowerCase().includes("network") ||
msg.toLowerCase().includes("timeout") ||
msg.toLowerCase().includes("connection")
```

差異：`isRetryable` 多了 `econnrefused` 和 `econnreset`。這本身是合理的擴展（因為 Node.js 底層可能拋出這些 POSIX 錯誤），但這表示 `isRetryable` 和 sendTransaction 的 NetworkError 分類邏輯**不完全相同**——可能存在一個 `econnrefused` 錯誤被 retry 了，但如果 retry 全部失敗，最終 handler 的 catch 仍然會把它歸類為 `NetworkError`（因為 `econnrefused` 包含 `connection` 子字串）。

這**恰好**不會造成問題（因為 `"econnrefused".includes("connection")` 為 false，但 sendTransaction 的 `msg.toLowerCase().includes("connection")` 對完整的 error message 可能匹配到）。但這是巧合式安全，不是設計式安全。

**建議修正方向**: 在 dev_spec 中明確記錄 `isRetryable` 與 handler-level NetworkError 分類的關係。如果 SR-001 被接受（集中 NetworkError 分類），那兩者自然會統一。

---

### SR-003 [P2 / 可行性] withRetry 在 getBalance ERC20 path 中的包裝粒度未明確

**位置**: s1_dev_spec.md T4、Data Flow (4.0)

**描述**:

getBalance.ts ERC20 path 有三個 RPC call：
1. `contract.balanceOf(params.address)` — L58，獨立 try/catch，失敗回傳 `InvalidContractError`
2. `contract.decimals()` — L68，Promise.all 中，失敗 fallback 到 18
3. `contract.symbol()` — L69，Promise.all 中，失敗 fallback 到 "UNKNOWN"

dev_spec T4 說「ERC20 呼叫包 `withRetry`」，但沒有說明是：
- (A) 每個 call 各自包 withRetry？`withRetry(() => contract.balanceOf(...))`, `withRetry(() => contract.decimals())`, `withRetry(() => contract.symbol())`
- (B) 整個 ERC20 區塊包一個 withRetry？

如果選 (A)，`decimals()` 和 `symbol()` 已有 `.catch(() => fallback)` 處理，再加 withRetry 是否有意義？NetworkError 在 withRetry 內重試，但其他錯誤（如 revert）不重試直接進 `.catch(() => fallback)`——這是合理的。

但 `balanceOf` 的 catch 回傳 `InvalidContractError`，如果加了 withRetry，那 `balanceOf` 失敗時會先 retry（如果是 network error），retry 全部失敗後才回傳 `InvalidContractError`。這改變了原本的行為：原本 network error 在 balanceOf 失敗時**不會**被分類為 `InvalidContractError`，而是被外層 catch（L84）捕獲分類為 `NetworkError`。加了 withRetry 後，retry 失敗的 network error 會被 balanceOf 的 catch 捕獲，回傳 `InvalidContractError` 而非 `NetworkError`——**這是行為變更**。

**建議修正方向**: T4 必須明確定義 withRetry 的包裝粒度，並分析對 `InvalidContractError` vs `NetworkError` 分類的影響。如果 `balanceOf` 的 catch 在 withRetry 之外，行為才不會改變。建議結構為：
```typescript
try {
  rawBalance = await withRetry(() => contract.balanceOf(params.address));
} catch (err) {
  // 這裡要區分：withRetry 已經處理了 network retry，
  // 如果最終還是失敗，需判斷是 network error 還是 contract error
}
```

---

### SR-004 [P1 / 正確性] getBalance 外層 catch 是 catch-all，加入 withRetry 後行為語意改變

**位置**: s1_dev_spec.md T4、getBalance.ts L84-87

**描述**:

getBalance.ts 的外層 catch（L84-87）**不做任何錯誤分類**，直接一律回傳 `NetworkError`。這包括：
- Provider 建構失敗（例如 rpcUrl 格式錯）
- ETH getBalance RPC 失敗
- ERC20 的 `Promise.all([decimals(), symbol()])` 失敗（雖然各自有 .catch，但如果 .catch handler 本身 throw 也會到外層）

dev_spec 說 `getBalance.ts` 的 `provider.getBalance()` 和 ERC20 呼叫包 `withRetry`。但外層 catch-all 本質上把**所有**未預期錯誤都歸為 `NetworkError`。如果 withRetry 改變了 error propagation 的路徑（例如 retry 後的 error 帶有不同的 stack trace 或 wrapped error），外層 catch 的行為雖然不變（一律 NetworkError），但 error message 可能不同。

這在「零行為變更」的嚴格定義下，是否算行為變更？dev_spec 沒有定義「零行為變更」的精確邊界——是 error type 不變就好，還是 error message 也不能變？

**建議修正方向**: 在 dev_spec 中明確定義「零行為變更」的精確邊界。建議：error type 前綴（`NetworkError:`, `InvalidKeyError:` 等）必須不變，error message 的 detail 部分允許因 retry 而有差異。

---

### SR-005 [P1 / 完整性] .npmignore 需要更新但 dev_spec 未提及

**位置**: s1_dev_spec.md 2.1 受影響檔案表

**描述**:

現有 `.npmignore` 包含 `tsconfig.json`。重構後新增 `tsconfig.cjs.json` 和 `tsconfig.esm.json`，這兩個檔案也不應該被發佈到 npm。

目前 `.npmignore` 只列了 `tsconfig.json`，沒有 glob pattern `tsconfig.*.json`。如果不更新 `.npmignore`，`tsconfig.cjs.json` 和 `tsconfig.esm.json` 會被包含在 npm package 中。

雖然 `package.json` 有 `"files": ["dist", "README.md"]` 欄位——**等等**，`files` 欄位是 allowlist 模式，只有列在 `files` 中的檔案/目錄會被包含。所以 `tsconfig.cjs.json` 和 `tsconfig.esm.json` 實際上不會被包含在 npm package 中，因為它們不在 `files` 列表裡。

但 `.npmignore` 和 `files` 同時存在時，npm 的行為是：`files` 是 allowlist，`.npmignore` 作為 denylist 在 `files` matched 的檔案上再篩一次。所以 `files: ["dist"]` 已經排除了根目錄的 tsconfig 檔案。

**修正**: 降級為 P2。不是 bug，但 `.npmignore` 中加上 `tsconfig.*.json` 是防禦性最佳實踐。dev_spec 的受影響檔案表應該加上 `.npmignore`（修改）。

---

### SR-006 [P1 / 完整性] dist 結構從 flat 變 nested，但 package.json `files` 和 `main` 的協調未詳述

**位置**: s1_dev_spec.md T5、package.json

**描述**:

現有 `package.json`:
- `"main": "./dist/index.js"`
- `"files": ["dist", "README.md"]`

重構後:
- `"main": "./dist/cjs/index.js"`
- dist 結構變成 `dist/cjs/` + `dist/esm/`

`"files": ["dist"]` 仍然有效（包含整個 dist 目錄），所以 CJS 和 ESM 都會被包含在 npm package 中。但 dev_spec T5 沒有提到 `files` 欄位是否需要修改。

更重要的問題：**清理舊 dist**。如果開發者之前跑過 `npm run build`，`dist/index.js` 仍然存在。新的 build 產出 `dist/cjs/` 和 `dist/esm/`，但舊的 `dist/index.js` 不會被刪除。dev_spec 的 build script 沒有包含 `rm -rf dist` 清理步驟。

**建議修正方向**:
1. T5 的 build script 應該加上清理步驟：`"build": "rm -rf dist && tsc -p tsconfig.cjs.json && tsc -p tsconfig.esm.json && ...rename..."`
2. 明確記錄 `files` 欄位不需要修改（`"dist"` 已涵蓋）

---

### SR-007 [P2 / 風險] Provider cache + jest.mock("ethers") 的交互作用分析不夠深入

**位置**: s1_dev_spec.md 6.3 Jest 相容、風險 §8

**描述**:

dev_spec 說「既有測試 mock 了整個 JsonRpcProvider constructor，cache Map 中存的是 mock 實例」。這是正確的。但分析不夠深入：

1. **getBalance.test.ts** mock 了 `JsonRpcProvider` 返回 `{ getBalance: mockGetBalance }`。重構後 `getProvider()` 在 `provider.ts` 中呼叫 `new JsonRpcProvider(url)`，由於 `jest.mock("ethers")` 在 test 層做，`provider.ts` import 的 `JsonRpcProvider` 也是 mock 版本。所以 `getProvider(url)` 會回傳 mock instance，然後被快取。**第一次呼叫**沒問題。

2. **但 cache 跨測試殘留**。`jest.clearAllMocks()` 只清 mock 的呼叫記錄，不會清 `provider.ts` 模組內部的 `Map`。第二個 test case 呼叫 `getBalanceHandler` 時，`getProvider` 會回傳**第一個 test case 時建立的 mock instance**。如果 mock instance 上的 `getBalance` 已被 `jest.clearAllMocks()` 重置，它會變成 `jest.fn()` 回傳 `undefined`——**測試會壞**。

等等，讓我重新檢查。`jest.clearAllMocks()` 清除的是 mock function 的呼叫記錄和 return value 設定，但 `mockGetBalance` 是獨立的 `jest.fn()`，在 `beforeEach` 中沒有重新設定 resolved value。看 getBalance.test.ts L3: `const mockGetBalance = jest.fn()`，每個 test case 各自設定 `mockGetBalance.mockResolvedValue(...)` 或 `mockGetBalance.mockRejectedValue(...)`。

關鍵是：cache 中的 mock instance 的 `getBalance` 屬性是 **`mockGetBalance` 的引用**，不是 copy。所以即使 cache 返回同一個 mock instance，`mockGetBalance` 的行為會隨每個 test case 的設定而變。**所以不會壞。**

但這只是因為 mock 的設計恰好如此。如果 cache 存的是 **不同的 mock instance**（因為 `JsonRpcProvider` constructor 每次被呼叫都回傳新的 object），那 cache 命中後返回舊 instance，其 `getBalance` 不是 `mockGetBalance`——**等等，mock factory 每次都回傳新 object `{ getBalance: mockGetBalance }`，但 `mockGetBalance` 是同一個 reference**。

結論：**既有測試確實不會壞**，但原因比 dev_spec 說的更微妙。cache 命中回傳第一次呼叫時建立的 mock instance，其 `getBalance` 屬性指向全域 `mockGetBalance`，而每個 test case 重新設定 `mockGetBalance` 的行為。這是安全的。

但如果未來有人不了解這個機制，在 test 中建立新的 `mockGetBalance` 而不是重用全域的，cache 就會導致 bug。

**建議修正方向**: 風險評估中加上一句說明：「既有測試安全的原因是 mock instance 的方法引用全域 jest.fn()，cache 命中不影響 mock 行為重設。建議在新增的 `provider.test.ts` 中加入 `afterEach(() => resetProviderCache())` 作為最佳實踐範例。」

---

### SR-008 [P0 / 完整性] S0 明確提到 createWallet.ts 要使用 errors.ts，但 dev_spec 標記為「不動」

**位置**: s1_dev_spec.md 2.1 受影響檔案表、s0_brief_spec.md 4.1 模組結構圖

**描述**:

S0 brief_spec §4.1 模組結構圖：
```
src/tools/createWallet.ts   # 微調（使用 errors.ts）
```

S0 §4.2 說「各 handler 的 catch 區塊改為呼叫集中函式」——暗示所有 4 個 handler 都要修改。

但 dev_spec §2.1 明確標記 `createWallet.ts` 為「不動」，理由是「無 RPC 呼叫、無 classifyKeyError，不需修改」。

驗證 `createWallet.ts` 原始碼：確實沒有 `classifyKeyError`，catch 區塊只有一個，直接回傳 `UnexpectedError`。沒有 string matching 分類邏輯。

**判定**：dev_spec 的判斷是**正確的**。`createWallet.ts` 沒有錯誤分類邏輯需要集中化，「不動」是合理的。**但 S0 的描述是錯誤的**——S0 說 `createWallet.ts` 要「微調（使用 errors.ts）」，這是 S0 的遺留不精確描述。

dev_spec 應該明確記錄這個偏差：「S0 §4.1 標記 createWallet.ts 需微調，但經 codebase 驗證，createWallet.ts 無錯誤分類邏輯，無需修改。此為 S0 描述不精確，非 spec 遺漏。」

**建議修正方向**: 在 dev_spec 中加入 S0 偏差記錄（例如在 §2.1 的 createWallet.ts 備註欄）。嚴重度降為 P1，因為不影響實作，但需要記錄。

---

### SR-009 [P2 / 可行性] ESM .mjs rename script 的可靠性

**位置**: s1_dev_spec.md T5

**描述**:

dev_spec T5 提供了一個 bash rename script 範例：
```bash
cd dist/esm && find . -name "*.js" -exec sh -c "mv {} $(echo {} | sed s/.js/.mjs/)" \;
```

這段 script 有 bug：`$(echo {} | sed s/.js/.mjs/)` 中的 `$()` 會在外層 shell 先展開，而不是在 `sh -c` 中展開。正確寫法需要轉義或用單引號。

但 dev_spec 也說「或用 Node.js rename script」，所以這只是個範例。

更重要的問題：tsc 編譯 ESM 時，**import 語句中的路徑不會被修改**。例如 `sendTransaction.ts` 中 `import { classifyKeyError } from "../errors"` 會被 tsc 編譯為 `import { classifyKeyError } from "../errors.js"`（如果 tsconfig 設了 `moduleResolution: "NodeNext"`）或維持 `"../errors"`（如果是 `"Node"`）。但 rename 後檔案叫 `errors.mjs`，路徑卻仍然指向 `"../errors"` 或 `"../errors.js"`——**ESM import 會找不到檔案**。

Node.js ESM 的 resolution 規則要求 import specifier 必須包含完整副檔名。如果 import 寫 `"../errors"`，Node.js ESM 不會自動加 `.mjs`。如果 import 寫 `"../errors.js"`，檔案卻叫 `errors.mjs`，也找不到。

**這是 FA-C 的潛在阻斷問題。** Rename `.js` -> `.mjs` 策略需要同時修改所有 import 語句中的 `.js` -> `.mjs`，或者改用其他策略（例如不 rename，改在 `dist/esm/` 目錄加 `package.json` 含 `"type": "module"`）。

**建議修正方向**:

放棄 rename 策略，改用以下任一方案：
- (A) 在 `dist/esm/` 目錄放一個 `package.json` 只含 `{"type": "module"}`，這樣 `.js` 檔案在該目錄下會被 Node.js 視為 ESM。package.json exports 指向 `./dist/esm/index.js`。
- (B) 使用 tsconfig `"moduleResolution": "nodenext"` + import 語句加 `.js` 副檔名，然後 rename script 同時修改檔案內容的 `.js` -> `.mjs`。但這複雜且脆弱。
- (A) 是業界常用且穩定的方案，強烈建議。

---

### SR-010 [P2 / 一致性] manifest.version 與 package.json version 不同步

**位置**: s1_dev_spec.md T5、src/index.ts L25

**描述**:

`src/index.ts` L25 的 manifest 定義了 `version: "1.0.0"`。dev_spec T5 只提到修改 `package.json` version 為 `"1.1.0"`，但沒有提到同步更新 `manifest.version`。

如果 `manifest.version` 和 `package.json` version 不同步，consumer 可能從 manifest 拿到 `"1.0.0"` 但 npm package 已經是 `1.1.0`——造成混淆。

**建議修正方向**: T5 的 DoD 加入「manifest.version 同步更新為 1.1.0」，或者改為 manifest.version 從 package.json 動態讀取。

---

### SR-011 [P2 / 風險] T5 獨立於 T1-T4，但先做 T5 會影響 T1-T4 的 tsc 編譯

**位置**: s1_dev_spec.md 5.1 任務依賴

**描述**:

T5 標記為無依賴（獨立），但如果 T5 先做：
- `npm run build` 變成 `tsc -p tsconfig.cjs.json && tsc -p tsconfig.esm.json`
- T1-T4 的 errors.ts 和 provider.ts 還不存在，但 sendTransaction.ts 等檔案還沒有 import 它們，所以 **tsc 仍然可以編譯通過**。
- T5 先做不會導致編譯失敗。

**但** T5 改了 dist 結構（`dist/cjs/` + `dist/esm/`），如果 T5 先 merge 到 main，再做 T1-T4，中間的 test run（`npm test`）仍然使用 `ts-jest` 直接編譯 src，不走 dist，所以不受影響。

**判定**: T5 的獨立性標記是正確的。此 finding 降級為資訊性記錄。

---

### SR-012 [P1 / 完整性] 新增測試的 scope 不夠明確

**位置**: s1_dev_spec.md 7.3 測試計畫

**描述**:

dev_spec §7.3 提到新增 `tests/errors.test.ts` 和 `tests/provider.test.ts` 是「建議 S4 階段加入」。但：

1. AC-4（Provider 快取重用）、AC-5（withRetry 網路錯誤重試）、AC-6（withRetry 業務錯誤不重試）、AC-7（sendTransaction 不 retry 廣播）——這四個 AC 的驗證需要新增測試。
2. 既有 22 個測試不覆蓋 `provider.ts` 和 `errors.ts` 的單元行為。
3. 如果新增測試是「建議」而非「必須」，那 AC-4/5/6/7 如何被驗證？手動驗證在 S6 可以做，但沒有自動化測試守護，regression 風險高。

**建議修正方向**: 將新增測試從「建議」改為「必須」，並在 T1 和 T3 的 DoD 中加入對應測試檔案的建立。或者新增一個 T3.5 專門建立 provider.test.ts，T1 加入 errors.test.ts 的 DoD。

---

## 總結

| 嚴重度 | 數量 | Finding IDs |
|--------|------|-------------|
| P0 | 1 | SR-008 (降為 P1 after analysis) |
| P1 | 5 | SR-001, SR-002, SR-004, SR-006, SR-012 |
| P2 | 4 | SR-003, SR-005, SR-007, SR-010 |
| **P0 (真正阻斷)** | **1** | **SR-009** |

### 嚴重度修正

- **SR-008** 初判 P0，但驗證後 dev_spec 判斷正確、S0 描述不精確。**降為 P1**（需記錄偏差）。
- **SR-009** 初判 P2，但分析後發現 `.mjs` rename 策略會導致 ESM import resolution 完全失敗。**升為 P0（阻斷）**。

---

## Gate 建議: conditional_pass

**條件**:

1. **[必須] SR-009**: ESM .mjs rename 策略必須重新設計。建議改用 `dist/esm/package.json` + `{"type": "module"}` 方案，避免 rename 和 import path 不匹配的問題。這是 FA-C 的阻斷問題。
2. **[必須] SR-001**: 明確定義 `errors.ts` 的範圍——是只集中 `classifyKeyError`（並記錄 S0 descope），還是也集中 NetworkError/InsufficientFundsError 分類。
3. **[必須] SR-006**: build script 加入 `rm -rf dist` 清理步驟。
4. **[必須] SR-012**: 新增測試從「建議」改為「必須」，否則 AC-4/5/6/7 缺乏自動化驗證。
5. **[建議] SR-003, SR-004**: 明確 withRetry 在 ERC20 path 的包裝粒度和「零行為變更」的精確邊界。
6. **[建議] SR-010**: manifest.version 同步更新。

滿足以上 4 個「必須」條件後，dev_spec 可以進入 S3。
