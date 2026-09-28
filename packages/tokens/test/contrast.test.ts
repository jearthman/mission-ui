import Color from 'colorjs.io';
import { describe, expect, it } from 'vitest';
import { MINIMUM, PAIRS, THEMES } from './contrast-pairs.ts';
import { builtJson, valueIn } from './support.ts';

const json = builtJson();
const color = (path: string, theme: string) =>
  new Color(String(valueIn(json, path, 'theme', theme)));
const contrast = (a: string, b: string, theme: string) =>
  Color.contrast(color(a, theme), color(b, theme), 'WCAG21');

describe.each(THEMES)('%s theme contrast', (theme) => {
  const pairs = PAIRS.filter((p) => !p.themes || p.themes.includes(theme)).map((p) => ({
    ...p,
    minimum: MINIMUM[p.kind][theme],
  }));

  it.each(pairs)(
    '$foreground on $background ≥ $minimum:1',
    ({ foreground, background, minimum }) => {
      expect(contrast(foreground, background, theme)).toBeGreaterThanOrEqual(minimum);
    },
  );

  it('sequential steps contrast more with the surface as values rise', () => {
    const steps = [1, 2, 3, 4, 5, 6, 7].map((n) =>
      contrast(`color.sequential.${String(n)}`, 'color.surface.base', theme),
    );
    for (const [i, step] of steps.slice(1).entries()) {
      expect(step).toBeGreaterThan(steps[i] ?? Infinity);
    }
  });
});

describe('classification banners', () => {
  it.each(['unclassified', 'cui', 'confidential', 'secret', 'top-secret', 'top-secret-sci'])(
    '%s text meets 4.5:1 on its background',
    (level) => {
      const ratio = contrast(
        `classification.${level}.text`,
        `classification.${level}.background`,
        'dark',
      );
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    },
  );
});
