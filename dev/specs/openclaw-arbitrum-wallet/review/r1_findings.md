# R1 Findings — 對抗式審查

**審查對象**: `s1_dev_spec.md`
**對照基準**: `s0_brief_spec.md`
**審查者**: R1 挑戰者
**日期**: 2026-03-14

---

## 總覽

共發現 **12 項** findings：P0 × 3、P1 × 5、P2 × 4。

---

## SR-001

- **ID**: SR-001
- **嚴重度**: P0
- **章節**: §4.1 Handler 型別定義 — `GetBalanceData`
- **描述**: `GetBalanceData.decimals` 型別定義為 `number`，但 ethers v6 中 `Contract.decimals()` 的 ABI 回傳型別是 `uint8`，ethers v6 會將其解析為 **`bigint`**，不是 `number`。若直接將 `decimals` 賦值給宣告為 `number` 的欄位，TypeScript strict 模式下會編譯失敗（`bigint` 不可指派給 `number`）。此外，`formatUnits(balance, decimals)` 的第二個參數接受 `bigint | number | string`，ethers v6 本身沒問題，但 spec 的 interface 宣告是 `number`，代表實作層必須做 `Number(decimals)` 轉換，這個強制轉換有潛在的精度問題（雖然 decimals 實際上不超過 255，但 spec 沒有說清楚應在何處做轉換）。**spec 宣告 `decimals: number` 與 ethers v6 實際回傳的 bigint 之間存在型別不一致，必須在 spec 裡明確說明轉換責任歸哪裡、怎麼轉。**
- **建議**: 將 `GetBalanceData.decimals` 改為 `number`（保持不變），但在 Task #4 設計規格中明確加一行：`const decimalsNum = Number(await contract.decimals())`，並說明這個轉換是安全的（因為 ERC20 decimals 實際值在 0-255 之間）。如果不加這一行，實作者可能直接把 bigint 塞進 `number` 欄位，導致 `tsc --strict` 報錯。

---

## SR-002

- **ID**: SR-002
- **嚴重度**: P0
- **章節**: §5.1 任務清單、Task #1 設計規格 — `prepublishOnly`
- **描述**: `s0_brief_spec.md` 中沒有明確寫 `prepublishOnly` 腳本，但 `s1_dev_spec.md` Task #1 將 `prepublishOnly` 定義為 `"npm run build"`，**只跑 build，不跑 test**。若 build 成功但測試全掛，這個 package 仍然會被 publish 出去。這是一個品質控管漏洞——`prepublishOnly` 存在的意義就是在發布前做最後把關，只跑 build 是不足的。另外，Task #10 的驗收條件只做 `npm pack --dry-run`，完全沒有要求在 publish 前跑測試。兩個任務合在一起形成了一個測試完全被 publish 流程跳過的設計缺陷。
- **建議**: 將 `prepublishOnly` 改為 `"npm run build && npm test"`。Task #10 的 DoD 加上 `[ ] npm test 全部通過後才能執行 npm publish`。

---

## SR-003

- **ID**: SR-003
- **嚴重度**: P0
- **章節**: §4.2 Skill Manifest 格式、Task #7 DoD
- **描述**: Task #7 DoD 有一項：`require("openclaw-arbitrum-wallet")` 可取得 manifest。但 spec 的 `src/index.ts` 使用的是 `export default`（ESM 語法），TypeScript 編譯為 CommonJS 後，`require()` 的結果會是 `{ default: { name, version, ... } }`，**需要額外 `.default` 才能取得 manifest 物件**。Task #7 的驗收指令 `node -e "const s = require('./dist'); console.log(s.default.tools.length)"` 實際上是正確的（使用了 `.default`），但 DoD 文字寫的是「`require("openclaw-arbitrum-wallet")` 可取得 manifest」——這句話是錯的，因為 require 直接取得的是 `{ default: {...} }` 不是 manifest 本身。這會讓開發者搞混，也代表 openclaw agent runtime 必須用 `require("...").default` 才能正確讀到 manifest，spec 完全沒有說明這個細節，openclaw runtime 如何消費這個 package 的問題沒有被釐清。
- **建議**: DoD 文字改為「`require("openclaw-arbitrum-wallet").default` 可取得 manifest」；或在 `src/index.ts` 同時加上 `module.exports = manifest; module.exports.default = manifest;` 的 CJS 相容寫法，讓 `require()` 直接返回 manifest，並在 spec 中明確說明 openclaw runtime 預期的取用方式。

---

## SR-004

- **ID**: SR-004
- **嚴重度**: P1
- **章節**: §6.3 私鑰安全策略、Task #5 設計規格
- **描述**: spec 的安全策略聚焦在「handler 內不做 console.log」，但完全忽略了一個更根本的威脅：**openclaw agent runtime 本身很可能記錄每一次 tool call 的 input params**（包含 `privateKey`）到 conversation history 或 logs 中。`send_transaction` 和 `sign_message` 的 `privateKey` 欄位是明文字串，在 JSON-serialized tool call 參數裡完全可見。只要 agent runtime 有任何形式的 request logging，私鑰就會被持久化到 log 檔案或記憶體裡，handler 裡面多乾淨都沒有用。spec 的風險表（§8）只提到「私鑰記憶體洩漏」，沒有提到這個更嚴重的 agent-side logging 風險。README 的安全注意事項（Task #9 DoD）也沒有要求說明這個風險。
- **建議**: 在 §6.3 私鑰安全策略加一條：「agent runtime logging 風險：呼叫方（agent runtime）必須確保 tool call 的 input params 不被記錄至 persistent logs；本 package 無法控制此行為。」Task #9 README DoD 加上：`[ ] 明確警告 privateKey 會出現在 tool call 的 JSON 參數中，呼叫方需確保 runtime 不記錄 tool inputs`。

---

## SR-005

- **ID**: SR-005
- **嚴重度**: P1
- **章節**: Task #4 設計規格 — ERC20 Promise.all 與 fallback 設計
- **描述**: spec 要求使用 `Promise.all([contract.balanceOf(address), contract.decimals(), contract.symbol()])` 平行查詢，同時說「decimals 查詢失敗時 fallback 18、symbol 查詢失敗時 fallback UNKNOWN」。但 `Promise.all` 的語意是**任何一個 reject 就整個 Promise reject**，要實現個別 fallback 必須用 `Promise.allSettled` 或對每個 promise 個別 `.catch()`。如果用 `Promise.all` 又想做 fallback，開發者必須先對每個 promise wrap `.catch()`，例如：`contract.decimals().catch(() => 18n)`，這樣 `Promise.all` 才不會因為單個失敗而整體 reject。**spec 使用了「`Promise.all` + fallback」的描述，但這兩個概念在技術上有衝突，spec 沒有說清楚實作方式。**
- **建議**: Task #4 設計規格改寫為：`Promise.all([contract.balanceOf(address), contract.decimals().catch(() => 18n), contract.symbol().catch(() => "UNKNOWN")])`，或改用 `Promise.allSettled` 並明確說明 settled result 的處理邏輯。

---

## SR-006

- **ID**: SR-006
- **嚴重度**: P1
- **章節**: Task #5 設計規格 — `send_transaction` 不等待確認
- **描述**: spec 明確說「不 await `tx.wait()`（不等確認，只等廣播）」，§6.1 架構決策表也記錄了這個選擇。但 spec 沒有在任何地方**明確告知 agent**：拿到 txHash 不代表交易成功，交易可能在鏈上 revert，agent 若需要確認成功必須自行 poll 交易 receipt。這個限制對 agent 行為有重大影響（agent 可能以為 txHash 等於成功就繼續下一步），但 README 的安全注意事項（Task #9）和 tool description（§4.2 manifest 的 `send_transaction.description`）都沒有說明這件事。manifest description 只說「Send ETH on Arbitrum One」，完全沒提 fire-and-forget 語意。
- **建議**: `send_transaction` 的 tool description 改為明確標注：「Returns txHash immediately after broadcast. Does not wait for confirmation. Transaction may still revert on-chain.」Task #9 README DoD 加上：`[ ] 說明 send_transaction 為 fire-and-forget，需自行 poll receipt 確認成功`。

---

## SR-007

- **ID**: SR-007
- **嚴重度**: P1
- **章節**: Task #5 設計規格 — `to` 地址驗證
- **描述**: `send_transaction` 的 `to` 參數接受任意字串，spec 的參數驗證只做 `amount > 0`，沒有驗證 `to` 是否為合法的 Ethereum 地址。若傳入非地址字串（例如 `"hello"`），ethers 的 `sendTransaction` 會拋出錯誤，但 error message 是 ethers 內部訊息（類似 `invalid address`），不會被 spec 定義的任何錯誤分類（InvalidKeyError / InsufficientFundsError / NetworkError / TransactionError）精確捕獲。同樣的問題存在於 `get_balance` 的 `address` 參數：spec 的 E3 異常追溯表（§3.2）只涵蓋「私鑰格式錯誤」，沒有涵蓋「地址格式錯誤」這個同等可能發生的邊界情況。
- **建議**: Task #5 參數驗證加一條：`ethers.isAddress(params.to)` 為 false 時回傳 `ValidationError: Invalid recipient address`。Task #4 加：`ethers.isAddress(params.address)` 為 false 時回傳 `ValidationError: Invalid address`。§3.2 異常追溯表加 E7 covering 這個情況。

---

## SR-008

- **ID**: SR-008
- **嚴重度**: P1
- **章節**: Task #8 設計規格 — 測試覆蓋缺口
- **描述**: Task #8 的 `getBalance.test.ts` 測試清單列出了：ETH 路徑、ERC20 路徑、ERC20 decimals fallback、RPC 失敗。但遺漏了兩個本 spec 明確定義的情境：(1) **ERC20 symbol fallback**（symbol() 失敗時 fallback "UNKNOWN"）沒有對應的測試案例；(2) **無效 ERC20 地址回傳 InvalidContractError** 的測試（Task #4 DoD 第六條）在 Task #8 的測試清單中沒有出現。DoD 與測試設計之間存在覆蓋缺口。
- **建議**: Task #8 `getBalance.test.ts` 補上：`測試 ERC20 symbol fallback（symbol() 拋錯時回傳 UNKNOWN）` 和 `測試無效 ERC20 地址回傳 InvalidContractError`。

---

## SR-009

- **ID**: SR-009
- **嚴重度**: P2
- **章節**: Task #1 設計規格 — `package.json` 缺少 `exports` 欄位
- **描述**: `package.json` 只有 `main: "dist/index.js"` 和 `types: "dist/index.d.ts"`，沒有 `exports` 欄位。在 Node.js 12+ / 現代 bundler 生態中，`exports` 欄位是 package entry point 的標準配置，可以精確控制哪些路徑可以被外部 import，並支援 conditional exports（`require` / `import`）。缺少 `exports` 的 package 在某些 bundler（如 webpack 5、Vite）或 ESM-first 環境中可能有相容性問題。雖然這個 package 是 CJS-only，但明確宣告 `exports` 可以防止消費者意外 deep import 到 `dist/tools/` 底下的內部模組。
- **建議**: Task #1 加上 `exports` 欄位：`"exports": { ".": { "require": "./dist/index.js", "types": "./dist/index.d.ts" } }`。若未來要支援 ESM，留下擴充空間。

---

## SR-010

- **ID**: SR-010
- **嚴重度**: P2
- **章節**: Task #10 — npm publish 流程缺少 `npm login` 與 CI/CD 說明
- **描述**: Task #10 的設計規格和 DoD 完全聚焦在 `.npmignore` 和 `npm pack`，但完全沒有提到：(1) `npm login` 或 `NPM_TOKEN` 的配置（沒有登入就 publish 會直接失敗）；(2) GitHub Actions CI/CD 流程（s0_brief_spec §3 成功標準提到「透過 GitHub → npm publish 完成發布」，但 s1 dev_spec 完全沒有 GitHub Actions workflow 的設計）；(3) package version 管理策略（何時 bump version、用 `npm version` 還是手動改）。s0 說的「透過 GitHub CLI 觸發或手動」在 s1 中完全沒有落地成任何可執行的設計。
- **建議**: Task #10 加上：`[ ] 文件說明 npm login / NPM_TOKEN 設定方式`，以及決策：本次採用手動 `npm publish` 還是 GitHub Actions，擇一並寫清楚。若要 GitHub Actions，需新增 `.github/workflows/publish.yml` 任務。

---

## SR-011

- **ID**: SR-011
- **嚴重度**: P2
- **章節**: §4.4 ethers v6 關鍵 API 對照表 — `mnemonic` 處理
- **描述**: spec §4.4 寫道「Wallet mnemonic：`wallet.mnemonic?.phrase`（Mnemonic 物件，可能為 null）」，Task #3 也說「若 mnemonic 為 null，仍回傳 address 和 privateKey，mnemonic 設為空字串」。這個設計有一個被掩蓋的問題：`Wallet.createRandom()` 在 ethers v6 正常情況下**一定**會有 mnemonic，`mnemonic` 為 null 的情況只發生在用私鑰直接建立的 `new Wallet(privateKey)` 實例。若 `createRandom()` 的 mnemonic 真的是 null（理論上不應發生），代表有更嚴重的問題，直接 fallback 空字串會讓呼叫方誤以為錢包建立成功但沒有備份短語。spec 用 `??` 做 silent fallback，沒有考慮要不要至少 log 一個 warning 或讓 error 可被察覺。
- **建議**: Task #3 DoD 加上說明：「`Wallet.createRandom()` 在 ethers v6 正常情況下必定有 mnemonic；mnemonic 為 null 屬於非預期狀態，建議明確回傳錯誤（`{ success: false, error: "UnexpectedError: mnemonic is null" }`）而非 silent fallback 空字串。」改 spec 的 fallback 策略。

---

## SR-012

- **ID**: SR-012
- **嚴重度**: P2
- **章節**: §2.2 依賴關係 — RPC URL hardcode 單點風險
- **描述**: `DEFAULT_RPC_URL = "https://arb1.arbitrum.io/rpc"` 是唯一的預設 RPC，spec 中沒有任何 fallback RPC 機制。`arb1.arbitrum.io` 是 Arbitrum Foundation 提供的公共節點，有速率限制（rate limit）且偶爾不穩定。對於 production agent 大量呼叫的場景，單一公開 RPC 是明顯的可靠性瓶頸。spec 雖然允許傳入自訂 `rpcUrl`，但 README（Task #9）的設計規格中沒有要求說明「建議使用私人 RPC（如 Alchemy、Infura）」的最佳實踐。這不是會讓 package 壞掉的 P0，但對 production 使用場景是明顯的設計遺漏。
- **建議**: Task #9 README DoD 加上：`[ ] 建議在 production 環境使用私人 RPC（Alchemy / Infura / QuickNode）而非預設公開節點，避免速率限制`。

---

## 彙總表

| ID | 嚴重度 | 章節 | 核心問題 |
|----|--------|------|---------|
| SR-001 | P0 | §4.1 `GetBalanceData` | `decimals` bigint vs number 型別不一致，spec 未說明轉換責任 |
| SR-002 | P0 | Task #1 `prepublishOnly` | publish 前不跑測試，品質控管漏洞 |
| SR-003 | P0 | Task #7 DoD | `require()` 取得的是 `{ default: {...} }`，不是 manifest 本體，openclaw runtime 消費方式未釐清 |
| SR-004 | P1 | §6.3 私鑰安全策略 | 未說明 agent runtime logging 可能記錄 privateKey 的風險 |
| SR-005 | P1 | Task #4 ERC20 fallback | `Promise.all` + 個別 fallback 語意衝突，實作方式未說清楚 |
| SR-006 | P1 | Task #5 fire-and-forget | txHash 不等於成功，spec 未要求在 description 或 README 中說明此限制 |
| SR-007 | P1 | Task #5 地址驗證 | `to` 和 `address` 參數無格式驗證，錯誤分類無法覆蓋地址格式錯誤 |
| SR-008 | P1 | Task #8 測試覆蓋 | ERC20 symbol fallback 和 InvalidContractError 測試案例缺失 |
| SR-009 | P2 | Task #1 `package.json` | 缺少 `exports` 欄位，現代 bundler 相容性風險 |
| SR-010 | P2 | Task #10 publish 流程 | 缺少 npm login / CI/CD 流程設計，s0 目標未在 s1 落地 |
| SR-011 | P2 | §4.4 mnemonic 處理 | mnemonic null 做 silent fallback 空字串，掩蓋非預期狀態 |
| SR-012 | P2 | §2.2 依賴關係 | 單一公開 RPC 無 fallback，production 場景可靠性風險未說明 |
