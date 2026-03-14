# S5 Code Review — R1 挑戰者審查報告

> **審查者**: R1 挑戰者
> **日期**: 2026-03-14
> **參照 Spec**: `dev/specs/openclaw-arbitrum-wallet/s1_dev_spec.md`
> **審查對象**: `src/` 全部 handler + `tests/` 全部測試 + `README.md`
> **ethers 實際版本**: v6.16.0（已驗證）

---

## 審查摘要

| 嚴重度 | 數量 |
|--------|------|
| P0     | 1    |
| P1     | 4    |
| P2     | 2    |
| **合計** | **7** |

---

## Findings

---

### CR-001

- **ID**: CR-001
- **嚴重度**: P0
- **檔案**: `src/tools/sendTransaction.ts` 第 61–73 行
- **描述**: InvalidKeyError 捕捉範圍不完整。ethers v6 建立 `Wallet` 時若私鑰為全零或超出 secp256k1 曲線 n 值，拋出的錯誤為 `code: undefined`、`message: "Expected valid bigint: 0 < bigint < curve.n"`。現行的錯誤分類邏輯：
  ```typescript
  code === "INVALID_ARGUMENT" ||
  msg.toLowerCase().includes("invalid private key") ||
  msg.toLowerCase().includes("invalid argument")
  ```
  三個條件均不符合，導致此類無效私鑰被 fallthrough 至 `TransactionError` 而非 `InvalidKeyError`。

  驗證過程：本機執行 `new ethers.Wallet('0x0000000000000000000000000000000000000000000000000000000000000000')`，確認 `e.code === undefined`，`e.message` 為 `"Expected valid bigint: 0 < bigint < curve.n"`，三個字串 check 均不匹配。

  `signMessage.ts` 有相同缺陷（第 22–26 行），因為兩者使用相同的錯誤分類邏輯。

- **建議**: 在 InvalidKeyError 判斷條件補上：
  ```typescript
  msg.toLowerCase().includes("valid bigint") ||
  msg.toLowerCase().includes("curve.n")
  ```
  或更穩健的做法：直接在 `new Wallet(privateKey)` 之前用 ethers 的工具函數預先驗證私鑰格式，並在分類邏輯末段加上最後一層 `includes("bigint")` 防護。

---

### CR-002

- **ID**: CR-002
- **嚴重度**: P1
- **檔案**: `src/tools/getBalance.ts` 第 44–56 行
- **描述**: `tokenAddress` 未做 `isAddress()` 前置驗證。若傳入 `tokenAddress: "not-an-address"`，`new Contract("not-an-address", ERC20_ABI, provider)` 不會在建構時拋錯（已驗證：`contract.target === "not-an-address"` 正常建構），錯誤在 `balanceOf` 呼叫時才出現（`code: BUFFER_OVERRUN`），被 inner try/catch 捕捉並回傳 `InvalidContractError`。

  最終行為雖然不會靜默失敗，但錯誤分類語意有問題：`"not-an-address"` 應該觸發 `ValidationError`（格式驗證），而不是 `InvalidContractError`（合約行為異常）。Spec §3.2 E4 明確定義 `InvalidContractError` 用於「tokenAddress 不是 ERC20 合約」（即合法地址但無 ERC20 介面），與格式無效是兩種不同情境。

  相較之下，`address` 欄位在第 19–24 行已正確做了 `isAddress()` 驗證，但 `tokenAddress` 漏掉了。

- **建議**: 在 ERC20 路徑進入前加入驗證：
  ```typescript
  if (params.tokenAddress && !isAddress(params.tokenAddress)) {
    return {
      success: false,
      error: `ValidationError: Invalid token address "${params.tokenAddress}"`,
    };
  }
  ```

---

### CR-003

- **ID**: CR-003
- **嚴重度**: P1
- **檔案**: `tests/sendTransaction.test.ts`
- **描述**: `sendTransaction` 測試缺少 `InvalidKeyError` 測試案例。Spec Task #5 DoD 明確要求「私鑰錯誤回傳 InvalidKeyError」必須有測試覆蓋，`sendTransaction.test.ts` 共有 6 個測試（success、amount=0、amount=-1、invalid to、InsufficientFundsError、NetworkError），但沒有任何一個測試 `Wallet` 建構因私鑰錯誤拋出後進入 `InvalidKeyError` 分支的情境。

  特別是搭配 CR-001，此缺陷意味著即便修正了 CR-001 的錯誤分類邏輯，也沒有測試能回歸驗證修正是否正確。

- **建議**: 補充測試：
  ```typescript
  it("returns InvalidKeyError when private key is invalid", async () => {
    const { Wallet } = require("ethers");
    (Wallet as jest.Mock).mockImplementationOnce(() => {
      throw Object.assign(new Error("invalid private key"), { code: "INVALID_ARGUMENT" });
    });
    const result = await sendTransactionHandler({
      privateKey: "not-a-valid-key",
      to: VALID_TO,
      amount: "0.1",
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/InvalidKeyError/);
  });
  ```

---

### CR-004

- **ID**: CR-004
- **嚴重度**: P1
- **檔案**: `src/tools/createWallet.ts` 第 13 行；Spec §5.2 Task #3
- **描述**: `mnemonic` 為 null 時的錯誤訊息與 Spec 要求的確切措辭不一致。

  **Spec 要求**:
  ```
  "UnexpectedError: mnemonic is null after createRandom"
  ```
  **實際實作**:
  ```
  "UnexpectedError: mnemonic is null — wallet.createRandom() produced a wallet without a mnemonic phrase"
  ```

  測試（`createWallet.test.ts` 第 37 行）只用 `/UnexpectedError/` 正則驗證前綴，未驗證完整訊息，所以測試通過但實際回傳的錯誤格式與 spec 不符。若上層 openclaw runtime 有針對錯誤訊息做字串比對或解析，此差異可能造成相容性問題。

- **建議**: 將實作改為與 spec 一致的確切訊息：
  ```typescript
  error: "UnexpectedError: mnemonic is null after createRandom"
  ```
  若刻意選擇更詳盡的措辭，需在 spec 中更新 DoD 說明，或讓測試驗證確切的訊息字串。

---

### CR-005

- **ID**: CR-005
- **嚴重度**: P1
- **檔案**: `README.md`；Spec §5.2 Task #10 DoD
- **描述**: README 未包含 `npm login` / `NPM_TOKEN` 設定說明。Spec Task #10 DoD 明確要求「README 或 CONTRIBUTING 文件說明 `npm login` / `NPM_TOKEN` 設定方式（使用者初次發布需知）」。README 目前有安裝、使用、錯誤說明與安全警告，但完全沒有發布相關說明（如 `npm login`、NPM_TOKEN 環境變數設定、`npm publish` 步驟）。

- **建議**: 在 README 新增「Publishing」或「Contributing」段落，說明：
  1. 執行 `npm login` 認證（或設定 `NPM_TOKEN` 環境變數）
  2. 執行 `npm publish`（`prepublishOnly` 會自動 build + test）
  3. 如需自動化 CI/CD，可設定 GitHub Secrets

---

### CR-006

- **ID**: CR-006
- **嚴重度**: P2
- **檔案**: `tests/sendTransaction.test.ts` 第 4 行；`tests/signMessage.test.ts` 第 4 行
- **描述**: Mock 地址使用非合法 Ethereum 地址字串。

  - `sendTransaction.test.ts`: `mockAddress = "0xSenderAddress000000000000000000000000001"` — 含非 hex 字元（`S`、`n`、`d`、`r`）
  - `signMessage.test.ts`: `mockAddress = "0xSigner0000000000000000000000000000000001"` — 含非 hex 字元（`S`、`g`、`r`）

  已驗證：`ethers.isAddress("0xSenderAddress000000000000000000000000001")` 回傳 `false`。

  這些 mock 地址的用途是 `wallet.address`（由 mock Wallet 回傳），不會被 `isAddress` 驗證，測試本身仍可通過。但這樣的假地址讓測試的「回傳值格式驗證」失去意義——若未來需求追加「from 欄位也需通過 isAddress 驗證」，這些測試會繼續通過而掩蓋實際問題。

- **建議**: 改用合法的測試地址（如 Hardhat/Foundry 內建的確定性測試地址）：
  ```typescript
  const mockAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"; // Hardhat account #0
  ```

---

### CR-007

- **ID**: CR-007
- **嚴重度**: P2
- **檔案**: `tests/getBalance.test.ts` 第 93 行
- **描述**: `InvalidContractError` 測試所用的 `tokenAddress` 為 `"0x0000000000000000000000000000000000000001"`（全零加一），雖然是合法 Ethereum 地址格式，但這是 EVM 預編譯合約地址（`ecRecover` precompile），不是一個普通的「無效 ERC20 合約地址」。使用更中性的測試地址（如 `"0x0000000000000000000000000000000000000bad"`）可以讓測試意圖更清晰，避免與 EVM 預編譯合約語意混淆。

  此問題對目前測試結果無影響（mock 已完全覆蓋網路層），純屬可讀性問題。

- **建議**: 改用語意更清晰的 dummy 地址：
  ```typescript
  tokenAddress: "0x000000000000000000000000000000000badC0de",
  ```

---

## 附錄：已驗證通過的審查項目

以下項目審查後確認符合 spec，無問題：

| 項目 | 結果 |
|------|------|
| 所有 handler 無 `console.log` 輸出私鑰 | ✅ 通過 |
| 私鑰僅在 handler scope 內使用，不做模組級暫存 | ✅ 通過 |
| `createWallet` mnemonic null 時回傳 error 不 fallback 空字串 | ✅ 通過 |
| `getBalance` ERC20 decimals/symbol 使用個別 `.catch()` fallback（非整體 Promise.all catch）| ✅ 通過（先 balanceOf 獨立 try/catch，再 Promise.all with per-field .catch）|
| `getBalance` decimals bigint 轉 number 使用 `Number(decimalsRaw)` | ✅ 通過 |
| ethers v6 API 使用正確（JsonRpcProvider、parseEther、formatEther、isAddress 均直接 import）| ✅ 通過 |
| `sendTransaction` amount 驗證：`parseEther` 後 `<= 0n` 檢查（涵蓋 0 和負數）| ✅ 通過（驗證：`parseEther("-1")` 回傳 `-1000000000000000000n`，`<= 0n` 為 true）|
| 測試全面 mock ethers，無真實 RPC 呼叫 | ✅ 通過 |
| `getBalance` address 欄位有 `isAddress()` 驗證 | ✅ 通過 |
| `sendTransaction` to 欄位有 `isAddress()` 驗證 | ✅ 通過 |
| `package.json` `prepublishOnly` 包含 build + test | ✅ 通過 |
| README 包含 fire-and-forget 警告 | ✅ 通過 |
| README 包含私鑰 logging 風險警告 | ✅ 通過 |
| README 建議使用私人 RPC | ✅ 通過 |
| `src/index.ts` 同時 export default manifest 和具名 handler exports | ✅ 通過 |
| `mnemonic?.phrase`（v6 可能為 null）正確處理 | ✅ 通過 |
