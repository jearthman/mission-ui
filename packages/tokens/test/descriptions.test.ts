import { describe, expect, it } from 'vitest';
import { baseTokens } from './support.ts';

// Claude Code and people choose tokens by reading these, so they are required.
describe('descriptions', () => {
  it.each(['system', 'component'] as const)('every %s token has a $description', (tier) => {
    const missing = baseTokens().filter(
      (t) => t.tier === tier && (typeof t.description !== 'string' || t.description.trim() === ''),
    );
    expect(missing.map((t) => `${t.path} (${t.file})`)).toEqual([]);
  });
});
