import { visit } from 'unist-util-visit';

export function katexDisplayFix() {
  return (tree) => {
    visit(tree, 'element', (node, index, parent) => {
      // KaTeX span 태그 찾기
      if (node.tagName === 'span' &&
          node.properties &&
          node.properties.className &&
          node.properties.className.includes('katex')) {

        // 부모가 p 태그이고, p 태그 안에 katex만 있는 경우 (블록 수식)
        if (parent &&
            parent.tagName === 'p' &&
            parent.children.length === 1) {

          // katex-display 클래스 추가
          node.properties.className = node.properties.className.concat(['katex-display']);
        }
      }

      // math 태그와 annotation 태그 제거 (이중 렌더링 방지)
      if (node.tagName === 'math' ||
          node.tagName === 'annotation' ||
          (node.tagName === 'semantics' && parent && parent.tagName === 'math')) {
        // math 요소는 유지하되, annotation은 제거
        if (node.tagName === 'annotation') {
          return index;
        }
      }
    });
  };
}