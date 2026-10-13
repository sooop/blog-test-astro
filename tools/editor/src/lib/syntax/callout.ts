// Obsidian 콜아웃(> [!type]± 제목) 노드.
// 사이트(src/plugins/remark-obsidian-callout.ts)는 "첫 문단이 [!type] 으로 시작하는 blockquote" 를 콜아웃으로 해석한다.
// 파싱: remark 단계에서 그런 blockquote 를 `callout` mdast 노드로 바꾸고, 직렬화: 다시 blockquote 로 되돌린다
// (헤더는 raw html 노드로 써서 `[!note]` 의 대괄호가 이스케이프되지 않게 한다).
// 서식 보존: type 은 원문 그대로, 제목이 비면 비운 채로, 헤더 줄 다음 줄이 같은 문단으로 이어졌는지(joined/sep)를 기억한다.
import type { Ctx, MilkdownPlugin } from '@milkdown/kit/ctx';
import { commandsCtx } from '@milkdown/kit/core';
import { clearTextInCurrentBlockCommand, wrapInBlockTypeCommand } from '@milkdown/kit/preset/commonmark';
import type { Node as PMNode } from '@milkdown/kit/prose/model';
import type { EditorView, NodeView } from '@milkdown/kit/prose/view';
import { $nodeSchema, $remark, $view } from '@milkdown/kit/utils';

// 사이트와 같은 종류/별칭표(색·아이콘 분류용)
export const CALLOUT_TYPES: Record<string, string[]> = {
  note: ['note'],
  abstract: ['abstract', 'summary', 'tldr'],
  info: ['info', 'todo'],
  tip: ['tip', 'hint', 'important'],
  success: ['success', 'check', 'done'],
  question: ['question', 'help', 'faq'],
  warning: ['warning', 'caution', 'attention'],
  failure: ['failure', 'fail', 'missing'],
  danger: ['danger', 'error'],
  bug: ['bug'],
  example: ['example'],
  quote: ['quote', 'cite'],
};

export function normalizeCalloutType(raw: string): string {
  const lower = raw.toLowerCase();
  for (const [canonical, aliases] of Object.entries(CALLOUT_TYPES)) if (aliases.includes(lower)) return canonical;
  return 'note';
}

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ---- remark: blockquote → callout ----
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MdNode = any;

const HEADER = /^\[!([^\]\n]+)\]([+-]?)/;

function toCallout(node: MdNode): boolean {
  const p = node.children?.[0];
  if (p?.type !== 'paragraph') return false;
  const t = p.children?.[0];
  if (t?.type !== 'text') return false;
  const m = HEADER.exec(t.value);
  if (!m) return false;

  const rest: string = t.value.slice(m[0].length);
  const nl = rest.indexOf('\n');
  const line = nl >= 0 ? rest.slice(0, nl) : rest;
  const title = line.trim();
  let bodyInline: MdNode[] | null = null;
  let sep = '\n';

  if (nl >= 0) {
    const after = rest.slice(nl + 1);
    bodyInline = [...(after ? [{ type: 'text', value: after }] : []), ...p.children.slice(1)];
  } else if (p.children.length > 1) {
    const next = p.children[1];
    if (next.type === 'break') bodyInline = p.children.slice(2); // `[!note]␣␣` + 줄바꿈
    else { bodyInline = p.children.slice(1); sep = ' '; } // 제목 줄 뒤에 같은 줄로 서식 있는 글이 이어짐
  }

  const joined = !!bodyInline && bodyInline.length > 0;
  node.type = 'callout';
  node.calloutType = m[1];
  node.fold = m[2];
  node.title = title;
  node.joined = joined;
  node.sep = sep;
  node.children = joined
    ? [{ type: 'paragraph', children: bodyInline }, ...node.children.slice(1)]
    : node.children.slice(1);
  return true;
}

function walk(node: MdNode) {
  if (node.type === 'blockquote') toCallout(node);
  if (Array.isArray(node.children)) node.children.forEach(walk);
}

const calloutRemark = $remark('calloutRemark', () => () => (tree: MdNode) => { walk(tree); });

// ---- 노드 스키마 ----
export const calloutSchema = $nodeSchema('callout', () => ({
  group: 'block',
  content: 'block+',
  defining: true,
  attrs: {
    type: { default: 'note' },
    fold: { default: '' },
    title: { default: '' },
    joined: { default: false },
    sep: { default: '\n' },
  },
  parseDOM: [
    {
      tag: 'div[data-callout]',
      getAttrs: (dom: HTMLElement | string) => {
        const d = dom as HTMLElement;
        return {
          type: d.dataset.raw ?? d.dataset.callout ?? 'note',
          fold: d.dataset.fold ?? '',
          title: d.dataset.title ?? '',
          joined: d.dataset.joined === 'true',
          sep: d.dataset.sep ?? '\n',
        };
      },
    },
  ],
  toDOM: (node: PMNode) => [
    'div',
    {
      'data-callout': normalizeCalloutType(node.attrs.type),
      'data-raw': node.attrs.type,
      'data-fold': node.attrs.fold,
      'data-title': node.attrs.title,
      'data-joined': String(node.attrs.joined),
      'data-sep': node.attrs.sep,
      class: 'callout-node',
    },
    0,
  ],
  parseMarkdown: {
    match: (n: MdNode) => n.type === 'callout',
    runner: (state, n: MdNode, type) => {
      state
        .openNode(type, { type: n.calloutType, fold: n.fold, title: n.title, joined: n.joined, sep: n.sep })
        .next(n.children)
        .closeNode();
    },
  },
  toMarkdown: {
    match: (n: PMNode) => n.type.name === 'callout',
    runner: (state, n: PMNode) => {
      const { type, fold, title, joined, sep } = n.attrs as { type: string; fold: string; title: string; joined: boolean; sep: string };
      const first = n.firstChild;
      const merge = joined && first?.type.name === 'paragraph' && first.content.size > 0;
      state.openNode('blockquote');
      state.openNode('paragraph');
      state.addNode('html', undefined, `[!${type}]${fold}${title ? ' ' : ''}`);
      if (title) state.addNode('text', undefined, title);
      if (merge) {
        state.addNode('html', undefined, sep);
        state.next(first.content);
      }
      state.closeNode();
      const skipEmpty = n.childCount === 1 && first?.type.name === 'paragraph' && first.content.size === 0;
      n.forEach((child, _o, i) => {
        if (merge && i === 0) return;
        if (skipEmpty) return;
        state.next(child);
      });
      state.closeNode();
    },
  },
}));

// ---- NodeView ----
const FOLD_LABEL: Record<string, string> = { '': '접기 없음', '+': '접기 가능 (펼침)', '-': '접기 가능 (접힘)' };

const calloutView = $view(calloutSchema.node, () => (initial: PMNode, view: EditorView, getPos: () => number | undefined): NodeView => {
  let node = initial;

  const dom = document.createElement('div');
  dom.className = 'callout-node';
  const header = document.createElement('div');
  header.className = 'callout-node-header';
  header.contentEditable = 'false';

  const select = document.createElement('select');
  select.className = 'callout-node-type';
  select.title = '콜아웃 종류';
  const input = document.createElement('input');
  input.className = 'callout-node-title';
  input.type = 'text';
  const foldSel = document.createElement('select');
  foldSel.className = 'callout-node-fold';
  foldSel.title = '접기 설정';
  for (const [v, label] of Object.entries(FOLD_LABEL)) {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = label;
    foldSel.appendChild(o);
  }
  header.append(select, input, foldSel);

  const contentDOM = document.createElement('div');
  contentDOM.className = 'callout-node-body';
  dom.append(header, contentDOM);

  const patch = (attrs: Record<string, unknown>) => {
    const pos = getPos();
    if (pos == null) return;
    view.dispatch(view.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attrs }));
  };
  select.addEventListener('change', () => patch({ type: select.value }));
  input.addEventListener('input', () => patch({ title: input.value }));
  foldSel.addEventListener('change', () => patch({ fold: foldSel.value }));

  const sync = () => {
    const raw: string = node.attrs.type;
    const norm = normalizeCalloutType(raw);
    dom.dataset.callout = norm;
    dom.dataset.fold = node.attrs.fold;
    select.replaceChildren();
    const names = Object.keys(CALLOUT_TYPES);
    if (!names.includes(raw)) names.unshift(raw); // 별칭·대소문자 등 원문 type 은 그대로 보존
    for (const name of names) {
      const o = document.createElement('option');
      o.value = name;
      o.textContent = name;
      select.appendChild(o);
    }
    select.value = raw;
    input.placeholder = capitalize(raw);
    if (input.value !== node.attrs.title) input.value = node.attrs.title;
    foldSel.value = node.attrs.fold;
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

export const calloutPlugins: MilkdownPlugin[] = [calloutRemark, calloutSchema, calloutView].flat() as MilkdownPlugin[];

// ---- 슬래시 메뉴(/) 항목 ----
// 현재 빈 블록을 콜아웃으로 감싼다(Crepe 의 '인용' 항목과 같은 방식). 종류(note, tip, warning …)는 삽입 후 헤더에서 바꾼다.
// Crepe 아이콘은 fill 방식이다(stroke 로 그리면 CSS 의 fill 때문에 원판으로 채워진다)
const CALLOUT_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>';

export function insertCallout(ctx: Ctx) {
  const commands = ctx.get(commandsCtx);
  commands.call(clearTextInCurrentBlockCommand.key);
  commands.call(wrapInBlockTypeCommand.key, {
    nodeType: calloutSchema.type(ctx),
    attrs: { type: 'note', fold: '', title: '', joined: false, sep: '\n' },
  });
}

// Crepe 블록 편집의 buildMenu 에 넘긴다. '콜아웃 (Callout)' 이라 'callout'·'콜아웃' 어느 쪽으로 검색해도 찾힌다.
export function addCalloutMenuItem(builder: { getGroup: (key: string) => { addItem: (key: string, item: { label: string; icon: string; onRun?: (ctx: Ctx) => void }) => unknown } }) {
  builder.getGroup('advanced').addItem('callout', { label: '콜아웃 (Callout)', icon: CALLOUT_ICON, onRun: insertCallout });
}
