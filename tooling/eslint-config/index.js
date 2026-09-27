// @ts-check
import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Shared ESLint flat config for Mission UI workspaces.
 *
 * TypeScript sources get the strict type-aware rule set. JavaScript files
 * (mostly tool config) get the same rules without type information.
 *
 * Later steps add jsx-a11y (Step 4) and the token-tier rule (Step 4) here so
 * every package picks them up at once.
 *
 * @param {{ tsconfigRootDir: string }} options Pass `import.meta.dirname`.
 */
export function createConfig({ tsconfigRootDir }) {
  return defineConfig(
    globalIgnores(['dist/', 'coverage/', 'storybook-static/']),
    js.configs.recommended,
    tseslint.configs.strictTypeChecked,
    tseslint.configs.stylisticTypeChecked,
    {
      languageOptions: {
        parserOptions: {
          projectService: true,
          tsconfigRootDir,
        },
      },
      linterOptions: {
        reportUnusedDisableDirectives: 'error',
      },
      rules: {
        '@typescript-eslint/consistent-type-imports': 'error',
        '@typescript-eslint/consistent-type-exports': 'error',
      },
    },
    {
      files: ['**/*.{js,mjs,cjs}'],
      extends: [tseslint.configs.disableTypeChecked],
      languageOptions: {
        globals: globals.node,
      },
    },
  );
}
