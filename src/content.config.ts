import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const projectEuler = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/project-euler' }),
  schema: z.object({
    title: z.string(),
    published_date: z.coerce.date(),
    modified_date: z.coerce.date(),
    slug: z.string().optional(),
    custom_excerpt: z.string().optional(),
    feature_image: z.string().nullable().optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
  })
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    published_date: z.coerce.date(),
	custom_excerpt: z.string().optional(),
	description: z.string().optional(),
    created_at: z.coerce.date().optional(),
    modified_date: z.coerce.date().optional(),
    status: z.string().optional(),
    tags: z.array(z.string()).optional(),
    series: z.string().optional(),
    feature_image: z.string().nullable().optional(),
  }),
});

const draft = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/draft' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    published_date: z.coerce.date(),
    custom_excerpt: z.string().optional(),
    status: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

const guide = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/guide' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    published_date: z.coerce.date().optional(),
    modified_date: z.coerce.date().optional(),
    custom_excerpt: z.string().optional(),
    order: z.number().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

export const collections = {
  'project-euler': projectEuler,
  blog,
  draft,
  guide,
};
