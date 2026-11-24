import type { PageServerLoad } from './$types';

import markdown from '#lib/content/term_of_service.md?raw';
import { renderMarkdown } from '#lib/server/markdown.ts';

export const prerender = true;

export const load: PageServerLoad = async () => {
  return { html: await renderMarkdown(markdown) };
};
