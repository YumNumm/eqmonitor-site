import type { AppEnv } from './lib/server/env';

import { fetchAndStoreProjects } from './lib/server/projects';

export async function scheduled(
  _event: ScheduledController,
  env: AppEnv,
  ctx: ExecutionContext,
): Promise<void> {
  ctx.waitUntil(
    fetchAndStoreProjects(env).catch((error: unknown) => {
      console.error('Failed to fetch projects:', error);
    }),
  );
}
