import type { PageServerLoad } from './$types';

import { getAllRenderedFaqSections } from '#lib/server/faq.ts';

export const prerender = true;

export const load: PageServerLoad = async () => {
  return { sections: await getAllRenderedFaqSections() };
};
