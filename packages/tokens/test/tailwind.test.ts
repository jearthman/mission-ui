import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { compile } from 'tailwindcss';
import { describe, expect, it } from 'vitest';
import { output } from './support.ts';

const tailwindDir = dirname(createRequire(import.meta.url).resolve('tailwindcss/package.json'));

/** Compile `@import "tailwindcss"` plus our theme, the way an app will. */
async function build(candidates: string[]): Promise<string> {
  const compiler = await compile(`@import "tailwindcss";\n${output('theme.css')}`, {
    base: tailwindDir,
    loadStylesheet: async (id, base) => {
      const path = id === 'tailwindcss' ? join(tailwindDir, 'index.css') : join(base, id);
      return { path, base: dirname(path), content: await readFile(path, 'utf8') };
    },
  });
  return compiler.build(candidates);
}

/** The declarations Tailwind generated for one utility class, or undefined. */
function rule(css: string, utility: string): string | undefined {
  const selector = `.${utility.replace(/[.:/]/g, (c) => `\\${c}`)} {`;
  const start = css.indexOf(selector);
  return start === -1 ? undefined : css.slice(start, css.indexOf('}', start));
}

describe('Tailwind theme', () => {
  it.each([
    ['bg-surface-base', 'var(--mission-color-surface-base)'],
    ['text-text-primary', 'var(--mission-color-text-primary)'],
    ['border-border-default', 'var(--mission-color-border-default)'],
    ['bg-status-critical-fill', 'var(--mission-color-status-critical-fill)'],
    ['p-4', 'var(--mission-space-4)'],
    ['inset-0', 'var(--mission-space-0)'],
    ['h-control-height', 'var(--mission-size-control-height)'],
    ['px-cell-inline', 'var(--mission-space-cell-inline)'],
    ['text-body', 'var(--mission-type-body-line-height)'],
    ['font-sans', 'var(--mission-font-family-sans)'],
    ['font-semibold', 'var(--mission-font-weight-semibold)'],
    ['rounded-control', 'var(--mission-radius-control)'],
    ['shadow-overlay', 'var(--mission-elevation-overlay)'],
    ['ease-standard', 'var(--mission-motion-easing-standard)'],
  ])('generates %s from a token', async (utility, expected) => {
    expect(rule(await build([utility]), utility)).toContain(expected);
  });

  it.each([
    'bg-blue-500',
    'text-white',
    'p-7',
    'p-0.5',
    'text-sm',
    'font-thin',
    'rounded-lg',
    'shadow-lg',
    'leading-tight',
    'tracking-wide',
    'ease-in-out',
  ])('does not generate the default utility %s', async (utility) => {
    expect(rule(await build([utility]), utility)).toBeUndefined();
  });

  it('keeps container sizes, so max-w-md is not a spacing step', async () => {
    expect(rule(await build(['max-w-md']), 'max-w-md')).toContain('var(--container-md)');
  });

  it('routes default transitions through the motion tokens', async () => {
    const css = rule(await build(['transition-colors']), 'transition-colors');
    expect(css).toContain('var(--mission-motion-duration-short)');
    expect(css).toContain('var(--mission-motion-easing-standard)');
  });
});
