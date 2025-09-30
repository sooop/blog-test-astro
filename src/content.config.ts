import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const projectEuler = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    published_date: z.coerce.date(),
    modified_date: z.coerce.date(),
    slug: z.string().optional(),
    custom_excerpt: z.string().optional(),
    feature_image: z.string().optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    layout: z.string().default('../../../layouts/MarkdownLayout.astro')
  })
});

export const collections = {
  'project-euler': projectEuler
};
