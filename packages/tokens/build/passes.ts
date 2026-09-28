import StyleDictionary from 'style-dictionary';
import type { Dictionary, TransformedToken } from 'style-dictionary/types';
import { PREFIX, tierOf, type Tier } from './config.ts';
import { TRANSFORMS } from './transforms.ts';

/** One Style Dictionary run: the base files, optionally overridden by one mode file. */
export interface Pass {
  readonly dictionary: Dictionary;
  /** Tokens by dotted path, such as `color.surface.base`. */
  readonly byPath: ReadonlyMap<string, TransformedToken>;
}

export type TokenValue = string | number;

export const pathOf = (token: TransformedToken): string => token.path.join('.');

export const tierOfToken = (token: TransformedToken): Tier => tierOf(token.filePath);

export function valueOf(token: TransformedToken): TokenValue {
  const value: unknown = token.$value;
  if (typeof value === 'string' || typeof value === 'number') return value;
  throw new Error(
    `${pathOf(token)} did not transform to a string or number: ${JSON.stringify(value)}`,
  );
}

/**
 * Resolve and transform one set of token files. `include` files may be
 * overridden by `source` files without collision warnings, which is how a
 * mode file replaces default values.
 */
export async function runPass(files: { include?: string[]; source: string[] }): Promise<Pass> {
  const sd = new StyleDictionary({
    include: files.include ?? [],
    source: files.source,
    usesDtcg: true,
    // Split typography into sub-tokens: Tailwind needs size, line height, and
    // weight as separate variables, and Style Dictionary's typography
    // shorthand does not handle fontFamily arrays.
    expand: { include: ['typography'] },
    log: { warnings: 'error', verbosity: 'verbose', errors: { brokenReferences: 'throw' } },
    platforms: { css: { prefix: PREFIX, transforms: TRANSFORMS } },
  });
  const dictionary = await sd.getPlatformTokens('css');
  const byPath = new Map(dictionary.allTokens.map((token) => [pathOf(token), token]));
  return { dictionary, byPath };
}
