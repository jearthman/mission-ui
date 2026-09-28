import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { inject } from 'vitest';
import { tierOf, TOKENS_DIR, type Tier } from '../build/config.ts';

/** A token as authored in a source file, before Style Dictionary touches it. */
export interface SourceToken {
  readonly path: string;
  /** Path relative to tokens/, such as `system/color.tokens.json`. */
  readonly file: string;
  readonly tier: Tier;
  readonly isMode: boolean;
  /** Own `$type`, or the closest ancestor group's. */
  readonly type: string | undefined;
  readonly value: unknown;
  readonly description: unknown;
  readonly extensions: Record<string, unknown> | undefined;
  /** Every `$`-prefixed key set on the token itself. */
  readonly keys: readonly string[];
}

export interface SourceFile {
  readonly file: string;
  readonly json: Record<string, unknown>;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function sourceFiles(): SourceFile[] {
  return readdirSync(TOKENS_DIR, { recursive: true, encoding: 'utf8' })
    .filter((file) => file.endsWith('.json'))
    .sort()
    .map((file) => ({
      file,
      json: JSON.parse(readFileSync(join(TOKENS_DIR, file), 'utf8')) as Record<string, unknown>,
    }));
}

/** Every group and token name in a file, with its dotted path. */
export function names(json: Record<string, unknown>, prefix: string[] = []): string[][] {
  return Object.entries(json).flatMap(([key, child]) => {
    if (key.startsWith('$') || !isObject(child)) return [];
    const path = [...prefix, key];
    return '$value' in child ? [path] : [path, ...names(child, path)];
  });
}

function collect(
  node: Record<string, unknown>,
  file: string,
  path: string[],
  inheritedType: string | undefined,
  out: SourceToken[],
): void {
  const type = typeof node.$type === 'string' ? node.$type : inheritedType;
  if ('$value' in node) {
    const absolute = join(TOKENS_DIR, file);
    out.push({
      path: path.join('.'),
      file,
      tier: tierOf(absolute),
      isMode: relative(TOKENS_DIR, absolute).startsWith('modes'),
      type,
      value: node.$value,
      description: node.$description,
      extensions: isObject(node.$extensions) ? node.$extensions : undefined,
      keys: Object.keys(node).filter((key) => key.startsWith('$')),
    });
    return;
  }
  for (const [key, child] of Object.entries(node)) {
    if (!key.startsWith('$') && isObject(child)) collect(child, file, [...path, key], type, out);
  }
}

/** Every token in every source file, mode overrides included. */
export function sourceTokens(): SourceToken[] {
  const out: SourceToken[] = [];
  for (const { file, json } of sourceFiles()) collect(json, file, [], undefined, out);
  return out;
}

/** The default set: reference, system, and component files. */
export const baseTokens = (): SourceToken[] => sourceTokens().filter((t) => !t.isMode);

/** Dotted paths referenced anywhere in a value, including inside composites. */
export function referencesIn(value: unknown): string[] {
  if (typeof value === 'string') return [...value.matchAll(/\{([^{}]+)\}/g)].map((m) => m[1] ?? '');
  if (Array.isArray(value)) return value.flatMap(referencesIn);
  if (isObject(value)) return Object.values(value).flatMap(referencesIn);
  return [];
}

/** DTCG color objects anywhere in a value, such as a shadow's color. */
export function colorsIn(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.flatMap(colorsIn);
  if (!isObject(value)) return [];
  if ('colorSpace' in value && 'components' in value) return [value];
  return Object.values(value).flatMap(colorsIn);
}

// Built outputs --------------------------------------------------------------

export type OutputName = 'tokens.css' | 'theme.css' | 'tokens.ts' | 'tokens.json';

export const outDir = (): string => inject('outDir');

export function output(name: OutputName): string {
  const buildError = inject('buildError');
  if (buildError) throw new Error(`The token build failed:\n${buildError}`);
  return readFileSync(join(outDir(), name), 'utf8');
}

export interface BuiltToken {
  tier: Tier;
  type?: string;
  description?: string;
  value: string | number;
  aliasOf?: string;
  source?: unknown;
  cssVariable?: string;
  modes?: Record<string, Record<string, string | number>>;
}

export interface BuiltJson {
  cssPrefix: string;
  modes: Record<string, { default: string; values: string[] }>;
  tokens: Record<string, BuiltToken>;
}

export const builtJson = (): BuiltJson => JSON.parse(output('tokens.json')) as BuiltJson;

/** A token's value in one mode, falling back to its default. */
export function valueIn(
  json: BuiltJson,
  path: string,
  kind: string,
  mode: string,
): string | number {
  const token = json.tokens[path];
  if (!token) throw new Error(`No token ${path}`);
  return token.modes?.[kind]?.[mode] ?? token.value;
}

/** Declarations inside the first block whose selector matches exactly. */
export function cssBlock(css: string, selector: string): Map<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`No block for ${selector}`);
  const body = css.slice(start + selector.length + 2, css.indexOf('\n}', start));
  const declarations = new Map<string, string>();
  for (const match of body.matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
    declarations.set(match[1] ?? '', (match[2] ?? '').trim());
  }
  return declarations;
}

/** CSS length in px, for rem and px values at the default 16 px root. */
export function toPx(value: string | number): number {
  const match = /^(-?[\d.]+)(rem|px)$/.exec(String(value));
  if (!match) throw new Error(`Not a px or rem length: ${String(value)}`);
  return Number(match[1]) * (match[2] === 'rem' ? 16 : 1);
}
