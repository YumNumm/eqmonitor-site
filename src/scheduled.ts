import type { AppEnv } from './lib/server/env'
import { fetchAndStoreProjects } from './lib/server/projects'

export async function scheduled(
  _event: ScheduledController,
  env: AppEnv,
  ctx: ExecutionContext,
): Promise<void> {
  ctx.waitUntil(
    fetchAndStoreProjects(env).catch((err) => {
      console.error('Failed to fetch projects:', err)
    }),
  )
}
