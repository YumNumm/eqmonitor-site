import { createFileRoute } from '@tanstack/react-router'
import * as v from 'valibot'
import { hc } from 'hono/client'
import type { AppType } from 'eqmonitor-beta-worker'
import { getAuth } from '~/server/auth'
import { appEnv } from '~/server/env'
import {
  insertBetaRegistration,
  updateWorkflowId,
  getBetaRegistrationByUserId,
} from '~/server/beta-db'
import { BetaRegistrationFormSchema } from '~/lib/betaSchema'

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const Route = createFileRoute('/api/beta/register')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await getAuth(appEnv)
        const session = await auth.api.getSession({
          headers: request.headers,
        })
        if (!session) {
          return json({ error: 'unauthorized' }, 401)
        }

        let parsed: v.InferOutput<typeof BetaRegistrationFormSchema>
        try {
          const raw = await request.json()
          parsed = v.parse(BetaRegistrationFormSchema, raw)
        } catch {
          return json({ error: 'invalid_request' }, 400)
        }

        const existing = await getBetaRegistrationByUserId(
          appEnv.DB,
          session.user.id,
        )
        if (existing) {
          return json({ error: 'already_registered', registration: existing }, 409)
        }

        const id = crypto.randomUUID()
        await insertBetaRegistration(appEnv.DB, {
          id,
          userId: session.user.id,
          email: parsed.email,
          platform: parsed.platform,
        })

        const client = hc<AppType>('http://dummy', {
          fetch: appEnv.BETA_WORKER.fetch.bind(appEnv.BETA_WORKER),
        })
        const res = await client.register.$post({
          json: {
            email: parsed.email,
            betaGroupId: appEnv.BETA_GROUP_ID,
            registrationId: id,
          },
        })

        if (!res.ok) {
          return json({ error: 'workflow_failed' }, 500)
        }

        const result = await res.json()
        await updateWorkflowId(appEnv.DB, id, result.workflowId)

        return json({ ok: true, id, workflowId: result.workflowId })
      },
    },
  },
})
