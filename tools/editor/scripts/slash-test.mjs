// 슬래시 메뉴의 '콜아웃' 삽입 명령 검사(헤드리스): 문단 위에서 실행했을 때 콜아웃 노드가 생기고 올바른 마크다운으로 직렬화되는지.
//   npm run test:slash
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
const w = dom.window;
globalThis.window = w;
for (const k of Object.getOwnPropertyNames(w)) {
  if (!(k in globalThis)) Object.defineProperty(globalThis, k, { get: () => w[k], set: (v) => { Object.defineProperty(globalThis, k, { value: v, writable: true, configurable: true }); }, configurable: true });
}
for (const k of ['addEventListener', 'removeEventListener', 'dispatchEvent']) globalThis[k] = w[k].bind(w);
for (const k of ['Event', 'CustomEvent', 'EventTarget', 'MouseEvent', 'KeyboardEvent', 'InputEvent', 'FocusEvent', 'AbortController', 'AbortSignal']) if (w[k]) globalThis[k] = w[k];
class NoopObserver { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
for (const k of ['IntersectionObserver', 'ResizeObserver']) { globalThis[k] = NoopObserver; w[k] = NoopObserver; }
if (!w.Range.prototype.getClientRects) w.Range.prototype.getClientRects = () => [];
if (!w.Range.prototype.getBoundingClientRect) w.Range.prototype.getBoundingClientRect = () => ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 });
w.HTMLElement.prototype.scrollIntoView = () => {};

const { buildEditor } = await import('../src/lib/editor-config.ts');
const { insertCallout } = await import('../src/lib/syntax/callout.ts');
const { editorViewCtx } = await import('@milkdown/kit/core');
const { TextSelection } = await import('@milkdown/kit/prose/state');

let failed = 0;
async function run(name, md, cursorAtDocEnd, expectFn) {
  const root = document.createElement('div');
  document.body.appendChild(root);
  const c = await buildEditor({ root, defaultValue: md, headless: true });
  await c.create();
  // 커서를 문서 끝(마지막 문단)에 두고 슬래시 메뉴가 하는 일을 그대로 실행한다
  c.editor.action((ctx) => {
    const view = ctx.get(editorViewCtx);
    const end = view.state.doc.content.size - 1;
    view.dispatch(view.state.tr.setSelection(TextSelection.near(view.state.doc.resolve(cursorAtDocEnd ? end : 1))));
    insertCallout(ctx);
  });
  const out = c.getMarkdown();
  await c.destroy();
  root.remove();
  const ok = expectFn(out);
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}\n     ${JSON.stringify(out)}`);
  if (!ok) failed++;
}

// 실제 흐름: 빈 블록에서 '/' 를 입력하면 그 글자가 블록에 남아 있고, 항목을 고르면 그 글자를 지우고 콜아웃으로 바꾼다
await run('빈 문서에서 삽입 → > [!note]', '', true, (o) => o.startsWith('> [!note]'));
await run('앞 문단은 그대로 두고 뒤 블록만 콜아웃이 된다', '앞 문단\n\n/', true, (o) => o.startsWith('앞 문단') && o.includes('> [!note]') && !o.includes('/'));
await run('입력해 둔 슬래시 글자가 지워진다', '/', true, (o) => !o.includes('/') && o.includes('[!note]'));

console.log(failed ? `\n${failed}개 실패` : '\n모두 통과');
process.exit(failed ? 1 : 0);
