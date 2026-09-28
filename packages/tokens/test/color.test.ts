import Color from 'colorjs.io';
import { describe, expect, it } from 'vitest';
import { baseTokens, colorsIn, referencesIn, sourceTokens } from './support.ts';

interface DtcgColor {
  colorSpace: string;
  components: number[];
  alpha?: number;
  hex?: string;
}

const literals = sourceTokens().flatMap((t) =>
  colorsIn(t.value).map((color) => ({ path: t.path, color: color as unknown as DtcgColor })),
);

describe('color literals', () => {
  it('are authored in OKLCH with a hex fallback', () => {
    expect(literals.length).toBeGreaterThan(0);
    const bad = literals.filter(
      ({ color }) => color.colorSpace !== 'oklch' || !/^#[0-9a-f]{6}$/.test(color.hex ?? ''),
    );
    expect(bad.map((c) => c.path)).toEqual([]);
  });

  it('sit inside the sRGB gamut', () => {
    const outside = literals.filter(
      ({ color }) =>
        !new Color('oklch', color.components as [number, number, number]).inGamut('srgb'),
    );
    expect(outside.map((c) => c.path)).toEqual([]);
  });

  it('have a hex fallback within one step per channel of the OKLCH value', () => {
    const drift = literals.flatMap(({ path, color }) => {
      const fromOklch = new Color('oklch', color.components as [number, number, number])
        .to('srgb')
        .coords.map((c) => Math.round((c ?? 0) * 255));
      const fromHex = new Color(color.hex ?? '')
        .to('srgb')
        .coords.map((c) => Math.round((c ?? 0) * 255));
      const off = fromOklch.some((c, i) => Math.abs(c - (fromHex[i] ?? 0)) > 1);
      return off ? [`${path}: oklch -> ${fromOklch.join(',')}, hex ${String(color.hex)}`] : [];
    });
    expect(drift).toEqual([]);
  });
});

describe('classification colors', () => {
  const tokens = new Map(baseTokens().map((t) => [t.path, t]));

  // Astro values: SF 706-712 labels plus SF-902 purple for CUI.
  it.each([
    ['unclassified', '#007a33', '{color.gray.0}'],
    ['cui', '#502b85', '{color.gray.0}'],
    ['confidential', '#0033a0', '{color.gray.0}'],
    ['secret', '#c8102e', '{color.gray.0}'],
    ['top-secret', '#ff8c00', '{color.gray.1000}'],
    ['top-secret-sci', '#fce83a', '{color.gray.1000}'],
  ])('%s is %s with %s text', (level, background, text) => {
    const bg = tokens.get(`classification.${level}.background`)?.value as DtcgColor | undefined;
    expect(bg?.hex).toBe(background);
    expect(tokens.get(`classification.${level}.text`)?.value).toBe(text);
  });

  it('are referenced only by marking component tokens', () => {
    const users = sourceTokens().filter(
      (t) =>
        !t.path.startsWith('classification.') &&
        !t.path.startsWith('marking.') &&
        referencesIn(t.value).some((ref) => ref.startsWith('classification.')),
    );
    expect(users.map((t) => t.path)).toEqual([]);
  });

  it('never borrow a status color, and status never borrows a classification color', () => {
    const crossed = sourceTokens().filter((t) => {
      const refs = referencesIn(t.value);
      return (
        (t.path.startsWith('classification.') && refs.some((r) => r.startsWith('color.status.'))) ||
        (t.path.startsWith('color.status.') && refs.some((r) => r.startsWith('classification.')))
      );
    });
    expect(crossed.map((t) => t.path)).toEqual([]);
  });
});
