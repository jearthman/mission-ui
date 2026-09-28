import type { TransformedToken } from 'style-dictionary/types';
import {
  baseFiles,
  MODE_KIND_NAMES,
  MODE_KINDS,
  modeFile,
  modesOf,
  type ModeKindName,
} from './config.ts';
import { pathOf, runPass, tierOfToken, valueOf, type Pass } from './passes.ts';

export interface ModeKindModel {
  /** Paths of emitted tokens whose value changes between this kind's modes. */
  readonly paths: readonly string[];
  /** One pass per mode, default mode first. The default mode is the base pass. */
  readonly passes: ReadonlyMap<string, Pass>;
}

/** Everything the output formats need, resolved once. */
export interface TokenModel {
  /** Default pass: dark theme, comfortable density, standard motion. */
  readonly base: Pass;
  /** Every token in every tier, in source order. */
  readonly all: readonly TransformedToken[];
  /** System and component tokens: the only ones emitted to CSS and TypeScript. */
  readonly emitted: readonly TransformedToken[];
  readonly kinds: Readonly<Record<ModeKindName, ModeKindModel>>;
}

export async function resolveModel(): Promise<TokenModel> {
  const files = baseFiles();
  const base = await runPass({ source: files });
  const all = base.dictionary.allTokens;
  const emitted = all.filter((token) => tierOfToken(token) !== 'reference');

  const kinds = {} as Record<ModeKindName, ModeKindModel>;
  for (const kind of MODE_KIND_NAMES) {
    const passes = new Map<string, Pass>([[MODE_KINDS[kind].defaultMode, base]]);
    for (const mode of modesOf(kind).slice(1)) {
      passes.set(mode, await runPass({ include: files, source: [modeFile(kind, mode)] }));
    }
    const paths = emitted
      .filter((token) =>
        [...passes.values()].some(
          (pass) => valueOf(tokenIn(pass, pathOf(token))) !== valueOf(token),
        ),
      )
      .map(pathOf);
    kinds[kind] = { paths, passes };
  }

  // A token that changes with two kinds (say theme and density) cannot be
  // expressed as independent blocks in tokens.css.
  for (const [i, a] of MODE_KIND_NAMES.entries()) {
    for (const b of MODE_KIND_NAMES.slice(i + 1)) {
      const shared = kinds[a].paths.filter((path) => kinds[b].paths.includes(path));
      if (shared.length > 0) {
        throw new Error(`Tokens change with both ${a} and ${b}: ${shared.join(', ')}`);
      }
    }
  }

  return { base, all, emitted, kinds };
}

/** Value of each of a kind's changing tokens in one mode. */
export function modeValues(model: TokenModel, kind: ModeKindName, mode: string) {
  const { paths, passes } = model.kinds[kind];
  const pass = passes.get(mode);
  if (!pass) throw new Error(`Unknown ${kind} mode "${mode}"`);
  return paths.map((path) => tokenIn(pass, path));
}

function tokenIn(pass: Pass, path: string): TransformedToken {
  const token = pass.byPath.get(path);
  if (!token) throw new Error(`${path} is missing from a mode pass`);
  return token;
}
