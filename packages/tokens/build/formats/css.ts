import type { Dictionary, TransformedToken } from 'style-dictionary/types';
import {
  createPropertyFormatter,
  outputReferencesFilter,
  outputReferencesTransformed,
} from 'style-dictionary/utils';
import { MODE_KIND_NAMES, MODE_KINDS, modesOf } from '../config.ts';
import { modeValues, type TokenModel } from '../model.ts';
import { generatedHeader } from './header.ts';

/**
 * One rule block, in source order. References to tokens in the same block
 * stay as var(), so a nested mode attribute re-resolves the whole chain;
 * references to anything else, including the reference tier, are written as
 * resolved values. Descriptions are written once, in the :root block.
 */
function block(
  selectors: string[],
  tokens: readonly TransformedToken[],
  dictionary: Dictionary,
  { comments }: { comments: boolean },
): string {
  if (tokens.length === 0) return '';
  const format = createPropertyFormatter({
    format: 'css',
    dictionary: { ...dictionary, allTokens: [...tokens] },
    outputReferences: (token, options) =>
      outputReferencesFilter(token, options) && outputReferencesTransformed(token, options),
    usesDtcg: true,
    formatting: {
      indentation: '  '.repeat(selectors.length),
      commentStyle: comments ? 'long' : 'none',
    },
  });
  const body = tokens.map(format).join('\n');
  return selectors.reduceRight(
    (content, selector, depth) =>
      `${'  '.repeat(depth)}${selector} {\n${content}\n${'  '.repeat(depth)}}`,
    body,
  );
}

export function renderCss(model: TokenModel): string {
  const blocks = [block([':root'], model.emitted, model.base.dictionary, { comments: true })];
  for (const kind of MODE_KIND_NAMES) {
    const { selector, emitDefaultBlock } = MODE_KINDS[kind];
    for (const [index, mode] of modesOf(kind).entries()) {
      if (index === 0 && !emitDefaultBlock) continue;
      const pass = model.kinds[kind].passes.get(mode);
      if (!pass) throw new Error(`No pass for ${kind} mode ${mode}`);
      blocks.push(
        block(selector(mode), modeValues(model, kind, mode), pass.dictionary, { comments: false }),
      );
    }
  }
  return `${generatedHeader('/*', ' */')}\n${blocks.filter(Boolean).join('\n\n')}\n`;
}
