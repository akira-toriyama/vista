# vista

furrow GUI front-end — reads furrow via CLI/JSON

Design doc: [docs/superpowers/specs/2026-07-16-vista-gui-v1-design.md](docs/superpowers/specs/2026-07-16-vista-gui-v1-design.md)

## Development

Requires Node.js + pnpm, Rust (for the Tauri shell), and `furrow` on PATH
(contract tests skip gracefully without it).

```sh
pnpm install
pnpm dev            # Vite dev server (WebView UI only)
pnpm tauri dev      # full Tauri app
pnpm check          # types + lint + format + test (100% cov) + deadcode + build — same as CI
```

## Architecture

TypeScript is layered `ui → application → domain`, with `infrastructure`
implementing the application ports (the only layer allowed to import
`@tauri-apps/*`). The dependency direction is enforced by
`eslint-plugin-boundaries` — violations are lint errors.
