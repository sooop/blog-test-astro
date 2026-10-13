// 전체 글 라운드트립 회귀 검사.
//   node --experimental-strip-types scripts/roundtrip.mjs [--root <content 폴더>] [--show <경로 일부>] [--edit]
//
// 세 가지를 잰다.
//   1) 의미 보존(AST): 원문과 에디터 직렬화 결과를 각각 mdast 로 파싱해 구조가 같은지. 다르면 문법이 깨진 것(위험).
//   2) 서식 복원: 직렬화 결과에서 서식만 다른 줄을 원문 줄로 되돌렸을 때 원문과 같은지(편집 없이 열고 저장해도 diff 0).
//   3) 편집 시뮬레이션(--edit): 본문 한 줄만 고쳤을 때 git diff 가 그 한 줄만 남는지.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

// Milkdown 은 DOM 이 필요하다: 모듈을 불러오기 전에 전역을 세팅한다
const dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
const w = dom.window;
globalThis.window = w;
for (const k of Object.getOwnPropertyNames(w)) {
  if (!(k in globalThis)) Object.defineProperty(globalThis, k, { get: () => w[k], set: (v) => { Object.defineProperty(globalThis, k, { value: v, writable: true, configurable: true }); }, configurable: true });
}
for (const k of ['addEventListener', 'removeEventListener', 'dispatchEvent']) globalThis[k] = w[k].bind(w);
// Node 의 Event 류 전역이 jsdom 것과 섞이면 dispatchEvent 가 거부한다
for (const k of ['Event', 'CustomEvent', 'EventTarget', 'MouseEvent', 'KeyboardEvent', 'InputEvent', 'FocusEvent', 'AbortController', 'AbortSignal']) if (w[k]) globalThis[k] = w[k];
// jsdom 에 없는 브라우저 API(CodeMirror·KaTeX 컴포넌트가 요구): 직렬화 검사에는 동작이 필요 없어 빈 구현으로 둔다
class NoopObserver { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
for (const k of ['IntersectionObserver', 'ResizeObserver']) { globalThis[k] = NoopObserver; w[k] = NoopObserver; }
if (!w.Range.prototype.getClientRects) w.Range.prototype.getClientRects = () => [];
if (!w.Range.prototype.getBoundingClientRect) w.Range.prototype.getBoundingClientRect = () => ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 });
w.HTMLElement.prototype.scrollIntoView = () => {};

const { unified } = await import('unified');
const { default: remarkParse } = await import('remark-parse');
const { default: remarkGfm } = await import('remark-gfm');
const { default: remarkMath } = await import('remark-math');
const { default: remarkDirective } = await import('remark-directive');
const { splitFrontmatter } = await import('../src/lib/frontmatter.ts');
const { buildEditor } = await import('../src/lib/editor-config.ts');
const { restoreStyle } = await import('../src/lib/style.ts');

const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const ROOT = opt('--root', fileURLToPath(new URL('../../../src/content', import.meta.url)));
const SHOW = opt('--show', '');
const EDIT = args.includes('--edit');
if (args.includes('--style-debug')) globalThis.__STYLE_DEBUG = (m) => console.log('  [style]', m);
const DUMP = opt('--dump', '');
const DUMPKEY = opt('--dumpkey', '<br');

const files = [];
const walk = (d) => {
  for (const n of readdirSync(d)) {
    if (n.startsWith('.')) continue;
    const p = join(d, n);
    if (statSync(p).isDirectory()) walk(p);
    else if (n.endsWith('.md')) files.push(p);
  }
};
walk(ROOT);

async function roundtrip(md) {
  const root = document.createElement('div');
  document.body.appendChild(root);
  const c = await buildEditor({ root, defaultValue: md, headless: true });
  await c.create();
  const out = c.getMarkdown();
  if (DUMP) { const { editorViewCtx } = await import('@milkdown/kit/core'); if (md.includes(DUMPKEY)) console.log('DOC:', c.editor.action((ctx) => ctx.get(editorViewCtx).state.doc.toString())); }
  await c.destroy();
  root.remove();
  return out;
}

// ---- AST 비교 ----
const parser = unified().use(remarkParse).use(remarkGfm).use(remarkMath).use(remarkDirective);
function ast(md) {
  const strip = (n) => {
    if (Array.isArray(n)) return n.map(strip);
    if (n && typeof n === 'object') {
      const o = {};
      for (const [k, v] of Object.entries(n)) { if (k === 'position' || k === 'data') continue; o[k] = strip(v); }
      return o;
    }
    return n;
  };
  return strip(parser.parse(md));
}
// 첫 번째로 다른 노드를 찾아 설명한다
function firstDiff(a, b, path = 'root') {
  if (JSON.stringify(a) === JSON.stringify(b)) return null;
  if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
    if (a.type !== b.type) return `${path}: ${a.type} ≠ ${b.type}  (${JSON.stringify(a).slice(0, 90)} | ${JSON.stringify(b).slice(0, 90)})`;
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const d = firstDiff(a[k], b[k], `${path}.${a.type ?? ''}.${k}`);
      if (d) return d;
    }
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      const d = firstDiff(a[i], b[i], `${path}[${i}]`);
      if (d) return d;
    }
  }
  return `${path}: ${JSON.stringify(a)?.slice(0, 100)} ≠ ${JSON.stringify(b)?.slice(0, 100)}`;
}

const trimEnd = (s) => s.replace(/\s+$/, '');
const lineDiff = (a, b) => {
  const x = a.split('\n'), y = b.split('\n');
  const m = new Map(); for (const l of y) m.set(l, (m.get(l) ?? 0) + 1);
  const only = []; for (const l of x) { const c = m.get(l); if (c) m.set(l, c - 1); else only.push(l); }
  return only;
};

// 편집 시뮬레이션용: 코드 펜스·표·목록이 아닌 일반 문단 줄 하나를 고른다
function pickEditLine(body) {
  const lines = body.split('\n');
  let fence = false;
  const cand = [];
  lines.forEach((l, i) => {
    if (/^\s*(```|~~~)/.test(l)) { fence = !fence; return; }
    if (fence) return;
    if (/^[A-Za-z가-힣][^|`$<>\[]{25,}[.다요]$/.test(l.trim()) && !/^\s*[-*+>#|:]/.test(l)) cand.push(i);
  });
  if (!cand.length) return -1;
  return cand[Math.floor(cand.length / 2)];
}

let n = 0, astOk = 0, styleOk = 0, editOk = 0, editTried = 0;
const bad = [];
for (const f of files) {
  const rel = relative(ROOT, f).split('\\').join('/');
  const body = splitFrontmatter(readFileSync(f, 'utf8')).body;
  n++;
  let out;
  try { out = await roundtrip(body); } catch (e) { bad.push({ rel, err: String(e.message).slice(0, 120) }); continue; }
if (DUMP && rel.includes(DUMP)) console.log(['---- ORIGINAL ----', body, '---- EDITOR OUTPUT ----', out, '---- END ----'].join(String.fromCharCode(10)));
  const d = firstDiff(ast(body), ast(out));
  const restored = restoreStyle(body, out);
  const style = trimEnd(restored) === trimEnd(body);
  if (!d) astOk++;
  if (style) styleOk++;
  const row = { rel, ast: d, styleDiff: style ? 0 : lineDiff(trimEnd(body), trimEnd(restored)).length, restored, out, body };
  if (EDIT) {
    const i = pickEditLine(body);
    if (i >= 0) {
      editTried++;
      const lines = body.split('\n'); lines[i] = lines[i] + ' (수정)';
      const edited = lines.join('\n');
      const out2 = await roundtrip(edited);
      const r2 = restoreStyle(body, out2);
      if (trimEnd(r2) === trimEnd(edited)) editOk++;
      else {
        row.edit = Math.max(1, lineDiff(trimEnd(edited), trimEnd(r2)).length);
        const x = trimEnd(edited).split(String.fromCharCode(10)), y = trimEnd(r2).split(String.fromCharCode(10));
        let k = 0; while (k < x.length && x[k] === y[k]) k++;
        row.editAt = `줄 ${k + 1}: 기대 ${JSON.stringify(x[k])?.slice(0, 80)} / 실제 ${JSON.stringify(y[k])?.slice(0, 80)}`;
        row.editCtx = [-2, -1, 0, 1, 2].map((d) => `   ${String(k + 1 + d).padStart(4)} 기대|${(x[k + d] ?? '').slice(0, 60)}
        실제|${(y[k + d] ?? '').slice(0, 60)}`).join(String.fromCharCode(10));
      }
    }
  }
  if (d || !style || row.edit) bad.push(row);
}

bad.sort((x, y) => (y.styleDiff ?? 0) - (x.styleDiff ?? 0));
for (const r of bad) {
  if (SHOW && !r.rel.includes(SHOW)) continue;
  if (r.err) { console.log('ERR ', r.rel, r.err); continue; }
  console.log(`${r.ast ? 'AST ' : '    '} ${r.styleDiff ? 'STYLE ' + String(r.styleDiff).padStart(3) : '          '} ${r.edit ? 'EDIT ' + r.edit : ''}  ${r.rel}`);
  if (SHOW) {
    if (r.ast) console.log('   첫 AST 차이:', r.ast);
    if (r.editAt) console.log('   편집 후 첫 차이:', r.editAt);
    if (r.editCtx) console.log(r.editCtx);
    if (r.styleDiff) {
      const a = trimEnd(r.body), b = trimEnd(r.restored);
      const only = lineDiff(a, b), added = lineDiff(b, a);
      only.slice(0, 15).forEach((l, i) => console.log('   - ' + l.slice(0, 110) + '\n   + ' + (added[i] ?? '').slice(0, 110)));
    }
  }
}
console.log(JSON.stringify({ files: n, astPreserved: astOk, styleRestored: styleOk, ...(EDIT ? { editMinimalDiff: `${editOk}/${editTried}` } : {}) }));
