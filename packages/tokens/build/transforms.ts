import Color from 'colorjs.io';
import StyleDictionary from 'style-dictionary';
import type { TransformedToken } from 'style-dictionary/types';

/**
 * Value transforms for the one platform every output is built from. Built-in
 * transforms cover colors, dimensions, cubic Béziers, and font families; the
 * custom ones fill Style Dictionary 5.5 gaps for DTCG 2025.10 (see ADR-0003).
 */
export const TRANSFORMS = [
  'name/kebab',
  'color/css',
  'size/rem',
  'cubicBezier/css',
  'fontFamily/css',
  'mission/duration/css',
  'mission/shadow/css',
];

interface DimensionValue {
  value: number;
  unit: string;
}

interface ColorValue {
  colorSpace: string;
  components: (number | 'none')[];
  alpha?: number;
  hex?: string;
}

interface ShadowValue {
  color: ColorValue | string;
  offsetX: DimensionValue | string;
  offsetY: DimensionValue | string;
  blur: DimensionValue | string;
  spread: DimensionValue | string;
  inset?: boolean;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function dimension(value: DimensionValue | string): string {
  return typeof value === 'string' ? value : `${String(value.value)}${value.unit}`;
}

/** sRGB hex, or rgba() when the color is translucent. */
export function cssColor(value: ColorValue | string): string {
  if (typeof value === 'string') return value;
  const coords = value.components.map((c) => (c === 'none' ? 0 : c)) as [number, number, number];
  const srgb = new Color(value.colorSpace, coords, value.alpha ?? 1).to('srgb');
  const alpha = srgb.alpha;
  if (alpha >= 1) return srgb.toString({ format: 'hex', collapse: false });
  const [r, g, b] = srgb.coords.map((c) => Math.round(Math.min(1, Math.max(0, c ?? 0)) * 255));
  return `rgba(${String(r)}, ${String(g)}, ${String(b)}, ${String(alpha)})`;
}

function shadow(value: ShadowValue): string {
  const parts = [
    value.inset === true ? 'inset' : '',
    dimension(value.offsetX),
    dimension(value.offsetY),
    dimension(value.blur),
    dimension(value.spread),
    cssColor(value.color),
  ];
  return parts.filter(Boolean).join(' ');
}

StyleDictionary.registerTransform({
  name: 'mission/duration/css',
  type: 'value',
  filter: (token: TransformedToken) => token.$type === 'duration',
  transform: (token: TransformedToken) => {
    const value: unknown = token.$value;
    return isObject(value) ? dimension(value as unknown as DimensionValue) : value;
  },
});

StyleDictionary.registerTransform({
  name: 'mission/shadow/css',
  type: 'value',
  transitive: true,
  filter: (token: TransformedToken) => token.$type === 'shadow',
  transform: (token: TransformedToken) => {
    const value: unknown = token.$value;
    if (Array.isArray(value)) return (value as ShadowValue[]).map(shadow).join(', ');
    return isObject(value) ? shadow(value as unknown as ShadowValue) : value;
  },
});
