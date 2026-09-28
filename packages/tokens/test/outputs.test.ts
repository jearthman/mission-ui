import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { builtJson, cssBlock, outDir, output, toPx, valueIn, type OutputName } from './support.ts';

const json = builtJson();
const css = output('tokens.css');
const emitted = Object.entries(json.tokens).filter(([, t]) => t.tier !== 'reference');
const variable = (path: string): string => json.tokens[path]?.cssVariable ?? '';

describe('build outputs', () => {
  it.each(['tokens.css', 'theme.css', 'tokens.ts', 'tokens.json'] satisfies OutputName[])(
    'emits %s',
    (name) => {
      expect(output(name).length).toBeGreaterThan(0);
    },
  );
});

describe('tokens.css', () => {
  it('declares every system and component token in :root', () => {
    const root = cssBlock(css, ':root');
    const missing = emitted.filter(([, t]) => !root.has(t.cssVariable ?? ''));
    expect(missing.map(([path]) => path)).toEqual([]);
  });

  it.each([
    ['theme', ['[data-theme="dark"]', '[data-theme="light"]', '[data-theme="high-contrast"]']],
    ['density', ['[data-density="comfortable"]', '[data-density="compact"]']],
  ])(
    'gives every %s block the same variables, so nested attributes switch cleanly',
    (_, selectors) => {
      const [first, ...rest] = selectors.map((s) => [...cssBlock(css, s).keys()].sort());
      expect(first?.length).toBeGreaterThan(0);
      for (const names of rest) expect(names).toEqual(first);
    },
  );

  it('keeps theme and density variables separate', () => {
    const theme = new Set(cssBlock(css, '[data-theme="dark"]').keys());
    const density = [...cssBlock(css, '[data-density="comfortable"]').keys()];
    expect(density.filter((name) => theme.has(name))).toEqual([]);
  });

  it('zeroes every motion duration under prefers-reduced-motion', () => {
    const reduced = cssBlock(css, '@media (prefers-reduced-motion: reduce)');
    const durations = emitted.filter(([path]) => path.startsWith('motion.duration.'));
    expect(durations.length).toBeGreaterThan(0);
    for (const [, token] of durations) expect(reduced.get(token.cssVariable ?? '')).toBe('0ms');
  });

  it('keeps references between emitted tokens as var()', () => {
    const root = cssBlock(css, ':root');
    expect(root.get(variable('table.row.height'))).toBe(`var(${variable('size.row.height')})`);
  });
});

describe('layers and density', () => {
  it('puts z.marking above every other layer', () => {
    const layers = emitted.filter(([path]) => path.startsWith('z.'));
    const marking = Number(json.tokens['z.marking']?.value);
    const others = layers.filter(([path]) => path !== 'z.marking').map(([, t]) => Number(t.value));
    expect(marking).toBeGreaterThan(Math.max(...others));
  });

  it.each(['size.control.height', 'size.row.height'])(
    'compact %s is smaller than comfortable and at least 24 px (WCAG 2.5.8)',
    (path) => {
      const comfortable = toPx(valueIn(json, path, 'density', 'comfortable'));
      const compact = toPx(valueIn(json, path, 'density', 'compact'));
      expect(compact).toBeLessThan(comfortable);
      expect(compact).toBeGreaterThanOrEqual(24);
    },
  );
});

describe('tokens.ts', async () => {
  const module = (await import(join(outDir(), 'tokens.ts'))) as {
    tokens: Record<string, string | number>;
    cssVariables: Record<string, string>;
    cssVar: (name: string) => string;
    resolveTokens: (selection?: Record<string, string>) => Record<string, string | number>;
  };

  it('exports every system and component token, and nothing else', () => {
    expect(Object.keys(module.tokens).sort()).toEqual(emitted.map(([path]) => path).sort());
  });

  it('resolves values for any combination of modes', () => {
    const resolved = module.resolveTokens({ theme: 'light', density: 'compact' });
    expect(resolved['color.surface.base']).toBe(
      valueIn(json, 'color.surface.base', 'theme', 'light'),
    );
    expect(resolved['size.row.height']).toBe(
      valueIn(json, 'size.row.height', 'density', 'compact'),
    );
    expect(module.resolveTokens()['color.surface.base']).toBe(
      json.tokens['color.surface.base']?.value,
    );
  });

  it('maps tokens to their CSS variables', () => {
    expect(module.cssVar('color.surface.base')).toBe(`var(${variable('color.surface.base')})`);
  });
});
