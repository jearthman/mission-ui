---
status: accepted
date: 2026-09-27
decision-makers: James Earthman
---

# Three token tiers, with themes, density, and motion as override modes

## Context and Problem Statement

Step 1 of the [build plan](../build-plan.md) authors every design decision once as DTCG 2025.10 tokens and builds CSS variables, TypeScript constants, a Tailwind v4 theme, and resolved JSON. The kit ships three themes (dark default, light, high-contrast), two densities (comfortable default, compact), and a reduced-motion set. All of them must switch at runtime without a reload.

How should tokens be tiered so components and apps stay on-system, and how should modes be expressed when Style Dictionary 5.5 does not yet implement the DTCG Resolver module and supports only part of the 2025.10 format?

## Decision Drivers

- One source of truth that people and Claude Code can read. Every system token carries a `$description`.
- Components and apps cannot reach raw palette values, so a rebrand or a customer theme pack is a token change, not a code change.
- Theme and density switch by attribute on `<html>` with no reload, and also work when nested in a subtree (Storybook, previews).
- Map and WebGL layers (Step 7) cannot read CSS variables, so they need values per theme in TypeScript.
- Contrast, alias, tier, and description rules are checked by tests, not by review.
- The build uses tools we already audit and runs offline.

## Considered Options

Tier model:

- Three tiers: reference, system, component
- Two tiers: reference and semantic
- Semantic tokens only

Mode strategy:

- DTCG Resolver module documents
- One Style Dictionary pass per mode: base files plus an override file
- Mode values stored per token in `$extensions`
- A full, separate token set per theme

## Decision Outcome

Chosen: **three tiers** and **one Style Dictionary pass per mode**. The first matches the build plan and gives components their own stable names. The second is the plan's stated fallback and is the only option that keeps source files standard DTCG while working with Style Dictionary as it is today.

### Tiers

| Tier      | Lives in                          | Example                          | May reference     | Emitted to CSS and TS |
| --------- | --------------------------------- | -------------------------------- | ----------------- | --------------------- |
| Reference | `tokens/reference/`               | `color.gray.950`, `dimension.16` | nothing           | No                    |
| System    | `tokens/system/`, `tokens/modes/` | `color.surface.base`, `space.4`  | reference, system | Yes                   |
| Component | `tokens/component/`               | `table.row.height`               | system, component | Yes (not in Tailwind) |

- The tier comes from the directory, not the name. Reference and system tokens share roots such as `color` and `font`.
- Reference tokens are raw palette and scale values. They are not emitted as CSS variables or TypeScript constants, so nothing outside `packages/tokens` can use them.
- System tokens may hold a literal when no reusable primitive exists (line heights, z-index, shadow geometry).
- Only system tokens become Tailwind utilities. Component tokens are CSS variables for their one component.
- Classification marking colors live in their own `classification` root with literal values, and no other token may alias them. Status colors live under `color.status`. Affiliation colors get a third root in Step 7.

### Modes

| Kind    | Default (in `tokens/system/`) | Override files (`tokens/modes/`) | CSS selector                              |
| ------- | ----------------------------- | -------------------------------- | ----------------------------------------- |
| Theme   | dark                          | `light`, `high-contrast`         | `[data-theme="…"]`                        |
| Density | comfortable                   | `compact`                        | `[data-density="…"]`                      |
| Motion  | standard                      | `reduced-motion`                 | `@media (prefers-reduced-motion: reduce)` |

- An override file sets `$value` only, for tokens that already exist in `tokens/system/`. Descriptions and types live once, on the base token.
- The build runs Style Dictionary once for the base set and once per override, with the base files as `include` and the override as `source`.
- `tokens.css` holds `:root` with every system and component token at default values. It then has one block per mode, including an explicit block for each default (`[data-theme="dark"]`, `[data-density="comfortable"]`). Each block repeats every token whose value changes within that kind of mode, component tokens included. A nested `data-theme` or `data-density` attribute therefore re-resolves correctly, not just one set on `<html>`.
- Between emitted tokens, values use `var()` references, so devtools show the chain. References to the reference tier are resolved to literal values.
- Theme and density must not affect the same token. The build fails if they do.
- Following system `prefers-contrast` and `prefers-color-scheme`, and saving the user's choice, is Step 2. Step 1 emits only the selectors.

### Outputs

| File                               | Contents                                                                                                    |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `dist/tokens.css`                  | Custom properties, prefixed `--mission-`, for every system and component token and every mode               |
| `dist/theme.css`                   | A Tailwind v4 `@theme inline` block mapping system tokens to utilities, which resets each namespace it maps |
| `dist/tokens.ts` → `.js` + `.d.ts` | `tokens` defaults, per-mode overrides, `resolveTokens()`, `cssVariables`, and a `TokenName` type            |
| `dist/tokens.json`                 | Every token in every tier, with type, description, CSS variable, alias, OKLCH source, and per-mode values   |

The prefix is `--mission-`, not `--mui-`, because Material UI already uses `--mui-`.

Tailwind names come from the token path. Colors drop `color.` (`color.surface.raised` becomes `bg-surface-raised`). Spacing and sizing drop their first segment (`size.control.height` becomes `h-control-height`).

Layout spacing is a numeric scale in 4 px steps (`space.4` is `p-4`, 16 px), not t-shirt sizes. Tailwind resolves `max-w-md` and `w-xl` against spacing before container sizes, so `space.md` would silently turn `max-w-md` into 12 px. With numeric steps, `p-4`, `inset-0`, and `max-w-md` mean what Tailwind users expect. Only token steps exist (`p-7` and `p-0.5` do not compile). Typography styles map to `--text-*` with line height, weight, and letter spacing. Radius, shadow, easing, font family, and font weight map to their Tailwind namespaces. Tailwind has no namespace for z-index, durations, or border widths, so those remain CSS variables. The theme also points Tailwind's default transition duration and easing at the motion tokens, so every `transition-*` utility honors reduced motion.

### Color authoring

- Colors are authored in OKLCH, inside the sRGB gamut, with a `hex` fallback computed from the OKLCH value. A test fails if the two disagree.
- CSS and TypeScript emit the sRGB hex value. It is what every browser, MapLibre, and deck.gl render identically, and it is exactly what the contrast tests measure. OKLCH stays the design source for perceptual ramps. Emitting `oklch()` for wide-gamut displays can be revisited later.
- Contrast targets: body text 4.5:1 and non-text UI 3:1 (WCAG 2.2 SC 1.4.3, 1.4.11) in the dark and light themes. The high-contrast theme targets 7:1 for text (SC 1.4.6) and 4.5:1 for non-text UI. In the light theme, status fills may fail against the surface, as Astro allows, but their borders must pass.

### Style Dictionary gaps and our workarounds

| Gap in Style Dictionary 5.5.5                    | Workaround                                                                                                 |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| No DTCG Resolver or modes                        | One pass per mode, as above                                                                                |
| No transform for 2025.10 `duration` objects      | Custom `mission/duration/css` transform                                                                    |
| Shadow colors print in the source color space    | Custom `mission/shadow/css` transform that prints hex or `rgba()`                                          |
| Typography shorthand ignores `fontFamily` arrays | Typography tokens are expanded into sub-tokens (`expand`), which also feed Tailwind's `--text-*` variables |

When Style Dictionary supports the Resolver module, a new ADR can replace the per-mode passes. The token files will not need to change.

### Known deviation from DTCG

DTCG 2025.10 has no type for `font-variant-numeric`. `font.numeric` (tabular, slashed-zero figures for data columns) has no `$type` and is marked with `$extensions["mission-ui"].cssProperty`. Strict DTCG tools may reject that one token. It is the only token allowed to omit `$type`, and a test enforces that.

### Typefaces

Tokens name IBM Plex Sans and IBM Plex Mono (SIL OFL). They form one superfamily designed for technical UIs. Until Step 2 self-hosts the fonts, the stacks fall back to system fonts. Step 2 confirms the choice, checks that the files support the tabular-figure and slashed-zero features `font.numeric` asks for, or changes the family in one token file.

### Consequences

- Good, because components and apps cannot use palette values at all; the reference tier never reaches CSS or TypeScript.
- Good, because a theme or density change is one attribute, nested attributes work, and component tokens follow automatically.
- Good, because source files stay standard DTCG 2025.10 apart from one documented token.
- Good, because the contrast, alias, tier, and description rules run with `pnpm test` on every change, and in CI once Step 4 adds it.
- Bad, because we maintain the build script (about 700 lines, including the four output formats) until Style Dictionary supports the Resolver module.
- Bad, because hex output gives up wide-gamut color on capable displays.
- Bad, because Tailwind utility names follow token paths, so some read awkwardly (`text-text-primary`). That is the cost of names you can derive without looking them up.

### Confirmation

`pnpm --filter tokens test` checks:

- every text and UI color pair in each theme against its contrast target
- that every alias resolves, in the base set and in every mode
- tier rules, and that reference tokens are absent from all outputs
- that every system and component token has a `$description`
- that each OKLCH color is in the sRGB gamut and matches its hex fallback
- that override files only override existing system tokens, and that the themes cover the same tokens
- that classification colors match the marking table and are aliased by nothing outside marking components
- that `z.marking` is above every other layer, and compact targets stay at least 24 px
- that `theme.css` compiles with Tailwind v4, generates token utilities, and generates no default palette utilities such as `bg-blue-500`

## Pros and Cons of the Options

### Three tiers: reference, system, component

- Good, because components get names that can change underneath them (`table.row.height` follows density).
- Good, because a lint rule can ban one well-defined tier (Step 4).
- Bad, because there are more tokens to name and describe.

### Two tiers: reference and semantic

- Good, because it is simpler.
- Bad, because component-specific values end up as one-off semantic tokens or hard-coded values.

### Semantic tokens only

- Good, because it is the fewest tokens.
- Bad, because palette ramps are copied into semantic values, so a palette change touches every theme by hand.

### DTCG Resolver module documents

- Good, because it is the standard way to express modes.
- Bad, because Style Dictionary 5.5.5 does not implement it, and we would have to write our own resolver.

### One Style Dictionary pass per mode

- Good, because every file is standard DTCG and every pass uses Style Dictionary's own reference resolution and transforms.
- Bad, because assembling the mode blocks is our code.

### Mode values stored per token in `$extensions`

- Good, because it is a single pass.
- Bad, because the format is private to us, so other DTCG tools see only the dark values.

### A full, separate token set per theme

- Good, because it is simple to build.
- Bad, because descriptions and non-color tokens are copied three times and drift.

## More Information

- [DTCG Format 2025.10](https://www.designtokens.org/TR/2025.10/format/) and [Resolver 2025.10](https://www.designtokens.org/TR/2025.10/resolver/)
- [Style Dictionary 2025.10 support tracking issue](https://github.com/style-dictionary/style-dictionary/issues/1590)
- [Astro status system](https://www.astrouxds.com/patterns/status-system/) and [classification markings](https://www.astrouxds.com/components/classification-markings/)
- [Tailwind theme variables](https://tailwindcss.com/docs/theme)
- Revisit when Style Dictionary ships Resolver support, or when a customer theme pack is needed (Step 12).
