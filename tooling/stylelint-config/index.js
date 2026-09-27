// @ts-check

/**
 * Shared Stylelint config for Mission UI.
 *
 * Colors reach stylesheets only through token custom properties, so raw color
 * literals and color functions are banned. packages/tokens is the one place
 * allowed to emit them, and it is generated rather than linted.
 *
 * Step 2 adds the unlayered-rule check and tunes rules for Tailwind v4.
 *
 * @type {import('stylelint').Config}
 */
export default {
  extends: ['stylelint-config-standard'],
  rules: {
    'color-no-hex': true,
    'color-named': 'never',
    'function-disallowed-list': [
      'rgb',
      'rgba',
      'hsl',
      'hsla',
      'hwb',
      'lab',
      'lch',
      'oklab',
      'oklch',
      'color',
    ],
    'declaration-no-important': true,
    // Tailwind v4 is imported as `@import "tailwindcss";`.
    'import-notation': 'string',
    'at-rule-no-unknown': [
      true,
      {
        ignoreAtRules: [
          'theme',
          'utility',
          'variant',
          'custom-variant',
          'apply',
          'reference',
          'source',
        ],
      },
    ],
  },
};
