import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { renderCss } from './formats/css.ts';
import { renderJson } from './formats/json.ts';
import { renderTailwindTheme } from './formats/tailwind.ts';
import { renderTypeScript } from './formats/typescript.ts';
import { resolveModel, type TokenModel } from './model.ts';

export interface BuildResult {
  readonly model: TokenModel;
  readonly files: Readonly<
    Record<'tokens.css' | 'theme.css' | 'tokens.ts' | 'tokens.json', string>
  >;
}

/**
 * Resolve every token set with Style Dictionary and write the four outputs.
 * Style Dictionary 5.5 has no DTCG Resolver support, so each mode is its own
 * pass and this module assembles them (ADR-0003).
 */
export async function buildTokens({ outDir }: { outDir: string }): Promise<BuildResult> {
  const model = await resolveModel();
  const files = {
    'tokens.css': renderCss(model),
    'theme.css': renderTailwindTheme(model),
    'tokens.ts': renderTypeScript(model),
    'tokens.json': renderJson(model),
  };
  await mkdir(outDir, { recursive: true });
  await Promise.all(
    Object.entries(files).map(([name, contents]) => writeFile(join(outDir, name), contents)),
  );
  return { model, files };
}
