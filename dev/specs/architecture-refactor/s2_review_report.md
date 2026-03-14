# S2 Review Report: architecture-refactor

> **階段**: S2 Spec Review
> **審查時間**: 2026-03-15
> **審查模式**: Full Spec（Phase 0 預審 + R1/R2 對抗式審查）

---

## 審查摘要

| 指標 | 數值 |
|------|------|
| R1 Findings 總數 | 12 |
| 預審 Findings | 3（SR-PRE-001~003） |
| P0 | 1（SR-009，已修正） |
| P1 | 6（SR-001, SR-002, SR-004, SR-006, SR-012, SR-PRE-003，全部處理） |
| P2 | 5（SR-003, SR-005, SR-007, SR-008, SR-010） |
| 接受 | 8 |
| 部分接受 | 3 |
| 拒絕 | 2 |

## Gate 結果: **pass**（修正後通過）

---

## 關鍵修正

### 1. SR-009 [P0] ESM 策略重新設計
- **問題**: `.mjs` rename 策略導致 import specifier 不匹配，ESM import 完全失敗
- **修正**: 改用 `dist/esm/package.json` + `{"type": "module"}` 方案
- **影響**: T5 描述、build script、AC-9 驗證路徑、架構決策 6.1 全部更新

### 2. SR-001 [P1] errors.ts 範圍 Descope
- **問題**: S0 提了三個分類函式但 dev_spec 只集中 classifyKeyError
- **修正**: 明確記錄 descope 理由（InsufficientFundsError/NetworkError 無重複，ROI 低）

### 3. SR-004 [P1] 零行為變更精確定義
- **修正**: 新增「零行為變更」精確邊界定義 + withRetry 必須 rethrow 原始 error object 的不變式

### 4. SR-006 [P1] Build 清理步驟
- **修正**: build script 加入 `rm -rf dist`

### 5. SR-012 [P1] 新增測試改為必須
- **修正**: `tests/errors.test.ts` 和 `tests/provider.test.ts` 從「建議」改為「必須」

### 6. SR-PRE-003 [P1] exports 順序修正
- **修正**: T5 程式碼範例改為 `types → import → require`，與架構決策 6.1 一致

### 7. SR-010 [P2] manifest.version 同步
- **修正**: T5 DoD 加入 `src/index.ts` manifest.version 同步更新為 1.1.0

---

## 拒絕項目

| Finding | 理由 |
|---------|------|
| SR-005 | `files` allowlist 已排除多餘檔案，`.npmignore` 為冗餘 |
| SR-007 | dev_spec 6.3 節已充分說明 Jest mock 交互 |

---

## 預審摘要（Phase 0）

- **SR-PRE-001/002 [P2]**: 行號引用修正（L9-19→L9-20, L4-14→L4-15）
- **SR-PRE-003 [P1]**: exports 順序矛盾（已修正）

---

## 修正後 dev_spec 差異摘要

1. §2.1: createWallet.ts 加 S0 偏差記錄；index.ts 改為「修改」
2. §2.5: 模組格式 After 欄更新為 dist/esm/package.json 策略
3. §4.1: 新增「零行為變更」定義 + S0 Descope 記錄
4. §4.2: 行號修正
5. T5: ESM 策略全面更新、exports 順序修正、build script 加 rm -rf dist、manifest.version 同步
6. §6.1: ESM 架構決策更新
7. §7.3: 新增測試改為「必須」
8. §8: ESM rename 風險改為 dist/esm/package.json 遺漏風險
9. AC-9: 路徑從 .mjs 改為 .js
