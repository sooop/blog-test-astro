import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const projectEuler = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/project-euler' }),
  schema: z.object({
    title: z.string(),
    published_date: z.coerce.date(),
    modified_date: z.coerce.date(),
    slug: z.string().optional(),
    custom_excerpt: z.string().optional(),
    feature_image: z.string().optional(),
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
    created_at: z.string().optional(),
    modified_date: z.coerce.date().optional(),
    status: z.string().optional(),
  }),
});

export const collections = {
  'project-euler': projectEuler,
  blog, // temporarily disabled for performance testing
};
