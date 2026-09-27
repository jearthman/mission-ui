---
status: accepted
date: 2026-09-27
decision-makers: James Earthman
---

# Use a pnpm + Turborepo monorepo with one-way package layers

## Context and Problem Statement

Mission UI is a set of tokens, primitives, compliance components, domain components, a map, a docs site, and a reference app ([build plan](../build-plan.md), Step 0). Tokens, components, and docs have to change together and be tested together. The kit must also stay separate from contract-funded work so its funding source can be shown (DFARS 252.227-7014), and it must build with no internet access.

How should the code be organized so the parts version together, the layers stay one-way, and the kit's funding stays traceable?

## Decision Drivers

- A token change, the components it affects, and their docs should land in one reviewed change.
- The layer direction in the build plan (tokens, then primitives, then domain components, then apps) must be enforceable, not just documented.
- Kit code must be kept apart from program code to support a restricted-rights assertion.
- Builds must work offline from a lockfile, with a small, auditable dependency set.
- Consumers need independent per-package versions (Step 12).
- Claude Code and new hires need a predictable layout.

## Considered Options

- pnpm workspaces + Turborepo monorepo
- pnpm workspaces + Nx monorepo
- Polyrepo, one repository per package
- Single package with subpath exports

## Decision Outcome

Chosen option: "pnpm workspaces + Turborepo monorepo", because it is the only option that keeps changes atomic across layers while still enforcing layer boundaries through declared dependencies, and it adds the least tooling to audit.

### Layout

| Path               | Package                                                 | Layer                         | May import                |
| ------------------ | ------------------------------------------------------- | ----------------------------- | ------------------------- |
| `packages/tokens`  | `@mission-ui/tokens`                                    | Foundation                    | nothing                   |
| `packages/ui`      | `@mission-ui/ui`                                        | Primitives, compliance, shell | `tokens`                  |
| `packages/mission` | `@mission-ui/mission`                                   | Domain components             | `tokens`, `ui`            |
| `packages/map`     | `@mission-ui/map`                                       | Geospatial                    | `tokens`, `ui`, `mission` |
| `apps/docs`        | `@mission-ui/docs`                                      | Storybook                     | any package               |
| `apps/reference`   | `@mission-ui/reference`                                 | Sample app                    | `ui`, `mission`, `map`    |
| `tooling/*`        | `@mission-ui/{tsconfig,eslint-config,stylelint-config}` | Build config                  | n/a                       |

- `map` sits above `mission` because its feature list (the text alternative to the map, Step 7) is the `mission` DataTable. `mission` never imports `map`.
- Apps do not depend on `tokens` directly. They get tokens through the kit stylesheet in `ui`, per the plan's rule that product apps do not reach past the shell.
- Every package is `private: true` and `UNLICENSED` until the private registry exists (Step 12). That prevents an accidental publish of company IP to the public npm registry. Changesets still versions private packages (`privatePackages.version: true`).

### Toolchain

| Tool               | Version                      | Notes                                                                                                                   |
| ------------------ | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Node.js            | 24 LTS (`.nvmrc`, `engines`) | Style Dictionary v5 needs 22+. Revisit when Node 26 enters LTS.                                                         |
| pnpm               | 11.27.1 (`packageManager`)   | pnpm 12 is a Rust rewrite released 2026-08-26. Stay on 11 until 12 has a longer track record; lockfiles are compatible. |
| Turborepo          | 2.11                         | Remote cache stays off. Telemetry is disabled per machine and in CI.                                                    |
| TypeScript         | 6.0.x                        | TypeScript 7 (native) is out, but typescript-eslint 8 supports only `<6.1`. Move when it does.                          |
| ESLint             | 10 + typescript-eslint 8     | Flat config, `strictTypeChecked` + `stylisticTypeChecked`.                                                              |
| Stylelint          | 17                           | Bans raw colors and `!important`. Step 2 adds the unlayered-rule check.                                                 |
| Changesets         | 3                            | Independent versions per package.                                                                                       |
| commitlint + husky | 21 + 9                       | Conventional Commits on `commit-msg`.                                                                                   |
| Prettier           | 3                            | Formatting only; ESLint does not format.                                                                                |

Compiler baseline for every package: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `verbatimModuleSyntax`, ES2023, and `NodeNext` module resolution so emitted ESM runs in Node and in bundlers alike. Library packages compile with `tsc` to `dist/`.

pnpm 11 blocks dependency install scripts unless they are listed in `allowBuilds`, and holds back versions published less than a day ago. The allowlist starts empty.

### Consequences

- Good, because a token rename, its component changes, and the docs update ship in one PR and one CI run.
- Good, because pnpm's strict isolation means a package can only import what it declares, so the layer table above is enforced at resolution time. dependency-cruiser adds an explicit check in Step 4.
- Good, because the kit's packages are identifiable by path, which supports a per-package funding record.
- Good, because Turborepo caches by task and input hash, so CI stays fast as packages grow.
- Bad, because every contributor needs Node 24 and pnpm 11 exactly; an older pnpm fails on `engines`.
- Bad, because `typecheck` and `lint` depend on upstream `build` output, so a cold run builds first.
- Bad, because relative imports need `.js` extensions under `NodeNext`, which surprises people used to bundler resolution.

### Confirmation

- `pnpm build`, `pnpm typecheck`, and `pnpm lint` pass from a clean clone.
- A package importing another it has not declared fails `typecheck`.
- Step 4 adds dependency-cruiser rules that fail CI when an import goes against the layer table.
- commitlint rejects non-conventional commit messages on `commit-msg`.

## Pros and Cons of the Options

### pnpm workspaces + Turborepo monorepo

- Good, because pnpm's content-addressed store and lockfile support `pnpm install --offline` against a registry mirror (Step 11).
- Good, because Turborepo is one binary with a small config file.
- Neutral, because Turborepo sends anonymous telemetry unless disabled.
- Bad, because Turborepo has no built-in boundary rules; we rely on declared dependencies and dependency-cruiser.

### pnpm workspaces + Nx monorepo

- Good, because Nx has module-boundary lint rules and code generators built in.
- Bad, because it brings a larger plugin surface to audit and put in the SBOM.
- Bad, because its generators overlap with the Claude Code skills planned in Step 9.

### Polyrepo, one repository per package

- Good, because each package's history and access control are fully separate.
- Bad, because a token change needs coordinated releases across repositories before it can be tested end to end.
- Bad, because the docs site cannot build against unreleased component changes.

### Single package with subpath exports

- Good, because there is only one version and one build.
- Bad, because nothing stops `tokens` code from importing components, so layering is only a convention.
- Bad, because a consumer that needs only tokens (for example a map worker) still takes the whole package.

## More Information

**Open question for Step 8.** The build plan puts the app shell in `packages/ui/src/shell`, but the shell's global status bar composes the UTC clock and notifications, which live in `packages/mission`. `ui` may not import `mission`. Resolve with an ADR before Step 8. Options:

1. Add a `packages/shell` layer that may import `ui`, `mission`, and `map`. This is the likely choice.
2. Keep the shell in `ui` and have it take the clock and notification tray as slots that the app fills.
3. Move the clock and notification components down into `ui`.

Revisit this ADR when TypeScript 7 is supported by typescript-eslint, when pnpm 12 has been stable for a few months, or when a second program adopts the kit (Step 12).
