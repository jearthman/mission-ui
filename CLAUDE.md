# Mission UI

Design system for mission and operations software: design tokens, accessible primitives, compliance components (consent, session timeout, classification markings), mission domain components, and a map. Built for defense and public-sector programs, so it must run offline, under a strict CSP, and meet Section 508.

- Build plan: [docs/build-plan.md](docs/build-plan.md). Each step has a Claude Code prompt and a definition of done.
- Decisions: [docs/adr/](docs/adr/). Funding record: [docs/ip/funding-record.md](docs/ip/funding-record.md).

**Current state:** Steps 0 (foundations) and 1 (tokens) are done; ADR-0003 awaits approval. `ui`, `mission`, and `map` are still empty placeholders. Next is Step 2, CSS architecture and theming. Update this line at the end of every step.

## Package map

Imports flow one way. A package may import only packages to its left: `tokens` → `ui` → `mission` → `map` → apps.

| Path                       | Package                        | Holds                                                                    |
| -------------------------- | ------------------------------ | ------------------------------------------------------------------------ |
| `packages/tokens`          | `@mission-ui/tokens`           | DTCG token source; generated CSS variables, TS constants, Tailwind theme |
| `packages/ui`              | `@mission-ui/ui`               | Kit stylesheet, primitives, compliance components, shell                 |
| `packages/mission`         | `@mission-ui/mission`          | DataTable, status, notifications, time, entities, event log, charts      |
| `packages/map`             | `@mission-ui/map`              | Map adapter, offline basemaps, symbology, coordinates                    |
| `apps/docs`                | `@mission-ui/docs`             | Storybook docs and story tests (placeholder until Step 4)                |
| `apps/reference`           | `@mission-ui/reference`        | Sample app built only from the kit (placeholder until Step 8)            |
| `tooling/tsconfig`         | `@mission-ui/tsconfig`         | Shared compiler settings (`base.json`, `library.json`)                   |
| `tooling/eslint-config`    | `@mission-ui/eslint-config`    | Shared ESLint flat config (`createConfig`)                               |
| `tooling/stylelint-config` | `@mission-ui/stylelint-config` | Shared Stylelint config                                                  |

## Commands

Needs Node 24 (`nvm use`) and pnpm 11.27.1 (pinned in `packageManager`). An older pnpm fails on `engines`.

```bash
pnpm install
pnpm build                   # every package, in dependency order
pnpm typecheck
pnpm lint
pnpm test                    # Vitest; tokens run contrast, alias, tier, and description checks
pnpm format                  # Prettier; format:check to verify
pnpm changeset               # record a version bump for changed packages
pnpm --filter tokens build   # one package; the @mission-ui/ scope is optional
```

## Golden rules

1. Every new component ships with a story, a test, and token-only styling.
2. Components and apps use system-tier tokens only (`color.surface.raised`, never `color.gray.950` or `dimension.16`). No raw colors, raw sizes, or arbitrary Tailwind values like `bg-[#fff]`.
3. Never import against the layer direction above. A new cross-package dependency needs an ADR.
4. Offline by default: no CDNs, remote fonts, icons, or tiles, and no network calls at build or run time.
5. Compile-time styling only: no runtime CSS-in-JS, inline `<style>`, or inline scripts.
6. Compliance lives in the kit. Apps use the kit's consent gate, session guard, and markings instead of building their own. Status, classification, and affiliation colors never share tokens.
7. Synthetic data only. Never put contract data, CUI, or classified information in code, stories, tests, fixtures, or prompts.
8. Few, permissive dependencies: MIT, Apache-2.0, BSD, ISC, and OFL for fonts. A new runtime dependency needs a reason in the PR. Any other license needs an ADR.
9. Any decision gets an ADR in `docs/adr/` (copy `template.md`) before code is written.

## Tokens

Rules from ADR-0003. Sources are DTCG 2025.10 files in `packages/tokens/tokens/{reference,system,component,modes}/`. Everything in `dist/` is generated; never edit it.

- Choose a token by reading its `$description` (in the source files or `dist/tokens.json`). If none fits, add one; don't approximate with a raw value.
- Tailwind utilities come from token paths: `bg-surface-raised`, `text-text-primary`, `border-border-default`, `p-4` (4 px steps), `h-control-height`, `px-cell-inline`, `text-body`, `rounded-control`, `shadow-overlay`, `ease-standard`. Tailwind's default palette and scales (`bg-blue-500`, `text-sm`, `p-7`) do not exist.
- z-index, durations, border widths, focus rings, and `font.numeric` have no Tailwind namespace. Use their `--mission-*` variables, for example `z-(--mission-z-marking)`.
- Code that cannot read CSS (MapLibre, deck.gl, canvas) uses `resolveTokens({ theme })` from `@mission-ui/tokens`, never hard-coded colors.
- New system and component tokens need a `$description`. Components reference system or component tokens only; only system tokens may reference the reference tier.
- Colors are OKLCH inside the sRGB gamut with a computed `hex` fallback (a test checks they agree). Add every new foreground/background pairing to `packages/tokens/test/contrast-pairs.ts`.
- Mode files in `tokens/modes/` set `$value` only, and every theme overrides the same tokens.
- Status color always comes with a symbol shape or text; red means critical only. Classification colors are for marking components only. Categorical colors never signal status.
- Density comes from `size.control.height`, `size.row.height`, and the `space.control`/`cell`/`panel` tokens. Don't add per-component `size` props for density.

## Conventions

- TypeScript is `strict` with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`. Fix the types; never loosen the config or reach for `any`.
- ESM with `NodeNext` resolution: relative imports need the `.js` extension. Use `import type` for types. Build scripts that Node runs directly (such as `packages/tokens/build/`) import `.ts` files instead.
- Commits follow Conventional Commits (commitlint runs on `commit-msg`). Scope is optional; if used, it is one of `tokens`, `ui`, `mission`, `map`, `docs`, `reference`, `tooling`, `adr`, `deps`, `release`, `repo`.
- A consumer-visible change to anything in `packages/` or `tooling/` needs a changeset (`pnpm changeset`).
- All packages stay `private: true` until the private registry exists (Step 12). Do not remove it or add `publishConfig`.
- Hold TypeScript at 6.0.x and pnpm at 11.x (reasons in ADR-0001).
- Dependency install scripts are blocked. `allowBuilds` in `pnpm-workspace.yaml` is the allowlist; keep it short.
- Turborepo remote caching stays off. Disable telemetry once per machine with `pnpm exec turbo telemetry disable`.

## Working agreement

1. One build-plan step per branch. Start in plan mode with the step's definition of done as the acceptance criteria.
2. When a step contains a decision, write the ADR first.
3. At the end of each step, add its new rules to this file (or `.claude/rules/` after Step 9) and update **Current state**.
4. Run the checks before merging. Treat an agent's summary as a claim to verify.
5. Log any change in how kit work is funded in `docs/ip/funding-record.md`.
