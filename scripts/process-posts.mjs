/**
 * Obsidian 포스트 전처리 스크립트
 *
 * 사용법:
 *   npm run process                    # 전체 blog 폴더 처리
 *   npm run process -- <파일경로>      # 특정 파일만 처리
 *   npm run process -- --dry-run       # 변경 없이 미리 보기
 */

import { readdir, readFile, writeFile, rename } from 'node:fs/promises';
import { join, relative, resolve, dirname } from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BLOG_DIR = resolve(__dirname, '../src/content/blog');
const REPO_ROOT = resolve(__dirname, '..');

// ── 인수 파싱 ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const targetFiles = args.filter(a => !a.startsWith('--'));

// ── 진입점 ───────────────────────────────────────────────────────────────────
async function main() {
  let files;
  if (targetFiles.length > 0) {
    files = targetFiles.map(f => resolve(f));
  } else {
    const entries = await readdir(BLOG_DIR);
    files = entries
      .filter(e => e.endsWith('.md'))
      .map(e => join(BLOG_DIR, e));
  }

  // title → slug 매핑 테이블 (문서 wikilink 변환용)
  const slugMap = await buildSlugMap(BLOG_DIR);

  let changed = 0;
  let skipped = 0;

  for (const file of files) {
    const result = await processFile(file, slugMap, isDryRun);
    if (result) changed++;
    else skipped++;
  }

  console.log(`\n완료: ${changed}개 처리, ${skipped}개 변경 없음${isDryRun ? ' (dry-run)' : ''}`);
}

// ── title → slug 매핑 ────────────────────────────────────────────────────────
async function buildSlugMap(dir) {
  const map = new Map();
  const entries = await readdir(dir);
  for (const entry of entries) {
    if (!entry.endsWith('.md')) continue;
    try {
      const content = await readFile(join(dir, entry), 'utf-8');
      const fm = parseFrontmatter(content);
      if (fm.title && fm.slug) {
        map.set(fm.title, fm.slug);
      }
    } catch {
      // 읽기 실패 시 건너뜀
    }
  }
  return map;
}

// ── frontmatter 파싱 (key: value 추출) ──────────────────────────────────────
function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const fm = {};
  for (const line of match[1].split(/\r?\n/)) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();
    fm[key] = value;
  }
  return fm;
}

// ── git log로 신규/기존 판별 ─────────────────────────────────────────────────
function isNewFile(filePath) {
  try {
    const relPath = relative(REPO_ROOT, filePath).replace(/\\/g, '/');
    const result = execSync(
      `git -C "${REPO_ROOT}" log --format="%H" -- "${relPath}"`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();
    return result === '';
  } catch {
    return true;
  }
}

// ── frontmatter 날짜 필드 업데이트 ──────────────────────────────────────────
function updateFrontmatterDates(content, isNew) {
  const now = new Date().toISOString();
  if (isNew) {
    content = setFrontmatterField(content, 'created_at', now);
    content = setFrontmatterField(content, 'published_date', now);
    content = setFrontmatterField(content, 'modified_date', now);
  } else {
    content = setFrontmatterField(content, 'modified_date', now);
  }
  return content;
}

// frontmatter 내 특정 필드를 교체하거나 없으면 추가
function setFrontmatterField(content, key, value) {
  // frontmatter 블록 범위 찾기
  const start = content.indexOf('---');
  if (start === -1) return content;
  const end = content.indexOf('\n---', start + 3);
  if (end === -1) return content;

  const fmBlock = content.slice(start + 3, end); // --- 사이 내용
  const lineRegex = new RegExp(`^(${key}:).*$`, 'm');

  let newFmBlock;
  if (lineRegex.test(fmBlock)) {
    newFmBlock = fmBlock.replace(lineRegex, `$1 ${value}`);
  } else {
    newFmBlock = fmBlock + `\n${key}: ${value}`;
  }

  return content.slice(0, start + 3) + newFmBlock + content.slice(end);
}

// ── 코드 블록 보호 (변환 시 코드 블록 내부 건드리지 않기) ────────────────────
function protectCodeBlocks(body) {
  const placeholders = [];
  // 펜스 코드 블록(```) 및 인라인 코드(`) 보호
  const protected_ = body.replace(/```[\s\S]*?```|`[^`\n]+`/g, match => {
    const idx = placeholders.length;
    placeholders.push(match);
    return `\x00CODE${idx}\x00`;
  });
  return { protected_, placeholders };
}

function restoreCodeBlocks(body, placeholders) {
  return body.replace(/\x00CODE(\d+)\x00/g, (_, idx) => placeholders[Number(idx)]);
}

// ── Obsidian 이미지 wikilink 변환 ────────────────────────────────────────────
// ![[image.png]]         → ![image](./image.png)
// ![[image.png|alt 텍스트]] → ![alt 텍스트](./image.png)
function convertImageWikilinks(body) {
  return body.replace(/!\[\[([^\]|]+?)(?:\|([^\]]*))?\]\]/g, (_, filename, alt) => {
    const trimmed = filename.trim();
    const encoded = trimmed.split('/').map(part => encodeURIComponent(part).replace(/%20/g, '%20')).join('/');
    const altText = (alt ?? trimmed.replace(/\.[^.]+$/, '')).trim();
    return `![${altText}](./${encoded})`;
  });
}

// ── Obsidian 문서 wikilink 변환 ──────────────────────────────────────────────
// [[글 제목]]          → [글 제목](/blog/slug) 또는 글 제목(매핑 없을 때)
// [[글 제목|링크 텍스트]] → [링크 텍스트](/blog/slug)
function convertDocWikilinks(body, slugMap) {
  // 앞에 !가 없는 [[ 만 처리 (이미지 wikilink 제외)
  return body.replace(/(?<!!)\[\[([^\]|]+?)(?:\|([^\]]*))?\]\]/g, (_, title, text) => {
    const trimmedTitle = title.trim();
    const linkText = (text ?? trimmedTitle).trim();
    const slug = slugMap.get(trimmedTitle);
    return slug ? `[${linkText}](/blog/${slug})` : linkText;
  });
}

// ── 파일명이 non-ASCII 문자를 포함하는지 확인 ────────────────────────────────
function hasNonAsciiFilename(filePath) {
  const base = filePath.replace(/\\/g, '/').split('/').pop() ?? '';
  return /[^\x00-\x7F]|\s/.test(base.replace(/\.md$/, ''));
}

// ── slug 기반 파일명 변경 (필요한 경우) ──────────────────────────────────────
async function maybeRenameToSlug(filePath, fm, dryRun) {
  if (!hasNonAsciiFilename(filePath)) return filePath;

  const slug = fm.slug;
  if (!slug) {
    console.warn(`[경고] slug 없음, 파일명 유지: ${filePath}`);
    return filePath;
  }

  const dir = filePath.replace(/\\/g, '/').split('/').slice(0, -1).join('/');
  const newPath = `${dir}/${slug}.md`;

  if (filePath.replace(/\\/g, '/') === newPath) return filePath;

  const relOld = relative(REPO_ROOT, filePath);
  const relNew = relative(REPO_ROOT, newPath);

  if (dryRun) {
    console.log(`[파일명] [DRY-RUN] ${relOld} → ${relNew}`);
  } else {
    await rename(filePath, newPath);
    console.log(`[파일명] 변경: ${relOld} → ${relNew}`);
  }

  return newPath;
}

// ── 파일 처리 메인 ───────────────────────────────────────────────────────────
async function processFile(filePath, slugMap, dryRun) {
  let content;
  try {
    content = await readFile(filePath, 'utf-8');
  } catch (e) {
    console.error(`[오류] 읽기 실패: ${filePath} — ${e.message}`);
    return false;
  }

  // frontmatter 존재 확인
  if (!content.startsWith('---')) {
    console.log(`[SKIP] frontmatter 없음: ${filePath}`);
    return false;
  }

  // 1. 파일명 변경 (non-ASCII → slug)
  const fm = parseFrontmatter(content);
  filePath = await maybeRenameToSlug(filePath, fm, dryRun);

  const original = content;

  // 2. 날짜 업데이트 (변경된 파일명 기준으로 git log 확인)
  const isNew = isNewFile(filePath);
  content = updateFrontmatterDates(content, isNew);

  // 3. 본문 분리 (frontmatter 끝 이후)
  const fmEndIdx = content.indexOf('\n---', 3) + 4; // \n--- 다음
  const fmPart = content.slice(0, fmEndIdx);
  let body = content.slice(fmEndIdx);

  // 4. 코드 블록 보호 후 변환
  const { protected: protectedBody, placeholders } = (() => {
    const r = protectCodeBlocks(body);
    return { protected: r.protected_, placeholders: r.placeholders };
  })();

  let convertedBody = convertImageWikilinks(protectedBody);
  convertedBody = convertDocWikilinks(convertedBody, slugMap);
  convertedBody = restoreCodeBlocks(convertedBody, placeholders);

  content = fmPart + convertedBody;

  // 변경 없으면 skip
  if (content === original) {
    return false;
  }

  // 변경 사항 요약 출력
  const label = isNew ? '[신규]' : '[수정]';
  const relPath = relative(REPO_ROOT, filePath);

  if (dryRun) {
    console.log(`${label} [DRY-RUN] ${relPath}`);
    printDiff(original, content);
  } else {
    await writeFile(filePath, content, 'utf-8');
    console.log(`${label} 처리 완료: ${relPath}`);
  }

  return true;
}

// ── 간단한 diff 출력 (dry-run 용) ────────────────────────────────────────────
function printDiff(original, updated) {
  const origLines = original.split('\n');
  const newLines = updated.split('\n');
  const maxLen = Math.max(origLines.length, newLines.length);
  let printed = 0;
  for (let i = 0; i < maxLen && printed < 20; i++) {
    const o = origLines[i] ?? '';
    const n = newLines[i] ?? '';
    if (o !== n) {
      console.log(`  - ${o}`);
      console.log(`  + ${n}`);
      printed++;
    }
  }
  if (printed === 0) console.log('  (날짜 필드만 변경됨)');
}

main().catch(err => {
  console.error('오류:', err.message);
  process.exit(1);
});
