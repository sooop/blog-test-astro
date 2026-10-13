// 서식 복원: Milkdown 은 저장할 때 본문 전체를 다시 직렬화해서, 건드리지 않은 줄도 서식이 바뀐다
// (줄 끝 공백 제거, 목록 표식 - ↔ *, 번호 재매김, 들여쓰기·빈 줄 정리, 표 정렬, 불필요한 이스케이프 추가 등).
// 의미는 같고 서식만 다른 줄은 원문 줄을 그대로 쓰고, 실제로 바뀐 줄만 새 결과를 쓴다 → git diff 가 편집한 부분만 남는다.
//
// 안전장치: 복원한 결과를 다시 mdast 로 파싱해서 에디터가 낸 결과와 구조가 완전히 같을 때만 채택한다.
// 느슨한 비교(들여쓰기 무시)로 만든 결과가 구조를 바꿨다면(예: 사용자가 목록 중첩을 바꾼 경우) 더 엄격한 수준으로,
// 그래도 안 되면 에디터 출력을 그대로 쓴다. 그래서 사용자의 편집이 복원 과정에서 조용히 사라지는 일은 없다.
import { diffArrays } from 'diff';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkDirective from 'remark-directive';

const parser = unified().use(remarkParse).use(remarkGfm).use(remarkMath).use(remarkDirective);

// 위치·부가 데이터를 뺀 구조의 문자열 표현 (두 마크다운이 같은 구조인지 비교하는 용도)
export function structure(md: string): string {
  const strip = (n: unknown): unknown => {
    if (Array.isArray(n)) return n.map(strip);
    if (n && typeof n === 'object') {
      const o: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(n)) if (k !== 'position' && k !== 'data') o[k] = strip(v);
      return o;
    }
    return n;
  };
  return JSON.stringify(strip(parser.parse(md)));
}

const ESCAPABLE = /\\([!-/:-@[-`{-~])/g; // 백슬래시 + ASCII 구두점
const FENCE_OPEN = /^\s*(`{3,}|~{3,})/;

// 서식 차이를 무시하고 줄을 비교하기 위한 키. ignoreIndent: 앞쪽 들여쓰기도 무시한다.
export function norm(line: string, ignoreIndent = false): string {
  let s = line.replace(/\s+$/, '');
  if (!s) return '';
  s = s.replace(ESCAPABLE, '$1'); // 직렬화기가 덧붙이는 이스케이프
  // 수평선
  if (/^\s*(?:(?:\*\s*){3,}|(?:-\s*){3,}|(?:_\s*){3,})$/.test(s)) return '---';
  // 본문 중간의 $$x$$ 는 remark-math 가 $x$ 와 똑같이(inlineMath) 해석한다. 안쪽 공백도 구조에 영향이 없다.
  s = s.replace(/\$\$([^$\n]+?)\$\$/g, (_m, x: string) => '$' + x.trim() + '$');
  // 자동 링크 <url> 은 맨 URL 과 같은 link 노드다
  s = s.replace(/<((?:https?|mailto):[^>\s]+)>/g, '$1');
  if (ignoreIndent) {
    // 느슨한 수준: 들여쓰기와 인용 표식(`>`)을 모두 무시한다 (인용문의 게으른 연속 줄 등). 구조 검증이 뒤에서 걸러낸다.
    s = s.replace(/^(?:\s*>)*\s*/, '');
  }
  // 인용 표식 뒤 공백
  s = s.replace(/^(\s*)((?:>\s*)+)/, (_m, ws: string, q: string) => ws + '>'.repeat((q.match(/>/g) ?? []).length) + ' ');
  // 목록 표식(종류·번호·표식 뒤 공백 개수) — 인용 표식 뒤에 와도 마찬가지
  s = s.replace(/^((?:\s*>+ )?\s*)(?:[-*+]|\d+[.)])\s+/, '$1• ');
  // 표: 칸 안쪽 공백·구분선 길이
  if (/^\s*(?:>+ )?\|/.test(s)) s = s.replace(/\s*\|\s*/g, '|').replace(/-{2,}/g, '-');
  return s;
}

// 줄마다 비교 키를 만든다. 코드 펜스 안의 줄은 글자 하나까지 같아야 같은 줄이다(코드의 공백·기호는 의미가 있다).
function keysOf(lines: string[], ignoreIndent: boolean): string[] {
  const out: string[] = [];
  let fence = '';
  for (const l of lines) {
    if (fence) {
      const t = l.trim();
      const closes = t.startsWith(fence[0]) && /^(`+|~+)$/.test(t) && t.length >= fence.length;
      out.push('C|' + l);
      if (closes) fence = '';
      continue;
    }
    const m = FENCE_OPEN.exec(l);
    if (m) { fence = m[1]; out.push('C|' + l); continue; }
    out.push(norm(l, ignoreIndent));
  }
  return out;
}

// 줄 하나와, 그 줄 바로 앞의 빈 줄들(줄 사이의 간격)
interface Row { text: string; key: string; gap: string[] }

function rowsOf(lines: string[], keys: string[]): Row[] {
  const out: Row[] = [];
  let gap: string[] = [];
  lines.forEach((text, i) => {
    if (keys[i] === '') gap.push(text);
    else { out.push({ text, key: keys[i], gap }); gap = []; }
  });
  return out;
}

// 엄격한 수준: 줄 단위 정렬만 한다(빈 줄도 한 줄로 취급). 들여쓰기는 구분하고 서식만 다른 줄은 원문 줄을 쓴다.
function restoreStrict(a: string[], b: string[], ka: string[], kb: string[]): string[] {
  // 공통 구간의 value 는 새 배열 쪽 값이라 신뢰할 수 없다 → 구간 길이(count)로 양쪽 위치를 직접 센다
  const parts = diffArrays(ka, kb);
  const out: string[] = [];
  let ai = 0;
  let bi = 0;
  for (const p of parts) {
    const n = p.count ?? p.value.length;
    if (p.added) { for (let k = 0; k < n; k++) out.push(b[bi + k]); bi += n; }
    else if (p.removed) ai += n;
    else { for (let k = 0; k < n; k++) out.push(a[ai + k]); ai += n; bi += n; }
  }
  return out;
}

// 느슨한 수준: 빈 줄은 비교에서 빼고 줄 사이의 간격으로 따로 다룬다.
// 같은 줄은 원문의 줄과 간격을 그대로 쓰고, 편집으로 바뀐 줄은 자리를 차지한 원문 줄의 간격을 이어받는다
// (그래야 '코드 블록 바로 뒤 문단'처럼 원문에 빈 줄이 없던 자리에 에디터의 빈 줄이 끼어들지 않는다).
function restoreLenient(a: string[], b: string[], ka: string[], kb: string[]): string[] {
  const A = rowsOf(a, ka);
  const B = rowsOf(b, kb);
  const parts = diffArrays(A.map((r) => r.key), B.map((r) => r.key));
  const out: string[] = [];
  let ai = 0;
  let bi = 0;
  for (let pi = 0; pi < parts.length; pi++) {
    const p = parts[pi];
    const n = p.count ?? p.value.length;
    if (!p.added && !p.removed) {
      for (let k = 0; k < n; k++) out.push(...A[ai + k].gap, A[ai + k].text);
      ai += n;
      bi += n;
      continue;
    }
    // 연속된 removed/added 를 하나의 변경 묶음으로 본다
    let rem = 0;
    let add = 0;
    for (; pi < parts.length && (parts[pi].added || parts[pi].removed); pi++) {
      const c = parts[pi].count ?? parts[pi].value.length;
      if (parts[pi].removed) rem += c; else add += c;
    }
    pi--;
    for (let k = 0; k < add; k++) {
      const r = B[bi + k];
      out.push(...(k < rem ? A[ai + k].gap : r.gap), r.text);
    }
    ai += rem;
    bi += add;
  }
  return out;
}

export function restoreAt(original: string, next: string, ignoreIndent: boolean): string {
  const a = original.split('\n');
  const b = next.split('\n');
  const ka = keysOf(a, ignoreIndent);
  const kb = keysOf(b, ignoreIndent);
  return (ignoreIndent ? restoreLenient(a, b, ka, kb) : restoreStrict(a, b, ka, kb)).join('\n');
}

// original: 디스크에 있던 본문, next: 에디터가 직렬화한 본문. 서식만 다른 줄은 원문 그대로 둔 본문을 돌려준다.
export function restoreStyle(original: string, next: string): string {
  if (original === next) return next;
  let target: string;
  try { target = structure(next); } catch { return next; }
  const tail = /\s*$/.exec(original)?.[0] ?? '';
  for (const ignoreIndent of [true, false]) {
    const cand = restoreAt(original, next, ignoreIndent).replace(/\s+$/, '') + tail;
    try {
      if (structure(cand) === target) return cand;
      (globalThis as { __STYLE_DEBUG?: (m: string) => void }).__STYLE_DEBUG?.(`level ignoreIndent=${ignoreIndent} 거부: 구조 불일치`);
    } catch (e) { /* 다음 수준으로 */ (globalThis as { __STYLE_DEBUG?: (m: string) => void }).__STYLE_DEBUG?.('level 예외 ' + String(e)); }
  }
  return next;
}
