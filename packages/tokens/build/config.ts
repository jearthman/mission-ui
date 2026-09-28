import { readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Prefix for every CSS custom property: `--mission-color-surface-base`. */
export const PREFIX = 'mission';

export const PACKAGE_DIR = fileURLToPath(new URL('..', import.meta.url));
export const TOKENS_DIR = join(PACKAGE_DIR, 'tokens');

export type Tier = 'reference' | 'system' | 'component';

/**
 * A kind of mode: themes, densities, or motion. The default mode's values live
 * in tokens/system/; each other mode is one override file in tokens/modes/.
 */
export interface ModeKind {
  readonly defaultMode: string;
  /** Mode name to override file, relative to tokens/modes/. */
  readonly overrides: Readonly<Record<string, string>>;
  /** Selector chain for a mode's block in tokens.css. */
  readonly selector: (mode: string) => string[];
  /**
   * Whether to also emit a block for the default mode, so an attribute set on
   * a nested element can switch back to it.
   */
  readonly emitDefaultBlock: boolean;
}

export const MODE_KINDS = {
  theme: {
    defaultMode: 'dark',
    overrides: { light: 'light.tokens.json', 'high-contrast': 'high-contrast.tokens.json' },
    selector: (mode) => [`[data-theme="${mode}"]`],
    emitDefaultBlock: true,
  },
  density: {
    defaultMode: 'comfortable',
    overrides: { compact: 'compact.tokens.json' },
    selector: (mode) => [`[data-density="${mode}"]`],
    emitDefaultBlock: true,
  },
  motion: {
    defaultMode: 'standard',
    overrides: { reduced: 'reduced-motion.tokens.json' },
    selector: () => ['@media (prefers-reduced-motion: reduce)', ':root'],
    emitDefaultBlock: false,
  },
} as const satisfies Record<string, ModeKind>;

export type ModeKindName = keyof typeof MODE_KINDS;
export const MODE_KIND_NAMES = Object.keys(MODE_KINDS) as ModeKindName[];

/** Every mode name of a kind, default first. */
export function modesOf(kind: ModeKindName): string[] {
  const { defaultMode, overrides } = MODE_KINDS[kind];
  return [defaultMode, ...Object.keys(overrides)];
}

function listTokenFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((file) => file.endsWith('.tokens.json'))
    .map((file) => join(dir, file))
    .sort();
}

/** Reference, system, and component files: the default set every pass starts from. */
export function baseFiles(): string[] {
  return (['reference', 'system', 'component'] as const).flatMap((dir) =>
    listTokenFiles(join(TOKENS_DIR, dir)),
  );
}

export function modeFile(kind: ModeKindName, mode: string): string {
  const overrides: Readonly<Record<string, string>> = MODE_KINDS[kind].overrides;
  const file = overrides[mode];
  if (file === undefined) throw new Error(`Unknown ${kind} mode "${mode}"`);
  return join(TOKENS_DIR, 'modes', file);
}

/** Tier of a token file. Mode overrides are system tokens. */
export function tierOf(filePath: string): Tier {
  const dir = relative(TOKENS_DIR, filePath).split(sep)[0];
  switch (dir) {
    case 'reference':
      return 'reference';
    case 'system':
    case 'modes':
      return 'system';
    case 'component':
      return 'component';
    default:
      throw new Error(`${filePath} is not inside a tier directory of ${TOKENS_DIR}`);
  }
}
