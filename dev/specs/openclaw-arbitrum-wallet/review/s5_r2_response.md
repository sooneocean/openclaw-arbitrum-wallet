# R2 回應 (S5)

> **審查者**: R2 防禦者 (reviewer)
> **日期**: 2026-03-14
> **回應對象**: R1 s5_r1_findings.md
> **參照 Spec**: dev/specs/openclaw-arbitrum-wallet/s1_dev_spec.md
> **ethers 實際版本**: v6.16.0

---

## 逐條判斷

---

### CR-001 (P0) — ACCEPT

**R1 指控**: `sendTransaction.ts` 和 `signMessage.ts` 的 InvalidKeyError 捕捉條件不涵蓋 ethers v6 全零私鑰時拋出的 `"Expected valid bigint: 0 < bigint < curve.n"` 錯誤（`code: undefined`），導致 fallthrough 至 TransactionError。

**R2 驗證**: 讀取 `src/tools/sendTransaction.ts` 第 61–73 行：
```typescript
code === "INVALID_ARGUMENT" ||
msg.toLowerCase().includes("invalid private key") ||
msg.toLowerCase().includes("invalid argument")
```
三個條件均不匹配 `"Expected valid bigint: 0 < bigint < curve.n"`，R1 分析正確。

**額外問題**: Wallet 建構和 sendTransaction 在同一個 try/catch，即使是合法私鑰，若 sendTransaction 拋出含 `"invalid argument"` 的錯誤，也會被誤分類為 InvalidKeyError。

**修復**:
1. 將 `new Wallet()` 從 `wallet.sendTransaction()` 的 try/catch 中分離，各自獨立 try/catch
2. 提取 `classifyKeyError()` 輔助函數，補充 `includes("valid bigint")` 和 `includes("curve.n")` 兩個條件
3. `signMessage.ts` 同樣分離 Wallet 建構的 try/catch

**測試佐證**: 新增 `"returns InvalidKeyError when private key is zero (ethers v6 curve.n error)"` 測試，mock Wallet constructor 拋出 `"Expected valid bigint: 0 < bigint < curve.n"` 錯誤，測試通過。

---

### CR-002 (P1) — ACCEPT

**R1 指控**: `getBalance.ts` ERC20 路徑缺少 `tokenAddress` 的 `isAddress()` 前置驗證。傳入格式無效的 tokenAddress 會被分類為 `InvalidContractError`，但語意應為 `ValidationError`。

**R2 驗證**: 讀取 `src/tools/getBalance.ts`：
- 第 19-24 行：`params.address` 有 `isAddress()` 驗證 ✅
- 第 44-56 行：ERC20 路徑進入前無 `tokenAddress` 的 `isAddress()` 驗證 ❌

R1 分析正確。Spec §3.2 E7 明確區分地址格式錯誤（ValidationError）與 ERC20 介面無效（InvalidContractError）。

**修復**: 在 ERC20 路徑前加入：
```typescript
if (params.tokenAddress && !isAddress(params.tokenAddress)) {
  return {
    success: false,
    error: `ValidationError: Invalid token address "${params.tokenAddress}"`,
  };
}
```

**測試佐證**: 新增 `"returns ValidationError for invalid tokenAddress format"` 測試案例，確認 `tokenAddress: "not-an-address"` 回傳 ValidationError 而非 InvalidContractError。

---

### CR-003 (P1) — ACCEPT

**R1 指控**: `sendTransaction.test.ts` 缺少 InvalidKeyError 測試案例。Spec Task #5 DoD 明確要求「私鑰錯誤回傳 InvalidKeyError」必須有測試覆蓋。

**R2 驗證**: `tests/sendTransaction.test.ts` 原有 6 個測試：success、amount=0、amount=-1、invalid to、InsufficientFundsError、NetworkError。確實沒有任何 InvalidKeyError 測試案例。

**修復**: 新增兩個 InvalidKeyError 測試案例：
1. `"returns InvalidKeyError when private key is invalid (INVALID_ARGUMENT)"` — mock Wallet 拋出 `code: "INVALID_ARGUMENT"` 錯誤
2. `"returns InvalidKeyError when private key is zero (ethers v6 curve.n error)"` — mock Wallet 拋出 `"Expected valid bigint: 0 < bigint < curve.n"` 錯誤（對應 CR-001 修復的回歸測試）

---

### CR-004 (P1) — ACCEPT

**R1 指控**: `createWallet.ts` 第 12-14 行的錯誤訊息與 Spec §5.2 Task #3 DoD 明確要求的字串不符。

**Spec DoD 要求**: `"UnexpectedError: mnemonic is null after createRandom"`
**實際實作**: `"UnexpectedError: mnemonic is null — wallet.createRandom() produced a wallet without a mnemonic phrase"`

**R2 獨立評估**: R1 的指控在技術上正確。Spec DoD 是確切的字串規格，而實作偏離了這個規格（即使更詳盡）。若上層 openclaw runtime 對錯誤訊息進行字串解析或匹配，此差異會造成相容性問題。

實作「更詳盡」不是不改的理由，因為 Spec 是合約。如果要保留更詳盡的訊息，應該更新 Spec，而不是讓實作靜默偏離 Spec。

**修復**: 將 `createWallet.ts` 第 12-14 行改為與 Spec 完全一致的字串：
```typescript
error: "UnexpectedError: mnemonic is null after createRandom"
```

**附注**: `createWallet.test.ts` 的 mnemonic null 測試只用 `/UnexpectedError/` 正則驗證，不驗證完整字串，故測試仍通過但不足以防止此類偏離。R1 的觀察準確。

---

### CR-005 (P1) — ACCEPT

**R1 指控**: README 缺少 `npm login` / `NPM_TOKEN` 設定說明。Spec Task #10 DoD 明確要求此說明。

**R2 驗證**: 讀取 README.md 全文，確認無任何發布相關說明（`npm login`、`NPM_TOKEN`、`npm publish` 流程）。R1 指控屬實。

**修復**: 新增 "Publishing" 段落，說明：
1. `npm login` 互動式認證
2. `NPM_TOKEN` 環境變數方式（CI/CD 場景）
3. `npm publish` 步驟（包含 prepublishOnly 自動執行 build + test 的說明）
4. GitHub Actions CI/CD 的設定指引

---

### CR-006 (P2) — ACCEPT（部分）

**R1 指控**: `sendTransaction.test.ts` 的 mock 地址 `"0xSenderAddress000000000000000000000000001"` 含非 hex 字元，`isAddress()` 回傳 false，讓回傳值的地址格式驗證失去意義。

**R2 驗證**:
```
ethers.isAddress("0xSenderAddress000000000000000000000000001") === false  // 確認
```

R1 分析正確。雖然目前測試不因此失敗，但若未來加入 from 地址的 isAddress 驗證，測試會產生誤報。

**修復**: 將 `sendTransaction.test.ts` 的 `mockAddress` 改為 Hardhat account #0 的確定性測試地址：
```typescript
const mockAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
```

**說明**: `signMessage.test.ts` 中的 `"0xSigner0000000000000000000000000000000001"` 同樣問題，但用戶任務說明只列出 `sendTransaction.test.ts`，且修改範圍僅限於已列出的需要修復文件，故 signMessage.test.ts 的 mock 地址維持原狀（留給 R3 裁決是否需要額外修復）。

---

### CR-007 (P2) — ACCEPT（部分，需修正 R1 建議本身的錯誤）

**R1 指控**: `getBalance.test.ts` 第 93 行 InvalidContractError 測試使用 `"0x0000000000000000000000000000000000000001"`（EVM ecRecover precompile），語意不清晰，建議改用 `"0x000000000000000000000000000000000badC0de"`。

**R2 驗證 — R1 建議本身有問題**:
```
isAddress("0x000000000000000000000000000000000badC0de") === false
```
R1 建議的替換地址是不合法的 Ethereum 地址（EIP-55 checksum 錯誤），若直接採用，加入 CR-002 的 tokenAddress 驗證後，該測試案例會被前置 ValidationError 攔截，從而變成 ValidationError 而非 InvalidContractError，導致測試失敗（已實際驗證）。

**修復**: 採用語意清楚且確實通過 `isAddress()` 的地址：
```typescript
tokenAddress: "0x0000000000000000000000000000000000000Bad"
```
此地址：(1) isAddress 回傳 true；(2) 不是 EVM precompile；(3) 語意上清楚為 dummy 測試地址。

---

## 修復結果

### npm test 輸出

```
> openclaw-arbitrum-wallet@1.0.0 test
> jest

PASS tests/createWallet.test.ts
PASS tests/signMessage.test.ts
PASS tests/sendTransaction.test.ts
PASS tests/getBalance.test.ts

Test Suites: 4 passed, 4 total
Tests:       22 passed, 22 total
Snapshots:   0 total
Time:        2.173 s
Ran all test suites.
```

**修復前**: 19 個測試通過
**修復後**: 22 個測試通過（新增 3 個測試案例）

### npm run build 輸出

```
> openclaw-arbitrum-wallet@1.0.0 build
> tsc
```

TypeScript 編譯零錯誤，零警告。

---

## 統計

| 類型 | 數量 | Finding IDs |
|------|------|-------------|
| ACCEPT | 7 | CR-001, CR-002, CR-003, CR-004, CR-005, CR-006 (部分), CR-007 (部分) |
| PARTIAL | 0 | — |
| REJECT | 0 | — |

**CR-006 附注**: 接受問題本身，但只修復了 sendTransaction.test.ts（在任務範圍內），signMessage.test.ts 的相同問題暫未修復。

**CR-007 附注**: 接受問題方向（precompile 地址語意不清），但反駁 R1 建議的替換地址（`0x000000000000000000000000000000000badC0de` 不合法），改用 `0x0000000000000000000000000000000000000Bad`。
