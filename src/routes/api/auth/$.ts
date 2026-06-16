import { createFileRoute } from '@tanstack/react-router'
import { getAuth } from '~/server/auth'
import { appEnv } from '~/server/env'

async function handleAuth(request: Request): Promise<Response> {
  try {
    const auth = await getAuth(appEnv)
    return await auth.handler(request)
  } catch (error) {
    console.error('[auth] handler error', {
      method: request.method,
      url: request.url,
      name: error instanceof Error ? error.name : typeof error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    throw error
  }
}

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: ({ request }) => handleAuth(request),
      POST: ({ request }) => handleAuth(request),
    },
  },
})
