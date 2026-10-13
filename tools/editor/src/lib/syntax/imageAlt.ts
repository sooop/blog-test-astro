// Crepe 이미지 블록의 마크다운 직렬화 교정.
// 기본 구현은 단독 이미지를 `![1.00](src "캡션")` 으로 저장한다 — alt 자리에 가로세로 비율을, title 자리에 캡션을 쓴다.
// 그대로 쓰면 이미지가 있는 모든 글의 alt 텍스트가 `1.00` 으로 바뀌고 title 은 캡션으로 둔갑한다.
// 여기서는 alt ↔ 캡션 입력칸, title ↔ 숨은 속성으로 매핑해 `![alt](src "title")` 을 그대로 보존한다(비율은 저장하지 않는다).
import { imageBlockSchema } from '@milkdown/kit/component/image-block';

interface MdImage { type: string; url?: string; alt?: string | null; title?: string | null }

// extendSchema 는 기존 플러그인을 고치지 않고 새 플러그인을 돌려준다 → 이미지 블록 기능을 등록한 뒤에 .use() 해야 덮어쓴다
export const imageAltSchema = imageBlockSchema.extendSchema((prev) => (ctx) => {
  const base = prev(ctx);
  return {
    ...base,
    attrs: {
      ...base.attrs,
      title: { default: '', validate: 'string' },
    },
    parseMarkdown: {
      match: ({ type }: MdImage) => type === 'image-block',
      runner: (state, node, type) => {
        const n = node as unknown as MdImage;
        state.addNode(type, { src: n.url ?? '', caption: n.alt ?? '', title: n.title ?? '', ratio: 1 });
      },
    },
    toMarkdown: {
      match: (node) => node.type.name === 'image-block',
      runner: (state, node) => {
        state.openNode('paragraph');
        state.addNode('image', undefined, undefined, {
          url: node.attrs.src,
          alt: node.attrs.caption || null,
          title: node.attrs.title || null,
        });
        state.closeNode();
      },
    },
  };
});
