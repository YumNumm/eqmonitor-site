import type { PageServerLoad } from './$types';

import { marked } from 'marked';

import { appEnv } from '#lib/server/env.ts';
import { getProjectsData } from '#lib/server/projects.ts';

const markedWithSafeHtml = marked.use({
  renderer: {
    html(token) {
      return token.text
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');
    },
  },
});

export const load: PageServerLoad = async () => {
  const data = await getProjectsData(appEnv.PROJECTS_KV);
  if (!data) return { projects: null };
  return {
    projects: {
      ...data,
      items: data.items.map(item =>
        Object.assign(item, {
          html: item.body
            ? markedWithSafeHtml.parse(item.body, { async: false })
            : '',
        }),
      ),
    },
  };
};
