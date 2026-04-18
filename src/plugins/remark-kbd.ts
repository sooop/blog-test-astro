import { visit, SKIP } from 'unist-util-visit';
import type { Root, Text, PhrasingContent } from 'mdast';
import type { Plugin } from 'unified';

/**
 * Converts `++Key+Key++` syntax into a sequence of <kbd> elements
 * with `+` separators rendered as styled spans.
 *
 *   ++Ctrl+Shift+P++
 *     →  <kbd>Ctrl</kbd><span class="kbd-sep">+</span><kbd>Shift</kbd>...
 *
 * The outer `++ ... ++` delimits a single key combination; inner `+`
 * splits the individual keys.
 */
const KBD_PATTERN = /\+\+([^\s][^+]*(?:\+[^+\s][^+]*)*)\+\+/g;

function buildKbdHtml(combo: string): string {
  const keys = combo.split('+').map((k) => k.trim()).filter(Boolean);
  if (keys.length === 0) return '';
  return keys
    .map((k, i) => {
      const kbd = `<kbd class="kbd">${escapeHtml(k)}</kbd>`;
      const sep = i < keys.length - 1 ? '<span class="kbd-sep" aria-hidden="true">+</span>' : '';
      return kbd + sep;
    })
    .join('');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const remarkKbd: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, 'text', (node: Text, index, parent: any) => {
      if (!parent || typeof index !== 'number') return;
      if (!node.value.includes('++')) return;

      const value = node.value;
      KBD_PATTERN.lastIndex = 0;
      let match: RegExpExecArray | null;
      const parts: PhrasingContent[] = [];
      let cursor = 0;

      while ((match = KBD_PATTERN.exec(value)) !== null) {
        const [full, combo] = match;
        const start = match.index;
        if (start > cursor) {
          parts.push({ type: 'text', value: value.slice(cursor, start) });
        }
        const html = buildKbdHtml(combo);
        if (html) {
          parts.push({ type: 'html', value: html } as any);
        }
        cursor = start + full.length;
      }

      if (parts.length === 0) return;

      if (cursor < value.length) {
        parts.push({ type: 'text', value: value.slice(cursor) });
      }

      parent.children.splice(index, 1, ...parts);
      return [SKIP, index + parts.length];
    });
  };
};

export default remarkKbd;
