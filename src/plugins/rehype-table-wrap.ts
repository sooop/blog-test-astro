import { visit } from 'unist-util-visit';
import type { Root, Element } from 'hast';
import type { Plugin } from 'unified';

const rehypeTableWrap: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, 'element', (node: Element, index, parent: any) => {
      if (node.tagName !== 'table') return;
      if (!parent || typeof index !== 'number') return;

      const wrapper: Element = {
        type: 'element',
        tagName: 'figure',
        properties: { className: ['table-wrapper'] },
        children: [node],
      };

      parent.children.splice(index, 1, wrapper);
    });
  };
};

export default rehypeTableWrap;
