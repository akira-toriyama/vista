# glossary

vista で使う用語集。ユーザーと Claude Code の認識ズレ防止が目的。
用語の追加・改名はコード変更と同一 PR で行う。

| 用語 | 意味 |
|---|---|
| **board（ボード）** | 1 つの `.furrow/` ストア。vista v1 は中央ボード（projects checkout）固定。語彙（lanes/types 等）は `furrow board --json` = `BoardInfo` が正で、ハードコードしない |
| **lane（レーン）** | タスクの状態列（inbox/backlog/ready/…）。`config.toml [lanes].order` 由来の文字列。TS では `Lane` 型（= string alias） |
| **shard（シャード）** | `.furrow/tasks/<id>.json` 1 ファイル = 1 タスクのメタデータ。TS 型は `furrow schema task` から codegen した `FurrowTaskShardV2`（別名 `TaskShard`） |
| **codegen** | `pnpm codegen`（scripts/codegen-furrow-types.mjs）。`furrow schema task` の JSON Schema から `src/domain/generated/` に TS 型とスキーマ snapshot を生成・コミットする。手書きの Task 型は持たない |
| **schema drift guard** | contract test の 1 本。live の `furrow schema task` と vendored snapshot を diff し、furrow 側のスキーマ変更で codegen が古びたら CI を落とす |
| **Task / TaskDetail** | `Task` = `furrow ls --json` の 1 行（shard + furrow が計算する `actionable`/`blocked_by`/`container`/`stuck`）。`TaskDetail` = `furrow show --json`（shard + `body_text`）。計算フラグを vista 側で再導出しない（ロジック正本 = furrow） |
| **MutationReport** | `add` 以外の mutation が返す `{after, before, changed}`。`add` だけは before が存在しないため素の shard を返す |
| **FurrowPort** | application 層の interface。furrow への唯一の出入口で、CLI/JSON 契約の薄い型付きミラー。`sync` と `reorder` は各機能タスク（sync 統合／furrow t-phgp）到着まで意図的に不在 |
| **furrow-client** | `createFurrowClient(exec)`。FurrowPort の exec 非依存コア: argv 組み立て・exit code 契約（0/1/2/3+）の解釈・stderr `{"error":{…}}` 封筒の parse。本番は Tauri invoke、contract test は child_process から同一コードを通す |
| **TauriFurrowAdapter** | `createTauriFurrowAdapter()`。本番の FurrowPort 実装。`furrow_exec` invoke + `tasks://changed` 購読。runtime で `@tauri-apps/*` に触る唯一のモジュール |
| **FurrowError** | furrow 境界の typed error。`kind`: `not-found`(exit 1) / `validation`(exit 2) / `internal`(exit 3+) / `core`(Rust CoreError: spawn 失敗等) / `bad-output`(exit 0 だが stdout が期待 JSON でない) |
| **exec bridge** | Rust 側 `furrow_exec` コマンド。ホストの furrow をボード root cwd で spawn し、生の `ExecResult {code, stdout, stderr}` を返すだけ（解釈は TS 側） |
| **tasks://changed** | Rust の fs-watcher が `.furrow/` 変更で emit する Tauri event。`useTasksChangedInvalidation` が受けて `['tasks']` サブツリーと board を invalidate（CLI からの並行編集に GUI が追随する仕組み） |
| **queryKey 階層** | TanStack Query のキー設計。`['tasks']` を根に `list`/`detail`/`deps` がぶら下がり、書き込み後は根ごと invalidate（どの write も他行の actionable/blocked を変えうるため） |
| **contract test** | `tests/contract/`（vitest の node project）。temp dir に `furrow init` した使い捨てボードへ、本番と同じ furrow-client で実バイナリを叩き JSON 契約を検証。furrow が PATH に無ければ skip |
| **composition root** | `src/main.tsx`。具象 adapter と port が出会う唯一の場所（QueryClientProvider + FurrowPortProvider の配線） |
