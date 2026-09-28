import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { buildTokens } from './build.ts';
import { PACKAGE_DIR } from './config.ts';

const outDir = join(PACKAGE_DIR, 'dist');
await rm(outDir, { recursive: true, force: true });
const { files } = await buildTokens({ outDir });
console.log(`Wrote ${Object.keys(files).join(', ')} to dist/`);
