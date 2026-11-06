import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const page = z.object({
  title: z.string(),
  description: z.string().optional(),
  tagline: z.string().optional(),
  /** Slug of the Learn chapter that teaches this page, for the "Watch it run" chip. */
  chapter: z.string().optional(),
});

export const collections = {
  docs: defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/docs' }),
    schema: page,
  }),
  rfcs: defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/rfcs' }),
    schema: page,
  }),
  learn: defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/learn' }),
    schema: page.extend({
      order: z.number(),
      kicker: z.string(),
      lede: z.string(),
      /** Reference page id (`core/instance-management`) for the outro card. */
      doc: z.string().optional(),
    }),
  }),
  blog: defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
    schema: page.extend({
      date: z.coerce.date(),
      stat: z.string().optional(),
      chapters: z.array(z.string()).default([]),
      docs: z.array(z.string()).default([]),
    }),
  }),
};
