# vista — repo conventions for Claude Code

用語は [glossary.md](glossary.md) が正本（追加・改名はコード変更と同一 PR）。

## React（19.2 + React Compiler v1）

- **手書き memo 禁止**: `useMemo` / `useCallback` / `React.memo` は書かない。
  memo 化は React Compiler（vite/vitest 両方に配線済み）の仕事。compiler が
  扱えない escape hatch が本当に必要な時だけ、理由コメント付きで書く。
- **`forwardRef` 新規禁止**: React 19 の ref-as-prop を使う（vendored な
  `src/ui/components/ui/` は除く）。
- component 内で組込み hook を直接呼ばない（`useXxx` カスタム hook に集約 =
  use-encapsulation lint が強制。presenter/hook 分離の家風は t-rz61 参照）。

## ゲート

- `pnpm check` = types / lint / format / test / deadcode / build。CI と同一。
  個別には `check:types` 等、フォーマット適用は `pnpm format`。
- contract test はホストの実 furrow を叩く（PATH に無ければ自動 skip）。

## 検証

- GUI の入力シミュレーション（drag/click）はホストで行わない。読み取り系
  （peekaboo see / AX dump / screenshot）は可。実入力の E2E は Tart VM
  （t-q6rc）か Vitest Browser Mode（t-fn4k）で。
