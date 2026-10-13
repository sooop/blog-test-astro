// frontmatter 분리·결합과 필드 편집. 에디터(Milkdown)는 본문만 다루고, frontmatter 는 이 모듈이 원문 YAML 텍스트로 다룬다.
// 필드를 고칠 때만 YAML 을 다시 쓰고, 고치지 않은 키의 순서·주석·따옴표는 그대로 둔다(yaml Document API).
import { Document, Scalar, isMap, isScalar, parseDocument } from 'yaml';

export interface Split {
  fm: string; // 구분선(---) 사이의 원문 YAML, 없으면 ''
  has: boolean; // frontmatter 블록이 있었는지
  lead: string; // frontmatter 뒤 본문 앞의 빈 줄들(그대로 되돌려 쓴다)
  eol: string; // 파일의 줄바꿈 (\n | \r\n)
  body: string; // 줄바꿈이 \n 으로 정규화된 본문
}

const FM_RE = /^﻿?---[ \t]*\r?\n(?:([\s\S]*?)\r?\n)?---[ \t]*(?:\r?\n|$)/;

export function splitFrontmatter(content: string): Split {
  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  const m = FM_RE.exec(content);
  const rest = m ? content.slice(m[0].length) : content;
  const lead = m ? (/^(?:[ \t]*\r?\n)*/.exec(rest)?.[0] ?? '') : '';
  const body = rest.slice(lead.length).replace(/\r\n/g, '\n');
  return { fm: m ? (m[1] ?? '').replace(/\r\n/g, '\n') : '', has: !!m, lead: lead.replace(/\r\n/g, '\n'), eol, body };
}

export function joinFrontmatter(p: { fm: string; has: boolean; lead: string; eol: string }, body: string): string {
  const text = p.has ? `---\n${p.fm}${p.fm ? '\n' : ''}---\n${p.lead}${body}` : body;
  return p.eol === '\r\n' ? text.replace(/\n/g, '\r\n') : text;
}

// ---- YAML 편집 ----
const OPTS = { lineWidth: 0 } as const; // toString 에 쓴다: 긴 문자열을 임의로 접지 않는다

export interface Parsed {
  doc: Document;
  data: Record<string, unknown>;
  error: string; // 비어 있으면 정상
}

export function parseFm(raw: string): Parsed {
  const doc = parseDocument(raw);
  const err = doc.errors[0];
  let data: Record<string, unknown> = {};
  if (!err) {
    const js = doc.toJS();
    if (js && typeof js === 'object' && !Array.isArray(js)) data = js as Record<string, unknown>;
    else if (raw.trim()) return { doc, data, error: 'frontmatter 는 key: value 형태여야 합니다' };
  }
  return { doc, data, error: err ? err.message.split('\n')[0] : '' };
}

export const asString = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString();
  return typeof v === 'object' ? JSON.stringify(v) : String(v);
};
export const asTags = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => asString(x)).filter(Boolean) : typeof v === 'string' && v ? [v] : [];

// 값을 바꾼 YAML 원문을 돌려준다. undefined 면 키를 지운다. 오류가 있는 YAML 은 건드리지 않는다.
// 문서 전체를 다시 쓰면 건드리지 않은 줄의 서식까지 바뀐다 (예: 'feature_image: ' → 'feature_image:', ["a"] → [ "a" ]).
// 그래서 바꿀 키 한 개의 구간만 원문에서 교체하고 나머지는 한 글자도 건드리지 않는다.
export function setField(raw: string, key: string, value: string | number | string[] | undefined): string {
  const doc = parseDocument(raw);
  if (doc.errors.length) return raw;
  const remove = value === undefined || (Array.isArray(value) && !value.length);

  // 기존 키의 구간: 키가 있는 줄의 시작 ~ 값이 끝나는 줄의 끝(줄바꿈 제외)
  let from = -1;
  let to = -1;
  const map = doc.contents;
  if (isMap(map)) {
    const pair = map.items.find((p) => isScalar(p.key) && String(p.key.value) === key);
    const keyRange = pair && isScalar(pair.key) ? pair.key.range : null;
    if (pair && keyRange) {
      const valRange = pair.value && typeof pair.value === 'object' && 'range' in pair.value ? pair.value.range : null;
      let end = Math.max(keyRange[1], valRange ? valRange[1] : 0);
      while (end > keyRange[1] && /\s/.test(raw[end - 1])) end--; // 값 뒤의 공백·줄바꿈은 구간에서 뺀다
      const nl = raw.indexOf('\n', end);
      to = nl < 0 ? raw.length : nl;
      from = raw.lastIndexOf('\n', keyRange[0] - 1) + 1;
    }
  }

  if (remove) {
    if (from < 0) return raw;
    const after = to < raw.length ? to + 1 : to; // 뒤따르는 줄바꿈까지 지운다
    const next = raw.slice(0, from) + raw.slice(after);
    return next.replace(/\n+$/, '');
  }

  // 새 값을 한 쌍짜리 문서로 직렬화해 'key: value' 텍스트를 얻는다. 날짜 같은 문자열도 따옴표 없이 쓰고(기존 글의 형식),
  // 필요한 경우(예: 콜론 포함)에만 yaml 이 따옴표를 붙인다.
  const one = new Document();
  one.set(key, Array.isArray(value) ? one.createNode(value) : typeof value === 'string' ? new Scalar(value) : value);
  const text = one.toString(OPTS).replace(/\n+$/, '');
  if (from < 0) return raw ? raw.replace(/\n+$/, '') + '\n' + text : text;
  return raw.slice(0, from) + text + raw.slice(to);
}

export function removeField(raw: string, key: string): string {
  return setField(raw, key, undefined);
}

// ---- 날짜 ----
export const nowIso = () => new Date().toISOString();
export const validDate = (s: string) => !s || !Number.isNaN(new Date(s).getTime());

// 날짜/시간 피커용. 기존 글의 저장 형식을 유지하도록 형식을 함께 돌려준다.
//   z     2025-10-20T09:54:12.000Z  (UTC 로 저장, 피커에는 로컬 시각으로 표시)
//   local 2025-09-30T21:00:20       (시간대 없음, 그대로 표시)
//   date  2026-04-18                (날짜만)
export interface DateParts { date: string; time: string; style: 'z' | 'local' | 'date' }
const p2 = (n: number) => String(n).padStart(2, '0');

export function toParts(s: string): DateParts | null {
  if (!s) return { date: '', time: '', style: 'z' };
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return { date: s, time: '', style: 'date' };
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::(\d{2}))?(?:\.\d+)?$/.exec(s);
  if (m) return { date: m[1], time: `${m[2]}:${m[3] ?? '00'}`, style: 'local' };
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return {
    date: `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`,
    time: `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`,
    style: 'z',
  };
}

export function fromParts(date: string, time: string, style: DateParts['style']): string {
  if (!date) return '';
  if (style === 'date' && !time) return date;
  const t = time || '00:00:00';
  const full = t.length === 5 ? `${t}:00` : t;
  if (style === 'z') return new Date(`${date}T${full}`).toISOString();
  return `${date}T${full}`;
}

// ---- slug ----
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// 영문·숫자 제목이면 slug 를 제안하고, 한글 등이 섞여 있으면 빈 문자열(직접 입력)
export function suggestSlug(title: string): string {
  if (/[^\x20-\x7e]/.test(title)) return '';
  const s = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return SLUG_RE.test(s) ? s : '';
}
