// 웹서버 버전: 파일 API 호출과 폴더 노트 앱 로직
import {
  doc, settings, toast, askPrompt, askConfirm, askChoose, errMsg,
} from './store.svelte';
import { basename, dirname, joinPath, safeDecode, stripExt, imageExt, isExternalSrc } from './utils';
import type { SearchResponse, FileHit } from './search/types';
import {
  splitFrontmatter, joinFrontmatter, parseFm, setField, nowIso, suggestSlug, SLUG_RE, asString,
} from './frontmatter';
import { restoreStyle } from './style';
import { defOf, collectionOf, COLLECTIONS } from './schema';

// 전체 문서의 frontmatter 요약(태그·시리즈 자동완성, slug 중복 검사)
export interface MetaDoc { path: string; slug?: string; series?: string; tags: string[] }
export const meta = $state<{ docs: MetaDoc[] }>({ docs: [] });
export async function refreshMeta() {
  try { meta.docs = (await call<{ docs: MetaDoc[] }>('/api/meta')).docs; } catch { /* 자동완성 없이 동작 */ }
}

// 새 문서를 만들 폴더(사이드바에서 선택한 폴더, 열린 문서의 폴더). 빈 문자열이면 루트.
export const nav = $state({ dir: '', filter: '' }); // filter: 사이드바 파일명 검색어

export interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'dir';
  children?: TreeNode[];
}

export const tree = $state<{ nodes: TreeNode[]; root: string }>({ nodes: [], root: '' });

const LAST_KEY = 'notes.lastDoc';

class ApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? `요청 실패 (${res.status})`, res.status);
  return data as T;
}
const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
const q = (p: string) => encodeURIComponent(p);

export async function refreshTree() {
  const t = await call<{ children: TreeNode[] }>('/api/tree');
  tree.nodes = t.children;
}

export async function init() {
  try {
    const info = await call<{ root: string }>('/api/info');
    tree.root = info.root;
    await refreshTree();
    void refreshMeta();
    const last = localStorage.getItem(LAST_KEY);
    if (last) await loadDoc(last).catch(() => localStorage.removeItem(LAST_KEY));
  } catch (e) {
    toast(errMsg(e), 'error');
  }
}

// ---- 문서 열기/저장 ----
// 자동 저장: 입력이 AUTOSAVE_IDLE_MS 멈추면 저장하고, 계속 입력해도 첫 변경 후 AUTOSAVE_MAX_MS 가 지나면 저장한다
const AUTOSAVE_IDLE_MS = 700;
const AUTOSAVE_MAX_MS = 10_000;
let autosaveTimer: ReturnType<typeof setTimeout> | undefined;
let autosaveMaxTimer: ReturnType<typeof setTimeout> | undefined;

function clearAutosave() {
  clearTimeout(autosaveTimer);
  clearTimeout(autosaveMaxTimer);
  autosaveMaxTimer = undefined;
}

async function loadDoc(path: string) {
  const f = await call<{ content: string }>(`/api/file?path=${q(path)}`);
  clearAutosave();
  doc.path = path;
  nav.dir = dirname(path);
  doc.name = basename(path);
  const sp = splitFrontmatter(f.content);
  doc.fm = sp.fm;
  doc.fmHas = sp.has;
  doc.fmLead = sp.lead;
  doc.eol = sp.eol;
  doc.content = sp.body;
  doc.original = sp.body;
  doc.dirty = false;
  doc.edit = true; // 문서는 편집 모드로 연다(읽기 모드는 상단 토글 / Ctrl+E)
  doc.key++;
  try { localStorage.setItem(LAST_KEY, path); } catch { /* 무시 */ }
}

// 변경이 있으면 저장/버리기/취소를 묻는다. true 면 진행해도 된다.
export async function guardDirty(): Promise<boolean> {
  if (!doc.dirty || !doc.path) return true;
  if (settings.autosave) return save();
  const pick = await askChoose(`'${doc.name}' 에 저장하지 않은 변경이 있습니다.`, ['저장', '버리기', '취소']);
  if (pick === 0) return save();
  return pick === 1;
}

export async function openDoc(path: string) {
  if (path === doc.path) return;
  if (!(await guardDirty())) return;
  try { await loadDoc(path); } catch (e) { toast(errMsg(e), 'error'); }
}

// auto: 자동 저장에서 호출(YAML 오류 안내 토스트를 반복해서 띄우지 않는다)
export async function save(auto = false): Promise<boolean> {
  if (!doc.path) return false;
  clearAutosave();
  if (doc.fmHas && parseFm(doc.fm).error) {
    if (!auto) toast('frontmatter YAML 오류가 있어 저장하지 않았습니다. 속성 패널에서 고쳐 주세요.', 'error');
    return false;
  }
  // 수정일은 저장할 때 자동으로 갱신한다(컬렉션에 modified_date 가 있는 경우만)
  if (doc.fmHas && doc.dirty && defOf(doc.path).fields.some((f) => f.key === 'modified_date')) {
    doc.fm = setField(doc.fm, 'modified_date', nowIso());
  }
  doc.saving = true;
  try {
    const { path, content, fm } = doc;
    // 에디터는 본문 전체를 다시 직렬화하므로, 의미가 같고 서식만 다른 줄은 디스크의 원문 줄로 되돌려 git diff 를 편집한 부분으로 한정한다
    const body = restoreStyle(doc.original, content);
    const text = joinFrontmatter({ fm, has: doc.fmHas, lead: doc.fmLead, eol: doc.eol }, body);
    await call(`/api/file?path=${q(path)}`, jsonInit('PUT', { content: text }));
    // 저장 중에 더 입력했다면 dirty 를 유지한다
    doc.original = body;
    if (doc.content === content && doc.fm === fm) doc.dirty = false;
    void refreshMeta();
    return true;
  } catch (e) {
    toast(`저장 실패: ${errMsg(e)}`, 'error');
    return false;
  } finally {
    doc.saving = false;
  }
}

function touch() {
  doc.dirty = true;
  clearTimeout(autosaveTimer);
  if (!settings.autosave || !doc.path) return;
  autosaveTimer = setTimeout(() => void save(true), AUTOSAVE_IDLE_MS);
  autosaveMaxTimer ??= setTimeout(() => void save(true), AUTOSAVE_MAX_MS);
}

export function onEditorChange(md: string) {
  doc.content = md;
  touch();
}

// 속성 패널에서 frontmatter 원문이 바뀌었을 때
export function onFmChange(raw: string) {
  doc.fm = raw;
  touch();
}

// frontmatter 가 없는 문서에 컬렉션 기본 필드로 블록을 만든다
export function addFrontmatter() {
  const t = stripExt(doc.name);
  let raw = '';
  for (const [k, v] of Object.entries(defOf(doc.path).initial(t, suggestSlug(t)))) raw = setField(raw, k, v);
  doc.fmHas = true;
  doc.fmLead = '\n';
  onFmChange(raw);
}

// ---- 본문 검색 ----
export async function searchFiles(
  query: string,
  opts: { caseSensitive: boolean; regex: boolean },
  signal: AbortSignal,
): Promise<SearchResponse> {
  const params = new URLSearchParams({ q: query, cs: opts.caseSensitive ? '1' : '0', re: opts.regex ? '1' : '0' });
  const r = await call<{ results: { path: string; matches: FileHit['matches']; more: boolean }[]; count: number; truncated: boolean }>(
    `/api/search?${params}`,
    { signal },
  );
  return {
    results: r.results.map((f) => ({ id: f.path, label: stripExt(f.path), matches: f.matches, more: f.more })),
    count: r.count,
    truncated: r.truncated,
  };
}

// ---- 파일 트리 조작 ----
const BAD_NAME = /[\\/:*?"<>|]/;

async function askName(title: string, value: string): Promise<string | null> {
  const name = await askPrompt(title, value);
  if (!name) return null;
  if (BAD_NAME.test(name) || name === '.' || name === '..') {
    toast('이름에 \\ / : * ? " < > | 문자는 쓸 수 없습니다', 'error');
    return null;
  }
  return name;
}

// 새 글: 제목과 slug 를 받아 <slug>.md 를 컬렉션의 기본 frontmatter 와 함께 만든다
export async function createDoc(dir: string) {
  if (!(collectionOf(dir) in COLLECTIONS)) {
    toast('새 글을 만들 컬렉션 폴더(blog, draft 등)를 먼저 선택하세요', 'error');
    return;
  }
  const title = await askPrompt('새 글 제목');
  if (!title) return;
  let slug = suggestSlug(title);
  for (;;) {
    const input = await askPrompt('slug (영문 소문자·숫자·하이픈) — 파일명은 slug.md 가 됩니다', slug);
    if (input === null) return;
    if (SLUG_RE.test(input)) { slug = input; break; }
    slug = input;
    toast('slug 는 영문 소문자·숫자·하이픈만 쓸 수 있습니다 (예: my-first-post)', 'error');
  }
  const path = joinPath(dir, `${slug}.md`);
  try {
    await call('/api/create', jsonInit('POST', { path, type: 'file' }));
    let raw = '';
    for (const [k, v] of Object.entries(defOf(path).initial(title, slug))) raw = setField(raw, k, v);
    const content = joinFrontmatter({ fm: raw, has: true, lead: '\n', eol: '\n' }, '');
    await call(`/api/file?path=${q(path)}`, jsonInit('PUT', { content }));
    await refreshTree();
    void refreshMeta();
    await openDoc(path);
    if (doc.path === path) doc.edit = true; // 새로 만든 문서는 편집 모드로 시작
  } catch (e) {
    toast(errMsg(e), 'error');
  }
}

export async function createFolder(dir: string) {
  const name = await askName('새 폴더 이름', '새 폴더');
  if (!name) return;
  try {
    await call('/api/create', jsonInit('POST', { path: joinPath(dir, name), type: 'dir' }));
    await refreshTree();
  } catch (e) {
    toast(errMsg(e), 'error');
  }
}

const affects = (target: string) => doc.path === target || doc.path.startsWith(target + '/');

export async function renameNode(node: TreeNode) {
  const isFile = node.type === 'file';
  const name = await askName('새 이름', isFile ? stripExt(node.name) : node.name);
  if (!name) return;
  const next = isFile ? (/\.md$/i.test(name) ? name : `${name}.md`) : name;
  if (next === node.name) return;
  if (affects(node.path) && !(await guardDirty())) return;
  const to = joinPath(dirname(node.path), next);
  try {
    await call('/api/rename', jsonInit('POST', { from: node.path, to }));
    const reopen = affects(node.path) ? to + doc.path.slice(node.path.length) : '';
    if (nav.dir === node.path || nav.dir.startsWith(node.path + '/')) nav.dir = to + nav.dir.slice(node.path.length);
    await refreshTree();
    if (reopen) await loadDoc(reopen); // 링크가 갱신된 파일을 다시 읽는다
  } catch (e) {
    toast(errMsg(e), 'error');
  }
}

export async function removeNode(node: TreeNode) {
  const what = node.type === 'dir' ? `폴더 '${node.name}' 와 그 안의 모든 문서` : `문서 '${node.name}'`;
  if (!(await askConfirm(`${what}를 삭제할까요? 되돌릴 수 없습니다.`, '삭제'))) return;
  try {
    await call(`/api/file?path=${q(node.path)}`, { method: 'DELETE' });
    if (nav.dir === node.path || nav.dir.startsWith(node.path + '/')) nav.dir = dirname(node.path);
    if (affects(node.path)) {
      clearAutosave();
      Object.assign(doc, { path: '', name: '제목 없음', content: '', original: '', fm: '', fmHas: false, fmLead: '', dirty: false });
      doc.key++;
      try { localStorage.removeItem(LAST_KEY); } catch { /* 무시 */ }
    }
    await refreshTree();
  } catch (e) {
    toast(errMsg(e), 'error');
  }
}

// ---- 이미지 ----
// 이미지는 글 옆에 <slug>-<번호>.<ext> 로 저장한다 (slug 는 frontmatter, 없으면 서버가 파일명으로 대신한다)
async function uploadFile(file: Blob, docPath: string): Promise<string> {
  const slug = asString(parseFm(doc.fm).data.slug);
  const r = await call<{ url: string }>(
    `/api/upload?doc=${q(docPath)}&ext=${imageExt(file)}&name=${q(slug)}`,
    { method: 'POST', body: file },
  );
  return r.url;
}

// 대표 이미지: 글 옆이 아니라 사이트 public/images 에 저장하고 사이트 루트 URL(/images/...)을 받는다
export async function uploadFeatureImage(file: File): Promise<string> {
  const slug = asString(parseFm(doc.fm).data.slug);
  const r = await call<{ url: string }>(
    `/api/feature-image?ext=${imageExt(file)}&name=${q(slug)}`,
    { method: 'POST', body: file },
  );
  return r.url;
}

// 에디터의 이미지 삽입 훅
export async function upload(file: File): Promise<string> {
  if (!doc.path) throw new Error('문서를 먼저 선택하세요');
  return uploadFile(file, doc.path);
}

// 문서의 상대경로 이미지를 화면에 표시할 URL 로 바꾼다
export function resolveUrl(src: string): string {
  if (isExternalSrc(src) || !doc.path) return src;
  const rel = joinPath(dirname(doc.path), safeDecode(src));
  return `/api/raw?path=${q(rel)}`;
}


// ---- 발행: draft → blog ----
interface PublishPlan {
  to: string;
  images: { from: string; to: string; action: 'move' | 'copy' }[];
  conflicts: string[];
  warnings: string[];
}

const fmtLocal = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

// draft 글을 blog 로 발행한다: status 를 published 로, published_date 를 지금으로 바꾸고, 글과 참조 이미지를 옮긴다.
// 옮기기 전에 이동 목록·충돌을 보여주고 확인을 받는다. 충돌이 있으면 아무것도 옮기지 않는다.
export async function publishDoc(path = doc.path) {
  if (!path.startsWith('draft/')) return;
  if (path !== doc.path) {
    await openDoc(path);
    if (doc.path !== path) return; // 저장 확인에서 취소했거나 열기에 실패
  }
  if (doc.dirty && !(await save())) return;
  if (!doc.fmHas) { toast('frontmatter 가 없는 글은 발행할 수 없습니다. 속성 패널에서 속성을 추가하세요', 'error'); return; }
  const parsed = parseFm(doc.fm);
  if (parsed.error) { toast('frontmatter YAML 오류를 먼저 고쳐 주세요', 'error'); return; }

  const publishedAt = nowIso();
  const fm = setField(setField(doc.fm, 'status', 'published'), 'published_date', publishedAt);
  const content = joinFrontmatter({ fm, has: true, lead: doc.fmLead, eol: doc.eol }, doc.original);
  const title = asString(parsed.data.title) || stripExt(doc.name);

  try {
    const plan = await call<PublishPlan>('/api/publish/plan', jsonInit('POST', { path, content }));
    if (plan.conflicts.length) {
      await askChoose(`'${title}' 을(를) 발행할 수 없습니다.\n\n${plan.conflicts.map((c) => `• ${c}`).join('\n')}\n\n문제를 해결한 뒤 다시 시도하세요. 아무것도 옮기지 않았습니다.`, ['닫기']);
      return;
    }
    const moves = plan.images.filter((i) => i.action === 'move');
    const copies = plan.images.filter((i) => i.action === 'copy');
    const lines = [
      `'${title}' 을(를) blog 로 발행합니다.`,
      '',
      `• 글 이동: ${path} → ${plan.to}`,
      `• status: published, 발행일: ${fmtLocal(publishedAt)} (지금)`,
    ];
    if (moves.length) lines.push(`• 이미지 이동 ${moves.length}개: ${moves.map((i) => basename(i.from)).join(', ')}`);
    if (copies.length) lines.push(`• 이미지 복사 ${copies.length}개 (다른 draft 도 사용 중): ${copies.map((i) => basename(i.from)).join(', ')}`);
    if (plan.warnings.length) lines.push('', ...plan.warnings.map((w) => `⚠ ${w}`));
    lines.push('', '발행하면 /draft/ 주소의 이 글은 사라집니다.');
    if (!(await askConfirm(lines.join('\n'), '발행'))) return;

    clearAutosave();
    const r = await call<{ path: string }>('/api/publish', jsonInit('POST', { path, content }));
    await refreshTree();
    void refreshMeta();
    await loadDoc(r.path);
    toast(`발행했습니다: ${r.path}`);
  } catch (e) {
    toast(`발행 실패: ${errMsg(e)}`, 'error');
  }
}
