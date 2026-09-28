import { MODE_KIND_NAMES, MODE_KINDS, modesOf } from '../config.ts';
import { modeValues, type TokenModel } from '../model.ts';
import { pathOf, valueOf } from '../passes.ts';
import { generatedHeader } from './header.ts';

const literal = (value: unknown): string => JSON.stringify(value);
const union = (values: readonly string[]): string => values.map(literal).join(' | ');
const typeName = (kind: string): string => kind.charAt(0).toUpperCase() + kind.slice(1);

function record(entries: [string, string | number][], indent: string): string {
  if (entries.length === 0) return '{}';
  const body = entries.map(([key, value]) => `${indent}  ${literal(key)}: ${literal(value)},`);
  return `{\n${body.join('\n')}\n${indent}}`;
}

/**
 * Typed constants for code that cannot read CSS variables: MapLibre styles,
 * deck.gl layers, and canvas charts. Emits system and component tokens only.
 */
export function renderTypeScript(model: TokenModel): string {
  const tokens = model.emitted;
  const out: string[] = [generatedHeader('/**', ' */'), ''];

  for (const kind of MODE_KIND_NAMES) {
    out.push(`export type ${typeName(kind)} = ${union(modesOf(kind))};`);
  }
  out.push(
    '',
    'export interface ModeSelection {',
    ...MODE_KIND_NAMES.map((kind) => `  readonly ${kind}: ${typeName(kind)};`),
    '}',
    '',
    'export const defaultModes: ModeSelection = {',
    ...MODE_KIND_NAMES.map((kind) => `  ${kind}: ${literal(MODE_KINDS[kind].defaultMode)},`),
    '};',
    '',
    'export type TokenValue = string | number;',
    '',
    `export type TokenName =\n${tokens.map((t) => `  | ${literal(pathOf(t))}`).join('\n')};`,
    '',
    '/** Every token at the default modes. */',
    `export const tokens: Readonly<Record<TokenName, TokenValue>> = ${record(
      tokens.map((t) => [pathOf(t), valueOf(t)]),
      '',
    )};`,
    '',
    '/** Values that change with each mode. Merge over `tokens`, or call resolveTokens(). */',
    'export const modeTokens: {',
    ...MODE_KIND_NAMES.map(
      (kind) =>
        `  readonly ${kind}: Readonly<Record<${typeName(kind)}, Readonly<Partial<Record<TokenName, TokenValue>>>>>;`,
    ),
    '} = {',
  );
  for (const kind of MODE_KIND_NAMES) {
    out.push(`  ${kind}: {`);
    for (const mode of modesOf(kind)) {
      const entries = modeValues(model, kind, mode).map((t): [string, string | number] => [
        pathOf(t),
        valueOf(t),
      ]);
      out.push(`    ${literal(mode)}: ${record(entries, '    ')},`);
    }
    out.push('  },');
  }
  out.push(
    '};',
    '',
    '/** CSS custom property name for each token. */',
    `export const cssVariables: Readonly<Record<TokenName, string>> = ${record(
      tokens.map((t) => [pathOf(t), `--${t.name}`]),
      '',
    )};`,
    '',
    '/** `var(--mission-…)` for a token, for inline styles set through the CSSOM. */',
    'export function cssVar(name: TokenName): string {',
    '  return `var(${cssVariables[name]})`;',
    '}',
    '',
    '/** Token values for a combination of modes; omitted kinds use the default. */',
    'export function resolveTokens(',
    '  selection: Partial<ModeSelection> = {},',
    '): Readonly<Record<TokenName, TokenValue>> {',
    '  const modes = { ...defaultModes, ...selection };',
    '  return {',
    '    ...tokens,',
    ...MODE_KIND_NAMES.map((kind) => `    ...modeTokens.${kind}[modes.${kind}],`),
    '  };',
    '}',
    '',
  );
  return out.join('\n');
}
