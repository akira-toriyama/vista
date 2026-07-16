# vista: furrow GUI v1 設計 (Tauri v2 + React)

2026-07-16 確定。furrow の GUI フロントエンド「vista」の v1 設計。
GUI epic の経緯は projects board の t-0007（方式選定 → Tauri v2 で決着）、実装 epic は t-fw2m を参照。

## 決定事項（ユーザ確定）

- **殻 = Tauri v2**。Obsidian は task/project 管理機能の不足で棄却（t-0053）。
- **一般的な task/project 管理機能** + GUI ならでは（**依存グラフ・DnD 移動**）を提供する。
- **read-write・task CRUD**（作成含む）。ただし body(md) の編集は v1 外（表示のみ。編集は $EDITOR / Claude Code に委譲）。
- **中央ボード固定**（projects checkout の board。repo 横断は GUI 内フィルタで表現）。
- **furrow は同梱（sidecar bundle）しない** — ホスト PC の `furrow`（PATH の source-build wrapper）を呼ぶ。
- **ロジックの正本は furrow 一本**。UI ならではのロジック以外は furrow 任せ。
  **furrow に不足があれば furrow へ PR を出す**（GUI 側で回避実装しない。一級の成果物）。
- 構成は「ある程度重厚」= TypeScript 側に層を積む（A案）。

## 全体アーキテクチャ

```
┌─ Tauri v2 app (vista) ─────────────────────────────┐
│  WebView: React + TypeScript (strict)              │
│  ├─ ui/             React components・views        │
│  ├─ application/    usecases + FurrowPort (IF)     │
│  ├─ domain/         Task/Lane/DepGraph 不変モデル  │
│  └─ infrastructure/ TauriFurrowAdapter             │
│         │ invoke                                   │
│  Rust core（極薄・ビジネスロジックなし）            │
│  ├─ exec: ホストの furrow を spawn（同梱しない）    │
│  │   起動時に login shell で PATH 解決→絶対パス化   │
│  └─ fs-watch: .furrow/ 変更 → webview へ event     │
└────────────────────────────────────────────────────┘
          │ furrow <cmd> --json          │ watch
          ▼                              ▼
   ホストの furrow (source wrapper) → projects/.furrow/（正本）
```

- vista は shard/body を直接読み書きしない。読み = `ls/show/next/stats/board/search/dep --list --json`、
  書き = `add/move/reorder/set/retitle/dep/parent/label/repo/done/check/archive --json`。
- **スキーマ護衛は furrow に委譲**: 起動時に `furrow board --json` を pre-flight し、
  `writable: false`（schema-upgrade-required 等）なら GUI は閲覧専用バナーを出して write を封じる。
- **エラー契約**: furrow の exit code（0 ok / 1 not-found / 2 validation / 3+ internal）+
  stderr の `{"error":{code,...}}` を infrastructure 層で typed error に写像。
  UI は error code で分岐（`sync-conflict` → バナー、validation → フォームエラー等）。
- **並行編集への追随**: Claude Code が同じ board を CLI で触る前提。
  Rust 側 `notify` + debouncer で `.furrow/` を watch → `tasks://changed` を emit →
  TanStack Query の invalidate → 再読込。GUI 起動中も board が常に最新を映す。
  （webview に広い fs capability を渡さないため watch は Rust 側で行う。
  macOS FSEvents の `/private` プレフィックスは canonicalize してから比較。）
- **sync 方針**: 起動時に `furrow sync`、書き込み後は debounce して auto-sync、+ 手動 sync ボタン。
  conflict（exit 3 `sync-conflict`）は非破壊なのでバナーで人間に委ねる。

### ホスト furrow の解決（macOS GUI アプリの PATH 問題）

GUI アプリはログインシェルの PATH を継がないため、起動時に login shell
（`zsh -lc 'command -v furrow'`）で絶対パスを解決してキャッシュする。設定で明示上書き可。
解決失敗時は起動画面でパス入力を促す。

## TypeScript 4層（依存方向: ui → application → domain、infrastructure は application の port を実装）

- **domain/** — `Task`/`Lane`/`DepGraph` 等の不変モデルと純ロジック（DAG 構築、priority
  midpoint 計算等）。Tauri・React に依存しない。plain vitest で unit test。
- **application/** — usecase（moveTask, addTask, …）と `FurrowPort` interface。
  TanStack Query の hooks はここで port を orchestrate。
- **infrastructure/** — `TauriFurrowAdapter`（`invoke` → Rust → furrow）。
  `@tauri-apps/*` を import する唯一の層。
- **ui/** — React components / views。
- 層違反は `eslint-plugin-boundaries`（または `import/no-restricted-paths`）で機械的に禁止。
- **型の同期**: domain の Task 型は手書きせず、`furrow schema` の JSON Schema から **TS 型を codegen**
  して furrow と機械的に同期する（挙動側は contract test が守る）。Go CLI ↔ TS UI の言語差を
  JSON 契約 + codegen で吸収する（言語統一で得たかった型共有はこれで足りる）。

## スタック選定（2026-07 調査済み・要点）

| 領域 | 選定 | 理由 |
|---|---|---|
| DnD | `@atlaskit/pragmatic-drag-and-drop` v2 | `@dnd-kit/core` は 2024-12 以降凍結（後継 `@dnd-kit/react` は 0.x で破壊的変更予告）。pragmatic は Jira/Trello の実戦エンジンで活発、仮想化と公式 kanban チュートリアルあり。低レベルだが抽象と戦わない |
| 依存グラフ | `@xyflow/react` 12 + `elkjs`（elk.layered, web worker で非同期実行） | node = React component で status 色分け・interaction が自然。elk.layered は依存 DAG の層状レイアウトに最適。簡素で良ければ `@dagrejs/dagre` 3.x が同期フォールバック |
| Markdown | `react-markdown` v10 + `remark-gfm` + wikilink remark plugin + mermaid | mermaid は rehype plugin でなく `code` component override で `language-mermaid` を検出し `mermaid.render()`（同期パイプライン維持・図単位の error fallback）。`[[id]]` は `@portaljs/remark-wiki-link` か ~60行の自作 remark 拡張（task-id 解決の自由度で自作優勢） |
| server-state | TanStack Query v5 | queryKey 階層（`['tasks']` / `['tasks','list',filters]` / `['tasks','detail',id]`）、`staleTime: Infinity` + `networkMode: 'always'`、`tasks://changed` event → `invalidateQueries` |
| UI 基盤 | shadcn/ui（Radix + Tailwind, vendored） | 密度の高い desktop tool 向け。重い部品（board/graph）は DnD/xyflow 側なので、所有権のある小さい表面が合う |
| 仮想化 | 当面入れない | 列あたり ~200 cards までは不要。必要になったら `@tanstack/react-virtual`（pragmatic DnD は公式に仮想化対応） |
| scaffold / test | `create-tauri-app`（Vite + React + TS）、TS strict、vitest + testing-library + `mockIPC`（jsdom）と、実 furrow を叩く contract test（node env の別 vitest project） | Tauri 標準構成。層分離の主目的 = domain/application が Tauri なしで test できること |

## UI 設計（主要 PM ツール調査の反映）

調査結論の核: 主要ツール（Linear/GitHub Projects/Trello/Plane/Vikunja/Height）で
**依存関係を本物のグラフで見せるものは無い**（sidebar の関係リスト + Gantt 矢印が天井）。
**Graph view が vista の差別化の本丸**。また全アプリのポジティブ評は「速い・場所を失わない」、
ネガティブ評は「遅い・ネスト深い」に収束 → local data で optimistic UI、スピナーを出さない。

### ビュー構成

- **1 データセット + 保存ビュー = タブ**（GitHub Projects モデル）。ビュー = layout + filter + group + sort の組。
- v1 の layout は **Board / List(table) / Graph** の3種。日付を持たないモデルなので timeline/calendar は作らない。
- filter は **typed query 構文の単一フィルタバー**（`repo:owner/name label:x lane:ready 自由語`）。
  furrow の `-r/-l/-s` に素直に写像でき、plain-text 思想と合う。

### Board view

- 列 = lane（`furrow board` の lane 語彙を使う。ハードコードしない）。
- **cross-column drag = lane 変更、within-column drag = priority 書き換え**（Linear と同じ
  「手動順序は全体で1つの正準順序」。furrow の sparse int priority がまさにそれ）。
- card = title + id + value/effort pips + label dots + repo 略記。表示項目は display options で toggle。
- **blocked card に旗 + dim**（Linear の orange flag 相当）。最安で最高価値の依存可視化。
- parent/epic は card ネストにしない（Vikunja の最多苦情）。将来 swimlane 表示（v1 外）。

### Task detail

- **side-peek 既定 + full page への escape**（Plane の tri-mode を2モードに簡約）。
  board 上で j/k 移動に peek が追従、Enter で full page。
- 構成（Linear 踏襲）: title → markdown body（checklist は live render・クリックで
  `furrow check <id> <index>` toggle）→ 右 sidebar に lane/priority/value/effort/labels/repos/
  parent/**relations**。
- relations は `dep --list --json` の両方向（depends_on / blocks）を表示・編集。
- `[[id]]` wikilink は hover で対象 task を peek（Obsidian 由来、PM ツールに無い差別化）。
- backlinks（`show --backlinks` の mentioned_by）を relations 下に表示。

### Graph view（差別化の本丸）

- 全ボード（フィルタ適用後）の依存 DAG。elk.layered で左→右、lane で大まかな層。
- node = status で色分け、blocked を強調、click → peek。
- **node 間 drag で dep 作成**（Taskheat パターン）、edge 選択 + delete で `dep --rm`。
- task detail 内に ±1〜2 hop の **neighborhood mini-graph**。

### Keyboard（v1 後半）

- `Cmd+K` command palette（navigation + 全 mutation、fuzzy）。
- 単キー mnemonics（`L` lane, `V` value, `E` effort, `#` labels, `M B` blocked-by picker）、
  `G` chords（`G B` board / `G G` graph / `G L` list）、`?` = shortcut sheet。
- **multi-select → palette が選択全体に作用**（Height の bulk パターン）。
  bulk の atomic 化は furrow 側の複数 id mutation 対応（下記ギャップ #3）待ち。それまでは逐次呼び。

## furrow ギャップ（furrow へ PR する。GUI 側で回避実装しない）

1. **`reorder --before <id>` / `--after <id>`**（相対位置指定）— DnD の insert-between を 1 write で。
   sparse priority の隙間枯渇時の再採番も同 write 内で atomic に。**Board view (t-t38k) が依存**（task: t-phgp）。
2. **lane 移動 + priority を 1 write に**（`set --priority`、可能なら `set --before/--after`）—
   cross-column DnD が `move`+`reorder` の 2 write に割れる問題。**Board view (t-t38k) が依存**（task: t-ecfm）。
3. **複数 id の一括 mutation**（`set`/`move`/`done` の複数 id 対応）— bulk 操作の
   N 回呼び出し / N commit を single write に。palette bulk (t-px9p) の品質向上（gate はしない。task: t-2kxt）。
4. **refs の後付け編集**（`furrow ref <id> --add/--rm`）— `add --ref` のみで編集手段が無い。
   detail での refs 編集に必要（v1 は表示のみでも可）。

## v1 スコープ外（明示）

- body(md) の編集エディタ／timeline・calendar／swimlane／複数ボード・任意 `.furrow` オープン／
  仮想化／milestone 等の追加概念（furrow のモデルに無いものは持ち込まない）。

## 実装順（task 化済み。進捗の正本は各 task body）

scaffold → Rust core（furrow 解決・exec・fs-watch）→ adapter + Query 統合（contract test 含む）
→ **Board + DnD + blocked 旗**（furrow ギャップ #1 #2 が先行）→ filter bar → side-peek detail
→ **Graph view** → palette/keyboard → add UI + sync 統合 + schema ガード。
