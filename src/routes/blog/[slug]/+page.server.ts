import type { EntryGenerator, PageServerLoad } from './$types';

import { error } from '@sveltejs/kit';

import { getAllPosts, getPostBySlug } from '#lib/server/blog.ts';

export const prerender = 'auto';

export const entries: EntryGenerator = () => {
  return getAllPosts().map(post => ({ slug: post.slug }));
};

export const load: PageServerLoad = async ({ params }) => {
  const post = await getPostBySlug(params.slug);
  if (!post) error(404, 'Not Found');
  return { post };
};
