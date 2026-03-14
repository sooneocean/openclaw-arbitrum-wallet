# S2 審查報告 — openclaw-arbitrum-wallet

**審查日期**: 2026-03-14
**Spec Mode**: Full Spec
**審查輪次**: R1 + R2（無 R3，無重大分歧）

---

## 審查摘要

| 項目 | 數值 |
|------|------|
| R1 Findings | 12 條 |
| P0 | 3 條（全部修正）|
| P1 | 5 條（全部修正）|
| P2 | 4 條（3 條修正，1 條部分接受）|
| R2 接受 | 10 條 |
| R2 部分接受 | 1 條（SR-010：CI/CD 超出 scope，不接受；npm login 說明已補充）|
| R2 拒絕 | 0 條 |
| Spec 修改處 | 12 處 |
| Gate 結果 | ✅ PASS（所有 P0/P1 已修正）|

---

## 問題清單與處置

| ID | 嚴重度 | 核心問題 | R2 判斷 | 處置 |
|----|--------|---------|---------|------|
| SR-001 | P0 | `GetBalanceData.decimals` bigint vs number 型別衝突，spec 未說明轉換 | ACCEPT | Task #4 加 `Number(await contract.decimals())` 說明 |
| SR-002 | P0 | `prepublishOnly` 只跑 build 不跑測試 | ACCEPT | 改為 `"npm run build && npm test"` |
| SR-003 | P0 | `require()` 取得 `{ default: {...} }` 而非 manifest，DoD 描述錯誤 | ACCEPT | 修正 Task #7 DoD 文字，補充 CJS interop 說明 |
| SR-004 | P1 | agent runtime logging 可能記錄 privateKey，安全策略未提及 | ACCEPT | §6.3 加 runtime logging 風險，Task #9 DoD 補說明 |
| SR-005 | P1 | `Promise.all` + 個別 fallback 語意衝突 | ACCEPT | 改為 `Promise.all([...catch, ...catch, ...catch])` |
| SR-006 | P1 | `send_transaction` fire-and-forget 語意未在 description 說明 | ACCEPT | 修正 tool description，Task #9 DoD 補充 |
| SR-007 | P1 | `to`/`address` 參數無地址格式驗證 | ACCEPT | Task #4/#5 加 `ethers.isAddress()` 驗證，更新異常表 |
| SR-008 | P1 | getBalance 測試缺少 symbol fallback 和 InvalidContractError | ACCEPT | Task #8 補充對應測試案例 |
| SR-009 | P2 | `package.json` 缺少 `exports` 欄位 | ACCEPT | Task #1 補充 exports 欄位 |
| SR-010 | P2 | publish 流程缺 npm login，s0 目標未落地 | PARTIAL | npm login / NPM_TOKEN 說明已補；GitHub Actions 超出 s0 scope，不接受 |
| SR-011 | P2 | mnemonic null 做 silent fallback 空字串 | ACCEPT | Task #3 改為回傳錯誤而非空字串 |
| SR-012 | P2 | 單一公開 RPC 無 fallback，未說明 production 最佳實踐 | ACCEPT | Task #9 README DoD 補充建議使用私人 RPC |

---

## 修正摘要（Spec 變更）

1. **§4.1 GetBalanceData**：`decimals: number` 保持，Task #4 新增型別轉換說明
2. **Task #1 package.json**：`prepublishOnly` → `"npm run build && npm test"`，新增 `exports` 欄位
3. **Task #3**：mnemonic null 改為回傳 `UnexpectedError`，不 fallback 空字串
4. **Task #4**：ERC20 查詢改為 `Promise.all + .catch()` fallback；加 `ethers.isAddress()` 地址驗證；加 E7 異常
5. **Task #5**：加 `ethers.isAddress(params.to)` 驗證
6. **Task #7**：DoD 文字修正，明確 `.default` 取用方式，補充 CJS interop 設計說明
7. **Task #8**：getBalance 測試補充 symbol fallback + InvalidContractError 案例
8. **Task #9**：DoD 補充 fire-and-forget 說明 + 私人 RPC 建議 + agent runtime logging 警告
9. **Task #10**：DoD 加上 npm login / NPM_TOKEN 設定說明
10. **§4.2**：`send_transaction` description 修正為 fire-and-forget 語意
11. **§6.3**：新增 agent runtime logging 風險條目
12. **§8**：更新風險表，加入 runtime logging 風險

---

## Gate 結果

✅ **PASS** — 所有 P0 (3條) 和 P1 (5條) 已全部修正。P2 中 3 條已修正，1 條部分接受（範圍內部分已修正）。dev_spec 可推進至 S3 執行計畫。
