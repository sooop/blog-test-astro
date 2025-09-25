import { visit } from 'unist-util-visit';

export function katexDisplayFix() {
  return (tree) => {
    visit(tree, 'element', (node, index, parent) => {
      // KaTeX span 태그 찾기
      if (node.tagName === 'span' &&
          node.properties &&
          node.properties.className &&
          node.properties.className.includes('katex')) {

        // 부모가 p 태그이고, p 태그 안에 텍스트가 거의 없는 경우 (블록 수식)
        if (parent &&
            parent.tagName === 'p' &&
            parent.children.length === 1) {

          // katex-display 클래스 추가
          node.properties.className = node.properties.className.concat(['katex-display']);
        }
      }
    });
  };
}