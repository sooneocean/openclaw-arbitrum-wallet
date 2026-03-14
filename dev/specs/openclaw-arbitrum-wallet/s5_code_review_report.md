# S5 Code Review 報告 — openclaw-arbitrum-wallet

**審查日期**: 2026-03-14
**Spec Mode**: Full Spec
**審查範圍**: Scoped（s4.output.changes 列出的 16 個檔案）
**審查輪次**: R1 + R2（無 R3，無重大分歧）

---

## 審查摘要

| 項目 | 數值 |
|------|------|
| R1 Findings | 7 條 |
| P0 | 1 條（已修復）|
| P1 | 4 條（全部修復）|
| P2 | 2 條（全部修復）|
| R2 全部接受 | 7/7 |
| 測試數（修復後）| 22 tests passing |
| Build | ✅ tsc 零錯誤 |
| Gate 結果 | ✅ PASS |

---

## 問題清單與處置

| ID | 嚴重度 | 問題 | 處置 |
|----|--------|------|------|
| CR-001 | P0 | sendTransaction/signMessage 的 InvalidKeyError catch 邏輯無法匹配 ethers v6 全零私鑰錯誤（`"Expected valid bigint: 0 < bigint < curve.n"`） | 分離 Wallet 建構 try/catch，新增 `classifyKeyError()` 函數涵蓋 `valid bigint`/`curve.n` |
| CR-002 | P1 | getBalance 未對 tokenAddress 做 `isAddress()` 前置驗證 | 在 ERC20 路徑加 tokenAddress 格式驗證，回傳 ValidationError |
| CR-003 | P1 | sendTransaction.test.ts 缺 InvalidKeyError 測試 | 新增兩個測試：INVALID_ARGUMENT code + curve.n 錯誤 |
| CR-004 | P1 | createWallet.ts mnemonic null 訊息與 Spec DoD 不符 | 改為 `"UnexpectedError: mnemonic is null after createRandom"` |
| CR-005 | P1 | README 缺 npm login/NPM_TOKEN 發布說明 | 新增 Publishing 段落含 npm login、NPM_TOKEN、publish 步驟 |
| CR-006 | P2 | sendTransaction.test.ts mock 地址不是合法 Ethereum 地址 | 改用 Hardhat account #0 地址 |
| CR-007 | P2 | getBalance.test.ts InvalidContractError 測試使用 EVM 預編譯地址 | 改用 `0x0000000000000000000000000000000000000Bad` |

---

## Spec 對照驗證

### S0 成功標準

| # | 標準 | 狀態 | 證據 |
|---|------|------|------|
| 1 | npm install openclaw-arbitrum-wallet 可正常安裝 | ✅ | package.json + dist/ 結構正確，npm pack --dry-run 驗證 |
| 2 | 四個 tool 全部可被呼叫 | ✅ | src/index.ts export default 含 4 tools，node -e 驗證 tools.length=4 |
| 3 | package 發布至 npmjs | ⚠️ | 尚未實際 publish（S7 執行），流程已完備 |

### S1 影響範圍

| 層 | 預期 | 實際 | 狀態 |
|----|------|------|------|
| Backend | 6 files | 6 files | ✅ |
| Frontend | 0 | 0 | ✅ |
| Database | 0 | 0 | ✅ |
| Config+Test+Doc | 10 files | 10 files | ✅ |

### DoD 通過率

全 10 個任務 DoD 全部通過（含 S5 修復後新增測試覆蓋）。

---

## Gate 結果

✅ **PASS** — P0/P1/P2 全部修復，22 tests passing，tsc 零錯誤。自動進入 S6 測試。
