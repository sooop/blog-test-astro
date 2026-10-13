// remark-directive 의 컨테이너 디렉티브(:::name[label]{attrs} … :::) 노드.
// 사이트(src/plugins/remark-callout-directive.ts)는 name 을 콜아웃 종류로 해석하고(모르는 name 은 note), {open}/{closed} 로 접기를 정한다.
// - name·label·attributes 는 원문 그대로 보존한다(label 은 원문 마크다운 조각).
// - textDirective(:name) / leafDirective(::name) 는 사이트가 처리하지 않으므로 원문 텍스트로 되돌린다.
import remarkDirective from 'remark-directive';
import type { MilkdownPlugin } from '@milkdown/kit/ctx';
import type { Node as PMNode } from '@milkdown/kit/prose/model';
import type { EditorView, NodeView } from '@milkdown/kit/prose/view';
import { $nodeSchema, $remark, $view } from '@milkdown/kit/utils';
import { normalizeCalloutType } from './callout';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MdNode = any;
interface ToMarkdownExt { unsafe?: unknown[]; handlers?: Record<string, unknown>; extensions?: ToMarkdownExt[] }

// 1) remark-directive 등록. to-markdown 확장의 `:` 이스케이프 규칙은 뺀다
//    (글자 그대로의 `a:b`, `::x` 를 `a\:b` 로 바꾸면 원문과 다른 구조가 되기 때문. 이스케이프 없이도 원문이 그대로 나온다).
const directiveRemark = $remark('directiveRemark', () => function (this: { data(): object }) {
  (remarkDirective as unknown as (this: unknown) => void).call(this);
  const data = this.data() as Record<string, unknown>;
  const exts = (data.toMarkdownExtensions ??= []) as ToMarkdownExt[];
  const strip = (e: ToMarkdownExt) => {
    if (e.handlers && 'containerDirective' in e.handlers) e.unsafe = [];
    e.extensions?.forEach(strip);
  };
  exts.forEach(strip);
});

// 2) text/leaf directive → 원문, container 의 label → 원문 조각
const directiveCleanup = $remark('directiveCleanup', () => () => (tree: MdNode, file: { value?: unknown }) => {
  const src = typeof file?.value === 'string' ? file.value : '';
  const raw = (n: MdNode): string | null => {
    const s = n.position?.start?.offset, e = n.position?.end?.offset;
    return typeof s === 'number' && typeof e === 'number' && src ? src.slice(s, e) : null;
  };
  const plainText = (n: MdNode): string => (typeof n.value === 'string' ? n.value : (n.children ?? []).map(plainText).join(''));
  // 맨 이름뿐인 `:name` 은 text, 라벨·속성이 붙으면(`:a[b]`) 이스케이프되지 않게 raw html 로 둔다
  const inline = (text: string): MdNode => (/^:+[A-Za-z][\w-]*$/.test(text) ? { type: 'text', value: text } : { type: 'html', value: text });

  const visit = (parent: MdNode) => {
    const kids: MdNode[] | undefined = parent.children;
    if (!kids) return;
    for (let i = 0; i < kids.length; i++) {
      const n = kids[i];
      if (n.type === 'containerDirective') {
        const first = n.children?.[0];
        if (first?.type === 'paragraph' && first.data?.directiveLabel) {
          const kidsRaw = first.children ?? [];
          const s = kidsRaw[0]?.position?.start?.offset, e = kidsRaw[kidsRaw.length - 1]?.position?.end?.offset;
          n.rawLabel = typeof s === 'number' && typeof e === 'number' && src ? src.slice(s, e) : plainText(first);
          n.children = n.children.slice(1);
        }
      } else if (n.type === 'textDirective' || n.type === 'leafDirective') {
        const text = raw(n) ?? `${n.type === 'leafDirective' ? '::' : ':'}${n.name}`;
        kids[i] = n.type === 'leafDirective' ? { type: 'paragraph', children: [inline(text)] } : inline(text);
        continue;
      }
      visit(n);
    }
  };
  visit(tree);
});

// ---- 노드 스키마 ----
export const directiveSchema = $nodeSchema('directive', () => ({
  group: 'block',
  content: 'block+',
  defining: true,
  attrs: {
    name: { default: 'note' },
    label: { default: '' },
    attributes: { default: {} as Record<string, string | null | undefined> },
  },
  parseDOM: [
    {
      tag: 'div[data-directive]',
      getAttrs: (dom: HTMLElement | string) => {
        const d = dom as HTMLElement;
        let attributes = {};
        try { attributes = JSON.parse(d.dataset.attributes ?? '{}'); } catch { /* 무시 */ }
        return { name: d.dataset.name ?? 'note', label: d.dataset.label ?? '', attributes };
      },
    },
  ],
  toDOM: (node: PMNode) => [
    'div',
    {
      'data-directive': normalizeCalloutType(node.attrs.name),
      'data-name': node.attrs.name,
      'data-label': node.attrs.label,
      'data-attributes': JSON.stringify(node.attrs.attributes ?? {}),
      class: 'directive-node',
    },
    0,
  ],
  parseMarkdown: {
    match: (n: MdNode) => n.type === 'containerDirective',
    runner: (state, n: MdNode, type) => {
      state
        .openNode(type, { name: n.name ?? '', label: n.rawLabel ?? '', attributes: { ...(n.attributes ?? {}) } as Record<string, string> })
        .next(n.children ?? [])
        .closeNode();
    },
  },
  toMarkdown: {
    match: (n: PMNode) => n.type.name === 'directive',
    runner: (state, n: PMNode) => {
      const { name, label, attributes } = n.attrs as { name: string; label: string; attributes: Record<string, string | null | undefined> };
      state.openNode('containerDirective', undefined, { name, attributes: { ...(attributes ?? {}) } as Record<string, string> });
      if (label) {
        state.openNode('paragraph', undefined, { data: { directiveLabel: true } });
        state.addNode('html', undefined, label);
        state.closeNode();
      }
      const first = n.firstChild;
      const skipEmpty = n.childCount === 1 && first?.type.name === 'paragraph' && first.content.size === 0;
      if (!skipEmpty) state.next(n.content);
      state.closeNode();
    },
  },
}));

// ---- NodeView ----
const FOLD_LABEL: Record<string, string> = { '': '접기 없음', open: '{open} 펼침', closed: '{closed} 접힘' };
const foldOf = (a: Record<string, unknown> | null | undefined) => (a && 'closed' in a ? 'closed' : a && 'open' in a ? 'open' : '');

const directiveView = $view(directiveSchema.node, () => (initial: PMNode, view: EditorView, getPos: () => number | undefined): NodeView => {
  let node = initial;

  const dom = document.createElement('div');
  dom.className = 'directive-node';
  const header = document.createElement('div');
  header.className = 'directive-node-header';
  header.contentEditable = 'false';

  const mark = document.createElement('span');
  mark.className = 'directive-node-mark';
  mark.textContent = ':::';
  const nameIn = document.createElement('input');
  nameIn.className = 'directive-node-name';
  nameIn.type = 'text';
  nameIn.title = '디렉티브 이름 (note, info, tip, warning …)';
  const labelIn = document.createElement('input');
  labelIn.className = 'directive-node-label';
  labelIn.type = 'text';
  labelIn.placeholder = '제목 (label)';
  const foldSel = document.createElement('select');
  foldSel.className = 'directive-node-fold';
  foldSel.title = '접기 설정';
  for (const [v, label] of Object.entries(FOLD_LABEL)) {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = label;
    foldSel.appendChild(o);
  }
  header.append(mark, nameIn, labelIn, foldSel);

  const contentDOM = document.createElement('div');
  contentDOM.className = 'directive-node-body';
  dom.append(header, contentDOM);

  const patch = (attrs: Record<string, unknown>) => {
    const pos = getPos();
    if (pos == null) return;
    view.dispatch(view.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attrs }));
  };
  nameIn.addEventListener('input', () => patch({ name: nameIn.value.trim() }));
  labelIn.addEventListener('input', () => patch({ label: labelIn.value }));
  foldSel.addEventListener('change', () => {
    const next = { ...(node.attrs.attributes ?? {}) } as Record<string, string | null | undefined>;
    delete next.open;
    delete next.closed;
    if (foldSel.value) next[foldSel.value] = '';
    patch({ attributes: next });
  });

  const sync = () => {
    dom.dataset.directive = normalizeCalloutType(node.attrs.name);
    dom.dataset.fold = foldOf(node.attrs.attributes);
    if (nameIn.value !== node.attrs.name) nameIn.value = node.attrs.name;
    if (labelIn.value !== node.attrs.label) labelIn.value = node.attrs.label;
    foldSel.value = foldOf(node.attrs.attributes);
  };
  sync();

  return {
    dom,
    contentDOM,
    update(next: PMNode) {
      if (next.type !== node.type) return false;
      node = next;
      sync();
      return true;
    },
    stopEvent: (e: Event) => header.contains(e.target as Node),
    ignoreMutation: (m) => !contentDOM.contains(m.target),
  };
});

export const directivePlugins: MilkdownPlugin[] = [directiveRemark, directiveCleanup, directiveSchema, directiveView].flat() as MilkdownPlugin[];
