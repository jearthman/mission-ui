import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { TestProject } from 'vitest/node';
import { buildTokens } from '../build/build.ts';

declare module 'vitest' {
  export interface ProvidedContext {
    outDir: string;
    /** Set when the build failed, so source-level tests still run and report. */
    buildError: string;
  }
}

/** Build every output once into a temp directory that the tests read. */
export default async function setup(project: TestProject) {
  const outDir = await mkdtemp(join(tmpdir(), 'mission-tokens-'));
  let buildError = '';
  try {
    await buildTokens({ outDir });
  } catch (error) {
    buildError = error instanceof Error ? error.message : String(error);
  }
  project.provide('outDir', outDir);
  project.provide('buildError', buildError);
  return async () => {
    await rm(outDir, { recursive: true, force: true });
  };
}
