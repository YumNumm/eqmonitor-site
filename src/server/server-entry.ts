import handler from '@tanstack/react-start/server-entry'
import { fetchAndStoreProjects } from './projects'
import type { AppEnv } from './env'

export default {
  ...handler,

  async scheduled(
    _event: ScheduledEvent,
    env: AppEnv,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(
      fetchAndStoreProjects(env).catch((err) => {
        console.error('Failed to fetch projects:', err)
      }),
    )
  },
}
