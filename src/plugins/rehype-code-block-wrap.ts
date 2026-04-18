import { visit } from 'unist-util-visit';
import type { Root, Element } from 'hast';
import type { Plugin } from 'unified';

/**
 * Wraps each Shiki <pre class="astro-code"> in a <figure class="code-block">
 * with a toolbar showing the language label and a copy button.
 *
 * The raw code text is stored in a hidden <textarea> so the copy button
 * can read it without stripping HTML tags.
 */
const rehypeCodeBlockWrap: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, 'element', (node: Element, index, parent: any) => {
      if (node.tagName !== 'pre') return;
      if (!parent || typeof index !== 'number') return;

      const codeEl = node.children.find(
        (c): c is Element => c.type === 'element' && c.tagName === 'code'
      );
      if (!codeEl) return;

      // Extract language from class, e.g. "language-ts" or Shiki's data-language
      const lang: string =
        (node.properties?.['dataLanguage'] as string) ||
        (() => {
          const cls = (codeEl.properties?.className as string[]) || [];
          const langClass = cls.find((c) => c.startsWith('language-'));
          return langClass ? langClass.slice('language-'.length) : '';
        })();

      // Collect plain text content for copy
      const rawCode = extractText(codeEl);

      const toolbar: Element = {
        type: 'element',
        tagName: 'div',
        properties: { className: ['code-block__toolbar'] },
        children: [
          {
            type: 'element',
            tagName: 'span',
            properties: { className: ['code-block__lang'] },
            children: lang ? [{ type: 'text', value: lang }] : [],
          },
          {
            type: 'element',
            tagName: 'button',
            properties: {
              className: ['code-block__copy'],
              type: 'button',
              'aria-label': '코드 복사',
              'data-copy': 'true',
            },
            children: [
              {
                type: 'element',
                tagName: 'svg',
                properties: {
                  xmlns: 'http://www.w3.org/2000/svg',
                  width: '14', height: '14',
                  viewBox: '0 0 24 24',
                  fill: 'none',
                  stroke: 'currentColor',
                  strokeWidth: '2',
                  strokeLinecap: 'round',
                  strokeLinejoin: 'round',
                  className: ['icon-copy'],
                },
                children: [
                  { type: 'element', tagName: 'rect', properties: { width: '14', height: '14', x: '8', y: '8', rx: '2', ry: '2' }, children: [] },
                  { type: 'element', tagName: 'path', properties: { d: 'M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2' }, children: [] },
                ],
              } as Element,
              {
                type: 'element',
                tagName: 'svg',
                properties: {
                  xmlns: 'http://www.w3.org/2000/svg',
                  width: '14', height: '14',
                  viewBox: '0 0 24 24',
                  fill: 'none',
                  stroke: 'currentColor',
                  strokeWidth: '2',
                  strokeLinecap: 'round',
                  strokeLinejoin: 'round',
                  className: ['icon-check'],
                  style: 'display:none',
                },
                children: [
                  { type: 'element', tagName: 'path', properties: { d: 'M20 6 9 17l-5-5' }, children: [] },
                ],
              } as Element,
            ],
          },
        ],
      };

      // Hidden textarea carrying the raw text for clipboard
      const rawStore: Element = {
        type: 'element',
        tagName: 'textarea',
        properties: {
          className: ['code-block__raw'],
          readOnly: true,
          'aria-hidden': 'true',
          tabIndex: -1,
        },
        children: [{ type: 'text', value: rawCode }],
      };

      const figure: Element = {
        type: 'element',
        tagName: 'figure',
        properties: {
          className: ['code-block'],
          ...(lang ? { 'data-language': lang } : {}),
        },
        children: [toolbar, node, rawStore],
      };

      parent.children.splice(index, 1, figure);
    });
  };
};

function extractText(node: any): string {
  if (node.type === 'text') return node.value;
  if (node.children) return (node.children as any[]).map(extractText).join('');
  return '';
}

export default rehypeCodeBlockWrap;
