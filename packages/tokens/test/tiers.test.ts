import { describe, expect, it } from 'vitest';
import type { Tier } from '../build/config.ts';
import { baseTokens, builtJson, output, referencesIn, sourceTokens } from './support.ts';

const tierOf = new Map(baseTokens().map((t) => [t.path, t.tier]));

/** Which tiers each tier may reference (ADR-0003). */
const ALLOWED: Record<Tier, Tier[]> = {
  reference: [],
  system: ['reference', 'system'],
  component: ['system', 'component'],
};

describe('tier rules', () => {
  it.each(Object.entries(ALLOWED))('%s tokens reference only allowed tiers', (tier, allowed) => {
    const violations = sourceTokens()
      .filter((t) => t.tier === tier)
      .flatMap((t) =>
        referencesIn(t.value)
          .filter((ref) => {
            const refTier = tierOf.get(ref);
            return refTier === undefined || !allowed.includes(refTier);
          })
          .map((ref) => `${t.path} (${t.file}) -> ${ref} (${tierOf.get(ref) ?? 'missing'})`),
      );
    expect(violations).toEqual([]);
  });
});

describe('the reference tier stays inside the package', () => {
  const tokens = () => Object.entries(builtJson().tokens);
  const referencePaths = () =>
    tokens()
      .filter(([, t]) => t.tier === 'reference')
      .map(([path]) => path);
  const variables = (tiers: Tier[]) =>
    new Set(
      tokens().flatMap(([, t]) => (tiers.includes(t.tier) && t.cssVariable ? [t.cssVariable] : [])),
    );

  it('has no CSS variables', () => {
    expect(referencePaths().length).toBeGreaterThan(0);
    const emitted = variables(['system', 'component']);
    const declared = [...output('tokens.css').matchAll(/(--mission-[\w-]+):/g)].map((m) => m[1]);
    expect(declared.filter((name) => !emitted.has(name ?? ''))).toEqual([]);
  });

  it('is not exported from tokens.ts', () => {
    const ts = output('tokens.ts');
    expect(referencePaths().filter((path) => ts.includes(`"${path}"`))).toEqual([]);
  });

  it('is not mapped by the Tailwind theme, and neither is the component tier', () => {
    const systemVariables = variables(['system']);
    const used = [...output('theme.css').matchAll(/var\((--mission-[\w-]+)\)/g)].map((m) => m[1]);
    expect(used.filter((name) => !systemVariables.has(name ?? ''))).toEqual([]);
  });
});
