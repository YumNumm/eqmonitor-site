import { createFileRoute } from '@tanstack/react-router'
import { getAuth } from '~/server/auth'
import { appEnv } from '~/server/env'

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await getAuth(appEnv)
        return auth.handler(request)
      },
      POST: async ({ request }) => {
        const auth = await getAuth(appEnv)
        return auth.handler(request)
      },
    },
  },
})
