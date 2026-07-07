import { createFileRoute } from '@tanstack/react-router'
import { appEnv } from '~/server/env'

export const Route = createFileRoute('/api/og')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const title = url.searchParams.get('title')

        if (!title) {
          return new Response('title query parameter is required', {
            status: 400,
          })
        }
        if (title.length > 200) {
          return new Response('title must be 200 characters or fewer', {
            status: 400,
          })
        }

        const image = url.searchParams.get('image')
        const type = url.searchParams.get('type')

        const ogUrl = new URL('https://og-worker.internal/')
        ogUrl.searchParams.set('title', title)
        if (image) ogUrl.searchParams.set('image', image)
        if (type) ogUrl.searchParams.set('type', type)

        const response = await appEnv.OG_WORKER.fetch(ogUrl.toString())
        return new Response(response.body, {
          status: response.status,
          headers: {
            'Content-Type':
              response.headers.get('Content-Type') ?? 'image/png',
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        })
      },
    },
  },
})
