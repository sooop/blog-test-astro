// 컬렉션별 frontmatter 필드 정의. 블로그의 src/content.config.ts(zod)와 같이 유지한다.
import { nowIso } from './frontmatter';

export type FieldKind = 'text' | 'slug' | 'date' | 'tags' | 'status' | 'series' | 'number' | 'textarea' | 'image';

export interface Field {
  key: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  wide?: boolean; // 한 줄을 다 쓴다
  auto?: boolean; // 저장 시 자동 갱신
}

const title: Field = { key: 'title', label: '제목', kind: 'text', required: true, wide: true };
const slug: Field = { key: 'slug', label: 'slug', kind: 'slug', required: true };
const tags: Field = { key: 'tags', label: '태그', kind: 'tags', wide: true };
const excerpt: Field = { key: 'custom_excerpt', label: '요약', kind: 'textarea', wide: true };
const published = (required: boolean): Field => ({ key: 'published_date', label: '발행일', kind: 'date', required });
const modified: Field = { key: 'modified_date', label: '수정일', kind: 'date', auto: true };
const created: Field = { key: 'created_at', label: '작성일', kind: 'date' };
const image: Field = { key: 'feature_image', label: '대표 이미지', kind: 'image', wide: true };

export interface CollectionDef {
  fields: Field[];
  // 새 글의 초기 frontmatter 키 순서와 값
  initial: (title: string, slug: string) => Record<string, string | string[]>;
}

export const COLLECTIONS: Record<string, CollectionDef> = {
  blog: {
    fields: [
      title, slug, published(true), modified, created,
      { key: 'status', label: '상태', kind: 'status' },
      { key: 'series', label: '시리즈', kind: 'series' },
      tags, excerpt,
      { key: 'description', label: '설명', kind: 'textarea', wide: true },
      image,
    ],
    initial: (t, s) => ({ title: t, slug: s, published_date: nowIso(), created_at: nowIso(), status: 'published' }),
  },
  draft: {
    fields: [title, slug, published(true), { key: 'status', label: '상태', kind: 'status' }, tags, excerpt],
    initial: (t, s) => ({ title: t, slug: s, published_date: nowIso(), status: 'draft' }),
  },
  guide: {
    fields: [title, slug, { key: 'order', label: '순서', kind: 'number' }, published(false), modified, tags, excerpt],
    initial: (t, s) => ({ title: t, slug: s, published_date: nowIso() }),
  },
  'project-euler': {
    fields: [
      title, slug, published(true), { ...modified, required: true }, created,
      { key: 'category', label: '분류', kind: 'text' }, tags, excerpt, image,
    ],
    initial: (t, s) => ({ title: t, slug: s, published_date: nowIso(), modified_date: nowIso(), tags: ['project-euler'] }),
  },
};

// 컬렉션 밖의 문서(templates 등)에 쓰는 최소 필드
const GENERIC: CollectionDef = {
  fields: [title, { ...slug, required: false }, tags],
  initial: (t, s) => ({ title: t, slug: s }),
};

export const collectionOf = (path: string) => path.split('/')[0];
export const defOf = (path: string): CollectionDef => COLLECTIONS[collectionOf(path)] ?? GENERIC;
export const isCollection = (path: string) => collectionOf(path) in COLLECTIONS;
