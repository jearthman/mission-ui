/**
 * Conventional Commits 1.0. Changesets and the changelog read these, and dated,
 * scoped commits are part of the funding-source record (docs/ip/funding-record.md).
 *
 * @type {import('@commitlint/types').UserConfig}
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Scope is optional. When present, it names the package or area touched.
    'scope-enum': [
      2,
      'always',
      [
        'tokens',
        'ui',
        'mission',
        'map',
        'docs',
        'reference',
        'tooling',
        'adr',
        'deps',
        'release',
        'repo',
      ],
    ],
  },
};
