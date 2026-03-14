# R2 回應

**審查者**: R2 防禦者（architect）
**日期**: 2026-03-14
**審查對象**: `s1_dev_spec.md`
**R1 findings 來源**: `r1_findings.md`

---

## 總覽

- 接受：10 條
- 部分接受：1 條（SR-010）
- 拒絕：0 條
- 已修改 spec：12 處

---

## 逐條回應

### SR-001 — P0 — ACCEPT

**判斷**: ACCEPT

**理由**: R1 的技術分析正確。ethers v6 透過 ABI codec 解析 `uint8` 回傳值時，產出型別為 `bigint`（不是 `number`）。`GetBalanceData.decimals` 宣告為 `number`，若實作者直接將 `contract.decimals()` 的結果指派給該欄位，TypeScript strict 模式下會報 `Type 'bigint' is not assignable to type 'number'` 錯誤。原始 spec 完全沒有說明轉換責任歸屬，是一個會讓實作者踩坑的設計缺漏。

ERC20 decimals 實際值在 0-255 之間（uint8 語意），`Number()` 轉換完全安全，無精度問題。

**行動（已修改）**: 在 Task #4 設計規格 ERC20 路徑補上：
```typescript
const decimalsNum = Number(decimals); // ERC20 decimals 為 uint8，ethers v6 解析為 bigint，Number() 轉換安全（值域 0-255）
```
同時在 `GetBalanceData.decimals` 的 interface 說明中標注「已從 bigint 轉換為 number」。Task #4 DoD 新增一條明確要求此轉換。

**codebase 證據**: `s1_dev_spec.md` §4.1 `GetBalanceData.decimals: number`，Task #4 原文只說「decimals 查詢失敗時 fallback 為 18」，完全沒有 bigint→number 轉換說明。

---

### SR-002 — P0 — ACCEPT

**判斷**: ACCEPT

**理由**: R1 正確。原始 spec Task #1 的 `prepublishOnly: "npm run build"` 只跑 build，不跑測試。`prepublishOnly` 的設計目的就是在 `npm publish` 前做最後品質把關，只 build 沒有 test 代表測試完全可以在發布前被跳過。這是一個明確的品質控管漏洞。

**行動（已修改）**:
- Task #1 設計規格 `scripts.prepublishOnly` 改為 `"npm run build && npm test"`
- Task #10 DoD 新增條件：「`npm test` 全部通過後才能執行 `npm publish`（`prepublishOnly` 強制執行 build + test）」

**codebase 證據**: `s1_dev_spec.md` Task #1：`"scripts.prepublishOnly": "npm run build"`（原文）。

---

### SR-003 — P0 — ACCEPT

**判斷**: ACCEPT

**理由**: R1 的技術描述精確。TypeScript `export default obj` 編譯為 CommonJS 後，`module.exports = { default: obj, __esModule: true }`，因此 `require("openclaw-arbitrum-wallet")` 取得的是 `{ default: manifest, __esModule: true }` 而不是 manifest 本體。

原始 Task #7 DoD 文字「`require("openclaw-arbitrum-wallet")` 可取得 manifest」是技術上的錯誤描述，但驗收指令 `s.default.tools.length` 是正確的。這個矛盾會讓實作者和 openclaw runtime 使用者產生困惑。

**行動（已修改）**:
- Task #7 DoD 文字改為「`require("openclaw-arbitrum-wallet").default` 可取得 manifest」
- Task #7 設計規格加入 CJS interop 說明段落，解釋 `.default` 存取的必要性，並說明若 runtime 需要直接 `require()` 即得 manifest，實作層需加 `module.exports = manifest; module.exports.default = manifest;` 的雙重 export 寫法
- 7.1 功能驗收表第 9 條同步修正為 `require("openclaw-arbitrum-wallet").default`
- Unknown 決策表新增此項決策

**codebase 證據**: `s1_dev_spec.md` Task #7 DoD 原文第四條，與同 Task 驗收指令「`s.default.tools.length`」相互矛盾。

---

### SR-004 — P1 — ACCEPT

**判斷**: ACCEPT

**理由**: R1 指出的威脅是真實且重要的。`send_transaction` 和 `sign_message` 接收 `privateKey` 作為明文字串參數，在典型的 agent runtime 架構中（如 OpenAI Function Calling、Anthropic Tool Use），tool call 的完整 input JSON 會被記錄在 conversation history 或 trace logs 中。原始 spec §6.3 的安全策略只聚焦在 handler 內部不做 console.log，完全沒有提到這個 handler 外部的 logging 威脅。

這個風險無法由本 package 解決（因為是 runtime 側的行為），但 spec 應該明確記錄此風險並要求 README 說明。

**行動（已修改）**:
- §6.3 私鑰安全策略新增一列「Agent runtime logging 風險」，說明 privateKey 出現在 tool call JSON 參數中的風險，以及本 package 無法控制 runtime logging 行為的事實
- §8 風險表新增「Agent runtime logging 記錄私鑰」風險項，影響=高、機率=中
- Task #9 README DoD 新增條件：明確警告 privateKey 會出現在 tool call JSON 參數中，呼叫方需確保 runtime 不記錄 tool inputs

**codebase 證據**: `s1_dev_spec.md` §6.3 原文，無任何 agent runtime logging 相關說明。

---

### SR-005 — P1 — ACCEPT

**判斷**: ACCEPT

**理由**: R1 的技術分析準確。`Promise.all` 的語意是：陣列中任何一個 Promise reject，整體立即 reject。原始 spec 同時要求「用 `Promise.all` 平行查詢」且「decimals/symbol 失敗時個別 fallback」，這兩個要求在技術上是衝突的——你不能用 `Promise.all` + 讓個別成員失敗後 fallback，因為任何一個成員 reject 就整體炸掉，不會執行 fallback 邏輯。

正確做法是在傳入 `Promise.all` 之前，對每個可能失敗的 call 加 `.catch()`，使其永遠 resolve（不 reject），再傳入 `Promise.all`。

**行動（已修改）**: Task #4 設計規格 ERC20 路徑改寫為：
```typescript
const [balance, decimals, symbol] = await Promise.all([
  contract.balanceOf(params.address),
  contract.decimals().catch(() => 18n),
  contract.symbol().catch(() => "UNKNOWN")
]);
```
同時更新 Task #4 DoD，明確標注 fallback 需透過個別 `.catch()` 實現，不依賴 `Promise.all` 整體捕獲。

**codebase 證據**: `s1_dev_spec.md` Task #4 原文：「平行查詢: `Promise.all([...])`」且「decimals 查詢失敗時 fallback 為 18 / symbol 查詢失敗時 fallback 為 "UNKNOWN"」——兩句話並列但邏輯衝突。

---

### SR-006 — P1 — ACCEPT

**判斷**: ACCEPT

**理由**: R1 正確。`send_transaction` 不等待 `tx.wait()` 是蓄意的設計決策（已記錄在 §6.1），但這個 fire-and-forget 語意在 tool description 和 README 中完全沒有向 agent 說明。原始 tool description「Send ETH on Arbitrum One from a private key-controlled account to a target address」讓 agent 容易誤解 txHash 代表交易成功。實際上交易可能廣播後在鏈上 revert，agent 若不 poll receipt 就無法知道。

這個資訊不對稱會讓使用此 skill 的 agent 做出錯誤決策（認為轉帳成功就繼續下一步）。

**行動（已修改）**:
- §4.2 manifest `send_transaction` tool description 改為：「Send ETH on Arbitrum One. Returns txHash immediately after broadcast. Does not wait for on-chain confirmation. Transaction may still revert on-chain — caller must poll the receipt to confirm success.」
- Task #9 README DoD 新增條件：說明 `send_transaction` 為 fire-and-forget，需自行 poll receipt 確認成功

**codebase 證據**: `s1_dev_spec.md` §4.2 manifest `send_transaction.description` 原文，無任何 fire-and-forget 說明。

---

### SR-007 — P1 — ACCEPT

**判斷**: ACCEPT

**理由**: R1 正確識別了真實的邊界情況缺漏。原始 spec Task #5 的參數驗證只涵蓋 `amount > 0`，未驗證 `to` 地址格式；Task #4 未驗證 `address` 格式。若傳入非地址字串，ethers 會拋出內部錯誤（error message 類似 `invalid address`），該錯誤無法被 spec 定義的 `InvalidKeyError / InsufficientFundsError / NetworkError / TransactionError` 精確分類，最終可能被捕獲為 `TransactionError`，讓呼叫方無法判斷是地址格式問題。

`ethers.isAddress()` 是 ethers v6 內建的地址格式驗證工具，使用成本極低。

**行動（已修改）**:
- Task #4 設計規格新增參數驗證：`ethers.isAddress(params.address)` 為 false 時回傳 `ValidationError: Invalid address`
- Task #4 需 import `isAddress` from ethers
- Task #4 DoD 新增地址格式驗證條件
- Task #5 設計規格參數驗證加上：`ethers.isAddress(params.to)` 為 false 時回傳 `ValidationError: Invalid recipient address`
- Task #5 需 import `isAddress` from ethers
- Task #5 DoD 新增 `to` 地址格式驗證條件
- §3.2 異常流程表新增 E7（地址格式錯誤），§3.3 例外追溯表同步新增 E7

**codebase 證據**: `s1_dev_spec.md` Task #5 設計規格原文，參數驗證段落只有 amount > 0，沒有 `to` 驗證；Task #4 原文無任何 address 驗證。

---

### SR-008 — P1 — ACCEPT

**判斷**: ACCEPT

**理由**: R1 的覆蓋缺口分析準確。Task #4 DoD 明確要求「ERC20 symbol fallback 為 UNKNOWN」和「無效 ERC20 地址回傳 InvalidContractError」，但 Task #8 的 `getBalance.test.ts` 測試清單只列出：ETH 路徑、ERC20 路徑、ERC20 decimals fallback、RPC 失敗——確實缺少這兩個案例。DoD 和測試設計不一致是 spec 品質問題，會讓實作者可能寫出不完整的測試。

**行動（已修改）**:
- Task #8 `getBalance.test.ts` 測試清單新增：「測試 ERC20 symbol fallback（mock `contract.symbol()` 拋錯，驗證結果 symbol="UNKNOWN"）」
- 新增：「測試無效 ERC20 地址回傳 InvalidContractError（mock `contract.balanceOf()` revert）」
- Task #8 DoD 新增一條明確列出 getBalance 完整測試覆蓋要求

**codebase 證據**: `s1_dev_spec.md` Task #8 `getBalance.test.ts` 原文列表，對照 Task #4 DoD 第五、六條，缺口明確。

---

### SR-009 — P2 — ACCEPT

**判斷**: ACCEPT

**理由**: R1 的建議有技術依據。Node.js 12+ 和 webpack 5、Vite 等現代 bundler 優先查找 `exports` 欄位，若不存在才 fallback 到 `main`。對 CJS-only package 加上 `exports` 是低成本、高回報的做法——明確宣告 entry point，防止消費者意外 deep import（如 `require("openclaw-arbitrum-wallet/dist/tools/createWallet")`），並為未來可能的 ESM 支援留下擴充空間。

**行動（已修改）**: Task #1 `package.json` 設計規格新增 `exports` 欄位：
```json
"exports": { ".": { "require": "./dist/index.js", "types": "./dist/index.d.ts" } }
```

**codebase 證據**: `s1_dev_spec.md` Task #1 設計規格原文，只有 `main` 和 `types`，無 `exports`。

---

### SR-010 — P2 — PARTIAL_ACCEPT

**判斷**: PARTIAL_ACCEPT

**理由**: R1 正確指出 Task #10 缺少 `npm login` / `NPM_TOKEN` 說明。s0 §3 成功標準確實提到「透過 GitHub → npm publish 完成發布」，s1 沒有對應設計是遺漏。

**部分接受的理由**：R1 建議新增 GitHub Actions workflow（`.github/workflows/publish.yml`）作為選項，但 s0 §6 技術棧寫「發布：npm publish，透過 GitHub CLI 觸發或手動」，沒有明確要求 CI/CD 自動化。新增 GitHub Actions 是額外範圍擴張，不在原始 s0 scope 內。本次採用明確決策：手動 `npm publish` 流程（不建立 GitHub Actions），但保留未來擴充說明。

**行動（已修改）**:
- Task #10 設計規格新增「發布前置步驟（manual publish 流程）」段落，說明 `npm login` / `NPM_TOKEN` 設定
- Task #10 DoD 新增：「README 或 CONTRIBUTING 文件說明 `npm login` / `NPM_TOKEN` 設定方式」
- Task #10 設計規格明確寫明 CI/CD 決策：本次採用手動 publish，若未來需自動化可新增 GitHub Actions
- **不新增** GitHub Actions workflow 任務（超出 s0 原始 scope）

**codebase 證據**: `s1_dev_spec.md` Task #10 原文，設計規格段落只說「`.npmignore` 排除」，無任何 npm 認證流程說明。

---

### SR-011 — P2 — ACCEPT

**判斷**: ACCEPT

**理由**: R1 的分析正確。`Wallet.createRandom()` 在 ethers v6 正常情況下必定產生 mnemonic，`mnemonic` 為 null 只發生在 `new Wallet(privateKey)` 的情況，代表如果 `createRandom()` 真的回傳 null mnemonic，那是 ethers 庫本身出現了非預期狀態。Silent fallback 空字串會讓呼叫方收到 `{ success: true, data: { mnemonic: "" } }`，誤以為錢包建立成功，但實際上沒有可備份的助記詞。這是一個設計上的 silent failure，比直接報錯更危險。

**行動（已修改）**: Task #3 設計規格改為：「若 `mnemonic` 為 null 屬於非預期狀態，**必須回傳錯誤**：`{ success: false, error: "UnexpectedError: mnemonic is null after createRandom" }`，不得 silent fallback 空字串」。Task #3 DoD 同步更新。

**codebase 證據**: `s1_dev_spec.md` Task #3 設計規格原文：「若 `mnemonic` 為 null，仍回傳 address 和 privateKey，mnemonic 設為空字串」。

---

### SR-012 — P2 — ACCEPT

**判斷**: ACCEPT

**理由**: R1 正確。`arb1.arbitrum.io/rpc` 是公共節點，有 rate limit，對於 production agent 頻繁呼叫的場景是可靠性瓶頸。spec 雖然已允許傳入自訂 `rpcUrl`，但 README 如果沒有說明這個建議，大部分使用者不會主動去配置。這是文件層面的最佳實踐缺失，影響 production 可靠性。

**行動（已修改）**: Task #9 README 設計規格新增「RPC 建議」段落，說明預設公開 RPC 有速率限制，production 環境建議使用私人 RPC（Alchemy / Infura / QuickNode）並透過 `rpcUrl` 參數傳入。Task #9 DoD 新增對應條件。

**codebase 證據**: `s1_dev_spec.md` Task #9 設計規格原文，安全警告段落只有「私鑰責任歸屬、不做持久化」，無 RPC 最佳實踐說明。

---

## 修改位置彙總

| # | SR ID | 修改位置 | 修改類型 |
|---|-------|---------|---------|
| 1 | SR-001 | §4.1 `GetBalanceData.decimals` 說明；Task #4 設計規格 ERC20 路徑；Task #4 DoD | 補充型別轉換說明 |
| 2 | SR-002 | Task #1 `scripts.prepublishOnly`；Task #10 DoD | 修正腳本、補 DoD 條件 |
| 3 | SR-003 | §4.2 `src/index.ts` 設計規格；Task #7 DoD；§7.1 第 9 條；Unknown 決策表 | 修正 DoD 文字、補 CJS interop 說明 |
| 4 | SR-004 | §6.3 私鑰安全策略；§8 風險表；Task #9 DoD | 新增 runtime logging 風險說明 |
| 5 | SR-005 | Task #4 設計規格 ERC20 路徑；Task #4 DoD | 修正 Promise.all + 個別 .catch() 寫法 |
| 6 | SR-006 | §4.2 `send_transaction.description`；Task #9 DoD | 修正 description、補 README DoD |
| 7 | SR-007 | Task #4 設計規格、DoD；Task #5 設計規格、DoD；§3.2 異常流程表；§3.3 例外追溯表 | 新增地址格式驗證 |
| 8 | SR-008 | Task #8 設計規格 `getBalance.test.ts`；Task #8 DoD | 補充測試案例說明 |
| 9 | SR-009 | Task #1 `package.json` 設計規格 | 新增 `exports` 欄位 |
| 10 | SR-010 | Task #10 設計規格；Task #10 DoD | 新增 npm login/NPM_TOKEN 說明 |
| 11 | SR-011 | Task #3 設計規格；Task #3 DoD | 修正 mnemonic null 處理策略 |
| 12 | SR-012 | Task #9 設計規格；Task #9 DoD | 新增私人 RPC 建議說明 |
