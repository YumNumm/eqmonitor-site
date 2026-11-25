import type { PageServerLoad } from './$types';

import { getAllPosts } from '#lib/server/blog.ts';

export const prerender = true;

export const load: PageServerLoad = () => {
  return { posts: getAllPosts() };
};
