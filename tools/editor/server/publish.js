// draft → blog 발행: 글(.md)과 본문이 참조하는 로컬 이미지를 blog 폴더로 옮긴다.
// 계획(plan)과 실행(publish)을 분리해, 클라이언트가 이동할 파일 목록과 충돌을 먼저 보여주고 확인을 받게 한다.
import fs from 'node:fs/promises';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';

const SOURCE = 'draft';
const TARGET = 'blog';
const FM_RE = /^﻿?---[ \t]*\r?\n([\s\S]*?)\r?\n---/;
const IMG_RE = /!\[[^\]]*\]\((<[^>]+>|[^)\s]+)(?:\s+"[^"]*")?\)/g;

function safeDecode(s) {
  try { return decodeURIComponent(s); } catch { return s; }
}

// 본문에서 로컬(상대 경로) 이미지 참조를 뽑는다. 외부 URL·data URI·절대 경로(/…)는 제외한다.
export function localImageRefs(text) {
  const out = new Set();
  for (const m of text.matchAll(IMG_RE)) {
    const raw = m[1].startsWith('<') ? m[1].slice(1, -1) : m[1];
    if (/^([a-z][a-z0-9+.-]*:|\/|#)/i.test(raw)) continue;
    out.add(safeDecode(raw.split('#')[0].split('?')[0]));
  }
  return [...out];
}

function slugOf(text) {
  const m = FM_RE.exec(text);
  if (!m) return '';
  try {
    const d = parseYaml(m[1]);
    return d && typeof d.slug === 'string' ? d.slug : '';
  } catch { return ''; }
}

export function createPublisher({ root, safe, rel, exists, listMd, HttpError }) {
  const within = (abs) => abs === root || abs.startsWith(root + path.sep);

  // from: 'draft/...md', content: 발행할 최종 글 전체(frontmatter 포함)
  async function plan(from, content) {
    if (typeof from !== 'string' || typeof content !== 'string') throw new HttpError(400, 'path, content 필요');
    const parts = from.split('/');
    if (parts[0] !== SOURCE || !from.toLowerCase().endsWith('.md')) throw new HttpError(400, `${SOURCE} 폴더의 .md 문서만 발행할 수 있습니다`);
    const src = await safe(from);
    const toRel = `${TARGET}/${parts.slice(1).join('/')}`;
    const dst = await safe(toRel, { mustExist: false });

    const conflicts = [];
    const warnings = [];
    if (await exists(dst)) conflicts.push(`같은 이름의 글이 이미 있습니다: ${toRel}`);

    const slug = slugOf(content);
    if (!slug) {
      conflicts.push('slug 가 없습니다. 속성 패널에서 slug 를 입력하세요');
    } else {
      for (const f of await listMd(path.join(root, TARGET))) {
        if (f.abs === dst) continue;
        try {
          if (slugOf(await fs.readFile(f.abs, 'utf8')) === slug) conflicts.push(`blog 에 같은 slug 의 글이 있습니다: ${slug} (${f.path})`);
        } catch { /* 읽을 수 없는 글은 건너뜀 */ }
      }
    }

    // 다른 draft 가 같은 이미지를 참조하면 옮기지 않고 복사한다(그 글의 이미지가 깨지지 않게)
    const others = [];
    for (const f of await listMd(path.join(root, SOURCE))) {
      if (f.abs === src) continue;
      try { others.push(await fs.readFile(f.abs, 'utf8')); } catch { /* 무시 */ }
    }

    const images = [];
    for (const ref of localImageRefs(content)) {
      const from_ = path.resolve(path.dirname(src), ref);
      const to_ = path.resolve(path.dirname(dst), ref);
      if (!within(from_) || !within(to_)) { warnings.push(`폴더 밖을 가리키는 이미지는 옮기지 않습니다: ${ref}`); continue; }
      if (!(await exists(from_))) { warnings.push(`이미지 파일이 없습니다(링크만 유지): ${ref}`); continue; }
      if (await exists(to_)) { conflicts.push(`같은 이름의 이미지가 이미 있습니다: ${rel(to_)}`); continue; }
      const shared = others.some((t) => t.includes(ref) || t.includes(encodeURI(ref)));
      images.push({ from: rel(from_), to: rel(to_), action: shared ? 'copy' : 'move' });
    }
    return { from, to: toRel, slug, images, conflicts, warnings, src, dst };
  }

  async function run(from, content) {
    const p = await plan(from, content);
    if (p.conflicts.length) throw new HttpError(409, p.conflicts.join('\n'));
    const done = [];
    try {
      for (const img of p.images) {
        const a = path.join(root, img.from);
        const b = path.join(root, img.to);
        await fs.mkdir(path.dirname(b), { recursive: true });
        if (img.action === 'copy') await fs.copyFile(a, b);
        else await fs.rename(a, b);
        done.push(img);
      }
      await fs.mkdir(path.dirname(p.dst), { recursive: true });
      await fs.writeFile(p.dst, content, { encoding: 'utf8', flag: 'wx' });
      await fs.rm(p.src);
    } catch (e) {
      // 되돌리기: 옮긴 이미지는 제자리로, 복사한 이미지는 지운다
      for (const img of done.reverse()) {
        const a = path.join(root, img.from);
        const b = path.join(root, img.to);
        try { if (img.action === 'copy') await fs.rm(b, { force: true }); else await fs.rename(b, a); } catch { /* 최선 */ }
      }
      throw e;
    }
    return { path: p.to, images: p.images };
  }

  const view = ({ src: _s, dst: _d, ...rest }) => rest;
  return { plan: async (from, content) => view(await plan(from, content)), run };
}
