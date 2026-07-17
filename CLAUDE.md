# vista — repo conventions for Claude Code

用語は [glossary.md](glossary.md) が正本（追加・改名はコード変更と同一 PR）。

## React（19.2 + React Compiler v1）

- **手書き memo 禁止**: `useMemo` / `useCallback` / `React.memo` は書かない。
  memo 化は React Compiler（vite/vitest 両方に配線済み）の仕事。compiler が
  扱えない escape hatch が本当に必要な時だけ、理由コメント付きで書く。
- **component / hook / domain 関数は `function` 宣言**: arrow const にも
  `React.FC` にもしない（generics が素直・hoisting・「関数 = ロジック」の
  可読性。`React.FC` は children 暗黙付与や return 縛りで非推奨寄り）。例外は
  インライン callback（`map` / `onClick` / render prop）と関数値オブジェクト
  メンバ（arrow / method 短縮）。
- **`forwardRef` 新規禁止**: React 19 の ref-as-prop を使う（vendored な
  `src/ui/primitives/` は除く）。
- component 内で組込み hook を直接呼ばない（`useXxx` カスタム hook に集約 =
  use-encapsulation lint が強制）。

## presenter/hook 分離（view の作り方）

- **view は必ず注入パターンで書く**: `<XxxComponent {...useXxx(props)} />`。
  1 view = 1 ディレクトリ（`Xxx.tsx` / `useXxx.ts` / `Xxx.type.ts` /
  `Xxx.mock.ts` + テスト 2 本）。詳細は [glossary.md](glossary.md) の
  「presenter/hook 分離」。
- **`/* c8 ignore */` は合成の 1 行だけ**。他の未カバーは exclude かテストで
  解決する（exclude 基準も glossary）。
- **props / 引数は展開しない（既定・B スタイル）**: presenter も hook も
  `props.` で読む（関数引数は `params.` / `args.`）。理由 = 出所（外から来た値か
  local か）が一目で分かる・IDE 補完が効く。`{ ...rest }` は可。**可読性が
  上がる時だけ**分割代入してよい（既定は避ける）。param のただの別名
  （`const id = props.id`）は作らず `props.id` で読む（計算した中間値は歓迎）。
  hook の return は明示フィールドで書き、合成が個々の prop にバラす。
- **注入 ref を持つ presenter だけ例外**: `{ ref, ...props }` で ref を rest
  分割で切り出し、残りは `props.` で読む。理由 = `react-hooks/refs` が
  「ref を含む props から `props.x` を読む」を ref アクセス扱いで弾くため
  （範例 = `TaskCard.tsx` の `ref` / `BoardColumn.tsx` の `bodyRef`）。
- presenter テストは `strictRender`（StrictMode 二重レンダー）、hook テストは
  「同一 props 再レンダーで再登録しない」で compiler memo の両経路を踏む。

## 命名・依存

- **非 test の `.tsx` は PascalCase**（`Main.tsx` 含む）。`ls-lint`
  （`pnpm check:filenames`）が強制。vendored `src/ui/primitives/` と codegen
  `src/domain/generated/` は除外。hook ファイルは `useXxx.ts`（`.hook.ts` 退役）。
- **2 引数以上の関数は単一 params オブジェクト**で受ける（`params.x` 読み。
  同型引数の order 事故を防ぐ）。1 引数は程々（既定 positional）。型ガード
  `data is X`・可変長 `(...args)`・ライブラリ callback は据え置き。
- **依存は exact pin**（`^` / `~` 禁止）。`.npmrc` の `save-exact=true` で
  `pnpm add` も自動 pin。
- 規約は**既定であって絶対じゃない** —— 明確なメリットがあれば逸脱可。迷ったら
  push 前にコード内 `// TODO:` で相談。

## ゲート

- `pnpm check` = types / lint / format / test / deadcode / build。CI と同一。
  個別には `check:types` 等、フォーマット適用は `pnpm format`。
- `check:test` は **coverage 100% ゲート**（vitest v8・thresholds 100）を含む。
  型テスト `*.test-d.ts` も unit project の typecheck で走る。
- contract test はホストの実 furrow を叩く（PATH に無ければ自動 skip）。

## 検証

- GUI の入力シミュレーション（drag/click）はホストで行わない。読み取り系
  （peekaboo see / AX dump / screenshot）は可。実入力の E2E は Tart VM
  （t-q6rc）か Vitest Browser Mode（t-fn4k）で。
