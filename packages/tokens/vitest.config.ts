import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // Builds every output once into a temp directory; tests read the result.
    globalSetup: ['./test/global-setup.ts'],
  },
});
