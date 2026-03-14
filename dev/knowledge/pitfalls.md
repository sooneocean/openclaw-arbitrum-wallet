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

## tag: esm-dual-format

- **ESM 相對 import 必須加 .js 副檔名**（architecture-refactor, 2026-03）
  - 症狀：tsc 編譯 ESM 後 `import { foo } from "./bar"` 在 Node.js ESM 解析失敗（`ERR_MODULE_NOT_FOUND`），CJS 端正常。
  - 根因：Node.js ESM 嚴格要求 import specifier 包含完整副檔名，不會自動補 `.js`。
  - 解法：所有 TypeScript source 的相對 import 加 `.js`（如 `from "./types.js"`），tsc 仍可正確解析到 `.ts`。ts-jest 不認 `.js` 結尾，需在 jest.config.js 加 `moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' }`。

- **ESM 雙格式不要用 .mjs rename**（architecture-refactor, 2026-03）
  - 症狀：tsc 編譯出的 import specifier 保持 `.js`，rename 成 `.mjs` 後路徑不匹配，ESM import 全部失敗。
  - 解法：改用 `dist/esm/package.json` + `{"type": "module"}` 方案。該目錄下的 `.js` 檔案會被 Node.js 視為 ESM，無需 rename。
