# Pre-Review Report: openclaw-arbitrum-wallet Dev Spec

**審查對象**: `dev/specs/openclaw-arbitrum-wallet/s1_dev_spec.md`
**參照基準**: `dev/specs/openclaw-arbitrum-wallet/s0_brief_spec.md`
**審查日期**: 2026-03-14
**審查類型**: 預審（Greenfield — spec 本身一致性與完整性）
**審查員**: codebase-explorer

---

## 審查摘要

| 嚴重度 | 數量 |
|--------|------|
| P0     | 1    |
| P1     | 3    |
| P2     | 4    |
| **合計** | **8** |

P0 問題為 ethers v6 的 bigint/number 型別不一致，在 TypeScript strict 模式下必定造成編譯錯誤，需在實作前修正 spec。其餘 P1 問題若不處理，實作者可能寫出邏輯有誤或測試不完整的代碼。

---

## Findings

---

### SR-PRE-001

- **嚴重度**: P0
- **位置**: Section 4.1 `GetBalanceData.decimals`、Section 4.3 ERC20 ABI、Task #4 設計規格
- **描述**:

  ethers v6 的 ABI 解碼規則：所有 `uint*` / `int*` 型別一律映射為 JavaScript `bigint`。因此 `ERC20_ABI` 中 `"function decimals() view returns (uint8)"` 的 Contract 呼叫回傳值型別是 `bigint`，不是 `number`。

  然而 `GetBalanceData` 介面定義：
  ```typescript
  decimals: number;
  ```

  在 TypeScript strict 模式（spec Task #1 指定 `strict: true`）下，直接將 `bigint` 賦值給 `number` 欄位會造成編譯錯誤：
  ```
  Type 'bigint' is not assignable to type 'number'.
  ```

  Task #4 的設計規格沒有提到需要做型別轉換，實作者按 spec 照寫會遇到 `tsc` 報錯。

- **建議**:

  在 Task #4 設計規格的 ERC20 路徑補充明確的轉換步驟：
  ```typescript
  const [rawBalance, rawDecimals, rawSymbol] = await Promise.all([...]);
  const decimals = Number(rawDecimals); // bigint → number
  ```
  並在 Section 4.4 的 API 對照表中新增一列：

  | Contract.decimals() 回傳型別 | `bigint`（uint8 在 v6 統一映射 bigint） |

---

### SR-PRE-002

- **嚴重度**: P1
- **位置**: Task #4 設計規格 ERC20 路徑
- **描述**:

  Task #4 同時給出兩個互相矛盾的規格：

  1. 「平行查詢: `Promise.all([contract.balanceOf(address), contract.decimals(), contract.symbol()])`」
  2. 「decimals 查詢失敗時 fallback 為 18」、「symbol 查詢失敗時 fallback 為 "UNKNOWN"」

  `Promise.all` 的語意是：任一 Promise reject，整體立即 reject。因此若 `contract.decimals()` 失敗，整個 `Promise.all` 失敗，根本不會進入 fallback 邏輯，而是直接進入 catch 被分類成 `InvalidContractError`。

  按此 spec 實作，decimals/symbol 的 fallback 永遠不會被執行。

- **建議**:

  在設計規格中改為對 decimals 和 symbol 個別加 catch fallback：
  ```typescript
  const [balance, rawDecimals, symbol] = await Promise.all([
    contract.balanceOf(params.address),
    contract.decimals().catch(() => 18n),
    contract.symbol().catch(() => "UNKNOWN")
  ]);
  ```
  或改用 `Promise.allSettled` 後再各自判斷 `status === "fulfilled"`。

  同時說明何時才觸發 `InvalidContractError`：僅在 `balanceOf` 本身失敗（合約根本不存在或 revert）時。

---

### SR-PRE-003

- **嚴重度**: P1
- **位置**: Section 7.1 功能驗收
- **描述**:

  S0 §7 定義了 6 個例外情境 E1~E6。S1 Section 3.3 追溯表聲稱全部覆蓋。但是 Section 7.1 的 9 條驗收標準中，只有 E1（NetworkError）、E3（InvalidKeyError）、E5（ValidationError）有對應驗收場景，以下兩個沒有：

  - **E2 InsufficientFundsError**（send_transaction ETH 不足）：7.1 無對應條目
  - **E4 InvalidContractError**（get_balance ERC20 地址無效）：7.1 無對應條目

  S1 Section 3.3 追溯表說「✅ 覆蓋」是指 handler 設計有處理，但驗收標準是用來確認實作是否正確的閘門。兩個 E 沒有進入驗收標準，代表 S6 測試階段沒有強制要求驗證這兩個錯誤路徑。

- **建議**:

  在 Section 7.1 新增兩條驗收場景：
  - 場景 10：send_transaction ETH 不足 → 回傳 `{ success: false, error: "InsufficientFundsError: ..." }` (FA3, P1)
  - 場景 11：get_balance ERC20 地址無效 → 回傳 `{ success: false, error: "InvalidContractError: ..." }` (FA2, P1)

---

### SR-PRE-004

- **嚴重度**: P1
- **位置**: Task #8 設計規格（getBalance.test.ts）
- **描述**:

  Task #8 的 bigint 注意事項只提到：
  > 「**bigint 注意**: Jest mock 回傳值使用 `BigInt(...)` 而非 `new BigNumber(...)`」

  並舉例 ETH balance mock 應用 `BigInt("1500000000000000000")`，但沒有說明 ERC20 路徑中 `contract.decimals()` 的 mock 回傳值也必須是 `BigInt(6)`（或 `6n`）而非 number `6`。

  若測試中用 `mockReturnValue(6)`（number），與真實 ethers v6 的行為（回傳 `6n` bigint）不符。這會掩蓋 SR-PRE-001 的問題（測試通過但實際使用時 tsc 報錯），或在修正 SR-PRE-001 後導致測試跑不過（因為 mock 和轉換邏輯不一致）。

- **建議**:

  在 Task #8 的 getBalance.test.ts 設計規格中明確補充：
  ```
  ERC20 路徑 mock:
  - contract.balanceOf mock 回傳 BigInt("100000000") （USDC 6 decimals 的 100 USDC）
  - contract.decimals mock 回傳 BigInt(6)  ← 必須是 bigint，不是 number 6
  - contract.symbol mock 回傳 "USDC"
  ```

---

### SR-PRE-005

- **嚴重度**: P2
- **位置**: Task #7 DoD 第4條 vs 驗收方式
- **描述**:

  Task #7 DoD 第4條：
  > `require("openclaw-arbitrum-wallet")` 可取得 manifest

  但同一 task 的驗收方式：
  > `node -e "const s = require('./dist'); console.log(s.default.tools.length)"`

  `src/index.ts` 使用 `export default`，TypeScript 編譯為 CommonJS 後，`require()` 得到的是 `{ default: manifest }`，需要 `.default` 才能取得 manifest 物件。驗收方式的寫法是正確的，但 DoD 描述少了 `.default`。

  不影響實作正確性（驗收方式才是執行依據），但會讓閱讀 DoD 的人產生錯誤認知。

- **建議**:

  DoD 第4條改為：
  > `require("openclaw-arbitrum-wallet").default` 可取得含 4 個 tools 的 manifest

---

### SR-PRE-006

- **嚴重度**: P2
- **位置**: Task #5 設計規格、Section 3.2 E5
- **描述**:

  E5 的定義和 Task #5 的驗證邏輯只涵蓋「amount <= 0」：
  > `amount 必須 > 0（用 parseEther(amount) 後比較 > 0n）`

  但 `params.amount` 是 string 型別，若傳入的是非法格式字串（如 `"abc"`、`""`、`"0.0.1"`），`parseEther("abc")` 在 ethers v6 會拋出例外（`Error: invalid value for BigNumberish`），這個例外在 amount > 0 的比較之前就發生，不會被 `> 0n` 的比較攔截。

  這個例外的錯誤分類在 spec 中未定義，可能被後續的 catch 包成 `TransactionError`（Task #5 的「其他」分類）而不是 `ValidationError`。

- **建議**:

  在 Task #5 設計規格補充：
  ```typescript
  // 參數驗證：先 try parseEther，若失敗視為 ValidationError
  let parsedAmount: bigint;
  try {
    parsedAmount = parseEther(params.amount);
  } catch {
    return { success: false, error: "ValidationError: invalid amount format" };
  }
  if (parsedAmount <= 0n) {
    return { success: false, error: "ValidationError: amount must be positive" };
  }
  ```

---

### SR-PRE-007

- **嚴重度**: P2
- **位置**: Task #3 DoD 第4條
- **描述**:

  Task #3 DoD 第4條：
  > mnemonic 是 12 個單字

  但 Task #3 設計規格同時說明：
  > 若 `mnemonic` 為 null，仍回傳 address 和 privateKey，mnemonic 設為空字串

  若 mnemonic 為 null 而回傳空字串，空字串顯然不是「12 個單字」，DoD 自相矛盾。在單元測試中若 mock 了 `mnemonic: null` 的情況，測試驗證邏輯要以空字串為 pass 還是失敗（12 個單字 DoD 要求），不清楚。

- **建議**:

  DoD 第4條修改為：
  > mnemonic 是 12 個英文單字（若 `Wallet.createRandom()` 回傳 `mnemonic` 為 null，則允許為空字串，此為降級行為）

---

### SR-PRE-008

- **嚴重度**: P2
- **位置**: S0 §3 成功標準 vs S1 任務清單
- **描述**:

  S0 成功標準最後一條：
  > GitHub repo 為 public，npm package 發布至 npmjs

  S1 任務清單 10 個 task 中，Task #10 涵蓋 npm publish 流程，但沒有任何 task 涵蓋「GitHub repo 設定為 public」。S1 Section 8 風險表也未提及。

  這個成功標準目前處於灰色地帶：既不在 S1 任務清單中，也不在明確的 out-of-scope 說明中。

- **建議**:

  兩擇其一：
  1. 在 Task #10 補充一條 DoD：「確認 GitHub repo 可見度為 public」
  2. 或在 S1 某處明確標注：「GitHub repo 可見度設定為手動 infra 操作，超出本 spec 範疇」

---

## 驗證依據

以下 ethers v6 技術事實為本報告的技術判斷依據，均可在 ethers v6 官方文件和原始碼中確認：

1. **bigint 統一**：ethers v6 移除 BigNumber，所有鏈上 uint/int 值（包括 Contract ABI 解碼結果）統一回傳原生 `bigint`。
2. **formatUnits 參數**：`formatUnits(value: BigNumberish, unitOrDecimals: BigNumberish | string)` 接受 bigint 作為第二參數，但 TypeScript 的型別賦值 `number = bigint` 仍然報錯。
3. **Promise.all 語意**：任一 reject 即整體 reject，這是標準 JavaScript Promise 行為，與 ethers 無關。
4. **export default + CommonJS**：TypeScript `esModuleInterop: true` + `module: "commonjs"` 輸出後，`require()` 得到 `{ default: ... }`，這是 TypeScript 的標準 CommonJS interop 行為。
