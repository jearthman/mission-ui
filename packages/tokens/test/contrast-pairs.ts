/**
 * Color pairs that must meet WCAG 2.2 contrast in every theme. Add a pair
 * whenever a new foreground/background combination is introduced.
 *
 * Deliberately excluded:
 * - color.text.disabled: disabled controls are exempt (SC 1.4.3).
 * - color.border.subtle: decorative dividers, never a control's only boundary.
 * - color.sequential.*: checked for ordering instead, in contrast.test.ts.
 */

export const THEMES = ['dark', 'light', 'high-contrast'] as const;
export type Theme = (typeof THEMES)[number];

/** `text`: SC 1.4.3 (1.4.6 in high contrast). `ui`: SC 1.4.11 non-text contrast. */
export const MINIMUM: Record<'text' | 'ui', Record<Theme, number>> = {
  text: { dark: 4.5, light: 4.5, 'high-contrast': 7 },
  ui: { dark: 3, light: 3, 'high-contrast': 4.5 },
};

export interface ContrastPair {
  readonly foreground: string;
  readonly background: string;
  readonly kind: 'text' | 'ui';
  /** Themes the pair applies to; all themes when omitted. */
  readonly themes?: readonly Theme[];
}

const SURFACES = ['sunken', 'base', 'raised', 'overlay'].map((s) => `color.surface.${s}`);
const STATUS = ['critical', 'serious', 'caution', 'normal', 'standby', 'off'];
const ROW_STATES = ['color.interactive.hover', 'color.interactive.selected'];

function cross(
  foregrounds: string[],
  backgrounds: string[],
  kind: ContrastPair['kind'],
  themes?: readonly Theme[],
): ContrastPair[] {
  return foregrounds.flatMap((foreground) =>
    backgrounds.map((background) => ({ foreground, background, kind, ...(themes && { themes }) })),
  );
}

export const PAIRS: readonly ContrastPair[] = [
  // Text
  ...cross(
    ['color.text.primary', 'color.text.secondary', 'color.interactive.text'],
    SURFACES,
    'text',
  ),
  ...cross(['color.text.primary', 'color.interactive.text'], ROW_STATES, 'text'),
  ...cross(['color.text.inverse'], ['color.surface.inverse'], 'text'),
  ...cross(
    ['color.interactive.on-fill'],
    ['color.interactive.fill', 'color.interactive.fill-hover', 'color.interactive.fill-pressed'],
    'text',
  ),
  ...STATUS.flatMap((level) =>
    cross([`color.status.${level}.on`], [`color.status.${level}.fill`], 'text'),
  ),

  // Control boundaries and focus
  ...cross(['color.border.default', 'color.border.strong', 'color.focus.ring'], SURFACES, 'ui'),
  ...cross(['color.focus.ring'], ROW_STATES, 'ui'),
  ...cross(['color.interactive.fill'], ['color.surface.base', 'color.surface.raised'], 'ui'),

  // Status: borders pass everywhere. Fills carry status on their own in the
  // dark and high-contrast themes; on light surfaces the border does (Astro).
  ...STATUS.flatMap((level) => cross([`color.status.${level}.border`], SURFACES.slice(1), 'ui')),
  ...STATUS.flatMap((level) =>
    cross([`color.status.${level}.fill`], SURFACES.slice(1), 'ui', ['dark', 'high-contrast']),
  ),

  // Chart series and map layers are graphical objects.
  ...cross(
    [1, 2, 3, 4, 5, 6].map((n) => `color.categorical.${String(n)}`),
    ['color.surface.base', 'color.surface.raised'],
    'ui',
  ),
];
