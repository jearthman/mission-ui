import { describe, expect, it } from 'vitest';
import { MODE_KINDS } from '../build/config.ts';
import { baseTokens, names, sourceFiles, sourceTokens } from './support.ts';

const DTCG_TYPES = new Set([
  'color',
  'dimension',
  'fontFamily',
  'fontWeight',
  'duration',
  'cubicBezier',
  'number',
  'strokeStyle',
  'border',
  'transition',
  'shadow',
  'gradient',
  'typography',
]);

describe('token source files', () => {
  it('use the .tokens.json extension', () => {
    const wrong = sourceFiles()
      .map((f) => f.file)
      .filter((file) => !file.endsWith('.tokens.json'));
    expect(wrong).toEqual([]);
  });

  it('use only DTCG-legal names (no ".", "{", "}", or leading "$")', () => {
    const bad = sourceFiles().flatMap(({ file, json }) =>
      names(json)
        .filter((path) => path.some((n) => /[.{}]/.test(n) || n.startsWith('$')))
        .map((path) => `${file}: ${path.join(' / ')}`),
    );
    expect(bad).toEqual([]);
  });

  it('give every token a DTCG type, except tokens marked as CSS extensions (ADR-0003)', () => {
    const untyped = baseTokens().filter((t) => t.type === undefined);
    const unmarked = untyped.filter(
      (t) => !(t.extensions?.['mission-ui'] as { cssProperty?: string } | undefined)?.cssProperty,
    );
    expect(unmarked.map((t) => t.path)).toEqual([]);
    expect(untyped.map((t) => t.path)).toEqual(['font.numeric']);

    const unknown = baseTokens().filter((t) => t.type !== undefined && !DTCG_TYPES.has(t.type));
    expect(unknown.map((t) => `${t.path}: ${String(t.type)}`)).toEqual([]);
  });

  it('write literal dimensions in px or rem and durations in ms or s', () => {
    const bad = sourceTokens().flatMap((t) => {
      const value = t.value as { value?: unknown; unit?: unknown };
      if (typeof t.value !== 'object' || t.value === null) return [];
      if (t.type === 'dimension' && !['px', 'rem'].includes(String(value.unit))) return [t.path];
      if (t.type === 'duration' && !['ms', 's'].includes(String(value.unit))) return [t.path];
      return [];
    });
    expect(bad).toEqual([]);
  });

  it('define each token path in only one base file', () => {
    const seen = new Map<string, string>();
    const duplicates: string[] = [];
    for (const token of baseTokens()) {
      const previous = seen.get(token.path);
      if (previous) duplicates.push(`${token.path} in ${previous} and ${token.file}`);
      seen.set(token.path, token.file);
    }
    expect(duplicates).toEqual([]);
  });
});

describe('mode override files', () => {
  const base = new Map(baseTokens().map((t) => [t.path, t]));
  const overrides = sourceTokens().filter((t) => t.isMode);

  it('set only $value; descriptions and types live on the base token', () => {
    const extra = overrides.filter((t) => t.keys.some((key) => key !== '$value'));
    expect(extra.map((t) => `${t.file}: ${t.path} sets ${t.keys.join(', ')}`)).toEqual([]);
  });

  it('override only system tokens that already exist', () => {
    const bad = overrides.filter((t) => base.get(t.path)?.tier !== 'system');
    expect(bad.map((t) => `${t.file}: ${t.path}`)).toEqual([]);
  });

  it('replace object values whole, so no stale key (such as hex) survives a merge', () => {
    const partial = overrides.filter((t) => {
      const original = base.get(t.path)?.value;
      if (typeof t.value !== 'object' || typeof original !== 'object' || original === null) {
        return false;
      }
      return Object.keys(original).some((key) => !(key in (t.value as object)));
    });
    expect(partial.map((t) => t.path)).toEqual([]);
  });

  it('give every non-default theme the same set of overrides', () => {
    const files = Object.values(MODE_KINDS.theme.overrides);
    const [first, ...rest] = files.map((file) =>
      overrides
        .filter((t) => t.file === `modes/${file}`)
        .map((t) => t.path)
        .sort(),
    );
    for (const paths of rest) expect(paths).toEqual(first);
  });
});
