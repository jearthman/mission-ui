# Mission UI

A design system for mission and operations software used on government and defense programs. It covers design tokens, accessible components, compliance components (DoD consent banner, session timeout, classification markings), mission data components, and an offline map.

The kit is built in 13 steps, described in [docs/build-plan.md](docs/build-plan.md). Step 0, repository foundations, is complete.

## Getting started

Requires Node.js 24 and pnpm 11.

```bash
nvm use
pnpm install
pnpm build
```

Then `pnpm typecheck` and `pnpm lint` should both pass. Turborepo collects anonymous telemetry by default; turn it off once per machine:

```bash
pnpm exec turbo telemetry disable
```

## Layout

| Path               | Contents                                           |
| ------------------ | -------------------------------------------------- |
| `packages/tokens`  | Design tokens and generated outputs                |
| `packages/ui`      | Primitives, compliance components, shell           |
| `packages/mission` | Data tables, status, notifications, time, entities |
| `packages/map`     | Map, offline basemaps, symbology                   |
| `apps/docs`        | Storybook documentation                            |
| `apps/reference`   | Sample app built only from the kit                 |
| `tooling/*`        | Shared TypeScript, ESLint, and Stylelint configs   |
| `docs/adr`         | Architecture decision records                      |
| `docs/ip`          | Funding-source record for the kit                  |

[CLAUDE.md](CLAUDE.md) lists the rules that apply to every change, for people and for Claude Code alike.

## Contributing

- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/). A hook checks them.
- Add a changeset (`pnpm changeset`) for any change consumers would notice.
- Record decisions as ADRs in `docs/adr/` before writing code.

## License

Proprietary. All rights reserved. How kit work is funded is tracked in [docs/ip/funding-record.md](docs/ip/funding-record.md).
