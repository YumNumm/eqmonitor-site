import type { PageServerLoad } from './$types';

import { appEnv } from '#lib/server/env.ts';

export const load: PageServerLoad = () => {
  return { siteKey: appEnv.TURNSTILE_SITE_KEY };
};
