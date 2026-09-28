import type { TransformedToken } from 'style-dictionary/types';
import { PREFIX } from '../config.ts';
import type { TokenModel } from '../model.ts';
import { tierOfToken } from '../passes.ts';
import { generatedHeader } from './header.ts';

/**
 * Tailwind namespaces the kit owns. Each is reset, so only token-backed
 * utilities exist: `bg-surface-raised` compiles, `bg-blue-500` does not.
 * Resetting `--spacing` (Tailwind's multiplier) leaves only the space.* steps:
 * `p-4` compiles, `p-7` and `p-0.5` do not. Breakpoints, containers, and
 * animations keep Tailwind's defaults until Step 2 decides otherwise.
 */
export const RESET_NAMESPACES = [
  '--color-*',
  '--font-*',
  '--font-weight-*',
  '--text-*',
  '--tracking-*',
  '--leading-*',
  '--spacing-*',
  '--spacing',
  '--radius-*',
  '--shadow-*',
  '--inset-shadow-*',
  '--drop-shadow-*',
  '--text-shadow-*',
  '--ease-*',
];

const TEXT_SUFFIX: Record<string, string> = {
  fontSize: '',
  lineHeight: '--line-height',
  fontWeight: '--font-weight',
  letterSpacing: '--letter-spacing',
};

/** Tailwind theme variable for a system token, or undefined if Tailwind has no namespace for it. */
export function tailwindVariable(token: TransformedToken): string | undefined {
  const [root = '', ...rest] = token.path;
  const name = rest.join('-');
  switch (root) {
    case 'color':
      return `--color-${name}`;
    case 'classification':
      return `--color-classification-${name}`;
    case 'space':
    case 'size':
      return `--spacing-${name}`;
    case 'radius':
      return `--radius-${name}`;
    case 'elevation':
      return `--shadow-${name}`;
    case 'font': {
      const [group, ...leaf] = rest;
      if (group === 'family') return `--font-${leaf.join('-')}`;
      if (group === 'weight') return `--font-weight-${leaf.join('-')}`;
      return undefined; // font.numeric: use var(--mission-font-numeric)
    }
    case 'type': {
      // Expanded typography: type.heading.sm.fontSize -> --text-heading-sm
      const property = rest.at(-1) ?? '';
      const suffix = TEXT_SUFFIX[property];
      if (suffix === undefined) return undefined; // fontFamily: pair with font-sans or font-mono
      return `--text-${rest.slice(0, -1).join('-')}${suffix}`;
    }
    case 'motion':
      return rest[0] === 'easing' ? `--ease-${rest.slice(1).join('-')}` : undefined;
    default:
      return undefined; // z, focus, border.width: no Tailwind namespace
  }
}

export function renderTailwindTheme(model: TokenModel): string {
  const lines: string[] = [];
  const seen = new Map<string, string>();
  for (const token of model.emitted) {
    if (tierOfToken(token) !== 'system') continue;
    const variable = tailwindVariable(token);
    if (variable === undefined) continue;
    const previous = seen.get(variable);
    if (previous !== undefined) {
      throw new Error(`${token.path.join('.')} and ${previous} both map to ${variable}`);
    }
    seen.set(variable, token.path.join('.'));
    lines.push(`  ${variable}: var(--${token.name});`);
  }

  // `text-caption` must mean one thing: a type style or a color, never both.
  const textStyles = [...seen.keys()]
    .filter((v) => v.startsWith('--text-') && !v.includes('--', 2))
    .map((v) => v.slice('--text-'.length));
  const colors = [...seen.keys()]
    .filter((v) => v.startsWith('--color-'))
    .map((v) => v.slice('--color-'.length));
  const clash = textStyles.filter((name) => colors.includes(name));
  if (clash.length > 0) throw new Error(`text-* is ambiguous for: ${clash.join(', ')}`);

  return [
    generatedHeader('/*', ' */'),
    '',
    '/*',
    ' * Tailwind v4 theme backed by Mission UI system tokens. Import it after',
    ' * `@import "tailwindcss";` and alongside tokens.css. `inline` makes each',
    ' * utility read the token variable, so theme and density changes apply at',
    ' * runtime. z-index, durations, border widths, focus rings, and font.numeric',
    ' * have no Tailwind namespace; use their --mission-* variables directly.',
    ' */',
    '@theme inline {',
    ...RESET_NAMESPACES.map((namespace) => `  ${namespace}: initial;`),
    '',
    '  /* Preflight and transition-* utilities read these defaults. Pointing',
    '     them at motion tokens makes every transition honor reduced motion. */',
    `  --default-font-family: var(--${PREFIX}-font-family-sans);`,
    `  --default-mono-font-family: var(--${PREFIX}-font-family-mono);`,
    `  --default-transition-duration: var(--${PREFIX}-motion-duration-short);`,
    `  --default-transition-timing-function: var(--${PREFIX}-motion-easing-standard);`,
    '',
    ...lines,
    '}',
    '',
  ].join('\n');
}
