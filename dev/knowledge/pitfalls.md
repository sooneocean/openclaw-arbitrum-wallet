# Pitfalls Registry

> 自動追加於 S5/S6/S7 階段。詳見 sop-full-spec.md 知識管理章節。

## tag: ethers-v6

- **ethers v6 無效私鑰錯誤訊息不含慣用字串**（openclaw-arbitrum-wallet, 2026-03）
  - 症狀：全零私鑰（`0x000...000`）拋出的錯誤 message 是 `'Expected valid bigint: 0 < bigint < curve.n'`，既不含 `'INVALID_ARGUMENT'` code 也不含 `'invalid private key'` 字串。
  - 根因：ethers v6 底層用 `@noble/curves` 做橢圓曲線驗證，錯誤訊息格式與 v5 完全不同。
  - 解法：error classification（`classifyKeyError`）需同時 guard `err.message` 包含 `'bigint'` 或 `'curve'`，不能只靠 `err.code === 'INVALID_ARGUMENT'`。

## tag: tdd

- **mock private key 長度計算錯誤**（openclaw-arbitrum-wallet, 2026-03）
  - 症狀：測試中 mock private key 寫成 66 hex chars（`0x` + 64 chars），實際上 ethers v6 要求的裸 hex 是 64 chars（不含 `0x` prefix 則共 66 字元，含 prefix 則共 66 字元）。誤解「66 chars」指 hex digits 而非含 prefix 的完整字串，導致 RED → 第一次 GREEN 時有一個 test 失敗。
  - 解法：明確記錄：ethers v6 private key 格式為 `0x` + 64 hex digits = 66 字元總長。測試 mock 需包含 `0x` prefix。
