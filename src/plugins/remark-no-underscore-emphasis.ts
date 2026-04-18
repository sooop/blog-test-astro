import { visit, SKIP } from 'unist-util-visit';
import type { Root, Text } from 'mdast';
import type { Plugin } from 'unified';
import type { VFile } from 'vfile';

/**
 * Prevents `_word_` and `__word__` from being converted to <em>/<strong>.
 * Only asterisk-based `*word*` and `**word**` are kept.
 *
 * Reads source positions to detect underscore-originated nodes and
 * converts them back to plain text, restoring the original underscores.
 */
const remarkNoUnderscoreEmphasis: Plugin<[], Root> = () => {
  return (tree, file: VFile) => {
    const source = String(file);
    if (!source) return;

    visit(tree, (node: any, index: number | undefined, parent: any) => {
      if (node.type !== 'emphasis' && node.type !== 'strong') return;
      if (!parent || typeof index !== 'number') return;
      if (!node.position?.start?.offset == null) return;

      const offset: number | undefined = node.position?.start?.offset;
      if (offset == null) return;
      const startChar = source[offset];
      if (startChar !== '_') return;

      const marker = node.type === 'strong' ? '__' : '_';
      const inner = extractText(node);
      const textNode: Text = {
        type: 'text',
        value: `${marker}${inner}${marker}`,
      };
      parent.children.splice(index, 1, textNode);
      return [SKIP, index + 1];
    });
  };
};

function extractText(node: any): string {
  if (node.type === 'text' || node.type === 'inlineCode') return node.value ?? '';
  if (node.children) return (node.children as any[]).map(extractText).join('');
  return '';
}

export default remarkNoUnderscoreEmphasis;
