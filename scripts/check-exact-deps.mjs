/**
 * Gate: every dependency in package.json must be exact-pinned (no `^` / `~` /
 * other ranges). The house rule is exact pins — `pnpm-workspace.yaml` sets
 * `saveExact: true` so `pnpm add` pins going forward, but config only covers the
 * happy path. This check catches strays from a hand edit, a merge, or an
 * environment where that setting is absent (e.g. pnpm < 10 read it from .npmrc,
 * pnpm >= 10 reads it from pnpm-workspace.yaml — so a stale toolchain regresses
 * silently). Runs inside `pnpm check` via the `check:*` glob.
 *
 * Run with: pnpm check:deps
 */
import { readFileSync } from "node:fs";

const pkg = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);

const FIELDS = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
];

// A bare semver: 1.2.3, optionally -prerelease and +build. Anything else
// (^1.2.3, ~1.2, >=1, 1.x, 1 - 2, *, latest) is a range and fails.
const EXACT_SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

// Non-registry specifiers carry their own pinning semantics — leave them be.
const NON_REGISTRY =
  /^(?:workspace|catalog|npm|file|link|portal|git\+|https?):/;

const offenders = [];
let checked = 0;
for (const field of FIELDS) {
  for (const [name, spec] of Object.entries(pkg[field] ?? {})) {
    if (NON_REGISTRY.test(spec)) continue;
    checked += 1;
    if (!EXACT_SEMVER.test(spec)) {
      offenders.push(`  ${field} › ${name}: "${spec}"`);
    }
  }
}

if (offenders.length > 0) {
  console.error("Non-exact dependency specifiers (house rule: exact pin):");
  console.error(offenders.join("\n"));
  console.error(
    "\nPin the exact version. `pnpm add` pins automatically via " +
      "pnpm-workspace.yaml `saveExact: true`.",
  );
  process.exit(1);
}

console.log(`check:deps — ${checked} dependency specifiers are exact-pinned.`);
