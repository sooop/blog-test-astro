import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const projectEuler = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    slug: z.string().optional(),
    published_date: z.string(),
    modified_date: z.string(),
    tags: z.array(z.string()),
    type: z.string(),
    category: z.string(),
    layout: z.string().default('../../../layouts/MarkdownLayout.astro')
  })
});

export const collections = {
  'project-euler': projectEuler
};