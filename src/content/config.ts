import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    published_at: z.string(),
    created_at: z.string().optional(),
    modified_date: z.string().optional(),
    status: z.string().optional(),
  }),
});

export const collections = {
  blog,
};
