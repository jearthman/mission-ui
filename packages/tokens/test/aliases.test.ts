import { describe, expect, it } from 'vitest';
import { baseTokens, referencesIn, sourceTokens, type SourceToken } from './support.ts';

/** The token set with one mode file applied over the base files. */
function withMode(file: string | undefined): Map<string, SourceToken> {
  const set = new Map(baseTokens().map((t) => [t.path, t]));
  if (file) for (const t of sourceTokens().filter((s) => s.file === file)) set.set(t.path, t);
  return set;
}

const modeFiles = [
  ...new Set(
    sourceTokens()
      .filter((t) => t.isMode)
      .map((t) => t.file),
  ),
];
const sets: [string, string | undefined][] = [
  ['the base set', undefined],
  ...modeFiles.map((file): [string, string] => [file, file]),
];

describe.each(sets)('aliases in %s', (_, file) => {
  const tokens = withMode(file);

  it('all resolve to a token', () => {
    const broken = [...tokens.values()].flatMap((t) =>
      referencesIn(t.value)
        .filter((ref) => !tokens.has(ref))
        .map((ref) => `${t.path} -> {${ref}}`),
    );
    expect(broken).toEqual([]);
  });

  it('contain no cycles', () => {
    const cycles: string[] = [];
    const visit = (path: string, trail: string[]) => {
      if (trail.includes(path)) {
        cycles.push([...trail, path].join(' -> '));
        return;
      }
      for (const ref of referencesIn(tokens.get(path)?.value)) visit(ref, [...trail, path]);
    };
    for (const path of tokens.keys()) visit(path, []);
    expect(cycles).toEqual([]);
  });
});
